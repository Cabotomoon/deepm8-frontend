/**
 * Chess FEN (Forsyth–Edwards Notation) Utilities
 * Converts board state to/from FEN notation for Stockfish
 */

type PieceType = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';
type PieceColor = 'white' | 'black';

interface ChessPiece {
  type: PieceType;
  color: PieceColor;
  hasMoved?: boolean;
}

type Board = (ChessPiece | null)[][];

/**
 * Convert piece to FEN character
 */
function pieceToFEN(piece: ChessPiece): string {
  const pieceChars: Record<PieceType, string> = {
    king: 'k',
    queen: 'q',
    rook: 'r',
    bishop: 'b',
    knight: 'n',
    pawn: 'p'
  };

  const char = pieceChars[piece.type];
  return piece.color === 'white' ? char.toUpperCase() : char;
}

/**
 * Convert board to FEN notation
 */
export function boardToFEN(
  board: Board,
  currentPlayer: PieceColor,
  castlingRights: string = 'KQkq',
  enPassantSquare: string = '-',
  halfMoveClock: number = 0,
  fullMoveNumber: number = 1
): string {
  // Build piece placement (ranks 8 to 1)
  const ranks: string[] = [];

  for (let row = 0; row < 8; row++) {
    let rankStr = '';
    let emptyCount = 0;

    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];

      if (piece) {
        // Add empty squares count if any
        if (emptyCount > 0) {
          rankStr += emptyCount.toString();
          emptyCount = 0;
        }
        // Add piece
        rankStr += pieceToFEN(piece);
      } else {
        emptyCount++;
      }
    }

    // Add remaining empty squares
    if (emptyCount > 0) {
      rankStr += emptyCount.toString();
    }

    ranks.push(rankStr);
  }

  const piecePlacement = ranks.join('/');
  const activeColor = currentPlayer === 'white' ? 'w' : 'b';

  // Build FEN string
  const fen = `${piecePlacement} ${activeColor} ${castlingRights} ${enPassantSquare} ${halfMoveClock} ${fullMoveNumber}`;

  return fen;
}

/**
 * Get castling rights based on piece movements
 */
export function getCastlingRights(board: Board): string {
  let rights = '';

  // Check white king and rooks
  const whiteKing = board[7][4];
  const whiteKingsideRook = board[7][7];
  const whiteQueensideRook = board[7][0];

  if (whiteKing?.type === 'king' && whiteKing.color === 'white' && !whiteKing.hasMoved) {
    if (whiteKingsideRook?.type === 'rook' && whiteKingsideRook.color === 'white' && !whiteKingsideRook.hasMoved) {
      rights += 'K';
    }
    if (whiteQueensideRook?.type === 'rook' && whiteQueensideRook.color === 'white' && !whiteQueensideRook.hasMoved) {
      rights += 'Q';
    }
  }

  // Check black king and rooks
  const blackKing = board[0][4];
  const blackKingsideRook = board[0][7];
  const blackQueensideRook = board[0][0];

  if (blackKing?.type === 'king' && blackKing.color === 'black' && !blackKing.hasMoved) {
    if (blackKingsideRook?.type === 'rook' && blackKingsideRook.color === 'black' && !blackKingsideRook.hasMoved) {
      rights += 'k';
    }
    if (blackQueensideRook?.type === 'rook' && blackQueensideRook.color === 'black' && !blackQueensideRook.hasMoved) {
      rights += 'q';
    }
  }

  return rights || '-';
}

/**
 * Initial chess position in FEN
 */
export const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

/**
 * Generate FEN from board state (simplified wrapper)
 */
export function generateFEN(board: Board, currentPlayer: PieceColor, moveNumber: number): string {
  const castlingRights = getCastlingRights(board);
  const halfMoveClock = 0; // Simplified - not tracking 50-move rule
  const fullMoveNumber = Math.ceil(moveNumber / 2);

  return boardToFEN(board, currentPlayer, castlingRights, '-', halfMoveClock, fullMoveNumber);
}

/**
 * Parse FEN notation to board state (simplified - only parses piece placement)
 */
export function parseFEN(fen: string): Board {
  const board: Board = Array(8).fill(null).map(() => Array(8).fill(null));

  // Extract piece placement (first part of FEN)
  const piecePlacement = fen.split(' ')[0];
  const ranks = piecePlacement.split('/');

  const charToPiece = (char: string): ChessPiece | null => {
    const pieceMap: Record<string, PieceType> = {
      'k': 'king', 'q': 'queen', 'r': 'rook',
      'b': 'bishop', 'n': 'knight', 'p': 'pawn'
    };

    const lowerChar = char.toLowerCase();
    const type = pieceMap[lowerChar];

    if (!type) return null;

    return {
      type,
      color: char === char.toUpperCase() ? 'white' : 'black'
    };
  };

  ranks.forEach((rank, rowIndex) => {
    let colIndex = 0;

    for (const char of rank) {
      if (char >= '1' && char <= '8') {
        // Empty squares
        colIndex += parseInt(char);
      } else {
        // Piece
        const piece = charToPiece(char);
        if (piece && colIndex < 8) {
          board[rowIndex][colIndex] = piece;
          colIndex++;
        }
      }
    }
  });

  return board;
}
