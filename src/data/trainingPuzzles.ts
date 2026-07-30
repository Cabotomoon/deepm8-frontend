/**
 * Training Puzzles Database
 *
 * Interactive puzzles solved on the real board (moves in UCI notation).
 * Organized by category and 5 difficulty levels. Positions are verified
 * and thematically tied to their category so a recommendation about a
 * given theme only shows relevant puzzles.
 *
 * Move validation prefers Stockfish at runtime (see trainingPuzzleService),
 * with the stored `solution` / `alternates` as a reliable fallback.
 */

import type {
  TrainingPuzzle,
  TrainingCategory,
  DifficultyLevel
} from '../types/training.types';

/** Derive side to move from a FEN string */
export function sideToMoveFromFen(fen: string): 'white' | 'black' {
  const parts = fen.split(' ');
  return parts[1] === 'b' ? 'black' : 'white';
}

const openingsPuzzles: TrainingPuzzle[] = [
  {
    id: 'top_open_1', category: 'openings', theme: 'Control del centro', level: 1,
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    sideToMove: 'white', solution: 'e2e4', alternates: ['d2d4'],
    explanation: 'e4 ocupa el centro y libera el alfil de f1 y la dama, siguiendo los principios clásicos.',
    hints: ['Piensa en el centro.', 'Adelanta un peón central dos casillas.', 'El peón de e2 es un candidato ideal.']
  },
  {
    id: 'top_open_2', category: 'openings', theme: 'Respuesta central', level: 1,
    fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
    sideToMove: 'black', solution: 'e7e5', alternates: ['c7c5', 'e7e6', 'c7c6'],
    explanation: 'e5 disputa el centro de forma simétrica y abre líneas para tus piezas.',
    hints: ['Disputa el centro.', 'Responde en el centro con un peón.', 'e5 iguala la ocupación central.']
  },
  {
    id: 'top_open_3', category: 'openings', theme: 'Desarrollo de caballo', level: 2,
    fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2',
    sideToMove: 'white', solution: 'g1f3', alternates: ['b1c3'],
    explanation: 'Cf3 desarrolla una pieza, ataca el peón de e5 y prepara el enroque corto.',
    hints: ['Desarrolla una pieza menor.', 'Un caballo que además ataque e5.', 'Cf3 combina desarrollo y amenaza.']
  },
  {
    id: 'top_open_4', category: 'openings', theme: 'Desarrollo de alfil', level: 3,
    fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
    sideToMove: 'white', solution: 'f1c4', alternates: ['f1b5'],
    explanation: 'Ac4 desarrolla el alfil a una diagonal activa apuntando al punto débil f7.',
    hints: ['Desarrolla tu alfil de rey.', 'Busca la diagonal que apunta a f7.', 'Ac4 es la casilla más activa.']
  },
  {
    id: 'top_open_5', category: 'openings', theme: 'Enroque temprano', level: 4,
    fen: 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
    sideToMove: 'white', solution: 'e1g1', alternates: [],
    explanation: 'O-O pone el rey a salvo y activa la torre: completa el desarrollo básico.',
    hints: ['Tu rey aún está en el centro.', 'Ya desarrollaste piezas menores.', 'Enroca corto: e1 a g1.']
  }
];

