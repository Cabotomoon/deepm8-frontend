/**
 * Puzzle Generation Service for DeepM8 Personal Trainer
 * Generates dynamic chess puzzles for training
 */

import { stockfishTrainingService } from './stockfishTrainingService';

export interface TrainingPuzzle {
  id: string;
  fen: string;
  bestMove: string;
  alternatives: string[];
  theme: string;
  difficulty: number; // 1-5
  explanation: string;
  category: 'openings' | 'tactics' | 'endgames' | 'middlegame';
}

class PuzzleGenerationService {
  private puzzleCache: Map<string, TrainingPuzzle[]> = new Map();

  /**
   * Generate puzzles for a specific category
   */
  async generatePuzzles(category: 'openings' | 'tactics' | 'endgames' | 'middlegame', count = 50): Promise<TrainingPuzzle[]> {
    // Check cache first
    const cached = this.puzzleCache.get(category);
    if (cached && cached.length >= count) {
      console.log(`✅ Using ${cached.length} cached puzzles for ${category}`);
      return cached.slice(0, count);
    }

    console.log(`🔄 Generating ${count} puzzles for ${category}...`);

    const puzzles: TrainingPuzzle[] = [];

    switch (category) {
      case 'openings':
        puzzles.push(...await this.generateOpeningPuzzles(count));
        break;
      case 'tactics':
        puzzles.push(...await this.generateTacticalPuzzles(count));
        break;
      case 'endgames':
        puzzles.push(...await this.generateEndgamePuzzles(count));
        break;
      case 'middlegame':
        puzzles.push(...await this.generateMiddlegamePuzzles(count));
        break;
    }

    // Cache puzzles
    this.puzzleCache.set(category, puzzles);

    return puzzles;
  }

  /**
   * Generate opening puzzles (pre-generated for instant loading)
   */
  private async generateOpeningPuzzles(count: number): Promise<TrainingPuzzle[]> {
    // Pre-generated puzzles with verified best moves
    const staticPuzzles: TrainingPuzzle[] = [
      {
        id: 'opening-1',
        fen: 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
        bestMove: 'exd5',
        alternatives: ['d4', 'Nc3'],
        theme: 'Control del Centro - Apertura Escandinava',
        difficulty: 1,
        explanation: 'Captura el peón central para controlar el centro del tablero',
        category: 'openings'
      },
      {
        id: 'opening-2',
        fen: 'rnbqkbnr/pp1ppppp/2p5/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
        bestMove: 'd4',
        alternatives: ['Nc3', 'Nf3'],
        theme: 'Caro-Kann - Avance Central',
        difficulty: 1,
        explanation: 'Avanza el peón d para ganar espacio en el centro',
        category: 'openings'
      },
      {
        id: 'opening-3',
        fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2',
        bestMove: 'Nf3',
        alternatives: ['d4', 'Nc3'],
        theme: 'Defensa Siciliana - Desarrollo',
        difficulty: 2,
        explanation: 'Desarrolla el caballo antes de decidir la estructura de peones',
        category: 'openings'
      },
      {
        id: 'opening-4',
        fen: 'rnbqkbnr/ppp2ppp/4p3/3p4/3PP3/8/PPP2PPP/RNBQKBNR w KQkq - 0 3',
        bestMove: 'Nc3',
        alternatives: ['Nf3', 'Bd3'],
        theme: 'Defensa Francesa - Desarrollo de Piezas',
        difficulty: 2,
        explanation: 'Desarrolla caballos antes que alfiles para mayor flexibilidad',
        category: 'openings'
      },
      {
        id: 'opening-5',
        fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4',
        bestMove: 'Qe7',
        alternatives: ['g6', 'Nxe4'],
        theme: 'Defensa contra Mate del Pastor',
        difficulty: 1,
        explanation: 'Defiende el peón f7 y desarrolla la dama',
        category: 'openings'
      },
      {
        id: 'opening-6',
        fen: 'rnbqkb1r/pppppppp/5n2/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 1 2',
        bestMove: 'e5',
        alternatives: ['Nc3', 'd4'],
        theme: 'Defensa Alekhine - Gana Espacio',
        difficulty: 2,
        explanation: 'Avanza el peón para ganar espacio y atacar el caballo',
        category: 'openings'
      },
      {
        id: 'opening-7',
        fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
        bestMove: 'e5',
        alternatives: ['c5', 'd5'],
        theme: 'Apertura del Rey - Respuesta Simétrica',
        difficulty: 1,
        explanation: 'Controla el centro con e5 (simétrico)',
        category: 'openings'
      },
      {
        id: 'opening-8',
        fen: 'rnbqkb1r/pppppppp/5n2/8/3P4/8/PPP1PPPP/RNBQKBNR w KQkq - 1 2',
        bestMove: 'Nf3',
        alternatives: ['c4', 'Nc3'],
        theme: 'Defensa India - Desarrollo Armonioso',
        difficulty: 2,
        explanation: 'Desarrolla el caballo y controla el centro',
        category: 'openings'
      },
      {
        id: 'opening-9',
        fen: 'rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq c3 0 2',
        bestMove: 'dxc4',
        alternatives: ['e6', 'Nf6'],
        theme: 'Gambito de Dama Aceptado',
        difficulty: 2,
        explanation: 'Acepta el gambito capturando el peón',
        category: 'openings'
      },
      {
        id: 'opening-10',
        fen: 'rnbqkb1r/ppp1pppp/5n2/3p4/2PP4/8/PP2PPPP/RNBQKBNR w KQkq - 1 3',
        bestMove: 'Nc3',
        alternatives: ['Nf3', 'cxd5'],
        theme: 'Gambito de Dama Rehusado',
        difficulty: 2,
        explanation: 'Desarrolla el caballo y mantiene la tensión central',
        category: 'openings'
      }
    ];

    return staticPuzzles.slice(0, count);
  }

