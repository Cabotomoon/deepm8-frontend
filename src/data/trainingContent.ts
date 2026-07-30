/**
 * Training Content Database
 *
 * Progressive theory lessons + comprehension questions per category.
 * Content is organized ONCE per category and reused by any module/
 * recommendation that shares that category (no duplication).
 *
 * Each lesson is a small block (intro → fundamentals → common errors →
 * principles → example position → best-move explanation → summary),
 * followed by A/B/C/D comprehension questions that test understanding
 * (not memorization) and explain WHY the answer is correct.
 */

import type { TrainingCategory, TrainingLesson } from '../types/training.types';

const openingsLessons: TrainingLesson[] = [
  {
    id: 'open-l1',
    title: 'Introducción: el propósito de la apertura',
    blocks: [
      'La apertura no consiste en dar jaque mate rápido, sino en preparar el resto de la partida.',
      'Tienes tres objetivos claros: controlar el centro, desarrollar tus piezas y poner al rey a salvo.',
      'Piensa en la apertura como montar el escenario antes de la acción: cuanto mejor coloques tus piezas, más fácil será todo después.'
    ],
    exampleFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    exampleCaption: 'Posición inicial: ninguna pieza desarrollada todavía.',
    questions: [
      {
        id: 'open-l1-q1',
        question: '¿Cuál es el objetivo REAL de la apertura?',
        options: [
          'Dar jaque mate lo antes posible',
          'Preparar la partida: centro, desarrollo y seguridad del rey',
          'Capturar el máximo de peones',
          'Sacar la dama para atacar'
        ],
        correctAnswer: 1,
        explanation: 'La apertura prepara el medio juego. Buscar mate inmediato suele exponer tus propias piezas. Con centro, desarrollo y rey seguro tendrás mejores posibilidades después.'
      }
    ]
  },
  {
    id: 'open-l2',
    title: 'Fundamentos: controla el centro',
    blocks: [
      'Las casillas centrales (e4, d4, e5, d5) son las más valiosas: desde el centro tus piezas alcanzan más casillas.',
      'Un caballo en el centro controla hasta 8 casillas; en una esquina, solo 2.',
      'Ocupar el centro con un peón (e4 o d4) abre líneas para tus alfiles y tu dama.'
    ],
    exampleFen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2',
    exampleCaption: 'Ambos bandos disputan el centro con peones en e4 y e5.',
    questions: [
      {
        id: 'open-l2-q1',
        question: '¿Por qué es tan importante el centro?',
        options: [
          'Porque las piezas centrales controlan más casillas y tienen más movilidad',
          'Porque ahí no te pueden capturar',
          'Porque es donde empieza el rey',
          'No tiene importancia real'
        ],
        correctAnswer: 0,
        explanation: 'Desde el centro una pieza irradia su influencia en todas direcciones. Una pieza centralizada es mucho más activa que una en el borde.'
      },
      {
        id: 'open-l2-q2',
        question: 'Un caballo colocado en el centro del tablero controla aproximadamente...',
        options: ['2 casillas', '4 casillas', '8 casillas', '12 casillas'],
        correctAnswer: 2,
        explanation: 'Un caballo central alcanza 8 casillas; en la esquina solo 2. Por eso decimos "caballo al borde, caballo cobarde".'
      }
    ]
  },
  {
    id: 'open-l3',
    title: 'Errores comunes y principios de desarrollo',
    blocks: [
      'Error 1: mover la misma pieza varias veces en la apertura. Pierdes tiempo mientras el rival desarrolla.',
      'Error 2: sacar la dama demasiado pronto. El rival la ataca con piezas menores y gana desarrollo.',
      'Principio: desarrolla primero caballos y alfiles, luego enroca, y conecta las torres al final.',
      'Regla práctica: intenta mover cada pieza menor una vez antes de mover dos veces la misma.'
    ],
    exampleFen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
    exampleCaption: 'Cf3 desarrolla una pieza y ataca e5: desarrollo con propósito.',
    questions: [
      {
        id: 'open-l3-q1',
        question: '¿Por qué es malo sacar la dama muy temprano?',
        options: [
          'Porque la dama es débil',
          'Porque el rival la ataca con piezas menores y gana desarrollo con tempo',
          'Porque no puede capturar',
          'Porque el reglamento lo prohíbe'
        ],
        correctAnswer: 1,
        explanation: 'Cada vez que el rival ataca tu dama, tú la mueves para salvarla mientras él desarrolla una pieza gratis. Así pierdes tiempo (tempo).'
      },
      {
        id: 'open-l3-q2',
        question: 'Has desarrollado tus caballos y alfiles. ¿Qué suele ser lo siguiente?',
        options: [
          'Enrocar para poner el rey a salvo',
          'Avanzar todos los peones del flanco',
          'Sacar la dama al centro',
          'Mover el mismo caballo otra vez'
        ],
        correctAnswer: 0,
        explanation: 'Tras desarrollar piezas menores, enrocar protege al rey y activa la torre. Es el orden natural: desarrollo → enroque → conectar torres.'
      }
    ]
  },
  {
    id: 'open-l4',
    title: 'Resumen: tu checklist de apertura',
    blocks: [
      '1) Ocupa o disputa el centro con un peón.',
      '2) Desarrolla caballos antes que alfiles cuando sea posible.',
      '3) Enroca pronto (normalmente antes de la jugada 10).',
      '4) No muevas la misma pieza dos veces sin motivo.',
      '5) No saques la dama demasiado pronto.',
      'Si sigues esta lista, saldrás de la apertura con una posición sana en la mayoría de partidas.'
    ],
    questions: [
      {
        id: 'open-l4-q1',
        question: 'Según el checklist, ¿cuándo deberías enrocar habitualmente?',
        options: [
          'En el final',
          'Pronto, tras desarrollar piezas menores (normalmente antes de la jugada 10)',
          'Solo si te dan jaque',
          'Nunca, es peligroso'
        ],
        correctAnswer: 1,
        explanation: 'Enrocar pronto pone al rey a salvo y conecta una torre al juego. Retrasarlo suele dejar al rey atrapado en el centro.'
      }
    ]
  }
];

