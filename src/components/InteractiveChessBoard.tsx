/**
 * Interactive Chess Board
 *
 * Click a piece, then click a destination square. Emits the move in UCI
 * notation (e.g. "e2e4"). Purely presentational: move legality/solution
 * checking is handled by the training puzzle service. Reuses parseFEN
 * from fenUtils so it stays consistent with the rest of the app.
 */

import React, { useMemo, useState } from 'react';
import { parseFEN } from '../utils/fenUtils';

interface InteractiveChessBoardProps {
  fen: string;
  /** Board orientation: which side sits at the bottom */
  orientation?: 'white' | 'black';
  /** Called with a UCI move string when the user completes a move */
  onMove: (uci: string) => void;
  /** Disable interaction (e.g. while showing feedback) */
  disabled?: boolean;
  width?: number;
  /** Optional squares to highlight (UCI square names like "e4") */
  highlightSquares?: string[];
}

const pieceSymbols: Record<string, string> = {
  king: '♚', queen: '♛', rook: '♜', bishop: '♝', knight: '♞', pawn: '♟'
};

const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

/** Convert board indices to a UCI square name */
function toSquare(row: number, col: number): string {
  return `${files[col]}${8 - row}`;
}

export function InteractiveChessBoard({
  fen,
  orientation = 'white',
  onMove,
  disabled = false,
  width = 480,
  highlightSquares = []
}: InteractiveChessBoardProps) {
  const board = useMemo(() => parseFEN(fen), [fen]);
  const [selected, setSelected] = useState<{ row: number; col: number } | null>(null);

  const squareSize = width / 8;
  const flip = orientation === 'black';

  // Display order of rows/cols depending on orientation
  const rowOrder = flip ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
  const colOrder = flip ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];

  const sideToMove: 'white' | 'black' = fen.split(' ')[1] === 'b' ? 'black' : 'white';

  const handleSquareClick = (row: number, col: number) => {
    if (disabled) return;
    const piece = board[row][col];

    if (selected) {
      // Second click: attempt the move
      if (selected.row === row && selected.col === col) {
        setSelected(null); // deselect
        return;
      }
      const from = toSquare(selected.row, selected.col);
      const to = toSquare(row, col);
      const movingPiece = board[selected.row][selected.col];
      let uci = `${from}${to}`;
      // Auto-queen promotion for pawns reaching the last rank
      if (movingPiece?.type === 'pawn' && (to[1] === '8' || to[1] === '1')) {
        uci += 'q';
      }
      setSelected(null);
      onMove(uci);
      return;
    }

    // First click: select only your own piece
    if (piece && piece.color === sideToMove) {
      setSelected({ row, col });
    }
  };

  return (
    <div
      style={{
        width: `${width}px`,
        height: `${width}px`,
        position: 'relative',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        border: '2px solid rgba(99,102,241,0.3)'
      }}
    >
      {rowOrder.map((row, displayRow) =>
        colOrder.map((col, displayCol) => {
          const piece = board[row][col];
          const isLight = (row + col) % 2 === 0;
          const squareName = toSquare(row, col);
          const isSelected = selected?.row === row && selected?.col === col;
          const isHighlighted = highlightSquares.includes(squareName);
          const isSelectable = !disabled && !!piece && piece.color === sideToMove;

          let bg = isLight ? '#e0e7ff' : '#6366f1';
          if (isHighlighted) bg = isLight ? '#fde68a' : '#f59e0b';
          if (isSelected) bg = isLight ? '#86efac' : '#22c55e';

          return (
            <div
              key={`${row}-${col}`}
              onClick={() => handleSquareClick(row, col)}
              style={{
                position: 'absolute',
                left: `${displayCol * squareSize}px`,
                top: `${displayRow * squareSize}px`,
                width: `${squareSize}px`,
                height: `${squareSize}px`,
                backgroundColor: bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: `${squareSize * 0.7}px`,
                lineHeight: 1,
                userSelect: 'none',
                cursor: isSelectable || selected ? 'pointer' : 'default',
                color: piece?.color === 'white' ? '#ffffff' : '#1e1b2e',
                textShadow: piece?.color === 'white' ? '0 1px 2px rgba(0,0,0,0.6)' : 'none',
                transition: 'background-color 0.15s ease'
              }}
            >
              {piece ? pieceSymbols[piece.type] : ''}
            </div>
          );
        })
      )}
    </div>
  );
}

export default InteractiveChessBoard;
