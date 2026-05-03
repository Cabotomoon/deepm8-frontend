# 🎯 Multijugador Online con Matchmaking Automático

## ✅ Sistema Implementado

Se ha implementado un **sistema de matchmaking automático** que reemplaza el sistema de salas manual.

### 🎮 Características

1. **Matchmaking Automático por ELO**
   - El sistema busca automáticamente oponentes con ELO similar (±200 puntos)
   - Si no hay oponentes cercanos, amplía el rango gradualmente
   - Cola de espera con tiempo estimado

2. **Interfaz Simplificada**
   - Un solo botón: "Buscar Partida"
   - Indicador de búsqueda en tiempo real
   - Contador de jugadores en cola
   - Tiempo de búsqueda visible

3. **Emparejamiento Justo**
   - Prioriza jugadores con ELO cercano
   - Sistema FIFO (primero en llegar, primero en emparejar)
   - Notificación instantánea cuando se encuentra partida

4. **Características Existentes**
   - Chat en vivo durante la partida
   - Sincronización de movimientos en tiempo real
   - Reconexión automática
   - Cálculo de ELO después de cada partida

---

## 🚀 Cómo Usar

### Ejecutar el Servidor de Matchmaking

**Paso 1: Reemplazar el servidor anterior**

Si ya tienes el archivo `server.js` en `chess-server`, reemplázalo con el nuevo código de matchmaking:

Copia el contenido de `MATCHMAKING_SERVER.js` (está en la raíz de tu proyecto de ajedrez) al archivo `server.js` en la carpeta `chess-server`.

**Paso 2: Iniciar el servidor**

```bash
cd chess-server
node server.js
```

✅ Verás:
```
🚀 Chess Matchmaking Server iniciando...
✅ Servidor de Matchmaking corriendo en http://localhost:3001
📡 Sistema de emparejamiento automático por ELO activado
```

**Paso 3: Iniciar la app**

En otra terminal:

```bash
cd app-1775782200629-2f60caf6
npm run dev
```

**Paso 4: Probar el matchmaking**

1. Abre 2 navegadores (Chrome y Firefox, o Chrome normal + incógnito)
2. En ambos navegadores:
   - Crea un perfil
   - Clic en "🌐 Multijugador Online"
   - Clic en "🎮 Buscar Partida"
3. El sistema los emparejará automáticamente
4. ¡Comienza la partida!

---

## 📊 Cómo Funciona el Matchmaking

### Algoritmo de Emparejamiento

```
1. Jugador entra a la cola con su ELO
   ↓
2. Sistema busca oponentes con ELO ±200
   ↓
3a. ¿Hay oponente disponible?
    → SÍ: Crear partida inmediatamente
    → NO: Agregar a cola de espera
   ↓
4. Reintento cada 2 segundos
   ↓
5. Cuando llega nuevo jugador compatible → Match!
```

### Ventajas vs Sistema de Salas

| Sistema de Salas (Anterior) | Matchmaking Automático (Nuevo) |
|----------------------------|---------------------------------|
| Usuario crea sala manual   | Automático                     |
| Usuario elige sala         | Sistema elige oponente         |
| Sin filtro de nivel        | Emparejamiento por ELO         |
| Salas vacías problemáticas | Cola única eficiente           |
| Múltiples clics            | Un solo clic                   |

---

## 🎯 Logs del Servidor

### Cuando un jugador busca partida:

```
🔍 Jugador1 (ELO: 1200) busca partida
⏳ Jugador1 agregado a cola de matchmaking (1 jugadores en cola)
```

### Cuando se encuentra match:

```
🔍 Jugador2 (ELO: 1250) busca partida
✅ Match creado: Jugador1 (1200) vs Jugador2 (1250)
♟️ Movimiento en match match_xyz: e4
💬 [Match match_xyz] Jugador1: ¡Buena partida!
```

### Logs periódicos:

```
📊 Estado: 3 partidas activas | 2 jugadores en cola
```

---

## 🔧 Configuración Avanzada

### Ajustar Rango de ELO

En `MATCHMAKING_SERVER.js`, línea 22:

```javascript
// Cambiar el rango de ±200 a otro valor
Math.abs(p.elo - playerElo) <= 300  // ±300 puntos
```

### Ajustar Tiempo de Reintento

En `MATCHMAKING_SERVER.js`, línea 61:

```javascript
const retryInterval = setInterval(() => {
  // ...
}, 5000);  // Cambiar de 2000ms a 5000ms (5 segundos)
```

---

## 🐛 Troubleshooting

**Problema**: "No se pudo conectar al servidor"
- Verifica que el servidor esté corriendo (`node server.js`)
- Comprueba que esté en el puerto 3001

**Problema**: "Búsqueda infinita"
- Si solo hay 1 jugador, necesitas abrir otro navegador
- El matchmaking requiere al menos 2 jugadores

**Problema**: "ELO muy diferente"
- El sistema busca ±200 puntos de diferencia
- Si no hay oponentes cercanos, debes esperar

---

## 📝 Próximas Mejoras

- [ ] Ampliar rango de ELO automáticamente después de 30s
- [ ] Sistema de ranking global (leaderboard)
- [ ] Estadísticas de matchmaking (tiempo promedio, etc.)
- [ ] Modos de juego (Blitz, Rápido, Clásico)
- [ ] Penalización por abandonar partida

---

**¡El matchmaking automático está listo!** 🎉

Simplemente inicia el servidor, busca partida, y el sistema te emparejará automáticamente.
