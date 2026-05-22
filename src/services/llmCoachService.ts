/**
 * LLM Coach Service
 * Generates personalized feedback using local analysis
 */

import type { PlayerProfile, GameRecord } from './playerProfileService';
import { gamePhaseService } from './gamePhaseService';

export interface CoachFeedback {
  summary: string;
  keyInsights: string[];
  trainingPlan: string[];
  motivationalMessage: string;
  detailedAnalysis: string;
}

class LLMCoachService {
  /**
   * Generate personalized feedback based on game and profile
   */
  async generateFeedback(
    gameRecord: GameRecord,
    profile: PlayerProfile,
    moveAnalysis: Array<{ moveNumber: number; classification: string; notation: string; comment: string; fen?: string }>
  ): Promise<CoachFeedback> {
    // Always use local analysis (no API calls)
    return this.getFallbackFeedback(gameRecord, profile);
  }

  /**
   * Build prompt for LLM
   */
  private buildPrompt(
    gameRecord: GameRecord,
    profile: PlayerProfile,
    moveAnalysis: Array<{ moveNumber: number; classification: string; notation: string; comment: string; fen?: string }>
  ): string {
    const trend = this.getImprovementTrend(profile);

    // Analyze phase distribution
    const phaseStats = gamePhaseService.analyzePhaseDistribution(moveAnalysis);
    const phaseAdvice = phaseStats.weakestPhase
      ? gamePhaseService.getPhaseAdvice(phaseStats.weakestPhase)
      : [];

    return `Analiza esta partida de ajedrez y proporciona feedback personalizado:

**DATOS DEL JUGADOR:**
- Partidas jugadas: ${profile.totalGames}
- Precisión promedio histórica: ${profile.averageAccuracy}%
- Tendencia reciente: ${trend === 'improving' ? 'Mejorando 📈' : trend === 'declining' ? 'Necesita atención 📉' : 'Estable ➡️'}
- Fortalezas: ${profile.strengths.join(', ') || 'Por determinar'}
- Debilidades conocidas: ${profile.weaknesses.map(w => w.description).join(', ') || 'Ninguna identificada'}

**DATOS DE ESTA PARTIDA:**
- Precisión: ${gameRecord.accuracy}%
- Movimientos totales: ${gameRecord.totalMoves}
- Excelentes: ${gameRecord.excellentMoves}
- Buenos: ${gameRecord.goodMoves}
- Imprecisiones: ${gameRecord.inaccuracies}
- Errores: ${gameRecord.mistakes}
- Blunders: ${gameRecord.blunders}
- Color jugado: ${gameRecord.playerColor === 'white' ? 'Blancas' : 'Negras'}

**ANÁLISIS POR FASE DEL JUEGO:**
- Apertura: ${phaseStats.opening.total} movimientos, ${phaseStats.opening.mistakes} errores graves
- Medio juego: ${phaseStats.middlegame.total} movimientos, ${phaseStats.middlegame.mistakes} errores graves
- Final: ${phaseStats.endgame.total} movimientos, ${phaseStats.endgame.mistakes} errores graves
${phaseStats.weakestPhase ? `- Fase más débil: ${phaseStats.weakestPhase === 'opening' ? 'Apertura' : phaseStats.weakestPhase === 'middlegame' ? 'Medio juego' : 'Final'}` : ''}

**MOVIMIENTOS MÁS IMPORTANTES:**
${moveAnalysis.slice(0, 5).map(m => `- ${m.notation}: ${m.classification} - ${m.comment}`).join('\n')}

${phaseStats.weakestPhase ? `\n**CONSEJOS PARA ${phaseStats.weakestPhase.toUpperCase()}:**\n${phaseAdvice.map(a => `- ${a}`).join('\n')}` : ''}

**FORMATO DE RESPUESTA (ESTRICTO):**

RESUMEN:
[2-3 frases sobre el rendimiento general, menciona la fase más débil si existe]

INSIGHTS_CLAVE:
- [Insight 1 - relacionado con fase del juego si es relevante]
- [Insight 2]
- [Insight 3]

PLAN_ENTRENAMIENTO:
- [Ejercicio o foco 1 - específico para la fase más débil]
- [Ejercicio o foco 2]
- [Ejercicio o foco 3]

MENSAJE_MOTIVACIONAL:
[1-2 frases inspiradoras y constructivas]

ANALISIS_DETALLADO:
[Análisis profundo de 3-4 párrafos sobre patrones, errores específicos, rendimiento por fase del juego y áreas de mejora]`;
  }

