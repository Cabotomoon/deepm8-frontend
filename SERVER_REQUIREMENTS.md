# Requisitos del Servidor para Desconexiones

Este documento describe cómo el servidor debe manejar las desconexiones y reconexiones de jugadores.

## 📡 Flujo de Desconexión/Reconexión

### Escenario: Jugador A se desconecta

```
1. Jugador A pierde conexión
   ↓
2. Servidor detecta desconexión
   ↓
3. Servidor envía a Jugador B: 'opponent-disconnected'
   ↓
4. Servidor inicia temporizador de 30 segundos
   ↓
5a. SI Jugador A reconecta antes de 30s:
    → Servidor envía a Jugador B: 'opponent-reconnected'
    → Juego continúa normalmente

5b. SI Jugador A NO reconecta en 30s:
    → Servidor marca el juego como terminado
    → winner: color de Jugador B
    → reason: 'abandonment'
    → Servidor envía a Jugador B: 'game-end' (Victoria)
    → Cuando Jugador A reconecte → Servidor envía a Jugador A: 'game-end' (Derrota)
```

---

## 🔧 Implementación del Servidor

### 1. Detectar Desconexión

```typescript
// Cuando un jugador se desconecta
socket.on('disconnect', () => {
  const player = findPlayerBySocketId(socket.id);
  const game = findActiveGame(player.id);

  if (game && game.status === 'playing') {
    // Notificar al oponente
    const opponent = findOpponent(game, player.id);
    io.to(opponent.socketId).emit('opponent-disconnected');

    // Iniciar temporizador de 30 segundos
    game.disconnectionTimer = setTimeout(() => {
      // Tiempo agotado - jugador pierde por abandono
      const winner = opponent.color;

      // Marcar juego como terminado
      game.status = 'ended';
      game.winner = winner;
      game.endReason = 'abandonment';

      // Notificar al oponente (que ganó)
      io.to(opponent.socketId).emit('game-end', {
        winner: winner,
        reason: 'abandonment'
      });

      // Guardar que el jugador desconectado tiene un resultado pendiente
      player.pendingGameResult = {
        winner: winner,
        reason: 'abandonment'
      };

    }, 30000); // 30 segundos
  }
});
```

### 2. Manejar Reconexión (ANTES de 30s)

```typescript
// Cuando un jugador reconecta ANTES de que expire el temporizador
socket.on('reconnect-to-game', ({ gameId, playerId }) => {
  const game = findGame(gameId);
  const player = findPlayer(playerId);

  if (game && game.disconnectionTimer) {
    // Cancelar temporizador de abandono
    clearTimeout(game.disconnectionTimer);
    game.disconnectionTimer = null;

    // Actualizar socket ID del jugador
    player.socketId = socket.id;

    // Notificar al oponente que el jugador volvió
    const opponent = findOpponent(game, playerId);
    io.to(opponent.socketId).emit('opponent-reconnected');

    // Enviar estado actual del juego al jugador reconectado
    socket.emit('game-state', {
      board: game.board,
      currentPlayer: game.currentPlayer,
      moveHistory: game.moveHistory,
      // ... otros datos del juego
    });
  }
});
```

### 3. Manejar Reconexión (DESPUÉS de 30s) ⚠️ **CRÍTICO**

```typescript
// Cuando un jugador reconecta DESPUÉS de que expiró el temporizador
socket.on('connect', () => {
  const player = findPlayerBySocketId(socket.id); // Buscar por userId, no socketId

  if (player && player.pendingGameResult) {
    // El jugador tiene un resultado de juego pendiente (perdió por abandono)

    // Enviar evento de fin de juego
    socket.emit('game-end', {
      winner: player.pendingGameResult.winner,
      reason: player.pendingGameResult.reason
    });

    // Limpiar resultado pendiente
    delete player.pendingGameResult;
  }
});
```

---

## 🎯 Eventos que el Cliente Espera

### Del Servidor → Cliente

