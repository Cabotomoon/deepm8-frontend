# 🧠 Deep M8 Coach Engine V1

Sistema avanzado de análisis y entrenamiento de ajedrez con inteligencia artificial.

## 🎯 Características Principales

### 1️⃣ Análisis Profundo con Stockfish
- Evaluación precisa de cada jugada con motor de ajedrez de nivel maestro
- Clasificación automática: Excelente, Buena, Imprecisión, Error, Blunder
- Sugerencias de mejores movimientos alternativos
- Evaluación posicional en centipeones

### 2️⃣ Feedback Personalizado con IA (LLM)
- **Resumen del Coach**: Análisis general del rendimiento
- **Insights Clave**: 3 observaciones específicas sobre tu juego
- **Plan de Entrenamiento**: Ejercicios y áreas de enfoque personalizadas
- **Análisis Profundo**: Evaluación detallada de patrones y errores
- **Mensaje Motivacional**: Feedback constructivo y motivador
- **Análisis por Fase**: Detección automática de debilidades en apertura/medio/final

### 3️⃣ Perfil Persistente del Jugador
- **Estadísticas Históricas**:
  - Total de partidas jugadas
  - Precisión promedio acumulada
  - Total de movimientos realizados

- **Análisis de Tendencias**:
  - 📈 Mejorando: Precisión aumentando
  - ➡️ Estable: Rendimiento consistente
  - 📉 Necesita atención: Precisión descendiendo

- **Fortalezas Identificadas**:
  - Precisión excepcional (85%+)
  - Buena precisión táctica (70%+)
  - Racha ganadora consistente
  - Excelente control de errores

- **Patrones de Debilidad**:
  - Precisión táctica baja
  - Errores graves frecuentes
  - Comprensión posicional débil
  - Detección automática por frecuencia

### 4️⃣ Historial de Partidas
- Últimas 50 partidas almacenadas
- Visualización de rendimiento por partida
- Indicador de color jugado (Blancas/Negras)
- Fecha de cada partida

### 5️⃣ Gráfico de Progreso ⭐ NUEVO
- **Gráfico de Barras Interactivo**: Visualiza precisión de últimas 10 partidas
- **Media Móvil**: Línea punteada mostrando tendencia
- **Tooltips Informativos**: Hover para ver detalles de cada partida
- **Estadísticas Rápidas**:
  - Tendencia de progreso (+/- porcentaje)
  - Mejor racha personal
  - Promedio reciente
  - Peor partida
  - Blunders promedio
- **Código de Colores**:
  - Verde: Excelente (85%+)
  - Azul: Bueno (70-84%)
  - Amarillo: Regular (60-69%)
  - Naranja: Bajo (<60%)

### 6️⃣ Exportación de Análisis ⭐ NUEVO
- **Formato JSON**: Exporta datos completos para procesamiento
- **Formato Markdown**: Reporte legible y profesional
- **Copiar al Portapapeles**: Comparte análisis rápidamente
- **Incluye**:
  - Resumen de partida
  - Feedback completo de IA
  - Análisis movimiento por movimiento
  - Estadísticas del perfil
  - Plan de entrenamiento

### 7️⃣ Detección de Fase de Juego ⭐ NUEVO
- **Identificación Automática**: Apertura / Medio Juego / Final
- **Análisis por Fase**:
  - Distribución de movimientos
  - Tasa de errores por fase
  - Identificación de fase más débil
- **Consejos Específicos**:
  - Apertura: Desarrollo, control del centro, enroque
  - Medio Juego: Táctica, planes, coordinación
  - Final: Activación del rey, peones pasados
- **Feedback Personalizado**: LLM integra análisis de fase en recomendaciones

## 🏗️ Arquitectura Técnica

### Componentes Principales

#### `GameAnalysis.tsx`
Componente principal con 3 pestañas:
- **💡 Feedback IA**: Análisis con LLM
- **📊 Análisis Detallado**: Movimiento por movimiento
- **👤 Mi Perfil**: Estadísticas y progreso con gráficos

#### `ProgressChart.tsx` ⭐ NUEVO
Visualización de progreso:
- Gráfico de barras interactivo
- Media móvil con línea punteada
- Tooltips con detalles
- Estadísticas de rendimiento

#### `playerProfileService.ts`
Gestión de perfil persistente:
- `getProfile()`: Obtener o crear perfil
- `updateWithGame()`: Actualizar con nueva partida
- `detectWeaknesses()`: Identificar patrones de error
- `identifyStrengths()`: Reconocer fortalezas
- Persistencia con `@seaverse/data-sdk`

#### `llmCoachService.ts`
Generación de feedback inteligente:
- `generateFeedback()`: Crear análisis personalizado
- Usa `seacloud-sdk` con `gemini-2.0-flash-001`
- Prompt engineering específico para coaching
- Integra análisis de fase de juego ⭐ NUEVO
- Parseo estructurado de respuestas
- Fallback automático en caso de error

#### `exportService.ts` ⭐ NUEVO
Exportación de análisis:
- `exportAsJSON()`: Datos estructurados
- `exportAsMarkdown()`: Reporte profesional
- `copyToClipboard()`: Compartir rápidamente
- Formato personalizado con emojis

