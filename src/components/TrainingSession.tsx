/**
 * TrainingSession Component
 *
 * Full training flow for a module:
 *   intro → theory (lessons + comprehension questions) → interactive
 *   puzzles (real board, hints, retry, adaptive difficulty) → result.
 *
 * Progress persists via trainingProgressService. Puzzle moves are made on
 * the real board and validated (Stockfish when available) by
 * trainingPuzzleService.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import InteractiveChessBoard from './InteractiveChessBoard';
import { SimpleChessBoard } from './SimpleChessBoard';
import { getModule } from '../data/trainingModules';
import { trainingPuzzleService } from '../services/trainingPuzzleService';
import { trainingProgressService } from '../services/trainingProgressService';
import {
  type TrainingCategory,
  type DifficultyLevel,
  type TrainingPuzzle,
  type MoveEvaluation,
  DIFFICULTY_LABELS
} from '../types/training.types';

export type TrainingMode = 'full' | 'theory' | 'puzzles';

interface TrainingSessionProps {
  /** Module id (matches recommendation id) or a category id */
  moduleId: string;
  category: TrainingCategory;
  mode?: TrainingMode;
  onClose: () => void;
}

type Step = 'intro' | 'theory' | 'puzzles' | 'result';

const PUZZLES_PER_SESSION = 10;