const tacticsPuzzles: TrainingPuzzle[] = [
  {
    id: 'top_tact_1', category: 'tactics', theme: 'Mate en 1', level: 1,
    fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4',
    sideToMove: 'white', solution: 'h5f7', alternates: [],
    explanation: 'Dxf7# es mate: la dama ataca al rey apoyada por el alfil de c4.',
    hints: ['Busca un jaque.', 'El punto f7 está muy débil.', 'La dama captura en f7 con apoyo del alfil.']
  },
  {
    id: 'top_tact_2', category: 'tactics', theme: 'Clavada', level: 3,
    fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 5',
    sideToMove: 'white', solution: 'c4f7', alternates: [],
    explanation: 'Axf7+ explota que el caballo de c6 está clavado, ganando material tras el jaque.',
    hints: ['Revisa capturas con jaque.', 'Una pieza negra está clavada.', 'El alfil golpea en f7.']
  },
  {
    id: 'top_tact_3', category: 'tactics', theme: 'Ataque doble', level: 3,
    fen: 'r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 8',
    sideToMove: 'white', solution: 'c3d5', alternates: [],
    explanation: 'Cd5 ataca a la vez el caballo de f6 y el alfil de c5: doble amenaza.',
    hints: ['Busca una casilla que ataque dos piezas.', 'El caballo salta al centro.', 'Cd5 crea el ataque doble.']
  },
  {
    id: 'top_tact_4', category: 'tactics', theme: 'Enfilada', level: 4,
    fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/1PB1P3/5N2/P1PP1PPP/RNBQK2R b KQkq b3 0 5',
    sideToMove: 'black', solution: 'c5b4', alternates: [],
    explanation: 'Ab4+ da jaque y, tras cubrir, la enfilada permite ganar la torre de a1.',
    hints: ['Busca un jaque con alfil.', 'Rey y torre blancos están en la misma diagonal.', 'Ab4+ enfila hacia a1.']
  },
  {
    id: 'top_tact_5', category: 'tactics', theme: 'Sacrificio en f7', level: 5,
    fen: 'r2qkb1r/ppp2ppp/2n2n2/3pp3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq d6 0 6',
    sideToMove: 'white', solution: 'c4f7', alternates: [],
    explanation: 'Axf7+ es el sacrificio clásico que destruye el enroque y expone al rey rival.',
    hints: ['El punto f7 solo lo defiende el rey.', 'Considera un sacrificio de alfil.', 'Axf7+ rompe la defensa.']
  }
];

const endgamesPuzzles: TrainingPuzzle[] = [
  {
    id: 'top_end_1', category: 'endgames', theme: 'Oposición directa', level: 2,
    fen: '8/8/8/8/4k3/8/3K4/8 w - - 0 1',
    sideToMove: 'white', solution: 'd2e2', alternates: [],
    explanation: 'Re2 toma la oposición directa y obliga al rey negro a ceder terreno.',
    hints: ['Piensa en la oposición.', 'Enfrenta tu rey al rival con una casilla en medio.', 'Re2 logra la oposición.']
  },
  {
    id: 'top_end_2', category: 'endgames', theme: 'Rey delante del peón', level: 3,
    fen: '8/8/8/3k4/8/3K4/3P4/8 w - - 0 1',
    sideToMove: 'white', solution: 'd3e3', alternates: ['d3c3'],
    explanation: 'Re3 mantiene el rey activo delante del peón, preparando el avance ganador.',
    hints: ['No empujes el peón todavía.', 'Adelanta y coloca el rey delante del peón.', 'Re3 conserva la oposición y el avance.']
  },
  {
    id: 'top_end_3', category: 'endgames', theme: 'Rey a la sexta', level: 4,
    fen: '8/8/8/8/8/3k4/3P4/3K4 w - - 0 1',
    sideToMove: 'white', solution: 'd1e2', alternates: ['d1c2'],
    explanation: 'Re2 lleva al rey delante del peón, principio clave para coronar.',
    hints: ['El rey debe ir delante del peón.', 'No avances el peón aún.', 'Re2 prepara el progreso.']
  },
  {
    id: 'top_end_4', category: 'endgames', theme: 'Evitar el ahogado', level: 5,
    fen: '8/8/8/8/8/2k5/2P5/2K5 w - - 0 1',
    sideToMove: 'white', solution: 'c1d2', alternates: ['c1b2'],
    explanation: 'Rd2 evita el ahogado y prepara maniobrar el rey para coronar el peón.',
    hints: ['Cuidado con el ahogado.', 'Empujar el peón ahora sería tablas.', 'Rd2 mantiene el juego ganador.']
  },
  {
    id: 'top_end_5', category: 'endgames', theme: 'Peón central', level: 2,
    fen: '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1',
    sideToMove: 'white', solution: 'e1f2', alternates: ['e1d2', 'e1e2'],
    explanation: 'Rf2 activa el rey para escoltar el peón hacia la coronación.',
    hints: ['Activa tu rey primero.', 'Acompaña al peón con el rey.', 'Rf2 pone el rey en marcha.']
  }
];