  /**
   * Generate tactical puzzles
   */
  private async generateTacticalPuzzles(count: number): Promise<TrainingPuzzle[]> {
    const puzzles: TrainingPuzzle[] = [];

    // Tactical positions with clear winning moves
    const tacticalPositions = [
      // Fork
      {
        fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
        theme: 'Knight Fork',
        explanation: 'Use knight to attack multiple pieces',
        difficulty: 2
      },
      // Pin
      {
        fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 6',
        theme: 'Pin Attack',
        explanation: 'Exploit the pinned piece',
        difficulty: 2
      },
      // Skewer
      {
        fen: '6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1',
        theme: 'Skewer',
        explanation: 'Attack the more valuable piece first',
        difficulty: 3
      },
      // Back rank mate
      {
        fen: '6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1',
        theme: 'Back Rank Mate',
        explanation: 'Deliver checkmate on the back rank',
        difficulty: 2
      },
      // Discovered attack
      {
        fen: 'r1bqkb1r/pppp1ppp/2n5/4p3/2BnP3/5N2/PPPP1PPP/RNBQ1RK1 w kq - 0 5',
        theme: 'Discovered Attack',
        explanation: 'Move to reveal attack on the queen',
        difficulty: 3
      }
    ];

    for (let i = 0; i < Math.min(count, tacticalPositions.length * 10); i++) {
      const basePosition = tacticalPositions[i % tacticalPositions.length];

      try {
        const evaluation = await stockfishTrainingService.evaluatePosition(basePosition.fen, 15);

        puzzles.push({
          id: `tactical-${i}`,
          fen: basePosition.fen,
          bestMove: evaluation.bestMove,
          alternatives: evaluation.topMoves.slice(1, 3).map(m => m.move),
          theme: basePosition.theme,
          difficulty: basePosition.difficulty,
          explanation: basePosition.explanation,
          category: 'tactics'
        });
      } catch (error) {
        console.error('Error generating tactical puzzle:', error);
      }
    }

    return puzzles;
  }

