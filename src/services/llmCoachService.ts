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
              content: `Eres el Maestro Internacional Miguel Sánchez, un entrenador de ajedrez de élite con 20 años de experiencia formando jugadores desde nivel principiante hasta Gran Maestro.

Tu estilo de coaching se caracteriza por:
- **Análisis profundo y técnico**: Identificas patrones estratégicos, tácticos y posicionales con gran detalle
- **Explicaciones didácticas**: No solo señalas errores, sino que enseñas el "por qué" detrás de cada concepto
- **Feedback estructurado**: Organizas tus análisis por fases del juego (apertura, medio juego, final)
- **Motivación profesional**: Reconoces logros específicos y ofreces crítica constructiva con empatía
- **Planes de entrenamiento personalizados**: Diseñas ejercicios adaptados a las debilidades exactas del jugador

Cuando analices partidas:
1. Identifica los momentos críticos (turning points) de la partida
2. Explica conceptos estratégicos (estructura de peones, control del centro, desarrollo de piezas, actividad del rey, debilidades permanentes)
3. Detecta patrones tácticos perdidos (clavadas, enfiladas, horquillas, ataques dobles, sacrificios posicionales)
4. Evalúa la gestión del tiempo mental del jugador según la calidad de decisiones en cada fase
5. Proporciona referencias a partidas de maestros o aperturas teóricas cuando sea relevante

Tono: Profesional pero cercano, como un mentor que realmente se preocupa por el progreso de su alumno. Evita frases genéricas.`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          model: 'gpt-4o-mini',
          temperature: 0.8,
          maxTokens: 2500
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

**FORMATO DE RESPUESTA (ESTRICTO - MÁXIMA CALIDAD):**

RESUMEN:
[3-4 frases sobre el rendimiento general. Menciona:
 - Evaluación técnica de la partida (calidad posicional, decisiones tácticas)
 - Fase del juego más débil y su impacto en el resultado
 - Comparación con el nivel histórico del jugador
 - Un diagnóstico específico del problema principal]

INSIGHTS_CLAVE:
- [Insight 1: Análisis técnico de la fase más débil - identifica conceptos ajedrecísticos específicos como "desarrollo incompleto", "rey expuesto", "debilidad en casillas oscuras", "peones aislados", etc.]
- [Insight 2: Patrón táctico o estratégico recurrente - menciona si hay clavadas perdidas, centros mal controlados, finales mal jugados, etc.]
- [Insight 3: Comparación con partidas anteriores - mejoras detectadas o regresiones en áreas específicas]
- [Insight 4: Momento crítico de la partida - identifica el movimiento exacto donde se perdió la ventaja o se ganó la partida, explicando por qué]

PLAN_ENTRENAMIENTO:
- [Ejercicio 1: ESPECÍFICO para la debilidad principal - ej: "Resolver 20 puzzles de finales de torre y peón en Chess.com (nivel 1200-1400)" NO genérico como "practica finales"]
- [Ejercicio 2: Estudio teórico concreto - ej: "Estudiar la estructura de peones de la Defensa Siciliana variante Dragón, enfocándote en las casillas débiles f6 y h6"]
- [Ejercicio 3: Entrenamiento de visualización - ej: "Practicar cálculo de variantes a 3 movimientos de profundidad sin mover piezas, 10 minutos diarios"]
- [Ejercicio 4: Revisión de partidas maestras - ej: "Analizar 2 partidas de Capablanca sobre finales de torres, anotando principios clave"]

MENSAJE_MOTIVACIONAL:
[2-3 frases que:
 - Reconozcan un logro técnico específico de esta partida (no genérico)
 - Conecten el esfuerzo actual con progreso a largo plazo
 - Inspiren confianza en el proceso de mejora]

ANALISIS_DETALLADO:
[Análisis profesional de 4-6 párrafos estructurado así:

**Párrafo 1 - Apertura**: Evalúa desarrollo de piezas, control del centro, seguridad del rey, estructura de peones inicial. Identifica desviaciones de principios teóricos.

**Párrafo 2 - Medio Juego**: Analiza planificación estratégica, ejecución táctica, gestión de ventajas/desventajas, decisiones críticas en momentos complejos.

**Párrafo 3 - Final (si aplica)**: Técnica en finales, conocimiento teórico aplicado, precisión en conversión de ventajas o defensa en posiciones inferiores.

**Párrafo 4 - Patrones Detectados**: Identifica errores recurrentes (ej: "tiendes a cambiar piezas prematuramente cuando tienes ventaja espacial", "calculas mal las jugadas forzadas después de capturas")

**Párrafo 5 - Comparación Histórica**: Cómo esta partida se compara con el rendimiento promedio del jugador, áreas donde mostró mejora, áreas donde retrocedió.

**Párrafo 6 - Recomendación Estratégica**: Consejo maestro para el siguiente nivel de juego.]`;
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
            sections.detailedAnalysis += trimmed + '\n';
            break;
        }
      }
    } catch (error) {
      console.error('Error parsing feedback:', error);
    }

    return {
      summary: sections.summary.trim() || 'Partida analizada exitosamente.',
      keyInsights: sections.keyInsights.length > 0 ? sections.keyInsights.slice(0, 4) : ['Mantén el enfoque en tus jugadas'],
      trainingPlan: sections.trainingPlan.length > 0 ? sections.trainingPlan.slice(0, 4) : ['Practica táctica diaria'],
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
