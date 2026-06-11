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

IMPORTANTE:
- Debes escribir AL MENOS 2000 palabras en total
- El RESUMEN debe tener MÍNIMO 150 palabras
- Cada INSIGHT debe tener MÍNIMO 80 palabras (5 insights = 400 palabras)
- Cada EJERCICIO debe tener MÍNIMO 60 palabras (5 ejercicios = 300 palabras)
- El MENSAJE_MOTIVACIONAL debe tener MÍNIMO 100 palabras
- El ANALISIS_DETALLADO debe tener MÍNIMO 1200 palabras (12 párrafos de 100 palabras cada uno)
- NO USES FRASES CORTAS. Cada oración debe ser descriptiva y explicativa
- EXPLICA TODO con razonamientos extensos, ejemplos concretos, y detalles técnicos

Tono: Profesional pero cercano, como un mentor que realmente se preocupa por el progreso de su alumno. Evita frases genéricas.`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          model: 'gpt-4o',
          temperature: 1.0,
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

**IMPORTANTE - FORMATO DE RESPUESTA EXTENDIDO:**

Eres un entrenador profesional escribiendo un informe detallado para tu alumno. Este es un análisis COMPLETO y PROFUNDO que el jugador va a estudiar durante varios días. Escribe como si estuvieras explicando conceptos complejos a un estudiante dedicado que quiere entender TODO en profundidad.

NO escribas respuestas cortas. Cada sección debe ser EXTENSA y DETALLADA como un informe profesional de coaching.

RESUMEN:
Escribe un resumen EXTENSO de al menos un párrafo largo (8-12 oraciones completas). Imagina que estás escribiendo el resumen ejecutivo de un informe de análisis profesional. Incluye:
- Evaluación técnica detallada de la partida con ejemplos específicos de movimientos
- Análisis profundo de por qué la fase más débil causó problemas
- Comparación numérica con el historial del jugador
- Diagnóstico del problema principal con razonamiento técnico
- Contexto del estilo de juego
- 2-3 fortalezas observadas con ejemplos concretos

Ejemplo de extensión esperada:
"En esta partida, tu rendimiento de 44% de precisión refleja un desafío significativo en la fase de medio juego, donde cometiste 6 errores graves que alteraron el curso de la partida. El análisis revela que el problema principal fue la falta de cálculo profundo en posiciones tácticas críticas, específicamente en los movimientos 12-18 donde una serie de imprecisiones te costó ventaja material. Comparado con tu promedio histórico de 44%, esta partida se mantiene en tu nivel actual, aunque muestra una ligera mejora en la apertura donde jugaste los primeros 8 movimientos con mayor precisión que en partidas anteriores. Tu estilo de juego tiende a ser táctico y agresivo, buscando oportunidades de ataque, pero esta agresividad a veces te lleva a descuidar la seguridad de tu propio rey y las amenazas defensivas del oponente. Entre las fortalezas observadas destacan tu capacidad para desarrollar piezas rápidamente en la apertura (completaste el desarrollo en el movimiento 9, lo cual es excelente), tu visión para crear amenazas directas al rey enemigo en el medio juego, y tu determinación para luchar incluso en posiciones difíciles, lo cual es una cualidad mental valiosa que muchos jugadores carecen a tu nivel."

INSIGHTS_CLAVE:
Escribe 5 insights EXTENSOS. Cada insight debe tener al menos 4-6 oraciones completas. No escribas bullet points cortos, escribe PÁRRAFOS explicativos.

- Insight 1 - Fase más débil: [Escribe un párrafo completo de 5-7 oraciones analizando técnicamente la fase más débil. Ejemplo: "Tu mayor debilidad en esta partida fue el medio juego, donde cometiste 4 de los 6 blunders totales. Esta fase mostró una clara falta de cálculo táctico profundo, especialmente cuando la posición se volvió compleja después del movimiento 12. El problema raíz es que no estás evaluando todas las amenazas del oponente antes de ejecutar tus propias amenazas. En el movimiento 14, por ejemplo, jugaste Nf4 atacando el peón de e6, pero no consideraste que tu oponente tenía la táctica Bxf4 seguido de Qh4+, ganando material con jaque. Esta falta de visualización de las respuestas del oponente es un patrón que se repite en tus últimas partidas. Para mejorar, necesitas desarrollar el hábito de preguntarte '¿Qué puede hacer mi oponente después de este movimiento?' antes de cada jugada crítica en el medio juego."]

- Insight 2 - Patrón táctico recurrente: [Escribe un párrafo completo de 5-7 oraciones identificando patrones tácticos perdidos. Menciona movimientos específicos con notación y explica qué debiste ver.]

- Insight 3 - Comparación histórica: [Escribe un párrafo completo de 5-7 oraciones comparando con partidas anteriores usando números específicos y tendencias claras.]

- Insight 4 - Momento crítico: [Escribe un párrafo completo de 5-7 oraciones analizando el movimiento exacto donde se perdió/ganó la ventaja.]

- Insight 5 - Psicología y gestión mental: [Escribe un párrafo completo de 5-7 oraciones analizando decisiones psicológicas y gestión del tiempo mental.]

PLAN_ENTRENAMIENTO:
Escribe 5 ejercicios EXTENSOS. Cada ejercicio debe tener al menos 3-5 oraciones completas explicando qué hacer, cómo hacerlo, y por qué es importante.

- Ejercicio 1: [Ejemplo: "Dedica 20 minutos diarios durante las próximas dos semanas a resolver puzzles tácticos de medio juego en Chess.com o Lichess, específicamente en el rango de dificultad 1300-1500. Enfócate exclusivamente en motivos tácticos de horquillas y ataques dobles, ya que estos fueron los patrones que más perdiste en esta partida. Establece un objetivo medible: alcanzar 80% de precisión en estos puzzles dentro de 2 semanas. Lleva un registro de tu progreso en una hoja de cálculo anotando cuántos puzzles resuelves correctamente cada día. Si fallas un puzzle, no pases al siguiente inmediatamente; en su lugar, dedica 2-3 minutos a entender por qué fallaste y luego intenta resolverlo nuevamente sin ayuda."]

- Ejercicio 2: [Escribe 3-5 oraciones con un ejercicio específico de estudio teórico.]

- Ejercicio 3: [Escribe 3-5 oraciones con un ejercicio de cálculo y visualización.]

- Ejercicio 4: [Escribe 3-5 oraciones con revisión de partidas maestras.]

- Ejercicio 5: [Escribe 3-5 oraciones con práctica deliberada de partidas.]

MENSAJE_MOTIVACIONAL:
Escribe un mensaje motivacional EXTENSO de al menos 5-7 oraciones completas. Debe ser inspirador pero específico, mencionando logros concretos de esta partida y conectando con el progreso a largo plazo.

Ejemplo: "A pesar de las dificultades en esta partida, quiero destacar dos aspectos técnicos muy positivos que demostraste. Primero, tu movimiento 8. e3 fue excelente porque controló la casilla d4 crítica y preparó el desarrollo natural de tu alfil de dama, siguiendo principios sólidos de apertura que muchos jugadores de tu nivel descuidan. Segundo, tu capacidad para crear amenazas en el flanco de rey muestra que tienes instintos tácticos naturales que, con entrenamiento enfocado, pueden convertirse en tu mayor fortaleza. Comparado con tus últimas 10 partidas, tu precisión en la apertura ha mejorado un 8%, pasando de 36% a 44%, lo cual es un progreso tangible y estadísticamente significativo que demuestra que el trabajo que estás haciendo está dando frutos. Recuerda que Bobby Fischer también luchó con la gestión del tiempo y el cálculo táctico en sus primeros años, cometiendo blunders similares en torneos importantes, pero desarrolló una disciplina mental férrea que lo llevó a convertirse en campeón mundial. Con entrenamiento consistente de 30-40 minutos diarios durante los próximos 3 meses, enfocado específicamente en las áreas que identificamos, podrás elevar tu precisión general del 44% actual a 52-55%, lo cual te colocaría en el top 25% de jugadores de tu nivel de rating. En tu próxima partida, recuerda este mantra: 'En cada posición crítica del medio juego, me tomaré 2 minutos completos para calcular no solo mi mejor jugada, sino también las 2 mejores respuestas de mi oponente. La paciencia táctica supera la intuición apresurada.'"

ANALISIS_DETALLADO:
Escribe un análisis PROFESIONAL y EXTENSO de 10-12 párrafos. Cada párrafo debe tener al menos 5-8 oraciones completas. Piensa en esto como un informe técnico profesional que el jugador va a estudiar en profundidad.

**Párrafo 1 - Visión General**: [5-8 oraciones sobre qué tipo de partida fue, factor decisivo, y qué aprender a nivel macro]

**Párrafo 2 - Apertura Detallada**: [5-8 oraciones evaluando desarrollo de piezas, control del centro, seguridad del rey, estructura de peones]

**Párrafo 3 - Transición Apertura-Medio Juego**: [5-8 oraciones analizando cómo se pasó al medio juego, si se completó desarrollo, si hubo plan claro]

**Párrafo 4 - Medio Juego Estratégico**: [5-8 oraciones sobre planificación estratégica, qué planes había, cuál elegiste, conceptos avanzados]

**Párrafo 5 - Medio Juego Táctico**: [5-8 oraciones examinando ejecución táctica, oportunidades aprovechadas o perdidas, motivos tácticos]

**Párrafo 6 - Gestión de Ventajas/Desventajas**: [5-8 oraciones sobre cómo se gestionó la ventaja o desventaja]

**Párrafo 7 - Final (si aplica)**: [5-8 oraciones sobre técnica en finales, principios aplicados]

**Párrafo 8 - Patrones de Errores Recurrentes**: [5-8 oraciones identificando errores que se repiten]

**Párrafo 9 - Comparación Histórica Profunda**: [5-8 oraciones comparando con últimas 10 partidas usando estadísticas]

**Párrafo 10 - Análisis Psicológico**: [5-8 oraciones sobre gestión emocional y mental]

**Párrafo 11 - Referencias a Partidas Maestras**: [5-8 oraciones conectando con partidas famosas]

**Párrafo 12 - Recomendación Estratégica Final**: [5-8 oraciones sobre el concepto clave que te llevará al siguiente nivel]`;
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
