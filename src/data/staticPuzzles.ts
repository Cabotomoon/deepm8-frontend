/**
 * Static Chess Puzzles Database
 * Pre-defined tactical puzzles by category with solutions
 */

export interface StaticPuzzle {
  id: string;
  fen: string;
  theme: string;
  description: string;
  bestMove: string;
  alternatives: string[];
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: 'openings' | 'tactics' | 'endgames' | 'middlegame';
}

/**
 * Opening Puzzles - Focus on development and center control
 */
export const openingsPuzzles: StaticPuzzle[] = [
  {
    id: 'open_001',
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    theme: 'Control del Centro',
    description: 'Apertura inicial - elige la mejor jugada para controlar el centro',
    bestMove: 'e2e4',
    alternatives: ['d2d4', 'c2c4', 'g1f3'],
    explanation: 'e4 controla el centro y libera el alfil y la dama, siguiendo los principios clásicos de apertura.',
    difficulty: 'easy',
    category: 'openings'
  },
  {
    id: 'open_002',
    fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
    theme: 'Respuesta Simétrica',
    description: 'Responde a 1.e4 con simetría',
    bestMove: 'e7e5',
    alternatives: ['c7c5', 'd7d6', 'e7e6'],
    explanation: 'e5 ocupa el centro de forma simétrica y lucha por el control del centro.',
    difficulty: 'easy',
    category: 'openings'
  },
  {
    id: 'open_003',
    fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2',
    theme: 'Desarrollo del Caballo',
    description: 'Desarrolla piezas menores hacia el centro',
    bestMove: 'g1f3',
    alternatives: ['b1c3', 'f1c4', 'd2d4'],
    explanation: 'Cf3 desarrolla el caballo atacando e5 y preparando el enroque corto.',
    difficulty: 'easy',
    category: 'openings'
  },
  {
    id: 'open_004',
    fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
    theme: 'Desarrollo del Alfil',
    description: 'Continúa desarrollando piezas menores',
    bestMove: 'f1c4',
    alternatives: ['f1b5', 'd2d4', 'b1c3'],
    explanation: 'Ac4 desarrolla el alfil a una casilla activa apuntando al débil punto f7.',
    difficulty: 'medium',
    category: 'openings'
  },
  {
    id: 'open_005',
    fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
    theme: 'Enroque Temprano',
    description: 'Momento ideal para enrocar',
    bestMove: 'e1g1',
    alternatives: ['d2d4', 'b1c3', 'c2c3'],
    explanation: 'O-O protege al rey y conecta las torres, completando el desarrollo básico.',
    difficulty: 'easy',
    category: 'openings'
  }
];

/**
 * Tactics Puzzles - Focus on tactical patterns
 */
