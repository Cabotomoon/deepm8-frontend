/**
 * Chess Move Notation Utilities
 * Convert UCI notation to human-readable algebraic notation
 */

interface MoveNotation {
  uci: string;
  san: string;
  description: string;
}

/**
 * Convert UCI notation to descriptive algebraic notation
 */
export function formatMove(uciMove: string): MoveNotation {
  const from = uciMove.substring(0, 2);
  const to = uciMove.substring(2, 4);
  const promotion = uciMove.length > 4 ? uciMove[4] : null;

  // Map files to columns
  const files: Record<string, string> = {
    a: 'a', b: 'b', c: 'c', d: 'd',
    e: 'e', f: 'f', g: 'g', h: 'h'
  };

  // Simple piece detection based on common patterns
  let piece = '';
  let description = '';

  // Detect castling
  if (from === 'e1' && to === 'g1') {
    return { uci: uciMove, san: 'O-O', description: 'Enroque corto (blancas)' };
  }
  if (from === 'e1' && to === 'c1') {
    return { uci: uciMove, san: 'O-O-O', description: 'Enroque largo (blancas)' };
  }
  if (from === 'e8' && to === 'g8') {
    return { uci: uciMove, san: 'O-O', description: 'Enroque corto (negras)' };
  }
  if (from === 'e8' && to === 'c8') {
    return { uci: uciMove, san: 'O-O-O', description: 'Enroque largo (negras)' };
  }

  // Detect promotion
  if (promotion) {
    const pieceNames: Record<string, string> = {
      q: 'D', r: 'T', b: 'A', n: 'C'
    };
    const promotionPiece = pieceNames[promotion.toLowerCase()] || 'D';
    return {
      uci: uciMove,
      san: `${to}=${promotionPiece}`,
      description: `Peón corona a ${promotionPiece} en ${to}`
    };
  }

  // Simple format for regular moves
  const san = `${from}-${to}`;
  description = `Jugada de ${from} a ${to}`;

  return { uci: uciMove, san, description };
}

/**
 * Get piece symbol from position
 */
export function getPieceSymbol(piece: string): string {
  const symbols: Record<string, string> = {
    p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚',
    P: '♙', N: '♘', B: '♗', R: '♖', Q: '♕', K: '♔'
  };
  return symbols[piece] || piece;
}

/**
 * Format move for display with enhanced visuals
 */
export function formatMoveDisplay(uciMove: string): string {
  const { san } = formatMove(uciMove);

  // Add arrow symbol for better visualization
  if (san.includes('-')) {
    return san.replace('-', ' → ');
  }

  return san;
}
