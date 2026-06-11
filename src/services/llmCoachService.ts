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

**FORMATO DE RESPUESTA (ESTRICTO - MÁXIMA EXTENSIÓN Y PROFUNDIDAD):**

⚠️ REQUISITOS DE LONGITUD OBLIGATORIOS (SERÁ EVALUADO):
- RESUMEN: MÍNIMO 150 palabras (aproximadamente 8-10 líneas de texto)
- INSIGHTS_CLAVE: 5 insights, cada uno de MÍNIMO 80 palabras (4-5 líneas cada uno)
- PLAN_ENTRENAMIENTO: 5 ejercicios, cada uno de MÍNIMO 60 palabras (3-4 líneas cada uno)
- MENSAJE_MOTIVACIONAL: MÍNIMO 100 palabras (5-6 líneas)
- ANALISIS_DETALLADO: MÍNIMO 1200 palabras (12 párrafos de 100+ palabras cada uno)

TOTAL MÍNIMO: 2000 palabras. Si escribes menos, tu análisis será rechazado.

RESUMEN:
Escribe un resumen extenso de MÍNIMO 150 PALABRAS (8-10 líneas) sobre el rendimiento general. DEBE incluir TODOS estos puntos con GRAN DETALLE:
 - Evaluación técnica profunda de la partida (calidad posicional específica, decisiones tácticas concretas, ejemplos de movimientos con notación)
 - Análisis completo de la fase del juego más débil con explicación detallada de POR QUÉ fue débil y CÓMO impactó el resultado final
 - Comparación numérica detallada con el nivel histórico del jugador (porcentajes específicos, tendencias de últimas 10 partidas)
 - Un diagnóstico técnico completo del problema principal con razonamiento ajedrecístico sólido
 - Contexto general del estilo de juego del jugador (¿es táctico, posicional, agresivo, defensivo?)
 - Mención explícita de 2-3 fortalezas específicas observadas en esta partida con ejemplos de movimientos

INSIGHTS_CLAVE:
Escribe 5 insights extensos, CADA UNO de MÍNIMO 80 PALABRAS (4-5 líneas):

- [Insight 1 - Fase más débil (MÍNIMO 80 PALABRAS): Análisis técnico EXTREMADAMENTE PROFUNDO de la fase más débil. Identifica conceptos ajedrecísticos específicos con ejemplos concretos como "desarrollo incompleto de las piezas del flanco de dama, particularmente el alfil de c8 que permaneció bloqueado hasta el movimiento 15", "rey expuesto en h8 sin la protección adecuada del peón g7 que fue capturado prematuramente en el movimiento 10", "debilidad permanente en las casillas oscuras d6 y f6 que no pudieron ser controladas después de cambiar el alfil oscuro en el movimiento 12", "peones aislados en la columna d que fueron sistemáticamente atacados y debilitaron tu posición desde el movimiento 14 hasta el 18". Explica en DETALLE las CONSECUENCIAS específicas de cada problema: cómo afectaron el balance material, la seguridad del rey, el control del centro, etc.]

- [Insight 2 - Patrón táctico recurrente (MÍNIMO 80 PALABRAS): Identifica patrones tácticos o estratégicos recurrentes con MÚLTIPLES EJEMPLOS CONCRETOS. Menciona movimientos EXACTOS con notación donde se perdieron oportunidades tácticas cruciales. Por ejemplo: "En el movimiento 12, no viste la horquilla táctica con Cf5 que atacaba simultáneamente la torre en h4 y el peón de e7, lo cual te hubiera dado ventaja de calidad", "En el movimiento 16, perdiste un ataque doble con Dd5 que presionaba f7 y b7 simultáneamente". Explica con GRAN DETALLE QUÉ debiste haber visto en cada posición, CÓMO calcularlo paso a paso (variante principal + alternativas del oponente), y POR QUÉ estos motivos tácticos eran críticos en esas posiciones específicas. Menciona si hay un patrón: ¿tiendes a perder horquillas, clavadas, enfiladas, o ataques dobles con más frecuencia?]

