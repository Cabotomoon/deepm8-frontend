import React, { useState, useCallback, useEffect, useRef, Fragment } from 'react';
import { useChessGame, type StudyAnalysis } from '../hooks/useChessGame';
import { getOpeningName } from '../services/openingBook';
import { hasUsername, updateUsername, getUsername, clearAuth, loginWithProfile, createLocalGuestUser } from '../services/authService';
import { boardToFEN, getCastlingRights } from '../utils/fenUtils';
import ProfileSetup from '../components/ProfileSetup';
import UserSelection from '../components/UserSelection';
import Matchmaking from '../components/Matchmaking';
import GameAnalysis from '../components/GameAnalysis';
import GameHistoryComponent from '../components/GameHistory';
import GameReplay from '../components/GameReplay';
import ProgressChart from '../components/ProgressChart';
import AchievementsGrid from '../components/AchievementsGrid';
import TrainingSession from '../components/TrainingSession';
import { socketService } from '../services/socketService';
import { studyRecommendationService } from '../services/studyRecommendationService';
import type { Room, ChatMessage } from '../types/socket.types';
import type { GameHistory } from '../services/localDataService';

// 🔴 VERSION CHECKER - Notation fix applied
console.log('✅ Chess App Version: NOTATION_v7 - Added Castling Support (O-O and O-O-O)');

// Chess piece types
type PieceType = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';
type PieceColor = 'white' | 'black';
type GameMode = 'menu' | 'pvp' | 'ai' | 'online' | 'online-lobby' | 'tutorial' | 'replay' | 'auth' | 'user-selection' | 'elo-selection' | 'stats' | 'victory';
type Difficulty = 'beginner' | 'intermediate' | 'advanced' | 'master' | 'grandmaster';

interface ChessPiece {
  type: PieceType;
  color: PieceColor;
  hasMoved?: boolean;
}

interface Position {
  row: number;
  col: number;
}

interface Move {
  from: Position;
  to: Position;
  piece: ChessPiece;
  captured?: ChessPiece;
  notation: string;
  timestamp: number;
  fen?: string; // FEN position before the move
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

interface Theme {
  name: string;
  light: string;
  dark: string;
  selected: string;
  valid: string;
  lastMove: string;
}

type Board = (ChessPiece | null)[][];

// Chess themes
const THEMES: Record<string, Theme> = {
  deepm8: {
    name: 'DeepM8',
    light: 'bg-purple-100',
    dark: 'bg-purple-700',
    selected: 'bg-blue-500',
    valid: 'bg-green-400',
    lastMove: 'bg-purple-300'
  },
  classic: {
    name: 'Clásico',
    light: 'bg-amber-100',
    dark: 'bg-amber-600',
    selected: 'bg-blue-400',
    valid: 'bg-green-400',
    lastMove: 'bg-yellow-300'
  },
  ocean: {
    name: 'Océano',
    light: 'bg-cyan-100',
    dark: 'bg-cyan-700',
    selected: 'bg-blue-500',
    valid: 'bg-teal-400',
    lastMove: 'bg-sky-300'
  },
  forest: {
    name: 'Bosque',
    light: 'bg-emerald-100',
    dark: 'bg-emerald-700',
    selected: 'bg-lime-400',
    valid: 'bg-green-500',
    lastMove: 'bg-yellow-200'
  },
  sunset: {
    name: 'Atardecer',
    light: 'bg-orange-100',
    dark: 'bg-red-600',
    selected: 'bg-pink-400',
    valid: 'bg-orange-400',
    lastMove: 'bg-yellow-400'
  },
  midnight: {
    name: 'Medianoche',
    light: 'bg-slate-700',
    dark: 'bg-slate-900',
    selected: 'bg-purple-500',
    valid: 'bg-indigo-500',
    lastMove: 'bg-violet-400'
  },
  neon: {
    name: 'Neón',
    light: 'bg-fuchsia-300',
    dark: 'bg-purple-900',
    selected: 'bg-pink-500',
    valid: 'bg-cyan-500',
    lastMove: 'bg-yellow-400'
  },
  wooden: {
    name: 'Madera',
    light: 'bg-[#d9ad7c]',
    dark: 'bg-[#a0724a]',
    selected: 'bg-[#f0d9b5]',
    valid: 'bg-green-400',
    lastMove: 'bg-[#cdb88a]'
  }
};

// Difficulty levels with calibrated ELO ratings for Stockfish
// Depth values are carefully tuned to match real-world chess ratings:
// - Lower depths (1-5) for beginner levels to allow mistakes
// - Medium depths (6-10) for intermediate play with tactical awareness
// - Higher depths (12-15) for advanced positional understanding
// - Very high depths (18+) approach superhuman strength
const DIFFICULTY_LEVELS: Record<Difficulty, { elo: number; depth: number; skillLevel: number; label: string }> = {
  beginner: { elo: 800, depth: 2, skillLevel: 1, label: 'Principiante (800 ELO)' },
  intermediate: { elo: 1400, depth: 6, skillLevel: 5, label: 'Intermedio (1400 ELO)' },
  advanced: { elo: 1800, depth: 10, skillLevel: 10, label: 'Avanzado (1800 ELO)' },
  master: { elo: 2200, depth: 14, skillLevel: 15, label: 'Maestro (2200 ELO)' },
  grandmaster: { elo: 2600, depth: 18, skillLevel: 20, label: 'Gran Maestro (2600 ELO)' }
};

// Time control configurations (standard FIDE time controls)
const TIME_CONTROLS = {
  bullet: {
    name: 'Bullet',
    description: '⚡ 1+0 (1 minuto)',
    time: 60, // 1 minute
    increment: 0,
    icon: '⚡',
    color: 'from-red-500 to-orange-500'
  },
  blitz: {
    name: 'Blitz',
    description: '⏱️ 3+2 (3 min + 2s)',
    time: 180, // 3 minutes
    increment: 2,
    icon: '⏱️',
    color: 'from-yellow-500 to-orange-500'
  },
  rapid: {
    name: 'Rapid',
    description: '🕐 10+0 (10 minutos)',
    time: 600, // 10 minutes
    increment: 0,
    icon: '🕐',
    color: 'from-blue-500 to-cyan-500'
  },
  classical: {
    name: 'Clásico',
    description: '♟️ 30+0 (30 minutos)',
    time: 1800, // 30 minutes
    increment: 0,
    icon: '♟️',
    color: 'from-purple-500 to-indigo-500'
  }
} as const;

// Chess piece symbols
const PIECE_SYMBOLS: Record<PieceColor, Record<PieceType, string>> = {
  white: {
    king: '♔',
    queen: '♕',
    rook: '♖',
    bishop: '♗',
    knight: '♘',
    pawn: '♙',
  },
  black: {
    king: '♚',
    queen: '♛',
    rook: '♜',
    bishop: '♝',
    knight: '♞',
    pawn: '♟',
  },
};

// Initialize chess board
const initializeBoard = (): Board => {
  const board: Board = Array(8).fill(null).map(() => Array(8).fill(null));

  for (let i = 0; i < 8; i++) {
    board[1][i] = { type: 'pawn', color: 'black' };
    board[6][i] = { type: 'pawn', color: 'white' };
  }

  const backRow: PieceType[] = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
  backRow.forEach((type, i) => {
    board[0][i] = { type, color: 'black' };
    board[7][i] = { type, color: 'white' };
  });

  return board;
};

// Helper function to check if a piece can move to a specific position
const canPieceMoveTo = (piece: ChessPiece, from: Position, to: Position, board: Board): boolean => {
  const rowDiff = Math.abs(to.row - from.row);
  const colDiff = Math.abs(to.col - from.col);

  // CRITICAL: Destination square cannot be occupied by own piece
  const destinationPiece = board[to.row][to.col];
  if (destinationPiece && destinationPiece.color === piece.color) {
    return false; // Cannot capture own piece
  }

  // Basic movement pattern check
  switch (piece.type) {
    case 'knight':
      // Knight moves in L-shape: 2+1 or 1+2
      const knightCanMove = (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);
      console.log(`  🐎 Knight check: from (${from.row},${from.col}) to (${to.row},${to.col}), rowDiff=${rowDiff}, colDiff=${colDiff}, canMove=${knightCanMove}, destOccupied=${!!destinationPiece}`);
      return knightCanMove;

    case 'bishop':
      // Bishop moves diagonally
      if (rowDiff !== colDiff) return false;
      // Check if path is clear
      return isPathClear(from, to, board);

    case 'rook':
      // Rook moves horizontally or vertically
      if (from.row !== to.row && from.col !== to.col) return false;
      // Check if path is clear
      return isPathClear(from, to, board);

    case 'queen':
      // Queen moves like rook or bishop
      if (from.row !== to.row && from.col !== to.col && rowDiff !== colDiff) return false;
      // Check if path is clear
      return isPathClear(from, to, board);

    case 'king':
      // King moves one square in any direction
      return rowDiff <= 1 && colDiff <= 1;

    case 'pawn':
      // Pawn logic is complex, for disambiguation just return true if within 1-2 squares forward
      const direction = piece.color === 'white' ? -1 : 1;
      const targetPiece = board[to.row][to.col];

      // Forward move
      if (from.col === to.col && !targetPiece) {
        if (to.row === from.row + direction) return true;
        if ((piece.color === 'white' && from.row === 6) || (piece.color === 'black' && from.row === 1)) {
          if (to.row === from.row + 2 * direction) return true;
        }
      }
      // Diagonal capture
      if (Math.abs(from.col - to.col) === 1 && to.row === from.row + direction && targetPiece) {
        return true;
      }
      return false;

    default:
      return false;
  }
};

// Helper to check if path is clear between two positions (for sliding pieces)
const isPathClear = (from: Position, to: Position, board: Board): boolean => {
  const rowStep = to.row > from.row ? 1 : to.row < from.row ? -1 : 0;
  const colStep = to.col > from.col ? 1 : to.col < from.col ? -1 : 0;

  let currentRow = from.row + rowStep;
  let currentCol = from.col + colStep;

  while (currentRow !== to.row || currentCol !== to.col) {
    if (board[currentRow][currentCol] !== null) {
      return false; // Path blocked
    }
    currentRow += rowStep;
    currentCol += colStep;
  }

  return true;
};

// Algebraic notation converter with proper disambiguation
const toAlgebraicNotation = (from: Position, to: Position, piece: ChessPiece, captured?: ChessPiece, isCheck?: boolean, isCheckmate?: boolean, board?: Board): string => {
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

  // ♜ CASTLING DETECTION (King moving 2 squares horizontally)
  if (piece.type === 'king' && Math.abs(to.col - from.col) === 2) {
    const suffix = isCheckmate ? '#' : isCheck ? '+' : '';
    // Kingside castling (short): King moves from e-file to g-file
    if (to.col > from.col) {
      return `O-O${suffix}`;
    }
    // Queenside castling (long): King moves from e-file to c-file
    else {
      return `O-O-O${suffix}`;
    }
  }

  // Map piece types to algebraic notation symbols
  const pieceSymbols: { [key: string]: string } = {
    'king': 'K',
    'queen': 'Q',
    'rook': 'R',
    'bishop': 'B',
    'knight': 'N',  // CRITICAL: Knight uses 'N' (not 'K') to avoid conflict with King
    'pawn': ''
  };
  const pieceSymbol = pieceSymbols[piece.type];
  const captureSymbol = captured ? 'x' : '';
  const toSquare = files[to.col] + ranks[to.row];
  const suffix = isCheckmate ? '#' : isCheck ? '+' : '';

  // For pawns, include source file only if capturing
  let fromNotation = '';
  if (piece.type === 'pawn' && captured) {
    fromNotation = files[from.col];
  }
  // For other pieces, add disambiguation if needed (when board is provided)
  else if (piece.type !== 'pawn' && board) {
    // Check if there are other pieces of same type that can LEGALLY move to same square
    const ambiguousPieces: Position[] = [];

    console.log(`🔍 Checking disambiguation for ${piece.color} ${piece.type} moving from (${from.row},${from.col}) to (${to.row},${to.col}) = ${toSquare}`);

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        // Skip the piece that's actually moving
        if (row === from.row && col === from.col) continue;

        const otherPiece = board[row][col];
        if (otherPiece &&
            otherPiece.type === piece.type &&
            otherPiece.color === piece.color) {

          console.log(`  📍 Found other ${piece.color} ${piece.type} at (${row},${col}), checking if it can move to (${to.row},${to.col})...`);

          // Check if THIS piece can also legally move to the destination
          const canMove = canPieceMoveTo(otherPiece, { row, col }, to, board);

          if (canMove) {
            ambiguousPieces.push({ row, col });
            console.log(`    ✅ YES! This piece can also move there - disambiguation needed`);
          } else {
            console.log(`    ❌ NO - this piece cannot move there`);
          }
        }
      }
    }

    // Only add disambiguation if another piece can ALSO move to the same square
    if (ambiguousPieces.length > 0) {
      // Check if file disambiguation is sufficient
      const sameFile = ambiguousPieces.some(p => p.col === from.col);
      const sameRank = ambiguousPieces.some(p => p.row === from.row);

      if (!sameFile) {
        // File is unique - use it
        fromNotation = files[from.col];
      } else if (!sameRank) {
        // Rank is unique - use it
        fromNotation = ranks[from.row];
      } else {
        // Both file and rank needed
        fromNotation = files[from.col] + ranks[from.row];
      }
    }
  }

  return `${pieceSymbol}${fromNotation}${captureSymbol}${toSquare}${suffix}`;
};

// Sound synthesis using Web Audio API
const playSound = (type: 'move' | 'capture' | 'check' | 'checkmate' | 'select' | 'tick') => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const now = audioContext.currentTime;

  const sounds = {
    move: () => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = 200;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.15, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      oscillator.start(now);
      oscillator.stop(now + 0.1);
    },
    capture: () => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      const filter = audioContext.createBiquadFilter();
      oscillator.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.setValueAtTime(300, now);
      oscillator.frequency.exponentialRampToValueAtTime(100, now + 0.15);
      oscillator.type = 'sawtooth';
      filter.type = 'lowpass';
      filter.frequency.value = 800;
      gainNode.gain.setValueAtTime(0.25, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      oscillator.start(now);
      oscillator.stop(now + 0.15);
    },
    check: () => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.setValueAtTime(400, now);
      oscillator.frequency.exponentialRampToValueAtTime(600, now + 0.2);
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.2, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      oscillator.start(now);
      oscillator.stop(now + 0.2);
    },
    checkmate: () => {
      [0, 0.15, 0.3].forEach((delay, i) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        const frequencies = [440, 554, 659];
        oscillator.frequency.value = frequencies[i];
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.15, now + delay);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.4);
        oscillator.start(now + delay);
        oscillator.stop(now + delay + 0.4);
      });
    },
    select: () => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = 400;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.08, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
      oscillator.start(now);
      oscillator.stop(now + 0.05);
    },
    tick: () => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.05, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.02);
      oscillator.start(now);
      oscillator.stop(now + 0.02);
    }
  };

  sounds[type]();
};

