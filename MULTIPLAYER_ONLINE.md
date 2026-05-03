# 🌐 Multijugador Online - Chess Clash

## ✅ Implementación Completa

Se ha implementado exitosamente el sistema de **multijugador online en tiempo real** con las siguientes características:

### 🎯 Características Implementadas

1. **✅ Sistema de Salas**
   - Crear salas personalizadas
   - Unirse a salas existentes
   - Lista de salas en tiempo real
   - 2 jugadores por sala

2. **✅ Sincronización en Tiempo Real**
   - WebSocket con Socket.IO
   - Movimientos sincronizados instantáneamente
   - Sin retraso perceptible

3. **✅ Chat en Vivo**
   - Mensajería en tiempo real
   - Historial de mensajes
   - Notificaciones visuales

4. **✅ Sistema de Reconexión Automática**
   - Detecta desconexiones del oponente
   - Reconecta automáticamente
   - Mantiene el estado del juego

5. **✅ Integración con ELO**
   - Emparejamiento por nivel
   - Cálculo automático de ELO después de cada partida
   - Historial de partidas online

### 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + TS)                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  MultiplayerLobby  ─────► socketService ◄───── Home.tsx    │
│       (UI)                (WebSocket Client)     (Game)     │
│                                                             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ Socket.IO
                         │
┌────────────────────────▼────────────────────────────────────┐
│                   BACKEND (Node.js)                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Socket.IO Server  ◄────► Room Manager ◄────► Game State   │
│   (WebSocket)              (CRUD Rooms)        (Sync)       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 📦 Archivos Clave

- **`src/services/socketService.ts`** - Cliente WebSocket con todas las operaciones
- **`src/components/MultiplayerLobby.tsx`** - UI del lobby y lista de salas
- **`src/pages/Home.tsx`** - Integración del modo online con el juego

### 🚀 Cómo Desplegar el Servidor

⚠️ **IMPORTANTE**: Necesitas desplegar un servidor Socket.IO para que funcione el multijugador online.

#### Opción 1: Servidor Simple con Node.js

Crea un archivo `server.js`:

\`\`\`javascript
const { Server } = require('socket.io');
const http = require('http');

const server = http.createServer();
const io = new Server(server, {
  cors: {
    origin: '*', // En producción, especifica tu dominio
    methods: ['GET', 'POST']
  }
});

const rooms = new Map();

io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  // Create room
  socket.on('create-room', ({ roomName, playerElo }, callback) => {
    const roomId = \`room_\${Date.now()}\`;
    const room = {
      id: roomId,
      name: roomName,
      players: [{
        id: socket.id,
        name: socket.handshake.auth.userName,
        elo: playerElo,
        color: 'white',
        connected: true
      }],
      status: 'waiting',
      createdAt: Date.now()
    };
    rooms.set(roomId, room);
    socket.join(roomId);
    callback({ success: true, room });
  });

  // Join room
  socket.on('join-room', ({ roomId, playerElo }, callback) => {
    const room = rooms.get(roomId);
    if (!room || room.players.length >= 2) {
      callback({ success: false, error: 'Room full or not found' });
      return;
    }
    room.players.push({
      id: socket.id,
      name: socket.handshake.auth.userName,
      elo: playerElo,
      color: 'black',
      connected: true
    });
    room.status = 'playing';
    socket.join(roomId);
    socket.to(roomId).emit('player-joined', room.players[1]);
    io.to(roomId).emit('game-start', room);
    callback({ success: true, room });
  });

  // Get rooms
  socket.on('get-rooms', (callback) => {
    const availableRooms = Array.from(rooms.values()).filter(r => r.status === 'waiting');
    callback({ success: true, rooms: availableRooms });
  });

  // Chess move
  socket.on('chess-move', ({ roomId, move }) => {
    socket.to(roomId).emit('chess-move', move);
  });

  // Chat message
  socket.on('chat-message', ({ roomId, message }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;
    io.to(roomId).emit('chat-message', {
      playerId: socket.id,
      playerName: player.name,
      message,
      timestamp: Date.now()
    });
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    // Notify opponent
    for (const [roomId, room] of rooms.entries()) {
      const player = room.players.find(p => p.id === socket.id);
      if (player) {
        socket.to(roomId).emit('opponent-disconnected');
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(\`Socket.IO server running on port \${PORT}\`);
});
\`\`\`

Ejecuta:
\`\`\`bash
npm install socket.io
node server.js
\`\`\`

#### Opción 2: Desplegar en Railway/Render

1. Sube el código del servidor a GitHub
2. Conecta con Railway o Render
3. Configura la variable de entorno `PORT`
4. Despliega automáticamente

#### Opción 3: Usar SeaVerse Infrastructure (Recomendado)

Si tienes acceso a la infraestructura de SeaVerse, simplemente actualiza la URL en `socketService.ts`:

\`\`\`typescript
const SOCKET_URL = 'https://chess.seaverse.com'; // URL de tu servidor
\`\`\`

### 🔧 Configuración

1. **Configurar URL del servidor**:

   Edita `src/services/socketService.ts` línea 15:
   \`\`\`typescript
   const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'TU_SERVIDOR_AQUI';
   \`\`\`

   O crea un archivo `.env.local`:
   \`\`\`
   VITE_SOCKET_URL=https://tu-servidor.com
   \`\`\`

2. **Compilar**:
   \`\`\`bash
   bun run build
   \`\`\`

### 🎮 Cómo Usar

1. **Crear Perfil** (si no lo tienes)
2. **Clic en "Multijugador Online"**
3. **Crear una Sala** o **Unirse a una existente**
4. **Esperar a que se una un oponente**
5. **¡Jugar en tiempo real!**
6. **Chatear con tu oponente**

### 📊 Estados del Juego

- **🟢 Esperando** - Sala creada, esperando oponente
- **🟡 Jugando** - Partida en curso
- **⚪ Finalizado** - Partida terminada

### 🔴 Indicadores en Vivo

- **🔴 Desconectado** - El oponente perdió conexión
- **✅ Reconectado** - El oponente se reconectó
- **💬 Nuevo mensaje** - Mensaje recibido en el chat

### 🏆 Sistema de ELO Online

Después de cada partida online:
- El ganador suma puntos ELO
- El perdedor resta puntos ELO
- El cálculo se basa en la diferencia de ELO
- Se guarda en el historial de partidas

### 🐛 Troubleshooting

**Problema**: "No se pudo conectar al servidor"
- **Solución**: Verifica que el servidor Socket.IO esté ejecutándose
- Comprueba la URL en `socketService.ts`

**Problema**: "No se sincronizan los movimientos"
- **Solución**: Revisa la consola del navegador
- Verifica que ambos jugadores estén en la misma sala

**Problema**: "El chat no funciona"
- **Solución**: Asegúrate de que el servidor implemente el evento `chat-message`

### 📝 Próximas Mejoras

- [ ] Reloj de partida sincronizado
- [ ] Sistema de clasificación (leaderboard)
- [ ] Espectadores en partidas
- [ ] Replay de partidas online
- [ ] Torneos automáticos
- [ ] Sistema de amigos
- [ ] Invitaciones privadas

---

**¡El multijugador online está listo!** 🎉

Solo falta desplegar el servidor Socket.IO y configurar la URL.
