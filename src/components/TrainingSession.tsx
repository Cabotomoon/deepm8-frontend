/**
 * TrainingSession Component
 * DeepM8 Personal Trainer - Interactive Chess Training
 */

import React, { useState, useEffect, useCallback } from 'react';
import { SimpleChessBoard } from './SimpleChessBoard';
import { staticPuzzleService } from '../services/staticPuzzleService';
import { formatMoveDisplay } from '../utils/moveNotation';

interface TrainingPuzzle {
  id: string;
  fen: string;
  theme: string;
  explanation: string;
  bestMove: string;
  alternatives: string[];
  difficulty: 'easy' | 'medium' | 'hard';
}

interface TrainingSessionProps {
  type: 'openings' | 'tactics' | 'endgames' | 'middlegame';
  onClose: () => void;
}

type TrainingStep = 'intro' | 'mini-lesson' | 'exercise' | 'puzzle' | 'result';

interface Exercise {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export default function TrainingSession({ type, onClose }: TrainingSessionProps) {
  // Debug log
  useEffect(() => {
    console.log('🎓 TrainingSession mounted with type:', type);
    return () => console.log('🎓 TrainingSession unmounted');
  }, [type]);

  const [step, setStep] = useState<TrainingStep>('intro');
  const [score, setScore] = useState(0);
  const [currentPuzzle, setCurrentPuzzle] = useState<TrainingPuzzle | null>(null);
  const [puzzles, setPuzzles] = useState<TrainingPuzzle[]>([]);
  const [currentExercise, setCurrentExercise] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(false);
  const [userAnswer, setUserAnswer] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const [totalPuzzles] = useState(10);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [startTime] = useState(Date.now());

  // Training content by type
  const trainingContent = {
    openings: {
      title: '📖 Principios de Apertura',
      subtitle: 'Domina los fundamentos de las aperturas',
      lesson: {
        title: 'Fundamentos de Apertura',
        points: [
          '🎯 Controla el centro (e4, d4, e5, d5)',
          '♞ Desarrolla piezas menores (caballos y alfiles) primero',
          '👑 Enroca temprano para proteger tu rey',
          '♕ No saques la dama demasiado pronto',
          '🔄 No muevas la misma pieza dos veces sin razón'
        ]
      },
      exercises: [
        {
          question: '¿Cuál es el objetivo principal en la apertura?',
          options: ['Atacar inmediatamente', 'Controlar el centro y desarrollar', 'Mover todos los peones', 'Sacar la dama'],
          correctAnswer: 1,
          explanation: 'El objetivo principal es controlar el centro y desarrollar piezas rápidamente.'
        },
        {
          question: '¿Cuándo es mejor enrocar?',
          options: ['Al final de la partida', 'Después de desarrollar piezas menores', 'En la jugada 1', 'Nunca'],
          correctAnswer: 1,
          explanation: 'Debes enrocar después de desarrollar tus piezas menores para proteger tu rey.'
        }
      ]
    },
    tactics: {
      title: '⚔️ Táctica Avanzada',
      subtitle: 'Mejora tu visión táctica',
      lesson: {
        title: 'Patrones Tácticos',
        points: [
          '🔱 Clavada: Inmovilizar una pieza valiosa',
          '⚡ Enfilada: Atacar dos piezas en línea',
          '🎯 Horquilla: Atacar múltiples piezas con una',
          '💎 Ataque doble: Amenazar dos objetivos',
          '👑 Jaque descubierto: Revelar ataque al mover'
        ]
      },
      exercises: [
        {
          question: '¿Qué es una clavada?',
          options: ['Atacar el rey', 'Inmovilizar una pieza', 'Cambiar piezas', 'Mover el rey'],
          correctAnswer: 1,
          explanation: 'Una clavada es cuando una pieza no puede moverse sin exponer una pieza más valiosa.'
        },
        {
          question: '¿Cuál es el patrón más poderoso?',
          options: ['Horquilla', 'Jaque descubierto', 'Cambio', 'Avance'],
          correctAnswer: 1,
          explanation: 'El jaque descubierto es el más poderoso porque combina jaque con ataque.'
        }
      ]
    },
    endgames: {
      title: '♟️ Finales Básicos',
      subtitle: 'Convierte ventajas en victorias',
      lesson: {
        title: 'Fundamentos de Finales',
        points: [
          '👑 Activa tu rey en el final',
          '🎯 Oposición: coloca tu rey frente al enemigo',
          '♟️ Peones pasados son poderosos',
          '🏰 Finales de torre: corta al rey enemigo',
          '⚖️ Comprende finales teóricos ganadores/tablas'
        ]
      },
      exercises: [
        {
          question: '¿Qué es la oposición?',
          options: ['Atacar el rey', 'Reyes enfrentados con casilla entre ellos', 'Mover torres', 'Capturar peones'],
          correctAnswer: 1,
          explanation: 'La oposición es cuando los reyes se enfrentan con una casilla de distancia.'
        },
        {
          question: '¿Cuándo debes activar tu rey?',
          options: ['Apertura', 'Medio juego', 'Final', 'Nunca'],
          correctAnswer: 2,
          explanation: 'En el final, el rey se convierte en una pieza activa y poderosa.'
        }
      ]
    },
    middlegame: {
      title: '🎯 Planes en el Medio Juego',
      subtitle: 'Desarrolla estrategias ganadoras',
      lesson: {
        title: 'Planificación Estratégica',
        points: [
          '🎯 Identifica tu peor pieza y mejórala',
          '🏰 Ataca donde eres más fuerte',
          '⚔️ Crea debilidades en posición enemiga',
          '🎨 Controla casillas clave',
          '📊 Evalúa estructura de peones'
        ]
      },
      exercises: [
        {
          question: '¿Qué es un plan en ajedrez?',
          options: ['Mover sin pensar', 'Secuencia de jugadas con objetivo', 'Atacar siempre', 'Defender solo'],
          correctAnswer: 1,
          explanation: 'Un plan es una secuencia de jugadas con un objetivo claro.'
        },
        {
          question: '¿Dónde debes atacar?',
          options: ['Donde el oponente es fuerte', 'Donde eres más fuerte', 'En el centro siempre', 'En los bordes'],
          correctAnswer: 1,
          explanation: 'Debes atacar donde tienes ventaja de espacio o material.'
        }
      ]
    }
  };

