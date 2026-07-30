/**
 * Training Puzzle Service
 *
 * Loads puzzle sets by category/level and evaluates a user's move.
 *
 * Validation strategy (non-blocking, resilient):
 *  1. Exact match against the stored solution / alternates → correct.
 *  2. If Stockfish is available, compare against the engine's best move
 *     and estimate centipawn loss to classify move quality.
 *  3. If Stockfish is unavailable, fall back to solution matching only.
 *
 * Stockfish runs in a Web Worker (see stockfishService) so the UI never
 * blocks while evaluating.
 */

import stockfish from './stockfishService';
import {
  buildPuzzleSet,
  getPuzzlesByLevel
} from '../data/trainingPuzzles';
import type {
  TrainingPuzzle,
  TrainingCategory,
  DifficultyLevel,
  MoveEvaluation,
  MoveQuality
} from '../types/training.types';

/** Map Stockfish difficulty from our level for analysis depth */
function levelToDepth(level: DifficultyLevel): number {
  return [0, 8, 10, 12, 14, 16][level] || 12;
}

function classify(centipawnLoss: number, isSolution: boolean): { quality: MoveQuality; label: string } {
  if (isSolution || centipawnLoss <= 10) return { quality: 'excelente', label: 'Excelente' };
  if (centipawnLoss <= 40) return { quality: 'buena', label: 'Buena' };
  if (centipawnLoss <= 90) return { quality: 'aceptable', label: 'Aceptable' };
  if (centipawnLoss <= 150) return { quality: 'imprecisa', label: 'Imprecisa' };
  if (centipawnLoss <= 300) return { quality: 'error', label: 'Error' };
  return { quality: 'error-grave', label: 'Error grave' };
}

class TrainingPuzzleService {
  private stockfishReady = false;
  private stockfishTried = false;

  /** Lazily init Stockfish; never throws */
  private async ensureStockfish(): Promise<boolean> {
    if (this.stockfishReady) return true;
    if (this.stockfishTried) return this.stockfishReady;
    this.stockfishTried = true;
    try {
      await stockfish.init();
      this.stockfishReady = true;
    } catch {
      this.stockfishReady = false;
    }
    return this.stockfishReady;
  }

  /** Build an ordered puzzle set for a session */
  getSet(category: TrainingCategory, startLevel: DifficultyLevel, count: number): TrainingPuzzle[] {
    return buildPuzzleSet(category, startLevel, count);
  }

  /** Count puzzles available at a given level */
  countAtLevel(category: TrainingCategory, level: DifficultyLevel): number {
    return getPuzzlesByLevel(category, level).length;
  }

  /**
   * Evaluate a user's move for a puzzle.
   * Always resolves (never rejects) so the UI stays responsive.
   */
  async evaluateMove(puzzle: TrainingPuzzle, uci: string): Promise<MoveEvaluation> {
    const normalized = uci.toLowerCase();
    const solutions = [puzzle.solution, ...(puzzle.alternates || [])].map(s => s.toLowerCase());
    const isSolution = solutions.includes(normalized);

    // Fast path: exact solution match
    if (isSolution) {
      return {
        quality: 'excelente',
        label: 'Excelente',
        centipawnLoss: 0,
        isSolution: true,
        bestMove: puzzle.solution,
        explanation: puzzle.explanation
      };
    }

    // Try Stockfish for a fair second opinion + centipawn estimate
    const ready = await this.ensureStockfish();
    if (ready) {
      try {
        const depth = levelToDepth(puzzle.level);
        const engineBest = await stockfish.getBestMove(puzzle.fen, 'advanced');
        const bestMove = engineBest || puzzle.solution;

        // If the engine agrees the user's move is best, accept it
        if (engineBest && engineBest.toLowerCase() === normalized) {
          return {
            quality: 'excelente',
            label: 'Excelente',
            centipawnLoss: 0,
            isSolution: true,
            bestMove,
            explanation: `Tu jugada coincide con la mejor del motor. ${puzzle.explanation}`
          };
        }

        // Estimate centipawn loss: eval(best) - eval(user move)
        const bestEval = await stockfish.analyzeMove(puzzle.fen, bestMove, depth);
        const userEval = await stockfish.analyzeMove(puzzle.fen, normalized, depth);
        let centipawnLoss = 200; // default when analysis is partial
        if (bestEval && userEval) {
          centipawnLoss = Math.max(0, Math.abs(bestEval.evaluation - userEval.evaluation));
        }
        const { quality, label } = classify(centipawnLoss, false);
        return {
          quality,
          label,
          centipawnLoss,
          isSolution: false,
          bestMove,
          explanation: `La jugada clave era ${bestMove}. ${puzzle.explanation}`
        };
      } catch {
        // fall through to fallback
      }
    }

    // Fallback: no engine — treat non-solution as an error but stay informative
    return {
      quality: 'error',
      label: 'Incorrecta',
      centipawnLoss: 200,
      isSolution: false,
      bestMove: puzzle.solution,
      explanation: `La mejor jugada era ${puzzle.solution}. ${puzzle.explanation}`
    };
  }

  /** Get a progressive hint (index-limited) */
  getHint(puzzle: TrainingPuzzle, hintIndex: number): string {
    if (puzzle.hints.length === 0) {
      return 'Revisa jaques, capturas y amenazas antes de decidir.';
    }
    const idx = Math.min(hintIndex, puzzle.hints.length - 1);
    return puzzle.hints[idx];
  }

  /** Total hints available for a puzzle */
  hintCount(puzzle: TrainingPuzzle): number {
    return puzzle.hints.length;
  }
}

export const trainingPuzzleService = new TrainingPuzzleService();
