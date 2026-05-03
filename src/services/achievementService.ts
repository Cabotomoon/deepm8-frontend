/**
 * Achievements & Badges Service
 * Gamification system for chess training
 */

import type { PlayerProfile, GameRecord } from './playerProfileService';

export type AchievementCategory = 'accuracy' | 'consistency' | 'improvement' | 'volume' | 'special';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  condition: (profile: PlayerProfile, newGame?: GameRecord) => boolean;
  reward?: string; // Optional reward message
}

export interface UnlockedAchievement {
  achievementId: string;
  unlockedAt: number;
  isNew?: boolean; // For showing notifications
}

class AchievementService {
  /**
   * All available achievements
   */
  private achievements: Achievement[] = [
    // === ACCURACY ACHIEVEMENTS ===
    {
      id: 'first_perfect',
      name: '¡Perfección!',
      description: 'Logra 100% de precisión en una partida',
      icon: '💯',
      category: 'accuracy',
      rarity: 'legendary',
      condition: (_, game) => game ? game.accuracy === 100 : false,
      reward: 'Maestría táctica perfecta'
    },
    {
      id: 'high_accuracy_10',
      name: 'Precisión Superior',
      description: 'Consigue 10 partidas con +80% de precisión',
      icon: '🎯',
      category: 'accuracy',
      rarity: 'epic',
      condition: (profile) => {
        return profile.gameHistory.filter(g => g.accuracy >= 80).length >= 10;
      }
    },
    {
      id: 'accuracy_master',
      name: 'Maestro de la Precisión',
      description: 'Mantén un promedio de 85%+ durante 20 partidas',
      icon: '👑',
      category: 'accuracy',
      rarity: 'legendary',
      condition: (profile) => {
        if (profile.gameHistory.length < 20) return false;
        const recent20 = profile.gameHistory.slice(0, 20);
        const avg = recent20.reduce((sum, g) => sum + g.accuracy, 0) / 20;
        return avg >= 85;
      }
    },
    {
      id: 'no_blunders',
      name: 'Sin Errores Graves',
      description: 'Completa 5 partidas seguidas sin blunders',
      icon: '🛡️',
      category: 'accuracy',
      rarity: 'rare',
      condition: (profile) => {
        if (profile.gameHistory.length < 5) return false;
        const recent5 = profile.gameHistory.slice(0, 5);
        return recent5.every(g => g.blunders === 0);
      }
    },

    // === CONSISTENCY ACHIEVEMENTS ===
    {
      id: 'win_streak_3',
      name: 'Racha Ganadora',
      description: 'Gana 3 partidas consecutivas',
      icon: '🔥',
      category: 'consistency',
      rarity: 'common',
      condition: (profile) => {
        if (profile.gameHistory.length < 3) return false;
        const recent3 = profile.gameHistory.slice(0, 3);
        return recent3.every(g => g.result === 'win');
      }
    },
    {
      id: 'win_streak_5',
      name: 'Imparable',
      description: 'Gana 5 partidas consecutivas',
      icon: '⚡',
      category: 'consistency',
      rarity: 'rare',
      condition: (profile) => {
        if (profile.gameHistory.length < 5) return false;
        const recent5 = profile.gameHistory.slice(0, 5);
        return recent5.every(g => g.result === 'win');
      }
    },
    {
      id: 'consistent_player',
      name: 'Jugador Consistente',
      description: 'Mantén precisión entre 70-90% en 10 partidas seguidas',
      icon: '📊',
      category: 'consistency',
      rarity: 'rare',
      condition: (profile) => {
        if (profile.gameHistory.length < 10) return false;
        const recent10 = profile.gameHistory.slice(0, 10);
        return recent10.every(g => g.accuracy >= 70 && g.accuracy <= 90);
      }
    },
    {
      id: 'daily_player',
      name: 'Entrenamiento Diario',
      description: 'Juega al menos 1 partida durante 7 días seguidos',
      icon: '📅',
      category: 'consistency',
      rarity: 'epic',
      condition: (profile) => {
        if (profile.gameHistory.length < 7) return false;

        // Check if games are on different days
        const dates = profile.gameHistory
          .slice(0, 7)
          .map(g => new Date(g.timestamp).toDateString());

        const uniqueDates = new Set(dates);
        return uniqueDates.size >= 7;
      }
    },

    // === IMPROVEMENT ACHIEVEMENTS ===
    {
      id: 'rising_star',
      name: 'Estrella Ascendente',
      description: 'Mejora tu precisión promedio en 15% o más',
      icon: '⭐',
      category: 'improvement',
      rarity: 'epic',
      condition: (profile) => {
        if (profile.gameHistory.length < 10) return false;

        const recent5 = profile.gameHistory.slice(0, 5);
        const older5 = profile.gameHistory.slice(10, 15);

        if (older5.length < 5) return false;

        const recentAvg = recent5.reduce((sum, g) => sum + g.accuracy, 0) / 5;
        const olderAvg = older5.reduce((sum, g) => sum + g.accuracy, 0) / 5;

        return (recentAvg - olderAvg) >= 15;
      }
    },
    {
      id: 'comeback_king',
      name: 'Rey del Regreso',
      description: 'Mejora de <60% a >80% en precisión',
      icon: '👑',
      category: 'improvement',
      rarity: 'legendary',
      condition: (profile) => {
        const hasLowGame = profile.gameHistory.some(g => g.accuracy < 60);
        const recent3 = profile.gameHistory.slice(0, 3);
        const hasHighRecent = recent3.every(g => g.accuracy > 80);

        return hasLowGame && hasHighRecent;
      }
    },
    {
      id: 'learning_curve',
      name: 'Curva de Aprendizaje',
      description: 'Reduce tus blunders promedio a la mitad',
      icon: '📈',
      category: 'improvement',
      rarity: 'rare',
      condition: (profile) => {
        if (profile.gameHistory.length < 20) return false;

        const recent10 = profile.gameHistory.slice(0, 10);
        const older10 = profile.gameHistory.slice(10, 20);

        const recentBlunders = recent10.reduce((sum, g) => sum + g.blunders, 0) / 10;
        const olderBlunders = older10.reduce((sum, g) => sum + g.blunders, 0) / 10;

        return olderBlunders > 0 && recentBlunders <= (olderBlunders / 2);
      }
    },

    // === VOLUME ACHIEVEMENTS ===
    {
      id: 'first_game',
      name: 'Primera Partida',
      description: 'Completa tu primera partida analizada',
      icon: '🎮',
      category: 'volume',
      rarity: 'common',
      condition: (profile) => profile.totalGames >= 1
    },
    {
      id: 'veteran_10',
      name: 'Veterano',
      description: 'Completa 10 partidas',
      icon: '🏅',
      category: 'volume',
      rarity: 'common',
      condition: (profile) => profile.totalGames >= 10
    },
    {
      id: 'expert_50',
      name: 'Experto',
      description: 'Completa 50 partidas',
      icon: '🎖️',
      category: 'volume',
      rarity: 'rare',
      condition: (profile) => profile.totalGames >= 50
    },
    {
      id: 'master_100',
      name: 'Maestro del Tablero',
      description: 'Completa 100 partidas',
      icon: '🏆',
      category: 'volume',
      rarity: 'epic',
      condition: (profile) => profile.totalGames >= 100
    },
    {
      id: 'grandmaster_500',
      name: 'Gran Maestro',
      description: 'Completa 500 partidas',
      icon: '👨‍🏫',
      category: 'volume',
      rarity: 'legendary',
      condition: (profile) => profile.totalGames >= 500
    },

    // === SPECIAL ACHIEVEMENTS ===
    {
      id: 'tactical_genius',
      name: 'Genio Táctico',
      description: 'Consigue 20+ movimientos excelentes en una partida',
      icon: '🧠',
      category: 'special',
      rarity: 'epic',
      condition: (_, game) => game ? game.excellentMoves >= 20 : false
    },
    {
      id: 'flawless_victory',
      name: 'Victoria Impecable',
      description: 'Gana con 95%+ de precisión y 0 blunders',
      icon: '✨',
      category: 'special',
      rarity: 'legendary',
      condition: (_, game) => {
        return game ? (game.accuracy >= 95 && game.blunders === 0 && game.result === 'win') : false;
      }
    },
    {
      id: 'comeback_master',
      name: 'Maestro de la Remontada',
      description: 'Gana después de tener 3+ blunders',
      icon: '🎭',
      category: 'special',
      rarity: 'legendary',
      condition: (_, game) => {
        return game ? (game.blunders >= 3 && game.result === 'win') : false;
      }
    },
    {
      id: 'marathon_player',
      name: 'Maratonista',
      description: 'Completa una partida de más de 50 movimientos',
      icon: '🏃',
      category: 'special',
      rarity: 'rare',
      condition: (_, game) => game ? game.totalMoves >= 50 : false
    },
    {
      id: 'both_colors',
      name: 'Maestro de Ambos Colores',
      description: 'Gana 3+ partidas con blancas y 3+ con negras',
      icon: '⚖️',
      category: 'special',
      rarity: 'rare',
      condition: (profile) => {
        const whiteWins = profile.gameHistory.filter(g =>
          g.playerColor === 'white' && g.result === 'win'
        ).length;
        const blackWins = profile.gameHistory.filter(g =>
          g.playerColor === 'black' && g.result === 'win'
        ).length;

        return whiteWins >= 3 && blackWins >= 3;
      }
    }
  ];