  const content = trainingContent[type];

  // Load puzzles on mount
  useEffect(() => {
    const loadPuzzles = async () => {
      setLoading(true);
      try {
        const generatedPuzzles = await staticPuzzleService.generatePuzzles(type, totalPuzzles);
        setPuzzles(generatedPuzzles);
        console.log(`✅ Loaded ${generatedPuzzles.length} static puzzles for ${type}`);
      } catch (error) {
        console.error('Error loading puzzles:', error);
      } finally {
        setLoading(false);
      }
    };
    loadPuzzles();
  }, [type, totalPuzzles]);

  // Load current puzzle
  const loadNextPuzzle = useCallback(() => {
    if (puzzleIndex < puzzles.length) {
      setCurrentPuzzle(puzzles[puzzleIndex]);
      setUserAnswer(null);
      setFeedback(null);
    } else {
      setStep('result');
    }
  }, [puzzleIndex, puzzles]);

  // Handle step navigation
  const nextStep = () => {
    if (step === 'intro') {
      setStep('mini-lesson');
    } else if (step === 'mini-lesson') {
      setCurrentExercise(content.exercises[0]);
      setStep('exercise');
    } else if (step === 'exercise') {
      loadNextPuzzle();
      setStep('puzzle');
    } else if (step === 'puzzle') {
      if (puzzleIndex + 1 < totalPuzzles) {
        setPuzzleIndex(puzzleIndex + 1);
        loadNextPuzzle();
      } else {
        setStep('result');
      }
    }
  };

  // Handle exercise answer
  const handleExerciseAnswer = (answerIndex: number) => {
    if (!currentExercise) return;

    const isCorrect = answerIndex === currentExercise.correctAnswer;
    if (isCorrect) {
      setScore(score + 10);
      setCorrectAnswers(correctAnswers + 1);
    }

    setFeedback(isCorrect ? '✅ ¡Correcto!' : `❌ ${currentExercise.explanation}`);

    setTimeout(() => {
      nextStep();
    }, 2000);
  };