- [Insight 3 - Comparación histórica (MÍNIMO 80 PALABRAS): Comparación EXTREMADAMENTE DETALLADA con tus partidas anteriores usando NÚMEROS ESPECÍFICOS y TENDENCIAS CLARAS. Ejemplos: "Tu precisión en la apertura fue del 52% en esta partida, lo cual representa una mejora del 15% comparado con tu promedio de 37% en las últimas 5 partidas. Esto indica que el trabajo en aperturas está dando frutos", "Sin embargo, tu precisión en el medio juego cayó a 38%, una regresión del 10% respecto a tu promedio de 48% en las últimas 10 partidas", "Tus blunders en esta partida (6) están por encima de tu promedio histórico de 4.2 blunders por partida". Identifica TENDENCIAS: ¿Estás mejorando consistentemente en alguna área? ¿Hay regresiones preocupantes? Proporciona contexto temporal: últimas 5 partidas vs. últimas 10 vs. últimas 20.]

- [Insight 4 - Momento crítico (MÍNIMO 80 PALABRAS): Identifica el movimiento EXACTO (con notación completa) donde se perdió o ganó la ventaja decisiva, y proporciona un análisis EXHAUSTIVO de ese momento. Ejemplo: "El movimiento 18. Bxd8?? fue el punto de inflexión CRÍTICO de esta partida. Antes de este movimiento, tenías una ventaja posicional de aproximadamente +0.8 según el análisis del motor. Después de Bxd8, la evaluación cayó a -2.3, una pérdida de 3.1 puntos de evaluación". Explica EN DETALLE qué debiste haber jugado en su lugar (por ejemplo: "18. Bd5 mantenía la presión en el centro y conservaba tu ventaja"), POR QUÉ era objetivamente mejor (análisis de la variante: "después de 18. Bd5 Qe7 19. Nf4 tu posición dominaba el centro con piezas activas"), y CÓMO hubiera cambiado completamente el curso de la partida ("con Bd5, mantenías iniciativa y presión duradera, mientras que con Bxd8 entregaste el control del centro y permitiste que tu oponente activara su torre en la columna d").]

- [Insight 5 - Psicología y gestión mental (MÍNIMO 80 PALABRAS): Análisis PROFUNDO de las decisiones psicológicas y la gestión del tiempo mental durante la partida. ¿Hubo señales de que jugaste apresurado en ciertos momentos críticos? Analiza: "Los movimientos 14-18 muestran un patrón de decisiones apresuradas: 4 imprecisiones consecutivas sugieren fatiga mental o presión de tiempo. Es probable que no calculaste con suficiente profundidad en esta fase". ¿Hubo signos de "tilting" (jugar peor después de un error)? "Después del blunder en el movimiento 12, tus siguientes 3 movimientos fueron todos imprecisiones, lo cual sugiere que el error afectó tu confianza y concentración". ¿En qué fase del juego tiendes a cometer más errores por fatiga mental? Proporciona recomendaciones específicas: "Considera tomar 10-15 segundos extra en posiciones críticas del medio juego para evitar decisiones impulsivas".]

PLAN_ENTRENAMIENTO:
Escribe 5 ejercicios de entrenamiento extensos, CADA UNO de MÍNIMO 60 PALABRAS (3-4 líneas):

- [Ejercicio 1 - Debilidad principal (MÍNIMO 60 PALABRAS): ESPECÍFICO, MEDIBLE y ACCIONABLE para tu debilidad más crítica. NO escribas frases genéricas como "practica táctica" o "estudia finales". En su lugar: "Resolver 30 puzzles tácticos de medio juego en Chess.com o Lichess en el rango de dificultad 1300-1500, enfocándote EXCLUSIVAMENTE en motivos de horquillas y ataques dobles. Objetivo medible: alcanzar 80% de precisión en estos puzzles dentro de 2 semanas. Dedica 15 minutos diarios, registra tu progreso en una hoja de cálculo, y repite los puzzles que falles hasta dominarlos completamente".]

- [Ejercicio 2 - Estudio teórico (MÍNIMO 60 PALABRAS): Estudio teórico CONCRETO con recursos específicos y objetivos claros. Ejemplo: "Estudiar los primeros 10 movimientos de la Defensa Siciliana Najdorf usando el curso interactivo de ChessBase o videos de Gotham Chess. Enfócate en entender los planes típicos de ambos bandos: ruptura con b5 y d5 para las negras, presión en d5 y ataque en el flanco de rey para las blancas. Identifica las casillas críticas d5 y d6, y aprende 3 variantes principales: variante del veneno, ataque inglés, y sistema Sozin. Objetivo: poder jugar los primeros 10 movimientos de memoria con confianza en 1 semana".]