  /**
   * Check for newly unlocked achievements
   */
  checkAchievements(
    profile: PlayerProfile,
    newGame?: GameRecord
  ): UnlockedAchievement[] {
    const currentlyUnlocked = profile.achievements || [];
    const currentIds = new Set(currentlyUnlocked.map(a => a.achievementId));
    const newlyUnlocked: UnlockedAchievement[] = [];

    for (const achievement of this.achievements) {
      // Skip if already unlocked
      if (currentIds.has(achievement.id)) continue;

      // Check if condition is met
      if (achievement.condition(profile, newGame)) {
        newlyUnlocked.push({
          achievementId: achievement.id,
          unlockedAt: Date.now(),
          isNew: true
        });
      }
    }

    return newlyUnlocked;
  }

  /**
   * Get achievement details by ID
   */
  getAchievement(id: string): Achievement | undefined {
    return this.achievements.find(a => a.id === id);
  }

  /**
   * Get all achievements
   */
  getAllAchievements(): Achievement[] {
    return this.achievements;
  }

  /**
   * Get achievement statistics
   */
  getStats(profile: PlayerProfile): {
    total: number;
    unlocked: number;
    percentage: number;
    byRarity: Record<string, { total: number; unlocked: number }>;
    byCategory: Record<string, { total: number; unlocked: number }>;
  } {
    const unlockedIds = new Set((profile.achievements || []).map(a => a.achievementId));

    const byRarity: Record<string, { total: number; unlocked: number }> = {
      common: { total: 0, unlocked: 0 },
      rare: { total: 0, unlocked: 0 },
      epic: { total: 0, unlocked: 0 },
      legendary: { total: 0, unlocked: 0 }
    };

    const byCategory: Record<string, { total: number; unlocked: number }> = {
      accuracy: { total: 0, unlocked: 0 },
      consistency: { total: 0, unlocked: 0 },
      improvement: { total: 0, unlocked: 0 },
      volume: { total: 0, unlocked: 0 },
      special: { total: 0, unlocked: 0 }
    };

    for (const achievement of this.achievements) {
      byRarity[achievement.rarity].total++;
      byCategory[achievement.category].total++;

      if (unlockedIds.has(achievement.id)) {
        byRarity[achievement.rarity].unlocked++;
        byCategory[achievement.category].unlocked++;
      }
    }

    return {
      total: this.achievements.length,
      unlocked: unlockedIds.size,
      percentage: Math.round((unlockedIds.size / this.achievements.length) * 100),
      byRarity,
      byCategory
    };
  }

  /**
   * Get rarity color
   */
  getRarityColor(rarity: Achievement['rarity']): string {
    switch (rarity) {
      case 'common': return 'text-slate-400 border-slate-600';
      case 'rare': return 'text-blue-400 border-blue-600';
      case 'epic': return 'text-purple-400 border-purple-600';
      case 'legendary': return 'text-yellow-400 border-yellow-600';
    }
  }

  /**
   * Get rarity label
   */
  getRarityLabel(rarity: Achievement['rarity']): string {
    switch (rarity) {
      case 'common': return 'Común';
      case 'rare': return 'Raro';
      case 'epic': return 'Épico';
      case 'legendary': return 'Legendario';
    }
  }
}

export const achievementService = new AchievementService();