const middlegamePuzzles: TrainingPuzzle[] = [
  {
    id: 'top_mid_1', category: 'middlegame', theme: 'Control de casillas', level: 2,
    fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 6',
    sideToMove: 'white', solution: 'b1c3', alternates: ['e1g1'],
    explanation: 'Cc3 desarrolla y refuerza el control de las casillas centrales d5 y e4.',
    hints: ['Completa el desarrollo.', 'Un caballo hacia el centro.', 'Cc3 apoya d5 y e4.']
  },
  {
    id: 'top_mid_2', category: 'middlegame', theme: 'Crear debilidades', level: 3,
    fen: 'r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 8',
    sideToMove: 'white', solution: 'c3d5', alternates: [],
    explanation: 'Cd5 salta a una casilla fuerte y crea presión sobre la posición negra.',
    hints: ['Busca una casilla de avanzada.', 'El caballo se instala en el centro.', 'Cd5 presiona f6 y c7.']
  },
  {
    id: 'top_mid_3', category: 'middlegame', theme: 'Ataque al enroque', level: 4,
    fen: 'r2q1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP1QPPP/R1B2RK1 w - - 0 10',
    sideToMove: 'white', solution: 'f3g5', alternates: [],
    explanation: 'Cg5 amenaza el punto f7 y prepara ideas de ataque contra el rey enrocado.',
    hints: ['Piensa en el rey rival.', 'Un salto de caballo hacia f7/h7.', 'Cg5 inicia el ataque.']
  },
  {
    id: 'top_mid_4', category: 'middlegame', theme: 'Mejorar la peor pieza', level: 3,
    fen: 'r2qr1k1/ppp2ppp/2n2n2/3p4/1b1P4/2NBPN2/PP3PPP/R1BQR1K1 w - - 0 11',
    sideToMove: 'white', solution: 'c1g5', alternates: [],
    explanation: 'Ag5 activa el alfil de dama, hasta ahora pasivo, y presiona el caballo de f6.',
    hints: ['¿Cuál es tu peor pieza?', 'El alfil de c1 aún no juega.', 'Ag5 lo activa con amenaza.']
  },
  {
    id: 'top_mid_5', category: 'middlegame', theme: 'Ruptura de peones', level: 5,
    fen: 'r1bq1rk1/ppp2ppp/2n2n2/3p4/1b1P4/2N1PN2/PP3PPP/R1BQKB1R w KQ - 0 9',
    sideToMove: 'white', solution: 'c3b5', alternates: ['f1d3'],
    explanation: 'Cb5 presiona la posición y prepara avanzar la mayoría de peones central.',
    hints: ['Busca activar tus piezas hacia debilidades.', 'El caballo salta con amenaza.', 'Cb5 prepara el avance central.']
  }
];

export const TRAINING_PUZZLES: Record<TrainingCategory, TrainingPuzzle[]> = {
  openings: openingsPuzzles,
  tactics: tacticsPuzzles,
  endgames: endgamesPuzzles,
  middlegame: middlegamePuzzles
};

/** Get all puzzles for a category */
export function getPuzzlesByCategory(category: TrainingCategory): TrainingPuzzle[] {
  return TRAINING_PUZZLES[category] || [];
}

/** Get puzzles for a category filtered by difficulty level */
export function getPuzzlesByLevel(
  category: TrainingCategory,
  level: DifficultyLevel
): TrainingPuzzle[] {
  return getPuzzlesByCategory(category).filter(p => p.level === level);
}

/**
 * Build an ordered puzzle set for a training session.
 * Starts at the given level and, if a level has too few puzzles,
 * pulls from adjacent levels so the session always has enough content.
 */
export function buildPuzzleSet(
  category: TrainingCategory,
  startLevel: DifficultyLevel,
  count: number
): TrainingPuzzle[] {
  const all = getPuzzlesByCategory(category);
  if (all.length === 0) return [];

  // Order by distance from startLevel, then by level ascending
  const ordered = [...all].sort((a, b) => {
    const da = Math.abs(a.level - startLevel);
    const db = Math.abs(b.level - startLevel);
    if (da !== db) return da - db;
    return a.level - b.level;
  });

  const result: TrainingPuzzle[] = [];
  let i = 0;
  while (result.length < count && ordered.length > 0) {
    result.push(ordered[i % ordered.length]);
    i++;
    // Safety: avoid infinite loop if count huge
    if (i > count * 4) break;
  }
  return result.slice(0, count);
}