export const tacticsPuzzles: StaticPuzzle[] = [
  {
    id: 'tact_001',
    fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4',
    theme: 'Mate del Pastor',
    description: 'Encuentra el mate en 1',
    bestMove: 'h5f7',
    alternatives: ['c4f7', 'e4e5', 'h5e5'],
    explanation: 'Dxf7# es jaque mate! La dama ataca al rey con apoyo del alfil en c4.',
    difficulty: 'easy',
    category: 'tactics'
  },
  {
    id: 'tact_002',
    fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 5',
    theme: 'Clavada',
    description: 'El caballo en c6 está clavado - aprovéchalo',
    bestMove: 'c4f7',
    alternatives: ['f3e5', 'd3d4', 'e1g1'],
    explanation: 'Axf7+ aprovecha que el caballo en c6 está clavado por el alfil, ganando material.',
    difficulty: 'medium',
    category: 'tactics'
  },
  {
    id: 'tact_003',
    fen: 'r1bqkb1r/pppp1ppp/2n5/4p3/2BnP3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 5',
    theme: 'Horquilla de Caballo',
    description: 'El caballo enemigo hace horquilla - defiende',
    bestMove: 'c4f7',
    alternatives: ['e1g1', 'b1c3', 'c2c3'],
    explanation: 'Axf7+ fuerza al rey a moverse y luego capturaremos el caballo en d4.',
    difficulty: 'medium',
    category: 'tactics'
  },
  {
    id: 'tact_004',
    fen: 'r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 8',
    theme: 'Ataque Doble',
    description: 'Encuentra el ataque doble ganador',
    bestMove: 'c3d5',
    alternatives: ['f3e5', 'd3d4', 'c4d5'],
    explanation: 'Cd5 ataca simultáneamente el caballo en f6 y el alfil en c5.',
    difficulty: 'medium',
    category: 'tactics'
  },
  {
    id: 'tact_005',
    fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/1PB1P3/5N2/P1PP1PPP/RNBQK2R b KQkq b3 0 5',
    theme: 'Enfilada',
    description: 'Las blancas tienen rey y torre en la misma línea',
    bestMove: 'c5b4',
    alternatives: ['f6e4', 'c6d4', 'e8g8'],
    explanation: 'Ab4+ da jaque y luego capturará la torre en a1 por enfilada.',
    difficulty: 'hard',
    category: 'tactics'
  },
  {
    id: 'tact_006',
    fen: 'r2qkb1r/ppp2ppp/2n2n2/3pp3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq d6 0 6',
    theme: 'Sacrificio en f7',
    description: 'El punto f7 está débil',
    bestMove: 'c4f7',
    alternatives: ['f3e5', 'd2d4', 'e1g1'],
    explanation: 'Axf7+ es un sacrificio clásico que destruye el enroque enemigo.',
    difficulty: 'hard',
    category: 'tactics'
  },
  {
    id: 'tact_007',
    fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
    theme: 'Jaque Descubierto',
    description: 'Prepara un jaque descubierto devastador',
    bestMove: 'f1c4',
    alternatives: ['d2d4', 'b1c3', 'f1b5'],
    explanation: 'Ac4 prepara posibles jaques descubiertos con el caballo en f3.',
    difficulty: 'medium',
    category: 'tactics'
  }
];

/**
 * Endgame Puzzles - Focus on king activity and pawn endgames
 */
export const endgamesPuzzles: StaticPuzzle[] = [
  {
    id: 'end_001',
    fen: '8/8/8/8/4k3/8/3K4/8 w - - 0 1',
    theme: 'Oposición Directa',
    description: 'Toma la oposición para avanzar',
    bestMove: 'd2e2',
    alternatives: ['d2d3', 'd2c3', 'd2e3'],
    explanation: 'Re2 toma la oposición directa, forzando al rey negro a retroceder.',
    difficulty: 'easy',
    category: 'endgames'
  },
  {
    id: 'end_002',
    fen: '8/8/8/3k4/8/3K4/3P4/8 w - - 0 1',
    theme: 'Activación del Rey',
    description: 'Avanza el rey para coronar el peón',
    bestMove: 'd3e3',
    alternatives: ['d3c3', 'd3e4', 'd2d4'],
    explanation: 'Re3 apoya al peón y mantiene la oposición, camino a la coronación.',
    difficulty: 'easy',
    category: 'endgames'
  },
  {
    id: 'end_003',
    fen: '8/8/8/8/8/3k4/3P4/3K4 w - - 0 1',
    theme: 'Rey en Sexta',
    description: 'El rey debe estar delante del peón',
    bestMove: 'd1e2',
    alternatives: ['d2d4', 'd1c2', 'd1e1'],
    explanation: 'Re2 lleva al rey delante del peón, principio fundamental para ganar.',
    difficulty: 'medium',
    category: 'endgames'
  },
  {
    id: 'end_004',
    fen: '8/8/8/8/8/2k5/2P5/2K5 w - - 0 1',
    theme: 'Tablas por Ahogado',
    description: 'Cuidado con el ahogado - encuentra la única jugada ganadora',
    bestMove: 'c1d2',
    alternatives: ['c2c4', 'c1b2', 'c1d1'],
    explanation: 'Rd2 evita el ahogado y prepara c4-c5-c6-c7-c8=D.',
    difficulty: 'hard',
    category: 'endgames'
  },
  {
    id: 'end_005',
    fen: '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1',
    theme: 'Peón Central',
    description: 'Peón e avanzado - técnica de coronación',
    bestMove: 'e1f2',
    alternatives: ['e1d2', 'e2e4', 'e1e2'],
    explanation: 'Rf2 lleva al rey delante del peón, ganando fácilmente.',
    difficulty: 'easy',
    category: 'endgames'
  }
];