| Evento | Cuándo | Datos | Receptor |
|--------|--------|-------|----------|
| `opponent-disconnected` | Cuando el rival pierde conexión | `{}` | Oponente |
| `opponent-reconnected` | Cuando el rival vuelve (< 30s) | `{}` | Oponente |
| `game-end` | Cuando el temporizador llega a 0 | `{ winner: 'white'\|'black'\|'draw', reason: 'abandonment' }` | **Ambos jugadores** |

### Del Cliente → Servidor

| Evento | Cuándo | Datos |
|--------|--------|-------|
| `game-end` | Cuando el temporizador del cliente llega a 0 | `{ matchId: string, winner: 'white'\|'black', reason: 'abandonment' }` |

---

## ✅ Checklist de Implementación

- [ ] Servidor detecta desconexión y envía `opponent-disconnected`
- [ ] Servidor inicia temporizador de 30 segundos
- [ ] Si jugador reconecta < 30s → Envía `opponent-reconnected`
- [ ] Si jugador NO reconecta en 30s → Marca juego como terminado
- [ ] Servidor envía `game-end` al oponente (Victoria)
- [ ] **CRÍTICO**: Servidor guarda resultado pendiente para el jugador desconectado
- [ ] **CRÍTICO**: Cuando el jugador desconectado reconecte → Servidor envía `game-end` (Derrota)
- [ ] Servidor actualiza ELO de ambos jugadores (ganador +puntos, perdedor -puntos)

---

## 🧪 Cómo Probar

### Prueba 1: Reconexión Exitosa (< 30s)

1. Jugador A y B inician partida
2. Jugador A cierra WiFi por 10 segundos
3. Jugador B ve: "⚠️ Oponente desconectado - Reconectará en: 20s"
4. Jugador A abre WiFi y reconecta
5. ✅ Jugador B ve: Mensaje desaparece
6. ✅ Juego continúa normalmente

### Prueba 2: Abandono por Desconexión (> 30s) ⚠️ **ESTE ES EL PROBLEMA ACTUAL**

1. Jugador A y B inician partida
2. Jugador A cierra WiFi por 35 segundos
3. **Jugador B (conectado)**:
   - Ve: "⚠️ Oponente desconectado - Reconectará en: 30s, 29s, ... 0s"
   - Cuando llega a 0 → ✅ Pantalla de **VICTORIA** 🏆
   - ELO sube (ejemplo: 1200 → 1216)
4. **Jugador A (desconectado)**:
   - Abre WiFi y reconecta después de 35s
   - **ACTUALMENTE**: No ve nada ❌
   - **DEBERÍA VER**: Pantalla de **DERROTA** 💀
   - **DEBERÍA VER**: ELO baja (ejemplo: 1250 → 1234)

---

## 💡 Solución Actual (Mientras el Servidor se Implementa)

**El código del cliente ya está preparado** para recibir el evento `game-end` y mostrar la pantalla correcta.

**Lo que falta** es que el servidor:
1. Guarde el resultado del juego cuando un jugador abandona
2. Envíe el evento `game-end` al jugador desconectado cuando reconecte

**Archivo afectado**: `src/pages/Home.tsx`
- Línea 1690-1777: `handleGameEnd()` - Ya procesa correctamente los eventos de abandono
- Línea 1710-1716: Ya establece `gameResult='victory'` o `gameResult='defeat'` según corresponda
- Línea 2220-2339: La pantalla de victoria/derrota ya muestra el resultado correcto

---

## 📞 Contactar al Equipo de Backend

Si tienes acceso al código del servidor, implementa la lógica descrita en la sección "3. Manejar Reconexión (DESPUÉS de 30s)".

Si no tienes acceso, solicita al equipo de backend que:
1. Almacenen los resultados de juegos terminados por abandono
2. Envíen el evento `game-end` a los jugadores cuando reconecten

**El cliente ya está listo para recibir y procesar estos eventos correctamente.**
