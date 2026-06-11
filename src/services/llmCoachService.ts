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
1. Identifica los momentos críticos (turning points) de la partida con detalles específicos
2. Explica conceptos estratégicos en profundidad (estructura de peones, control del centro, desarrollo de piezas, actividad del rey, debilidades permanentes)
3. Detecta patrones tácticos perdidos con ejemplos concretos (clavadas, enfiladas, horquillas, ataques dobles, sacrificios posicionales)
4. Evalúa la gestión del tiempo mental del jugador según la calidad de decisiones en cada fase
5. Proporciona referencias a partidas de maestros o aperturas teóricas cuando sea relevante

IMPORTANTE: Sé EXTREMADAMENTE DETALLADO en tus análisis. Cada sección debe tener contenido sustancial y profundo. No uses frases cortas ni genéricas. Explica TODO con ejemplos y razonamientos extensos.

Tono: Profesional pero cercano, como un mentor que realmente se preocupa por el progreso de su alumno. Evita frases genéricas.`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          model: 'gpt-4o-mini',
          temperature: 0.9,
          maxTokens: 4000
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

**FORMATO DE RESPUESTA (ESTRICTO - MÁXIMA EXTENSIÓN Y PROFUNDIDAD):**

RESUMEN:
[Mínimo 5-6 frases extensas y detalladas sobre el rendimiento general. DEBE incluir:
 - Evaluación técnica profunda de la partida (calidad posicional específica, decisiones tácticas concretas, ejemplos de movimientos)
 - Análisis de la fase del juego más débil con explicación de POR QUÉ fue débil y CÓMO impactó el resultado
 - Comparación detallada con el nivel histórico del jugador (números específicos, tendencias observadas)
 - Un diagnóstico completo del problema principal con razonamiento
 - Contexto general del estilo de juego del jugador
 - Mención de fortalezas específicas observadas en esta partida]

INSIGHTS_CLAVE:
- [Insight 1 (3-4 líneas): Análisis técnico PROFUNDO de la fase más débil. Identifica conceptos ajedrecísticos específicos como "desarrollo incompleto en las piezas del flanco de dama", "rey expuesto en h8 sin defensa adecuada", "debilidad permanente en casillas oscuras d6 y f6", "peones aislados en la columna d que fueron explotados". Explica las CONSECUENCIAS de cada problema.]
- [Insight 2 (3-4 líneas): Patrón táctico o estratégico recurrente con EJEMPLOS CONCRETOS. Menciona movimientos específicos donde se perdieron oportunidades tácticas (ej: "En el movimiento 12, no viste la horquilla con Cf5 que ganaba calidad"). Explica QUÉ debiste haber visto y CÓMO calcularlo.]
- [Insight 3 (3-4 líneas): Comparación DETALLADA con partidas anteriores. Menciona mejoras específicas detectadas (ej: "Tu precisión en la apertura mejoró 15% comparado con tus últimas 5 partidas") o regresiones en áreas específicas. Proporciona números y tendencias.]
- [Insight 4 (3-4 líneas): Momento crítico de la partida con ANÁLISIS COMPLETO. Identifica el movimiento EXACTO donde se perdió/ganó la ventaja (ej: "El movimiento 18. Bxd8 fue el punto de inflexión crítico"). Explica qué debiste jugar, por qué era mejor, y cómo hubiera cambiado la partida.]
- [Insight 5 (3-4 líneas): Análisis de decisiones psicológicas y gestión del tiempo mental. ¿Jugaste apresurado en algún momento? ¿Hubo signos de fatiga mental en cierta fase?]

PLAN_ENTRENAMIENTO:
- [Ejercicio 1 (2-3 líneas): ESPECÍFICO y MEDIBLE para la debilidad principal. Ejemplo: "Resolver 30 puzzles tácticos de medio juego en Chess.com o Lichess (nivel 1300-1500) enfocados en clavadas y horquillas. Objetivo: 80% de precisión en 2 semanas." NO genérico como "practica táctica".]
- [Ejercicio 2 (2-3 líneas): Estudio teórico CONCRETO con recursos específicos. Ejemplo: "Estudiar los primeros 10 movimientos de la Defensa Siciliana Najdorf usando el curso de ChessBase. Enfócate en los planes típicos de ruptura con b5 y d5, y las casillas débiles d5 y d6."]
- [Ejercicio 3 (2-3 líneas): Entrenamiento de visualización y cálculo ESTRUCTURADO. Ejemplo: "Practicar cálculo de variantes a 4-5 movimientos de profundidad sin mover piezas. Usa el método de los 'círculos de la visión': calcula la variante principal, luego las alternativas. 15 minutos diarios durante 3 semanas."]
- [Ejercicio 4 (2-3 líneas): Revisión de partidas maestras CON OBJETIVOS CLAROS. Ejemplo: "Analizar 3 partidas de Anatoly Karpov sobre finales de torres (específicamente Torre + 3 peones vs Torre + 3 peones). Anota los 5 principios más importantes que observes: actividad del rey, creación de peones pasados, etc."]
- [Ejercicio 5 (2-3 líneas): Práctica de partidas ORIENTADA. Ejemplo: "Jugar 5 partidas con tiempo 15+10 donde te OBLIGUES a gastar al menos 2 minutos en cada movimiento crítico del medio juego. Grábate pensando en voz alta para identificar fallas en tu proceso de pensamiento."]

MENSAJE_MOTIVACIONAL:
[Mínimo 4-5 frases inspiradoras y ESPECÍFICAS que:
 - Reconozcan DOS logros técnicos concretos de esta partida (no genérico como "jugaste bien", sino "tu movimiento 8. e3 fue excelente porque...")
 - Conecten el esfuerzo actual con el progreso medible a largo plazo (ej: "Has mejorado tu precisión en aperturas un 12% en el último mes")
 - Mencionen una referencia a un Gran Maestro que también tuvo desafíos similares y los superó
 - Inspiren confianza en el proceso de mejora con perspectiva de 3-6 meses
 - Terminen con una frase memorable que el jugador recuerde en su próxima partida]

ANALISIS_DETALLADO:
[Análisis PROFESIONAL y EXTENSO de 8-12 párrafos (cada párrafo de 4-6 oraciones). Estructura OBLIGATORIA:

**Párrafo 1 - Visión General de la Partida**: Comienza con una evaluación holística. ¿Qué tipo de partida fue? (posicional, táctica, equilibrada, desequilibrada). ¿Cuál fue el factor decisivo? ¿Qué podemos aprender de ella a nivel macro?

**Párrafo 2 - Apertura Detallada**: Evalúa CADA ASPECTO de la apertura: desarrollo de piezas (movimiento por movimiento), control del centro (¿e4-d4? ¿fianchetto?), seguridad del rey (enroque temprano/tardío), estructura de peones inicial (cadenas, islas). Identifica desviaciones de principios teóricos con ejemplos: "El movimiento 4. Bg5 antes de 4. Nf3 violó el principio de desarrollar caballos antes de alfiles".

**Párrafo 3 - Transición Apertura-Medio Juego**: Analiza cómo se pasó de la apertura al medio juego. ¿Se completó el desarrollo? ¿Se formuló un plan claro? ¿Hubo rupturas temáticas (e5, d5, c5, f5) que no se jugaron?

**Párrafo 4 - Medio Juego Estratégico**: Analiza la planificación estratégica en profundidad. ¿Qué planes había disponibles? ¿Cuál elegiste? ¿Por qué fue correcto o incorrecto? Menciona conceptos como: mayoría de peones, parejas de alfiles, piezas malas, casillas débiles, columnas abiertas.

**Párrafo 5 - Medio Juego Táctico**: Examina la ejecución táctica. ¿Se vieron TODAS las tácticas disponibles? Lista 2-3 oportunidades tácticas concretas (con notación) que se aprovecharon o se perdieron. Explica los MOTIVOS TÁCTICOS presentes.

**Párrafo 6 - Gestión de Ventajas/Desventajas**: ¿Cómo se gestionaron las ventajas materiales, posicionales o de tiempo? Si tenías ventaja, ¿la simplificaste correctamente? Si estabas peor, ¿buscaste complicaciones o te defendiste pasivamente?

**Párrafo 7 - Final (si aplica, si no, fusiona con párrafo anterior)**: Técnica en finales con DETALLES. ¿Se aplicaron principios teóricos conocidos? (torre detrás de peones pasados, activación del rey, creación de peones pasados, oposición). ¿Hubo errores de conversión? Compara con finales teóricos similares.

**Párrafo 8 - Patrones de Errores Recurrentes**: Identifica 3-4 errores que SE REPITEN en múltiples partidas (basado en historial). Ejemplos: "Tiendes a cambiar piezas prematuramente cuando tienes ventaja espacial, como se observó en los movimientos 14 y 18", "Calculas incorrectamente secuencias de capturas forzadas, especialmente cuando hay clavadas involucradas".

**Párrafo 9 - Comparación Histórica Profunda**: Compara esta partida con el promedio de las últimas 10 partidas. Menciona NÚMEROS: precisión promedio, blunders promedio, fase más débil históricamente. ¿En qué área específica mejoraste? ¿Dónde retrocediste? ¿Hay una TENDENCIA alcista o bajista?

**Párrafo 10 - Análisis Psicológico**: ¿Cómo fue la gestión emocional? ¿Jugaste apresurado después de un error? ¿Mostraste resiliencia en posiciones difíciles? ¿Hubo signos de tilting o fatiga mental?

**Párrafo 11 - Referencias a Partidas Maestras**: Conecta esta partida con partidas famosas. Ejemplo: "Tu estructura de peones en la apertura es similar a la que Bobby Fischer enfrentó contra Spassky en 1972, donde aplicó el plan de...". Proporciona CONTEXTO educativo.

**Párrafo 12 - Recomendación Estratégica para el Siguiente Nivel**: Consejo maestro ESPECÍFICO y ACCIONABLE. ¿Cuál es el ÚNICO concepto que, si dominas, te llevaría al siguiente nivel de juego? (Ej: "Tu próximo salto de nivel vendrá de dominar la evaluación posicional de finales de torres. Específicamente, necesitas aprender a crear peones pasados lejanos y usar la actividad del rey como criterio principal de evaluación.")]`;
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
      keyInsights: sections.keyInsights.length > 0 ? sections.keyInsights.slice(0, 5) : ['Mantén el enfoque en tus jugadas'],
      trainingPlan: sections.trainingPlan.length > 0 ? sections.trainingPlan.slice(0, 5) : ['Practica táctica diaria'],
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