const tacticsLessons: TrainingLesson[] = [
  {
    id: 'tact-l1',
    title: 'Introducción: qué es una táctica',
    blocks: [
      'Una táctica es una secuencia forzada de jugadas que gana material o da mate.',
      'A diferencia de la estrategia (planes a largo plazo), la táctica se calcula con precisión, jugada a jugada.',
      'La regla de oro para buscar tácticas: revisa siempre jaques, capturas y amenazas, en ese orden.'
    ],
    questions: [
      {
        id: 'tact-l1-q1',
        question: 'Al buscar una táctica, ¿qué debes revisar primero?',
        options: [
          'Jaques, capturas y amenazas',
          'Solo movimientos de peón',
          'Mover el rey a un rincón',
          'Ofrecer tablas'
        ],
        correctAnswer: 0,
        explanation: 'El orden "jaques, capturas, amenazas" te asegura no pasar por alto las jugadas más fuertes y forzadas de la posición.'
      }
    ]
  },
  {
    id: 'tact-l2',
    title: 'La clavada',
    blocks: [
      'Una clavada inmoviliza una pieza porque, si se mueve, expondría a otra más valiosa detrás.',
      'Clavada absoluta: la pieza no puede moverse legalmente (detrás está el rey).',
      'Clavada relativa: la pieza puede moverse, pero perderías material si lo hace.',
      'Idea clave: una pieza clavada es una pieza débil; añade atacantes sobre ella.'
    ],
    exampleFen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 5',
    exampleCaption: 'Motivos de clavada aparecen cuando piezas quedan en la misma línea que el rey o la dama.',
    questions: [
      {
        id: 'tact-l2-q1',
        question: '¿Qué es una clavada?',
        options: [
          'Atacar al rey directamente',
          'Inmovilizar una pieza porque detrás hay otra más valiosa',
          'Cambiar dos piezas iguales',
          'Coronar un peón'
        ],
        correctAnswer: 1,
        explanation: 'En una clavada, mover la pieza clavada dejaría expuesta una pieza superior (o el rey), así que en la práctica queda paralizada.'
      },
      {
        id: 'tact-l2-q2',
        question: 'Tienes una pieza rival clavada contra su rey. ¿Cuál es una buena idea?',
        options: [
          'Ignorarla',
          'Añadir más atacantes sobre esa pieza clavada',
          'Cambiar tu dama por ella de inmediato',
          'Ofrecer tablas'
        ],
        correctAnswer: 1,
        explanation: 'Como la pieza clavada no puede huir, acumular atacantes sobre ella suele permitir ganarla por acumulación de presión.'
      }
    ]
  },
  {
    id: 'tact-l3',
    title: 'Horquilla y enfilada',
    blocks: [
      'Horquilla: una sola pieza ataca dos o más objetivos a la vez. El caballo es el rey de las horquillas.',
      'Enfilada: atacas una pieza valiosa y, al moverse, capturas la que estaba detrás (es la clavada "al revés").',
      'Error común: dejar el rey y la dama en la misma diagonal o fila, invitando a enfiladas.',
      'Antes de mover, pregúntate: ¿mis piezas quedan alineadas para una horquilla o enfilada rival?'
    ],
    exampleFen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/1PB1P3/5N2/P1PP1PPP/RNBQK2R b KQkq b3 0 5',
    exampleCaption: 'Piezas alineadas en la misma diagonal permiten motivos de enfilada.',
    questions: [
      {
        id: 'tact-l3-q1',
        question: '¿Cuál es la diferencia entre horquilla y enfilada?',
        options: [
          'Son lo mismo',
          'La horquilla ataca dos piezas a la vez; la enfilada ataca una y captura la de detrás',
          'La enfilada solo la hace el peón',
          'La horquilla solo da tablas'
        ],
        correctAnswer: 1,
        explanation: 'En la horquilla una pieza amenaza dos objetivos simultáneamente. En la enfilada, la pieza delantera se mueve y expone otra detrás que capturas.'
      },
      {
        id: 'tact-l3-q2',
        question: '¿Qué pieza es especialmente peligrosa para las horquillas?',
        options: ['El peón', 'El caballo', 'La torre', 'El alfil'],
        correctAnswer: 1,
        explanation: 'El caballo salta y ataca casillas que otras piezas no defienden entre sí, por lo que hace horquillas devastadoras, incluso al rey y la dama.'
      }
    ]
  },
  {
    id: 'tact-l4',
    title: 'Resumen: método para no fallar tácticas',
    blocks: [
      'En cada turno revisa: 1) ¿hay jaques?, 2) ¿hay capturas?, 3) ¿qué amenaza el rival?',
      'Localiza piezas sin defender (tuyas y del rival): son el objetivo natural de las tácticas.',
      'Detecta alineaciones peligrosas (clavadas, enfiladas) y patrones de horquilla.',
      'Calcula hasta el final las jugadas forzadas antes de ejecutar.'
    ],
    questions: [
      {
        id: 'tact-l4-q1',
        question: 'Una pieza rival está sin defender. ¿Qué deberías buscar?',
        options: [
          'Una jugada que la ataque o cree una doble amenaza',
          'Cambiar peones en el otro flanco',
          'Enrocar de nuevo',
          'Nada, no es relevante'
        ],
        correctAnswer: 0,
        explanation: 'Las piezas sin defensa son objetivos de tácticas: horquillas, ataques dobles y clavadas suelen aprovechar precisamente esa falta de defensa.'
      }
    ]
  }
];

