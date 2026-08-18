/**
 * Chess Game Hook - Integrates all game logic, AI, persistence, and statistics
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  saveAuth,
  loadAuth,
  restoreSession,
  handleAuthRedirect,
  hasPendingAuthRedirect,
  logout as backendLogout,
  type AuthUserProfile,
  type AuthResult
} from '../services/authService';
import { getUsernameForUser } from '../services/usernameService';
import {
  hasMigratableProfile,
  getBestLegacyProfile,
  isMigrationDone,
  markMigrationDone,
  buildMigratedStats
} from '../services/localProfileMigration';
import {
  createUserProfile,
  getUserProfile,
  saveGameHistory,
  getGameHistory,
  updateUserProfile,
  updatePieceStats,
  getPieceStats,
  updateLeaderboard,
  calculateEloChange,
  getKFactor,
  generatePGN,
  type UserProfile,
  type PieceStatistics,
  type GameHistory
} from '../services/localDataService';
import { getOpeningMove, getOpeningName } from '../services/openingBook';
import { generateVictoryImage, type VictoryImageData } from '../services/victoryImageService';
import stockfish, { type Difficulty } from '../services/stockfishService';

type PieceType = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';
type PieceColor = 'white' | 'black';
type GameMode =
  | 'loading'
  | 'auth'
  | 'email-verify'
  | 'username'
  | 'menu'
  | 'pvp'
  | 'ai'
  | 'online'
  | 'online-lobby'
  | 'tutorial'
  | 'replay'
  | 'user-selection'
  | 'elo-selection'
  | 'stats'
  | 'victory';

// Study recommendations types
export interface StudyRecommendation {
  icon: string;
  title: string;
  description: string;
  timeEstimate: string;
  priority: number; // 1-100, higher = more urgent
  category: 'openings' | 'tactics' | 'endgames' | 'middlegame';
  reason: string;
}

export interface StudyAnalysis {
  openingScore: number;
  tacticsScore: number;
  endgameScore: number;
  timeManagementScore: number;
  defenseScore: number;
  recommendations: StudyRecommendation[];
}

interface ChessPiece {
  type: PieceType;
  color: PieceColor;
  hasMoved?: boolean;
}

interface Position {
  row: number;
  col: number;
}

type Board = (ChessPiece | null)[][];

interface GameState {
  board: Board;
  currentPlayer: PieceColor;
  gameStatus: 'playing' | 'check' | 'checkmate' | 'stalemate';
  whiteTime: number;
  blackTime: number;
}

export function useChessGame() {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUserProfile | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  // Email pending verification (kept in memory only, never as a credential)
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);

  // Game mode - Start in loading while we restore the backend session
  const [gameMode, setGameMode] = useState<GameMode>('loading');

  // Statistics
  const [pieceStats, setPieceStats] = useState<PieceStatistics[]>([]);
  const [showStats, setShowStats] = useState(false);

  // Victory image
  const [victoryImageUrl, setVictoryImageUrl] = useState<string | null>(null);
  const [showVictoryScreen, setShowVictoryScreen] = useState(false);

  // Last game info (for victory/defeat screen)
  const [lastGameInfo, setLastGameInfo] = useState<{
    eloChange: number;
    newElo: number;
    opponentName: string;
    opponentElo: number;
    moves: string[];
    duration: number;
    endReason?: 'checkmate' | 'timeout' | 'resignation' | 'abandonment' | 'stalemate';
  } | null>(null);

  // Game history
  const [gameHistory, setGameHistory] = useState<GameHistory[]>([]);

  // Load game history when user profile is available
  useEffect(() => {
    const loadGameHistory = async () => {
      if (userProfile) {
        console.log('📚 Loading game history for user:', userProfile.userId);
        const history = await getGameHistory(userProfile.userId, 50); // Load last 50 games
        console.log(`✅ Loaded ${history.length} games`);
        setGameHistory(history);
      } else {
        setGameHistory([]);
      }
    };
    loadGameHistory();
  }, [userProfile]);

  // Log when showVictoryScreen changes
  useEffect(() => {
    console.log('🎯 showVictoryScreen changed to:', showVictoryScreen);
  }, [showVictoryScreen]);

  // Game start timestamp
  const gameStartTime = useRef<number>(Date.now());

  // Prevent duplicate saveGame calls for the same game
  const lastSavedGameId = useRef<string | null>(null);

  /**
   * Non-destructive migration: if an authenticated user has no backend profile
   * yet but legacy local progress exists on this device, adopt it once under
   * the new userId. Returns the created profile, or null if nothing to migrate.
   */
  const tryMigrateLegacyProfile = useCallback(
    async (user: AuthUserProfile): Promise<UserProfile | null> => {
      if (isMigrationDone(user.userId)) return null;
      if (!hasMigratableProfile()) return null;
      const legacy = getBestLegacyProfile();
      if (!legacy) return null;

      try {
        const { initialElo, carry } = buildMigratedStats(legacy);
        // Create the profile under the real identity, then apply carried stats
        const created = await createUserProfile({
          userId: user.userId,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          initialElo
        });
        const merged = { ...created, ...carry, updatedAt: new Date().toISOString() };
        await updateUserProfile(created.id, merged);
        markMigrationDone(user.userId);
        console.log('📦 Migrated legacy local progress to account:', user.userId);
        return merged as UserProfile;
      } catch (e) {
        console.warn('Legacy migration skipped:', e);
        markMigrationDone(user.userId);
        return null;
      }
    },
    []
  );

  /**
   * Route an authenticated session to the correct next screen.
   *  needs username → 'username'
   *  has username + profile → 'menu'
   *  has username, no profile yet → 'elo-selection'
   * Identity is the backend userId; username uniqueness is backend-enforced.
   */
  const routeAfterAuth = useCallback(async (auth: AuthResult) => {
    setAuthToken(auth.token);
    setAuthUser(auth.user);
    saveAuth(auth.token, auth.user); // cache display info (token already persisted)
    setIsAuthenticated(true);
    setPendingVerificationEmail(null);

    if (!auth.emailVerified) {
      setPendingVerificationEmail(auth.user.email);
      setGameMode('email-verify');
      return;
    }

    // Resolve the globally-unique username from the backend (source of truth)
    let username: string | null = auth.user.username || null;
    try {
      const record = await getUsernameForUser(auth.user.userId);
      if (record?.username) username = record.username;
    } catch {
      // If the lookup fails we fall back to whatever the account carries
    }

    if (!username) {
      setGameMode('username');
      return;
    }

    // Keep authUser name in sync with the reserved username
    const syncedUser = { ...auth.user, name: username, username };
    setAuthUser(syncedUser);
    saveAuth(auth.token, syncedUser);

    // Load the player profile (ELO / stats) linked to this userId
    const profile = await getUserProfile(auth.user.userId);
    if (profile) {
      setUserProfile(profile);
      setGameMode('menu');
      return;
    }

    // No profile yet — try to adopt legacy local progress (non-destructive)
    const migrated = await tryMigrateLegacyProfile(syncedUser);
    if (migrated) {
      setUserProfile(migrated);
      setGameMode('menu');
    } else {
      setGameMode('elo-selection');
    }
  }, [tryMigrateLegacyProfile]);

  /**
   * Initialize authentication on mount.
   * 1. Process any OAuth / email-verification redirect in the URL.
   * 2. Otherwise restore an existing backend session (iframe or cached token).
   * 3. If neither, show the auth gate.
   */
  const initializeAuth = useCallback(async () => {
    try {
      if (hasPendingAuthRedirect()) {
        const redirected = await handleAuthRedirect();
        if (redirected) {
          await routeAfterAuth(redirected);
          return;
        }
      }

      const session = await restoreSession();
      if (session) {
        await routeAfterAuth(session);
        return;
      }

      // Not signed in → gate
      setIsAuthenticated(false);
      setGameMode('auth');
    } catch (e) {
      console.error('Auth init failed:', e);
      setGameMode('auth');
    }
  }, [routeAfterAuth]);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  /** Called by AuthScreen once a session has been obtained */
  const completeAuthentication = useCallback(async (auth: AuthResult) => {
    await routeAfterAuth(auth);
  }, [routeAfterAuth]);

  /** Called by UsernameScreen once a unique username is reserved */
  const completeUsername = useCallback(async (username: string) => {
    if (!authUser) return;
    const synced = { ...authUser, name: username, username };
    setAuthUser(synced);
    if (authToken) saveAuth(authToken, synced);

    const profile = await getUserProfile(authUser.userId);
    if (profile) {
      setUserProfile(profile);
      setGameMode('menu');
      return;
    }

    const migrated = await tryMigrateLegacyProfile(synced);
    if (migrated) {
      setUserProfile(migrated);
      setGameMode('menu');
    } else {
      setGameMode('elo-selection');
    }
  }, [authUser, authToken, tryMigrateLegacyProfile]);

  /** Mark that an account needs email verification */
  const requireEmailVerification = useCallback((email: string) => {
    setPendingVerificationEmail(email);
    setGameMode('email-verify');
  }, []);

  /** Full sign-out: clears the backend session and returns to the gate */
  const signOut = useCallback(async () => {
    await backendLogout();
    setIsAuthenticated(false);
    setAuthUser(null);
    setAuthToken(null);
    setUserProfile(null);
    setPendingVerificationEmail(null);
    setGameMode('auth');
  }, []);

  /**
   * Reload auth user from localStorage (useful after username update)
   */
  const reloadAuthUser = useCallback(() => {
    const savedAuth = loadAuth();
    if (savedAuth) {
      console.log('🔄 Reloading authUser from localStorage:', savedAuth.user);
      setAuthUser(savedAuth.user);
      setAuthToken(savedAuth.token);
    }
  }, []);

  /**
   * Reload user profile from database (useful after game end to ensure latest ELO)
   */
  const reloadUserProfile = useCallback(async () => {
    if (!authUser) return null;
    console.log('🔄 Reloading userProfile from database for userId:', authUser.userId);
    const profile = await getUserProfile(authUser.userId);
    if (profile) {
      console.log('✅ Profile reloaded, new ELO:', profile.eloRating);
      setUserProfile(profile);
      return profile;
    }
    return null;
  }, [authUser]);

  /**
   * Create user profile with selected ELO
   */
  const createProfile = async (initialElo: number) => {
    console.log('🎯 createProfile called with ELO:', initialElo);
    console.log('👤 authUser:', authUser);

    if (!authUser) {
      console.error('❌ No authUser found, cannot create profile');
      alert('Error: No se pudo obtener información de usuario. Por favor intenta nuevamente.');
      return;
    }

    try {
      console.log('📝 Creating user profile...');
      const profile = await createUserProfile({
        userId: authUser.userId,
        name: authUser.name,
        email: authUser.email,
        avatar: authUser.avatar,
        initialElo
      });

      console.log('✅ Profile created:', profile);
      setUserProfile(profile);
      setGameMode('menu');
    } catch (error) {
      console.error('❌ Error creating profile:', error);
      alert('Error al crear el perfil. Por favor intenta nuevamente.');
    }
  };

  /**
   * Save game result and update ELO
   */
  const saveGame = async (
    result: 'white' | 'black' | 'draw',
    moves: string[],
    opponentName: string,
    opponentElo: number,
    isAiGame: boolean,
    playerColor?: 'white' | 'black', // Optional: player's color (defaults to 'white' for AI games)
    endReason?: 'checkmate' | 'timeout' | 'resignation' | 'abandonment' | 'stalemate' // Optional: reason for game end
  ) => {
    if (!userProfile || !authUser) return;

    // 🛡️ PROTECTION: Generate unique game ID to prevent duplicate saves
    // Use timestamp to ensure uniqueness even if moves are identical
    const gameTimestamp = Date.now();
    const gameId = `${authUser.userId}-${gameTimestamp}-${result}-${endReason || 'normal'}`;

    if (lastSavedGameId.current === gameId) {
      console.warn('⚠️ DUPLICATE saveGame call detected! Ignoring...', { gameId });
      return;
    }
    lastSavedGameId.current = gameId;
    console.log('🔒 Game ID registered:', gameId);

    // 🔄 CRITICAL: Reload profile from database to get LATEST ELO before calculation
    console.log('🔄 Reloading profile before ELO calculation to ensure synchronization...');
    const freshProfile = await reloadUserProfile();
    if (!freshProfile) {
      console.error('❌ Failed to reload profile, aborting saveGame');
      return;
    }

    const myColor = playerColor || 'white'; // Use provided color or default to white

    // 🔴 CRITICAL FIX: Determine win/loss correctly
    // result parameter is the WINNER's color ('white' | 'black' | 'draw')
    // isWin = true if the WINNER is ME (my color)
    const isWin = result !== 'draw' && result === myColor;
    const isDraw = result === 'draw';
    const isLoss = result !== 'draw' && result !== myColor;

    // gameResult for ELO calculation: 1 = win, 0.5 = draw, 0 = loss
    const gameResult = isWin ? 1 : isDraw ? 0.5 : 0;

    console.log('💾 Saving game result:', {
      result,
      myColor,
      isWin,
      isDraw,
      isLoss,
      gameResult,
      endReason
    });

    // Calculate ELO change using FRESH profile (not stale state)
    const kFactor = getKFactor(freshProfile.eloRating, freshProfile.totalGames);
    const eloChange = calculateEloChange(freshProfile.eloRating, opponentElo, gameResult, kFactor);
    const newElo = freshProfile.eloRating + eloChange;

    console.log('📊 ELO calculation:', {
      currentElo: freshProfile.eloRating,
      eloChange,
      newElo,
      opponentElo,
      reason: endReason || 'normal'
    });

    // Calculate game duration
    const duration = Math.floor((Date.now() - gameStartTime.current) / 1000);

    // Store last game info for victory/defeat screen
    setLastGameInfo({
      eloChange,
      newElo,
      opponentName,
      opponentElo,
      moves,
      duration,
      endReason // Include the reason for game end
    });

    // Generate PGN
    const pgn = generatePGN(authUser.name, opponentName, moves, result);

    // Save game history
    await saveGameHistory({
      whitePlayerId: authUser.userId,
      whitePlayerName: authUser.name,
      blackPlayerId: isAiGame ? 'ai' : 'opponent',
      blackPlayerName: opponentName,
      moves,
      result,
      whiteEloChange: eloChange,
      blackEloChange: -eloChange,
      whiteEloBefore: freshProfile.eloRating,
      blackEloBefore: opponentElo,
      pgn,
      duration
    });

    // Update user profile
    const updatedProfile = {
      ...freshProfile,
      eloRating: newElo,
      totalGames: freshProfile.totalGames + 1,
      wins: isWin ? freshProfile.wins + 1 : freshProfile.wins,
      losses: isLoss ? freshProfile.losses + 1 : freshProfile.losses,
      draws: isDraw ? freshProfile.draws + 1 : freshProfile.draws
    };

    await updateUserProfile(userProfile.id, updatedProfile);
    setUserProfile(updatedProfile as UserProfile);

    // Update leaderboard
    await updateLeaderboard(updatedProfile as UserProfile);

    // 🔄 Reload game history to include the new game
    console.log('🔄 Reloading game history after save...');
    const updatedHistory = await getGameHistory(authUser.userId, 50);
    console.log(`✅ History reloaded: ${updatedHistory.length} games`);
    setGameHistory(updatedHistory);

    // Generate victory image asynchronously (don't block execution)
    if (result !== 'draw') {
      const victoryData: VictoryImageData = {
        winnerName: isWin ? authUser.name : opponentName,
        winnerElo: isWin ? newElo : opponentElo,
        loserName: isWin ? opponentName : authUser.name,
        loserElo: isWin ? opponentElo : newElo,
        eloChange: Math.abs(eloChange),
        gameResult: 'checkmate',
        totalMoves: moves.length,
        gameDuration: formatDuration(duration)
      };

      // Generate image in background without blocking
      generateVictoryImage(victoryData).then(imageUrl => {
        setVictoryImageUrl(imageUrl);
        setShowVictoryScreen(true);
      });
    }

    // 🔄 CRITICAL: Clear last saved game ID to allow next game to be saved
    console.log('🔓 Clearing lastSavedGameId to allow next game save');
    lastSavedGameId.current = null;
  };

  /**
   * Update piece statistics
   */
  const trackPieceAction = async (
    pieceType: PieceType,
    action: 'capture' | 'loss' | 'move'
  ) => {
    if (!authUser) return;
    await updatePieceStats(authUser.userId, pieceType, action);
  };

  /**
   * Load piece statistics
   */
  const loadStats = async () => {
    if (!authUser) return;
    const stats = await getPieceStats(authUser.userId);
    setPieceStats(stats);
    setShowStats(true);
  };

  /**
   * Get AI move with Stockfish engine (with opening book support)
   */
  const getAiMoveWithStockfish = async (
    fen: string,
    currentMoves: string[],
    difficulty: Difficulty = 'intermediate'
  ): Promise<{ from: { row: number; col: number }; to: { row: number; col: number } } | null> => {
    try {
      // Try to get move from opening book first (for early game)
      if (currentMoves.length < 10) {
        const openingMove = getOpeningMove(currentMoves);
        if (openingMove) {
          console.log('📖 Using opening book:', getOpeningName(currentMoves));
          // Convert UCI notation to position format
          const move = stockfish.parseUCIMove(openingMove);
          return move;
        }
      }

      // Use Stockfish for mid-game and endgame
      console.log('🤖 Calculating with Stockfish (', difficulty, ')...');
      const uciMove = await stockfish.getBestMove(fen, difficulty);

      if (!uciMove) {
        console.warn('⚠️ Stockfish returned no move');
        return null;
      }

      const move = stockfish.parseUCIMove(uciMove);
      console.log('✅ Stockfish move:', uciMove, '→', move);
      return move;

    } catch (error) {
      console.error('❌ Stockfish error:', error);
      return null;
    }
  };

  /**
   * Get AI move with opening book (legacy - kept for backward compatibility)
   */
  const getAiMoveWithOpenings = (currentMoves: string[]): string | null => {
    // Try to get move from opening book first
    const openingMove = getOpeningMove(currentMoves);
    if (openingMove) {
      console.log('📖 Using opening book:', getOpeningName(currentMoves));
      return openingMove;
    }

    // Fallback to minimax (implementation would be in the main component)
    return null;
  };

  /**
   * Format duration in MM:SS
   */
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  /**
   * Reset game start time (call when starting a new game)
   */
  const resetGameStartTime = () => {
    gameStartTime.current = Date.now();
    console.log('⏱️ Game start time reset');
  };

  /**
   * Analyze recent games and generate study recommendations
   * Based on last 10 games, detects weaknesses and suggests areas to study
   */
  const getStudyRecommendations = useCallback(async (): Promise<StudyAnalysis> => {
    if (!userProfile) {
      return {
        openingScore: 50,
        tacticsScore: 50,
        endgameScore: 50,
        timeManagementScore: 50,
        defenseScore: 50,
        recommendations: []
      };
    }

    // Get last 10 games using the correct function
    const allGames = await getGameHistory(userProfile.userId, 10);
    const recentGames = allGames; // Already limited to 10 by getGameHistory

    if (recentGames.length === 0) {
      return {
        openingScore: 50,
        tacticsScore: 50,
        endgameScore: 50,
        timeManagementScore: 50,
        defenseScore: 50,
        recommendations: [{
          icon: '🎮',
          title: 'Juega tu primera partida',
          description: 'Completa algunas partidas para recibir recomendaciones personalizadas',
          timeEstimate: '10 min',
          priority: 100,
          category: 'openings',
          reason: 'No tienes partidas registradas aún'
        }]
      };
    }

    // Analysis variables
    let totalGames = recentGames.length;
    let wins = 0;
    let losses = 0;
    let draws = 0;
    let earlyGameLosses = 0; // Lost in first 15 moves (opening phase)
    let midGameLosses = 0; // Lost in 16-40 moves (middlegame)
    let lateGameLosses = 0; // Lost after 40 moves (endgame)
    let timeoutLosses = 0;
    let shortGames = 0; // Games < 30s (blundered fast)
    let longGames = 0; // Games > 600s (slow play)
    let whiteWins = 0;
    let blackWins = 0;
    let whiteLosses = 0;
    let blackLosses = 0;

    // Analyze each game
    recentGames.forEach((game: any) => {
      const isWhite = game.whitePlayerId === userProfile.userId;
      const isBlack = game.blackPlayerId === userProfile.userId;
      const won = (game.result === 'white' && isWhite) || (game.result === 'black' && isBlack);
      const lost = (game.result === 'white' && isBlack) || (game.result === 'black' && isWhite);
      const isDraw = game.result === 'draw';

      if (won) {
        wins++;
        if (isWhite) whiteWins++;
        if (isBlack) blackWins++;
      }
      if (lost) {
        losses++;
        if (isWhite) whiteLosses++;
        if (isBlack) blackLosses++;

        // Detect phase of loss
        const moveCount = game.moves?.length || 0;
        if (moveCount <= 15) earlyGameLosses++;
        else if (moveCount <= 40) midGameLosses++;
        else lateGameLosses++;
      }
      if (isDraw) draws++;

      // Time analysis
      const duration = game.duration || 0;
      if (duration < 30) shortGames++;
      if (duration > 600) longGames++;

      // Check if loss was by timeout (we'd need to track this separately)
      // For now, assume very short games with losses are blunders
    });

    // Calculate scores (1-100, higher = better)
    const winRate = wins / totalGames;

    // Opening score (penalize early losses)
    const openingScore = Math.max(0, Math.min(100,
      70 - (earlyGameLosses / totalGames) * 60
    ));

    // Tactics score (based on short losses = blunders)
    const tacticsScore = Math.max(0, Math.min(100,
      80 - (shortGames / totalGames) * 70
    ));

    // Endgame score (penalize late game losses)
    const endgameScore = Math.max(0, Math.min(100,
      70 - (lateGameLosses / totalGames) * 60
    ));

    // Time management (penalize very fast or very slow games)
    const timeManagementScore = Math.max(0, Math.min(100,
      80 - ((shortGames + longGames) / totalGames) * 50
    ));

    // Defense score (based on losses as black + middlegame losses)
    const defenseScore = Math.max(0, Math.min(100,
      70 - ((blackLosses + midGameLosses) / totalGames) * 50
    ));

    console.log('📊 Study Analysis:', {
      totalGames,
      wins,
      losses,
      draws,
      earlyGameLosses,
      midGameLosses,
      lateGameLosses,
      shortGames,
      openingScore,
      tacticsScore,
      endgameScore,
      timeManagementScore,
      defenseScore
    });

    // Generate recommendations based on weakest areas
    const areas = [
      { name: 'opening', score: openingScore, icon: '📖' },
      { name: 'tactics', score: tacticsScore, icon: '⚔️' },
      { name: 'endgame', score: endgameScore, icon: '♟️' },
      { name: 'time', score: timeManagementScore, icon: '⏱️' },
      { name: 'defense', score: defenseScore, icon: '🛡️' }
    ];

    // Sort by score (lowest = highest priority)
    areas.sort((a, b) => a.score - b.score);

    // Generate top 3 recommendations
    const recommendations: StudyRecommendation[] = [];

    areas.slice(0, 3).forEach((area, index) => {
      const priority = 100 - area.score; // Lower score = higher priority

      if (area.name === 'opening') {
        recommendations.push({
          icon: area.icon,
          title: 'Principios de apertura',
          description: 'Desarrollo rápido, enroque temprano, evita sacar dama pronto',
          timeEstimate: '10 min',
          priority,
          category: 'openings',
          reason: `Perdiste ${earlyGameLosses} de ${totalGames} partidas en la fase de apertura`
        });
      } else if (area.name === 'tactics') {
        recommendations.push({
          icon: area.icon,
          title: 'Tácticas básicas: piezas indefensas',
          description: 'Practica 5 puzzles tácticos, aprende clavadas y ataques dobles',
          timeEstimate: '15 min',
          priority,
          category: 'tactics',
          reason: `${shortGames} partidas terminaron muy rápido por errores tácticos`
        });
      } else if (area.name === 'endgame') {
        recommendations.push({
          icon: area.icon,
          title: 'Finales básicos de peones',
          description: 'Rey y peón vs rey, oposición, actividad de torres',
          timeEstimate: '10 min',
          priority,
          category: 'endgames',
          reason: `${lateGameLosses} partidas se perdieron en el final del juego`
        });
      } else if (area.name === 'time') {
        recommendations.push({
          icon: area.icon,
          title: 'Gestión del reloj',
          description: 'Blitz training, juega jugadas simples, no pienses demasiado',
          timeEstimate: '10 min',
          priority,
          category: 'middlegame',
          reason: `${shortGames + longGames} partidas con problemas de gestión de tiempo`
        });
      } else if (area.name === 'defense') {
        recommendations.push({
          icon: area.icon,
          title: 'Seguridad del rey',
          description: 'Revisa antes de mover, protege piezas clave, evita debilidades',
          timeEstimate: '10 min',
          priority,
          category: 'middlegame',
          reason: `${blackLosses + midGameLosses} partidas perdidas por defensas débiles`
        });
      }
    });

    return {
      openingScore,
      tacticsScore,
      endgameScore,
      timeManagementScore,
      defenseScore,
      recommendations
    };
  }, [userProfile]);

  return {
    // Auth state
    isAuthenticated,
    authUser,
    userProfile,
    authToken,
    setIsAuthenticated,
    setAuthUser,
    setAuthToken,
    initAuth: initializeAuth,
    reloadAuthUser,

    // Real backend auth flow
    completeAuthentication,
    completeUsername,
    requireEmailVerification,
    signOut,
    pendingVerificationEmail,

    // Game mode
    gameMode,
    setGameMode,

    // Profile management
    createProfile,

    // Game management
    saveGame,
    gameHistory, // ✅ ADDED: Expose game history

    // Statistics
    pieceStats,
    showStats,
    setShowStats,
    loadStats,
    trackPieceAction,

    // Victory
    victoryImageUrl,
    showVictoryScreen,
    setShowVictoryScreen,
    lastGameInfo,

    // AI
    getAiMoveWithOpenings,
    getAiMoveWithStockfish,

    // Utilities
    formatDuration,
    gameStartTime,
    resetGameStartTime,

    // Study recommendations
    getStudyRecommendations
  };
}
