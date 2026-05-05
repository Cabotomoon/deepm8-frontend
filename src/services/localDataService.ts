/**
 * Local Data Service - Mock implementation for development
 * Uses localStorage instead of @seaverse/data-sdk
 */

import type { UserProfile, GameHistory, PieceStatistics, LeaderboardEntry } from './dataService';

// Local storage keys
const STORAGE_KEYS = {
  PROFILES: 'chess_local_profiles',
  GAME_HISTORY: 'chess_local_game_history',
  PIECE_STATS: 'chess_local_piece_stats',
  LEADERBOARD: 'chess_local_leaderboard'
};

// Helper to get data from localStorage
function getLocalData<T>(key: string): T[] {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error(`Error reading ${key}:`, error);
    return [];
  }
}

// Helper to save data to localStorage
function setLocalData<T>(key: string, data: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Error saving ${key}:`, error);
  }
}

// User Profile Operations
export async function createUserProfile(data: {
  userId: string;
  name: string;
  email: string;
  avatar?: string;
  initialElo: number;
}): Promise<UserProfile> {
  console.log('📝 [LOCAL] createUserProfile called with data:', data);

  const profiles = getLocalData<UserProfile>(STORAGE_KEYS.PROFILES);

  // Check if profile already exists for this userId
  const existing = profiles.find(p => p.userId === data.userId);
  if (existing) {
    console.log('✅ [LOCAL] Profile already exists:', existing);
    return existing;
  }

  // Check if username is already taken by another user
  const nameTaken = profiles.find(
    p => p.name.toLowerCase() === data.name.toLowerCase() && p.userId !== data.userId
  );
  if (nameTaken) {
    throw new Error(`El nombre "${data.name}" ya está en uso. Por favor elige otro nombre.`);
  }

  const profile: UserProfile = {
    id: `profile_${Date.now()}`,
    userId: data.userId,
    name: data.name,
    email: data.email,
    avatar: data.avatar || '',
    eloRating: data.initialElo,
    initialElo: data.initialElo,
    totalGames: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  profiles.push(profile);
  setLocalData(STORAGE_KEYS.PROFILES, profiles);

  console.log('✅ [LOCAL] Profile created successfully:', profile);
  return profile;
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const profiles = getLocalData<UserProfile>(STORAGE_KEYS.PROFILES);
  return profiles.find(p => p.userId === userId) || null;
}

export async function checkUsernameAvailable(username: string, excludeUserId?: string): Promise<boolean> {
  const profiles = getLocalData<UserProfile>(STORAGE_KEYS.PROFILES);
  const exists = profiles.some(
    p => p.name.toLowerCase() === username.toLowerCase() && p.userId !== excludeUserId
  );
  return !exists;
}

export async function updateUserProfile(
  id: string,
  updates: Partial<UserProfile>
): Promise<void> {
  const profiles = getLocalData<UserProfile>(STORAGE_KEYS.PROFILES);
  const index = profiles.findIndex(p => p.id === id);

  if (index !== -1) {
    profiles[index] = {
      ...profiles[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    setLocalData(STORAGE_KEYS.PROFILES, profiles);
  }
}

// Game History Operations
export async function saveGameHistory(data: {
  whitePlayerId: string;
  whitePlayerName: string;
  blackPlayerId: string;
  blackPlayerName: string;
  moves: string[];
  result: 'white' | 'black' | 'draw';
  whiteEloChange: number;
  blackEloChange: number;
  whiteEloBefore: number;
  blackEloBefore: number;
  pgn: string;
  duration: number;
}): Promise<GameHistory> {
  const games = getLocalData<GameHistory>(STORAGE_KEYS.GAME_HISTORY);

  const game: GameHistory = {
    id: `game_${Date.now()}`,
    gameId: `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    whitePlayerId: data.whitePlayerId,
    whitePlayerName: data.whitePlayerName,
    blackPlayerId: data.blackPlayerId,
    blackPlayerName: data.blackPlayerName,
    moves: data.moves,
    result: data.result,
    whiteEloChange: data.whiteEloChange,
    blackEloChange: data.blackEloChange,
    whiteEloBefore: data.whiteEloBefore,
    blackEloBefore: data.blackEloBefore,
    timestamp: new Date().toISOString(),
    pgn: data.pgn,
    duration: data.duration
  };

  games.push(game);
  setLocalData(STORAGE_KEYS.GAME_HISTORY, games);

  return game;
}