  /**
   * Parse LLM response into structured feedback
   */
  private parseFeedback(rawFeedback: string): CoachFeedback {
    const sections = {
      summary: '',
      keyInsights: [] as string[],
      trainingPlan: [] as string[],
      motivationalMessage: '',
      detailedAnalysis: ''
    };

    try {
      const lines = rawFeedback.split('\n');
      let currentSection = '';

      for (const line of lines) {
        const trimmed = line.trim();

        if (trimmed.startsWith('RESUMEN:')) {
          currentSection = 'summary';
          continue;
        } else if (trimmed.startsWith('INSIGHTS_CLAVE:')) {
          currentSection = 'insights';
          continue;
        } else if (trimmed.startsWith('PLAN_ENTRENAMIENTO:')) {
          currentSection = 'training';
          continue;
        } else if (trimmed.startsWith('MENSAJE_MOTIVACIONAL:')) {
          currentSection = 'motivational';
          continue;
        } else if (trimmed.startsWith('ANALISIS_DETALLADO:')) {
          currentSection = 'detailed';
          continue;
        }

        if (trimmed.length === 0) continue;

        switch (currentSection) {
          case 'summary':
            sections.summary += trimmed + ' ';
            break;
          case 'insights':
            if (trimmed.startsWith('-')) {
              sections.keyInsights.push(trimmed.substring(1).trim());
            }
            break;
          case 'training':
            if (trimmed.startsWith('-')) {
              sections.trainingPlan.push(trimmed.substring(1).trim());
            }
            break;
          case 'motivational':
            sections.motivationalMessage += trimmed + ' ';
            break;
          case 'detailed':
            sections.detailedAnalysis += trimmed + '\n\n';
            break;
        }
      }
    } catch (error) {
      console.error('Error parsing feedback:', error);
    }

    return {
      summary: sections.summary.trim() || 'Partida analizada exitosamente.',
      keyInsights: sections.keyInsights.length > 0 ? sections.keyInsights : ['Mantén el enfoque en tus jugadas'],
      trainingPlan: sections.trainingPlan.length > 0 ? sections.trainingPlan : ['Practica táctica diaria'],
      motivationalMessage: sections.motivationalMessage.trim() || '¡Sigue practicando!',
      detailedAnalysis: sections.detailedAnalysis.trim() || 'Continúa mejorando tu juego paso a paso.'
    };
  }