/**
 * Middlegame Puzzles - Focus on planning and strategic motifs
 */
export const middlegamePuzzles: StaticPuzzle[] = [
  {
    id: 'mid_001',
    fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 6',
    theme: 'Control de Casillas Centrales',
    description: 'Refuerza tu control del centro',
    bestMove: 'b1c3',
    alternatives: ['e1g1', 'c2c3', 'h2h3'],
    explanation: 'Cc3 desarrolla y refuerza el control de d5 y e4.',
    difficulty: 'easy',
    category: 'middlegame'
  },
  {
    id: 'mid_002',
    fen: 'r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 8',
    theme: 'Creación de Debilidades',
    description: 'Ataca puntos débiles en la estructura enemiga',
    bestMove: 'c3d5',
    alternatives: ['a2a4', 'h2h3', 'a1e1'],
    explanation: 'Cd5 ataca el caballo y el alfil, creando presión en la posición negra.',
    difficulty: 'medium',
    category: 'middlegame'
  },
  {
    id: 'mid_003',
    fen: 'r2q1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP1QPPP/R1B2RK1 w - - 0 10',
    theme: 'Ataque al Enroque',
    description: 'Inicia un ataque contra el rey enrocado',
    bestMove: 'f3g5',
    alternatives: ['c3d5', 'h2h3', 'a1d1'],
    explanation: 'Cg5 amenaza Dh5 y ataca f7, iniciando presión en el flanco de rey.',
    difficulty: 'medium',
    category: 'middlegame'
  },
  {
    id: 'mid_004',
    fen: 'r1bq1rk1/ppp2ppp/2n2n2/3p4/1b1P4/2N1PN2/PP3PPP/R1BQKB1R w KQ - 0 9',
    theme: 'Movilización de Mayoría',
    description: 'Usa tu mayoría de peones en el centro',
    bestMove: 'c3b5',
    alternatives: ['e3e4', 'a2a3', 'f1e2'],
    explanation: 'Cb5 presiona la posición y prepara avanzar la mayoría central.',
    difficulty: 'hard',
    category: 'middlegame'
  },
  {
    id: 'mid_005',
    fen: 'r2qr1k1/ppp2ppp/2n2n2/3p4/1b1P4/2NBPN2/PP3PPP/R1BQR1K1 w - - 0 11',
    theme: 'Mejoramiento de Piezas',
    description: 'Mejora tu pieza peor ubicada',
    bestMove: 'c1g5',
    alternatives: ['d3c2', 'e1e2', 'h2h3'],
    explanation: 'Ag5 activa el alfil inactivo y presiona el caballo en f6.',
    difficulty: 'medium',
    category: 'middlegame'
  }
];

/**
 * Get puzzles by category
 */
export function getPuzzlesByCategory(category: 'openings' | 'tactics' | 'endgames' | 'middlegame'): StaticPuzzle[] {
  switch (category) {
    case 'openings':
      return openingsPuzzles;
    case 'tactics':
      return tacticsPuzzles;
    case 'endgames':
      return endgamesPuzzles;
    case 'middlegame':
      return middlegamePuzzles;
  }
}

/**
 * Get random puzzles from category
 */
export function getRandomPuzzles(category: 'openings' | 'tactics' | 'endgames' | 'middlegame', count: number): StaticPuzzle[] {
  const puzzles = getPuzzlesByCategory(category);
  const shuffled = [...puzzles].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, puzzles.length));
}

/**
 * Validate if move is correct
 */
export function validateMove(puzzleId: string, move: string): boolean {
  const allPuzzles = [...openingsPuzzles, ...tacticsPuzzles, ...endgamesPuzzles, ...middlegamePuzzles];
  const puzzle = allPuzzles.find(p => p.id === puzzleId);
  return puzzle?.bestMove === move;
}