  /**
   * Generate endgame puzzles
   */
  private async generateEndgamePuzzles(count: number): Promise<TrainingPuzzle[]> {
    const puzzles: TrainingPuzzle[]= [];

    // Basic endgame positions
    const endgamePositions = [
      // King and pawn vs king
      {
        fen: '8/8/8/4k3/8/8/4P3/4K3 w - - 0 1',
        theme: 'King and Pawn Endgame',
        explanation: 'Push the pawn with king support',
        difficulty: 2
      },
      // Opposition
      {
        fen: '8/8/8/4k3/8/4K3/8/8 w - - 0 1',
        theme: 'Opposition',
        explanation: 'Gain opposition to advance',
        difficulty: 3
      },
      // Rook endgame
      {
        fen: '6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1',
        theme: 'Rook Endgame',
        explanation: 'Cut off the enemy king',
        difficulty: 3
      },
      // Queen vs pawn
      {
        fen: '8/8/8/8/8/8/p7/K6Q w - - 0 1',
        theme: 'Queen vs Pawn',
        explanation: 'Stop the pawn and checkmate',
        difficulty: 2
      },
      // Two bishops vs king
      {
        fen: '6k1/8/8/8/8/8/8/K1BB4 w - - 0 1',
        theme: 'Two Bishops Mate',
        explanation: 'Drive the king to the corner',
        difficulty: 4
      }
    ];

    for (let i = 0; i < Math.min(count, endgamePositions.length * 10); i++) {
      const basePosition = endgamePositions[i % endgamePositions.length];

      try {
        const evaluation = await stockfishTrainingService.evaluatePosition(basePosition.fen, 18);

        puzzles.push({
          id: `endgame-${i}`,
          fen: basePosition.fen,
          bestMove: evaluation.bestMove,
          alternatives: evaluation.topMoves.slice(1, 3).map(m => m.move),
          theme: basePosition.theme,
          difficulty: basePosition.difficulty,
          explanation: basePosition.explanation,
          category: 'endgames'
        });
      } catch (error) {
        console.error('Error generating endgame puzzle:', error);
      }
    }

    return puzzles;
  }

  /**
   * Generate middlegame puzzles
   */
  private async generateMiddlegamePuzzles(count: number): Promise<TrainingPuzzle[]> {
    const puzzles: TrainingPuzzle[] = [];

    // Middlegame strategic positions
    const middlegamePositions = [
      // Weak squares
      {
        fen: 'r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 8',
        theme: 'Weak Square Control',
        explanation: 'Control key central squares',
        difficulty: 3
      },
      // Pawn structure
      {
        fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 6',
        theme: 'Pawn Structure',
        explanation: 'Improve pawn structure',
        difficulty: 3
      },
      // Piece coordination
      {
        fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
        theme: 'Piece Coordination',
        explanation: 'Coordinate pieces for attack',
        difficulty: 4
      },
      // King safety
      {
        fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQ1RK1 w kq - 0 6',
        theme: 'King Safety',
        explanation: 'Improve king safety before attacking',
        difficulty: 3
      },
      // Central break
      {
        fen: 'rnbqkb1r/ppp1pppp/5n2/3p4/3P4/5N2/PPP1PPPP/RNBQKB1R w KQkq - 2 3',
        theme: 'Central Break',
        explanation: 'Break in the center at the right time',
        difficulty: 4
      }
    ];

    for (let i = 0; i < Math.min(count, middlegamePositions.length * 10); i++) {
      const basePosition = middlegamePositions[i % middlegamePositions.length];

      try {
        const evaluation = await stockfishTrainingService.evaluatePosition(basePosition.fen, 15);

        puzzles.push({
          id: `middlegame-${i}`,
          fen: basePosition.fen,
          bestMove: evaluation.bestMove,
          alternatives: evaluation.topMoves.slice(1, 3).map(m => m.move),
          theme: basePosition.theme,
          difficulty: basePosition.difficulty,
          explanation: basePosition.explanation,
          category: 'middlegame'
        });
      } catch (error) {
        console.error('Error generating middlegame puzzle:', error);
      }
    }

    return puzzles;
  }

  /**
   * Get a random puzzle from cache
   */
  getRandomPuzzle(category: 'openings' | 'tactics' | 'endgames' | 'middlegame'): TrainingPuzzle | null {
    const puzzles = this.puzzleCache.get(category);
    if (!puzzles || puzzles.length === 0) return null;

    const randomIndex = Math.floor(Math.random() * puzzles.length);
    return puzzles[randomIndex];
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.puzzleCache.clear();
  }
}

export const puzzleGenerationService = new PuzzleGenerationService();
