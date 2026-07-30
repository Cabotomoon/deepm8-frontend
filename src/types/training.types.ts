/**
 * Training System Type Definitions
 *
 * Reusable, generic structures for the DeepM8 training system.
 * These types are shared across theory, puzzles, progress and recommendations
 * to avoid content duplication.
 */

/** Chess study category (matches StudyRecommendation categories) */
export type TrainingCategory = 'openings' | 'tactics' | 'endgames' | 'middlegame';

/** 5-level difficulty progression */
export type DifficultyLevel = 1 | 2 | 3 | 4 | 5;

export const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
  1: 'Básico',
  2: 'Fácil',
  3: 'Intermedio',
  4: 'Avanzado',
  5: 'Experto'
};

/** A single comprehension question (A/B/C/D) that tests understanding */
export interface TrainingQuestion {
  id: string;
  question: string;
  options: string[];        // 2-4 options (rendered as A/B/C/D)
  correctAnswer: number;    // index into options
  explanation: string;      // WHY the correct answer is correct
}

/** A small theory lesson block within a module */
export interface TrainingLesson {
  id: string;
  title: string;
  /** Ordered content blocks: short paragraphs / bullet points */
  blocks: string[];
  /** Optional FEN position to illustrate the concept */
  exampleFen?: string;
  /** Optional caption explaining the example position */
  exampleCaption?: string;
  /** Comprehension questions asked after this lesson block */
  questions: TrainingQuestion[];
}

/** An interactive chess puzzle solved on the real board */
export interface TrainingPuzzle {
  id: string;
  category: TrainingCategory;
  theme: string;
  level: DifficultyLevel;
  fen: string;
  /** Whose turn it is to move */
  sideToMove: 'white' | 'black';
  /** Best move in UCI notation (e.g. "e2e4") */
  solution: string;
  /** Acceptable alternative solutions in UCI notation */
  alternates?: string[];
  /** Explanation of WHY the solution works */
  explanation: string;
  /** Progressive hints (shown one at a time on failure) */
  hints: string[];
}

/** A complete training module tied to a recommendation theme */
export interface TrainingModule {
  id: string;                 // stable id, e.g. "endgame-basics"
  category: TrainingCategory;
  title: string;
  subtitle: string;
  icon: string;
  /** Short theme description used for puzzle relevance */
  theme: string;
  lessons: TrainingLesson[];
}

/** Move evaluation classification (from centipawn loss) */
export type MoveQuality =
  | 'excelente'
  | 'buena'
  | 'aceptable'
  | 'imprecisa'
  | 'error'
  | 'error-grave';

export interface MoveEvaluation {
  quality: MoveQuality;
  label: string;
  centipawnLoss: number;
  isSolution: boolean;
  bestMove: string;
  explanation: string;
}

/** Per-module persistent progress */
export interface ModuleProgress {
  moduleId: string;
  category: TrainingCategory;
  completedTheory: boolean;
  /** Puzzle ids solved correctly (deduplicated) */
  completedPuzzles: string[];
  /** Puzzle ids that were failed at least once */
  failedPuzzles: string[];
  /** Total attempts across all puzzles */
  attempts: number;
  /** Correct answers count (questions + puzzles) */
  correct: number;
  /** Current adaptive difficulty level */
  currentLevel: DifficultyLevel;
  /** Best accuracy % achieved in a session for this module */
  bestAccuracy: number;
  /** Accuracy % of the most recent session */
  accuracy: number;
  /** Total hints used */
  hintsUsed: number;
  /** Total time spent training this module (seconds) */
  timeSpent: number;
  /** Themes the player has mastered within this module */
  masteredTopics: string[];
  /** Themes needing more practice */
  topicsToPractice: string[];
  lastPractice: number;
  createdAt: number;
}

/** Root training progress persisted per user */
export interface TrainingProgress {
  modules: Record<string, ModuleProgress>;
  /** Total XP earned across all training */
  totalXp: number;
  lastUpdated: number;
}

/** A dynamically generated training recommendation */
export interface TrainingRecommendation {
  id: string;              // maps to a module id
  category: TrainingCategory;
  title: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

/** Result summary shown at the end of a training session */
export interface SessionResult {
  moduleId: string;
  puzzlesAttempted: number;
  puzzlesCorrect: number;
  puzzlesFailed: number;
  questionsCorrect: number;
  questionsTotal: number;
  accuracy: number;
  timeSpent: number;        // seconds
  levelReached: DifficultyLevel;
  hintsUsed: number;
  xpEarned: number;
  masteredTopics: string[];
  topicsToPractice: string[];
}

export function createEmptyModuleProgress(
  moduleId: string,
  category: TrainingCategory
): ModuleProgress {
  return {
    moduleId,
    category,
    completedTheory: false,
    completedPuzzles: [],
    failedPuzzles: [],
    attempts: 0,
    correct: 0,
    currentLevel: 1,
    bestAccuracy: 0,
    accuracy: 0,
    hintsUsed: 0,
    timeSpent: 0,
    masteredTopics: [],
    topicsToPractice: [],
    lastPractice: Date.now(),
    createdAt: Date.now()
  };
}