- [Ejercicio 3 - Cálculo y visualización (MÍNIMO 60 PALABRAS): Entrenamiento estructurado de cálculo de variantes y visualización sin mover piezas. "Practicar cálculo de variantes a 4-5 movimientos de profundidad sin mover piezas físicamente usando el método de los 'círculos de la visión': primero calcula la variante principal (tu mejor jugada + la mejor respuesta del oponente), luego calcula 2-3 variantes alternativas del oponente, y finalmente verifica con el análisis del motor. Dedica 15 minutos diarios durante 3 semanas usando posiciones de medio juego de tu nivel en Lichess Studies. Registra cuántas variantes calculaste correctamente vs. incorrectamente para medir tu progreso".]

- [Ejercicio 4 - Partidas maestras (MÍNIMO 60 PALABRAS): Revisión de partidas de Grandes Maestros con objetivos de aprendizaje ESPECÍFICOS. "Analizar 3 partidas completas de Anatoly Karpov sobre finales de torres, específicamente el tipo de final Torre + 3 peones vs Torre + 3 peones en estructuras con peones pasados. Busca estas partidas en ChessBase o en Lichess Studies. Para cada partida, anota en un cuaderno los 5 principios más importantes que observes: actividad del rey, creación de peones pasados, torre detrás del peón pasado, corte del rey enemigo, técnica de Lucena o Philidor. Objetivo: poder aplicar estos principios en tus propias partidas en los próximos 7 días".]

- [Ejercicio 5 - Práctica deliberada (MÍNIMO 60 PALABRAS): Práctica de partidas orientada con restricciones específicas para mejorar áreas débiles. "Jugar 5 partidas de ajedrez en Lichess o Chess.com con tiempo de control 15+10 (15 minutos iniciales + 10 segundos de incremento por movimiento). Durante estas partidas, OBLÍGATE a gastar AL MENOS 2-3 minutos en cada movimiento crítico del medio juego (cuando hay tensión táctica o decisiones estratégicas importantes). Grábate pensando en voz alta usando una aplicación de grabación de voz para identificar fallas en tu proceso de pensamiento. Después de cada partida, revisa la grabación y el análisis del motor para detectar dónde tu cálculo falló".]

MENSAJE_MOTIVACIONAL:
Escribe un mensaje motivacional extenso de MÍNIMO 100 PALABRAS (5-6 líneas) que sea ESPECÍFICO e INSPIRADOR:

[Incluye TODO lo siguiente en 100+ PALABRAS:
 - Reconoce DOS logros técnicos CONCRETOS de esta partida con notación exacta (no frases genéricas como "jugaste bien", sino detalles como "tu movimiento 8. e3 fue excelente porque controló la casilla d4 y preparó el desarrollo de tu alfil de dama, siguiendo principios sólidos de apertura")
 - Conecta el esfuerzo actual con progreso medible y verificable a largo plazo con números específicos (ej: "Has mejorado tu precisión en aperturas un 12% en el último mes, pasando de 35% a 47%, lo cual es un progreso tangible y estadísticamente significativo")
 - Menciona una referencia inspiradora a un Gran Maestro que también enfrentó desafíos similares en su carrera y los superó con trabajo dedicado (ej: "Recuerda que Bobby Fischer también luchó con la gestión del tiempo en sus primeros años, cometiendo errores similares en el Campeonato de EE.UU. de 1958, pero desarrolló disciplina mental que lo llevó a la cima mundial")
 - Proporciona una perspectiva realista de mejora a 3-6 meses (ej: "Con entrenamiento consistente de 30 minutos diarios durante los próximos 3 meses, podrás elevar tu precisión general del 44% actual a 55-60%, lo cual te colocaría en el top 30% de jugadores de tu nivel")
 - Termina con una frase memorable y poderosa que el jugador pueda recordar en su próxima partida como mantra mental (ej: "En tu próxima partida, recuerda: 'Cada movimiento crítico merece 2 minutos de cálculo profundo. La paciencia táctica supera la intuición apresurada'.")]

