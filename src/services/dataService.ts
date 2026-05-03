import { DataClient } from '@seaverse/data-sdk';

/**
 * Global DataClient instance
 * In production: auto-initializes via PostMessage from parent iframe
 * In development: uses explicit appId from environment
 */
let dataClient: DataClient | null = null;

/**
 * Initialize DataClient with development configuration
 */
async function getDataClient(): Promise<DataClient> {
  if (dataClient) {
    return dataClient;
  }

  const isDev = import.meta.env.DEV || window.location.hostname === 'localhost';

  if (isDev) {
    // Development mode: pass appId and token explicitly
    const appId = import.meta.env.VITE_APP_ID || 'chess-clash-dev-local';
    const token = localStorage.getItem('seaverse_token') || localStorage.getItem('chess_auth_token');

    if (!token) {
      throw new Error('No se encontró token de autenticación. Por favor inicia sesión nuevamente.');
    }

    console.log('🔧 Initializing DataClient in DEV mode');
    console.log('  - appId:', appId);
    console.log('  - token:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN');

    dataClient = await DataClient.create({ appId, token });
  } else {
    // Production mode: auto-initialize via PostMessage
    console.log('🚀 Initializing DataClient in PROD mode (PostMessage)');
    dataClient = await DataClient.create();
  }

  return dataClient;
}

// Types for data structures
export interface UserProfile {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatar?: string;
  eloRating: number;
  initialElo: number;
  totalGames: number;
  wins: number;
  losses: number;
  draws: number;
  createdAt: string;
  updatedAt: string;
}

export interface GameHistory {
  id: string;
  gameId: string;
  whitePlayerId: string;
  whitePlayerName: string;
  blackPlayerId: string;
  blackPlayerName: string;
  moves: string[]; // Array of algebraic notation
  result: 'white' | 'black' | 'draw';
  whiteEloChange: number;
  blackEloChange: number;
  whiteEloBefore: number;
  blackEloBefore: number;
  timestamp: string;
  pgn: string;
  duration: number; // in seconds
}

export interface PieceStatistics {
  id: string;
  userId: string;
  pieceType: 'pawn' | 'knight' | 'bishop' | 'rook' | 'queen' | 'king';
  captures: number;
  losses: number;
  moves: number;
}

export interface LeaderboardEntry {
  id: string;
  userId: string;
  name: string;
  avatar?: string;
  eloRating: number;
  totalGames: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  rank: number;
}

// FIDE ELO calculation
export function calculateEloChange(
  playerRating: number,
  opponentRating: number,
  result: number, // 1 = win, 0.5 = draw, 0 = loss
  kFactor: number = 32
): number {
  const expectedScore = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
  const rawChange = kFactor * (result - expectedScore);
  let eloChange = Math.round(rawChange);

  // 🛡️ FIDE Rule: Minimum change of ±1 point for wins/losses (not draws)
  // This prevents 0 change when playing against much stronger/weaker opponents
  if (result === 1 && eloChange === 0) {
    eloChange = 1; // Victory always gives at least +1
  } else if (result === 0 && eloChange === 0) {
    eloChange = -1; // Defeat always costs at least -1
  }
  // Draws can remain 0 if the calculation rounds to 0

  // 🔍 DEBUG: Detailed ELO calculation
  console.log('🧮 Detailed ELO calculation:', {
    playerRating,
    opponentRating,
    kFactor,
    result,
    expectedScore: expectedScore.toFixed(4),
    rawChange: rawChange.toFixed(2),
    eloChange,
    formula: `${kFactor} * (${result} - ${expectedScore.toFixed(4)}) = ${rawChange.toFixed(2)} → ${eloChange}`
  });

  return eloChange;
}

// Get K-factor based on rating (FIDE rules)
export function getKFactor(rating: number, gamesPlayed: number): number {
  if (gamesPlayed < 30) return 40; // New players
  if (rating < 2400) return 20; // Regular players
  return 10; // Masters and above
}

