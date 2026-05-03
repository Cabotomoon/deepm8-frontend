/**
 * Static Puzzle Service
 * Handles puzzle generation and validation WITHOUT Stockfish
 */

import {
  getRandomPuzzles,
  validateMove,
  type StaticPuzzle
} from '../data/staticPuzzles';

export interface TrainingPuzzle {
  id: string;
  fen: string;
  theme: string;
  explanation: string;
  bestMove: string;
  alternatives: string[];
  difficulty: 'easy' | 'medium' | 'hard';
}

class StaticPuzzleService {
  /**
   * Generate puzzles for training session
   */
  async generatePuzzles(
    category: 'openings' | 'tactics' | 'endgames' | 'middlegame',
    count: number
  ): Promise<TrainingPuzzle[]> {
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 500));

    const puzzles = getRandomPuzzles(category, count);

    return puzzles.map(p => ({
      id: p.id,
      fen: p.fen,
      theme: p.theme,
      explanation: p.description,
      bestMove: p.bestMove,
      alternatives: this.shuffleAlternatives(p.alternatives),
      difficulty: p.difficulty
    }));
  }

  /**
   * Validate if user's move is correct
   */
  async validatePuzzleMove(puzzleId: string, move: string): Promise<{
    isCorrect: boolean;
    feedback: string;
  }> {
    // Simulate async validation
    await new Promise(resolve => setTimeout(resolve, 300));

    const isCorrect = validateMove(puzzleId, move);

    return {
      isCorrect,
      feedback: isCorrect
        ? '¡Excelente! Has encontrado la mejor jugada.'
        : 'Esa no es la mejor jugada. Intenta buscar una jugada más fuerte.'
    };
  }

  /**
   * Check if move is the best move (compatibility with old interface)
   */
  async isBestMove(puzzleId: string, move: string): Promise<boolean> {
    const result = await this.validatePuzzleMove(puzzleId, move);
    return result.isCorrect;
  }

  /**
   * Shuffle alternatives to randomize order
   */
  private shuffleAlternatives(alternatives: string[]): string[] {
    return [...alternatives].sort(() => Math.random() - 0.5);
  }

  /**
   * Get hint for puzzle
   */
  async getHint(puzzleId: string): Promise<string> {
    // Return generic hints based on common patterns
    const hints = [
      'Busca jaques primero, luego capturas, y finalmente amenazas.',
      'Considera qué pieza está mal defendida.',
      'Analiza si hay piezas en la misma línea, fila o diagonal.',
      'Pregúntate: ¿qué amenaza tiene mi oponente? ¿Cómo puedo crear una amenaza mayor?',
      'Busca combinaciones que involucren múltiples piezas.'
    ];

    return hints[Math.floor(Math.random() * hints.length)];
  }
}

export const staticPuzzleService = new StaticPuzzleService();
