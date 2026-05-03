const { Server } = require('socket.io');
const http = require('http');

const server = http.createServer();
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Almacenamiento en memoria
const matchmakingQueue = []; // Cola de jugadores buscando partida
const activeMatches = new Map(); // Partidas activas

console.log('🚀 Chess Matchmaking Server iniciando...');

io.on('connection', (socket) => {
  const userName = socket.handshake.auth.userName || 'Jugador';
  const userId = socket.handshake.auth.userId;
  console.log(`✅ Usuario conectado: ${userName} (${socket.id})`);

  // 🔄 MANEJO DE RECONEXIÓN
  // Buscar si este usuario tiene una partida activa (por nombre, ya que el socketId cambia)
  console.log(`🔍 Buscando partidas existentes para ${userName}...`);
  console.log(`📊 Partidas activas totales: ${activeMatches.size}`);

  for (const [matchId, match] of activeMatches.entries()) {
    console.log(`   Partida ${matchId}:`);
    console.log(`     Status: ${match.status}`);
    console.log(`     Players:`, match.players.map(p => `${p.name} (connected: ${p.connected})`));

    const playerIndex = match.players.findIndex(p => p.name === userName && !p.connected);

    if (playerIndex !== -1) {
      console.log(`🔄 ${userName} se reconectó a la partida ${matchId}`);

      // ⚠️ VERIFICAR SI LA PARTIDA YA TERMINÓ MIENTRAS ESTUVO DESCONECTADO
      if (match.status === 'finished') {
        console.log(`🏁 ${userName} reconectó pero la partida ${matchId} ya terminó`);

        // Determinar ganador desde el punto de vista del jugador que reconecta
        const reconnectedPlayer = match.players[playerIndex];
        const opponent = match.players.find((p, idx) => idx !== playerIndex);

        // El ganador ya fue determinado cuando se abandonó
        // Necesitamos saber quién ganó para enviar el resultado correcto
        let winner = match.winner || opponent?.color || 'white';

        console.log(`   Enviando game-end a ${userName}:`);
        console.log(`     Winner: ${winner}`);
        console.log(`     Reason: ${match.endReason || 'abandonment'}`);

        // ⏰ ESPERAR 3 segundos para que el cliente navegue de Matchmaking → Home y registre los listeners
        setTimeout(() => {
          console.log(`📡 [DELAYED] Enviando game-end a ${userName} después de 3s`);
          // Enviar resultado del juego al jugador que reconecta
          socket.emit('game-end', {
            winner,
            reason: match.endReason || 'abandonment'
          });
        }, 3000);

        // No unirse a la sala porque la partida ya terminó
        continue;
      }

      // Cancelar timer de abandono si existe (partida aún activa)
      if (match.abandonmentTimer) {
        clearTimeout(match.abandonmentTimer);
        match.abandonmentTimer = null;
        console.log(`✅ Timer de abandono cancelado para ${userName}`);
      }

      // Actualizar socket ID y estado de conexión
      match.players[playerIndex].id = socket.id;
      match.players[playerIndex].connected = true;

      // Unirse a la sala nuevamente
      socket.join(matchId);

      // Notificar al oponente que reconectó
      socket.to(matchId).emit('opponent-reconnected');

      // Enviar estado actual del match al jugador reconectado
      socket.emit('match-found', match);
      socket.emit('game-start', match);

      console.log(`✅ ${userName} reconectado exitosamente a ${matchId}`);
      break;
    }
  }

  console.log(`✅ Búsqueda de reconexión completada para ${userName}`);

  // 🔍 BUSCAR PARTIDA (Matchmaking automático)
  socket.on('find-match', ({ playerElo, timeControl }, callback) => {
    console.log(`🔍 ${userName} (ELO: ${playerElo}, Time: ${timeControl}) busca partida`);

    // Buscar oponente en la cola con ELO similar (±200 puntos) Y MISMO timeControl
    const opponentIndex = matchmakingQueue.findIndex(p =>
      Math.abs(p.elo - playerElo) <= 200 &&
      p.timeControl === timeControl &&
      p.id !== socket.id
    );

    if (opponentIndex !== -1) {
      // ¡MATCH ENCONTRADO!
      const opponent = matchmakingQueue.splice(opponentIndex, 1)[0];

      const matchId = `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const match = {
        id: matchId,
        name: `${userName} vs ${opponent.name}`,
        timeControl: timeControl,
        players: [
          {
            id: socket.id,
            name: userName,
            elo: playerElo,
            color: 'white',
            connected: true
          },
          {
            id: opponent.id,
            name: opponent.name,
            elo: opponent.elo,
            color: 'black',
            connected: true
          }
        ],
        status: 'playing',
        createdAt: Date.now()
      };

      activeMatches.set(matchId, match);

      // Unir ambos jugadores a la sala del match
      socket.join(matchId);
      opponent.socket.join(matchId);

      console.log(`✅ Match creado: ${matchId}`);
      console.log(`   Player 1 (white): ${userName} (${socket.id})`);
      console.log(`   Player 2 (black): ${opponent.name} (${opponent.id})`);

      // Notificar a ambos jugadores
      socket.emit('match-found', match);
      opponent.socket.emit('match-found', match);

      // Iniciar partida
      io.to(matchId).emit('game-start', match);

      callback({ success: true, match });
    } else {
      // NO HAY OPONENTE DISPONIBLE - Agregar a cola
      matchmakingQueue.push({
        id: socket.id,
        socket: socket,
        name: userName,
        elo: playerElo,
        timeControl: timeControl,
        joinedAt: Date.now()
      });

      console.log(`⏳ ${userName} agregado a cola de matchmaking (${matchmakingQueue.length} jugadores en cola)`);

      // Notificar progreso
      socket.emit('matchmaking-progress', {
        playersInQueue: matchmakingQueue.length,
        estimatedTime: matchmakingQueue.length * 10 // Estimación simple
      });

      callback({ success: true });

      // Reintento cada 2 segundos para emparejar con nuevos jugadores
      const retryInterval = setInterval(() => {
        const myIndex = matchmakingQueue.findIndex(p => p.id === socket.id);
        if (myIndex === -1) {
          clearInterval(retryInterval);
          return;
        }

        const opponentIndex = matchmakingQueue.findIndex((p, idx) =>
          idx !== myIndex &&
          Math.abs(p.elo - playerElo) <= 200 &&
          p.timeControl === timeControl
        );

        if (opponentIndex !== -1) {
          clearInterval(retryInterval);
          // Trigger match (el evento find-match ya maneja el emparejamiento)
        }
      }, 2000);
    }
  });

  // ❌ CANCELAR BÚSQUEDA
  socket.on('cancel-matchmaking', (callback) => {
    const index = matchmakingQueue.findIndex(p => p.id === socket.id);
    if (index !== -1) {
      matchmakingQueue.splice(index, 1);
      console.log(`❌ ${userName} canceló búsqueda (${matchmakingQueue.length} en cola)`);
    }
    callback({ success: true });
  });

  // 🚪 SALIR DE PARTIDA
  socket.on('leave-match', ({ matchId }, callback) => {
    const match = activeMatches.get(matchId);

    if (match) {
      socket.leave(matchId);
      socket.to(matchId).emit('opponent-disconnected');

      // Eliminar partida si ambos se fueron
      match.players = match.players.filter(p => p.id !== socket.id);
      if (match.players.length === 0) {
        activeMatches.delete(matchId);
        console.log(`🗑️ Match ${matchId} eliminado`);
      }
    }

    callback({ success: true });
  });

  // ♟️ MOVIMIENTO DE AJEDREZ
  socket.on('chess-move', ({ matchId, move }) => {
    const match = activeMatches.get(matchId);
    if (!match) {
      console.log(`❌ Match ${matchId} no encontrado para movimiento`);
      return;
    }

    const player = match.players.find(p => p.id === socket.id);
    console.log(`♟️ Received move from ${socket.id}: ${move.notation} in match: ${matchId}`);
    console.log(`   Player: ${player?.name} (${player?.color})`);
    console.log(`   Sending to opponent via room: ${matchId}`);

    // Enviar a todos en la sala EXCEPTO al remitente
    socket.to(matchId).emit('chess-move', move);
    console.log(`✅ Move broadcasted to room ${matchId}`);
  });

  // 💬 MENSAJE DE CHAT
  socket.on('chat-message', ({ matchId, message }) => {
    const match = activeMatches.get(matchId);
    if (!match) return;

    const player = match.players.find(p => p.id === socket.id);
    if (!player) return;

    const chatMessage = {
      playerId: socket.id,
      playerName: player.name,
      message,
      timestamp: Date.now()
    };

    console.log(`💬 [Match ${matchId}] ${player.name}: ${message}`);
    io.to(matchId).emit('chat-message', chatMessage);
  });

  // 🏁 FIN DE PARTIDA
  socket.on('game-end', ({ matchId, winner, reason }) => {
    const match = activeMatches.get(matchId);
    if (!match) {
      console.log(`❌ Match ${matchId} no encontrado para game-end`);
      return;
    }

    const player = match.players.find(p => p.id === socket.id);
    console.log(`🏁 Game ended in match ${matchId}`);
    console.log(`   Winner: ${winner}`);
    console.log(`   Reason: ${reason}`);
    console.log(`   Reported by: ${player?.name} (${player?.color})`);

    // Enviar a todos en la sala (incluyendo al remitente para confirmación)
    io.to(matchId).emit('game-end', { winner, reason });

    // Marcar partida como terminada
    match.status = 'finished';
    console.log(`✅ Game-end broadcasted to room ${matchId}`);
  });

  // ❌ DESCONEXIÓN
  socket.on('disconnect', () => {
    console.log(`❌ Usuario desconectado: ${userName} (${socket.id})`);

    // Eliminar de cola de matchmaking
    const queueIndex = matchmakingQueue.findIndex(p => p.id === socket.id);
    if (queueIndex !== -1) {
      matchmakingQueue.splice(queueIndex, 1);
      console.log(`🗑️ ${userName} eliminado de cola de matchmaking`);
    }

    // Actualizar partidas activas
    for (const [matchId, match] of activeMatches.entries()) {
      const playerIndex = match.players.findIndex(p => p.id === socket.id);

      if (playerIndex !== -1) {
        match.players[playerIndex].connected = false;
        const disconnectedPlayer = match.players[playerIndex];

        // Notificar al oponente
        socket.to(matchId).emit('opponent-disconnected');

        console.log(`⚠️ ${userName} se desconectó del match ${matchId}`);

        // ⏰ TIMER DE ABANDONO (30 segundos)
        console.log(`⏰ Iniciando timer de abandono de 30s para ${userName}`);

        const abandonmentTimer = setTimeout(() => {
          console.log(`⏰ [TIMER EJECUTADO] Timer de 30s expiró para ${userName}`);

          const currentMatch = activeMatches.get(matchId);

          // Verificar si el jugador sigue desconectado
          if (currentMatch) {
            console.log(`   Match encontrado: ${matchId}, status: ${currentMatch.status}`);

            // ⚠️ CRITICAL FIX: Buscar por nombre, no por socket.id (que ya no existe)
            const player = currentMatch.players.find(p => p.name === userName && !p.connected);

            console.log(`   Jugador desconectado encontrado: ${player ? 'SÍ' : 'NO'}`);
            if (player) {
              console.log(`   Nombre: ${player.name}, Conectado: ${player.connected}`);
            }

            if (player) {
              console.log(`⏰ ${userName} abandonó la partida (30s timeout) - Match ${matchId}`);

              // Determinar ganador (el oponente gana)
              const opponent = currentMatch.players.find(p => p.name !== userName);
              const winner = opponent?.color || 'white';

              // Enviar game-end a TODOS (incluyendo al desconectado para cuando reconecte)
              io.to(matchId).emit('game-end', {
                winner,
                reason: 'abandonment'
              });

              // Marcar partida como terminada y GUARDAR RESULTADO
              currentMatch.status = 'finished';
              currentMatch.winner = winner;
              currentMatch.endReason = 'abandonment';

              console.log(`🏁 Partida ${matchId} terminada por abandono de ${userName}`);
              console.log(`   Ganador: ${opponent?.name} (${winner})`);

              // Eliminar partida después de 5 minutos (para permitir reconexiones tardías)
              setTimeout(() => {
                activeMatches.delete(matchId);
                console.log(`🗑️ Match ${matchId} eliminado (5 minutos después del abandono)`);
              }, 5 * 60 * 1000); // 5 minutos
            }
          } else {
            console.log(`   ⚠️ Match ${matchId} no encontrado en activeMatches`);
          }
        }, 30 * 1000); // 30 segundos

        console.log(`✅ Timer de abandono creado para ${userName} (ID: ${abandonmentTimer})`);

        // Guardar el timer en el match para poder cancelarlo si reconecta
        match.abandonmentTimer = abandonmentTimer;

        break;
      }
    }
  });
});

// Iniciar servidor
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`✅ Servidor de Matchmaking corriendo en http://localhost:${PORT}`);
  console.log(`📡 Sistema de emparejamiento automático por ELO activado`);
});

// Logs periódicos
setInterval(() => {
  const totalMatches = activeMatches.size;
  const queueSize = matchmakingQueue.length;

  if (totalMatches > 0 || queueSize > 0) {
    console.log(`📊 Estado: ${totalMatches} partidas activas | ${queueSize} jugadores en cola`);
  }
}, 30000);