export async function getGameHistory(userId: string, limit: number = 20): Promise<GameHistory[]> {
  const games = getLocalData<GameHistory>(STORAGE_KEYS.GAME_HISTORY);

  return games
    .filter(g => g.whitePlayerId === userId || g.blackPlayerId === userId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}

export async function getGameById(gameId: string): Promise<GameHistory | null> {
  const games = getLocalData<GameHistory>(STORAGE_KEYS.GAME_HISTORY);
  return games.find(g => g.gameId === gameId) || null;
}

// Piece Statistics Operations
export async function updatePieceStats(
  userId: string,
  pieceType: string,
  action: 'capture' | 'loss' | 'move'
): Promise<void> {
  const stats = getLocalData<PieceStatistics>(STORAGE_KEYS.PIECE_STATS);
  const index = stats.findIndex(s => s.userId === userId && s.pieceType === pieceType);

  if (index !== -1) {
    const current = stats[index];
    stats[index] = {
      ...current,
      captures: action === 'capture' ? current.captures + 1 : current.captures,
      losses: action === 'loss' ? current.losses + 1 : current.losses,
      moves: action === 'move' ? current.moves + 1 : current.moves
    };
  } else {
    stats.push({
      id: `stats_${Date.now()}`,
      userId,
      pieceType: pieceType as any,
      captures: action === 'capture' ? 1 : 0,
      losses: action === 'loss' ? 1 : 0,
      moves: action === 'move' ? 1 : 0
    });
  }

  setLocalData(STORAGE_KEYS.PIECE_STATS, stats);
}

export async function getPieceStats(userId: string): Promise<PieceStatistics[]> {
  const stats = getLocalData<PieceStatistics>(STORAGE_KEYS.PIECE_STATS);
  return stats.filter(s => s.userId === userId);
}

// Leaderboard Operations
export async function updateLeaderboard(profile: UserProfile): Promise<void> {
  const leaderboard = getLocalData<LeaderboardEntry>(STORAGE_KEYS.LEADERBOARD);
  const index = leaderboard.findIndex(e => e.userId === profile.userId);

  const winRate = profile.totalGames > 0
    ? (profile.wins / profile.totalGames) * 100
    : 0;

  const entry: LeaderboardEntry = {
    id: profile.id,
    userId: profile.userId,
    name: profile.name,
    avatar: profile.avatar,
    eloRating: profile.eloRating,
    totalGames: profile.totalGames,
    wins: profile.wins,
    losses: profile.losses,
    draws: profile.draws,
    winRate,
    rank: 0 // Will be calculated in getLeaderboard
  };

  if (index !== -1) {
    leaderboard[index] = entry;
  } else {
    leaderboard.push(entry);
  }

  setLocalData(STORAGE_KEYS.LEADERBOARD, leaderboard);
}

export async function getLeaderboard(limit: number = 100): Promise<LeaderboardEntry[]> {
  const leaderboard = getLocalData<LeaderboardEntry>(STORAGE_KEYS.LEADERBOARD);

  return leaderboard
    .sort((a, b) => b.eloRating - a.eloRating)
    .slice(0, limit)
    .map((entry, index) => ({
      ...entry,
      rank: index + 1
    }));
}

// Clear all game history (for debugging/reset)
export async function clearAllGameHistory(): Promise<void> {
  console.log('🗑️ [LOCAL] Clearing all game history');
  localStorage.removeItem(STORAGE_KEYS.GAME_HISTORY);
}

// Export all functions from dataService.ts that don't involve API calls
export { calculateEloChange, getKFactor, generatePGN } from './dataService';

// Import the re-exported functions for the default export
import { calculateEloChange, getKFactor, generatePGN } from './dataService';

// Default export for compatibility
const localDataService = {
  createUserProfile,
  getUserProfile,
  checkUsernameAvailable,
  updateUserProfile,
  saveGameHistory,
  getGameHistory,
  getGameById,
  updatePieceStats,
  getPieceStats,
  updateLeaderboard,
  getLeaderboard,
  clearAllGameHistory,
  calculateEloChange,
  getKFactor,
  generatePGN
};

export default localDataService;
