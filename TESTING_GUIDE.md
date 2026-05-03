# 🧪 Guía de Pruebas Locales - Sistema de Desconexión

Esta guía explica cómo probar el sistema de desconexión **localmente en desarrollo** sin necesidad de un servidor real.

---

## 🎯 Botones de Prueba Disponibles

Cuando ejecutas en modo desarrollo (`npm run dev`) y estás en una partida online, verás **3 botones de prueba morados/naranjas/rojos**:

### 1. 🧪 Rival se desconecta/reconecta (Morado)

**Qué hace:**
- Simula que tu **OPONENTE se desconecta**
- Muestra el mensaje: "⚠️ Oponente desconectado - Reconectará en: 30s, 29s..."
- Si NO haces clic otra vez, después de 30s → **Pantalla de VICTORIA** 🏆
- Si haces clic de nuevo (dentro de 30s) → Simula que el oponente reconectó

**Resultado esperado:**
- ✅ Ver mensaje de desconexión
- ✅ Ver temporizador contando 30s → 0s
- ✅ Ver pantalla de VICTORIA cuando llegue a 0
- ✅ Tu ELO sube (ejemplo: 1200 → 1216)

---

### 2. 🧪 YO me desconecto (30s test) (Naranja)

**Qué hace:**
- Simula que **TÚ te desconectas** por más de 30 segundos
- Espera 30 segundos
- Después de 30s → **Pantalla de DERROTA** 💀

**Pasos:**
1. Haz clic en el botón naranja
2. Verás un alert: "Te has desconectado. Espera 30 segundos..."
3. **Espera 30 segundos** (puedes seguir jugando mientras tanto)
4. Después de 30s → Verás otro alert + **Pantalla de DERROTA**

**Resultado esperado:**
- ✅ Ver pantalla de DERROTA después de 30s
- ✅ Ver mensaje: "⚠️ Partida abandonada"
- ✅ Tu ELO baja (ejemplo: 1250 → 1234)

---

### 3. 🧪 Derrota rápida (5s) (Rojo) ⭐ **RECOMENDADO PARA PRUEBAS RÁPIDAS**

**Qué hace:**
- Igual que el botón naranja, pero **solo espera 5 segundos** en vez de 30
- Perfecto para pruebas rápidas sin esperar tanto

**Pasos:**
1. Haz clic en el botón rojo
2. Verás un alert: "FAST TEST: En 5 segundos verás la pantalla de derrota"
3. **Espera 5 segundos**
4. ✅ **Pantalla de DERROTA** aparece automáticamente

**Resultado esperado:**
- ✅ Ver pantalla de DERROTA después de 5s
- ✅ Ver "⚠️ Partida abandonada"
- ✅ Tu ELO baja

---

## 📋 Checklist de Pruebas

Ejecuta estas pruebas para verificar que todo funciona:

### ✅ Test 1: Victoria por Abandono del Rival

- [ ] Inicia una partida online (vs IA o Matchmaking)
- [ ] Haz clic en "🧪 Rival se desconecta"
- [ ] ¿Ves el mensaje "⚠️ Oponente desconectado"?
- [ ] ¿Ves el temporizador "Reconectará en: 30s, 29s, 28s..."?
- [ ] Espera a que llegue a 0
- [ ] ¿Aparece la pantalla de **VICTORIA** 🏆?
- [ ] ¿Tu ELO subió? (Ejemplo: 1200 → 1216)
- [ ] ¿Se guardó la partida en el historial?

### ✅ Test 2: Reconexión Exitosa (Rival vuelve)

- [ ] Inicia una partida online
- [ ] Haz clic en "🧪 Rival se desconecta"
- [ ] Espera 10 segundos (temporizador debe estar en ~20s)
- [ ] Haz clic otra vez (ahora dice "🧪 Rival reconecta")
- [ ] ¿El mensaje desaparece?
- [ ] ¿El temporizador se detiene?
- [ ] ¿El juego continúa normalmente?

### ✅ Test 3: Derrota por MI Abandono (Test Rápido)

- [ ] Inicia una partida online
- [ ] Haz clic en "🧪 Derrota rápida (5s)" (botón rojo)
- [ ] Espera 5 segundos
- [ ] ¿Aparece la pantalla de **DERROTA** 💀?
- [ ] ¿Ves el aviso "⚠️ Partida abandonada"?
- [ ] ¿Tu ELO bajó? (Ejemplo: 1250 → 1234)
- [ ] ¿Se guardó la partida en el historial?

### ✅ Test 4: Derrota por MI Abandono (Test Realista 30s)

- [ ] Inicia una partida online
- [ ] Haz clic en "🧪 YO me desconecto (30s test)" (botón naranja)
- [ ] Espera 30 segundos completos
- [ ] ¿Aparece la pantalla de **DERROTA** 💀?
- [ ] ¿Tu ELO bajó correctamente?

---

## 🎮 Cómo Ejecutar las Pruebas

### Opción 1: Prueba Simple (Más Rápida) ⭐