// User Profile Operations
export async function createUserProfile(data: {
  userId: string;
  name: string;
  email: string;
  avatar?: string;
  initialElo: number;
}): Promise<UserProfile> {
  console.log('📝 createUserProfile called with data:', data);

  // Check if token is available
  const token = localStorage.getItem('seaverse_token') || localStorage.getItem('chess_auth_token');
  console.log('🔑 Token available:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN');

  if (!token) {
    console.error('❌ No authentication token found');
    throw new Error('No se encontró token de autenticación. Por favor inicia sesión nuevamente.');
  }

  try {
    const profileData = {
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

    console.log('📤 Sending to data-sdk:', profileData);

    const client = await getDataClient();
    const result = await client.create({
      table_name: 'chess_user_profiles',
      visibility: 'private',
      data_value: profileData
    });

    console.log('✅ Profile created successfully:', result);

    // Verify result has necessary fields
    if (!result || typeof result !== 'object') {
      throw new Error('Invalid response from data-sdk');
    }

    return result as any;
  } catch (error) {
    console.error('❌ Error in createUserProfile:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      });
    }
    throw error;
  }
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const client = await getDataClient();
  const results = await client.query({
    table_name: 'chess_user_profiles',
    filters: {
      data: { userId }
    }
  });
  return results.length > 0 ? (results[0] as any) : null;
}

export async function updateUserProfile(
  id: string,
  updates: Partial<UserProfile>
): Promise<void> {
  const client = await getDataClient();
  await client.update(id, {
    data_value: {
      ...updates,
      updatedAt: new Date().toISOString()
    }
  });
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
  const gameId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const client = await getDataClient();
  const result = await client.create({
    table_name: 'chess_game_history',
    visibility: 'private',
    data_value: {
      gameId,
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
    }
  });

  return result as any;
}

export async function getGameHistory(userId: string, limit: number = 20): Promise<GameHistory[]> {
  const client = await getDataClient();
  const results = await client.query({
    table_name: 'chess_game_history',
    order: { field: 'created_at', direction: 'desc' },
    pagination: { limit, offset: 0 }
  });

  // Filter games where user participated
  return (results as any[]).filter(
    game => game.data_value.whitePlayerId === userId || game.data_value.blackPlayerId === userId
  ).map(r => r.data_value);
}

export async function getGameById(gameId: string): Promise<GameHistory | null> {
  const client = await getDataClient();
  const results = await client.query({
    table_name: 'chess_game_history',
    filters: {
      data: { gameId }
    }
  });
  return results.length > 0 ? (results[0] as any).data_value : null;
}

// Piece Statistics Operations
export async function updatePieceStats(
  userId: string,
  pieceType: string,
  action: 'capture' | 'loss' | 'move'
): Promise<void> {
  const client = await getDataClient();

  // Get existing stats
  const results = await client.query({
    table_name: 'chess_piece_stats',
    filters: {
      data: { userId, pieceType }
    }
  });

  if (results.length > 0) {
    const stats = (results[0] as any).data_value;
    const id = (results[0] as any).id;

    await client.update(id, {
      data_value: {
        userId,
        pieceType,
        captures: action === 'capture' ? stats.captures + 1 : stats.captures,
        losses: action === 'loss' ? stats.losses + 1 : stats.losses,
        moves: action === 'move' ? stats.moves + 1 : stats.moves
      }
    });
  } else {
    // Create new stats
    await client.create({
      table_name: 'chess_piece_stats',
      visibility: 'private',
      data_value: {
        userId,
        pieceType,
        captures: action === 'capture' ? 1 : 0,
        losses: action === 'loss' ? 1 : 0,
        moves: action === 'move' ? 1 : 0
      }
    });
  }
}

export async function getPieceStats(userId: string): Promise<PieceStatistics[]> {
  const client = await getDataClient();
  const results = await client.query({
    table_name: 'chess_piece_stats',
    filters: {
      data: { userId }
    }
  });

  return (results as any[]).map(r => r.data_value);
}

// Leaderboard Operations
export async function updateLeaderboard(profile: UserProfile): Promise<void> {
  const client = await getDataClient();

  // Check if leaderboard entry exists
  const results = await client.query({
    table_name: 'chess_leaderboard',
    filters: {
      data: { userId: profile.userId }
    }
  });

  const winRate = profile.totalGames > 0
    ? (profile.wins / profile.totalGames) * 100
    : 0;

  const leaderboardData = {
    userId: profile.userId,
    name: profile.name,
    avatar: profile.avatar,
    eloRating: profile.eloRating,
    totalGames: profile.totalGames,
    wins: profile.wins,
    losses: profile.losses,
    draws: profile.draws,
    winRate
  };

  if (results.length > 0) {
    await client.update((results[0] as any).id, {
      visibility: 'public',
      data_value: leaderboardData
    });
  } else {
    await client.create({
      table_name: 'chess_leaderboard',
      visibility: 'public',
      data_value: leaderboardData
    });
  }
}

export async function getLeaderboard(limit: number = 100): Promise<LeaderboardEntry[]> {
  const client = await getDataClient();
  const results = await client.query({
    table_name: 'chess_leaderboard',
    filters: { visibility: 'public' },
    pagination: { limit, offset: 0 }
  });

  // Sort by ELO and add rank
  const sorted = (results as any[])
    .map(r => r.data_value)
    .sort((a, b) => b.eloRating - a.eloRating);

  return sorted.map((entry, index) => ({
    ...entry,
    rank: index + 1
  }));
}

// Generate PGN (Portable Game Notation)
export function generatePGN(
  whitePlayer: string,
  blackPlayer: string,
  moves: string[],
  result: 'white' | 'black' | 'draw'
): string {
  const date = new Date().toISOString().split('T')[0];
  const resultStr = result === 'white' ? '1-0' : result === 'black' ? '0-1' : '1/2-1/2';

  let pgn = `[Event "Chess Clash Game"]\n`;
  pgn += `[Site "Chess Clash"]\n`;
  pgn += `[Date "${date}"]\n`;
  pgn += `[White "${whitePlayer}"]\n`;
  pgn += `[Black "${blackPlayer}"]\n`;
  pgn += `[Result "${resultStr}"]\n\n`;

  // Format moves in pairs
  for (let i = 0; i < moves.length; i += 2) {
    const moveNumber = Math.floor(i / 2) + 1;
    pgn += `${moveNumber}. ${moves[i]}`;
    if (i + 1 < moves.length) {
      pgn += ` ${moves[i + 1]}`;
    }
    pgn += ' ';
  }

  pgn += resultStr;

  return pgn;
}
