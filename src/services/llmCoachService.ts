/**
 * LLM Coach Service
 * Generates personalized feedback using OpenAI via backend API
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
  private backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

  /**
   * Generate personalized feedback based on game and profile
   */
  async generateFeedback(
    gameRecord: GameRecord,
    profile: PlayerProfile,
    moveAnalysis: Array<{ moveNumber: number; classification: string; notation: string; comment: string; fen?: string }>
  ): Promise<CoachFeedback> {
    try {
      const prompt = this.buildPrompt(gameRecord, profile, moveAnalysis);

      console.log('🤖 Calling backend API for coach feedback...');

      const response = await fetch(`${this.backendUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: 'Eres un entrenador experto de ajedrez con años de experiencia. Tu tarea es analizar partidas y proporcionar feedback constructivo, personalizado y motivador a jugadores para ayudarles a mejorar. Sé específico, claro y siempre positivo.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          model: 'gpt-4o-mini',
          temperature: 0.7,
          maxTokens: 1500
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      const rawFeedback = data.content || '';

      console.log('✅ Coach feedback generated successfully');

      return this.parseFeedback(rawFeedback);
    } catch (error) {
      console.error('❌ Error generating LLM feedback:', error);
      return this.getFallbackFeedback(gameRecord, profile);
    }
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
   * Fallback feedback when LLM fails
   */
  private getFallbackFeedback(gameRecord: GameRecord, profile: PlayerProfile): CoachFeedback {
    const accuracy = gameRecord.accuracy;

    let summary = `Jugaste con ${accuracy}% de precisión. `;
    if (accuracy >= 80) {
      summary += '¡Excelente rendimiento!';
    } else if (accuracy >= 60) {
      summary += 'Buen desempeño con espacio para mejorar.';
    } else {
      summary += 'Hay áreas importantes para trabajar.';
    }

    const insights = [
      `Realizaste ${gameRecord.blunders} error(es) grave(s) en esta partida`,
      `Tu precisión es ${accuracy >= profile.averageAccuracy ? 'superior' : 'inferior'} a tu promedio (${profile.averageAccuracy}%)`,
      `Tuviste ${gameRecord.excellentMoves + gameRecord.goodMoves} movimientos de buena calidad`
    ];

    const training = [
      'Practica puzzles tácticos 15 minutos diarios',
      'Revisa tus partidas para identificar patrones de error',
      'Estudia finales básicos'
    ];

    return {
      summary,
      keyInsights: insights,
      trainingPlan: training,
      motivationalMessage: '¡Cada partida es una oportunidad para aprender! Sigue adelante.',
      detailedAnalysis: `Análisis detallado: Tu partida mostró ${gameRecord.excellentMoves} jugadas excelentes y ${gameRecord.goodMoves} jugadas buenas, lo cual es positivo. Sin embargo, los ${gameRecord.blunders} blunders indican áreas de mejora en el cálculo de variantes. Enfócate en verificar tus jugadas antes de ejecutarlas, especialmente en posiciones críticas.`
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
