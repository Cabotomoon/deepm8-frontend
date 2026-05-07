/**
 * Player Profile Service
 * Manages persistent player profile and training data using localStorage
 */

import { achievementService, type UnlockedAchievement } from './achievementService';

// LocalStorage key for profiles
const STORAGE_KEY = 'chess_player_profiles';

export interface GameRecord {
  id: string;
  timestamp: number;
  accuracy: number;
  totalMoves: number;
  excellentMoves: number;
  goodMoves: number;
  inaccuracies: number;
  mistakes: number;
  blunders: number;
  playerColor: 'white' | 'black';
  result: 'win' | 'loss' | 'draw' | 'incomplete';
  moves?: string; // PGN notation for video replay generation
}

export interface WeaknessPattern {
  type: 'opening' | 'middlegame' | 'endgame' | 'tactical' | 'positional';
  description: string;
  occurrences: number;
  lastSeen: number;
}

export interface PlayerProfile {
  id: string;
  totalGames: number;
  averageAccuracy: number;
  totalMoves: number;
  strengths: string[];
  weaknesses: WeaknessPattern[];
  gameHistory: GameRecord[];
  achievements?: UnlockedAchievement[]; // Achievements unlocked by the player
  trainingPlan?: string;
  lastUpdated: number;
  createdAt: number;
}

class PlayerProfileService {
  private readonly STORAGE_KEY = STORAGE_KEY;

  constructor() {}

  /**
   * Get current user ID from auth
   */
  private getCurrentUserId(): string {
    try {
      const userStr = localStorage.getItem('chess_user_profile');
      if (userStr) {
        const user = JSON.parse(userStr);
        return user.userId || 'default';
      }
    } catch {
      // Fallback
    }
    return 'default';
  }

  /**
   * Get or create player profile
   */
  async getProfile(): Promise<PlayerProfile> {
    try {
      const userId = this.getCurrentUserId();
      const profilesStr = localStorage.getItem(this.STORAGE_KEY);

      if (profilesStr) {
        const profiles = JSON.parse(profilesStr);
        const userProfile = profiles[userId];

        if (userProfile) {
          return userProfile;
        }
      }

      // Create new profile for this user
      const newProfile: PlayerProfile = {
        id: crypto.randomUUID(),
        totalGames: 0,
        averageAccuracy: 0,
        totalMoves: 0,
        strengths: [],
        weaknesses: [],
        gameHistory: [],
        achievements: [],
        createdAt: Date.now(),
        lastUpdated: Date.now()
      };

      await this.saveProfile(newProfile);
      return newProfile;
    } catch (error) {
      console.error('Error getting profile:', error);
      // Return default profile on error
      return {
        id: crypto.randomUUID(),
        totalGames: 0,
        averageAccuracy: 0,
        totalMoves: 0,
        strengths: [],
        weaknesses: [],
        gameHistory: [],
        achievements: [],
        createdAt: Date.now(),
        lastUpdated: Date.now()
      };
    }
  }

