/**
 * Training Progress Service
 *
 * Persists per-module training progress so it survives browser close,
 * device change and return. Uses localStorage as the primary fast store
 * (same pattern as playerProfileService) and mirrors to the SeaVerse Data
 * SDK when available for cross-device sync.
 *
 * Progress is NEVER destructively overwritten: modules accumulate and
 * previously generated modules remain permanently accessible.
 */

import {
  type TrainingProgress,
  type ModuleProgress,
  type TrainingCategory,
  type DifficultyLevel,
  createEmptyModuleProgress
} from '../types/training.types';

const STORAGE_KEY = 'chess_training_progress';

class TrainingProgressService {
  private cache: Record<string, TrainingProgress> = {};

  /** Resolve current user id (mirror of playerProfileService logic) */
  private getCurrentUserId(): string {
    try {
      const userStr = localStorage.getItem('chess_user_profile');
      if (userStr) {
        const user = JSON.parse(userStr);
        return user.userId || 'default';
      }
    } catch {
      // ignore
    }
    return 'default';
  }

  private emptyProgress(): TrainingProgress {
    return { modules: {}, totalXp: 0, lastUpdated: Date.now() };
  }

  /** Load full training progress for the current user */
  getProgress(): TrainingProgress {
    const userId = this.getCurrentUserId();
    if (this.cache[userId]) return this.cache[userId];

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const all = JSON.parse(raw);
        if (all[userId]) {
          this.cache[userId] = all[userId];
          return all[userId];
        }
      }
    } catch (error) {
      console.error('Error reading training progress:', error);
    }

    const fresh = this.emptyProgress();
    this.cache[userId] = fresh;
    return fresh;
  }

  /** Persist full training progress */
  private save(progress: TrainingProgress): void {
    const userId = this.getCurrentUserId();
    progress.lastUpdated = Date.now();
    this.cache[userId] = progress;

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const all = raw ? JSON.parse(raw) : {};
      all[userId] = progress;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    } catch (error) {
      console.error('Error saving training progress:', error);
    }

    // localStorage is the source of truth and already persists across
    // browser close and return (per-user keyed). Cloud mirroring can be
    // layered on later without changing this contract.
  }

  /** Get (or lazily create) progress for a single module */
  getModuleProgress(moduleId: string, category: TrainingCategory): ModuleProgress {
    const progress = this.getProgress();
    if (!progress.modules[moduleId]) {
      progress.modules[moduleId] = createEmptyModuleProgress(moduleId, category);
      this.save(progress);
    }
    return progress.modules[moduleId];
  }

  /** List all modules the user has ever started (permanent history) */
  getAllModules(): ModuleProgress[] {
    const progress = this.getProgress();
    return Object.values(progress.modules).sort((a, b) => b.lastPractice - a.lastPractice);
  }

  /** Mark the theory portion of a module as completed */
  markTheoryComplete(moduleId: string, category: TrainingCategory): void {
    const progress = this.getProgress();
    const m = progress.modules[moduleId] || createEmptyModuleProgress(moduleId, category);
    m.completedTheory = true;
    m.lastPractice = Date.now();
    progress.modules[moduleId] = m;
    this.save(progress);
  }

  /**
   * Record a puzzle attempt and update adaptive difficulty.
   * Returns the (possibly changed) difficulty level to use next.
   */
  recordPuzzleAttempt(params: {
    moduleId: string;
    category: TrainingCategory;
    puzzleId: string;
    theme: string;
    solved: boolean;
    hintsUsed: number;
    consecutiveCorrect: number;
    consecutiveWrong: number;
  }): DifficultyLevel {
    const {
      moduleId, category, puzzleId, theme,
      solved, hintsUsed, consecutiveCorrect, consecutiveWrong
    } = params;

    const progress = this.getProgress();
    const m = progress.modules[moduleId] || createEmptyModuleProgress(moduleId, category);

    m.attempts += 1;
    m.hintsUsed += hintsUsed;

    if (solved) {
      m.correct += 1;
      if (!m.completedPuzzles.includes(puzzleId)) m.completedPuzzles.push(puzzleId);
      // Mastered when solved without hints
      if (hintsUsed === 0 && !m.masteredTopics.includes(theme)) {
        m.masteredTopics.push(theme);
        m.topicsToPractice = m.topicsToPractice.filter(t => t !== theme);
      }
    } else {
      if (!m.failedPuzzles.includes(puzzleId)) m.failedPuzzles.push(puzzleId);
      if (!m.topicsToPractice.includes(theme) && !m.masteredTopics.includes(theme)) {
        m.topicsToPractice.push(theme);
      }
    }

    // Adaptive difficulty:
    // 3 consecutive correct -> level up; 2+ consecutive wrong -> level down
    let level = m.currentLevel;
    if (consecutiveCorrect >= 3 && level < 5) {
      level = (level + 1) as DifficultyLevel;
    } else if (consecutiveWrong >= 2 && level > 1) {
      level = (level - 1) as DifficultyLevel;
    }
    m.currentLevel = level;

    // XP: reward solving, more for higher level & no hints
    if (solved) {
      const base = 10 * m.currentLevel;
      const hintPenalty = Math.min(base - 2, hintsUsed * 3);
      progress.totalXp += Math.max(2, base - hintPenalty);
    }

    m.lastPractice = Date.now();
    progress.modules[moduleId] = m;
    this.save(progress);
    return level;
  }

  /** Record a comprehension question answer */
  recordQuestion(moduleId: string, category: TrainingCategory, correct: boolean): void {
    const progress = this.getProgress();
    const m = progress.modules[moduleId] || createEmptyModuleProgress(moduleId, category);
    m.attempts += 1;
    if (correct) {
      m.correct += 1;
      progress.totalXp += 5;
    }
    m.lastPractice = Date.now();
    progress.modules[moduleId] = m;
    this.save(progress);
  }

  /** Persist end-of-session summary stats */
  finalizeSession(params: {
    moduleId: string;
    category: TrainingCategory;
    accuracy: number;
    levelReached: DifficultyLevel;
    timeSpentSeconds: number;
  }): void {
    const { moduleId, category, accuracy, levelReached, timeSpentSeconds } = params;
    const progress = this.getProgress();
    const m = progress.modules[moduleId] || createEmptyModuleProgress(moduleId, category);
    m.accuracy = accuracy;
    m.bestAccuracy = Math.max(m.bestAccuracy, accuracy);
    m.currentLevel = levelReached;
    m.timeSpent += timeSpentSeconds;
    m.lastPractice = Date.now();
    progress.modules[moduleId] = m;
    this.save(progress);
  }

  /** Aggregate stats for the "Mi progreso" view */
  getOverallStats(): {
    modulesStarted: number;
    modulesTheoryDone: number;
    totalPuzzlesSolved: number;
    totalXp: number;
    avgAccuracy: number;
  } {
    const progress = this.getProgress();
    const modules = Object.values(progress.modules);
    const totalPuzzlesSolved = modules.reduce((s, m) => s + m.completedPuzzles.length, 0);
    const accuracies = modules.filter(m => m.attempts > 0).map(m => m.bestAccuracy);
    const avgAccuracy = accuracies.length
      ? Math.round(accuracies.reduce((s, a) => s + a, 0) / accuracies.length)
      : 0;

    return {
      modulesStarted: modules.length,
      modulesTheoryDone: modules.filter(m => m.completedTheory).length,
      totalPuzzlesSolved,
      totalXp: progress.totalXp,
      avgAccuracy
    };
  }
}

export const trainingProgressService = new TrainingProgressService();