const endgamesLessons: TrainingLesson[] = [
  {
    id: 'end-l1',
    title: 'Introducción: el rey despierta',
    blocks: [
      'En el final quedan pocas piezas y el rey deja de ser una pieza a proteger para convertirse en un atacante.',
      'Un rey activo en el centro puede valer tanto como una pieza menor.',
      'Regla básica: en el final, activa tu rey y llévalo hacia la acción.'
    ],
    exampleFen: '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1',
    exampleCaption: 'Con pocas piezas, el rey debe adelantarse para apoyar al peón.',
    questions: [
      {
        id: 'end-l1-q1',
        question: 'En el final, ¿cómo cambia el papel del rey?',
        options: [
          'Debe esconderse en la esquina',
          'Se convierte en una pieza activa y debe adelantarse',
          'No puede moverse',
          'Solo sirve para dar tablas'
        ],
        correctAnswer: 1,
        explanation: 'Sin damas ni muchas piezas, el rey corre poco peligro de mate y su actividad es decisiva para apoyar peones y atacar los del rival.'
      }
    ]
  },
  {
    id: 'end-l2',
    title: 'La oposición',
    blocks: [
      'La oposición se da cuando los reyes están enfrentados con una sola casilla entre ellos.',
      'Tener la oposición (que el rival mueva) suele permitirte avanzar o impedir el paso del rey rival.',
      'En finales de rey y peón contra rey, la oposición decide entre ganar y hacer tablas.',
      'Idea práctica: no avances el peón demasiado pronto; primero coloca tu rey delante.'
    ],
    exampleFen: '8/8/8/3k4/8/3K4/3P4/8 w - - 0 1',
    exampleCaption: 'El rey blanco debe adelantarse al peón y buscar la oposición.',
    questions: [
      {
        id: 'end-l2-q1',
        question: '¿Qué es la oposición?',
        options: [
          'Dos reyes enfrentados con una casilla de separación',
          'Dos peones bloqueados',
          'Una torre atacando al rey',
          'El enroque largo'
        ],
        correctAnswer: 0,
        explanation: 'Cuando los reyes se enfrentan con una casilla en medio y le toca mover al rival, tú "tienes la oposición" y controlas las casillas clave.'
      },
      {
        id: 'end-l2-q2',
        question: 'En un final de rey y peón, ¿qué conviene hacer normalmente primero?',
        options: [
          'Empujar el peón lo más rápido posible',
          'Colocar el rey delante del peón antes de avanzarlo',
          'Dejar el rey atrás',
          'Dar jaques con el peón'
        ],
        correctAnswer: 1,
        explanation: 'Si el rey va delante del peón controla las casillas de avance. Empujar el peón sin apoyo del rey suele terminar en tablas.'
      }
    ]
  },
  {
    id: 'end-l3',
    title: 'Peones pasados y finales de torre',
    blocks: [
      'Un peón pasado no tiene peones rivales que le impidan coronar: es un arma poderosa.',
      '"Un peón pasado debe ser empujado": crea amenazas de coronación que atan las piezas rivales.',
      'Finales de torre: la regla más famosa es colocar la torre DETRÁS del peón pasado (propio o rival).',
      'Mantén tu torre activa; una torre pasiva defendiendo suele perder el final.'
    ],
    exampleFen: '8/8/8/8/8/2k5/2P5/2K5 w - - 0 1',
    exampleCaption: 'Cuidado con el ahogado al empujar un peón con el rey rival delante.',
    questions: [
      {
        id: 'end-l3-q1',
        question: 'En finales de torre, ¿dónde suele ir mejor la torre respecto a un peón pasado?',
        options: [
          'Delante del peón',
          'Detrás del peón',
          'En la esquina',
          'Al lado del rey'
        ],
        correctAnswer: 1,
        explanation: 'La torre detrás del peón pasado gana movilidad a medida que el peón avanza, mientras que delante estorba su propio avance.'
      },
      {
        id: 'end-l3-q2',
        question: '¿Por qué es fuerte un peón pasado?',
        options: [
          'Porque no puede ser capturado nunca',
          'Porque amenaza coronar y obliga al rival a gastar piezas en frenarlo',
          'Porque vale como una torre',
          'Porque da jaque'
        ],
        correctAnswer: 1,
        explanation: 'La amenaza de coronación ata piezas rivales a la defensa, dándote ventaja en otras zonas del tablero.'
      }
    ]
  },
  {
    id: 'end-l4',
    title: 'Resumen: principios de finales',
    blocks: [
      '1) Activa tu rey y llévalo al centro o hacia los peones.',
      '2) Aprende la oposición: es la llave de los finales de peones.',
      '3) Coloca tu rey delante de tu peón antes de avanzarlo.',
      '4) En finales de torre, torre detrás del peón pasado y mantenla activa.',
      '5) Empuja tus peones pasados para crear amenazas.'
    ],
    questions: [
      {
        id: 'end-l4-q1',
        question: '¿Cuál de estos es un principio correcto de finales?',
        options: [
          'Mantén el rey escondido en la esquina',
          'Activa el rey y úsalo como pieza de ataque',
          'Nunca avances peones',
          'Cambia siempre tu torre'
        ],
        correctAnswer: 1,
        explanation: 'La actividad del rey es el principio central del final. Un rey pasivo desperdicia el recurso más importante de la fase final.'
      }
    ]
  }
];