export default function TrainingSession({
  moduleId,
  category,
  mode = 'full',
  onClose
}: TrainingSessionProps) {
  const module = useMemo(() => getModule(moduleId, category), [moduleId, category]);

  const savedProgress = useMemo(
    () => trainingProgressService.getModuleProgress(module.id, module.category),
    [module.id, module.category]
  );

  const [step, setStep] = useState<Step>(mode === 'puzzles' ? 'puzzles' : 'intro');
  const [startTime] = useState(Date.now());

  // Theory state
  const [lessonIndex, setLessonIndex] = useState(0);
  const [questionsCorrect, setQuestionsCorrect] = useState(0);
  const [questionsTotal, setQuestionsTotal] = useState(0);

  // Puzzle state
  const [puzzles, setPuzzles] = useState<TrainingPuzzle[]>([]);
  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const [level, setLevel] = useState<DifficultyLevel>(savedProgress.currentLevel || 1);
  const [puzzlesSolved, setPuzzlesSolved] = useState(0);
  const [puzzlesFailed, setPuzzlesFailed] = useState(0);
  const [consecutiveCorrect, setConsecutiveCorrect] = useState(0);
  const [consecutiveWrong, setConsecutiveWrong] = useState(0);
  const [sessionHints, setSessionHints] = useState(0);

  // Load puzzles when entering the puzzle phase
  useEffect(() => {
    if (step !== 'puzzles') return;
    const set = trainingPuzzleService.getSet(module.category, level, PUZZLES_PER_SESSION);
    setPuzzles(set);
    setPuzzleIndex(0);
  }, [step, module.category]); // level intentionally excluded: set built once per session

  const finishSession = useCallback(() => {
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    const attempted = puzzlesSolved + puzzlesFailed;
    const totalCorrect = puzzlesSolved + questionsCorrect;
    const totalItems = attempted + questionsTotal;
    const accuracy = totalItems > 0 ? Math.round((totalCorrect / totalItems) * 100) : 0;

    trainingProgressService.finalizeSession({
      moduleId: module.id,
      category: module.category,
      accuracy,
      levelReached: level,
      timeSpentSeconds: timeSpent
    });
    setStep('result');
  }, [startTime, puzzlesSolved, puzzlesFailed, questionsCorrect, questionsTotal, module.id, module.category, level]);

  const lessons = module.lessons;
  const currentLesson = lessons[lessonIndex];
  const currentPuzzle = puzzles[puzzleIndex];

  // Theory: answer a comprehension question
  const handleQuestionAnswered = useCallback((correct: boolean) => {
    setQuestionsTotal(t => t + 1);
    if (correct) setQuestionsCorrect(c => c + 1);
    trainingProgressService.recordQuestion(module.id, module.category, correct);
  }, [module.id, module.category]);

  // Theory: advance to next lesson or move to puzzles
  const handleLessonComplete = useCallback(() => {
    if (lessonIndex + 1 < lessons.length) {
      setLessonIndex(i => i + 1);
    } else {
      trainingProgressService.markTheoryComplete(module.id, module.category);
      if (mode === 'theory') {
        finishSession();
      } else {
        setStep('puzzles');
      }
    }
  }, [lessonIndex, lessons.length, module.id, module.category, mode, finishSession]);

  // Puzzle: record the outcome of a puzzle and advance
  const handlePuzzleResolved = useCallback((solved: boolean, hintsUsed: number) => {
    setSessionHints(h => h + hintsUsed);
    const newConsecCorrect = solved ? consecutiveCorrect + 1 : 0;
    const newConsecWrong = solved ? 0 : consecutiveWrong + 1;
    setConsecutiveCorrect(newConsecCorrect);
    setConsecutiveWrong(newConsecWrong);

    if (solved) setPuzzlesSolved(s => s + 1);
    else setPuzzlesFailed(f => f + 1);

    const newLevel = trainingProgressService.recordPuzzleAttempt({
      moduleId: module.id,
      category: module.category,
      puzzleId: currentPuzzle.id,
      theme: currentPuzzle.theme,
      solved,
      hintsUsed,
      consecutiveCorrect: newConsecCorrect,
      consecutiveWrong: newConsecWrong
    });
    setLevel(newLevel);

    // Advance to next puzzle or finish
    if (puzzleIndex + 1 < puzzles.length) {
      setPuzzleIndex(i => i + 1);
    } else {
      finishSession();
    }
  }, [consecutiveCorrect, consecutiveWrong, currentPuzzle, module.id, module.category, puzzleIndex, puzzles.length, finishSession]);

  const puzzlesAttempted = puzzlesSolved + puzzlesFailed;

  return (
    <div className="fixed inset-0 z-[60] bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-y-auto">
      <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-xl border-b border-purple-500/30 px-4 sm:px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-white truncate flex items-center gap-2">
              <span>{module.icon}</span> {module.title}
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm truncate">{module.subtitle}</p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="text-right hidden sm:block">
              <div className="text-xs text-slate-400">Nivel</div>
              <div className="text-lg font-bold text-purple-400">{DIFFICULTY_LABELS[level]}</div>
            </div>
            <button
              onClick={onClose}
              className="px-3 sm:px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white text-sm transition-colors"
            >
              ✕ Salir
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {step === 'intro' && (
          <IntroScreen
            module={module}
            savedTheoryDone={savedProgress.completedTheory}
            onStartTheory={() => setStep('theory')}
            onSkipToPuzzles={() => setStep('puzzles')}
          />
        )}

        {step === 'theory' && currentLesson && (
          <TheoryScreen
            key={currentLesson.id}
            lessonNumber={lessonIndex + 1}
            totalLessons={lessons.length}
            lesson={currentLesson}
            onQuestionAnswered={handleQuestionAnswered}
            onComplete={handleLessonComplete}
          />
        )}

        {step === 'puzzles' && (
          currentPuzzle ? (
            <PuzzleScreen
              key={`${currentPuzzle.id}-${puzzleIndex}`}
              puzzle={currentPuzzle}
              puzzleNumber={puzzleIndex + 1}
              totalPuzzles={puzzles.length}
              solvedCount={puzzlesSolved}
              onResolved={handlePuzzleResolved}
            />
          ) : (
            <div className="text-center text-white py-20">
              <div className="text-5xl mb-4 animate-pulse">🧩</div>
              <p>Cargando ejercicios...</p>
            </div>
          )
        )}

        {step === 'result' && (
          <ResultScreen
            puzzlesAttempted={puzzlesAttempted}
            puzzlesSolved={puzzlesSolved}
            puzzlesFailed={puzzlesFailed}
            questionsCorrect={questionsCorrect}
            questionsTotal={questionsTotal}
            level={level}
            hintsUsed={sessionHints}
            timeSpent={Math.floor((Date.now() - startTime) / 1000)}
            masteredTopics={trainingProgressService.getModuleProgress(module.id, module.category).masteredTopics}
            topicsToPractice={trainingProgressService.getModuleProgress(module.id, module.category).topicsToPractice}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
}

/* ============================ RESULT ============================ */
function ResultScreen({
  puzzlesAttempted,
  puzzlesSolved,
  puzzlesFailed,
  questionsCorrect,
  questionsTotal,
  level,
  hintsUsed,
  timeSpent,
  masteredTopics,
  topicsToPractice,
  onClose
}: {
  puzzlesAttempted: number;
  puzzlesSolved: number;
  puzzlesFailed: number;
  questionsCorrect: number;
  questionsTotal: number;
  level: DifficultyLevel;
  hintsUsed: number;
  timeSpent: number;
  masteredTopics: string[];
  topicsToPractice: string[];
  onClose: () => void;
}) {
  const totalItems = puzzlesAttempted + questionsTotal;
  const totalCorrect = puzzlesSolved + questionsCorrect;
  const accuracy = totalItems > 0 ? Math.round((totalCorrect / totalItems) * 100) : 0;
  const mins = Math.floor(timeSpent / 60);
  const secs = (timeSpent % 60).toString().padStart(2, '0');

  return (
    <div className="max-w-3xl mx-auto text-center space-y-6">
      <div className="text-6xl">{accuracy >= 80 ? '🏆' : accuracy >= 50 ? '🎉' : '💪'}</div>
      <h2 className="text-3xl sm:text-4xl font-bold text-white">Sesión completada</h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatCard value={`${accuracy}%`} label="Precisión" color="purple" />
        <StatCard value={`${puzzlesSolved}/${puzzlesAttempted}`} label="Puzzles" color="blue" />
        <StatCard value={`${questionsCorrect}/${questionsTotal}`} label="Preguntas" color="emerald" />
        <StatCard value={`${mins}:${secs}`} label="Tiempo" color="green" />
        <StatCard value={DIFFICULTY_LABELS[level]} label="Nivel alcanzado" color="yellow" />
        <StatCard value={`${hintsUsed}`} label="Pistas usadas" color="orange" />
      </div>

      {masteredTopics.length > 0 && (
        <div className="bg-green-900/20 border border-green-500/40 rounded-xl p-4 text-left">
          <h3 className="font-bold text-green-400 mb-2">✅ Temas dominados</h3>
          <div className="flex flex-wrap gap-2">
            {masteredTopics.map(t => (
              <span key={t} className="px-3 py-1 bg-green-600/30 rounded-full text-green-200 text-sm">{t}</span>
            ))}
          </div>
        </div>
      )}

      {topicsToPractice.length > 0 && (
        <div className="bg-orange-900/20 border border-orange-500/40 rounded-xl p-4 text-left">
          <h3 className="font-bold text-orange-400 mb-2">🎯 Temas a practicar</h3>
          <div className="flex flex-wrap gap-2">
            {topicsToPractice.map(t => (
              <span key={t} className="px-3 py-1 bg-orange-600/30 rounded-full text-orange-200 text-sm">{t}</span>
            ))}
          </div>
        </div>
      )}

      <div className="bg-slate-800/50 rounded-xl p-5 text-left">
        <p className="text-slate-300">
          {accuracy >= 80
            ? 'Gran trabajo. Dominas estos conceptos: sube de nivel o explora un tema nuevo.'
            : accuracy >= 50
            ? 'Buen progreso. Repasa los temas marcados y vuelve a intentarlo para consolidar.'
            : 'Sigue practicando. Repasa la teoría y usa las pistas: la mejora llega con la repetición.'}
        </p>
      </div>

      <button
        onClick={onClose}
        className="px-12 py-4 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 rounded-xl text-white font-bold text-lg transition-all hover:scale-105 shadow-lg"
      >
        Volver
      </button>
    </div>
  );
}

function StatCard({ value, label, color }: { value: string; label: string; color: string }) {
  const colors: Record<string, string> = {
    purple: 'from-purple-900/50 to-blue-900/50 border-purple-500/30 text-purple-400',
    blue: 'from-blue-900/50 to-cyan-900/50 border-blue-500/30 text-blue-400',
    emerald: 'from-emerald-900/50 to-green-900/50 border-emerald-500/30 text-emerald-400',
    green: 'from-green-900/50 to-teal-900/50 border-green-500/30 text-green-400',
    yellow: 'from-yellow-900/50 to-orange-900/50 border-yellow-500/30 text-yellow-400',
    orange: 'from-orange-900/50 to-red-900/50 border-orange-500/30 text-orange-400'
  };
  return (
    <div className={`bg-gradient-to-br rounded-xl p-4 border-2 ${colors[color] || colors.purple}`}>
      <div className="text-2xl sm:text-3xl font-bold mb-1">{value}</div>
      <div className="text-slate-300 text-xs sm:text-sm">{label}</div>
    </div>
  );
}

/* ============================ THEORY ============================ */
function TheoryScreen({
  lessonNumber,
  totalLessons,
  lesson,
  onQuestionAnswered,
  onComplete
}: {
  lessonNumber: number;
  totalLessons: number;
  lesson: ReturnType<typeof getModule>['lessons'][number];
  onQuestionAnswered: (correct: boolean) => void;
  onComplete: () => void;
}) {
  const [phase, setPhase] = useState<'read' | 'questions'>('read');
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);

  const question = lesson.questions[qIndex];
  const hasQuestions = lesson.questions.length > 0;

  const handleSelect = (i: number) => {
    if (answered) return;
    setSelected(i);
    setAnswered(true);
    onQuestionAnswered(i === question.correctAnswer);
  };

  const nextQuestion = () => {
    if (qIndex + 1 < lesson.questions.length) {
      setQIndex(qIndex + 1);
      setSelected(null);
      setAnswered(false);
    } else {
      onComplete();
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <div className="flex justify-between text-xs text-slate-400 mb-2">
          <span>Lección {lessonNumber} de {totalLessons}</span>
          <span>{phase === 'read' ? 'Teoría' : `Pregunta ${qIndex + 1}/${lesson.questions.length}`}</span>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all"
            style={{ width: `${(lessonNumber / totalLessons) * 100}%` }}
          />
        </div>
      </div>

      {phase === 'read' && (
        <div className="space-y-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">{lesson.title}</h2>
          <div className="bg-gradient-to-br from-slate-800/60 to-purple-900/20 rounded-2xl p-5 sm:p-7 border border-purple-500/30 space-y-4">
            {lesson.blocks.map((block, i) => (
              <p key={i} className="text-slate-200 text-base sm:text-lg leading-relaxed">{block}</p>
            ))}
          </div>

          {lesson.exampleFen && (
            <div className="bg-slate-800/40 rounded-2xl p-4 sm:p-6 border border-slate-700">
              <div className="flex justify-center mb-3">
                <SimpleChessBoard fen={lesson.exampleFen} width={Math.min(360, typeof window !== 'undefined' ? window.innerWidth - 80 : 360)} />
              </div>
              {lesson.exampleCaption && (
                <p className="text-center text-slate-400 text-sm">{lesson.exampleCaption}</p>
              )}
            </div>
          )}

          <div className="text-center">
            <button
              onClick={() => (hasQuestions ? setPhase('questions') : onComplete())}
              className="px-10 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 rounded-xl text-white font-bold transition-all hover:scale-105"
            >
              {hasQuestions ? 'Comprobar comprensión →' : 'Continuar →'}
            </button>
          </div>
        </div>
      )}

      {phase === 'questions' && question && (
        <div className="space-y-5">
          <div className="text-center text-4xl">🤔</div>
          <div className="bg-gradient-to-br from-slate-800/60 to-blue-900/20 rounded-2xl p-5 sm:p-7 border border-blue-500/30">
            <h3 className="text-lg sm:text-xl font-bold text-white mb-5">{question.question}</h3>
            <div className="space-y-3">
              {question.options.map((opt, i) => {
                const isCorrect = i === question.correctAnswer;
                const isChosen = selected === i;
                let cls = 'bg-slate-700/50 hover:bg-slate-600/50 border-transparent';
                if (answered && isCorrect) cls = 'bg-green-600/30 border-green-500';
                else if (answered && isChosen && !isCorrect) cls = 'bg-red-600/30 border-red-500';
                return (
                  <button
                    key={i}
                    onClick={() => handleSelect(i)}
                    disabled={answered}
                    className={`w-full text-left px-5 py-3 rounded-xl text-white transition-all border-2 ${cls}`}
                  >
                    <span className="font-bold mr-3">{String.fromCharCode(65 + i)}.</span>{opt}
                  </button>
                );
              })}
            </div>
          </div>

          {answered && (
            <div className="bg-slate-800/60 border border-purple-500/40 rounded-xl p-4 space-y-3">
              <p className={`font-bold ${selected === question.correctAnswer ? 'text-green-400' : 'text-orange-400'}`}>
                {selected === question.correctAnswer ? '✅ ¡Correcto!' : '❌ No exactamente.'}
              </p>
              <p className="text-slate-200 text-sm leading-relaxed">
                <span className="font-semibold text-purple-300">Por qué: </span>{question.explanation}
              </p>
              <div className="text-right">
                <button
                  onClick={nextQuestion}
                  className="px-8 py-2.5 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 rounded-lg text-white font-bold transition-all"
                >
                  {qIndex + 1 < lesson.questions.length ? 'Siguiente pregunta →' : 'Continuar →'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ============================ INTRO ============================ */
function IntroScreen({
  module,
  savedTheoryDone,
  onStartTheory,
  onSkipToPuzzles
}: {
  module: ReturnType<typeof getModule>;
  savedTheoryDone: boolean;
  onStartTheory: () => void;
  onSkipToPuzzles: () => void;
}) {
  return (
    <div className="max-w-3xl mx-auto text-center space-y-6 sm:space-y-8">
      <div className="text-6xl">{module.icon}</div>
      <h2 className="text-3xl sm:text-4xl font-bold text-white">{module.title}</h2>
      <p className="text-lg sm:text-xl text-slate-300">{module.subtitle}</p>

      <div className="bg-slate-800/50 rounded-2xl p-6 sm:p-8 text-left">
        <h3 className="text-xl font-bold text-purple-400 mb-4">Cómo funciona</h3>
        <ul className="space-y-3 text-slate-300">
          <li className="flex items-start gap-3"><span className="text-purple-400 mt-1">📚</span><span>Teoría en lecciones cortas con preguntas de comprensión.</span></li>
          <li className="flex items-start gap-3"><span className="text-purple-400 mt-1">🧩</span><span>Puzzles interactivos: mueves las piezas en el tablero real.</span></li>
          <li className="flex items-start gap-3"><span className="text-purple-400 mt-1">💡</span><span>Pistas progresivas si te atascas.</span></li>
          <li className="flex items-start gap-3"><span className="text-purple-400 mt-1">📈</span><span>La dificultad se adapta a tu rendimiento y tu progreso se guarda.</span></li>
        </ul>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={onStartTheory}
          className="px-8 py-4 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 rounded-xl text-white font-bold text-lg transition-all hover:scale-105 shadow-lg"
        >
          🚀 Empezar {savedTheoryDone ? '(repasar teoría)' : 'con teoría'}
        </button>
        <button
          onClick={onSkipToPuzzles}
          className="px-8 py-4 bg-slate-700 hover:bg-slate-600 rounded-xl text-white font-bold text-lg transition-all"
        >
          🧩 Ir directo a puzzles
        </button>
      </div>
    </div>
  );
}

/* ============================ PUZZLE ============================ */
function PuzzleScreen({
  puzzle,
  puzzleNumber,
  totalPuzzles,
  solvedCount,
  onResolved
}: {
  puzzle: TrainingPuzzle;
  puzzleNumber: number;
  totalPuzzles: number;
  solvedCount: number;
  onResolved: (solved: boolean, hintsUsed: number) => void;
}) {
  const [evaluating, setEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<MoveEvaluation | null>(null);
  const [hintsShown, setHintsShown] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [solvedThis, setSolvedThis] = useState(false);
  const [boardWidth, setBoardWidth] = useState(440);

  useEffect(() => {
    const update = () => setBoardWidth(Math.min(window.innerWidth - 64, 440));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const totalHints = trainingPuzzleService.hintCount(puzzle);
  const accuracy = puzzleNumber > 1 ? Math.round((solvedCount / (puzzleNumber - 1)) * 100) : 0;

  const handleMove = async (uci: string) => {
    if (evaluating || solvedThis || revealed) return;
    setEvaluating(true);
    setAttempts(a => a + 1);
    const result = await trainingPuzzleService.evaluateMove(puzzle, uci);
    setEvaluation(result);
    setEvaluating(false);

    if (result.isSolution || result.quality === 'excelente') {
      setSolvedThis(true);
    }
  };

  const showNextHint = () => {
    setHintsShown(h => Math.min(h + 1, totalHints));
  };

  const revealSolution = () => {
    setRevealed(true);
    setEvaluation({
      quality: 'error',
      label: 'Solución',
      centipawnLoss: 0,
      isSolution: false,
      bestMove: puzzle.solution,
      explanation: puzzle.explanation
    });
  };

  const goNext = () => {
    onResolved(solvedThis, hintsShown);
  };

  const qualityColor: Record<string, string> = {
    'excelente': 'text-green-400 border-green-500 bg-green-600/20',
    'buena': 'text-emerald-400 border-emerald-500 bg-emerald-600/20',
    'aceptable': 'text-yellow-400 border-yellow-500 bg-yellow-600/20',
    'imprecisa': 'text-orange-400 border-orange-500 bg-orange-600/20',
    'error': 'text-red-400 border-red-500 bg-red-600/20',
    'error-grave': 'text-red-500 border-red-600 bg-red-700/20'
  };

  const wrongButNotSolved = evaluation && !solvedThis && !revealed;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <div className="flex justify-between text-xs text-slate-400 mb-2">
          <span>Puzzle {puzzleNumber} de {totalPuzzles}</span>
          <span>{solvedCount}/{Math.max(1, puzzleNumber - 1)} resueltos · {accuracy}% precisión</span>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all"
            style={{ width: `${(puzzleNumber / totalPuzzles) * 100}%` }}
          />
        </div>
      </div>

      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/20 rounded-full text-purple-300 text-sm font-semibold mb-2">
          {puzzle.theme} · {DIFFICULTY_LABELS[puzzle.level]}
        </div>
        <p className="text-slate-300 text-sm">
          Juegan {puzzle.sideToMove === 'white' ? 'blancas' : 'negras'}: encuentra la mejor jugada moviendo las piezas.
        </p>
      </div>

      <div className="flex justify-center">
        <InteractiveChessBoard
          fen={puzzle.fen}
          orientation={puzzle.sideToMove}
          onMove={handleMove}
          disabled={evaluating || solvedThis || revealed}
          width={boardWidth}
        />
      </div>

      {evaluating && (
        <div className="text-center text-slate-400">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500" />
          <p className="mt-2 text-sm">Analizando tu jugada...</p>
        </div>
      )}

      {evaluation && !evaluating && (
        <div className={`rounded-xl p-4 border-2 space-y-2 ${qualityColor[evaluation.quality] || 'text-slate-300 border-slate-600 bg-slate-700/30'}`}>
          <p className="font-bold text-lg">
            {solvedThis ? '✅ ¡Correcto!' : revealed ? '📖 Solución' : `${evaluation.label}`}
          </p>
          <p className="text-slate-200 text-sm leading-relaxed">{evaluation.explanation}</p>
          {!solvedThis && !revealed && (
            <p className="text-slate-300 text-sm">Puedes intentarlo de nuevo, pedir una pista o ver la solución.</p>
          )}
        </div>
      )}

      {/* Hints */}
      {!solvedThis && !revealed && hintsShown > 0 && (
        <div className="bg-slate-800/60 border border-yellow-500/40 rounded-xl p-4 space-y-2">
          {Array.from({ length: hintsShown }).map((_, i) => (
            <p key={i} className="text-yellow-200 text-sm">
              💡 {trainingPuzzleService.getHint(puzzle, i)}
            </p>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3 justify-center">
        {(solvedThis || revealed) ? (
          <button
            onClick={goNext}
            className="px-10 py-3 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 rounded-xl text-white font-bold transition-all hover:scale-105"
          >
            {puzzleNumber < totalPuzzles ? 'Siguiente puzzle →' : 'Ver resultados →'}
          </button>
        ) : (
          <>
            {hintsShown < totalHints && (
              <button
                onClick={showNextHint}
                className="px-6 py-3 bg-yellow-600/30 hover:bg-yellow-600/50 border border-yellow-500/50 rounded-xl text-yellow-100 font-bold transition-all"
              >
                💡 {hintsShown === 0 ? 'Pista' : hintsShown === 1 ? 'Segunda pista' : 'Otra pista'}
              </button>
            )}
            {(attempts > 0 || hintsShown >= totalHints) && (
              <button
                onClick={revealSolution}
                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl text-white font-bold transition-all"
              >
                Ver solución
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
