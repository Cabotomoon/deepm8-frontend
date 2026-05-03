/**
 * Game Phase Detection Service
 * Detects game phases (opening, middlegame, endgame) based on position analysis
 */

interface PhaseDetection {
  phase: 'opening' | 'middlegame' | 'endgame';
  confidence: number;
  description: string;
}

class GamePhaseService {
  /**
   * Detect game phase based on move number and material count
   */
  detectPhase(moveNumber: number, fen?: string): PhaseDetection {
    // Simple heuristics for phase detection

    // Opening: First 10-15 moves
    if (moveNumber <= 10) {
      return {
        phase: 'opening',
        confidence: 0.95,
        description: 'Apertura - Desarrollo de piezas y control del centro'
      };
    }

    // If we have FEN, analyze material
    if (fen) {
      const materialCount = this.countMaterial(fen);
      const totalPieces = materialCount.queens + materialCount.rooks +
                         materialCount.bishops + materialCount.knights;

      // Endgame: Few pieces left
      if (totalPieces <= 6 || (materialCount.queens === 0 && totalPieces <= 8)) {
        return {
          phase: 'endgame',
          confidence: 0.9,
          description: 'Final - Activación del rey y promoción de peones'
        };
      }

      // Middlegame: Opening complete, many pieces still on board
      if (moveNumber > 10 && totalPieces > 6) {
        return {
          phase: 'middlegame',
          confidence: 0.85,
          description: 'Medio juego - Táctica, estrategia y planes'
        };
      }
    }

    // Fallback based on move number
    if (moveNumber <= 15) {
      return {
        phase: 'opening',
        confidence: 0.7,
        description: 'Apertura tardía - Completando desarrollo'
      };
    } else if (moveNumber <= 30) {
      return {
        phase: 'middlegame',
        confidence: 0.75,
        description: 'Medio juego'
      };
    } else {
      return {
        phase: 'endgame',
        confidence: 0.7,
        description: 'Final'
      };
    }
  }

  /**
   * Count material from FEN
   */
  private countMaterial(fen: string): {
    queens: number;
    rooks: number;
    bishops: number;
    knights: number;
    pawns: number;
  } {
    const position = fen.split(' ')[0]; // Get board position part

    return {
      queens: (position.match(/[Qq]/g) || []).length,
      rooks: (position.match(/[Rr]/g) || []).length,
      bishops: (position.match(/[Bb]/g) || []).length,
      knights: (position.match(/[Nn]/g) || []).length,
      pawns: (position.match(/[Pp]/g) || []).length
    };
  }

  /**
   * Get phase-specific advice
   */
  getPhaseAdvice(phase: 'opening' | 'middlegame' | 'endgame'): string[] {
    switch (phase) {
      case 'opening':
        return [
          'Desarrolla todas tus piezas antes de atacar',
          'Controla el centro con peones y piezas',
          'Enroca temprano para proteger tu rey',
          'No muevas la misma pieza dos veces sin razón'
        ];

      case 'middlegame':
        return [
          'Busca combinaciones tácticas',
          'Crea planes basados en debilidades del oponente',
          'Coordina tus piezas para ataques',
          'Considera intercambios que mejoren tu posición'
        ];

      case 'endgame':
        return [
          'Activa tu rey - es una pieza poderosa en el final',
          'Crea peones pasados y empújalos',
          'Simplifica si tienes ventaja material',
          'Estudia finales básicos (rey+peón, torres, etc.)'
        ];
    }
  }

  /**
   * Analyze game phase distribution
   */
  analyzePhaseDistribution(
    moveAnalysis: Array<{ moveNumber: number; fen?: string; classification: string }>
  ): {
    opening: { total: number; mistakes: number };
    middlegame: { total: number; mistakes: number };
    endgame: { total: number; mistakes: number };
    weakestPhase: 'opening' | 'middlegame' | 'endgame' | null;
  } {
    const stats = {
      opening: { total: 0, mistakes: 0 },
      middlegame: { total: 0, mistakes: 0 },
      endgame: { total: 0, mistakes: 0 }
    };

    for (const move of moveAnalysis) {
      const detection = this.detectPhase(move.moveNumber, move.fen);
      stats[detection.phase].total++;

      if (['mistake', 'blunder'].includes(move.classification)) {
        stats[detection.phase].mistakes++;
      }
    }

    // Find weakest phase (highest mistake rate)
    let weakestPhase: 'opening' | 'middlegame' | 'endgame' | null = null;
    let highestRate = 0;

    for (const [phase, data] of Object.entries(stats)) {
      if (data.total === 0) continue;
      const rate = data.mistakes / data.total;
      if (rate > highestRate) {
        highestRate = rate;
        weakestPhase = phase as 'opening' | 'middlegame' | 'endgame';
      }
    }

    return {
      ...stats,
      weakestPhase
    };
  }
}

export const gamePhaseService = new GamePhaseService();
export type { PhaseDetection };