const middlegameLessons: TrainingLesson[] = [
  {
    id: 'mid-l1',
    title: 'Introducción: pensar con planes',
    blocks: [
      'El medio juego es donde se ejecutan los planes: no basta con hacer "buenas jugadas" sueltas.',
      'Un plan es una secuencia de jugadas con un objetivo concreto (atacar el rey, ganar una casilla, mejorar una pieza).',
      'Antes de calcular, evalúa la posición: material, seguridad de los reyes, estructura de peones y actividad de piezas.'
    ],
    questions: [
      {
        id: 'mid-l1-q1',
        question: '¿Qué es un plan en ajedrez?',
        options: [
          'Mover rápido sin pensar',
          'Una secuencia de jugadas con un objetivo concreto',
          'Cambiar todas las piezas',
          'Repetir jugadas para tablas'
        ],
        correctAnswer: 1,
        explanation: 'Un plan da coherencia a tus jugadas. Sin plan, las piezas trabajan sin rumbo; con plan, colaboran hacia un objetivo.'
      }
    ]
  },
  {
    id: 'mid-l2',
    title: 'Mejora tu peor pieza',
    blocks: [
      'Regla práctica de Makogónov: identifica tu pieza peor colocada y mejórala.',
      'Una posición mejora cuando todas tus piezas participan; una pieza inactiva es como jugar con menos material.',
      'Pregúntate cada turno: ¿cuál es mi peor pieza y a qué casilla mejor podría ir?'
    ],
    exampleFen: 'r2qr1k1/ppp2ppp/2n2n2/3p4/1b1P4/2NBPN2/PP3PPP/R1BQR1K1 w - - 0 11',
    exampleCaption: 'Buscar la casilla ideal para el alfil de c1 activa una pieza pasiva.',
    questions: [
      {
        id: 'mid-l2-q1',
        question: 'Tienes un alfil bloqueado y pasivo. Según los principios, ¿qué conviene?',
        options: [
          'Ignorarlo y atacar con las demás piezas',
          'Buscar un plan para reubicarlo en una casilla activa',
          'Cambiarlo siempre por un peón',
          'Dejarlo donde está el resto de la partida'
        ],
        correctAnswer: 1,
        explanation: 'Mejorar tu peor pieza aumenta la coordinación total. Atacar con piezas incompletas suele fracasar; primero activa todo tu ejército.'
      }
    ]
  },
  {
    id: 'mid-l3',
    title: 'Ataca donde eres más fuerte',
    blocks: [
      'La estructura de peones indica dónde jugar: se ataca en el lado donde tienes más espacio o mayoría.',
      'Si el rival ha enrocado corto, un ataque de peones en ese flanco puede abrir líneas hacia su rey.',
      'Crea debilidades en el campo rival (casillas o peones débiles) y coloca tus piezas sobre ellas.',
      'Error común: atacar donde el rival es más fuerte; te rebotará el ataque.'
    ],
    exampleFen: 'r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 8',
    exampleCaption: 'La ruptura en el centro o el juego de piezas define el plan correcto.',
    questions: [
      {
        id: 'mid-l3-q1',
        question: '¿Dónde deberías atacar normalmente?',
        options: [
          'Donde el rival es más fuerte',
          'Donde tú tienes más espacio o mayoría de piezas/peones',
          'Siempre en el flanco de dama',
          'Nunca hay que atacar'
        ],
        correctAnswer: 1,
        explanation: 'Atacar donde eres más fuerte concentra tus fuerzas contra la parte débil del rival, maximizando tus posibilidades de éxito.'
      },
      {
        id: 'mid-l3-q2',
        question: '¿Qué es una "debilidad" que conviene crear en el campo rival?',
        options: [
          'Una casilla o peón que el rival no puede defender bien',
          'Una pieza propia mal colocada',
          'Un enroque temprano',
          'Un peón pasado propio'
        ],
        correctAnswer: 0,
        explanation: 'Las debilidades (peones atrasados, casillas sin defensa de peón) son objetivos permanentes donde instalar tus piezas y presionar.'
      }
    ]
  },
  {
    id: 'mid-l4',
    title: 'Resumen: guía del medio juego',
    blocks: [
      '1) Evalúa: material, reyes, estructura y actividad.',
      '2) Mejora tu peor pieza para coordinar todo tu ejército.',
      '3) Ataca donde eres más fuerte; crea y explota debilidades.',
      '4) Antes de cada jugada, revisa las amenazas tácticas del rival.',
      '5) Convierte la ventaja en un final ganador cuando el ataque no da mate.'
    ],
    questions: [
      {
        id: 'mid-l4-q1',
        question: '¿Qué deberías comprobar SIEMPRE antes de ejecutar tu plan estratégico?',
        options: [
          'Las amenazas tácticas inmediatas del rival',
          'El reloj del rival',
          'El número de jugada',
          'El color de las casillas'
        ],
        correctAnswer: 0,
        explanation: 'Un buen plan estratégico no sirve de nada si pierdes por una táctica. Revisa jaques, capturas y amenazas antes de seguir tu plan.'
      }
    ]
  }
];

export const TRAINING_CONTENT: Record<TrainingCategory, TrainingLesson[]> = {
  openings: openingsLessons,
  tactics: tacticsLessons,
  endgames: endgamesLessons,
  middlegame: middlegameLessons
};

/** Get theory lessons for a category */
export function getLessonsForCategory(category: TrainingCategory): TrainingLesson[] {
  return TRAINING_CONTENT[category] || [];
}
