/**
 * Game Replay Component - Visual playback of chess games with Stockfish analysis
 * Reconstructs board positions from algebraic notation and provides move-by-move commentary
 */

import { useState, useEffect } from 'react';
import type { GameHistory } from '../services/localDataService';
import stockfish from '../services/stockfishService';
import { parseFEN, generateFEN } from '../utils/fenUtils';

interface ChessPiece {
  type: 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';
  color: 'white' | 'black';
  hasMoved?: boolean;
}

type Board = (ChessPiece | null)[][];

interface GameReplayProps {
  game: GameHistory;
  onClose: () => void;
}

interface MoveAnalysis {
  moveNumber: number;
  notation: string;
  evaluation: number; // centipawns
  classification: 'excellent' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';
  comment: string;
  bestMove?: string;
  isCriticalMoment?: boolean; // Large eval swing
  suggestedVariation?: string; // Best move sequence
}

interface PlayerStats {
  totalMoves: number;
  excellent: number;
  good: number;
  inaccuracy: number;
  mistake: number;
  blunder: number;
  accuracy: number; // Percentage
}

const PIECE_SYMBOLS: Record<'white' | 'black', Record<string, string>> = {
  white: { king: '♔', queen: '♕', rook: '♖', bishop: '♗', knight: '♘', pawn: '♙' },
  black: { king: '♚', queen: '♛', rook: '♜', bishop: '♝', knight: '♞', pawn: '♟' }
};