export default function ChessGame() {
  // 🎯 Integrated Chess Game Hook - ALL PROFESSIONAL FEATURES
  const chessGamePro = useChessGame();

  // Game state
  // Use gameMode directly from hook instead of local state
  const gameMode = chessGamePro.gameMode;
  const setGameMode = chessGamePro.setGameMode;
  const [board, setBoard] = useState<Board>(initializeBoard());
  const [selectedPiece, setSelectedPiece] = useState<Position | null>(null);
  const [validMoves, setValidMoves] = useState<Position[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<PieceColor>('white');
  const [capturedPieces, setCapturedPieces] = useState<{ white: ChessPiece[], black: ChessPiece[] }>({
    white: [],
    black: []
  });
  const [gameStatus, setGameStatus] = useState<'playing' | 'check' | 'checkmate' | 'stalemate' | 'resigned'>('playing');
  const [lastMove, setLastMove] = useState<{ from: Position, to: Position } | null>(null);
  const [moveHistory, setMoveHistory] = useState<Move[]>([]);

  // UI state
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [currentTheme, setCurrentTheme] = useState<string>('deepm8');
  const [particles, setParticles] = useState<Particle[]>([]);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [showResignConfirm, setShowResignConfirm] = useState(false);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [showGameAnalysis, setShowGameAnalysis] = useState(false);
  const [showGameHistory, setShowGameHistory] = useState(false);
  const [selectedGameForReplay, setSelectedGameForReplay] = useState<GameHistory | null>(null);
  const [gameEndReason, setGameEndReason] = useState<'checkmate' | 'timeout' | 'resignation' | 'stalemate' | null>(null);
  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false);

  // Coach profile state (for stats screen)
  const [coachProfile, setCoachProfile] = useState<any>(null);
  const [loadingCoachProfile, setLoadingCoachProfile] = useState(false);

  // Study recommendations state
  const [studyAnalysis, setStudyAnalysis] = useState<StudyAnalysis | null>(null);
  const [loadingStudyAnalysis, setLoadingStudyAnalysis] = useState(false);

  // 📊 Game history state for study recommendations
  const [userGameHistory, setUserGameHistory] = useState<GameHistory[]>([]);
  const [loadingGameHistory, setLoadingGameHistory] = useState(false);

  // 🎓 Training session state
  const [activeTraining, setActiveTraining] = useState<'openings' | 'tactics' | 'endgames' | 'middlegame' | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Debug: Log when activeTraining changes
  useEffect(() => {
    console.log('🎓 activeTraining changed to:', activeTraining);
    console.log('🎓 activeTraining is truthy?', !!activeTraining);
    console.log('🎓 activeTraining type:', typeof activeTraining);
  }, [activeTraining]);

  // Close menu when clicking outside
  useEffect(() => {
    if (!isMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Check if click is outside menu area
      if (!target.closest('.hamburger-menu-container')) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  // Timer state
  const [whiteTime, setWhiteTime] = useState(600); // 10 minutes in seconds
  const [blackTime, setBlackTime] = useState(600);
  const [timerActive, setTimerActive] = useState(false);
  const [timeControl, setTimeControl] = useState<'bullet' | 'blitz' | 'rapid' | 'classical'>('blitz');
  const [incrementPerMove, setIncrementPerMove] = useState(0); // Increment in seconds (e.g., +2 for 3+2)

  // AI state
  const [aiDifficulty, setAiDifficulty] = useState<Difficulty>('intermediate');
  const [isAiThinking, setIsAiThinking] = useState(false);

  // 🌐 Multiplayer Online state
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [myColor, setMyColor] = useState<PieceColor | null>(null);
  const [opponentName, setOpponentName] = useState<string>('');
  const [opponentElo, setOpponentElo] = useState<number>(1200);

  // ⚠️ CRITICAL: Use refs to store opponent info (more reliable than state for async operations)
  const opponentInfoRef = useRef<{ name: string; elo: number }>({ name: '', elo: 1200 });

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isOpponentDisconnected, setIsOpponentDisconnected] = useState(false);
  const [reconnectionTimeLeft, setReconnectionTimeLeft] = useState<number>(30);
  const reconnectionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [showChat, setShowChat] = useState(true);
  const [gameResult, setGameResult] = useState<'victory' | 'defeat' | null>(null);

  // Track MY own disconnection state
  const [amIDisconnected, setAmIDisconnected] = useState(false);
  const [myReconnectionTimeLeft, setMyReconnectionTimeLeft] = useState<number>(30);
  const myReconnectionTimerRef = useRef<NodeJS.Timeout | null>(null);

  const particleIdRef = useRef(0);
  const leftHistoryRef = useRef<HTMLDivElement>(null);
  const rightHistoryRef = useRef<HTMLDivElement>(null);

  // Helper function to get display name
  const getDisplayName = () => {
    const username = getUsername();
    if (username) return username;
    return chessGamePro.authUser?.name || 'Jugador';
  };

  // User selection handlers
  const handleSelectExistingUser = (userId: string) => {
    console.log('📝 Selecting existing user:', userId);
    const result = loginWithProfile(userId);
    if (result) {
      // Force the hook to reload auth
      chessGamePro.initAuth();
      chessGamePro.setGameMode('menu');
    } else {
      alert('Error al cargar el perfil del usuario');
    }
  };

  const handleCreateNewUser = async () => {
    console.log('➕ Creating new user - starting fresh profile creation');
    // Clear any existing auth state to start fresh
    clearAuth();
    // Create a local guest user immediately (no SeaVerse authentication needed)
    const localUser = createLocalGuestUser();
    console.log('👤 Local user created:', localUser);
    // Update hook state with new user
    chessGamePro.setAuthToken(localUser.token);
    chessGamePro.setAuthUser(localUser.user);
    chessGamePro.setIsAuthenticated(true);
    console.log('🔧 Setting showProfileSetup to true');
    // Show profile setup modal
    setShowProfileSetup(true);
    console.log('✅ showProfileSetup state updated');
  };


  // Auto-redirect to ELO selection when user authenticates (only from auth screen)
  useEffect(() => {
    if (gameMode === 'auth' && chessGamePro.authUser && !chessGamePro.userProfile) {
      console.log('🔀 Auto-redirecting to elo-selection');
      chessGamePro.setGameMode('elo-selection');
    }
  }, [gameMode, chessGamePro.authUser, chessGamePro.userProfile, chessGamePro]);

  // Check if user needs to set username
  useEffect(() => {
    if (chessGamePro.authUser && !hasUsername()) {
      setShowProfileSetup(true);
    }
  }, [chessGamePro.authUser]);

  // 📊 Load game history when user profile is available
  useEffect(() => {
    // Use game history from chessGamePro hook (already loaded with 18 games)
    if (chessGamePro.gameHistory && chessGamePro.gameHistory.length > 0) {
      console.log(`📚 Historial disponible: ${chessGamePro.gameHistory.length} partidas`);
      setUserGameHistory(chessGamePro.gameHistory);
      setLoadingGameHistory(false);
    } else {
      setUserGameHistory([]);
      setLoadingGameHistory(false);
    }
  }, [chessGamePro.gameHistory]);

  // Load coach profile when stats mode is active
  useEffect(() => {
    if (gameMode === 'stats') {
      const loadCoachProfile = async () => {
        setLoadingCoachProfile(true);
        try {
          const { playerProfileService } = await import('../services/playerProfileService');
          const profile = await playerProfileService.getProfile();
          console.log('📊 Perfil cargado:', profile);
          setCoachProfile(profile);
        } catch (error) {
          console.error('Error loading coach profile:', error);
        } finally {
          setLoadingCoachProfile(false);
        }
      };
      loadCoachProfile();
    }
  }, [gameMode]);

  // Load study recommendations when user profile changes or after a game ends
  useEffect(() => {
    const loadStudyRecommendations = async () => {
      if (!chessGamePro.userProfile) {
        setStudyAnalysis(null);
        return;
      }

      setLoadingStudyAnalysis(true);
      try {
        const analysis = await chessGamePro.getStudyRecommendations();
        console.log('📚 Study analysis loaded:', analysis);
        setStudyAnalysis(analysis);
      } catch (error) {
        console.error('Error loading study recommendations:', error);
      } finally {
        setLoadingStudyAnalysis(false);
      }
    };

    loadStudyRecommendations();
  }, [chessGamePro.userProfile, chessGamePro.lastGameInfo]); // Reload when profile changes or game ends

  // Timer effect - runs continuously for both players
  useEffect(() => {
    if (!timerActive || gameStatus !== 'playing') return;

    const interval = setInterval(() => {
      if (currentPlayer === 'white') {
        setWhiteTime(prev => {
          if (prev <= 1) {
            // White ran out of time - Black wins
            console.log('⏰ White ran out of time - Black wins by timeout');
            setTimerActive(false);
            setGameStatus('checkmate');

            // Process game result: White lost by timeout
            if (gameMode === 'ai') {
              // In AI mode, white is the player
              handleGameEnd('defeat', 'timeout');
            } else if (gameMode === 'online') {
              // In online mode, check if white is the player
              if (myColor === 'white') {
                handleGameEnd('defeat', 'timeout');
              } else {
                handleGameEnd('victory', 'timeout');
              }
            }

            clearInterval(interval);
            return 0;
          }
          if (prev <= 10 && soundEnabled) playSound('tick');
          return prev - 1;
        });
      } else {
        // Black's timer runs even when AI is thinking
        setBlackTime(prev => {
          if (prev <= 1) {
            // Black ran out of time - White wins
            console.log('⏰ Black ran out of time - White wins by timeout');
            setTimerActive(false);
            setGameStatus('checkmate');

            // Process game result: Black lost by timeout
            if (gameMode === 'ai') {
              // In AI mode, black is the AI
              handleGameEnd('victory', 'timeout');
            } else if (gameMode === 'online') {
              // In online mode, check if black is the player
              if (myColor === 'black') {
                handleGameEnd('defeat', 'timeout');
              } else {
                handleGameEnd('victory', 'timeout');
              }
            }

            clearInterval(interval);
            return 0;
          }
          if (prev <= 10 && soundEnabled) playSound('tick');
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [timerActive, currentPlayer, gameStatus, soundEnabled, gameMode, myColor]);

  // Particle animation
  useEffect(() => {
    if (particles.length === 0) return;

    const animationFrame = requestAnimationFrame(() => {
      setParticles(prev =>
        prev
          .map(p => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vy: p.vy + 0.5, // gravity
            life: p.life - 0.02,
            size: p.size * 0.98
          }))
          .filter(p => p.life > 0)
      );
    });

    return () => cancelAnimationFrame(animationFrame);
  }, [particles]);

  // Auto-scroll history containers without affecting page scroll
  useEffect(() => {
    if (leftHistoryRef.current) {
      leftHistoryRef.current.scrollTop = leftHistoryRef.current.scrollHeight;
    }
    if (rightHistoryRef.current) {
      rightHistoryRef.current.scrollTop = rightHistoryRef.current.scrollHeight;
    }
  }, [moveHistory]);

  // Create particles effect
  const createParticles = (x: number, y: number, color: string) => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < 20; i++) {
      newParticles.push({
        id: particleIdRef.current++,
        x,
        y,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10 - 5,
        life: 1,
        color,
        size: Math.random() * 6 + 2
      });
    }
    setParticles(prev => [...prev, ...newParticles]);
  };

  // Format time display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Chess logic functions
  const isValidPosition = (row: number, col: number): boolean => {
    return row >= 0 && row < 8 && col >= 0 && col < 8;
  };

  const getValidMoves = useCallback((position: Position, testBoard: Board = board, skipCheckValidation: boolean = false): Position[] => {
    const piece = testBoard[position.row][position.col];
    if (!piece) return [];

    const moves: Position[] = [];
    const { row, col } = position;

    const addMove = (r: number, c: number) => {
      if (isValidPosition(r, c)) {
        const target = testBoard[r][c];
        if (!target || target.color !== piece.color) {
          moves.push({ row: r, col: c });
        }
      }
    };

    const addLinearMoves = (directions: [number, number][]) => {
      directions.forEach(([dr, dc]) => {
        let r = row + dr;
        let c = col + dc;
        while (isValidPosition(r, c)) {
          const target = testBoard[r][c];
          if (!target) {
            moves.push({ row: r, col: c });
          } else {
            if (target.color !== piece.color) {
              moves.push({ row: r, col: c });
            }
            break;
          }
          r += dr;
          c += dc;
        }
      });
    };

    switch (piece.type) {
      case 'pawn': {
        const direction = piece.color === 'white' ? -1 : 1;
        const startRow = piece.color === 'white' ? 6 : 1;

        if (!testBoard[row + direction]?.[col]) {
          moves.push({ row: row + direction, col });
          if (row === startRow && !testBoard[row + 2 * direction]?.[col]) {
            moves.push({ row: row + 2 * direction, col });
          }
        }

        [-1, 1].forEach(offset => {
          const newCol = col + offset;
          if (isValidPosition(row + direction, newCol)) {
            const target = testBoard[row + direction][newCol];
            if (target && target.color !== piece.color) {
              moves.push({ row: row + direction, col: newCol });
            }
          }
        });
        break;
      }

      case 'knight': {
        const knightMoves = [
          [-2, -1], [-2, 1], [-1, -2], [-1, 2],
          [1, -2], [1, 2], [2, -1], [2, 1]
        ];
        knightMoves.forEach(([dr, dc]) => addMove(row + dr, col + dc));
        break;
      }

      case 'bishop': {
        addLinearMoves([[1, 1], [1, -1], [-1, 1], [-1, -1]]);
        break;
      }

      case 'rook': {
        addLinearMoves([[1, 0], [-1, 0], [0, 1], [0, -1]]);
        break;
      }

      case 'queen': {
        addLinearMoves([
          [1, 0], [-1, 0], [0, 1], [0, -1],
          [1, 1], [1, -1], [-1, 1], [-1, -1]
        ]);
        break;
      }

      case 'king': {
        const kingMoves = [
          [-1, -1], [-1, 0], [-1, 1],
          [0, -1], [0, 1],
          [1, -1], [1, 0], [1, 1]
        ];
        kingMoves.forEach(([dr, dc]) => addMove(row + dr, col + dc));

        // ♜ CASTLING LOGIC
        // Only allow if king hasn't moved and is not in check
        if (!skipCheckValidation && !piece.hasMoved && !isInCheck(piece.color, testBoard)) {
          const kingRow = piece.color === 'white' ? 7 : 0;

          // Kingside castling (short castling: O-O)
          const kingsideRook = testBoard[kingRow][7];
          if (kingsideRook?.type === 'rook' &&
              kingsideRook.color === piece.color &&
              !kingsideRook.hasMoved &&
              !testBoard[kingRow][5] && // f-file empty
              !testBoard[kingRow][6] && // g-file empty
              !isPositionUnderAttack({ row: kingRow, col: 5 }, piece.color === 'white' ? 'black' : 'white', testBoard) && // f-file not attacked
              !isPositionUnderAttack({ row: kingRow, col: 6 }, piece.color === 'white' ? 'black' : 'white', testBoard)) { // g-file not attacked
            addMove(kingRow, 6); // King to g-file
          }

          // Queenside castling (long castling: O-O-O)
          const queensideRook = testBoard[kingRow][0];
          if (queensideRook?.type === 'rook' &&
              queensideRook.color === piece.color &&
              !queensideRook.hasMoved &&
              !testBoard[kingRow][1] && // b-file empty
              !testBoard[kingRow][2] && // c-file empty
              !testBoard[kingRow][3] && // d-file empty
              !isPositionUnderAttack({ row: kingRow, col: 2 }, piece.color === 'white' ? 'black' : 'white', testBoard) && // c-file not attacked
              !isPositionUnderAttack({ row: kingRow, col: 3 }, piece.color === 'white' ? 'black' : 'white', testBoard)) { // d-file not attacked
            addMove(kingRow, 2); // King to c-file
          }
        }
        break;
      }
    }

    return moves;
  }, [board]);

  const findKing = (color: PieceColor, testBoard: Board = board): Position | null => {
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = testBoard[row][col];
        if (piece?.type === 'king' && piece.color === color) {
          return { row, col };
        }
      }
    }
    return null;
  };

  const isPositionUnderAttack = (position: Position, byColor: PieceColor, testBoard: Board = board): boolean => {
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = testBoard[row][col];
        if (piece?.color === byColor) {
          const moves = getValidMoves({ row, col }, testBoard, true); // Skip check validation to avoid recursion
          if (moves.some(m => m.row === position.row && m.col === position.col)) {
            return true;
          }
        }
      }
    }
    return false;
  };

  const isInCheck = (color: PieceColor, testBoard: Board = board): boolean => {
    const kingPos = findKing(color, testBoard);
    if (!kingPos) return false;
    return isPositionUnderAttack(kingPos, color === 'white' ? 'black' : 'white', testBoard);
  };

  const isMoveLegal = (from: Position, to: Position, testBoard: Board = board): boolean => {
    const simulatedBoard = testBoard.map(row => [...row]);
    const piece = simulatedBoard[from.row][from.col];
    if (!piece) return false;

    simulatedBoard[to.row][to.col] = piece;
    simulatedBoard[from.row][from.col] = null;

    return !isInCheck(piece.color, simulatedBoard);
  };

  const getAllLegalMoves = (color: PieceColor, testBoard: Board = board): { from: Position; to: Position }[] => {
    const allMoves: { from: Position; to: Position }[] = [];
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = testBoard[row][col];
        if (piece?.color === color) {
          const moves = getValidMoves({ row, col }, testBoard);
          moves.forEach(move => {
            if (isMoveLegal({ row, col }, move, testBoard)) {
              allMoves.push({ from: { row, col }, to: move });
            }
          });
        }
      }
    }
    return allMoves;
  };

  const evaluateBoard = (testBoard: Board, maximizingColor: PieceColor): number => {
    const pieceValues: Record<PieceType, number> = {
      pawn: 1,
      knight: 3,
      bishop: 3,
      rook: 5,
      queen: 9,
      king: 1000
    };

    let score = 0;
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = testBoard[row][col];
        if (piece) {
          const value = pieceValues[piece.type];
          score += piece.color === maximizingColor ? value : -value;
        }
      }
    }
    return score;
  };

  const minimax = (testBoard: Board, depth: number, alpha: number, beta: number, maximizingPlayer: boolean, aiColor: PieceColor): number => {
    if (depth === 0) {
      return evaluateBoard(testBoard, aiColor);
    }

    const moves = getAllLegalMoves(maximizingPlayer ? aiColor : (aiColor === 'white' ? 'black' : 'white'), testBoard);

    if (moves.length === 0) {
      return maximizingPlayer ? -10000 : 10000;
    }

    if (maximizingPlayer) {
      let maxEval = -Infinity;
      for (const move of moves) {
        const newBoard = testBoard.map(row => [...row]);
        const piece = newBoard[move.from.row][move.from.col];
        if (piece) {
          newBoard[move.to.row][move.to.col] = piece;
          newBoard[move.from.row][move.from.col] = null;
          const eval_ = minimax(newBoard, depth - 1, alpha, beta, false, aiColor);
          maxEval = Math.max(maxEval, eval_);
          alpha = Math.max(alpha, eval_);
          if (beta <= alpha) break;
        }
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const move of moves) {
        const newBoard = testBoard.map(row => [...row]);
        const piece = newBoard[move.from.row][move.from.col];
        if (piece) {
          newBoard[move.to.row][move.to.col] = piece;
          newBoard[move.from.row][move.from.col] = null;
          const eval_ = minimax(newBoard, depth - 1, alpha, beta, true, aiColor);
          minEval = Math.min(minEval, eval_);
          beta = Math.min(beta, eval_);
          if (beta <= alpha) break;
        }
      }
      return minEval;
    }
  };

  /**
   * Get AI move using Stockfish engine
   */
  // ⚠️ HELPER: Get opponent info for saving games (uses ref + sessionStorage for reliability)
  const getOpponentInfoForSave = useCallback((): { name: string; elo: number } => {
    console.log('🔍 getOpponentInfoForSave called:', {
      gameMode,
      aiDifficulty,
      refName: opponentInfoRef.current.name,
      refElo: opponentInfoRef.current.elo,
      stateName: opponentName,
      stateElo: opponentElo
    });

    if (gameMode === 'ai' || gameMode?.includes('ai')) {
      return {
        name: `IA (${DIFFICULTY_LEVELS[aiDifficulty].elo} ELO)`,
        elo: DIFFICULTY_LEVELS[aiDifficulty].elo
      };
    } else {
      // For online mode, try multiple sources (priority: ref > sessionStorage > state > fallback)
      let name = opponentInfoRef.current.name;
      let elo = opponentInfoRef.current.elo;

      // If ref is empty, try sessionStorage
      if (!name || elo === 1200) {
        try {
          const stored = sessionStorage.getItem('current_opponent_info');
          console.log('🔍 SessionStorage raw value:', stored);
          if (stored) {
            const parsed = JSON.parse(stored);
            name = parsed.name || name;
            elo = parsed.elo || elo;
            console.log('🔍 Restored from sessionStorage:', parsed);
          } else {
            console.warn('⚠️ SessionStorage is EMPTY - opponent info was cleared!');
          }
        } catch (e) {
          console.warn('Failed to parse opponent info from sessionStorage:', e);
        }
      }

      // If still empty, use state
      if (!name) name = opponentName;
      if (elo === 1200) elo = opponentElo;

      // Final fallback
      if (!name) name = 'Oponente';
      if (elo === 1200 || !elo) elo = 1200;

      const result = { name, elo };
      console.log('🔍 Returning opponent info:', result);
      return result;
    }
  }, [gameMode, aiDifficulty, opponentName, opponentElo]);

  const getAIMove = useCallback(async (): Promise<{ from: Position; to: Position } | null> => {
    try {
      // Convert current board to FEN
      const castlingRights = getCastlingRights(board);
      const fullMoveNumber = Math.floor(moveHistory.length / 2) + 1;
      const fen = boardToFEN(board, currentPlayer, castlingRights, '-', 0, fullMoveNumber);
      const currentMoves = moveHistory.map(m => m.notation);

      console.log('🤖 Requesting Stockfish move for FEN:', fen);
      console.log('📋 Current player:', currentPlayer);
      console.log('📋 Move history:', currentMoves);
      console.log('📋 Board state:', board.map(row => row.map(p => p ? `${p.color[0]}${p.type[0]}` : '--').join(' ')));

      // Get move from Stockfish (with opening book support)
      const move = await chessGamePro.getAiMoveWithStockfish(fen, currentMoves, aiDifficulty);

      if (!move) {
        console.warn('⚠️ Stockfish returned no move, falling back to random legal move');
        const moves = getAllLegalMoves(currentPlayer);
        return moves.length > 0 ? moves[0] : null;
      }

      console.log('✅ AI will move from', move.from, 'to', move.to);
      return move;
    } catch (error) {
      console.error('❌ Error getting AI move:', error);
      // Fallback to random legal move
      const moves = getAllLegalMoves(currentPlayer);
      return moves.length > 0 ? moves[0] : null;
    }
  }, [board, currentPlayer, aiDifficulty, moveHistory, chessGamePro]);

  /**
   * Unified game end handler for all game modes
   * @param result 'victory' | 'loss' | 'draw'
   * @param reason 'checkmate' | 'timeout' | 'resignation' | 'stalemate'
   */
  const handleGameEnd = useCallback((result: 'victory' | 'defeat' | 'draw', reason: 'checkmate' | 'timeout' | 'resignation' | 'stalemate') => {
    console.log(`🏁 handleGameEnd called: ${result} by ${reason}`);

    setTimerActive(false);
    setGameEndReason(reason); // Track the reason for game end

    // Set appropriate game status
    if (reason === 'checkmate' || reason === 'timeout') {
      setGameStatus('checkmate');
    } else if (reason === 'resignation') {
      setGameStatus('resigned');
    } else if (reason === 'stalemate') {
      setGameStatus('stalemate');
    }

    // Play appropriate sound
    if (soundEnabled) {
      if (result === 'victory') {
        playSound('checkmate');
      } else {
        playSound('move');
      }
    }

    // Determine winner based on result and current game state
    let winner: 'white' | 'black' | 'draw';

    if (result === 'draw') {
      winner = 'draw';
    } else if (gameMode === 'ai') {
      // In AI mode, white is always the player
      winner = result === 'victory' ? 'white' : 'black';
    } else if (gameMode === 'online') {
      // In online mode, determine based on myColor
      if (myColor === 'white') {
        winner = result === 'victory' ? 'white' : 'black';
      } else {
        winner = result === 'victory' ? 'black' : 'white';
      }
    } else {
      // Local mode or fallback
      winner = result === 'victory' ? 'white' : 'black';
    }

    // Set game result for UI
    if (result !== 'draw') {
      setGameResult(result);
    }

    // Save game to history
    if (chessGamePro.userProfile) {
      const moves = moveHistory.map(m => m.notation);
      const { name: opponentNameForSave, elo: opponentEloForSave } = getOpponentInfoForSave();

      console.log('💾 Saving game:', { winner, reason, opponentNameForSave, opponentEloForSave });
      chessGamePro.saveGame(winner, moves, opponentNameForSave, opponentEloForSave, gameMode === 'ai' || gameMode?.includes('ai'), myColor || 'white', reason);
    }

    // Show victory/defeat screen
    setTimeout(() => {
      console.log('🏆 Showing victory/defeat screen');
      chessGamePro.setShowVictoryScreen(true);
    }, 1000);

    // Notify online opponent if applicable
    if (gameMode === 'online' && socketService.isConnected() && reason !== 'timeout') {
      setTimeout(() => {
        console.log('📡 Notifying opponent of game end:', { winner, reason });
        socketService.sendGameEnd(winner, reason);
      }, 500);
    }
  }, [gameMode, myColor, opponentName, opponentElo, moveHistory, aiDifficulty, soundEnabled, chessGamePro]);

  const handleResign = useCallback(() => {
    const isConnected = socketService.isConnected();
    const hasRoom = !!currentRoom?.id;

    console.log('🏳️ Resign button clicked');
    console.log('📊 State check:', {
      gameMode,
      isConnected,
      hasRoom,
      currentRoomId: currentRoom?.id,
      shouldShowAbandon: gameMode === 'online' && isConnected && hasRoom
    });

    // 🔀 Route to correct confirmation based on game mode AND connection state
    if (gameMode === 'online' && isConnected && hasRoom) {
      // Online mode with active connection → Use abandon (forfeit to opponent)
      console.log('✅ Condition met: Online mode with active match');
      console.log('→ Showing ABANDON confirmation dialog');
      setShowAbandonConfirm(true);
    } else {
      // AI/Local mode OR online without active connection → Use resign (local only)
      console.log('✅ Condition met: AI/Local mode or no active connection');
      console.log('→ Showing RESIGN confirmation dialog');
      setShowResignConfirm(true);
    }
  }, [gameMode, currentRoom]);

  const confirmResign = useCallback(() => {
    console.log('✅ User confirmed resignation');
    setShowResignConfirm(false);
    setTimerActive(false);
    setGameStatus('resigned');

    // 🏆 Winner is the opposite player
    const winner: 'white' | 'black' = currentPlayer === 'white' ? 'black' : 'white';
    const { name: opponentNameForSave, elo: opponentEloForSave } = getOpponentInfoForSave();

    console.log('💾 Saving resigned game, winner:', winner, 'gameMode:', gameMode, 'opponentElo:', opponentEloForSave);

    // Save game to history first
    if (chessGamePro.userProfile) {
      const moves = moveHistory.map(m => m.notation);
      chessGamePro.saveGame(winner, moves, opponentNameForSave, opponentEloForSave, gameMode === 'ai', myColor || 'white', 'resignation');
    }

    // 🔵 CRITICAL: Set game result for AI mode AFTER saving (user resigned = defeat)
    if (gameMode === 'ai') {
      console.log('💀 AI mode resignation - setting result to DEFEAT');
      setGameResult('defeat');

      // Show victory screen after setting result
      setTimeout(() => {
        console.log('🏆 Setting showVictoryScreen to true after resignation (AI mode)');
        console.log('📊 Current gameResult should be:', 'defeat');
        chessGamePro.setShowVictoryScreen(true);
      }, 500);
    } else {
      // Online mode - don't set result yet, wait for server
      console.log('🌐 Online mode resignation - waiting for server confirmation');
      setTimeout(() => {
        console.log('🏆 Setting showVictoryScreen to true after resignation (online mode)');
        chessGamePro.setShowVictoryScreen(true);
      }, 500);
    }
  }, [currentPlayer, gameMode, aiDifficulty, moveHistory, chessGamePro, setTimerActive, myColor, opponentName, opponentElo, currentRoom]);

  const cancelResign = useCallback(() => {
    console.log('❌ User cancelled resignation');
    setShowResignConfirm(false);
  }, []);

  const checkGameStatus = useCallback((color: PieceColor) => {
    const hasLegalMoves = getAllLegalMoves(color).length > 0;
    const inCheck = isInCheck(color);

    console.log('🔍 Checking game status for', color, {hasLegalMoves, inCheck});

    if (!hasLegalMoves) {
      if (inCheck) {
        console.log('♟️ CHECKMATE detected!');
        setGameStatus('checkmate');
        setTimerActive(false);
        if (soundEnabled) {
          setTimeout(() => playSound('checkmate'), 100);
        }

        // 🏆 Determine winner
        // CRITICAL: 'color' is the player who can't move (LOST)
        // So the winner is the OPPOSITE color (the one who gave checkmate)
        const winner: 'white' | 'black' = color === 'white' ? 'black' : 'white'; // The one who WON
        const { name: opponentNameForSave, elo: opponentEloForSave } = getOpponentInfoForSave();

        // 🎯 Set game result based on who won
        if (gameMode === 'ai') {
          // In AI mode, player is always white, AI is always black
          if (winner === 'white') {
            console.log(`🏆 Player (white) won - setting VICTORY`);
            setGameResult('victory');
          } else {
            console.log(`💀 AI (black) won, player (white) LOST - setting DEFEAT`);
            setGameResult('defeat');
          }
        } else if (gameMode === 'online') {
          // In online mode, check myColor
          if (winner === myColor) {
            console.log('🏆 I won - setting VICTORY');
            setGameResult('victory');
          } else {
            console.log(`💀 Opponent (${winner}) won, I (${myColor}) LOST - setting DEFEAT`);
            setGameResult('defeat');
          }
        }


        if (chessGamePro.userProfile) {
          const moves = moveHistory.map(m => m.notation);
          chessGamePro.saveGame(winner, moves, opponentNameForSave, opponentEloForSave, gameMode === 'ai', myColor || 'white', 'checkmate');
        }

        // Show victory screen after a brief delay
        setTimeout(() => {
          console.log('🏆 Setting showVictoryScreen to true');
          chessGamePro.setShowVictoryScreen(true);
        }, 1000);
      } else {
        console.log('⏸️ STALEMATE detected!');
        setGameStatus('stalemate');
        setTimerActive(false);

        // 🤝 Save draw
        if (chessGamePro.userProfile) {
          const moves = moveHistory.map(m => m.notation);
          const { name: opponentNameForSave, elo: opponentEloForSave } = getOpponentInfoForSave();

          chessGamePro.saveGame('draw', moves, opponentNameForSave, opponentEloForSave, gameMode === 'ai', myColor || 'white', 'stalemate');
        }
      }
    } else if (inCheck) {
      console.log('⚠️ CHECK detected');
      setGameStatus('check');
      if (soundEnabled) {
        setTimeout(() => playSound('check'), 100);
      }
    } else {
      setGameStatus('playing');
    }
  }, [getAllLegalMoves, isInCheck, soundEnabled, gameMode, aiDifficulty, moveHistory, chessGamePro]);

  const handleSquareClick = (row: number, col: number) => {
    // Block all interactions if game is over
    if (gameStatus === 'checkmate' || gameStatus === 'stalemate' || gameStatus === 'resigned') return;

    // Block player from moving during AI's turn
    if (gameMode === 'ai' && currentPlayer === 'black') {
      console.log('🚫 Blocked: AI is playing as black');
      return;
    }

    // 🌐 ONLINE: Block player from moving when it's not their turn
    if (gameMode === 'online' && myColor && currentPlayer !== myColor) {
      console.log('🚫 Blocked: Not your turn (you are', myColor, ', current player is', currentPlayer, ')');
      return;
    }

    const piece = board[row][col];

    if (!selectedPiece) {
      if (piece && piece.color === currentPlayer) {
        if (soundEnabled) playSound('select');
        setSelectedPiece({ row, col });
        const moves = getValidMoves({ row, col });
        const legalMoves = moves.filter(move => isMoveLegal({ row, col }, move));
        setValidMoves(legalMoves);
      }
      return;
    }

    if (selectedPiece.row === row && selectedPiece.col === col) {
      setSelectedPiece(null);
      setValidMoves([]);
      return;
    }

    if (piece && piece.color === currentPlayer) {
      if (soundEnabled) playSound('select');
      setSelectedPiece({ row, col });
      const moves = getValidMoves({ row, col });
      const legalMoves = moves.filter(move => isMoveLegal({ row, col }, move));
      setValidMoves(legalMoves);
      return;
    }

    const isValidMove = validMoves.some(m => m.row === row && m.col === col);
    if (isValidMove) {
      movePiece(selectedPiece, { row, col });
    }

    setSelectedPiece(null);
    setValidMoves([]);
  };

  const movePiece = (from: Position, to: Position, isRemoteMove: boolean = false) => {
    const newBoard = board.map(row => [...row]);
    const piece = newBoard[from.row][from.col];
    const capturedPiece = newBoard[to.row][to.col];

    if (!piece) return;

    // Play sound
    if (soundEnabled) {
      if (capturedPiece) {
        playSound('capture');
      } else {
        playSound('move');
      }
    }

    // Create particles on capture
    if (capturedPiece) {
      const boardElement = document.querySelector('.chess-board');
      if (boardElement) {
        const rect = boardElement.getBoundingClientRect();
        const squareSize = rect.width / 8;
        const x = rect.left + to.col * squareSize + squareSize / 2;
        const y = rect.top + to.row * squareSize + squareSize / 2;
        createParticles(x, y, capturedPiece.color === 'white' ? '#fff' : '#000');
      }

      setCapturedPieces(prev => ({
        ...prev,
        [piece.color]: [...prev[piece.color], capturedPiece]
      }));

      // 📊 Track piece statistics - capture
      chessGamePro.trackPieceAction(piece.type, 'capture');
      chessGamePro.trackPieceAction(capturedPiece.type, 'loss');
    }

    // 📊 Track piece movement
    chessGamePro.trackPieceAction(piece.type, 'move');

    // 🔍 Generate FEN before the move for post-game analysis
    const fenBeforeMove = boardToFEN(board, currentPlayer, getCastlingRights(board), null, moveHistory.length, Math.floor(moveHistory.length / 2) + 1);

    // Move piece
    newBoard[to.row][to.col] = { ...piece, hasMoved: true };
    newBoard[from.row][from.col] = null;

    // ♜ CASTLING: Move rook when king castles
    if (piece.type === 'king' && Math.abs(to.col - from.col) === 2) {
      const kingRow = piece.color === 'white' ? 7 : 0;
      // Kingside castling (O-O): Move rook from h-file to f-file
      if (to.col === 6) {
        const rook = newBoard[kingRow][7];
        newBoard[kingRow][5] = { ...rook!, hasMoved: true };
        newBoard[kingRow][7] = null;
        console.log('♜ Kingside castling (O-O): Rook moved from h to f');
      }
      // Queenside castling (O-O-O): Move rook from a-file to d-file
      else if (to.col === 2) {
        const rook = newBoard[kingRow][0];
        newBoard[kingRow][3] = { ...rook!, hasMoved: true };
        newBoard[kingRow][0] = null;
        console.log('♜ Queenside castling (O-O-O): Rook moved from a to d');
      }
    }

    // Pawn promotion
    if (piece.type === 'pawn') {
      const promotionRow = piece.color === 'white' ? 0 : 7;
      if (to.row === promotionRow) {
        newBoard[to.row][to.col] = { type: 'queen', color: piece.color, hasMoved: true };
      }
    }

    setBoard(newBoard);
    setLastMove({ from, to });

    // Add to move history
    const nextPlayer = currentPlayer === 'white' ? 'black' : 'white';
    const isCheck = isInCheck(nextPlayer, newBoard);
    const hasLegalMoves = getAllLegalMoves(nextPlayer, newBoard).length > 0;
    const isCheckmate = isCheck && !hasLegalMoves;

    console.log('🔍 After move - isCheck:', isCheck, 'hasLegalMoves:', hasLegalMoves, 'isCheckmate:', isCheckmate);

    const notation = toAlgebraicNotation(from, to, piece, capturedPiece, isCheck, isCheckmate, board);
    console.log(`✅ Generated notation: ${notation} for ${piece.color} ${piece.type} from (${from.row},${from.col}) to (${to.row},${to.col})`);
    setMoveHistory(prev => [...prev, {
      from,
      to,
      piece,
      captured: capturedPiece,
      notation,
      timestamp: Date.now(),
      fen: fenBeforeMove // Store FEN for post-game analysis
    }]);

    // 🌐 CRITICAL: Send move to opponent BEFORE processing checkmate
    // This ensures opponent receives the final move before game-end event
    if (gameMode === 'online' && socketService.isConnected() && !isRemoteMove) {
      socketService.sendMove({
        from,
        to,
        notation,
        timestamp: Date.now()
      });
      console.log('📡 Move sent to opponent:', notation);
    }

    // 🔴 CRITICAL: Update game status IMMEDIATELY if checkmate
    if (isCheckmate) {
      console.log('♟️ CHECKMATE detected immediately! (isRemoteMove:', isRemoteMove, ')');
      setGameStatus('checkmate');
      setTimerActive(false);

      if (soundEnabled) playSound('checkmate');

      // Only process game end logic if this is MY move (not opponent's)
      if (!isRemoteMove) {
        // Determine winner: Current player made the checkmate move
        const winner = currentPlayer; // Current player did the checkmate
        
        // 🎯 Check if winner is me or opponent
        if (gameMode === 'ai') {
          // In AI mode, player is always white, AI is always black
          // winner is the current player who made the checkmate move
          if (winner === 'white') {
            console.log(`🏆 Player (white) made checkmate - setting VICTORY`);
            setGameResult('victory');
          } else {
            console.log(`💀 AI (black) made checkmate, player (white) lost - setting DEFEAT`);
            setGameResult('defeat');
          }
        } else {
          // In online/pvp mode, if I made the move, I won
          console.log('🏆 I made checkmate - setting VICTORY');
          setGameResult('victory');
        }

        // Save game result
        const { name: opponentNameForSave, elo: opponentEloForSave } = getOpponentInfoForSave();

        if (chessGamePro.userProfile) {
          const moves = moveHistory.map(m => m.notation).concat([notation]);
          chessGamePro.saveGame(winner, moves, opponentNameForSave, opponentEloForSave, gameMode === 'ai', myColor || 'white', 'checkmate');
        }

        // 🌐 ONLINE MODE: Notify opponent about game end AFTER move is sent
        if (gameMode === 'online' && socketService.isConnected()) {
          console.log('📡 Preparing to send game-end event to opponent (winner:', winner, ')');
          // Delay to ensure move arrives and is processed before game-end
          setTimeout(() => {
            console.log('📡 NOW sending game-end event (winner:', winner, ')');
            socketService.sendGameEnd(winner, 'checkmate');
          }, 500);
        }

        // Show victory screen
        setTimeout(() => {
          chessGamePro.setShowVictoryScreen(true);
        }, 1500);
      } else {
        // Opponent made checkmate - I lost
        console.log('🔵 Checkmate from opponent move');

        if (gameMode === 'online') {
          console.log('🔵 Online mode - waiting for game-end event from server');
        } else {
          // AI mode or local mode - handle defeat immediately
          console.log('💀 Setting result to DEFEAT (opponent checkmate)');
          setGameResult('defeat');

          // Save game result
          const winner = currentPlayer; // Opponent (current player who just moved) won
          const { name: opponentNameForSave, elo: opponentEloForSave } = getOpponentInfoForSave();

          if (chessGamePro.userProfile) {
            const moves = moveHistory.map(m => m.notation);
            console.log('💾 Saving game (defeat):', { winner, opponentNameForSave, opponentEloForSave });
            chessGamePro.saveGame(winner, moves, opponentNameForSave, opponentEloForSave, gameMode === 'ai', myColor || 'white', 'checkmate');
          }

          // Show defeat screen
          setTimeout(() => {
            chessGamePro.setShowVictoryScreen(true);
          }, 1500);
        }
      }
    } else if (isCheck) {
      console.log('⚠️ CHECK detected!');
      setGameStatus('check');
      if (soundEnabled) playSound('check');
    } else if (!hasLegalMoves) {
      console.log('🤝 STALEMATE detected!');
      setGameStatus('stalemate');
      setTimerActive(false);

      // Save stalemate result
      if (chessGamePro.userProfile) {
        const moves = moveHistory.map(m => m.notation);
        const { name: opponentNameForSave, elo: opponentEloForSave } = getOpponentInfoForSave();

        console.log('💾 Saving game (stalemate):', { opponentNameForSave, opponentEloForSave });
        chessGamePro.saveGame('draw', moves, opponentNameForSave, opponentEloForSave, gameMode === 'ai', myColor || 'white', 'stalemate');
      }

      // Show draw screen
      setTimeout(() => {
        chessGamePro.setShowVictoryScreen(true);
      }, 1500);
    } else {
      setGameStatus('playing');
    }

    // Add time increment after each move (if applicable)
    if (incrementPerMove > 0) {
      if (currentPlayer === 'white') {
        setWhiteTime(prev => prev + incrementPerMove);
        console.log(`⏱️ Added ${incrementPerMove}s to white's clock`);
      } else {
        setBlackTime(prev => prev + incrementPerMove);
        console.log(`⏱️ Added ${incrementPerMove}s to black's clock`);
      }
    }

    setCurrentPlayer(nextPlayer);
  };

  // AI move effect with Stockfish
  useEffect(() => {
    // Allow AI to play when it's their turn and game is not over
    // CRITICAL: AI must be able to play even when in check to escape it!
    const canAiPlay = gameMode === 'ai' &&
                      currentPlayer === 'black' &&
                      gameStatus !== 'checkmate' &&
                      gameStatus !== 'stalemate' &&
                      gameStatus !== 'resigned' &&
                      !isAiThinking;

    console.log('🔍 AI useEffect triggered:', {
      gameMode,
      currentPlayer,
      gameStatus,
      isAiThinking,
      canAiPlay
    });

    if (canAiPlay) {
      console.log('🤖 AI turn detected, starting to think...');
      setIsAiThinking(true);

      // Execute AI move asynchronously with small delay to ensure state update
      const executeAiMove = async () => {
        try {
          console.log('⏳ Waiting 300ms before AI calculation...');
          await new Promise(resolve => setTimeout(resolve, 300)); // Small delay for UX

          console.log('🎯 Calling getAIMove()...');
          const aiMove = await getAIMove();
          console.log('📥 getAIMove() returned:', aiMove);

          // Verify game is still valid for AI move (not ended during calculation)
          if (aiMove && currentPlayer === 'black' && gameStatus !== 'checkmate' && gameStatus !== 'stalemate' && gameStatus !== 'resigned') {
            console.log('✅ AI executing move:', aiMove);
            movePiece(aiMove.from, aiMove.to);
          } else {
            console.warn('⚠️ AI move cancelled or invalid:', {
              aiMove,
              gameStatus,
              currentPlayer,
              reason: !aiMove ? 'No move returned' : currentPlayer !== 'black' ? 'Not black turn' : 'Game ended'
            });
          }
        } catch (error) {
          console.error('❌ Error executing AI move:', error);
        } finally {
          console.log('🏁 AI thinking finished, setting isAiThinking to false');
          setIsAiThinking(false);
        }
      };

      executeAiMove();
    }
  }, [gameMode, currentPlayer, gameStatus]); // Remove isAiThinking from dependencies to prevent loop

  // 🌐 MULTIPLAYER ONLINE: Listen for opponent moves
  useEffect(() => {
    if (gameMode !== 'online' || !socketService.isConnected()) return;

    const handleOpponentMove = (move: { from: Position; to: Position; notation: string; timestamp: number }) => {
      console.log('📥 Received move from opponent:', move);

      // Execute opponent's move immediately (server ensures turn validation)
      movePiece(move.from, move.to, true); // isRemoteMove = true
    };

    const handleChatMessage = (message: ChatMessage) => {
      console.log('💬 Chat message received:', message);
      setChatMessages(prev => [...prev, message]);
      if (soundEnabled) playSound('select');
    };

    const handleOpponentDisconnected = () => {
      console.warn('⚠️ Opponent disconnected - starting reconnection timer');
      setIsOpponentDisconnected(true);

      // Start 30-second reconnection countdown
      setReconnectionTimeLeft(30);

      // Clear any existing timer
      if (reconnectionTimerRef.current) {
        clearInterval(reconnectionTimerRef.current);
      }

      // Start countdown
      reconnectionTimerRef.current = setInterval(() => {
        setReconnectionTimeLeft(prev => {
          if (prev <= 1) {
            // Time's up! Opponent loses by abandonment
            console.error('⏰ Reconnection timeout - opponent abandoned');
            if (reconnectionTimerRef.current) {
              clearInterval(reconnectionTimerRef.current);
              reconnectionTimerRef.current = null;
            }

            // Notify server that opponent abandoned (server will send game-end to both players)
            const winner = myColor; // I win because opponent abandoned
            socketService.sendGameEnd(winner || 'white', 'abandonment');

            // End game locally - I won by opponent's abandonment
            setGameStatus('resigned');
            setGameResult('victory');
            setGameEndReason('abandonment');
            setTimerActive(false);

            if (soundEnabled) {
              playSound('checkmate');
            }

            // Save game result - opponent abandoned, I win
            if (chessGamePro.userProfile && currentRoom) {
              const moves = moveHistory.map(m => m.notation);
              const winner = myColor; // I win because opponent abandoned

              chessGamePro.saveGame(
                winner || 'white', // Result: my color wins
                moves,
                opponentName || 'Oponente',
                opponentElo,
                false, // Not AI game
                myColor, // My color
                'abandonment' // End reason
              );
            }

            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    };

    const handleOpponentReconnected = () => {
      console.log('✅ Opponent reconnected - canceling abandonment timer');
      setIsOpponentDisconnected(false);

      // Clear reconnection timer
      if (reconnectionTimerRef.current) {
        clearInterval(reconnectionTimerRef.current);
        reconnectionTimerRef.current = null;
      }
      setReconnectionTimeLeft(30); // Reset for next time
    };

    const handleMyReconnect = () => {
      console.log('🔄 I reconnected to the server');

      // Clear my disconnection state
      setAmIDisconnected(false);

      // Clear my reconnection timer
      if (myReconnectionTimerRef.current) {
        clearInterval(myReconnectionTimerRef.current);
        myReconnectionTimerRef.current = null;
      }
      setMyReconnectionTimeLeft(30);

      // 📡 IMPORTANT: Server-side requirement
      // When a player reconnects, the server should check if:
      // 1. The player has an active game
      // 2. That game ended while they were disconnected (e.g., by abandonment)
      // 3. If so, send a 'game-end' event with the result
      //
      // The handleGameEnd() function below will automatically show the
      // victory/defeat screen when the server sends the event.
    };

    const handleMyDisconnect = () => {
      console.warn('⚠️ I lost connection to the server');

      // Only track disconnection if we're in an active online game
      if (gameMode !== 'online' || gameStatus !== 'playing') return;

      setAmIDisconnected(true);
      setMyReconnectionTimeLeft(30);

      // Clear any existing timer
      if (myReconnectionTimerRef.current) {
        clearInterval(myReconnectionTimerRef.current);
      }

      // Start 30-second countdown
      myReconnectionTimerRef.current = setInterval(() => {
        setMyReconnectionTimeLeft(prev => {
          if (prev <= 1) {
            // Time's up! I lose by abandonment
            console.error('⏰ My reconnection timeout - I abandoned the game');
            if (myReconnectionTimerRef.current) {
              clearInterval(myReconnectionTimerRef.current);
              myReconnectionTimerRef.current = null;
            }

            // The server should send game-end event when I reconnect
            // For now, we just stop the timer
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    };

    const handleGameStart = (room: Room) => {
      console.log('🎮 Game started:', room);
      setCurrentRoom(room);
      resetGame();
    };

    const handleGameEnd = (result: { winner: 'white' | 'black' | 'draw'; reason: string }) => {
      console.log('🏁 Game ended (received from server):', result);
      console.log('🔍 My state:', { myColor, currentPlayer, gameStatus, amIDisconnected });

      // ⚠️ CRITICAL: Check if I was disconnected BEFORE clearing the banner
      // If I was disconnected, I should NOT show the defeat screen (I already have the orange banner)
      const wasIDisconnected = amIDisconnected;

      // ⚠️ CRITICAL: Clear all disconnection banners when game ends
      // This prevents showing both banners when the disconnected player receives game-end
      if (amIDisconnected) {
        console.log('🧹 Clearing my disconnection banner (game ended)');
        setAmIDisconnected(false);
        if (myReconnectionTimerRef.current) {
          clearInterval(myReconnectionTimerRef.current);
          myReconnectionTimerRef.current = null;
        }
      }

      if (isOpponentDisconnected) {
        console.log('🧹 Clearing opponent disconnection banner (game ended)');
        setIsOpponentDisconnected(false);
        if (reconnectionTimerRef.current) {
          clearInterval(reconnectionTimerRef.current);
          reconnectionTimerRef.current = null;
        }
      }

      // ⚠️ If I was disconnected when the game ended, DON'T show the defeat screen YET
      // Save the result with opponent info to sessionStorage and show it when they reconnect
      if (wasIDisconnected && result.reason === 'abandonment') {
        console.log('⚠️ I was disconnected when game ended - saving result for later');

        // ⚠️ CRITICAL: Get opponent info from currentRoom (source of truth)
        const mySocketId = socketService.getSocketId();
        const opponent = currentRoom?.players.find(p => p.id !== mySocketId);
        const finalOpponentName = opponent?.name || opponentName || 'Oponente';
        const finalOpponentElo = opponent?.elo || opponentElo || 1200;

        console.log('🔍 Getting opponent info from currentRoom:', {
          mySocketId,
          opponent,
          finalOpponentName,
          finalOpponentElo,
          stateOpponentName: opponentName,
          stateOpponentElo: opponentElo
        });

        // Save game result with opponent info from currentRoom
        if (chessGamePro.userProfile) {
          const moves = moveHistory.map(m => m.notation);
          console.log('💾 Saving game from disconnection:', {
            winner: result.winner,
            myColor,
            reason: result.reason,
            opponentName: finalOpponentName,
            opponentElo: finalOpponentElo
          });

          chessGamePro.saveGame(
            result.winner,
            moves,
            finalOpponentName,
            finalOpponentElo,
            false,
            myColor || 'white',
            'abandonment'
          );
        }

        // Store result in sessionStorage with opponent info for when user reconnects
        // Add 'alreadySaved' flag to prevent duplicate save
        sessionStorage.setItem('pending_game_result', JSON.stringify({
          ...result,
          opponentName: finalOpponentName,
          opponentElo: finalOpponentElo,
          alreadySaved: true // Flag to prevent duplicate save
        }));

        console.log('💾 Saved pending game result to sessionStorage');
        return; // Exit early without showing defeat screen NOW
      }

      // Determine if I won or lost
      const iWon = result.winner === myColor;
      const isDraw = result.winner === 'draw';

      console.log('🎯 Game result determination:', {
        myColor,
        winner: result.winner,
        iWon,
        isDraw,
        shouldBeVictory: iWon,
        shouldBeDefeat: !iWon && !isDraw
      });

      // Set game result for UI
      if (isDraw) {
        setGameResult(null); // Draw doesn't set victory/defeat
      } else if (iWon) {
        setGameResult('victory');
        console.log('🏆 Setting game result to VICTORY');
      } else {
        setGameResult('defeat');
        console.log('💀 Setting game result to DEFEAT');
      }

      // Update game status
      if (result.reason === 'checkmate') {
        setGameStatus('checkmate');
      } else if (result.reason === 'resignation' || result.reason === 'abandonment') {
        setGameStatus('resigned');
        setGameEndReason('resignation'); // Store for display
      } else if (result.reason === 'stalemate') {
        setGameStatus('stalemate');
      }

      setTimerActive(false);

      // Play sound
      if (soundEnabled) {
        if (iWon) {
          playSound('checkmate');
        } else {
          playSound('move');
        }
      }

      // Save game result (skip if already saved during disconnection)
      if (chessGamePro.userProfile && !(result as any).alreadySaved) {
        const moves = moveHistory.map(m => m.notation);

        // ⚠️ CRITICAL: Get opponent info from currentRoom (source of truth)
        // This ensures we always have the correct ELO, even if state is stale
        const mySocketId = socketService.getSocketId();
        const opponent = currentRoom?.players.find(p => p.id !== mySocketId);
        const finalOpponentName = opponent?.name || opponentName || 'Oponente';
        const finalOpponentElo = opponent?.elo || opponentElo || 1200;

        console.log('💾 Saving game from server event:', {
          winner: result.winner,
          myColor,
          iWon,
          reason: result.reason,
          opponentName: finalOpponentName,
          opponentElo: finalOpponentElo,
          fromCurrentRoom: !!opponent,
          currentRoomData: opponent,
          stateOpponentElo: opponentElo
        });

        // Map server reason to game end reason type
        let endReason: 'checkmate' | 'timeout' | 'resignation' | 'abandonment' | 'stalemate' = 'checkmate';
        if (result.reason === 'abandonment') {
          endReason = 'abandonment';
        } else if (result.reason === 'resignation') {
          endReason = 'resignation';
        } else if (result.reason === 'timeout') {
          endReason = 'timeout';
        } else if (result.reason === 'stalemate') {
          endReason = 'stalemate';
        }

        chessGamePro.saveGame(
          result.winner,
          moves,
          finalOpponentName,
          finalOpponentElo,
          false,
          myColor || 'white',
          endReason
        );
      } else if ((result as any).alreadySaved) {
        console.log('⏭️ Skipping game save - already saved during disconnection');
      }

      // Show victory/defeat screen
      setTimeout(() => {
        chessGamePro.setShowVictoryScreen(true);
      }, 1500);
    };

    socketService.onMove(handleOpponentMove);
    socketService.onChatMessage(handleChatMessage);
    socketService.onOpponentDisconnected(handleOpponentDisconnected);
    socketService.onOpponentReconnected(handleOpponentReconnected);
    socketService.onReconnect(handleMyReconnect);
    socketService.onDisconnect(handleMyDisconnect);
    socketService.onGameStart(handleGameStart);
    socketService.onGameEnd(handleGameEnd);

    return () => {
      socketService.removeAllListeners();
    };
  }, [gameMode, myColor, currentPlayer, soundEnabled, moveHistory, opponentName, opponentElo, currentRoom, chessGamePro]);

  // 🌐 MULTIPLAYER ONLINE: Match found handler
  const handleMatchFound = (match: Room) => {
    console.log('🎯 Match found:', match);
    console.log('🔍 Raw match.players:', JSON.stringify(match.players, null, 2));
    setCurrentRoom(match);

    // ⚠️ CHECK FOR PENDING GAME RESULT (from reconnection to finished game)
    const pendingResult = sessionStorage.getItem('pending_game_result');
    if (pendingResult) {
      console.log('🏁 Found pending game result from reconnection:', pendingResult);
      sessionStorage.removeItem('pending_game_result');

      // Parse and process the result
      const result = JSON.parse(pendingResult);

      // ⚠️ RESTORE OPPONENT INFO from the pending result
      if (result.opponentName) {
        console.log('👤 Restoring opponent info:', result.opponentName, result.opponentElo);
        setOpponentName(result.opponentName);
        setOpponentElo(result.opponentElo);
      }

      // Give a small delay for the component to mount properly
      setTimeout(() => {
        handleGameEnd(result);
      }, 100);

      return; // Don't start a new game
    }

    // Determine my color based on my actual socket ID
    const mySocketId = socketService.getSocketId();
    console.log('🔍 My socket ID:', mySocketId);
    console.log('🔍 Match players:', match.players);

    const myPlayerIndex = match.players.findIndex(p => p.id === mySocketId);
    const color = myPlayerIndex === 0 ? 'white' : 'black';
    setMyColor(color);

    console.log('🎨 My color:', color, '(player index:', myPlayerIndex, ')');

    // Find opponent
    const opponent = match.players.find(p => p.id !== mySocketId);
    if (opponent) {
      console.log('👤 Opponent found:', opponent.name, 'ELO:', opponent.elo);
      console.log('🔧 Opponent ELO type:', typeof opponent.elo, '| Value:', opponent.elo, '| Is 1200?', opponent.elo === 1200);
      console.log('🔧 Setting opponent state AND ref NOW...');

      // Update both state and ref for reliability
      setOpponentName(opponent.name);
      setOpponentElo(opponent.elo);
      opponentInfoRef.current = { name: opponent.name, elo: opponent.elo };

      // ⚠️ CRITICAL: Also save to sessionStorage as backup (survives re-renders)
      sessionStorage.setItem('current_opponent_info', JSON.stringify({
        name: opponent.name,
        elo: opponent.elo
      }));

      console.log('🔧 setState and ref update completed');
      console.log('🔍 Ref value:', opponentInfoRef.current);
      console.log('🔍 SessionStorage value:', sessionStorage.getItem('current_opponent_info'));
    } else {
      console.warn('⚠️ NO OPPONENT FOUND in match.players!', match.players);
    }

    // Start game immediately
    setGameMode('online');
    resetGame();
    setTimerActive(true);
  };

  // 🌐 MULTIPLAYER ONLINE: Send chat message
  const handleSendChatMessage = () => {
    if (!chatInput.trim() || !socketService.isConnected()) return;

    socketService.sendChatMessage(chatInput.trim());
    setChatInput('');
  };

  // 🌐 MULTIPLAYER ONLINE: Leave match
  const handleLeaveMatch = async () => {
    try {
      await socketService.leaveMatch();
      setCurrentRoom(null);
      setMyColor(null);
      setOpponentName('');
      setChatMessages([]);
      setGameMode('menu');
    } catch (error) {
      console.error('Failed to leave match:', error);
    }
  };

  // 🌐 MULTIPLAYER ONLINE: Abandon match (forfeit)
  const handleAbandonMatch = async () => {
    console.log('💔 Abandon match requested');
    console.log('🔍 Current state:', { myColor, currentRoom: currentRoom?.id, isConnected: socketService.isConnected() });

    // ⚠️ CRITICAL: Only send to server if we're actually in an online match
    if (!socketService.isConnected() || !currentRoom?.id) {
      console.log('ℹ️ Not in an active online match - redirecting to local resignation');
      setShowAbandonConfirm(false);
      setShowResignConfirm(true);
      return;
    }

    // Determine winner (opponent wins)
    const winner = myColor === 'white' ? 'black' : 'white';
    console.log('🏆 Calculated winner (opponent):', winner, '(I am:', myColor, ')');

    // Send game-end to server (opponent wins by abandonment)
    socketService.sendGameEnd(winner, 'abandonment');

    // Set local game result as defeat (UI only - don't save yet, wait for server confirmation)
    setGameResult('defeat');
    setGameStatus('resigned');
    setGameEndReason('resignation');
    setTimerActive(false);

    // Close confirmation modal
    setShowAbandonConfirm(false);

    console.log('📡 Abandonment notification sent to server - waiting for confirmation');

    // DON'T save game here - the server will send game-end event back which will trigger save
  };

  // Handle back to menu during game (any mode)
  const handleBackToMenuDuringOnlineGame = () => {
    // If in active game (online or AI), show confirmation
    if ((gameMode === 'online' || gameMode === 'ai') && gameStatus === 'playing') {
      setShowAbandonConfirm(true);
    } else {
      // Otherwise go directly to menu
      setGameMode('menu');
      // Clear opponent info when going back to menu
      sessionStorage.removeItem('current_opponent_info');
      console.log('🧹 Cleared opponent info from sessionStorage (back to menu)');
    }
  };

  const resetGame = () => {
    setBoard(initializeBoard());
    setSelectedPiece(null);
    setValidMoves([]);
    setCurrentPlayer('white');
    setCapturedPieces({ white: [], black: [] });
    setGameStatus('playing');
    setGameEndReason(null); // Reset game end reason
    setGameResult(null); // Reset game result (victory/defeat)
    setLastMove(null);
    setMoveHistory([]);
    setParticles([]);
    // Set time based on selected time control
    const selectedTime = TIME_CONTROLS[timeControl].time;
    setWhiteTime(selectedTime);
    setBlackTime(selectedTime);
    setIncrementPerMove(TIME_CONTROLS[timeControl].increment);
    setTimerActive(true);
    setIsAiThinking(false);

    // ⏱️ CRITICAL: Reset game start time for accurate duration tracking
    chessGamePro.resetGameStartTime();

    // ⚠️ DON'T clear opponent info here - needed for game saving!
  };

  const startGame = (mode: GameMode, difficulty?: Difficulty) => {
    setGameMode(mode);
    if (difficulty) setAiDifficulty(difficulty);
    resetGame();
  };

  const getSquareColor = (row: number, col: number): string => {
    const theme = THEMES[currentTheme];
    const isLight = (row + col) % 2 === 0;
    const isSelected = selectedPiece?.row === row && selectedPiece?.col === col;
    const isValidMove = validMoves.some(m => m.row === row && m.col === col);
    const isLastMoveSquare = lastMove &&
      ((lastMove.from.row === row && lastMove.from.col === col) ||
       (lastMove.to.row === row && lastMove.to.col === col));

    if (isSelected) return theme.selected;
    if (isValidMove) return theme.valid;
    if (isLastMoveSquare) return theme.lastMove;
    return isLight ? theme.light : theme.dark;
  };

  // Log state changes only (not every render)
  useEffect(() => {
    console.log('🎮 Game State Changed:', {
      gameMode,
      gameStatus,
      showVictoryScreen: chessGamePro.showVictoryScreen,
      currentPlayer,
      timerActive
    });
  }, [gameMode, gameStatus, chessGamePro.showVictoryScreen, currentPlayer, timerActive]);

  // Cleanup reconnection timers on unmount or game end
  useEffect(() => {
    return () => {
      if (reconnectionTimerRef.current) {
        clearInterval(reconnectionTimerRef.current);
        reconnectionTimerRef.current = null;
      }
      if (myReconnectionTimerRef.current) {
        clearInterval(myReconnectionTimerRef.current);
        myReconnectionTimerRef.current = null;
      }
    };
  }, []);

  // Clear reconnection timers when game ends
  useEffect(() => {
    if (gameStatus !== 'playing') {
      if (reconnectionTimerRef.current) {
        clearInterval(reconnectionTimerRef.current);
        reconnectionTimerRef.current = null;
      }
      if (myReconnectionTimerRef.current) {
        clearInterval(myReconnectionTimerRef.current);
        myReconnectionTimerRef.current = null;
      }
    }
  }, [gameStatus]);

  // Tutorial steps
  const tutorialSteps = [
    "¡Bienvenido a Chess Clash! Haz clic en cualquier pieza blanca para empezar.",
    "Excelente. Los cuadros verdes muestran dónde puedes mover. Haz clic en uno.",
    "¡Bien hecho! Ahora las negras mueven. En un juego real, el oponente jugaría aquí.",
    "Nota el temporizador arriba. Cada jugador tiene tiempo limitado. ¡No te quedes sin tiempo!",
    "Las piezas capturadas se muestran a los lados. ¡Captura piezas para ganar ventaja!",
    "¡Tutorial completo! Presiona 'Menú Principal' para comenzar a jugar."
  ];

  // 👤 User Selection Screen
  if (gameMode === 'user-selection') {
    return (
      <>
        <UserSelection
          onSelectUser={handleSelectExistingUser}
          onCreateNew={handleCreateNewUser}
        />

        {/* 👤 Profile Setup Modal - Rendered on top of user selection */}
        {showProfileSetup && (
          <>
            {console.log('🎨 Rendering ProfileSetup modal, showProfileSetup:', showProfileSetup)}
            <ProfileSetup
              defaultName={chessGamePro.authUser?.name || ''}
              currentUserId={chessGamePro.authUser?.userId}
              onComplete={(username) => {
                console.log('📝 Username entered:', username);
                updateUsername(username);
                chessGamePro.reloadAuthUser();
                setShowProfileSetup(false);
                setGameMode('elo-selection');
                console.log('✅ Username set, proceeding to ELO selection');
              }}
            />
          </>
        )}
      </>
    );
  }

  // 🔐 Authentication Screen
  if (gameMode === 'auth') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#07070A] via-[#0F0F17] to-[#07070A] text-white p-4 md:p-8 flex items-center justify-center">
        <div className="max-w-md w-full text-center">
          <div className="mb-8 flex justify-center">
            <img
              src="/branding/logo-lateral.png"
              alt="DeepM8"
              className="h-24 md:h-32 object-contain mb-4"
            />
          </div>

          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-8">
            <div className="text-6xl mb-6">♔</div>
            <h2 className="text-2xl font-bold mb-4">Autenticando...</h2>
            <p className="text-slate-400 mb-6">
              Conectando con SeaVerse para obtener tu perfil
            </p>
            <div className="w-16 h-16 mx-auto border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          </div>

          {chessGamePro.authUser && (
            <div className="mt-6 bg-green-500/20 border border-green-500 rounded-xl p-4">
              <p className="text-green-400">
                ✓ Conectado como {chessGamePro.authUser.name}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 🎯 ELO Selection Screen
  if (gameMode === 'elo-selection') {
    const handleEloSelection = async (elo: number) => {
      console.log('🎯 ELO button clicked:', elo);
      console.log('📊 Current state before creation:', {
        gameMode,
        hookGameMode: chessGamePro.gameMode,
        userProfile: chessGamePro.userProfile,
        authUser: chessGamePro.authUser
      });

      setIsCreatingProfile(true);
      try {
        await chessGamePro.createProfile(elo);
        console.log('✅ createProfile completed');
        console.log('📊 State after creation:', {
          gameMode,
          hookGameMode: chessGamePro.gameMode,
          userProfile: chessGamePro.userProfile
        });
      } catch (error) {
        console.error('❌ Error in handleEloSelection:', error);
      } finally {
        setIsCreatingProfile(false);
        console.log('🏁 handleEloSelection finished');
      }
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-[#07070A] via-[#0F0F17] to-[#07070A] text-white p-4 md:p-8 flex items-center justify-center">
        <div className="max-w-2xl w-full">
          <div className="text-center mb-12">
            <div className="flex justify-center mb-6">
              <img
                src="/branding/logo-m8.png"
                alt="DeepM8"
                className="h-36 md:h-48 object-contain"
              />
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-blue-200 via-blue-400 to-blue-600 bg-clip-text text-transparent">
              Bienvenido, {getDisplayName()}
            </h1>
            <p className="text-slate-400 text-lg">Paso 2 de 2: Selecciona tu nivel inicial de ELO</p>
          </div>

          {isCreatingProfile && (
            <div className="mb-6 bg-blue-500/20 border border-blue-500 rounded-xl p-4 text-center">
              <div className="flex items-center justify-center gap-3">
                <div className="w-6 h-6 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-blue-400">Creando tu perfil...</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[400, 800, 1200, 1600].map((elo) => (
              <button
                key={elo}
                onClick={() => handleEloSelection(elo)}
                disabled={isCreatingProfile}
                className={`group bg-slate-800/50 backdrop-blur border-2 border-slate-700 hover:border-purple-500 rounded-2xl p-6 transition-all duration-300 hover:scale-105 ${
                  isCreatingProfile ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <div className="text-4xl mb-3">
                  {elo === 400 && '🌱'}
                  {elo === 800 && '⚔️'}
                  {elo === 1200 && '🏆'}
                  {elo === 1600 && '👑'}
                </div>
                <div className="text-3xl font-bold bg-gradient-to-r from-blue-200 via-blue-400 to-blue-600 bg-clip-text text-transparent mb-2">{elo}</div>
                <div className="text-sm text-slate-400">
                  {elo === 400 && 'Principiante'}
                  {elo === 800 && 'Aficionado'}
                  {elo === 1200 && 'Intermedio'}
                  {elo === 1600 && 'Avanzado'}
                </div>
              </button>
            ))}
          </div>

          <div className="mt-8 bg-blue-500/20 border border-blue-500 rounded-xl p-6">
            <h3 className="font-semibold mb-2 text-blue-400">ℹ️ Sistema ELO FIDE</h3>
            <p className="text-sm text-slate-300">
              Tu ELO subirá o bajará después de cada partida según la normativa oficial de la FIDE.
              Puedes cambiarlo según tu nivel de experiencia en ajedrez.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 📊 Statistics Screen (with Deep M8 Coach Profile Integration)
  if (gameMode === 'stats') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#07070A] via-[#0F0F17] to-[#07070A] text-white p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header with Logo and Back Button */}
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-4">
              <img
                src="/branding/logo-lateral.png"
                alt="DeepM8"
                className="h-24 md:h-32 object-contain"
              />
            </div>
            <button
              onClick={() => setGameMode('menu')}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-semibold transition-all"
            >
              ← Volver
            </button>
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-blue-300 via-blue-500 to-blue-700 bg-clip-text text-transparent mb-8">
            Mi Perfil
          </h1>

          {/* ELO & Basic Stats */}
          {chessGamePro.userProfile && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6">
                <div className="text-purple-400 text-4xl font-bold mb-2">
                  {chessGamePro.userProfile.eloRating}
                </div>
                <div className="text-slate-400">ELO Rating</div>
                <div className="text-sm text-slate-500 mt-2">
                  Inicial: {chessGamePro.userProfile.initialElo}
                </div>
              </div>

              <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6">
                <div className="text-green-400 text-4xl font-bold mb-2">
                  {chessGamePro.userProfile.wins}
                </div>
                <div className="text-slate-400">Victorias</div>
                <div className="text-sm text-slate-500 mt-2">
                  {((chessGamePro.userProfile.wins / Math.max(chessGamePro.userProfile.totalGames, 1)) * 100).toFixed(1)}% win rate
                </div>
              </div>

              <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6">
                <div className="text-blue-400 text-4xl font-bold mb-2">
                  {chessGamePro.userProfile.totalGames}
                </div>
                <div className="text-slate-400">Partidas</div>
                <div className="text-sm text-slate-500 mt-2">
                  {chessGamePro.userProfile.losses} derrotas, {chessGamePro.userProfile.draws} tablas
                </div>
              </div>
            </div>
          )}

          {/* Deep M8 Coach Profile Sections */}
          {loadingCoachProfile ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🧠</div>
              <p className="text-slate-400">Cargando perfil de Deep M8 Coach...</p>
            </div>
          ) : coachProfile && coachProfile.totalGames > 0 ? (
            <>
              {/* Progress Chart */}
              {coachProfile.gameHistory && coachProfile.gameHistory.length > 0 && (
                <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6 mb-8">
                  <h2 className="text-2xl font-bold mb-6 text-purple-400 flex items-center gap-2">
                    <span>📈</span> Progreso de Precisión
                  </h2>
                  <ProgressChart gameHistory={coachProfile.gameHistory} />
                </div>
              )}

              {/* Achievements Gallery */}
              <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6 mb-8">
                <h2 className="text-2xl font-bold mb-6 text-purple-400 flex items-center gap-2">
                  <span>🏆</span> Logros y Badges
                </h2>

                {/* Progress Bar */}
                <div className="mb-8">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-white font-semibold">Progreso de Logros</span>
                    <span className="text-purple-400 font-bold">
                      {(coachProfile.achievements || []).length}/24
                    </span>
                  </div>
                  <div className="w-full bg-slate-900/50 rounded-full h-4 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-500"
                      style={{ width: `${((coachProfile.achievements || []).length / 24) * 100}%` }}
                    />
                  </div>
                  <div className="text-sm text-slate-400 mt-1">
                    {(((coachProfile.achievements || []).length / 24) * 100).toFixed(1)}% Completado
                  </div>
                </div>

                {/* Badges Grid */}
                <AchievementsGrid
                  unlockedAchievements={coachProfile.achievements || []}
                  size="medium"
                />
              </div>

              {/* Strengths & Weaknesses */}
              {(coachProfile.strengths.length > 0 || coachProfile.weaknesses.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  {/* Strengths */}
                  {coachProfile.strengths.length > 0 && (
                    <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6">
                      <h3 className="text-xl font-bold mb-4 text-green-400 flex items-center gap-2">
                        <span>💪</span> Fortalezas
                      </h3>
                      <div className="space-y-2">
                        {coachProfile.strengths.map((strength: string, idx: number) => (
                          <div key={idx} className="bg-green-500/10 rounded-lg p-3 text-green-300">
                            {strength}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Weaknesses */}
                  {coachProfile.weaknesses.length > 0 && (
                    <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6">
                      <h3 className="text-xl font-bold mb-4 text-orange-400 flex items-center gap-2">
                        <span>🎯</span> Áreas de Mejora
                      </h3>
                      <div className="space-y-3">
                        {coachProfile.weaknesses.slice(0, 5).map((weakness: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between bg-orange-500/10 rounded-lg p-4 border border-orange-500/20">
                            <div>
                              <div className="text-orange-300 font-medium">{weakness.description}</div>
                              <div className="text-sm text-slate-400 mt-1">Tipo: {weakness.type}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-orange-400 font-bold text-lg">{weakness.occurrences}x</div>
                              <div className="text-slate-500 text-xs">ocurrencias</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Deep M8 Coach Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6">
                  <div className="text-purple-400 text-4xl font-bold mb-2">
                    {coachProfile.averageAccuracy}%
                  </div>
                  <div className="text-slate-400">Precisión Promedio</div>
                  <div className="text-sm text-slate-500 mt-2">
                    De {coachProfile.totalGames} partidas analizadas
                  </div>
                </div>

                <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6">
                  <div className="text-blue-400 text-4xl font-bold mb-2">
                    {coachProfile.totalMoves}
                  </div>
                  <div className="text-slate-400">Movimientos Totales</div>
                  <div className="text-sm text-slate-500 mt-2">
                    Analizados por DeepM8 Coach
                  </div>
                </div>

                <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6">
                  <div className="text-green-400 text-4xl font-bold mb-2">
                    {(coachProfile.achievements || []).length}
                  </div>
                  <div className="text-slate-400">Logros Desbloqueados</div>
                  <div className="text-sm text-slate-500 mt-2">
                    De 24 logros disponibles
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-slate-400 bg-slate-800/30 backdrop-blur rounded-3xl border-2 border-slate-700 p-12">
              <div className="text-8xl mb-6">🎮</div>
              <h2 className="text-3xl font-bold text-white mb-4">¡Comienza tu viaje en el ajedrez!</h2>
              <p className="text-lg mb-2">No hay partidas analizadas todavía</p>
              <p className="text-sm mt-4 max-w-md mx-auto leading-relaxed">
                Juega algunas partidas y usa el botón <span className="text-purple-400 font-semibold">"Analizar Partida"</span> al finalizar.
                Deep M8 Coach analizará tus movimientos y guardará tu progreso aquí.
              </p>
              <div className="mt-8 flex gap-4 justify-center">
                <button
                  onClick={() => setGameMode('menu')}
                  className="px-6 py-3 bg-white hover:bg-gray-100 text-purple-500 rounded-xl font-bold transition-all duration-200 hover:scale-105 shadow-lg"
                >
                  🎯 Jugar Ahora
                </button>
              </div>
            </div>
          )}

          {/* Piece Stats (Original) */}
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6">
            <h2 className="text-2xl font-bold mb-6 text-purple-400">Estadísticas por Pieza</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {chessGamePro.pieceStats.map((stat) => (
                <div key={stat.pieceType} className="bg-slate-900/50 rounded-xl p-4">
                  <div className="text-3xl mb-2">
                    {PIECE_SYMBOLS.white[stat.pieceType as PieceType]}
                  </div>
                  <div className="text-lg font-semibold capitalize mb-2">{stat.pieceType}</div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Capturas:</span>
                      <span className="text-green-400 font-semibold">{stat.captures}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Pérdidas:</span>
                      <span className="text-red-400 font-semibold">{stat.losses}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Movimientos:</span>
                      <span className="text-blue-400 font-semibold">{stat.moves}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {chessGamePro.pieceStats.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <div className="text-6xl mb-4">📊</div>
                <p>No hay estadísticas todavía</p>
                <p className="text-sm mt-2">Juega algunas partidas para ver tus estadísticas</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 🏆 Victory Screen
  if (gameMode === 'victory' || chessGamePro.showVictoryScreen) {
    const isVictory = gameResult === 'victory';
    const isDefeat = gameResult === 'defeat';
    const isUnknown = !isVictory && !isDefeat;

    console.log('🎊 Rendering Victory/Defeat Screen', {
      gameMode,
      showVictoryScreen: chessGamePro.showVictoryScreen,
      userProfile: chessGamePro.userProfile,
      gameResult,
      isVictory,
      isDefeat,
      isUnknown,
      lastGameInfo: chessGamePro.lastGameInfo
    });

    // 🔴 CRITICAL DEBUG: Log the exact state values
    console.log('🔍 Victory Screen Debug:', {
      'gameResult value': gameResult,
      'gameResult type': typeof gameResult,
      'isVictory calculation': gameResult === 'victory',
      'isDefeat calculation': gameResult === 'defeat',
      'will show': isVictory ? 'VICTORY' : isDefeat ? 'DEFEAT' : 'UNKNOWN'
    });

    const eloChange = chessGamePro.lastGameInfo?.eloChange || 0;
    const newElo = chessGamePro.lastGameInfo?.newElo || chessGamePro.userProfile?.eloRating || 1200;
    const opponentName = chessGamePro.lastGameInfo?.opponentName || 'Oponente';
    const opponentElo = chessGamePro.lastGameInfo?.opponentElo || 1200;
    const totalMoves = chessGamePro.lastGameInfo?.moves?.length || moveHistory.length || 0;
    const endReason = chessGamePro.lastGameInfo?.endReason;
    const wasAbandonment = endReason === 'abandonment';

    // ALWAYS use duration from lastGameInfo (calculated when game ended)
    // Fallback calculation is unreliable because timer states may reset
    const gameDuration = chessGamePro.lastGameInfo?.duration || 0;

    // Format duration as mm:ss
    const formatDuration = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-[#07070A] via-[#0F0F17] to-[#07070A] text-white p-4 md:p-8 flex items-center justify-center">
        <div className="max-w-4xl w-full">
          {/* 🎯 Unified Container - Same style for Victory and Defeat */}
          <div className={`bg-slate-800/50 backdrop-blur border-4 ${isVictory ? 'border-amber-500 shadow-amber-500/50' : 'border-red-500 shadow-red-500/50'} shadow-2xl rounded-3xl p-8 md:p-12`}>
            <div className="text-center mb-8">
              {/* Icon */}
              <div className="text-8xl mb-6 animate-bounce">
                {isVictory ? '🏆' : '💀'}
              </div>

              {/* Title */}
              <h1 className={`text-5xl md:text-7xl font-bold mb-8 drop-shadow-lg ${isVictory ? 'text-amber-400' : 'text-red-400'}`}>
                {isVictory ? '¡VICTORIA!' : '¡DERROTA!'}
              </h1>

              {/* 📦 Info Box - Enhanced with King & Queen icons */}
              {chessGamePro.userProfile && (
                <div className={`relative bg-slate-900/90 backdrop-blur border-4 ${isVictory ? 'border-amber-500/80' : 'border-red-500/80'} rounded-2xl p-8 max-w-2xl mx-auto shadow-2xl overflow-hidden`}>
                  <div className="space-y-4 relative z-10">
                    {/* Player Info */}
                    <div className="text-center">
                      <div className={`text-3xl font-bold mb-2 ${isVictory ? 'text-amber-400' : 'text-red-400'}`}>
                        {chessGamePro.userProfile.name}
                      </div>
                      <div className="text-2xl font-bold text-white">
                        {newElo}
                        <span className={`ml-2 ${eloChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          ({eloChange > 0 ? '+' : ''}{eloChange})
                        </span>
                      </div>

                      {/* 🚨 Abandonment Notice */}
                      {wasAbandonment && isDefeat && (
                        <div className="mt-3 px-4 py-2 bg-orange-900/50 border-2 border-orange-500 rounded-lg">
                          <div className="text-orange-300 text-sm font-semibold">
                            ⚠️ Partida abandonada
                          </div>
                        </div>
                      )}
                    </div>

                    {/* VS Separator with Chess Pieces */}
                    <div className="flex items-center gap-4 relative">
                      {/* King icon - Left side */}
                      <div className="text-4xl opacity-40 absolute -left-6">
                        ♔
                      </div>

                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-500 to-transparent"></div>
                      <div className="text-slate-300 font-bold text-xl px-4">VS</div>
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-500 to-transparent"></div>

                      {/* Queen icon - Right side */}
                      <div className="text-4xl opacity-40 absolute -right-6">
                        ♕
                      </div>
                    </div>

                    {/* Opponent Info */}
                    <div className="text-center">
                      <div className="text-2xl font-semibold text-slate-300 mb-1">
                        {opponentName}
                      </div>
                      <div className="text-lg text-slate-400">
                        {opponentElo} ELO
                      </div>
                    </div>

                    {/* Game Stats */}
                    <div className="mt-6 pt-4 border-t border-slate-700/50">
                      <div className="grid grid-cols-2 gap-4 text-center">
                        <div>
                          <div className="text-slate-400 text-sm mb-1">Movimientos</div>
                          <div className="text-xl font-bold text-white">{totalMoves}</div>
                        </div>
                        <div>
                          <div className="text-slate-400 text-sm mb-1">Duración</div>
                          <div className="text-xl font-bold text-white">{formatDuration(gameDuration)}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 📚 Study Recommendations Section */}
            {chessGamePro.userProfile && userGameHistory && (() => {
              // Si hay datos, calculamos métricas reales; si no, usamos valores por defecto (50)
              const hasEnoughGames = userGameHistory.length >= 5;

              // Crear un perfil temporal con el historial actualizado para el cálculo
              const profileWithHistory = {
                ...chessGamePro.userProfile,
                gameHistory: userGameHistory || []
              };

              const metrics = hasEnoughGames
                ? studyRecommendationService.calculateSkillMetrics(profileWithHistory)
                : { openings: 50, tactics: 50, endgames: 50, middlegame: 50 };
              const recommendations = hasEnoughGames
                ? studyRecommendationService.generateRecommendations(profileWithHistory, metrics)
                : [];

              // Debug: Log para verificar el estado
              console.log('📊 Debug Recomendaciones:', {
                hasEnoughGames,
                totalGames: userGameHistory.length,
                profileGameHistory: profileWithHistory.gameHistory?.length || 0,
                metrics,
                recommendationsCount: recommendations.length,
                recommendations
              });

              return (
                <div className="mt-8 bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-xl border-2 border-purple-500/30 rounded-2xl p-8 shadow-2xl">
                  {/* Header */}
                  <div className="text-center mb-8">
                    <h3 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-2">
                      📚 Recomendaciones de Estudio Personalizadas por Deep M8 Personal Trainer
                    </h3>
                    <p className="text-slate-300 text-sm">
                      {hasEnoughGames
                        ? `Personalizado según tus últimas partidas`
                        : `🎯 Juega ${5 - userGameHistory.length} partidas más para recibir recomendaciones personalizadas`
                      }
                    </p>
                  </div>

                  {/* Recommendations Grid - Solo si hay suficientes partidas */}
                  {hasEnoughGames && (
                    <div className="space-y-4 mb-8">
                      {recommendations.map((rec) => {
                      const priorityConfig = {
                        high: {
                          border: 'border-red-500/60',
                          bg: 'bg-gradient-to-br from-red-600/20 to-orange-600/20',
                          badge: 'bg-red-500/30 text-red-200',
                          badgeText: '🔴 ALTA',
                          dot: 'bg-red-500 animate-pulse'
                        },
                        medium: {
                          border: 'border-blue-500/60',
                          bg: 'bg-gradient-to-br from-blue-600/20 to-purple-600/20',
                          badge: 'bg-blue-500/30 text-blue-200',
                          badgeText: '🔵 MEDIA',
                          dot: 'bg-blue-500'
                        },
                        low: {
                          border: 'border-slate-500/40',
                          bg: 'bg-gradient-to-br from-slate-700/20 to-slate-600/20',
                          badge: 'bg-slate-600/50 text-slate-300',
                          badgeText: '⚪ BAJA',
                          dot: 'bg-slate-500'
                        }
                      };

                      const config = priorityConfig[rec.priority];

                      return (
                        <div
                          key={rec.id}
                          className={`${config.bg} border-2 ${config.border} rounded-xl p-5 hover:scale-[1.02] transition-all duration-200 hover:shadow-lg`}
                        >
                          <div className="flex items-start gap-4">
                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-3 mb-2">
                                <h4 className="text-lg font-bold text-white">
                                  {rec.title}
                                </h4>
                                <div className="flex items-center gap-2">
                                  <span className={`text-xs px-3 py-1 ${config.badge} rounded-full whitespace-nowrap font-bold`}>
                                    {config.badgeText}
                                  </span>
                                  <div className={`w-3 h-3 rounded-full ${config.dot}`} />
                                </div>
                              </div>
                              <p className="text-slate-300 text-sm mb-2 leading-relaxed">
                                {rec.description}
                              </p>
                              <p className="text-slate-400 text-xs italic mb-4">
                                💡 {rec.reason}
                              </p>

                              {/* Botón Empezar a Entrenar */}
                              <button
                                onClick={() => {
                                  console.log('🎯 Button clicked! Category:', rec.category);
                                  console.log('🎯 Current activeTraining:', activeTraining);
                                  setActiveTraining(rec.category);
                                  console.log('🎯 setActiveTraining called with:', rec.category);
                                }}
                                className={`
                                  px-6 py-2.5 rounded-lg font-bold text-sm
                                  transition-all duration-200 hover:scale-105 shadow-md
                                  ${rec.priority === 'high'
                                    ? 'bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white'
                                    : rec.priority === 'medium'
                                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white'
                                    : 'bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white'
                                  }
                                `}
                              >
                                🎓 Empezar a Entrenar
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    </div>
                  )}

                  {/* Score Bars with Real Data */}
                  <div className="pt-6 border-t border-slate-600/50">
                    <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <span>📊</span> Tu Progreso por Área
                    </h4>
                    <div className="space-y-3">
                      {[
                        { label: 'Aperturas', score: metrics.openings, icon: '📖' },
                        { label: 'Táctica', score: metrics.tactics, icon: '⚔️' },
                        { label: 'Finales', score: metrics.endgames, icon: '♟️' },
                        { label: 'Medio Juego', score: metrics.middlegame, icon: '🎯' }
                      ].map((area, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <span className="w-28 text-slate-300 font-medium text-sm">
                            {area.icon} {area.label}
                          </span>
                          <div className="flex-1 bg-slate-700/50 rounded-full h-3 overflow-hidden border border-slate-600/30">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${
                                !hasEnoughGames ? 'bg-gradient-to-r from-orange-500 to-amber-500' :
                                area.score >= 70 ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                                area.score >= 50 ? 'bg-gradient-to-r from-blue-500 to-cyan-500' :
                                'bg-gradient-to-r from-orange-500 to-red-500'
                              }`}
                              style={{ width: `${area.score}%` }}
                            />
                          </div>
                          <span className="w-16 text-right font-bold">
                            <span className={
                              !hasEnoughGames ? 'text-orange-400' :
                              area.score >= 70 ? 'text-green-400' :
                              area.score >= 50 ? 'text-blue-400' :
                              'text-orange-400'
                            }>
                              {Math.round(area.score)}
                            </span>
                            <span className="text-slate-500 text-xs">/100</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Buttons - Unified Style */}
            <div className="flex flex-wrap gap-4 justify-center">
              <button
                onClick={() => {
                  chessGamePro.setShowVictoryScreen(false);
                  setGameResult(null);
                  setGameMode('menu');
                }}
                className="px-8 py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 rounded-xl font-semibold transition-all duration-200 hover:scale-105 shadow-lg"
              >
                🏠 Menú Principal
              </button>

              <button
                onClick={() => {
                  chessGamePro.setShowVictoryScreen(false);
                  setGameResult(null);
                  resetGame();
                }}
                className="px-8 py-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-xl font-semibold transition-all duration-200 hover:scale-105 shadow-lg"
              >
                🔄 Nueva Partida
              </button>

              <button
                onClick={() => {
                  chessGamePro.loadStats();
                  setGameMode('stats');
                }}
                className="px-8 py-4 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 rounded-xl font-semibold transition-all duration-200 hover:scale-105 shadow-lg"
              >
                📊 Ver Estadísticas
              </button>

              <button
                onClick={() => setShowGameAnalysis(true)}
                className="px-8 py-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 rounded-xl font-semibold transition-all duration-200 hover:scale-105 shadow-lg"
              >
                🔍 Analizar Partida
              </button>
            </div>
          </div>
        </div>

        {/* Game Analysis Modal */}
        {showGameAnalysis && moveHistory.length > 0 && (
          <GameAnalysis
            moves={moveHistory}
            playerColor={myColor || 'white'}
            gameResult={gameStatus === 'stalemate' ? 'draw' : gameResult}
            onClose={() => setShowGameAnalysis(false)}
          />
        )}
      </div>
    );
  }

  // 🌐 Online Matchmaking
  if (gameMode === 'online-lobby') {
    return (
      <Matchmaking
        playerName={getDisplayName()}
        playerElo={chessGamePro.userProfile?.eloRating || 1200}
        timeControl={timeControl}
        onMatchFound={handleMatchFound}
        onBack={() => {
          socketService.disconnect();
          setGameMode('menu');
        }}
      />
    );
  }

  if (gameMode === 'menu') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#07070A] via-[#0F0F17] to-[#07070A] text-white p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header with Hamburger Menu and Logo */}
          <div className="flex items-center justify-between mb-12">
            {/* Hamburger Menu - Left */}
            {chessGamePro.userProfile && (
              <div className="relative hamburger-menu-container">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="group relative bg-[#181825] backdrop-blur border border-white/6 rounded-xl p-3 hover:border-purple-400/40 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-purple-500/20"
                  aria-label="Menú"
                >
                  <div className="flex flex-col gap-1.5">
                    <div className={`w-6 h-0.5 bg-gradient-to-r from-purple-400 to-blue-400 transition-all duration-300 ${isMenuOpen ? 'rotate-45 translate-y-2' : ''}`}></div>
                    <div className={`w-6 h-0.5 bg-gradient-to-r from-purple-400 to-blue-400 transition-all duration-300 ${isMenuOpen ? 'opacity-0' : ''}`}></div>
                    <div className={`w-6 h-0.5 bg-gradient-to-r from-purple-400 to-blue-400 transition-all duration-300 ${isMenuOpen ? '-rotate-45 -translate-y-2' : ''}`}></div>
                  </div>
                </button>

                {/* Dropdown Menu */}
                {isMenuOpen && (
                  <div className="absolute top-full mt-3 left-0 min-w-[420px] bg-[#181825] backdrop-blur-xl border border-white/8 rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.8)] overflow-hidden animate-scale-in z-50">
                    {/* Mi Perfil Button */}
                    <button
                      onClick={() => {
                        chessGamePro.loadStats();
                        setGameMode('stats');
                        setIsMenuOpen(false);
                      }}
                      className="w-full group relative bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-b border-white/6 p-6 hover:from-purple-500/20 hover:to-blue-500/20 transition-all duration-300"
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-4xl">👤</div>
                        <div className="text-left flex-1">
                          <h3 className="text-lg font-bold mb-1 bg-gradient-to-r from-purple-300 to-blue-300 bg-clip-text text-transparent">Mi Perfil</h3>
                          <p className="text-slate-300 text-sm font-medium">
                            ELO: {chessGamePro.userProfile.eloRating} • {chessGamePro.userProfile.totalGames} partidas
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Progreso completo de todas tus partidas
                          </p>
                        </div>
                        <div className="text-2xl text-slate-600 group-hover:text-purple-400 transition-colors">→</div>
                      </div>
                    </button>

                    {/* User Session Section */}
                    <div className="bg-gradient-to-r from-green-500/10 to-green-600/10 border-b border-white/6 p-6">
                      <div className="flex items-center gap-4">
                        <div className="text-3xl">✅</div>
                        <div className="flex-1">
                          <h3 className="text-base font-semibold text-green-400 mb-1">
                            {chessGamePro.userProfile.name}
                          </h3>
                          <p className="text-sm text-slate-300">
                            ELO: {chessGamePro.userProfile.eloRating} • {chessGamePro.userProfile.totalGames} partidas jugadas
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            if (confirm('¿Cerrar sesión? Tus datos se guardarán y podrás volver más tarde.')) {
                              clearAuth();
                              chessGamePro.setGameMode('user-selection');
                              setIsMenuOpen(false);
                            }
                          }}
                          className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 hover:border-red-500 rounded-lg font-semibold transition-all duration-200 text-sm"
                        >
                          🚪 Cerrar Sesión
                        </button>
                      </div>
                    </div>

                    {/* Configuración Section */}
                    <div className="p-6">
                      <h3 className="text-base font-semibold mb-4 bg-gradient-to-r from-purple-300 to-blue-300 bg-clip-text text-transparent">⚙️ Configuración</h3>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-2 text-slate-300">Tema del tablero</label>
                          <div className="grid grid-cols-6 gap-2">
                            {Object.entries(THEMES).map(([key, theme]) => (
                              <button
                                key={key}
                                onClick={() => setCurrentTheme(key)}
                                className={`p-3 rounded-lg border-2 transition-all ${
                                  currentTheme === key
                                    ? 'border-purple-500 scale-110 shadow-lg shadow-purple-500/30'
                                    : 'border-slate-600 hover:border-slate-500'
                                }`}
                                title={theme.name}
                              >
                                <div className="flex gap-1">
                                  <div className={`w-3 h-3 ${theme.light} rounded`}></div>
                                  <div className={`w-3 h-3 ${theme.dark} rounded`}></div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium text-slate-300">Efectos de sonido</label>
                          <button
                            onClick={() => setSoundEnabled(!soundEnabled)}
                            className={`px-4 py-2 rounded-lg font-semibold transition-all text-sm ${
                              soundEnabled
                                ? 'bg-blue-500 hover:bg-blue-600'
                                : 'bg-slate-600 hover:bg-slate-700'
                            }`}
                          >
                            {soundEnabled ? '🔊 Activado' : '🔇 Desactivado'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Logo - Center */}
            <div className={`${chessGamePro.userProfile ? '' : 'mx-auto'}`}>
              <img
                src="/branding/logo-lateral.png"
                alt="DeepM8"
                className="h-24 md:h-32 object-contain"
              />
            </div>

            {/* Placeholder for visual balance when menu is present */}
            {chessGamePro.userProfile && <div className="w-[52px]"></div>}
          </div>

          {/* Time Control Selector */}
          <div className="mb-8 bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6">
            <h3 className="text-xl font-bold mb-4 text-center">⏱️ Control de Tiempo</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(TIME_CONTROLS).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => setTimeControl(key as typeof timeControl)}
                  className={`p-4 rounded-xl border-2 transition-all duration-200 hover:scale-105 ${
                    timeControl === key
                      ? `bg-gradient-to-br ${config.color} border-white shadow-lg`
                      : 'bg-slate-900/50 border-slate-600 hover:border-slate-400'
                  }`}
                >
                  <div className="text-3xl mb-2">{config.icon}</div>
                  <div className="font-semibold text-sm">{config.name}</div>
                  <div className="text-xs text-slate-300 mt-1">{config.description}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-6 max-w-2xl mx-auto">
            {/* 🌐 Online Multiplayer Mode */}
            <button
              onClick={() => {
                if (!chessGamePro.userProfile) {
                  alert('Necesitas crear un perfil para jugar online');
                  setShowProfileSetup(true);
                  return;
                }
                setGameMode('online-lobby');
              }}
              className="group relative bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-8 hover:bg-slate-800/70 transition-all duration-300 hover:scale-[1.02]"
            >
              <div className="flex items-center gap-6">
                <div className="text-6xl">🌐</div>
                <div className="text-left flex-1">
                  <h3 className="text-2xl font-bold mb-2">Multijugador Online</h3>
                  <p className="text-slate-400">Juega en tiempo real contra jugadores de todo el mundo</p>
                </div>
                <div className="text-3xl text-slate-600 group-hover:text-amber-500 transition-colors">→</div>
              </div>
            </button>

            {/* AI Mode */}
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-8">
              <div className="flex items-center gap-6 mb-6">
                <div className="text-6xl">🤖</div>
                <div className="text-left flex-1">
                  <h3 className="text-2xl font-bold mb-2">Contra IA</h3>
                  <p className="text-slate-400">Desafía al motor de ajedrez - elige tu nivel</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(DIFFICULTY_LEVELS).map(([key, value]) => (
                  <button
                    key={key}
                    onClick={() => startGame('ai', key as Difficulty)}
                    className="bg-slate-900/50 hover:bg-slate-900/80 border border-slate-600 hover:border-purple-500 rounded-xl p-4 transition-all duration-200 hover:scale-[1.02]"
                  >
                    <div className="font-semibold bg-gradient-to-r from-blue-200 via-blue-400 to-blue-600 bg-clip-text text-transparent">{value.label}</div>
                    <div className="text-xs text-slate-400 mt-1">
                      Depth: {value.depth} • Skill: {value.skillLevel}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Game History Section */}
            {chessGamePro.userProfile && (
              <button
                onClick={() => setShowGameHistory(true)}
                className="group relative bg-[#181825] backdrop-blur border border-white/6 rounded-2xl p-8 hover:border-purple-400/40 transition-all duration-300 hover:scale-[1.02] shadow-lg hover:shadow-purple-500/20"
              >
                <div className="flex items-center gap-6">
                  <div className="text-6xl">📜</div>
                  <div className="text-left flex-1">
                    <h3 className="text-2xl font-bold mb-2 bg-gradient-to-r from-blue-200 via-blue-400 to-blue-600 bg-clip-text text-transparent">Historial de Partidas</h3>
                    <p className="text-slate-400">Revive tus partidas movimiento por movimiento</p>
                  </div>
                  <div className="text-3xl text-slate-600 group-hover:text-purple-400 transition-colors">→</div>
                </div>
              </button>
            )}

            {/* Guest Mode - Login Prompt (only when no profile) */}
            {!chessGamePro.userProfile && (
              <div className="max-w-2xl mx-auto">
                <div className="bg-gradient-to-r from-amber-500/20 to-amber-600/20 backdrop-blur border border-amber-500/30 rounded-2xl p-6">
                  <div className="flex items-center gap-4">
                    <div className="text-4xl">👤</div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-amber-400 mb-1">
                        Modo Invitado
                      </h3>
                      <p className="text-sm text-slate-300">
                        Crea un perfil para guardar tus estadísticas y ranking ELO
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        console.log('🔐 Crear Perfil clicked');
                        console.log('authUser:', chessGamePro.authUser);
                        setShowProfileSetup(true);
                      }}
                      className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 rounded-xl font-semibold transition-all duration-200 hover:scale-105 shadow-lg whitespace-nowrap"
                    >
                      🔐 Crear Perfil
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 👤 Profile Setup Modal */}
        {showProfileSetup && (
          <>
            {console.log('🎨 Rendering ProfileSetup modal, showProfileSetup:', showProfileSetup)}
            <ProfileSetup
              defaultName={chessGamePro.authUser?.name || ''}
              currentUserId={chessGamePro.authUser?.userId}
              onComplete={(username) => {
                console.log('📝 Username entered:', username);

                // Update localStorage with new name (updates both name and username fields)
                updateUsername(username);

                // Reload authUser from localStorage to get updated name
                chessGamePro.reloadAuthUser();

                setShowProfileSetup(false);
                // After username is set, show ELO selection
                setGameMode('elo-selection');
                console.log('✅ Username set, proceeding to ELO selection');
              }}
            />
          </>
        )}

        {/* 📜 Game History Modal */}
        {showGameHistory && chessGamePro.userProfile && (
          <GameHistoryComponent
            userId={chessGamePro.userProfile.userId}
            onClose={() => setShowGameHistory(false)}
            onReplayGame={(game) => {
              setSelectedGameForReplay(game);
              setShowGameHistory(false);
            }}
          />
        )}

        {/* 🎬 Game Replay Modal */}
        {selectedGameForReplay && (
          <GameReplay
            game={selectedGameForReplay}
            onClose={() => setSelectedGameForReplay(null)}
          />
        )}
      </div>
    );
  }

  // Debug log before render
  console.log('🔥 RENDER - activeTraining value:', activeTraining);
  console.log('🔥 RENDER - activeTraining is truthy?', !!activeTraining);

  return (
    <>
      {/* 🎓 Training Session - Rendered as top-level overlay */}
      {console.log('🔍 Checking activeTraining:', activeTraining)}
      {activeTraining && (
        <TrainingSession
          category={activeTraining}
          onClose={() => setActiveTraining(null)}
        />
      )}

      <div className="min-h-screen bg-gradient-to-br from-[#07070A] via-[#0F0F17] to-[#07070A] text-white p-4 md:p-8 relative overflow-hidden">
      {/* Particle overlay */}
      <div className="fixed inset-0 pointer-events-none z-50">
        {particles.map(p => (
          <div
            key={p.id}
            className="absolute rounded-full"
            style={{
              left: p.x,
              top: p.y,
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              opacity: p.life,
              transform: 'translate(-50%, -50%)'
            }}
          />
        ))}
      </div>

      <div className="max-w-[1800px] mx-auto">
        {/* Tutorial overlay */}
        {gameMode === 'tutorial' && tutorialStep < tutorialSteps.length && (
          <div className="mb-4 bg-blue-500/20 border-2 border-blue-500 rounded-xl p-4 animate-pulse">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold text-blue-400">Paso {tutorialStep + 1}/{tutorialSteps.length}</span>
                <p className="text-lg mt-1">{tutorialSteps[tutorialStep]}</p>
              </div>
              <button
                onClick={() => setTutorialStep(prev => Math.min(prev + 1, tutorialSteps.length))}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg font-semibold"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}

        {/* Header - Logo y Menú alineados con el tablero */}
        <div className="mb-6 max-w-[672px] mx-auto">
          <div className="flex items-center justify-between mb-3">
            {/* Menú Hamburguesa - Alineado a la izquierda */}
            {chessGamePro.userProfile && (
              <div className="relative hamburger-menu-container">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="group relative bg-[#181825] backdrop-blur border border-white/6 rounded-xl p-3 hover:border-purple-400/40 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-purple-500/20"
                  aria-label="Menú"
                >
                  <div className="flex flex-col gap-1.5">
                    <div className={`w-6 h-0.5 bg-gradient-to-r from-purple-400 to-blue-400 transition-all duration-300 ${isMenuOpen ? 'rotate-45 translate-y-2' : ''}`}></div>
                    <div className={`w-6 h-0.5 bg-gradient-to-r from-purple-400 to-blue-400 transition-all duration-300 ${isMenuOpen ? 'opacity-0' : ''}`}></div>
                    <div className={`w-6 h-0.5 bg-gradient-to-r from-purple-400 to-blue-400 transition-all duration-300 ${isMenuOpen ? '-rotate-45 -translate-y-2' : ''}`}></div>
                  </div>
                </button>

                {/* Dropdown Menu */}
                {isMenuOpen && (
                  <div className="absolute top-full mt-3 left-0 min-w-[420px] bg-[#181825] backdrop-blur-xl border border-white/8 rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.8)] overflow-hidden animate-scale-in z-50">
                    {/* Mi Perfil Button */}
                    <button
                      onClick={() => {
                        chessGamePro.loadStats();
                        setGameMode('stats');
                        setIsMenuOpen(false);
                      }}
                      className="w-full group relative bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-b border-white/6 p-6 hover:from-purple-500/20 hover:to-blue-500/20 transition-all duration-300"
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-4xl">👤</div>
                        <div className="text-left flex-1">
                          <h3 className="text-lg font-bold mb-1 bg-gradient-to-r from-purple-300 to-blue-300 bg-clip-text text-transparent">Mi Perfil</h3>
                          <p className="text-slate-300 text-sm font-medium">
                            ELO: {chessGamePro.userProfile.eloRating} • {chessGamePro.userProfile.totalGames} partidas
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Progreso completo de todas tus partidas
                          </p>
                        </div>
                        <div className="text-2xl text-slate-600 group-hover:text-purple-400 transition-colors">→</div>
                      </div>
                    </button>

                    {/* User Session Section */}
                    <div className="bg-gradient-to-r from-green-500/10 to-green-600/10 border-b border-white/6 p-6">
                      <div className="flex items-center gap-4">
                        <div className="text-3xl">✅</div>
                        <div className="flex-1">
                          <h3 className="text-base font-semibold text-green-400 mb-1">
                            {chessGamePro.userProfile.name}
                          </h3>
                          <p className="text-sm text-slate-300">
                            ELO: {chessGamePro.userProfile.eloRating} • {chessGamePro.userProfile.totalGames} partidas jugadas
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            if (confirm('¿Cerrar sesión? Tus datos se guardarán y podrás volver más tarde.')) {
                              clearAuth();
                              chessGamePro.setGameMode('user-selection');
                              setIsMenuOpen(false);
                            }
                          }}
                          className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 hover:border-red-500 rounded-lg font-semibold transition-all duration-200 text-sm"
                        >
                          🚪 Cerrar Sesión
                        </button>
                      </div>
                    </div>

                    {/* Configuración Section */}
                    <div className="p-6">
                      <h3 className="text-base font-semibold mb-4 bg-gradient-to-r from-purple-300 to-blue-300 bg-clip-text text-transparent">⚙️ Configuración</h3>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-2 text-slate-300">Tema del tablero</label>
                          <div className="grid grid-cols-6 gap-2">
                            {Object.entries(THEMES).map(([key, theme]) => (
                              <button
                                key={key}
                                onClick={() => setCurrentTheme(key)}
                                className={`p-3 rounded-lg border-2 transition-all ${
                                  currentTheme === key
                                    ? 'border-purple-500 scale-110 shadow-lg shadow-purple-500/30'
                                    : 'border-slate-600 hover:border-slate-500'
                                }`}
                                title={theme.name}
                              >
                                <div className="flex gap-1">
                                  <div className={`w-3 h-3 ${theme.light} rounded`}></div>
                                  <div className={`w-3 h-3 ${theme.dark} rounded`}></div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium text-slate-300">Efectos de sonido</label>
                          <button
                            onClick={() => setSoundEnabled(!soundEnabled)}
                            className={`px-4 py-2 rounded-lg font-semibold transition-all text-sm ${
                              soundEnabled
                                ? 'bg-blue-500 hover:bg-blue-600'
                                : 'bg-slate-600 hover:bg-slate-700'
                            }`}
                          >
                            {soundEnabled ? '🔊 Activado' : '🔇 Desactivado'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Logo DeepM8 Lateral - Centro */}
            <div className={`${chessGamePro.userProfile ? '' : 'mx-auto'}`}>
              <img
                src="/branding/logo-lateral.png"
                alt="DeepM8"
                className="h-24 md:h-32 object-contain"
              />
            </div>

            {/* Placeholder para balance visual */}
            {chessGamePro.userProfile && <div className="w-[52px]"></div>}
          </div>

          {/* Tipo de partida */}
          <div className="flex justify-center">
            <div className={`px-4 py-2 rounded-lg bg-gradient-to-r ${TIME_CONTROLS[timeControl].color} text-white font-semibold text-sm shadow-lg`}>
              {TIME_CONTROLS[timeControl].icon} {TIME_CONTROLS[timeControl].name}
              {incrementPerMove > 0 && ` +${incrementPerMove}s`}
            </div>
          </div>

          {/* Estado del juego (si no está jugando) */}
          {gameStatus !== 'playing' && (
            <div className="flex justify-center mt-3">
              <div className={`px-6 py-3 rounded-xl font-bold text-lg ${
                gameStatus === 'checkmate' ? (gameEndReason === 'timeout' ? 'bg-purple-600' : 'bg-red-500') :
                gameStatus === 'stalemate' ? 'bg-yellow-500 text-black' :
                gameStatus === 'resigned' ? 'bg-red-600' :
                'bg-orange-500'
              }`}>
                {gameStatus === 'checkmate' ?
                  (gameEndReason === 'timeout' ? '⏰ ¡TIEMPO AGOTADO!' : '¡JAQUE MATE!') :
                 gameStatus === 'stalemate' ? 'TABLAS' :
                 gameStatus === 'resigned' ? '¡RENDICIÓN!' :
                 '¡JAQUE!'}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr_300px] gap-4 items-start">
          {/* Left panel - Move history (hidden on mobile) */}
          <div className="order-1 lg:order-1 hidden lg:block">
            {/* Move history */}
            <div
              ref={leftHistoryRef}
              className="bg-slate-800/50 backdrop-blur rounded-2xl p-4 border border-slate-700 max-h-[400px] overflow-y-auto"
              style={{ scrollBehavior: 'auto' }}
            >
              <h3 className="text-sm font-semibold mb-3 text-slate-400 sticky top-0 bg-slate-800/90 backdrop-blur -m-4 p-4">
                📋 Historial de Jugadas
              </h3>
              <div className="space-y-1 mt-4">
                {moveHistory.map((move, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm hover:bg-slate-700/50 p-1 rounded">
                    <span className="text-slate-500 font-mono w-8">{Math.floor(i / 2) + 1}.</span>
                    <span className={i % 2 === 0 ? 'text-white font-semibold' : 'text-slate-300'}>
                      {move.notation}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Center - Chess board */}
          <div className="order-2 lg:order-2 flex flex-col items-center gap-4">
            {/* MY Disconnection Warning Overlay */}
            {amIDisconnected && (
              <div className="bg-orange-600/90 backdrop-blur-sm px-6 py-4 rounded-xl border-2 border-orange-400 shadow-2xl animate-pulse z-50">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">📡</div>
                  <div>
                    <div className="font-bold text-lg">Sin conexión al servidor</div>
                    <div className="text-sm">
                      {myReconnectionTimeLeft > 0 ? (
                        <>Intentando reconectar: <span className="font-mono font-bold">{myReconnectionTimeLeft}s</span></>
                      ) : (
                        <>Tiempo agotado - Derrota por abandono</>
                      )}
                    </div>
                  </div>
                  <div className="text-2xl animate-spin">🔄</div>
                </div>
              </div>
            )}

            {/* Opponent Reconnection Warning Overlay */}
            {isOpponentDisconnected && (
              <div className="bg-red-600/90 backdrop-blur-sm px-6 py-4 rounded-xl border-2 border-red-400 shadow-2xl animate-pulse z-50">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">⚠️</div>
                  <div>
                    <div className="font-bold text-lg">Oponente desconectado</div>
                    <div className="text-sm">
                      {reconnectionTimeLeft > 0 ? (
                        <>Esperando reconexión: <span className="font-mono font-bold">{reconnectionTimeLeft}s</span></>
                      ) : (
                        <>Victoria por abandono</>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Información Jugador Negro (arriba del tablero) */}
            <div className={`w-full max-w-[672px] flex items-center justify-between backdrop-blur rounded-xl p-3 border-2 transition-all duration-300 ${
              currentPlayer === 'black'
                ? 'bg-purple-500/20 border-purple-500 shadow-lg shadow-purple-500/30'
                : 'bg-slate-800/50 border-slate-700'
            }`}>
              {/* Nombre, ELO y Piezas Capturadas del jugador negro */}
              <div className="flex items-center gap-3 flex-1">
                <div className="text-3xl">♚</div>
                <div className="flex-1">
                  <div className="font-bold text-white">
                    {gameMode === 'ai' ? 'IA DeepM8' :
                     gameMode === 'online' && myColor === 'white' ? opponentName :
                     gameMode === 'online' && myColor === 'black' ? getDisplayName() :
                     'Jugador 2'}
                  </div>
                  <div className="text-sm text-slate-400">
                    ELO: {gameMode === 'ai' ? DIFFICULTY_LEVELS[aiDifficulty].elo :
                          gameMode === 'online' && myColor === 'white' ? opponentElo :
                          gameMode === 'online' && myColor === 'black' ? (chessGamePro.userProfile?.eloRating || 1200) :
                          1200}
                  </div>
                  {/* Piezas capturadas por las negras (pequeñas) */}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {capturedPieces.black.map((piece, i) => (
                      <span key={i} className="text-lg opacity-60">
                        {PIECE_SYMBOLS[piece.color][piece.type]}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Reloj del jugador negro */}
              <div className={`px-4 py-2 rounded-lg font-mono text-xl font-bold ${
                currentPlayer === 'black' ? 'bg-amber-500 text-black' : 'bg-slate-700 text-white'
              } ${blackTime <= 10 ? 'animate-pulse' : ''}`}>
                {formatTime(blackTime)}
              </div>
            </div>

            {/* Board container with wooden border effect */}
            <div className="bg-[#312e2b] p-3 md:p-4 rounded-xl shadow-2xl border-4 border-[#1a1816]">
              {/* Coordinates wrapper */}
              <div className="relative">
                {/* Top coordinates (a-h) */}
                <div className="flex justify-around mb-1 px-2">
                  {['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((letter, i) => (
                    <div key={i} className="w-10 sm:w-12 md:w-16 lg:w-20 text-center text-[#f0d9b5] text-xs md:text-sm font-bold">
                      {letter}
                    </div>
                  ))}
                </div>

                <div className="flex">
                  {/* Left coordinates (8-1) */}
                  <div className="flex flex-col justify-around pr-1">
                    {[8, 7, 6, 5, 4, 3, 2, 1].map((num, i) => (
                      <div key={i} className="h-10 sm:h-12 md:h-16 lg:h-20 flex items-center text-[#f0d9b5] text-xs md:text-sm font-bold">
                        {num}
                      </div>
                    ))}
                  </div>

                  {/* Chess board */}
                  <div className="chess-board grid grid-cols-8 gap-0 rounded-lg overflow-hidden shadow-2xl ring-2 ring-[#8b7355]">
                    {board.map((row, rowIndex) => (
                      row.map((piece, colIndex) => {
                        const isValidMoveSquare = validMoves.some(m => m.row === rowIndex && m.col === colIndex);
                        const hasPiece = piece !== null;
                        const isSelected = selectedPiece?.row === rowIndex && selectedPiece?.col === colIndex;

                        return (
                          <div
                            key={`${rowIndex}-${colIndex}`}
                            className={`
                              w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 lg:w-20 lg:h-20
                              flex items-center justify-center
                              cursor-pointer relative
                              transition-all duration-300
                              ${getSquareColor(rowIndex, colIndex)}
                              hover:brightness-110 hover:shadow-inner
                              ${isSelected ? 'ring-4 ring-amber-300 ring-inset z-10 brightness-125' : ''}
                              group
                            `}
                            onClick={() => handleSquareClick(rowIndex, colIndex)}
                          >
                            {piece && (
                              <span className={`
                                text-3xl sm:text-4xl md:text-5xl lg:text-6xl
                                select-none
                                transition-all duration-300
                                font-light
                                ${isSelected ? 'scale-125 rotate-6' : 'scale-100'}
                                group-hover:scale-110 group-hover:drop-shadow-2xl
                                ${piece.color === 'white'
                                  ? 'text-white drop-shadow-[0_4px_6px_rgba(0,0,0,0.9)] [text-shadow:0_0_2px_rgba(0,0,0,0.95),0_0_4px_rgba(0,0,0,0.8),1px_1px_2px_rgba(0,0,0,0.7),-1px_-1px_1px_rgba(255,255,255,0.2)] filter brightness-115'
                                  : 'text-[#403d39] drop-shadow-[0_4px_6px_rgba(255,255,255,0.75)] [text-shadow:0_0_2px_rgba(255,255,255,0.65),0_0_4px_rgba(255,255,255,0.55),1px_1px_0_rgba(255,255,255,0.45),-1px_-1px_0_rgba(255,255,255,0.45),1px_1px_0_rgba(0,0,0,0.15)] filter brightness-110'
                                }
                              `}>
                                {PIECE_SYMBOLS[piece.color][piece.type]}
                              </span>
                            )}
                            {isValidMoveSquare && !hasPiece && (
                              <div className="absolute w-4 h-4 md:w-5 md:h-5 bg-green-500 rounded-full opacity-75 shadow-lg shadow-green-500/60 animate-pulse ring-2 ring-green-400" />
                            )}
                            {isValidMoveSquare && hasPiece && (
                              <div className="absolute inset-0 border-4 border-red-500 opacity-85 rounded-md shadow-xl shadow-red-500/60 animate-pulse" />
                            )}
                          </div>
                        );
                      })
                    ))}
                  </div>

                  {/* Right coordinates (8-1) */}
                  <div className="flex flex-col justify-around pl-1">
                    {[8, 7, 6, 5, 4, 3, 2, 1].map((num, i) => (
                      <div key={i} className="h-10 sm:h-12 md:h-16 lg:h-20 flex items-center text-[#f0d9b5] text-xs md:text-sm font-bold">
                        {num}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom coordinates (a-h) */}
                <div className="flex justify-around mt-1 px-2">
                  {['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((letter, i) => (
                    <div key={i} className="w-10 sm:w-12 md:w-16 lg:w-20 text-center text-[#f0d9b5] text-xs md:text-sm font-bold">
                      {letter}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Información Jugador Blanco (abajo del tablero) */}
            <div className={`w-full max-w-[672px] flex items-center justify-between backdrop-blur rounded-xl p-3 border-2 transition-all duration-300 ${
              currentPlayer === 'white'
                ? 'bg-purple-500/20 border-purple-500 shadow-lg shadow-purple-500/30'
                : 'bg-slate-800/50 border-slate-700'
            }`}>
              {/* Nombre, ELO y Piezas Capturadas del jugador blanco */}
              <div className="flex items-center gap-3 flex-1">
                <div className="text-3xl">♔</div>
                <div className="flex-1">
                  <div className="font-bold text-white">
                    {gameMode === 'ai' ? getDisplayName() :
                     gameMode === 'online' && myColor === 'white' ? getDisplayName() :
                     gameMode === 'online' && myColor === 'black' ? opponentName :
                     'Jugador 1'}
                  </div>
                  <div className="text-sm text-slate-400">
                    ELO: {gameMode === 'ai' ? (chessGamePro.userProfile?.eloRating || 1200) :
                          gameMode === 'online' && myColor === 'white' ? (chessGamePro.userProfile?.eloRating || 1200) :
                          gameMode === 'online' && myColor === 'black' ? opponentElo :
                          1200}
                  </div>
                  {/* Piezas capturadas por las blancas (pequeñas) */}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {capturedPieces.white.map((piece, i) => (
                      <span key={i} className="text-lg opacity-60">
                        {PIECE_SYMBOLS[piece.color][piece.type]}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Reloj del jugador blanco */}
              <div className={`px-4 py-2 rounded-lg font-mono text-xl font-bold ${
                currentPlayer === 'white' ? 'bg-amber-500 text-black' : 'bg-slate-700 text-white'
              } ${whiteTime <= 10 ? 'animate-pulse' : ''}`}>
                {formatTime(whiteTime)}
              </div>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap gap-3 justify-center">
              <button
                onClick={resetGame}
                className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 rounded-xl font-semibold transition-all duration-200 hover:scale-105 shadow-lg"
              >
                🔄 Nueva Partida
              </button>
              <button
                onClick={handleResign}
                className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-xl font-semibold transition-all duration-200 hover:scale-105 shadow-lg"
                disabled={gameStatus === 'checkmate' || gameStatus === 'stalemate' || gameStatus === 'resigned'}
              >
                🏳️ Rendirse
              </button>
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 hover:scale-105 shadow-lg ${
                  soundEnabled
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
                    : 'bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800'
                }`}
              >
                {soundEnabled ? '🔊 Sonido' : '🔇 Mudo'}
              </button>
              <button
                onClick={handleBackToMenuDuringOnlineGame}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 rounded-xl font-semibold transition-all duration-200 hover:scale-105 shadow-lg"
              >
                ☰ Menú
              </button>

              {/* DEBUG: Test disconnection with REAL server (only in development) */}
              {import.meta.env.DEV && gameMode === 'online' && (
                <button
                  onClick={() => {
                    console.log('🧪 TEST: Desconectando del servidor...');

                    // Desconectar del servidor (esto activará el evento 'disconnect' en el servidor)
                    socketService.disconnect();

                    // El servidor enviará 'opponent-disconnected' al rival
                    // Y después de 30s, enviará 'game-end' si no reconecto
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-xl font-semibold transition-all duration-200 hover:scale-105 shadow-lg text-xs"
                >
                  🧪 DESCONECTAR (prueba real)
                </button>
              )}
            </div>
          </div>

          {/* Right panel - Move history and Chat */}
          <div className="order-3 lg:order-3">
            {/* Move history */}
            <div
              ref={rightHistoryRef}
              className="bg-slate-800/50 backdrop-blur rounded-2xl p-4 border border-slate-700 max-h-[400px] overflow-y-auto"
              style={{ scrollBehavior: 'auto' }}
            >
              <h3 className="text-sm font-semibold mb-3 text-slate-400 sticky top-0 bg-slate-800/90 backdrop-blur -m-4 p-4">
                📋 Historial de Jugadas
              </h3>
              <div className="space-y-1 mt-4">
                {moveHistory.map((move, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm hover:bg-slate-700/50 p-1 rounded">
                    <span className="text-slate-500 font-mono w-8">{Math.floor(i / 2) + 1}.</span>
                    <span className={i % 2 === 0 ? 'text-white font-semibold' : 'text-slate-300'}>
                      {move.notation}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 💬 Live Chat - Only in online mode */}
            {gameMode === 'online' && (
              <div className="mt-4 bg-slate-800/50 backdrop-blur rounded-2xl p-4 border border-slate-700">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-semibold text-amber-400">💬 Chat</h3>
                  <button
                    onClick={() => setShowChat(!showChat)}
                    className="text-xs px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded transition-all"
                  >
                    {showChat ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>

                {showChat && (
                  <>
                    {/* Chat messages */}
                    <div className="space-y-2 mb-3 max-h-[200px] overflow-y-auto">
                      {chatMessages.length === 0 && (
                        <p className="text-xs text-slate-500 text-center py-4">
                          No hay mensajes todavía
                        </p>
                      )}
                      {chatMessages.map((msg, i) => (
                        <div key={i} className="text-xs">
                          <span className="font-semibold text-amber-400">{msg.playerName}:</span>
                          <span className="text-slate-300 ml-1">{msg.message}</span>
                        </div>
                      ))}
                    </div>

                    {/* Chat input */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendChatMessage()}
                        placeholder="Escribe un mensaje..."
                        className="flex-1 px-2 py-1 text-xs bg-slate-900/50 border border-slate-600 rounded focus:outline-none focus:border-amber-500 text-white placeholder-slate-500"
                        maxLength={100}
                      />
                      <button
                        onClick={handleSendChatMessage}
                        disabled={!chatInput.trim()}
                        className={`px-3 py-1 text-xs rounded font-semibold transition-all ${
                          chatInput.trim()
                            ? 'bg-amber-500 hover:bg-amber-600'
                            : 'bg-slate-600 cursor-not-allowed'
                        }`}
                      >
                        ✉️
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 🏳️ Resign Confirmation Modal */}
      {showResignConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 shadow-2xl border-2 border-amber-500/50 max-w-md w-full mx-4 animate-scale-in">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">🏳️</div>
              <h2 className="text-3xl font-bold text-white mb-2">¿Rendirse?</h2>
              <p className="text-slate-300 text-lg">
                ¿Estás seguro de que quieres rendirte en esta partida?
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={cancelResign}
                className="flex-1 px-6 py-4 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-all transform hover:scale-105 active:scale-95 border-2 border-slate-600"
              >
                ❌ Cancelar
              </button>
              <button
                onClick={confirmResign}
                className="flex-1 px-6 py-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold rounded-xl transition-all transform hover:scale-105 active:scale-95 border-2 border-red-500 shadow-lg shadow-red-500/50"
              >
                ✅ Rendirse
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🚪 Abandon Match Confirmation Modal */}
      {showAbandonConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 shadow-2xl border-2 border-red-500/50 max-w-md w-full mx-4 animate-scale-in">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">⚠️</div>
              <h2 className="text-3xl font-bold text-white mb-2">¿Abandonar Partida?</h2>
              <p className="text-slate-300 text-lg mb-4">
                Si abandonas ahora, <span className="text-red-400 font-bold">perderás la partida automáticamente</span>.
              </p>
              <div className="bg-red-500/20 border border-red-500 rounded-xl p-4">
                <p className="text-red-300 text-sm">
                  ⚠️ Tu oponente ganará por abandono y esto afectará tu ELO
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setShowAbandonConfirm(false)}
                className="flex-1 px-6 py-4 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-all transform hover:scale-105 active:scale-95 border-2 border-slate-600"
              >
                ❌ Cancelar
              </button>
              <button
                onClick={handleAbandonMatch}
                className="flex-1 px-6 py-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold rounded-xl transition-all transform hover:scale-105 active:scale-95 border-2 border-red-500 shadow-lg shadow-red-500/50"
              >
                ✅ Abandonar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 👤 Profile Setup Modal */}
      {showProfileSetup && (
        <ProfileSetup
          defaultName={chessGamePro.authUser?.name || ''}
          currentUserId={chessGamePro.authUser?.userId}
          onComplete={(username) => {
            updateUsername(username);
            // Reload authUser from localStorage to get updated name
            chessGamePro.reloadAuthUser();
            setShowProfileSetup(false);
            // After username is set, show ELO selection
            setGameMode('elo-selection');
            console.log('✅ Username set:', username);
          }}
        />
      )}

      {/* 🔑 SeaCloud Token Setup */}
    </div>
    </>
  );
}
