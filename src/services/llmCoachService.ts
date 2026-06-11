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
      const baseContext = this.buildBaseContext(gameRecord, profile, moveAnalysis);

      console.log('🤖 Generating comprehensive coach feedback in multiple calls...');

      // Generate each section separately to force detailed responses
      const [summary, keyInsights, trainingPlan, motivationalMessage, detailedAnalysis] = await Promise.all([
        this.generateSummary(baseContext),
        this.generateInsights(baseContext),
        this.generateTrainingPlan(baseContext),
        this.generateMotivationalMessage(baseContext),
        this.generateDetailedAnalysis(baseContext)
      ]);

      console.log('✅ All sections generated successfully');

      return {
        summary,
        keyInsights,
        trainingPlan,
        motivationalMessage,
        detailedAnalysis
      };
    } catch (error) {
      console.error('❌ Error generating LLM feedback:', error);
      return this.getFallbackFeedback(gameRecord, profile);
    }
  }

  /**
   * Build base context for all prompts
   */
  private buildBaseContext(
    gameRecord: GameRecord,
    profile: PlayerProfile,
    moveAnalysis: Array<{ moveNumber: number; classification: string; notation: string; comment: string; fen?: string }>
  ): string {
    const trend = this.getImprovementTrend(profile);
    const phaseStats = gamePhaseService.analyzePhaseDistribution(moveAnalysis);
    const phaseAdvice = phaseStats.weakestPhase
      ? gamePhaseService.getPhaseAdvice(phaseStats.weakestPhase)
      : [];

    return `**DATOS DEL JUGADOR:**
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
${moveAnalysis.slice(0, 5).map(m => `- ${m.notation}: ${m.classification} - ${m.comment}`).join('\n')}`;
  }

  /**
   * Generate summary section
   */
  private async generateSummary(baseContext: string): Promise<string> {
    const response = await this.callLLM(
      `${baseContext}

Escribe un RESUMEN EXTENSO de la partida. Debe ser un párrafo completo de 10-15 oraciones que cubra:
1. Evaluación técnica general de la partida
2. Análisis de la fase más débil y su impacto
3. Comparación con el nivel histórico del jugador
4. Diagnóstico del problema principal
5. Estilo de juego observado
6. 2-3 fortalezas específicas demostradas

Escribe un párrafo largo y detallado, como si fueras un entrenador profesional escribiendo un informe.`,
      800
    );

    return response;
  }

  /**
   * Generate key insights section
   */
  private async generateInsights(baseContext: string): Promise<string[]> {
    const response = await this.callLLM(
      `${baseContext}

Escribe 5 INSIGHTS CLAVE sobre esta partida. Cada insight debe ser un párrafo completo de 6-8 oraciones.

Escribe en el siguiente formato:

INSIGHT 1:
[Párrafo de 6-8 oraciones sobre la fase más débil]

INSIGHT 2:
[Párrafo de 6-8 oraciones sobre patrones tácticos perdidos]

INSIGHT 3:
[Párrafo de 6-8 oraciones sobre comparación histórica con números]

INSIGHT 4:
[Párrafo de 6-8 oraciones sobre el momento crítico]

INSIGHT 5:
[Párrafo de 6-8 oraciones sobre psicología y gestión mental]

Cada insight debe ser EXTENSO y DETALLADO.`,
      2000
    );

    return this.parseInsights(response);
  }

  /**
   * Generate training plan section
   */
  private async generateTrainingPlan(baseContext: string): Promise<string[]> {
    const response = await this.callLLM(
      `${baseContext}

Escribe 5 EJERCICIOS DE ENTRENAMIENTO específicos. Cada ejercicio debe ser un párrafo de 4-6 oraciones.

Escribe en el siguiente formato:

EJERCICIO 1:
[Párrafo de 4-6 oraciones para la debilidad principal]

EJERCICIO 2:
[Párrafo de 4-6 oraciones de estudio teórico]

EJERCICIO 3:
[Párrafo de 4-6 oraciones de cálculo y visualización]

EJERCICIO 4:
[Párrafo de 4-6 oraciones de partidas maestras]

EJERCICIO 5:
[Párrafo de 4-6 oraciones de práctica deliberada]

Cada ejercicio debe explicar QUÉ hacer, CÓMO hacerlo, POR QUÉ es importante, y CÓMO medir progreso.`,
      1500
    );

    return this.parseExercises(response);
  }

  /**
   * Generate motivational message
   */
  private async generateMotivationalMessage(baseContext: string): Promise<string> {
    const response = await this.callLLM(
      `${baseContext}

Escribe un MENSAJE MOTIVACIONAL EXTENSO de 7-10 oraciones que incluya:
1. 2 logros técnicos concretos de esta partida
2. Progreso medible comparado con partidas anteriores
3. Referencia inspiradora a un Gran Maestro
4. Perspectiva de mejora a 3-6 meses
5. Frase memorable final

Escribe un párrafo inspirador y motivador, pero específico y técnico.`,
      800
    );

    return response;
  }

  /**
   * Generate detailed analysis
   */
  private async generateDetailedAnalysis(baseContext: string): Promise<string> {
    const response = await this.callLLM(
      `${baseContext}

Escribe un ANÁLISIS DETALLADO EXTENSO de la partida. Debe tener 10-12 párrafos, cada uno de 6-8 oraciones:

**Párrafo 1 - Visión General**: Tipo de partida, factor decisivo, aprendizajes macro

**Párrafo 2 - Apertura**: Desarrollo, control del centro, seguridad del rey, estructura de peones

**Párrafo 3 - Transición**: Cómo se pasó al medio juego, completitud del desarrollo

**Párrafo 4 - Medio Juego Estratégico**: Planificación, conceptos estratégicos aplicados

**Párrafo 5 - Medio Juego Táctico**: Oportunidades tácticas, motivos presentes

**Párrafo 6 - Gestión de Ventajas**: Cómo se manejó la ventaja o desventaja

**Párrafo 7 - Final**: Técnica en finales, principios aplicados

**Párrafo 8 - Patrones Recurrentes**: Errores que se repiten en múltiples partidas

**Párrafo 9 - Comparación Histórica**: Estadísticas vs. últimas 10 partidas

**Párrafo 10 - Análisis Psicológico**: Gestión emocional y mental

**Párrafo 11 - Referencias a Maestros**: Partidas famosas similares

**Párrafo 12 - Recomendación Final**: Concepto clave para el siguiente nivel

Escribe cada párrafo con 6-8 oraciones completas. Este es un informe profesional extenso.`,
      3000
    );

    return response;
  }

  /**
   * Call LLM with prompt
   */
  private async callLLM(prompt: string, maxTokens: number = 1000): Promise<string> {
    const response = await fetch(`${this.backendUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: `Eres el Maestro Internacional Miguel Sánchez, entrenador de ajedrez profesional.

REGLA CRÍTICA: Debes escribir respuestas MUY EXTENSAS Y DETALLADAS. No resumas. No acortes. Escribe análisis completos y profundos como un verdadero entrenador profesional.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        model: 'gpt-4o',
        temperature: 0.9,
        maxTokens
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.content || '';
  }

  /**
   * Parse insights from response
   */
  private parseInsights(response: string): string[] {
    const insights: string[] = [];
    const regex = /INSIGHT \d+:\s*([\s\S]*?)(?=INSIGHT \d+:|$)/gi;
    let match;

    while ((match = regex.exec(response)) !== null) {
      const insight = match[1].trim();
      if (insight) {
        insights.push(insight);
      }
    }

    // If parsing fails, split by double newlines
    if (insights.length === 0) {
      const parts = response.split(/\n\n+/).filter(p => p.trim().length > 50);
      return parts.slice(0, 5);
    }

    return insights.slice(0, 5);
  }

  /**
   * Parse exercises from response
   */
  private parseExercises(response: string): string[] {
    const exercises: string[] = [];
    const regex = /EJERCICIO \d+:\s*([\s\S]*?)(?=EJERCICIO \d+:|$)/gi;
    let match;

    while ((match = regex.exec(response)) !== null) {
      const exercise = match[1].trim();
      if (exercise) {
        exercises.push(exercise);
      }
    }

    // If parsing fails, split by double newlines
    if (exercises.length === 0) {
      const parts = response.split(/\n\n+/).filter(p => p.trim().length > 50);
      return parts.slice(0, 5);
    }

    return exercises.slice(0, 5);
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