export default function GameReplay({ game, onClose }: GameReplayProps) {
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1); // -1 = initial position
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1000);
  const [board, setBoard] = useState<Board>(getInitialBoard());
  const [lastMove, setLastMove] = useState<{ from: [number, number]; to: [number, number] } | null>(null);
  const [analyzing, setAnalyzing] = useState(true);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [moveAnalyses, setMoveAnalyses] = useState<MoveAnalysis[]>([]);
  const [whiteStats, setWhiteStats] = useState<PlayerStats | null>(null);
  const [blackStats, setBlackStats] = useState<PlayerStats | null>(null);
  const [showAdvancedAnalysis, setShowAdvancedAnalysis] = useState(false);

  // Initialize board
  function getInitialBoard(): Board {
    const board: Board = Array(8).fill(null).map(() => Array(8).fill(null));
    // Pawns
    for (let i = 0; i < 8; i++) {
      board[1][i] = { type: 'pawn', color: 'black' };
      board[6][i] = { type: 'pawn', color: 'white' };
    }
    // Rooks
    board[0][0] = board[0][7] = { type: 'rook', color: 'black' };
    board[7][0] = board[7][7] = { type: 'rook', color: 'white' };
    // Knights
    board[0][1] = board[0][6] = { type: 'knight', color: 'black' };
    board[7][1] = board[7][6] = { type: 'knight', color: 'white' };
    // Bishops
    board[0][2] = board[0][5] = { type: 'bishop', color: 'black' };
    board[7][2] = board[7][5] = { type: 'bishop', color: 'white' };
    // Queens
    board[0][3] = { type: 'queen', color: 'black' };
    board[7][3] = { type: 'queen', color: 'white' };
    // Kings
    board[0][4] = { type: 'king', color: 'black' };
    board[7][4] = { type: 'king', color: 'white' };
    return board;
  }

  // Parse algebraic notation to board positions
  function parseMove(notation: string, board: Board, color: 'white' | 'black'): {
    from: [number, number];
    to: [number, number];
    piece: ChessPiece;
    isCapture: boolean;
    promotion?: ChessPiece['type'];
  } | null {
    // Remove check/checkmate symbols and extra annotations
    const originalNotation = notation;
    notation = notation.replace(/[+#!?]/g, '').trim();

    // Remove "e.p." for en passant
    notation = notation.replace(/\s*e\.p\./i, '').trim();

    // Handle castling
    if (notation === 'O-O' || notation === '0-0') {
      const row = color === 'white' ? 7 : 0;
      return { from: [row, 4], to: [row, 6], piece: { type: 'king', color }, isCapture: false };
    }
    if (notation === 'O-O-O' || notation === '0-0-0') {
      const row = color === 'white' ? 7 : 0;
      return { from: [row, 4], to: [row, 2], piece: { type: 'king', color }, isCapture: false };
    }

    // Check for pawn promotion (e.g., e8=Q, e8=R)
    let promotionPiece: ChessPiece['type'] | undefined;
    const promotionMatch = notation.match(/=([QRBN])/);
    if (promotionMatch) {
      const pieceMap: Record<string, ChessPiece['type']> = {
        'Q': 'queen', 'R': 'rook', 'B': 'bishop', 'N': 'knight'
      };
      promotionPiece = pieceMap[promotionMatch[1]];
      notation = notation.replace(/=[QRBN]/, '');
    }

    // Determine piece type
    let pieceType: ChessPiece['type'] = 'pawn';
    let moveNotation = notation;
    let disambiguationFile: string | null = null;
    let disambiguationRank: string | null = null;

    if (/^[KQRBN]/.test(notation)) {
      const pieceMap: Record<string, ChessPiece['type']> = {
        'K': 'king', 'Q': 'queen', 'R': 'rook', 'B': 'bishop', 'N': 'knight'
      };
      pieceType = pieceMap[notation[0]];
      moveNotation = notation.substring(1);
    }

    // Check for capture
    const isCapture = moveNotation.includes('x');
    moveNotation = moveNotation.replace('x', '');

    // Extract destination square (last 2 characters before any promotion)
    const destMatch = moveNotation.match(/([a-h])([1-8])$/);
    if (!destMatch) {
      console.warn(`Invalid destination in move: ${originalNotation}`);
      return null;
    }

    const toCol = destMatch[1].charCodeAt(0) - 'a'.charCodeAt(0);
    const toRow = 8 - parseInt(destMatch[2]);

    // Extract disambiguation info (e.g., "Nbd7" -> file 'b', "R1a3" -> rank '1')
    const remainingNotation = moveNotation.substring(0, moveNotation.length - 2);
    if (remainingNotation.length > 0) {
      // Check for file (a-h)
      const fileMatch = remainingNotation.match(/[a-h]/);
      if (fileMatch) {
        disambiguationFile = fileMatch[0];
      }
      // Check for rank (1-8)
      const rankMatch = remainingNotation.match(/[1-8]/);
      if (rankMatch) {
        disambiguationRank = rankMatch[0];
      }
    }

    // For pawn captures, the first character is the source file
    if (pieceType === 'pawn' && isCapture && notation[0] >= 'a' && notation[0] <= 'h') {
      disambiguationFile = notation[0];
    }

    // Find all pieces of this type and color
    const candidates: Array<[number, number]> = [];
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const boardPiece = board[row][col];
        if (boardPiece && boardPiece.type === pieceType && boardPiece.color === color) {
          // Check if piece can legally move to destination
          if (isLegalMove(boardPiece, [row, col], [toRow, toCol], board, isCapture)) {
            // Apply disambiguation filters AFTER verifying legal move
            if (disambiguationFile !== null) {
              const fileChar = String.fromCharCode('a'.charCodeAt(0) + col);
              if (fileChar !== disambiguationFile) continue;
            }
            if (disambiguationRank !== null) {
              const rankChar = String(8 - row);
              if (rankChar !== disambiguationRank) continue;
            }

            candidates.push([row, col]);
          }
        }
      }
    }

    // Should have exactly one candidate
    if (candidates.length === 0) {
      console.error(`❌ No legal move found for: ${originalNotation} (parsed as ${notation})`);
      console.error(`   Looking for ${color} ${pieceType} to ${destMatch[1]}${destMatch[2]}`);
      console.error(`   Disambiguation: file=${disambiguationFile}, rank=${disambiguationRank}`);
      console.error(`   IsCapture: ${isCapture}`);

      // Debug: show all pieces of this type
      console.group(`📋 All ${color} ${pieceType} pieces on board:`);
      let foundAny = false;
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          const boardPiece = board[row][col];
          if (boardPiece && boardPiece.type === pieceType && boardPiece.color === color) {
            foundAny = true;
            const fileChar = String.fromCharCode('a'.charCodeAt(0) + col);
            const rankChar = String(8 - row);
            const canMove = isLegalMove(boardPiece, [row, col], [toRow, toCol], board, isCapture);
            const distance = Math.max(Math.abs(toRow - row), Math.abs(toCol - col));
            console.log(`  ${fileChar}${rankChar} -> ${destMatch[1]}${destMatch[2]}: legal=${canMove}, distance=${distance}`);
          }
        }
      }
      if (!foundAny) {
        console.error(`  ⚠️ NO ${color} ${pieceType} found on board!`);
      }
      console.groupEnd();

      return null;
    }

    if (candidates.length > 1) {
      console.warn(`Ambiguous move: ${originalNotation}, candidates:`, candidates);
      console.warn(`Using disambiguation: file=${disambiguationFile}, rank=${disambiguationRank}`);
      // Take first candidate as fallback
    }

    const [fromRow, fromCol] = candidates[0];
    return {
      from: [fromRow, fromCol],
      to: [toRow, toCol],
      piece: board[fromRow][fromCol]!,
      isCapture,
      promotion: promotionPiece
    };
  }

  // Check if a move is legal (includes path validation)
  function isLegalMove(piece: ChessPiece, from: [number, number], to: [number, number], board: Board, isCapture: boolean = false): boolean {
    const [fromRow, fromCol] = from;
    const [toRow, toCol] = to;

    // Can't capture own piece
    const targetPiece = board[toRow][toCol];
    if (targetPiece && targetPiece.color === piece.color) {
      return false;
    }

    const rowDiff = toRow - fromRow;
    const colDiff = toCol - fromCol;
    const absRowDiff = Math.abs(rowDiff);
    const absColDiff = Math.abs(colDiff);

    switch (piece.type) {
      case 'pawn': {
        const direction = piece.color === 'white' ? -1 : 1;
        const startRow = piece.color === 'white' ? 6 : 1;

        // Forward move (non-capture)
        if (colDiff === 0 && !isCapture) {
          // Single step forward
          if (rowDiff === direction && !targetPiece) return true;
          // Double step from starting position
          if (fromRow === startRow && rowDiff === 2 * direction && !targetPiece && !board[fromRow + direction][fromCol]) {
            return true;
          }
        }

        // Capture (diagonal move)
        if (absColDiff === 1 && rowDiff === direction) {
          // Regular capture
          if (targetPiece && targetPiece.color !== piece.color) {
            return true;
          }
          // En passant: capture notation but no piece on target square
          if (isCapture && !targetPiece) {
            return true;
          }
        }

        return false;
      }

      case 'knight':
        return (absRowDiff === 2 && absColDiff === 1) || (absRowDiff === 1 && absColDiff === 2);

      case 'bishop':
        if (absRowDiff !== absColDiff) return false;
        return isPathClear(from, to, board);

      case 'rook':
        if (absRowDiff !== 0 && absColDiff !== 0) return false;
        return isPathClear(from, to, board);

      case 'queen':
        if (absRowDiff !== absColDiff && absRowDiff !== 0 && absColDiff !== 0) return false;
        return isPathClear(from, to, board);

      case 'king':
        return absRowDiff <= 1 && absColDiff <= 1;

      default:
        return false;
    }
  }

  // Check if path is clear between two squares
  function isPathClear(from: [number, number], to: [number, number], board: Board): boolean {
    const [fromRow, fromCol] = from;
    const [toRow, toCol] = to;

    const rowStep = toRow > fromRow ? 1 : toRow < fromRow ? -1 : 0;
    const colStep = toCol > fromCol ? 1 : toCol < fromCol ? -1 : 0;

    let currentRow = fromRow + rowStep;
    let currentCol = fromCol + colStep;

    while (currentRow !== toRow || currentCol !== toCol) {
      if (board[currentRow][currentCol] !== null) {
        return false;
      }
      currentRow += rowStep;
      currentCol += colStep;
    }

    return true;
  }

  // Apply move to board
  function applyMove(board: Board, moveIndex: number): Board {
    if (moveIndex < 0 || moveIndex >= game.moves.length) return board;

    const newBoard = board.map(row => [...row]);
    const notation = game.moves[moveIndex];
    const color = moveIndex % 2 === 0 ? 'white' : 'black';

    const parsedMove = parseMove(notation, newBoard, color);
    if (!parsedMove) return newBoard;

    const { from, to, piece, isCapture, promotion } = parsedMove;

    // Handle castling
    if (piece.type === 'king' && Math.abs(to[1] - from[1]) === 2) {
      // Move king
      newBoard[to[0]][to[1]] = { ...piece, hasMoved: true };
      newBoard[from[0]][from[1]] = null;

      // Move rook
      if (to[1] === 6) { // King-side
        newBoard[to[0]][5] = newBoard[to[0]][7];
        newBoard[to[0]][7] = null;
      } else { // Queen-side
        newBoard[to[0]][3] = newBoard[to[0]][0];
        newBoard[to[0]][0] = null;
      }
    }
    // Handle en passant
    else if (piece.type === 'pawn' && isCapture && !newBoard[to[0]][to[1]]) {
      // En passant: remove the captured pawn
      const capturedPawnRow = color === 'white' ? to[0] + 1 : to[0] - 1;
      newBoard[capturedPawnRow][to[1]] = null;
      newBoard[to[0]][to[1]] = { ...piece, hasMoved: true };
      newBoard[from[0]][from[1]] = null;
    }
    // Normal move
    else {
      newBoard[to[0]][to[1]] = { ...piece, hasMoved: true };
      newBoard[from[0]][from[1]] = null;
    }

    // Pawn promotion
    if (piece.type === 'pawn') {
      const promotionRow = piece.color === 'white' ? 0 : 7;
      if (to[0] === promotionRow) {
        // Use explicit promotion piece if specified, otherwise default to queen
        const promoteTo = promotion || 'queen';
        newBoard[to[0]][to[1]] = { type: promoteTo, color: piece.color, hasMoved: true };
      }
    }

    setLastMove({ from, to });
    return newBoard;
  }

  // Analyze game with Stockfish on mount
  useEffect(() => {
    analyzeGameWithStockfish();
  }, []);

  async function analyzeGameWithStockfish() {
    setAnalyzing(true);
    const analyses: MoveAnalysis[] = [];
    let previousEval = 0;

    // Stats tracking
    const whiteMovesStats = { excellent: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0, totalMoves: 0 };
    const blackMovesStats = { excellent: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0, totalMoves: 0 };

    // Reconstruct positions for analysis
    let tempBoard = getInitialBoard();
    const positions: { board: Board; moveIndex: number; fen: string }[] = [];

    // Build all positions (using a separate reconstruction to avoid side effects)
    for (let i = 0; i < game.moves.length; i++) {
      const notation = game.moves[i];
      const color = i % 2 === 0 ? 'white' : 'black';

      const parsedMove = parseMove(notation, tempBoard, color);
      if (!parsedMove) {
        console.warn(`Failed to parse move ${i}: ${notation}`);
        continue;
      }

      // Apply move to temp board
      const { from, to, piece, isCapture, promotion } = parsedMove;
      const newBoard = tempBoard.map(row => [...row]);

      // Handle castling
      if (piece.type === 'king' && Math.abs(to[1] - from[1]) === 2) {
        newBoard[to[0]][to[1]] = { ...piece, hasMoved: true };
        newBoard[from[0]][from[1]] = null;
        if (to[1] === 6) {
          newBoard[to[0]][5] = newBoard[to[0]][7];
          newBoard[to[0]][7] = null;
        } else {
          newBoard[to[0]][3] = newBoard[to[0]][0];
          newBoard[to[0]][0] = null;
        }
      }
      // Handle en passant
      else if (piece.type === 'pawn' && isCapture && !newBoard[to[0]][to[1]]) {
        const capturedPawnRow = color === 'white' ? to[0] + 1 : to[0] - 1;
        newBoard[capturedPawnRow][to[1]] = null;
        newBoard[to[0]][to[1]] = { ...piece, hasMoved: true };
        newBoard[from[0]][from[1]] = null;
      }
      // Normal move
      else {
        newBoard[to[0]][to[1]] = { ...piece, hasMoved: true };
        newBoard[from[0]][from[1]] = null;
      }

      // Pawn promotion
      if (piece.type === 'pawn') {
        const promotionRow = piece.color === 'white' ? 0 : 7;
        if (to[0] === promotionRow) {
          const promoteTo = promotion || 'queen';
          newBoard[to[0]][to[1]] = { type: promoteTo, color: piece.color, hasMoved: true };
        }
      }

      tempBoard = newBoard;
      const fen = generateFEN(newBoard, i % 2 === 0 ? 'black' : 'white', i + 1);
      positions.push({ board: newBoard, moveIndex: i, fen });
    }

    // Analyze each position
    for (let i = 0; i < positions.length; i++) {
      const { moveIndex, fen } = positions[i];
      const notation = game.moves[moveIndex];
      const moveNumber = Math.floor(moveIndex / 2) + 1;
      const isWhiteMove = moveIndex % 2 === 0;

      setAnalysisProgress(Math.round(((i + 1) / positions.length) * 100));

      try {
        const analysis = await stockfish.analyzeMove(fen, notation, 12);

        if (analysis) {
          const evaluation = analysis.evaluation;
          const evaluationChange = Math.abs(evaluation - previousEval);
          const isCriticalMoment = evaluationChange >= 200; // Swing of 2+ pawns

          // Classify move based on evaluation change
          let classification: MoveAnalysis['classification'];
          let comment: string;
          let suggestedVariation: string | undefined;

          if (evaluationChange < 20) {
            classification = 'excellent';
            comment = '¡Excelente! Mejor jugada.';
          } else if (evaluationChange < 60) {
            classification = 'good';
            comment = 'Buen movimiento.';
          } else if (evaluationChange < 120) {
            classification = 'inaccuracy';
            comment = `Imprecisión. Mejor era ${analysis.bestMove}.`;
            suggestedVariation = `Sugerencia: ${analysis.bestMove}`;
          } else if (evaluationChange < 300) {
            classification = 'mistake';
            comment = `Error. ${analysis.bestMove} era mucho mejor.`;
            suggestedVariation = `Debiste jugar: ${analysis.bestMove}`;
          } else {
            classification = 'blunder';
            comment = `¡Blunder! ${analysis.bestMove} mantenía ventaja.`;
            suggestedVariation = `Mejor secuencia: ${analysis.bestMove}`;
          }

          // Update stats
          const stats = isWhiteMove ? whiteMovesStats : blackMovesStats;
          stats.totalMoves++;
          stats[classification]++;

          analyses.push({
            moveNumber,
            notation,
            evaluation,
            classification,
            comment,
            bestMove: analysis.bestMove,
            isCriticalMoment,
            suggestedVariation
          });

          previousEval = evaluation;
        }
      } catch (error) {
        console.warn(`Failed to analyze move ${moveIndex}:`, error);
      }
    }

    // Calculate accuracy percentages
    const calcAccuracy = (stats: typeof whiteMovesStats) => {
      if (stats.totalMoves === 0) return 0;
      const goodMoves = stats.excellent + stats.good;
      return Math.round((goodMoves / stats.totalMoves) * 100);
    };

    setWhiteStats({
      ...whiteMovesStats,
      accuracy: calcAccuracy(whiteMovesStats)
    });

    setBlackStats({
      ...blackMovesStats,
      accuracy: calcAccuracy(blackMovesStats)
    });

    setMoveAnalyses(analyses);
    setAnalyzing(false);
  }

  // Reconstruct board up to current move
  useEffect(() => {
    let newBoard = getInitialBoard();
    let movesFailed = false;

    for (let i = 0; i <= currentMoveIndex; i++) {
      const previousBoard = newBoard.map(row => [...row]); // Backup
      newBoard = applyMove(newBoard, i);

      // Verify move was applied (board changed)
      const boardChanged = JSON.stringify(previousBoard) !== JSON.stringify(newBoard);
      if (!boardChanged && i >= 0) {
        console.error(`❌ Move ${i + 1} failed to apply: ${game.moves[i]}`);
        movesFailed = true;
        // Don't stop - continue with remaining moves
      }
    }

    if (movesFailed) {
      console.warn('⚠️ Some moves failed to apply. Check console for details.');
    }

    setBoard(newBoard);
  }, [currentMoveIndex, game.moves]);

  // Auto-play
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setCurrentMoveIndex(prev => {
        if (prev >= game.moves.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, playbackSpeed);
    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed, game.moves.length]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const getClassificationColor = (classification: MoveAnalysis['classification']) => {
    switch (classification) {
      case 'excellent': return 'text-green-400';
      case 'good': return 'text-blue-400';
      case 'inaccuracy': return 'text-yellow-400';
      case 'mistake': return 'text-orange-400';
      case 'blunder': return 'text-red-400';
    }
  };

  const getClassificationIcon = (classification: MoveAnalysis['classification']) => {
    switch (classification) {
      case 'excellent': return '✓✓';
      case 'good': return '✓';
      case 'inaccuracy': return '?!';
      case 'mistake': return '?';
      case 'blunder': return '??';
    }
  };

  const getCurrentMoveAnalysis = () => {
    if (currentMoveIndex < 0 || currentMoveIndex >= moveAnalyses.length) return null;
    return moveAnalyses[currentMoveIndex];
  };

  const currentAnalysis = getCurrentMoveAnalysis();

  // Generate evaluation chart data
  const generateEvaluationChart = () => {
    if (moveAnalyses.length === 0) return null;

    const width = 600;
    const height = 150;
    const padding = 20;
    const chartWidth = width - 2 * padding;
    const chartHeight = height - 2 * padding;

    // Normalize evaluations to chart coordinates
    const maxEval = Math.max(...moveAnalyses.map(a => Math.abs(a.evaluation)));
    const clampedMax = Math.min(maxEval, 500); // Cap at 5 pawns for readability

    const points = moveAnalyses.map((analysis, index) => {
      const x = padding + (index / (moveAnalyses.length - 1)) * chartWidth;
      const normalizedEval = Math.max(-clampedMax, Math.min(clampedMax, analysis.evaluation));
      const y = padding + chartHeight / 2 - (normalizedEval / clampedMax) * (chartHeight / 2);
      return { x, y, analysis, index };
    });

    const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    return { width, height, padding, chartHeight, points, pathData, clampedMax };
  };

  const chartData = !analyzing ? generateEvaluationChart() : null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-2xl border-2 border-slate-700 max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-white via-blue-400 to-blue-600 p-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-purple-600 mb-1">🎬 Replay de Partida</h2>
              <p className="text-purple-700 text-sm">
                {game.whitePlayerName} vs {game.blackPlayerName} • {formatDuration(game.duration)}
              </p>
            </div>
            <button onClick={onClose} className="text-white hover:bg-white/20 rounded-lg px-4 py-2 transition-all font-semibold">
              ✕ Cerrar
            </button>
          </div>

          {/* Analysis Progress Bar */}
          {analyzing && (
            <div className="mt-4 bg-blue-900/30 rounded-lg p-3 backdrop-blur border border-blue-700/40">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-blue-900 font-semibold">🤔 Analizando con DeepM8 Coach...</span>
                <span className="text-blue-800 text-sm">{analysisProgress}%</span>
              </div>
              <div className="w-full bg-blue-900/30 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-700 h-full transition-all duration-300"
                  style={{ width: `${analysisProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Player Statistics & Evaluation Chart */}
          {!analyzing && (whiteStats || blackStats) && (
            <div className="mb-6 space-y-4">
              {/* Player Accuracy Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* White Player Stats */}
                {whiteStats && (
                  <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-xl p-4 border border-slate-700">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-3xl">⚪</span>
                      <div className="flex-1">
                        <h3 className="font-bold text-white">{game.whitePlayerName}</h3>
                        <p className="text-sm text-slate-400">Blancas</p>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-white">{whiteStats.accuracy}%</div>
                        <div className="text-xs text-slate-400">Precisión</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-5 gap-2 text-center text-xs">
                      <div className="bg-green-500/20 rounded p-2">
                        <div className="font-bold text-green-400">{whiteStats.excellent}</div>
                        <div className="text-slate-400">✓✓</div>
                      </div>
                      <div className="bg-blue-500/20 rounded p-2">
                        <div className="font-bold text-blue-400">{whiteStats.good}</div>
                        <div className="text-slate-400">✓</div>
                      </div>
                      <div className="bg-yellow-500/20 rounded p-2">
                        <div className="font-bold text-yellow-400">{whiteStats.inaccuracy}</div>
                        <div className="text-slate-400">?!</div>
                      </div>
                      <div className="bg-orange-500/20 rounded p-2">
                        <div className="font-bold text-orange-400">{whiteStats.mistake}</div>
                        <div className="text-slate-400">?</div>
                      </div>
                      <div className="bg-red-500/20 rounded p-2">
                        <div className="font-bold text-red-400">{whiteStats.blunder}</div>
                        <div className="text-slate-400">??</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Black Player Stats */}
                {blackStats && (
                  <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-xl p-4 border border-slate-700">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-3xl">⚫</span>
                      <div className="flex-1">
                        <h3 className="font-bold text-white">{game.blackPlayerName}</h3>
                        <p className="text-sm text-slate-400">Negras</p>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-white">{blackStats.accuracy}%</div>
                        <div className="text-xs text-slate-400">Precisión</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-5 gap-2 text-center text-xs">
                      <div className="bg-green-500/20 rounded p-2">
                        <div className="font-bold text-green-400">{blackStats.excellent}</div>
                        <div className="text-slate-400">✓✓</div>
                      </div>
                      <div className="bg-blue-500/20 rounded p-2">
                        <div className="font-bold text-blue-400">{blackStats.good}</div>
                        <div className="text-slate-400">✓</div>
                      </div>
                      <div className="bg-yellow-500/20 rounded p-2">
                        <div className="font-bold text-yellow-400">{blackStats.inaccuracy}</div>
                        <div className="text-slate-400">?!</div>
                      </div>
                      <div className="bg-orange-500/20 rounded p-2">
                        <div className="font-bold text-orange-400">{blackStats.mistake}</div>
                        <div className="text-slate-400">?</div>
                      </div>
                      <div className="bg-red-500/20 rounded p-2">
                        <div className="font-bold text-red-400">{blackStats.blunder}</div>
                        <div className="text-slate-400">??</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Evaluation Chart */}
              {chartData && (
                <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-white">📈 Gráfico de Ventaja</h3>
                    <button
                      onClick={() => setShowAdvancedAnalysis(!showAdvancedAnalysis)}
                      className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs font-semibold transition-all"
                    >
                      {showAdvancedAnalysis ? '📊 Ocultar Detalles' : '🔍 Ver Momentos Críticos'}
                    </button>
                  </div>
                  <svg
                    viewBox={`0 0 ${chartData.width} ${chartData.height}`}
                    className="w-full h-auto bg-slate-900/50 rounded-lg"
                  >
                    {/* Grid lines */}
                    <line x1={chartData.padding} y1={chartData.padding + chartData.chartHeight / 2} x2={chartData.width - chartData.padding} y2={chartData.padding + chartData.chartHeight / 2} stroke="#475569" strokeWidth="1" strokeDasharray="4 4" />
                    <line x1={chartData.padding} y1={chartData.padding} x2={chartData.width - chartData.padding} y2={chartData.padding} stroke="#334155" strokeWidth="1" strokeDasharray="2 2" />
                    <line x1={chartData.padding} y1={chartData.height - chartData.padding} x2={chartData.width - chartData.padding} y2={chartData.height - chartData.padding} stroke="#334155" strokeWidth="1" strokeDasharray="2 2" />

                    {/* White advantage area */}
                    <rect x={chartData.padding} y={chartData.padding} width={chartData.width - 2 * chartData.padding} height={chartData.chartHeight / 2} fill="rgba(255, 255, 255, 0.03)" />
                    {/* Black advantage area */}
                    <rect x={chartData.padding} y={chartData.padding + chartData.chartHeight / 2} width={chartData.width - 2 * chartData.padding} height={chartData.chartHeight / 2} fill="rgba(0, 0, 0, 0.2)" />

                    {/* Evaluation line */}
                    <path d={chartData.pathData} stroke="#3b82f6" strokeWidth="2" fill="none" />

                    {/* Critical moments */}
                    {showAdvancedAnalysis && chartData.points.map((point, index) =>
                      point.analysis.isCriticalMoment ? (
                        <g key={index}>
                          <circle cx={point.x} cy={point.y} r="5" fill="#ef4444" stroke="#fca5a5" strokeWidth="2" />
                          <text x={point.x} y={point.y - 10} textAnchor="middle" fill="#ef4444" fontSize="10" fontWeight="bold">⚠️</text>
                        </g>
                      ) : null
                    )}

                    {/* Current position indicator */}
                    {currentMoveIndex >= 0 && currentMoveIndex < chartData.points.length && (
                      <g>
                        <line
                          x1={chartData.points[currentMoveIndex].x}
                          y1={chartData.padding}
                          x2={chartData.points[currentMoveIndex].x}
                          y2={chartData.height - chartData.padding}
                          stroke="#fbbf24"
                          strokeWidth="2"
                          strokeDasharray="4 4"
                        />
                        <circle
                          cx={chartData.points[currentMoveIndex].x}
                          cy={chartData.points[currentMoveIndex].y}
                          r="6"
                          fill="#fbbf24"
                          stroke="#fef3c7"
                          strokeWidth="2"
                        />
                      </g>
                    )}

                    {/* Labels */}
                    <text x={10} y={chartData.padding - 5} fill="#cbd5e1" fontSize="12" fontWeight="bold">⚪ Ventaja Blancas</text>
                    <text x={10} y={chartData.height - 5} fill="#cbd5e1" fontSize="12" fontWeight="bold">⚫ Ventaja Negras</text>
                    <text x={chartData.width - 80} y={chartData.padding + chartData.chartHeight / 2 - 5} fill="#94a3b8" fontSize="10">+{(chartData.clampedMax / 100).toFixed(1)}</text>
                    <text x={chartData.width - 80} y={chartData.padding + chartData.chartHeight / 2 + 15} fill="#94a3b8" fontSize="10">-{(chartData.clampedMax / 100).toFixed(1)}</text>
                  </svg>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chess Board */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-[#312e2b] p-4 rounded-xl shadow-2xl border-4 border-[#1a1816] inline-block">
                <div className="grid grid-cols-8 gap-0 rounded-lg overflow-hidden shadow-2xl ring-2 ring-[#8b7355]">
                  {board.map((row, rowIndex) =>
                    row.map((piece, colIndex) => {
                      const isLight = (rowIndex + colIndex) % 2 === 0;
                      const isLastMoveSquare = lastMove &&
                        ((lastMove.from[0] === rowIndex && lastMove.from[1] === colIndex) ||
                         (lastMove.to[0] === rowIndex && lastMove.to[1] === colIndex));

                      return (
                        <div
                          key={`${rowIndex}-${colIndex}`}
                          className={`w-16 h-16 md:w-20 md:h-20 flex items-center justify-center transition-all duration-300 ${
                            isLight ? 'bg-[#d9ad7c]' : 'bg-[#a0724a]'
                          } ${isLastMoveSquare ? 'ring-4 ring-yellow-400 ring-inset brightness-125' : ''}`}
                        >
                          {piece && (
                            <span className={`text-5xl md:text-6xl font-light select-none transition-all duration-300 ${
                              piece.color === 'white'
                                ? 'text-white drop-shadow-[0_4px_6px_rgba(0,0,0,0.9)]'
                                : 'text-[#403d39] drop-shadow-[0_4px_6px_rgba(255,255,255,0.75)]'
                            }`}>
                              {PIECE_SYMBOLS[piece.color][piece.type]}
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Current Move Analysis Panel */}
              {!analyzing && currentAnalysis && (
                <div className={`bg-slate-800/80 rounded-xl p-4 border-2 ${
                  currentAnalysis.classification === 'excellent' ? 'border-green-500/50' :
                  currentAnalysis.classification === 'good' ? 'border-blue-500/50' :
                  currentAnalysis.classification === 'inaccuracy' ? 'border-yellow-500/50' :
                  currentAnalysis.classification === 'mistake' ? 'border-orange-500/50' :
                  'border-red-500/50'
                }`}>
                  <div className="flex items-start gap-3">
                    <div className={`text-3xl font-bold ${getClassificationColor(currentAnalysis.classification)}`}>
                      {getClassificationIcon(currentAnalysis.classification)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-white font-bold text-lg">
                          {currentAnalysis.moveNumber}. {currentAnalysis.notation}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          currentAnalysis.classification === 'excellent' ? 'bg-green-500/20 text-green-400' :
                          currentAnalysis.classification === 'good' ? 'bg-blue-500/20 text-blue-400' :
                          currentAnalysis.classification === 'inaccuracy' ? 'bg-yellow-500/20 text-yellow-400' :
                          currentAnalysis.classification === 'mistake' ? 'bg-orange-500/20 text-orange-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {currentAnalysis.classification.toUpperCase()}
                        </span>
                        {currentAnalysis.isCriticalMoment && (
                          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-400 animate-pulse">
                            ⚠️ MOMENTO CRÍTICO
                          </span>
                        )}
                      </div>
                      <p className="text-slate-300 text-sm mb-2">{currentAnalysis.comment}</p>
                      {currentAnalysis.suggestedVariation && (
                        <div className="mt-2 p-2 bg-slate-900/50 rounded border border-slate-600">
                          <p className="text-xs font-semibold text-purple-400 mb-1">💡 Variante Sugerida:</p>
                          <p className="text-sm text-slate-300 font-mono">{currentAnalysis.suggestedVariation}</p>
                        </div>
                      )}
                      <div className="text-slate-400 text-xs mt-2">
                        Evaluación: {currentAnalysis.evaluation > 0 ? '+' : ''}{(currentAnalysis.evaluation / 100).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Controls & Move List */}
            <div className="space-y-4">
              {/* Playback Controls */}
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <h3 className="text-lg font-bold text-white mb-3">Controles</h3>

                {/* Progress */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-slate-400 mb-2">
                    <span>Movimiento {currentMoveIndex + 2} / {game.moves.length + 1}</span>
                    <span>{Math.round(((currentMoveIndex + 2) / (game.moves.length + 1)) * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="-1"
                    max={game.moves.length - 1}
                    value={currentMoveIndex}
                    onChange={(e) => {
                      setIsPlaying(false);
                      setCurrentMoveIndex(parseInt(e.target.value));
                    }}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Buttons */}
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => { setIsPlaying(false); setCurrentMoveIndex(-1); }}
                    className="flex-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold transition-all"
                    title="Inicio"
                  >
                    ⏮️
                  </button>
                  <button
                    onClick={() => { setIsPlaying(false); setCurrentMoveIndex(Math.max(-1, currentMoveIndex - 1)); }}
                    className="flex-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold transition-all"
                    title="Anterior"
                  >
                    ⏪
                  </button>
                  <button
                    onClick={() => {
                      if (currentMoveIndex >= game.moves.length - 1) {
                        setCurrentMoveIndex(-1);
                      }
                      setIsPlaying(!isPlaying);
                    }}
                    className="flex-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg font-semibold transition-all"
                  >
                    {isPlaying ? '⏸️' : '▶️'}
                  </button>
                  <button
                    onClick={() => { setIsPlaying(false); setCurrentMoveIndex(Math.min(game.moves.length - 1, currentMoveIndex + 1)); }}
                    className="flex-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold transition-all"
                    title="Siguiente"
                  >
                    ⏩
                  </button>
                </div>

                {/* Speed */}
                <div>
                  <label className="text-sm text-slate-400 block mb-2">Velocidad</label>
                  <select
                    value={playbackSpeed}
                    onChange={(e) => setPlaybackSpeed(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600"
                  >
                    <option value="2000">0.5x (Lento)</option>
                    <option value="1000">1x (Normal)</option>
                    <option value="500">2x (Rápido)</option>
                    <option value="250">4x (Muy Rápido)</option>
                  </select>
                </div>
              </div>

              {/* Move List */}
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 max-h-96 overflow-y-auto">
                <h3 className="text-lg font-bold text-white mb-3">📝 Movimientos {!analyzing && '& Análisis'}</h3>
                <div className="space-y-1">
                  <div
                    onClick={() => { setIsPlaying(false); setCurrentMoveIndex(-1); }}
                    className={`px-3 py-2 rounded-lg cursor-pointer transition-all ${
                      currentMoveIndex === -1
                        ? 'bg-blue-500 text-white'
                        : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <span className="font-mono">Posición Inicial</span>
                  </div>
                  {game.moves.map((move, index) => {
                    const analysis = moveAnalyses[index];
                    return (
                      <div
                        key={index}
                        onClick={() => { setIsPlaying(false); setCurrentMoveIndex(index); }}
                        className={`px-3 py-2 rounded-lg cursor-pointer transition-all ${
                          index === currentMoveIndex
                            ? 'bg-blue-500 text-white'
                            : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                        } ${analysis?.isCriticalMoment ? 'ring-2 ring-red-500/50' : ''}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1">
                            <span className="font-mono flex-shrink-0">
                              {Math.floor(index / 2) + 1}.{index % 2 === 0 ? '' : '..'} {move}
                            </span>
                            {analysis?.isCriticalMoment && (
                              <span className="text-red-400 text-xs">⚠️</span>
                            )}
                          </div>
                          {!analyzing && analysis && (
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <span className={`text-xs font-bold ${
                                analysis.classification === 'excellent' ? 'text-green-400' :
                                analysis.classification === 'good' ? 'text-blue-400' :
                                analysis.classification === 'inaccuracy' ? 'text-yellow-400' :
                                analysis.classification === 'mistake' ? 'text-orange-400' :
                                'text-red-400'
                              }`}>
                                {getClassificationIcon(analysis.classification)}
                              </span>
                              <span className="text-xs text-slate-400 font-mono">
                                {analysis.evaluation > 0 ? '+' : ''}{(analysis.evaluation / 100).toFixed(1)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
