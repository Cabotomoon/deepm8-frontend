# 🎯 Arquitectura del Sistema de Matchmaking - Chess Clash

## 📋 Tabla de Contenidos

1. [Visión General](#visión-general)
2. [Arquitectura de Alto Nivel](#arquitectura-de-alto-nivel)
3. [Componentes del Sistema](#componentes-del-sistema)
4. [Algoritmo de Matchmaking](#algoritmo-de-matchmaking)
5. [Flujo de Conexión](#flujo-de-conexión)
6. [Gestión de Salas](#gestión-de-salas)
7. [Sincronización en Tiempo Real](#sincronización-en-tiempo-real)
8. [Sistema de Ranking](#sistema-de-ranking)
9. [Manejo de Desconexiones](#manejo-de-desconexiones)
10. [Escalabilidad](#escalabilidad)
11. [Seguridad](#seguridad)
12. [Monitoreo y Métricas](#monitoreo-y-métricas)

---

## 🌐 Visión General

El sistema de matchmaking de Chess Clash conecta jugadores de forma inteligente basándose en:
- **ELO similar** - Partidas balanceadas y competitivas
- **Modo de juego** - Bullet, Blitz, Rapid o Classical
- **Control de tiempo** - Configuración específica (ej: 3+2, 10+0)
- **Disponibilidad** - Jugadores activos en el lobby

### Objetivos del Sistema
1. ✅ **Partidas balanceadas** - Diferencia de ELO < 200 puntos
2. ✅ **Tiempo de espera bajo** - Matchmaking en < 10 segundos
3. ✅ **Sincronización perfecta** - Movimientos en tiempo real sin lag
4. ✅ **Reconexión automática** - Recuperación ante desconexiones
5. ✅ **Escalabilidad horizontal** - Soportar miles de jugadores concurrentes

---

## 🏗️ Arquitectura de Alto Nivel

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENTE (React App)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Lobby UI    │  │  Game Board  │  │  Chat UI     │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                  │                  │              │
│         └──────────────────┼──────────────────┘              │
│                            │                                 │
│                   ┌────────▼────────┐                        │
│                   │  WebSocket      │                        │
│                   │  Client Manager │                        │
│                   └────────┬────────┘                        │
└────────────────────────────┼──────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │   INTERNET      │
                    └────────┬────────┘
                             │
┌────────────────────────────▼──────────────────────────────────┐
│                   BACKEND (Node.js)                           │
│                                                                │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           WebSocket Server (Socket.io)               │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │   │
│  │  │ Connection  │  │   Room      │  │   Event     │ │   │
│  │  │  Manager    │  │  Manager    │  │  Handler    │ │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘ │   │
│  └──────────────────────────────────────────────────────┘   │
│                            │                                  │
│  ┌─────────────────────────▼──────────────────────────┐     │
│  │         Matchmaking Engine                          │     │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────┐    │     │
│  │  │  Queue   │  │   ELO    │  │  Pairing     │    │     │
│  │  │ Manager  │  │ Matcher  │  │  Algorithm   │    │     │
│  │  └──────────┘  └──────────┘  └──────────────┘    │     │
│  └────────────────────────────────────────────────────┘     │
│                            │                                  │
│  ┌─────────────────────────▼──────────────────────────┐     │
│  │            Game State Manager                       │     │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────┐    │     │
│  │  │  Board   │  │  Timer   │  │   Move      │    │     │
│  │  │  State   │  │ Manager  │  │ Validator   │    │     │
│  │  └──────────┘  └──────────┘  └──────────────┘    │     │
│  └────────────────────────────────────────────────────┘     │
│                            │                                  │
│  ┌─────────────────────────▼──────────────────────────┐     │
│  │              Database Layer                         │     │
│  │  ┌──────────────┐  ┌──────────────────────┐       │     │
│  │  │ SeaVerse     │  │  Redis Cache         │       │     │
│  │  │ Data SDK     │  │  (Session Storage)   │       │     │
│  │  └──────────────┘  └──────────────────────┘       │     │
│  └────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────┘
```

---

## 🧩 Componentes del Sistema

### 1. **WebSocket Server (Socket.io)**

**Responsabilidades:**
- Gestión de conexiones persistentes cliente-servidor
- Broadcasting de eventos a múltiples clientes
- Manejo de rooms (salas de partidas)
- Reconexión automática con session recovery

**Tecnología:**
```typescript
import { Server } from 'socket.io';
import { createServer } from 'http';

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL,
    credentials: true
  },
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutos
    skipMiddlewares: true,
  }
});
```

**Eventos Principales:**
```typescript
// Cliente → Servidor
'matchmaking:join'      // Unirse a la cola de matchmaking
'matchmaking:cancel'    // Cancelar búsqueda
'game:move'             // Enviar movimiento
'game:resign'           // Rendirse
'chat:message'          // Enviar mensaje de chat

// Servidor → Cliente
'matchmaking:searching' // Confirmación de búsqueda
'matchmaking:found'     // Match encontrado
'game:start'            // Iniciar partida
'game:move:received'    // Movimiento del oponente
'game:end'              // Fin de partida
'chat:message:received' // Nuevo mensaje de chat
```

---

### 2. **Matchmaking Engine**

#### **Queue Manager (Gestor de Cola)**

Mantiene colas separadas por modo de juego:

```typescript
interface MatchmakingQueue {
  bullet: PlayerInQueue[];    // 1+0, 1+1
  blitz: PlayerInQueue[];     // 3+0, 3+2, 5+0, 5+3
  rapid: PlayerInQueue[];     // 10+0, 10+5, 15+10
  classical: PlayerInQueue[]; // 30+0, 30+20, 60+0
}

interface PlayerInQueue {
  userId: string;
  username: string;
  elo: number;
  timeControl: TimeControl;
  joinedAt: number;          // Timestamp
  expandedRange: number;     // Expansión gradual de ELO
}
```

**Características:**
- ✅ **Colas por tiempo de espera** - FIFO (First In, First Out)
- ✅ **Expiración automática** - Timeout después de 5 minutos
- ✅ **Priority boost** - Jugadores con más espera tienen prioridad

#### **ELO Matcher (Comparador de ELO)**

Algoritmo de emparejamiento basado en diferencia de ELO:

```typescript
interface MatchingCriteria {
  initialRange: 100;      // ±100 ELO inicialmente
  maxRange: 400;          // ±400 ELO máximo
  expansionRate: 50;      // +50 ELO cada 10 segundos
  expansionInterval: 10000; // 10 segundos
}

function calculateEloRange(waitTime: number): number {
  const intervals = Math.floor(waitTime / 10000);
  const expandedRange = 100 + (intervals * 50);
  return Math.min(expandedRange, 400);
}

function isEloMatch(player1Elo: number, player2Elo: number, range: number): boolean {
  return Math.abs(player1Elo - player2Elo) <= range;
}
```

**Ejemplo de Expansión:**
```
Tiempo 0s:   ±100 ELO (ej: 1200-1400)
Tiempo 10s:  ±150 ELO (ej: 1150-1450)
Tiempo 20s:  ±200 ELO (ej: 1100-1500)
Tiempo 30s:  ±250 ELO (ej: 1050-1550)
Tiempo 60s+: ±400 ELO (ej: 900-1700)
```

#### **Pairing Algorithm (Algoritmo de Emparejamiento)**

Ejecuta cada 2 segundos para encontrar matches:

```typescript
async function runMatchmaking() {
  setInterval(() => {
    for (const mode of ['bullet', 'blitz', 'rapid', 'classical']) {
      const queue = matchmakingQueues[mode];

      // Ordenar por tiempo de espera (FIFO)
      queue.sort((a, b) => a.joinedAt - b.joinedAt);

      for (let i = 0; i < queue.length; i++) {
        const player1 = queue[i];
        const now = Date.now();
        const waitTime = now - player1.joinedAt;
        const eloRange = calculateEloRange(waitTime);

        // Buscar oponente compatible
        for (let j = i + 1; j < queue.length; j++) {
          const player2 = queue[j];

          // Verificar compatibilidad
          if (isEloMatch(player1.elo, player2.elo, eloRange) &&
              player1.timeControl === player2.timeControl) {

            // ¡Match encontrado!
            createMatch(player1, player2);

            // Remover de la cola
            queue.splice(j, 1);
            queue.splice(i, 1);
            i--; // Ajustar índice
            break;
          }
        }
      }
    }
  }, 2000); // Cada 2 segundos
}
```

---

### 3. **Room Manager (Gestor de Salas)**

Gestiona las salas de partidas activas:

```typescript
interface GameRoom {
  roomId: string;           // UUID único
  white: Player;            // Jugador con piezas blancas
  black: Player;            // Jugador con piezas negras
  gameState: ChessGameState;
  timeControl: TimeControl;
  createdAt: number;
  status: 'waiting' | 'active' | 'finished';
  chat: ChatMessage[];
}

interface Player {
  userId: string;
  username: string;
  elo: number;
  socketId: string;
  connected: boolean;
  timeRemaining: number;    // Milisegundos
}

interface ChessGameState {
  fen: string;              // FEN notation del tablero
  pgn: string;              // PGN notation de la partida
  moves: Move[];            // Historial de movimientos
  turn: 'white' | 'black';
  check: boolean;
  checkmate: boolean;
  stalemate: boolean;
  draw: boolean;
}
```

**Operaciones:**
```typescript
class RoomManager {
  private rooms: Map<string, GameRoom> = new Map();

  createRoom(player1: Player, player2: Player): GameRoom {
    const roomId = generateUUID();

    // Asignar colores aleatoriamente
    const [white, black] = Math.random() > 0.5
      ? [player1, player2]
      : [player2, player1];

    const room: GameRoom = {
      roomId,
      white,
      black,
      gameState: initializeChessBoard(),
      timeControl: player1.timeControl,
      createdAt: Date.now(),
      status: 'waiting',
      chat: []
    };

    this.rooms.set(roomId, room);

    // Unir jugadores a la sala de Socket.io
    io.to(white.socketId).socketsJoin(roomId);
    io.to(black.socketId).socketsJoin(roomId);

    return room;
  }

  getRoom(roomId: string): GameRoom | undefined {
    return this.rooms.get(roomId);
  }

  deleteRoom(roomId: string): void {
    this.rooms.delete(roomId);
  }
}
```

---

### 4. **Game State Manager (Gestor de Estado de Juego)**

Valida movimientos y sincroniza el estado del juego:

```typescript
import { Chess } from 'chess.js'; // Librería de validación

class GameStateManager {
  validateMove(room: GameRoom, move: Move, playerId: string): MoveResult {
    // Verificar turno correcto
    const currentPlayer = room.gameState.turn === 'white'
      ? room.white
      : room.black;

    if (currentPlayer.userId !== playerId) {
      return { valid: false, error: 'Not your turn' };
    }

    // Validar movimiento con chess.js
    const chess = new Chess(room.gameState.fen);
    const result = chess.move(move);

    if (!result) {
      return { valid: false, error: 'Illegal move' };
    }

    // Actualizar estado
    room.gameState.fen = chess.fen();
    room.gameState.pgn = chess.pgn();
    room.gameState.moves.push(result);
    room.gameState.turn = chess.turn() === 'w' ? 'white' : 'black';
    room.gameState.check = chess.inCheck();
    room.gameState.checkmate = chess.isCheckmate();
    room.gameState.stalemate = chess.isStalemate();
    room.gameState.draw = chess.isDraw();

    return { valid: true, newState: room.gameState };
  }

  async saveGame(room: GameRoom, result: GameResult): Promise<void> {
    // Calcular cambios de ELO
    const eloChanges = calculateEloChange(
      room.white.elo,
      room.black.elo,
      result
    );

    // Guardar en base de datos
    await dataService.saveGame({
      whitePlayerId: room.white.userId,
      blackPlayerId: room.black.userId,
      pgn: room.gameState.pgn,
      result: result,
      whiteEloChange: eloChanges.white,
      blackEloChange: eloChanges.black,
      timeControl: room.timeControl,
      duration: Date.now() - room.createdAt
    });

    // Actualizar ELO de jugadores
    await Promise.all([
      dataService.updatePlayerElo(room.white.userId, eloChanges.white),
      dataService.updatePlayerElo(room.black.userId, eloChanges.black)
    ]);
  }
}
```

---

### 5. **Timer Manager (Gestor de Tiempo)**

Maneja los cronómetros de las partidas:

```typescript
class TimerManager {
  private timers: Map<string, NodeJS.Timeout> = new Map();

  startTimer(roomId: string, room: GameRoom): void {
    // Timer tick cada 100ms para precisión
    const timer = setInterval(() => {
      const currentPlayer = room.gameState.turn === 'white'
        ? room.white
        : room.black;

      currentPlayer.timeRemaining -= 100;

      // Emitir actualización de tiempo
      io.to(roomId).emit('game:time:update', {
        white: room.white.timeRemaining,
        black: room.black.timeRemaining
      });

      // Verificar tiempo agotado
      if (currentPlayer.timeRemaining <= 0) {
        this.handleTimeout(roomId, room);
      }

      // Alerta de tiempo bajo (< 30s)
      if (currentPlayer.timeRemaining < 30000 &&
          currentPlayer.timeRemaining % 5000 === 0) {
        io.to(currentPlayer.socketId).emit('game:time:warning', {
          remaining: currentPlayer.timeRemaining
        });
      }
    }, 100);

    this.timers.set(roomId, timer);
  }

  pauseTimer(roomId: string): void {
    const timer = this.timers.get(roomId);
    if (timer) {
      clearInterval(timer);
    }
  }

  addIncrement(room: GameRoom, player: 'white' | 'black'): void {
    const increment = room.timeControl.increment * 1000;

    if (player === 'white') {
      room.white.timeRemaining += increment;
    } else {
      room.black.timeRemaining += increment;
    }
  }

  handleTimeout(roomId: string, room: GameRoom): void {
    this.pauseTimer(roomId);

    const winner = room.gameState.turn === 'white' ? 'black' : 'white';

    io.to(roomId).emit('game:end', {
      result: 'timeout',
      winner: winner,
      reason: 'Time expired'
    });

    gameStateManager.saveGame(room, {
      winner: winner,
      method: 'timeout'
    });
  }
}
```

---

## 🔄 Flujo de Conexión Completo

### **Paso 1: Usuario Entra al Lobby**

```typescript
// Cliente
socket.emit('lobby:join', {
  userId: user.id,
  username: user.username,
  elo: user.elo
});

// Servidor
socket.on('lobby:join', (data) => {
  // Añadir a lista de usuarios online
  onlineUsers.set(data.userId, {
    ...data,
    socketId: socket.id,
    status: 'lobby'
  });

  // Broadcast actualización de usuarios online
  io.emit('lobby:users:update', {
    count: onlineUsers.size,
    users: Array.from(onlineUsers.values())
  });
});
```

### **Paso 2: Usuario Busca Partida**

```typescript
// Cliente
socket.emit('matchmaking:join', {
  userId: user.id,
  username: user.username,
  elo: user.elo,
  mode: 'blitz',      // bullet, blitz, rapid, classical
  timeControl: {
    minutes: 3,
    increment: 2
  }
});

// Servidor
socket.on('matchmaking:join', (data) => {
  const player: PlayerInQueue = {
    ...data,
    socketId: socket.id,
    joinedAt: Date.now(),
    expandedRange: 100
  };

  // Añadir a cola correspondiente
  matchmakingQueues[data.mode].push(player);

  // Confirmar búsqueda
  socket.emit('matchmaking:searching', {
    position: matchmakingQueues[data.mode].length
  });

  // Actualizar estado del usuario
  onlineUsers.get(data.userId).status = 'searching';
});
```

### **Paso 3: Match Encontrado**

```typescript
// Servidor (ejecutado por Pairing Algorithm)
function createMatch(player1: PlayerInQueue, player2: PlayerInQueue) {
  // Crear sala
  const room = roomManager.createRoom(player1, player2);

  // Notificar a ambos jugadores
  io.to(player1.socketId).emit('matchmaking:found', {
    roomId: room.roomId,
    opponent: {
      username: player2.username,
      elo: player2.elo
    },
    color: room.white.userId === player1.userId ? 'white' : 'black',
    timeControl: room.timeControl
  });

  io.to(player2.socketId).emit('matchmaking:found', {
    roomId: room.roomId,
    opponent: {
      username: player1.username,
      elo: player1.elo
    },
    color: room.white.userId === player2.userId ? 'white' : 'black',
    timeControl: room.timeControl
  });

  // Esperar 3 segundos para que ambos carguen
  setTimeout(() => {
    startGame(room);
  }, 3000);
}
```

### **Paso 4: Inicio de Partida**

```typescript
function startGame(room: GameRoom) {
  room.status = 'active';

  // Inicializar cronómetros
  const timeMs = room.timeControl.minutes * 60 * 1000;
  room.white.timeRemaining = timeMs;
  room.black.timeRemaining = timeMs;

  // Iniciar timer
  timerManager.startTimer(room.roomId, room);

  // Notificar inicio
  io.to(room.roomId).emit('game:start', {
    roomId: room.roomId,
    white: {
      username: room.white.username,
      elo: room.white.elo,
      timeRemaining: room.white.timeRemaining
    },
    black: {
      username: room.black.username,
      elo: room.black.elo,
      timeRemaining: room.black.timeRemaining
    },
    timeControl: room.timeControl,
    initialFen: room.gameState.fen
  });
}
```

### **Paso 5: Jugador Hace Movimiento**

```typescript
// Cliente
socket.emit('game:move', {
  roomId: currentRoom.id,
  move: {
    from: 'e2',
    to: 'e4',
    piece: 'p',
    promotion: null
  }
});

// Servidor
socket.on('game:move', async (data) => {
  const room = roomManager.getRoom(data.roomId);

  if (!room || room.status !== 'active') {
    socket.emit('error', { message: 'Invalid room' });
    return;
  }

  // Validar movimiento
  const result = gameStateManager.validateMove(
    room,
    data.move,
    socket.userId
  );

  if (!result.valid) {
    socket.emit('game:move:invalid', { error: result.error });
    return;
  }

  // Pausar timer del jugador actual
  timerManager.pauseTimer(room.roomId);

  // Añadir incremento si aplica
  const currentPlayer = room.gameState.turn === 'white' ? 'black' : 'white';
  if (room.timeControl.increment > 0) {
    timerManager.addIncrement(room, currentPlayer);
  }

  // Reanudar timer para el siguiente jugador
  timerManager.startTimer(room.roomId, room);

  // Broadcast movimiento a ambos jugadores
  io.to(room.roomId).emit('game:move:received', {
    move: data.move,
    newState: result.newState,
    timeRemaining: {
      white: room.white.timeRemaining,
      black: room.black.timeRemaining
    }
  });

  // Verificar fin de partida
  if (result.newState.checkmate ||
      result.newState.stalemate ||
      result.newState.draw) {
    handleGameEnd(room, result.newState);
  }
});
```

### **Paso 6: Fin de Partida**

```typescript
async function handleGameEnd(room: GameRoom, state: ChessGameState) {
  // Pausar timer
  timerManager.pauseTimer(room.roomId);

  room.status = 'finished';

  // Determinar resultado
  let result: GameResult;
  if (state.checkmate) {
    const winner = state.turn === 'white' ? 'black' : 'white';
    result = { winner, method: 'checkmate' };
  } else if (state.stalemate) {
    result = { winner: 'draw', method: 'stalemate' };
  } else if (state.draw) {
    result = { winner: 'draw', method: 'insufficient_material' };
  }

  // Guardar partida y actualizar ELO
  await gameStateManager.saveGame(room, result);

  // Notificar a jugadores
  io.to(room.roomId).emit('game:end', {
    result: result,
    finalState: state,
    pgn: state.pgn,
    eloChanges: {
      white: result.whiteEloChange,
      black: result.blackEloChange
    }
  });

  // Limpiar sala después de 30 segundos
  setTimeout(() => {
    roomManager.deleteRoom(room.roomId);
  }, 30000);
}
```

---

## 🛡️ Manejo de Desconexiones

### **Desconexión Temporal (< 2 minutos)**

```typescript
socket.on('disconnect', (reason) => {
  const user = onlineUsers.get(socket.userId);

  if (!user) return;

  // Buscar si está en una partida activa
  const room = findRoomByUserId(socket.userId);

  if (room && room.status === 'active') {
    // Marcar como desconectado
    const player = room.white.userId === socket.userId
      ? room.white
      : room.black;

    player.connected = false;

    // Pausar timer
    timerManager.pauseTimer(room.roomId);

    // Notificar al oponente
    const opponentSocketId = room.white.userId === socket.userId
      ? room.black.socketId
      : room.white.socketId;

    io.to(opponentSocketId).emit('game:opponent:disconnected', {
      message: 'Opponent disconnected. Waiting for reconnection...',
      gracePeriod: 120000 // 2 minutos
    });

    // Timer de gracia (2 minutos para reconectar)
    setTimeout(() => {
      if (!player.connected) {
        // Oponente gana por abandono
        handleGameEnd(room, {
          winner: room.white.userId === socket.userId ? 'black' : 'white',
          method: 'abandonment'
        });
      }
    }, 120000);
  }

  // Remover de usuarios online
  onlineUsers.delete(socket.userId);
});
```

### **Reconexión Exitosa**

```typescript
socket.on('reconnect', () => {
  const user = authenticateUser(socket);

  // Buscar partida activa
  const room = findRoomByUserId(user.userId);

  if (room && room.status === 'active') {
    // Marcar como conectado
    const player = room.white.userId === user.userId
      ? room.white
      : room.black;

    player.connected = true;
    player.socketId = socket.id;

    // Re-unir a la sala
    socket.join(room.roomId);

    // Enviar estado actual de la partida
    socket.emit('game:state:restore', {
      roomId: room.roomId,
      gameState: room.gameState,
      timeRemaining: {
        white: room.white.timeRemaining,
        black: room.black.timeRemaining
      },
      chat: room.chat
    });

    // Reanudar timer
    timerManager.startTimer(room.roomId, room);

    // Notificar al oponente
    const opponentSocketId = room.white.userId === user.userId
      ? room.black.socketId
      : room.white.socketId;

    io.to(opponentSocketId).emit('game:opponent:reconnected', {
      message: 'Opponent reconnected. Game resumed.'
    });
  }
});
```

---

## 📊 Sistema de Ranking ELO

### **Cálculo de Cambios de ELO**

Basado en el sistema FIDE oficial:

```typescript
function calculateEloChange(
  player1Elo: number,
  player2Elo: number,
  result: 'win' | 'loss' | 'draw'
): number {
  const K = 32; // K-factor (constante)

  // Probabilidad esperada de victoria
  const expectedScore = 1 / (1 + Math.pow(10, (player2Elo - player1Elo) / 400));

  // Resultado real (1 = victoria, 0.5 = empate, 0 = derrota)
  const actualScore = result === 'win' ? 1 : result === 'draw' ? 0.5 : 0;

  // Cambio de ELO
  const eloChange = Math.round(K * (actualScore - expectedScore));

  return eloChange;
}

// Ejemplo:
// Jugador A (ELO 1500) vs Jugador B (ELO 1600)
// Si A gana: +24 ELO (victoria inesperada)
// Si A pierde: -8 ELO (derrota esperada)
// Si empatan: +8 ELO (buen resultado para A)
```

### **Protección contra Volatilidad**

```typescript
function applySafetyLimits(eloChange: number, currentElo: number): number {
  // Limitar cambio máximo a ±40 puntos
  const limitedChange = Math.max(-40, Math.min(40, eloChange));

  // Prevenir ELO negativo
  if (currentElo + limitedChange < 100) {
    return 100 - currentElo;
  }

  return limitedChange;
}
```

---

## 📈 Escalabilidad

### **Horizontal Scaling con Redis**

```typescript
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

const pubClient = createClient({ host: 'redis-server', port: 6379 });
const subClient = pubClient.duplicate();

await Promise.all([pubClient.connect(), subClient.connect()]);

io.adapter(createAdapter(pubClient, subClient));
```

**Beneficios:**
- ✅ Múltiples instancias del servidor WebSocket
- ✅ Broadcasting entre instancias
- ✅ Sesiones compartidas

### **Load Balancing**

```nginx
upstream websocket_backend {
    ip_hash; # Sticky sessions

    server ws-server-1:3000;
    server ws-server-2:3000;
    server ws-server-3:3000;
}

server {
    listen 80;

    location /socket.io/ {
        proxy_pass http://websocket_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

---

## 🔒 Seguridad

### **Autenticación de WebSocket**

```typescript
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error('Authentication required'));
  }

  try {
    const user = await verifyToken(token);
    socket.userId = user.id;
    socket.username = user.username;
    next();
  } catch (error) {
    next(new Error('Invalid token'));
  }
});
```

### **Validación de Movimientos**

```typescript
// Siempre validar en el servidor, NUNCA confiar en el cliente
function validateMove(room: GameRoom, move: Move, userId: string): boolean {
  // 1. Verificar que es el turno del jugador
  const isPlayerTurn =
    (room.gameState.turn === 'white' && room.white.userId === userId) ||
    (room.gameState.turn === 'black' && room.black.userId === userId);

  if (!isPlayerTurn) return false;

  // 2. Validar movimiento con chess.js (librería de confianza)
  const chess = new Chess(room.gameState.fen);
  const validMove = chess.move(move);

  return validMove !== null;
}
```

### **Rate Limiting**

```typescript
import rateLimit from 'socket.io-rate-limit';

io.use(rateLimit({
  tokensPerInterval: 10,
  interval: 1000, // 1 segundo
  fireImmediately: true
}));
```

---

## 📊 Monitoreo y Métricas

### **Métricas Clave**

```typescript
interface MatchmakingMetrics {
  // Tiempo de espera
  averageWaitTime: number;         // Promedio
  medianWaitTime: number;          // Mediana
  p95WaitTime: number;             // Percentil 95

  // Calidad de match
  averageEloDifference: number;    // Diferencia promedio de ELO
  matchesWithin100Elo: number;     // % de matches ±100 ELO
  matchesWithin200Elo: number;     // % de matches ±200 ELO

  // Volumen
  activeSearches: number;          // Búsquedas activas
  matchesPerMinute: number;        // Matches creados/min
  activeGames: number;             // Partidas en curso

  // Rendimiento
  serverLatency: number;           // Latencia del servidor
  messageThroughput: number;       // Mensajes/segundo

  // Estabilidad
  disconnectionRate: number;       // % de desconexiones
  reconnectionSuccess: number;     // % de reconexiones exitosas
}
```

### **Dashboard de Monitoreo**

```typescript
// Actualizar métricas cada 10 segundos
setInterval(() => {
  const metrics = calculateMetrics();

  // Enviar a servicio de monitoreo (ej: Grafana)
  metricsService.push(metrics);

  // Logs críticos
  if (metrics.averageWaitTime > 30000) {
    logger.warn('High wait time detected', { metrics });
  }

  if (metrics.disconnectionRate > 0.05) {
    logger.error('High disconnection rate', { metrics });
  }
}, 10000);
```

---

## 🎯 Mejores Prácticas

### ✅ **DO (Hacer)**
1. ✅ Validar TODOS los movimientos en el servidor
2. ✅ Usar chess.js para validación de reglas
3. ✅ Implementar reconexión automática
4. ✅ Pausar timers durante desconexiones
5. ✅ Guardar estado de partida frecuentemente
6. ✅ Usar rooms de Socket.io para broadcast eficiente
7. ✅ Implementar rate limiting

### ❌ **DON'T (No Hacer)**
1. ❌ Confiar en validación del cliente
2. ❌ Exponer ELO de otros jugadores antes del match
3. ❌ Permitir reconexiones ilimitadas
4. ❌ Olvidar limpiar salas finalizadas
5. ❌ Usar polling en lugar de WebSockets
6. ❌ Ignorar casos de edge (empates, timeouts)

---

## 📚 Recursos Adicionales

- **Socket.io Documentation**: https://socket.io/docs/v4/
- **chess.js Library**: https://github.com/jhlywa/chess.js
- **FIDE Rating System**: https://handbook.fide.com/
- **Redis Adapter**: https://socket.io/docs/v4/redis-adapter/

---

## 🏆 Conclusión

El sistema de matchmaking de Chess Clash combina:
- ✅ **Algoritmos inteligentes** de emparejamiento por ELO
- ✅ **Sincronización en tiempo real** con WebSockets
- ✅ **Validación robusta** de movimientos
- ✅ **Gestión resiliente** de desconexiones
- ✅ **Escalabilidad horizontal** con Redis

Resultado: **Partidas balanceadas, rápidas y justas para todos los jugadores**. ♟️🏆