```bash
# Terminal 1: Ejecutar el servidor de desarrollo
npm run dev

# Navegador:
1. Abre http://localhost:5173
2. Crea un perfil de usuario
3. Ir a "Jugar Online" > Matchmaking
4. Cuando encuentre partida, hacer clic en "🧪 Derrota rápida (5s)"
5. ✅ En 5 segundos verás la pantalla de DERROTA
```

### Opción 2: Prueba Completa con Mock Service

Si quieres probar con el servicio mock completo:

```typescript
// En src/pages/Home.tsx, cambia la importación (solo para testing):

// ANTES:
import { socketService } from '../services/socketService';

// DURANTE PRUEBAS:
import { mockSocketService as socketService } from '../services/mockSocketService';
```

Luego ejecuta las pruebas normalmente. El mock service:
- ✅ Simula conexión al servidor
- ✅ Simula matchmaking (encuentra oponente ficticio)
- ✅ Simula desconexión/reconexión
- ✅ **Guarda resultados pendientes** para cuando reconectes
- ✅ Envía `game-end` automáticamente cuando reconectas después de abandonar

---

## 🔍 Verificar que Funciona

### Pantalla de Victoria (cuando rival se desconecta)

Debe mostrar:
```
🏆 ¡VICTORIA!

Tu Nombre
1216 (+16)          ← ELO nuevo (verde)

VS

Mock Opponent
1250 ELO

Movimientos: 15
Duración: 5:23
```

### Pantalla de Derrota (cuando TÚ te desconectas)

Debe mostrar:
```
💀 ¡DERROTA!

Tu Nombre
1234 (-16)          ← ELO nuevo (rojo)

⚠️ Partida abandonada    ← Aviso de abandono

VS

Mock Opponent
1250 ELO

Movimientos: 15
Duración: 5:23
```

---

## 🐛 Solución de Problemas

### Problema: No veo los botones de prueba

**Solución:**
- Los botones **solo aparecen en modo desarrollo** (`npm run dev`)
- Solo aparecen cuando estás en una **partida online**
- Verifica que `import.meta.env.DEV === true`

### Problema: La pantalla de derrota no aparece

**Solución:**
1. Abre la consola del navegador (F12)
2. Busca el mensaje: `📡 TEST: Simulating server game-end event`
3. Verifica que `gameResult === 'defeat'`
4. Verifica que `chessGamePro.showVictoryScreen === true`

**Si no ves estos logs:**
- El botón no está ejecutando correctamente
- Revisa que hiciste clic en el botón correcto (rojo o naranja)
- Espera los 5 o 30 segundos completos

### Problema: El ELO no cambia

**Solución:**
- Asegúrate de tener un perfil de usuario creado
- Verifica que `chessGamePro.userProfile` existe
- Abre DevTools → Application → IndexedDB → Verifica que hay datos

---

## 📊 Logs de Debug

Cuando ejecutes las pruebas, verás estos logs en la consola:

### Victoria (Rival se desconecta):
```
🧪 TEST: Simulating opponent disconnection (I win)
⏰ Reconnection timeout - opponent abandoned
📡 Sending game-end event
🏆 Setting game result to VICTORY
💾 Saving game result: victory
✅ Pantalla de VICTORIA mostrada
```

### Derrota (YO me desconecto):
```
🧪 TEST: Simulating MY disconnection - will lose after 5s
⏰ FAST TEST: 5 seconds passed - you lost by abandonment
📡 TEST: Simulating server game-end event: { winner: 'black', reason: 'abandonment' }
💀 Setting game result to DEFEAT
💾 Saving game result: defeat
✅ Pantalla de DERROTA mostrada
```

---

## ✅ Resumen de Funcionalidad

| Escenario | Botón | Tiempo | Pantalla | ELO | ✅ |
|-----------|-------|--------|----------|-----|---|
| Rival abandona | 🧪 Morado | 30s | VICTORIA 🏆 | +16 | ✅ |
| Rival reconecta | 🧪 Morado (2x) | - | - | - | ✅ |
| YO abandono (realista) | 🧪 Naranja | 30s | DERROTA 💀 | -16 | ✅ |
| YO abandono (rápido) | 🧪 Rojo | 5s | DERROTA 💀 | -16 | ✅ |

---

## 🎯 Siguiente Paso

Una vez que hayas verificado que **todo funciona localmente**, el siguiente paso es:

1. **Contactar al equipo de backend** con el archivo `SERVER_REQUIREMENTS.md`
2. **Solicitar implementación** de la lógica de reconexión
3. **Integrar con servidor real** cuando esté listo

**El código del cliente ya está 100% listo** para funcionar con el servidor real. Solo falta que el backend implemente el envío de `game-end` a jugadores desconectados cuando reconecten.

---

## 📞 Contacto

Si encuentras algún problema o tienes preguntas:
- Revisa los logs de la consola (F12)
- Verifica que seguiste todos los pasos del checklist
- Asegúrate de estar en modo desarrollo (`npm run dev`)

**¡Buena suerte con las pruebas!** 🎮