ANALISIS_DETALLADO:
Escribe un análisis PROFESIONAL y EXTENSO de MÍNIMO 1200 PALABRAS distribuidas en 12 párrafos (cada párrafo de MÍNIMO 100 PALABRAS o 5-6 oraciones EXTENSAS). Estructura OBLIGATORIA:

[Cada párrafo debe tener 100+ palabras con análisis profundo y técnico. NO uses párrafos cortos.]

**Párrafo 1 - Visión General de la Partida (MÍNIMO 100 palabras)**: [Comienza con una evaluación holística y completa. ¿Qué tipo de partida fue desde el punto de vista estratégico? (posicional vs. táctica, equilibrada vs. desequilibrada, gambito vs. apertura cerrada). ¿Cuál fue el factor decisivo que determinó el resultado final? (superioridad táctica, mejor final, error grave en el medio juego). ¿Qué podemos aprender de ella a nivel macro sobre tu estilo de juego y áreas de crecimiento? Menciona la dinámica general: quién tuvo la iniciativa, cómo cambió la evaluación a lo largo de la partida, y qué fase fue determinante.]

**Párrafo 2 - Apertura Detallada (MÍNIMO 100 palabras)**: [Evalúa EXHAUSTIVAMENTE cada aspecto de la apertura con análisis movimiento por movimiento de los primeros 8-10 movimientos: desarrollo de piezas (¿se desarrollaron los caballos antes que los alfiles siguiendo principios clásicos?), control del centro (¿se controló e4-d4 o se optó por un fianchetto?), seguridad del rey (¿enroque temprano en el movimiento 6-8 o se retrasó peligrosamente?), estructura de peones inicial (¿cadenas de peones, peones aislados, mayoría en el flanco de dama?). Identifica desviaciones específicas de principios teóricos con ejemplos concretos: "El movimiento 4. Bg5 antes de 4. Nf3 violó el principio fundamental de desarrollar caballos antes de alfiles, lo cual permitió a tu oponente jugar 4...d6 con tempo". Menciona si la apertura te llevó a una posición favorable, equilibrada, o desfavorable.]

**Párrafo 3 - Transición Apertura-Medio Juego (MÍNIMO 100 palabras)**: [Analiza en PROFUNDIDAD cómo se realizó la transición crítica de la apertura al medio juego. ¿Se completó el desarrollo de todas las piezas (8 piezas menores + torres conectadas) antes de iniciar acciones tácticas? ¿Se formuló un plan estratégico claro basado en la estructura de peones resultante? ¿Hubo rupturas temáticas (e5, d5, c5, f5, b5) que debieron jugarse y no se ejecutaron? Analiza movimientos específicos en el rango 10-15 donde la transición ocurre: "En el movimiento 12, en lugar de jugar Nf4 atacando el centro, jugaste Nd7 pasivamente, lo cual permitió a tu oponente consolidar su control de d5 con c4 en el siguiente movimiento".]

**Párrafo 4 - Medio Juego Estratégico (MÍNIMO 100 palabras)**: [Analiza la planificación estratégica de forma EXHAUSTIVA. ¿Qué planes había disponibles según la estructura de peones y posición de piezas? ¿Cuál elegiste y por qué? ¿Fue correcto o incorrecto según principios estratégicos? Menciona conceptos ajedrecísticos avanzados como: mayoría de peones en el flanco de dama, parejas de alfiles en posiciones abiertas, piezas mal ubicadas o "malas" (como un alfil bloqueado por sus propios peones), casillas débiles crónicas (como d5 o f5), columnas abiertas para torres, control de la séptima fila. Proporciona ejemplos concretos: "Tu plan de atacar en el flanco de rey con g4-g5 fue estratégicamente erróneo porque tu rey estaba enrocado en ese sector y el ataque era demasiado lento, mientras que tu oponente tenía mayoría de peones en el flanco de dama que podía avanzar rápidamente con b5-b4-b3".]