#### `gamePhaseService.ts` ⭐ NUEVO
Detección de fase de juego:
- `detectPhase()`: Identifica apertura/medio/final
- `analyzePhaseDistribution()`: Estadísticas por fase
- `getPhaseAdvice()`: Consejos específicos
- Análisis de material y número de movimiento

### Flujo de Análisis

```
1. [Jugador finaliza partida]
   ↓
2. [Fase: Analyzing] 🤔 (0-50%)
   → Stockfish analiza cada movimiento
   → Clasifica: excellent/good/inaccuracy/mistake/blunder
   → Detecta fase de juego (apertura/medio/final) ⭐ NUEVO
   ↓
3. [Fase: Generating Feedback] 🧠 (60-100%)
   → Crea GameRecord con estadísticas (60%)
   → Actualiza perfil del jugador (70%)
   → Analiza distribución por fase ⭐ NUEVO
   → LLM genera feedback personalizado con contexto de fase (80%)
   ↓
4. [Fase: Complete] ✅
   → Muestra 3 pestañas con toda la información
   → Botones de exportación activos ⭐ NUEVO
```

## 📊 Estructura de Datos

### GameRecord
```typescript
{
  id: string;
  timestamp: number;
  accuracy: number;
  totalMoves: number;
  excellentMoves: number;
  goodMoves: number;
  inaccuracies: number;
  mistakes: number;
  blunders: number;
  playerColor: 'white' | 'black';
  result: 'win' | 'loss' | 'draw' | 'incomplete';
}
```

### PlayerProfile
```typescript
{
  id: string;
  totalGames: number;
  averageAccuracy: number;
  totalMoves: number;
  strengths: string[];
  weaknesses: WeaknessPattern[];
  gameHistory: GameRecord[]; // Últimas 50
  trainingPlan?: string;
  lastUpdated: number;
  createdAt: number;
}
```

### WeaknessPattern
```typescript
{
  type: 'opening' | 'middlegame' | 'endgame' | 'tactical' | 'positional';
  description: string;
  occurrences: number;
  lastSeen: number;
}
```

## 🎨 Clasificación de Movimientos

| Clasificación | Evaluación         | Icono | Color   |
|---------------|-------------------|-------|---------|
| Excellent     | < 15 centipeones  | ✓✓    | Verde   |
| Good          | < 50 centipeones  | ✓     | Azul    |
| Inaccuracy    | < 100 centipeones | ?!    | Amarillo|
| Mistake       | < 300 centipeones | ?     | Naranja |
| Blunder       | > 300 centipeones | ??    | Rojo    |

## 🚀 Tecnologías Utilizadas

- **Análisis de Ajedrez**: Stockfish (nivel 12)
- **IA Generativa**: SeaCloud SDK + Gemini 2.0 Flash
- **Persistencia**: @seaverse/data-sdk
- **Framework**: React 19 + TypeScript
- **UI**: Tailwind CSS con diseño glassmorphism

## 🔮 Roadmap V2

### Funcionalidades Planificadas
- [ ] Análisis de aperturas específicas con base de datos ECO
- [ ] Comparación con jugadores de nivel similar
- [ ] Recomendaciones de estudios específicos
- [ ] Sistema de logros y badges
- [ ] Modo de entrenamiento con puzzles adaptativos
- [ ] Integración con bases de datos de partidas maestras
- [ ] Compartir análisis en redes sociales

### ✅ Completado en V1
- [x] Detección automática de fase del juego (apertura/medio/final)
- [x] Gráficos de progreso histórico
- [x] Sistema de exportación (JSON/Markdown/Clipboard)

## 📝 Uso

1. **Juega una partida** contra la IA
2. **Finaliza el juego** (jaque mate, tablas, o rendición)
3. **Automáticamente se abre** el Deep M8 Coach Engine
4. **Espera el análisis** (2 fases: Stockfish + IA)
5. **Explora las 3 pestañas**:
   - Ver feedback personalizado de IA
   - Revisar análisis detallado movimiento a movimiento
   - Consultar tu perfil y progreso con gráficos ⭐ NUEVO
6. **Exporta tu análisis** (opcional):
   - 📋 Copiar al portapapeles
   - 📄 Descargar como Markdown
   - 💾 Descargar como JSON

## 🎓 Consejos de Uso

- **Juega regularmente**: El sistema aprende de tus patrones
- **Revisa el feedback IA**: Insights personalizados valiosos con análisis de fase
- **Sigue el plan de entrenamiento**: Ejercicios específicos para ti y tu fase más débil ⭐ NUEVO
- **Monitorea tu perfil**: Observa tu tendencia de mejora en el gráfico ⭐ NUEVO
- **Analiza tus debilidades**: Enfócate en los patrones recurrentes
- **Exporta partidas importantes**: Guarda análisis detallados para revisión posterior ⭐ NUEVO

---

**Deep M8 Coach Engine V1** - Tu entrenador personal de ajedrez con IA 🧠♟️