  /**
   * Generate local feedback based on game statistics
   */
  private getFallbackFeedback(gameRecord: GameRecord, profile: PlayerProfile): CoachFeedback {
    const accuracy = gameRecord.accuracy;
    const blunders = gameRecord.blunders;
    const mistakes = gameRecord.mistakes;
    const totalErrors = blunders + mistakes + gameRecord.inaccuracies;

    // Dynamic summary based on performance
    let summary = `Jugaste con ${accuracy}% de precisión en esta partida. `;
    if (accuracy >= 90) {
      summary += '¡Rendimiento excepcional! Mantuviste un nivel muy alto durante toda la partida.';
    } else if (accuracy >= 80) {
      summary += 'Muy buen juego, con solo algunos detalles por pulir.';
    } else if (accuracy >= 70) {
      summary += 'Sólido desempeño general, aunque hubo algunos momentos críticos que mejorar.';
    } else if (accuracy >= 60) {
      summary += 'Desempeño promedio con varias oportunidades de mejora identificadas.';
    } else {
      summary += 'Esta partida muestra áreas importantes para trabajar. ¡Es una gran oportunidad de aprendizaje!';
    }

    // Dynamic insights based on game statistics
    const insights: string[] = [];

    if (blunders === 0) {
      insights.push('Excelente: No cometiste ningún error grave en toda la partida');
    } else if (blunders === 1) {
      insights.push('Solo cometiste 1 blunder - buen control general de la posición');
    } else {
      insights.push(`Cometiste ${blunders} blunders - enfócate en calcular más profundamente antes de mover`);
    }

    if (accuracy >= profile.averageAccuracy) {
      insights.push(`Tu precisión está por encima de tu promedio histórico (${profile.averageAccuracy}%) - ¡vas mejorando!`);
    } else {
      insights.push(`Tu precisión está por debajo de tu promedio (${profile.averageAccuracy}%) - revisa tus errores`);
    }

    const goodMovesPercent = Math.round(((gameRecord.excellentMoves + gameRecord.goodMoves) / gameRecord.totalMoves) * 100);
    if (goodMovesPercent >= 70) {
      insights.push(`${goodMovesPercent}% de tus movimientos fueron buenos o excelentes - gran consistencia`);
    } else {
      insights.push(`Solo ${goodMovesPercent}% de tus movimientos fueron buenos - hay margen de mejora`);
    }

    // Dynamic training plan
    const training: string[] = [];

    if (blunders > 2) {
      training.push('Practica cálculo táctico: dedica 20 minutos diarios a resolver puzzles');
      training.push('Antes de cada movimiento, pregúntate: "¿Qué amenazas tiene mi rival?"');
    } else if (blunders > 0) {
      training.push('Revisa los momentos críticos de tus partidas para entender tus blunders');
      training.push('Practica puzzles de nivel intermedio 15 minutos al día');
    } else {
      training.push('Mantén tu excelente nivel táctico con puzzles desafiantes diarios');
    }

    if (mistakes + gameRecord.inaccuracies > 5) {
      training.push('Estudia las aperturas que juegas habitualmente para mejorar tu repertorio');
    }

    if (accuracy < 70) {
      training.push('Juega partidas más lentas para tener tiempo de calcular variantes');
    } else {
      training.push('Estudia finales clásicos para perfeccionar la técnica en posiciones ganadoras');
    }

    // Motivational message based on trend
    let motivational = '';
    const trend = this.getImprovementTrend(profile);
    if (trend === 'improving') {
      motivational = '¡Estás en una tendencia positiva! Tu progreso es evidente. Sigue así y pronto alcanzarás un nuevo nivel.';
    } else if (trend === 'declining') {
      motivational = 'Todos tenemos rachas difíciles. Toma cada partida como una lección y volverás más fuerte. ¡No te rindas!';
    } else {
      motivational = 'Tu juego es consistente. Ahora es momento de dar el siguiente paso. ¡El esfuerzo constante siempre da frutos!';
    }

    // Detailed analysis
    const detailedAnalysis = `
Análisis completo de tu partida:

Rendimiento general: Lograste una precisión de ${accuracy}% en ${gameRecord.totalMoves} movimientos. ${gameRecord.excellentMoves} fueron excelentes y ${gameRecord.goodMoves} fueron buenos, lo que representa un ${goodMovesPercent}% de jugadas de calidad.

Errores críticos: ${blunders > 0 ? `Cometiste ${blunders} blunder(s) que afectaron significativamente la evaluación de la posición. Estos momentos críticos suelen ocurrir por falta de cálculo profundo o por no considerar los recursos tácticos del rival.` : 'No cometiste blunders en esta partida, lo que demuestra un buen control posicional y cálculo táctico.'}

Áreas de mejora: ${totalErrors > 5 ? `Con ${totalErrors} imprecisiones y errores en total, hay espacio para mejorar tu consistencia. Enfócate en verificar cada jugada antes de ejecutarla, especialmente en posiciones complejas.` : 'Tu juego mostró buena consistencia con pocos errores. Continúa refinando tu técnica en las fases donde aún tienes debilidades.'}

Comparación histórica: ${accuracy >= profile.averageAccuracy ? `Esta partida está por encima de tu promedio histórico, lo que indica progreso.` : `Esta partida está por debajo de tu promedio. Analiza qué fue diferente y aprende de ello.`} Con ${profile.totalGames} partidas jugadas, tu experiencia está creciendo constantemente.
    `.trim();

    return {
      summary,
      keyInsights: insights,
      trainingPlan: training,
      motivationalMessage: motivational,
      detailedAnalysis
    };
  }

  /**
   * Get improvement trend
   */
  private getImprovementTrend(profile: PlayerProfile): 'improving' | 'stable' | 'declining' {
    if (profile.gameHistory.length < 5) return 'stable';

    const recent = profile.gameHistory.slice(0, 5);
    const older = profile.gameHistory.slice(5, 10);

    if (older.length === 0) return 'stable';

    const recentAvg = recent.reduce((sum, g) => sum + g.accuracy, 0) / recent.length;
    const olderAvg = older.reduce((sum, g) => sum + g.accuracy, 0) / older.length;

    const diff = recentAvg - olderAvg;

    if (diff > 5) return 'improving';
    if (diff < -5) return 'declining';
    return 'stable';
  }
}

export const llmCoachService = new LLMCoachService();