**Párrafo 5 - Medio Juego Táctico (MÍNIMO 100 palabras)**: [Examina la ejecución táctica con GRAN DETALLE. ¿Se identificaron TODAS las tácticas disponibles en las posiciones críticas? Lista 2-3 oportunidades tácticas concretas (con notación algebraica completa) que se aprovecharon exitosamente o se perdieron lamentablemente. Explica los MOTIVOS TÁCTICOS presentes en cada posición: horquilla (ataque doble con caballo o peón), clavada (pieza inmovilizada que protege otra más valiosa), enfilada (ataque que obliga a mover una pieza y revela otra), ataque doble (amenazar dos piezas simultáneamente), sacrificio posicional (entregar material por ventaja duradera). Ejemplo: "En el movimiento 16, había una clavada táctica disponible con Bg5 que inmovilizaba el caballo de f6 porque detrás estaba la dama de d8. No ver esta táctica te costó la posibilidad de ganar un peón importante en e5 dos movimientos después".]

**Párrafo 6 - Gestión de Ventajas/Desventajas (MÍNIMO 100 palabras)**: [Analiza METICULOSAMENTE cómo se gestionaron las ventajas materiales, posicionales o de tiempo durante la partida. Si tenías ventaja material (pieza de más o peones extra), ¿la simplificaste correctamente mediante intercambios favorables siguiendo el principio "cuando tienes ventaja material, cambia piezas pero no peones"? Si tenías ventaja posicional (mejor desarrollo, rey más seguro, piezas más activas), ¿mantuviste la tensión y presión o liberaste la posición prematuramente? Si estabas peor material o posicionalmente, ¿buscaste activamente complicaciones tácticas y desequilibrios o te defendiste pasivamente esperando el error del oponente? Proporciona ejemplos concretos de decisiones correctas o incorrectas en este aspecto: "En el movimiento 20, cuando tenías una pieza de ventaja, el cambio de damas con Qxd5 fue correcto porque simplificó hacia un final ganador, mientras que mantener damas en el tablero habría dado a tu oponente chances de contrajuego táctico".]

**Párrafo 7 - Final (MÍNIMO 100 palabras, si no aplica fusiona con párrafo anterior)**: [Si la partida llegó a un final técnico, analiza la técnica de finales con DETALLES PRECISOS. ¿Se aplicaron correctamente principios teóricos conocidos de finales? Principios como: torre detrás de peones pasados (de Tarrasch), activación prioritaria del rey en finales de peones y torres, creación de peones pasados distantes, técnica de oposición en finales de peones, regla del cuadrado para calcular si el rey alcanza un peón, técnica de Lucena o posición de Philidor en finales de torres. ¿Hubo errores de conversión que permitieron al oponente defender una posición teóricamente perdida? Compara con finales teóricos similares: "Este final de torre + 3 peones vs torre + 3 peones es similar al final que Capablanca ganó contra Tartakower en Nueva York 1924, donde la actividad del rey fue decisiva. En tu caso, jugaste 28. Kf2?? pasivamente, cuando 28. Kd4! centralizando el rey hubiera forzado la victoria en 10 movimientos".]

**Párrafo 8 - Patrones de Errores Recurrentes (MÍNIMO 100 palabras)**: [Identifica 3-4 errores o debilidades que SE REPITEN sistemáticamente en múltiples partidas de tu historial (basado en tus últimas 10-15 partidas). Proporciona ejemplos ESPECÍFICOS con notación: "Existe un patrón claro en tus últimas 8 partidas donde tiendes a cambiar piezas prematuramente cuando tienes ventaja espacial, como se observó en los movimientos 14. Nxf6 y 18. Bxd7 de esta partida, lo cual liberó la posición y permitió al oponente igualar", "Calculas incorrectamente secuencias de capturas forzadas, especialmente cuando hay clavadas o enfiladas involucradas, como se vio en los movimientos 12 y 19 donde subestimaste las consecuencias de las capturas en d6", "Sueles desarrollar tus piezas del flanco de dama demasiado lentamente (movimiento 15+), lo cual te deja con piezas pasivas durante la fase crítica del medio juego". Estos patrones son CRUCIALES para enfocar tu entrenamiento.]

