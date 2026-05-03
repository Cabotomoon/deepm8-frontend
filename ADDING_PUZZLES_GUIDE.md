# 🎯 Guía para Agregar Nuevos Puzzles

## 📝 Plantilla de Puzzle

```typescript
{
  id: 'CATEGORÍA_NNN',           // Ejemplo: 'tact_008', 'open_006'
  fen: 'POSICIÓN_FEN',           // Obtener de chess.com o lichess.org
  theme: 'Nombre del Patrón',    // Ejemplo: 'Doble Amenaza'
  description: 'Descripción breve del objetivo',
  bestMove: 'NOTACIÓN',          // Ejemplo: 'e2e4', 'g1f3'
  alternatives: ['jugada1', 'jugada2', 'jugada3'],
  explanation: 'Explicación educativa de por qué esta es la mejor jugada',
  difficulty: 'easy',            // 'easy' | 'medium' | 'hard'
  category: 'tactics'            // 'openings' | 'tactics' | 'endgames' | 'middlegame'
}
```

## 🔢 Convenciones de IDs

### Prefijos por Categoría
- **Aperturas**: `open_NNN` (open_001, open_002, ...)
- **Táctica**: `tact_NNN` (tact_001, tact_002, ...)
- **Finales**: `end_NNN` (end_001, end_002, ...)
- **Medio Juego**: `mid_NNN` (mid_001, mid_002, ...)

### Numeración
- Usa 3 dígitos con ceros a la izquierda: `001`, `002`, ..., `099`
- Ordena puzzles por dificultad dentro de cada categoría
- Empieza con los puzzles más fáciles

## 🎨 Temas Tácticos Comunes

### Aperturas
- Control del centro
- Desarrollo rápido
- Enroque temprano
- Gambitos
- Trampas de apertura
- Principios generales

### Táctica
- **Mate en N**: Mate del Pastor, Mate de la Coz, Mate de Anastasia
- **Dobles**: Ataque doble, Jaque doble
- **Clavadas**: Clavada absoluta, Clavada relativa
- **Horquillas**: Horquilla de caballo, Horquilla de peón
- **Enfiladas**: Torre, Alfil, Dama
- **Jaques descubiertos**
- **Sacrificios**: Sacrificio de dama, Sacrificio de torre
- **Desviación**
- **Atracción**
- **Despeje de líneas**
- **Interferencia**

### Finales
- **Rey y Peón**: Oposición, Casilla clave, Regla del cuadrado
- **Torres**: Torre vs. Peón, Torre vs. Torre
- **Alfiles**: Mismo color, Colores opuestos
- **Caballos**: Caballo vs. Peón
- **Finales teóricos**: Tablas de Philidor, Puente de Lucena

### Medio Juego
- Control de columnas abiertas
- Debilidades de peones
- Ataque al enroque
- Dominio de casillas
- Movilización de mayorías
- Mejoramiento de piezas
- Planes estratégicos

## 🛠️ Herramientas para Crear Puzzles

### 1. **Chess.com**
- Ve a una posición de partida
- Clic en "Share" → "Export as FEN"
- Copia el FEN completo

### 2. **Lichess.org**
- Abre el editor de tablero: lichess.org/editor
- Coloca las piezas en la posición deseada
- Copia el FEN que aparece en la URL

### 3. **Stockfish Local** (para producción)
```bash
stockfish
position fen TU_FEN_AQUI
go depth 20
# Verifica la mejor jugada y evaluación
```

## 📊 Niveles de Dificultad

### Easy (Principiante)
- **Profundidad**: 1-2 jugadas
- **Conceptos**: Mates en 1-2, capturas simples, amenazas directas
- **Ejemplo**: Mate del Pastor, captura de pieza colgada

### Medium (Intermedio)
- **Profundidad**: 2-4 jugadas
- **Conceptos**: Combinaciones simples, patrones tácticos comunes
- **Ejemplo**: Horquilla de caballo, clavada con ganancia de material

### Hard (Avanzado)
- **Profundidad**: 4+ jugadas
- **Conceptos**: Sacrificios, combinaciones complejas, cálculo profundo
- **Ejemplo**: Sacrificio de dama para mate, enfilada con deflección

## ✅ Ejemplo Paso a Paso

Vamos a crear un nuevo puzzle de **doble amenaza**:

### Paso 1: Encontrar la Posición
Imagina esta posición táctica:
```
rnbqkb1r/pppp1ppp/5n2/4p3/4P3/3P1N2/PPP2PPP/RNBQKB1R w KQkq - 0 4
```

### Paso 2: Identificar el Tema
- **Tema**: Ataque doble con caballo
- **Mejor jugada**: Cg5 (ataca f7 y amenaza Ch7+)
- **Alternativas**: Ce5, Ch4, Cd4

### Paso 3: Escribir el Puzzle
```typescript
{
  id: 'tact_008',
  fen: 'rnbqkb1r/pppp1ppp/5n2/4p3/4P3/3P1N2/PPP2PPP/RNBQKB1R w KQkq - 0 4',
  theme: 'Doble Amenaza',
  description: 'Las blancas pueden crear una doble amenaza peligrosa',
  bestMove: 'f3g5',
  alternatives: ['f3e5', 'f3h4', 'f3d4'],
  explanation: 'Cg5 ataca f7 y amenaza Ch7+ ganando la torre en la siguiente jugada.',
  difficulty: 'medium',
  category: 'tactics'
}
```