  // Handle puzzle answer
  const handlePuzzleAnswer = async (move: string) => {
    if (!currentPuzzle) return;

    setLoading(true);
    setUserAnswer(move);

    try {
      const result = await staticPuzzleService.validatePuzzleMove(currentPuzzle.id, move);

      if (result.isCorrect) {
        setScore(score + 20);
        setCorrectAnswers(correctAnswers + 1);
        setFeedback(`✅ ${result.feedback} ${currentPuzzle.explanation}`);
      } else {
        setFeedback(`❌ La mejor jugada era ${currentPuzzle.bestMove}. ${currentPuzzle.explanation}`);
      }

      setTimeout(() => {
        setPuzzleIndex(puzzleIndex + 1);
        nextStep();
      }, 3000);
    } catch (error) {
      console.error('Error validating answer:', error);
      setFeedback('❌ Error al validar la respuesta');
    } finally {
      setLoading(false);
    }
  };

  // Render based on current step
  const renderStep = () => {
    switch (step) {
      case 'intro':
        return <IntroScreen content={content} onStart={nextStep} />;
      case 'mini-lesson':
        return <MiniLessonScreen content={content} onContinue={nextStep} />;
      case 'exercise':
        return (
          <ExerciseScreen
            exercise={currentExercise!}
            onAnswer={handleExerciseAnswer}
            feedback={feedback}
          />
        );
      case 'puzzle':
        return (
          <PuzzleScreen
            puzzle={currentPuzzle}
            puzzleIndex={puzzleIndex}
            totalPuzzles={totalPuzzles}
            onAnswer={handlePuzzleAnswer}
            feedback={feedback}
            loading={loading}
          />
        );
      case 'result':
        return (
          <ResultScreen
            score={score}
            correctAnswers={correctAnswers}
            totalQuestions={totalPuzzles + 2}
            timeSpent={Math.floor((Date.now() - startTime) / 1000)}
            onClose={onClose}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-xl border-b border-purple-500/30 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{content.title}</h1>
            <p className="text-slate-400 text-sm">{content.subtitle}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm text-slate-400">Puntuación</div>
              <div className="text-2xl font-bold text-purple-400">{score}</div>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors"
            >
              ✕ Salir
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {renderStep()}
      </div>
    </div>
  );
}

// Sub-components for each screen
function IntroScreen({ content, onStart }: { content: any; onStart: () => void }) {
  return (
    <div className="max-w-3xl mx-auto text-center space-y-8">
      <div className="text-6xl mb-4">🎓</div>
      <h2 className="text-4xl font-bold text-white mb-4">
        Bienvenido al Entrenamiento
      </h2>
      <p className="text-xl text-slate-300 mb-8">
        DeepM8 Personal Trainer te guiará a través de ejercicios interactivos
        y puzzles tácticos curados para mejorar tus habilidades.
      </p>
      <div className="bg-slate-800/50 rounded-2xl p-8 mb-8">
        <h3 className="text-2xl font-bold text-purple-400 mb-4">
          ¿Qué aprenderás?
        </h3>
        <ul className="space-y-3 text-left max-w-md mx-auto">
          {content.lesson.points.map((point: string, i: number) => (
            <li key={i} className="flex items-start gap-3 text-slate-300">
              <span className="text-purple-400 mt-1">→</span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>
      <button
        onClick={onStart}
        className="px-12 py-4 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 rounded-xl text-white font-bold text-lg transition-all duration-200 hover:scale-105 shadow-lg"
      >
        🚀 Comenzar Entrenamiento
      </button>
    </div>
  );
}

function MiniLessonScreen({ content, onContinue }: { content: any; onContinue: () => void }) {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="text-center">
        <div className="text-5xl mb-4">📚</div>
        <h2 className="text-3xl font-bold text-white mb-2">
          {content.lesson.title}
        </h2>
      </div>

      <div className="bg-gradient-to-br from-slate-800/50 to-purple-900/20 rounded-2xl p-8 border-2 border-purple-500/30">
        <h3 className="text-xl font-bold text-purple-400 mb-6">
          Conceptos Clave:
        </h3>
        <div className="space-y-4">
          {content.lesson.points.map((point: string, i: number) => (
            <div
              key={i}
              className="flex items-start gap-4 bg-slate-700/30 rounded-xl p-4 hover:bg-slate-700/50 transition-colors"
            >
              <div className="flex-shrink-0 w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                {i + 1}
              </div>
              <p className="text-slate-200 text-lg">{point}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center">
        <button
          onClick={onContinue}
          className="px-10 py-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 rounded-xl text-white font-bold text-lg transition-all duration-200 hover:scale-105 shadow-lg"
        >
          Continuar →
        </button>
      </div>
    </div>
  );
}

function ExerciseScreen({
  exercise,
  onAnswer,
  feedback
}: {
  exercise: Exercise;
  onAnswer: (index: number) => void;
  feedback: string | null;
}) {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="text-center">
        <div className="text-5xl mb-4">🤔</div>
        <h2 className="text-2xl font-bold text-white mb-2">
          Pregunta de Comprensión
        </h2>
      </div>

      <div className="bg-gradient-to-br from-slate-800/50 to-blue-900/20 rounded-2xl p-8 border-2 border-blue-500/30">
        <h3 className="text-xl font-bold text-white mb-6">
          {exercise.question}
        </h3>
        <div className="space-y-3">
          {exercise.options.map((option, i) => (
            <button
              key={i}
              onClick={() => onAnswer(i)}
              disabled={feedback !== null}
              className="w-full text-left px-6 py-4 bg-slate-700/50 hover:bg-slate-600/50 disabled:bg-slate-700/30 rounded-xl text-white transition-all duration-200 hover:scale-[1.02] border-2 border-transparent hover:border-blue-500/50"
            >
              <span className="font-bold mr-3">{String.fromCharCode(65 + i)}.</span>
              {option}
            </button>
          ))}
        </div>
      </div>

      {feedback && (
        <div className={`text-center text-xl font-bold ${feedback.includes('✅') ? 'text-green-400' : 'text-red-400'}`}>
          {feedback}
        </div>
      )}
    </div>
  );
}

function PuzzleScreen({
  puzzle,
  puzzleIndex,
  totalPuzzles,
  onAnswer,
  feedback,
  loading
}: {
  puzzle: TrainingPuzzle | null;
  puzzleIndex: number;
  totalPuzzles: number;
  onAnswer: (move: string) => void;
  feedback: string | null;
  loading: boolean;
}) {
  const [boardWidth, setBoardWidth] = useState(500);

  // Update board width on resize
  useEffect(() => {
    const updateBoardWidth = () => {
      const width = Math.min(window.innerWidth - 80, 500);
      setBoardWidth(width);
    };

    updateBoardWidth();
    window.addEventListener('resize', updateBoardWidth);
    return () => window.removeEventListener('resize', updateBoardWidth);
  }, []);

  if (!puzzle) {
    return (
      <div className="text-center text-white">
        <div className="text-5xl mb-4">⏳</div>
        <p className="text-xl">Cargando puzzle...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center">
        <div className="text-sm text-slate-400 mb-2">
          Puzzle {puzzleIndex + 1} de {totalPuzzles}
        </div>
        <div className="w-full bg-slate-700 rounded-full h-2 mb-4">
          <div
            className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((puzzleIndex + 1) / totalPuzzles) * 100}%` }}
          />
        </div>
        <div className="text-5xl mb-4">🧩</div>
        <h2 className="text-2xl font-bold text-white mb-2">
          {puzzle.theme}
        </h2>
        <p className="text-slate-400">{puzzle.explanation}</p>
      </div>

      <div className="bg-gradient-to-br from-slate-800/50 to-purple-900/20 rounded-2xl p-4 md:p-8 border-2 border-purple-500/30">
        {/* Chess board display */}
        <div className="max-w-xl mx-auto mb-6 flex justify-center">
          <SimpleChessBoard
            fen={puzzle.fen}
            width={boardWidth}
          />
        </div>

        <div className="space-y-3">
          <p className="text-white font-bold text-center mb-4">
            Selecciona la mejor jugada:
          </p>
          <div className="grid grid-cols-1 gap-3">
            {[puzzle.bestMove, ...puzzle.alternatives].map((move, i) => (
              <button
                key={i}
                onClick={() => onAnswer(move)}
                disabled={loading || feedback !== null}
                className="px-6 py-4 bg-slate-700/50 hover:bg-slate-600/50 disabled:bg-slate-700/30 rounded-xl text-white transition-all duration-200 hover:scale-[1.02] border-2 border-transparent hover:border-purple-500/50 font-mono text-lg"
              >
                {formatMoveDisplay(move)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {feedback && (
        <div className={`text-center text-lg font-bold p-4 rounded-xl ${
          feedback.includes('✅')
            ? 'bg-green-500/20 text-green-400 border-2 border-green-500/50'
            : 'bg-red-500/20 text-red-400 border-2 border-red-500/50'
        }`}>
          {feedback}
        </div>
      )}

      {loading && (
        <div className="text-center text-slate-400">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          <p className="mt-2">Validando respuesta...</p>
        </div>
      )}
    </div>
  );
}

function ResultScreen({
  score,
  correctAnswers,
  totalQuestions,
  timeSpent,
  onClose
}: {
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  timeSpent: number;
  onClose: () => void;
}) {
  const accuracy = Math.round((correctAnswers / totalQuestions) * 100);
  const xpGained = score;

  return (
    <div className="max-w-3xl mx-auto text-center space-y-8">
      <div className="text-7xl mb-4">🎉</div>
      <h2 className="text-4xl font-bold text-white mb-4">
        ¡Entrenamiento Completado!
      </h2>

      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="bg-gradient-to-br from-purple-900/50 to-blue-900/50 rounded-2xl p-6 border-2 border-purple-500/30">
          <div className="text-5xl font-bold text-purple-400 mb-2">{accuracy}%</div>
          <div className="text-slate-300">Precisión</div>
        </div>
        <div className="bg-gradient-to-br from-blue-900/50 to-green-900/50 rounded-2xl p-6 border-2 border-blue-500/30">
          <div className="text-5xl font-bold text-blue-400 mb-2">{correctAnswers}/{totalQuestions}</div>
          <div className="text-slate-300">Correctas</div>
        </div>
        <div className="bg-gradient-to-br from-green-900/50 to-purple-900/50 rounded-2xl p-6 border-2 border-green-500/30">
          <div className="text-5xl font-bold text-green-400 mb-2">{Math.floor(timeSpent / 60)}:{(timeSpent % 60).toString().padStart(2, '0')}</div>
          <div className="text-slate-300">Tiempo Total</div>
        </div>
        <div className="bg-gradient-to-br from-yellow-900/50 to-orange-900/50 rounded-2xl p-6 border-2 border-yellow-500/30">
          <div className="text-5xl font-bold text-yellow-400 mb-2">+{xpGained}</div>
          <div className="text-slate-300">XP Ganado</div>
        </div>
      </div>

      <div className="bg-slate-800/50 rounded-2xl p-8 mb-8">
        <h3 className="text-2xl font-bold text-purple-400 mb-4">
          Feedback
        </h3>
        <div className="space-y-3 text-left max-w-md mx-auto">
          {accuracy >= 80 ? (
            <>
              <p className="text-green-400">✅ Fortalezas: Excelente comprensión de los conceptos</p>
              <p className="text-slate-300">💡 Recomendación: Avanza al siguiente nivel de dificultad</p>
            </>
          ) : accuracy >= 60 ? (
            <>
              <p className="text-yellow-400">⚡ Fortalezas: Buena base de conocimientos</p>
              <p className="text-slate-300">💡 Recomendación: Practica más puzzles para mejorar</p>
            </>
          ) : (
            <>
              <p className="text-orange-400">🎯 Debilidades: Necesitas más práctica</p>
              <p className="text-slate-300">💡 Recomendación: Repasa la lección y vuelve a intentarlo</p>
            </>
          )}
        </div>
      </div>

      <button
        onClick={onClose}
        className="px-12 py-4 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 rounded-xl text-white font-bold text-lg transition-all duration-200 hover:scale-105 shadow-lg"
      >
        🏠 Volver al Menú
      </button>
    </div>
  );
}