**Párrafo 9 - Comparación Histórica Profunda (MÍNIMO 100 palabras)**: [Compara esta partida EXHAUSTIVAMENTE con el promedio de tus últimas 10 partidas usando ESTADÍSTICAS CONCRETAS y NÚMEROS VERIFICABLES. Menciona datos específicos: precisión promedio general (esta partida vs. promedio histórico), blunders promedio (esta partida vs. promedio de últimas 10), errores promedio, imprecisiones promedio, fase más débil históricamente (¿siempre es el medio juego o varía?). ¿En qué área específica mejoraste objetivamente? Ejemplo: "Tu precisión en la apertura de esta partida (52%) es significativamente superior a tu promedio histórico de 38% en las últimas 10 partidas, un incremento del 14% que indica mejora clara". ¿Dónde retrocediste? "Sin embargo, tu precisión en el medio juego cayó a 35%, 13 puntos por debajo de tu promedio de 48%". ¿Hay una TENDENCIA clara alcista o bajista en tu progreso? "Analizando tus últimas 15 partidas, hay una tendencia alcista en la apertura (+2% por semana) pero estancamiento en finales".]

**Párrafo 10 - Análisis Psicológico (MÍNIMO 100 palabras)**: [Analiza PROFUNDAMENTE la gestión emocional y psicológica durante la partida. ¿Cómo fue tu estado mental en diferentes fases? ¿Jugaste apresurado o ansioso después de cometer un error grave, lo cual llevó a errores en cascada? Proporciona evidencia: "Los movimientos 13-17 muestran un patrón claro de decisiones apresuradas: después del blunder en el movimiento 12, tus siguientes 4 movimientos fueron imprecisiones o errores, lo cual sugiere que el error impactó negativamente tu confianza y concentración. Este fenómeno se llama 'tilting' en el ajedrez competitivo". ¿Mostraste resiliencia mental en posiciones difíciles o te rendiste psicológicamente? ¿Hubo signos de fatiga mental en cierta fase de la partida (errores agrupados en los movimientos 20-25)? Proporciona recomendaciones mentales: "Practica técnicas de reseteo mental después de errores: toma 10 segundos, respira profundamente, y enfócate en la posición actual en lugar de lamentar el error pasado".]

**Párrafo 11 - Referencias a Partidas Maestras (MÍNIMO 100 palabras)**: [Conecta esta partida con partidas famosas de la historia del ajedrez para proporcionar CONTEXTO EDUCATIVO y REFERENCIAS INSPIRADORAS. Busca similitudes en estructura de peones, planes estratégicos, o tácticas. Ejemplo: "Tu estructura de peones en la apertura (peones en d4, e3, c3 con cadena central) es muy similar a la que Bobby Fischer empleó contra Boris Spassky en la partida 6 del Campeonato Mundial de 1972, donde Fischer aplicó el plan estratégico de ruptura con e3-e4 en el momento oportuno para liberar su alfil de c1 y obtener ventaja espacial. En tu caso, jugaste e4 demasiado pronto en el movimiento 10, cuando aún no habías completado tu desarrollo". Menciona qué puedes aprender de esas partidas maestras: "Estudiar las partidas de Karpov sobre la gestión de ventajas mínimas te ayudaría a entender cómo convertir posiciones ligeramente mejores en victorias técnicas, en lugar de permitir que el oponente se defienda como sucedió en el movimiento 22".]

**Párrafo 12 - Recomendación Estratégica para el Siguiente Nivel (MÍNIMO 100 palabras)**: [Proporciona un consejo maestro ESPECÍFICO, TÉCNICO y ACCIONABLE sobre cuál es el ÚNICO concepto que, si dominas, te llevaría directamente al siguiente nivel de juego. Sé muy específico: no digas "mejora tu táctica", sino identifica EXACTAMENTE qué área técnica es tu cuello de botella. Ejemplo: "Tu próximo salto de nivel (de 1300 a 1500 ELO aproximadamente) vendrá de dominar un concepto específico: la evaluación posicional de finales de torres. Actualmente, tus finales de torres muestran imprecisión técnica en 7 de tus últimas 10 partidas. Específicamente, necesitas aprender a crear peones pasados distantes (un peón pasado lejos del rey enemigo), usar la actividad del rey como criterio principal de evaluación (rey activo vale aproximadamente 1.5 peones de ventaja), y aplicar la técnica de Lucena y la posición de Philidor en finales teóricos. Dominar estos 3 conceptos en los próximos 2 meses te permitirá ganar al menos 5 partidas más por mes que actualmente pierdes o empatas por imprecisión técnica en finales".]

]`;
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