  /**
   * Save player profile
   */
  async saveProfile(profile: PlayerProfile): Promise<void> {
    try {
      profile.lastUpdated = Date.now();

      const userId = this.getCurrentUserId();
      const profilesStr = localStorage.getItem(this.STORAGE_KEY);
      const profiles = profilesStr ? JSON.parse(profilesStr) : {};

      profiles[userId] = profile;

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(profiles));
      console.log('✅ Profile saved to localStorage for user:', userId);
    } catch (error) {
      console.error('Error saving profile:', error);
    }
  }

  /**
   * Update profile with new game data
   */
  async updateWithGame(gameRecord: GameRecord): Promise<{
    profile: PlayerProfile;
    newAchievements: UnlockedAchievement[];
  }> {
    const profile = await this.getProfile();

    // Add game to history (keep last 50 games)
    profile.gameHistory.unshift(gameRecord);
    if (profile.gameHistory.length > 50) {
      profile.gameHistory = profile.gameHistory.slice(0, 50);
    }

    // Update statistics
    profile.totalGames++;
    profile.totalMoves += gameRecord.totalMoves;

    // Recalculate average accuracy
    const totalAccuracy = profile.gameHistory.reduce((sum, game) => sum + game.accuracy, 0);
    profile.averageAccuracy = Math.round(totalAccuracy / profile.gameHistory.length);

    // Detect weakness patterns
    this.detectWeaknesses(profile, gameRecord);

    // Identify strengths
    this.identifyStrengths(profile);

    // Check for new achievements
    const newAchievements = achievementService.checkAchievements(profile, gameRecord);

    // Initialize achievements array if needed
    if (!profile.achievements) {
      profile.achievements = [];
    }

    // Add newly unlocked achievements
    profile.achievements.push(...newAchievements);

    await this.saveProfile(profile);
    return { profile, newAchievements };
  }

  /**
   * Detect weakness patterns from game data
   */
  private detectWeaknesses(profile: PlayerProfile, gameRecord: GameRecord): void {
    // Low accuracy pattern
    if (gameRecord.accuracy < 60) {
      this.addOrUpdateWeakness(profile, {
        type: 'tactical',
        description: 'Precisión táctica baja',
        occurrences: 1,
        lastSeen: Date.now()
      });
    }

    // High blunder rate
    if (gameRecord.blunders > 2) {
      this.addOrUpdateWeakness(profile, {
        type: 'tactical',
        description: 'Errores graves frecuentes',
        occurrences: 1,
        lastSeen: Date.now()
      });
    }

    // Many inaccuracies
    if (gameRecord.inaccuracies > gameRecord.totalMoves * 0.3) {
      this.addOrUpdateWeakness(profile, {
        type: 'positional',
        description: 'Comprensión posicional débil',
        occurrences: 1,
        lastSeen: Date.now()
      });
    }

    // Medium accuracy - room for improvement
    if (gameRecord.accuracy >= 60 && gameRecord.accuracy < 80) {
      this.addOrUpdateWeakness(profile, {
        type: 'tactical',
        description: 'Mejorar consistencia en movimientos críticos',
        occurrences: 1,
        lastSeen: Date.now()
      });
    }

    // Some blunders (1-2)
    if (gameRecord.blunders >= 1 && gameRecord.blunders <= 2) {
      this.addOrUpdateWeakness(profile, {
        type: 'tactical',
        description: 'Reducir errores en posiciones complejas',
        occurrences: 1,
        lastSeen: Date.now()
      });
    }

    // Some mistakes
    if (gameRecord.mistakes >= 2) {
      this.addOrUpdateWeakness(profile, {
        type: 'positional',
        description: 'Evaluar mejor las consecuencias a largo plazo',
        occurrences: 1,
        lastSeen: Date.now()
      });
    }

    // High accuracy but still has inaccuracies
    if (gameRecord.accuracy >= 80 && gameRecord.inaccuracies > 0) {
      this.addOrUpdateWeakness(profile, {
        type: 'positional',
        description: 'Perfeccionar evaluación posicional',
        occurrences: 1,
        lastSeen: Date.now()
      });
    }

    // Perfect game - suggest advanced improvement
    if (gameRecord.accuracy >= 95 && gameRecord.blunders === 0) {
      this.addOrUpdateWeakness(profile, {
        type: 'strategic',
        description: 'Explorar aperturas más agresivas',
        occurrences: 1,
        lastSeen: Date.now()
      });
    }
  }

  /**
   * Add or update weakness in profile
   */
  private addOrUpdateWeakness(profile: PlayerProfile, weakness: WeaknessPattern): void {
    const existing = profile.weaknesses.find(w => w.description === weakness.description);

    if (existing) {
      existing.occurrences++;
      existing.lastSeen = Date.now();
    } else {
      profile.weaknesses.push(weakness);
    }

    // Keep only top 5 weaknesses
    profile.weaknesses.sort((a, b) => b.occurrences - a.occurrences);
    if (profile.weaknesses.length > 5) {
      profile.weaknesses = profile.weaknesses.slice(0, 5);
    }
  }

  /**
   * Identify player strengths
   */
  private identifyStrengths(profile: PlayerProfile): void {
    const strengths: string[] = [];

    if (profile.averageAccuracy >= 85) {
      strengths.push('Precisión excepcional');
    } else if (profile.averageAccuracy >= 70) {
      strengths.push('Buena precisión táctica');
    }

    const recentGames = profile.gameHistory.slice(0, 10);
    const recentWins = recentGames.filter(g => g.result === 'win').length;

    if (recentWins >= 7) {
      strengths.push('Racha ganadora consistente');
    }

    const avgBlunders = profile.gameHistory.reduce((sum, g) => sum + (g.blunders || 0), 0) / profile.gameHistory.length;
    if (avgBlunders < 1) {
      strengths.push('Excelente control de errores');
    }

    profile.strengths = strengths;
  }

  /**
   * Get improvement trend
   */
  getImprovementTrend(profile: PlayerProfile): 'improving' | 'stable' | 'declining' {
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

export const playerProfileService = new PlayerProfileService();