### Paso 4: Agregar al Archivo
Abre `src/data/staticPuzzles.ts` y añade el puzzle al array `tacticsPuzzles`:

```typescript
export const tacticsPuzzles: StaticPuzzle[] = [
  // ... puzzles existentes
  {
    id: 'tact_008',
    fen: 'rnbqkb1r/pppp1ppp/5n2/4p3/4P3/3P1N2/PPP2PPP/RNBQKB1R w KQkq - 0 4',
    theme: 'Doble Amenaza',
    description: 'Las blancas pueden crear una doble amenaza peligrosa',
    bestMove: 'f3g5',
    alternatives: ['f3e5', 'f3h4', 'f3d4'],
    explanation: 'Cg5 ataca f7 y amenaza Ch7+ ganando la torre en la siguiente jugada.',
    difficulty: 'medium',
    category: 'tactics'
  }
];
```

### Paso 5: Verificar
```bash
pnpm run build
# Verifica que no haya errores
```

## 📋 Checklist de Calidad

Antes de agregar un puzzle, verifica:

- [ ] **ID único** - No hay otro puzzle con el mismo ID
- [ ] **FEN válido** - La posición es legal y correcta
- [ ] **Mejor jugada verificada** - La solución es realmente la mejor (verifica con Stockfish si es posible)
- [ ] **Alternativas plausibles** - Las jugadas incorrectas parecen razonables
- [ ] **Explicación clara** - La explicación enseña el concepto
- [ ] **Dificultad apropiada** - El puzzle está clasificado correctamente
- [ ] **Categoría correcta** - El puzzle está en la categoría adecuada
- [ ] **Tema relevante** - El nombre del tema es descriptivo

## 🎯 Notación de Jugadas

### Formato Estándar
Usa notación **UCI (Universal Chess Interface)**:

| Jugada        | Notación UCI | Notación Algebraica |
|---------------|--------------|---------------------|
| Peón e4       | `e2e4`       | e4                  |
| Caballo f3    | `g1f3`       | Cf3                 |
| Enroque corto | `e1g1`       | O-O                 |
| Enroque largo | `e1c1`       | O-O-O               |
| Promoción     | `e7e8q`      | e8=D                |

### Ejemplos
```typescript
bestMove: 'e2e4'    // Peón a e4
bestMove: 'g1f3'    // Caballo a f3
bestMove: 'e1g1'    // Enroque corto
bestMove: 'd1h5'    // Dama a h5
bestMove: 'e7e8q'   // Peón corona a Dama
```

## 📚 Recursos Útiles

### Posiciones Tácticas
- **Chess.com Tactics**: chess.com/puzzles
- **Lichess Puzzles**: lichess.org/training
- **Chesstempo**: chesstempo.com

### Editores de Posiciones
- **Lichess Board Editor**: lichess.org/editor
- **Chess.com Analysis**: chess.com/analysis

### Validación con Stockfish
```bash
# Instalar Stockfish (para desarrollo local)
brew install stockfish  # macOS
sudo apt install stockfish  # Ubuntu

# Analizar posición
stockfish
position fen rnbqkb1r/pppp1ppp/...
go depth 20
# Muestra la mejor jugada y evaluación
```

## 🚀 Agregar Puzzles en Lote

Si tienes múltiples puzzles para agregar:

1. Crea un archivo temporal con tus puzzles
2. Verifica cada uno individualmente
3. Agrégalos al array correspondiente
4. Actualiza el contador en la documentación
5. Prueba el sistema completo

```typescript
// Ejemplo de batch de 5 puzzles
const newTacticsPuzzles = [
  { id: 'tact_008', ... },
  { id: 'tact_009', ... },
  { id: 'tact_010', ... },
  { id: 'tact_011', ... },
  { id: 'tact_012', ... }
];

// Agregar al array principal
export const tacticsPuzzles: StaticPuzzle[] = [
  // ... puzzles existentes
  ...newTacticsPuzzles
];
```

## 🎓 Buenas Prácticas

1. **Variedad**: Mezcla diferentes temas tácticos
2. **Progresión**: Ordena por dificultad creciente
3. **Educación**: Escribe explicaciones que enseñen conceptos
4. **Realismo**: Usa posiciones que puedan aparecer en partidas reales
5. **Testing**: Prueba cada puzzle manualmente antes de agregarlo
6. **Documentación**: Actualiza el README cuando agregues muchos puzzles

## 🐛 Troubleshooting

### Error: Duplicate ID
```
Error: Puzzle with id 'tact_001' already exists
```
**Solución**: Usa un ID diferente (incrementa el número)

### Error: Invalid FEN
```
Error: Invalid FEN string
```
**Solución**: Verifica el FEN en lichess.org/editor

### Error: Move not found
```
Error: Move 'e2e5' is not legal in this position
```
**Solución**: Verifica que la jugada sea legal desde esa posición

---

¡Ahora estás listo para agregar puzzles increíbles! 🎯♟️
