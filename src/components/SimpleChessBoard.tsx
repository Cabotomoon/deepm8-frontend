/**
 * Simple Chess Board Component
 * Custom implementation with guaranteed rendering
 */

import React from 'react';

interface SimpleChessBoardProps {
  fen: string;
  width?: number;
}

const pieceSymbols: Record<string, string> = {
  'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚', 'p': '♟',
  'R': '♖', 'N': '♘', 'B': '♗', 'Q': '♕', 'K': '♔', 'P': '♙'
};

export function SimpleChessBoard({ fen, width = 500 }: SimpleChessBoardProps) {
  const parseFEN = (fen: string) => {
    const [position] = fen.split(' ');
    const ranks = position.split('/');
    const board: (string | null)[][] = [];

    for (const rank of ranks) {
      const row: (string | null)[] = [];
      for (const char of rank) {
        if (char >= '1' && char <= '8') {
          const emptySquares = parseInt(char);
          for (let i = 0; i < emptySquares; i++) {
            row.push(null);
          }
        } else {
          row.push(char);
        }
      }
      board.push(row);
    }

    return board;
  };

  const board = parseFEN(fen);
  const squareSize = width / 8;
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

  return (
    <div
      style={{
        width: `${width}px`,
        height: `${width}px`,
        position: 'relative',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        border: '2px solid rgba(99, 102, 241, 0.3)'
      }}
    >
      {/* Board squares */}
      {board.map((row, rankIndex) => (
        row.map((piece, fileIndex) => {
          const isLight = (rankIndex + fileIndex) % 2 === 0;
          const squareColor = isLight ? '#e0e7ff' : '#6366f1';

          return (
            <div
              key={`${rankIndex}-${fileIndex}`}
              style={{
                position: 'absolute',
                left: `${fileIndex * squareSize}px`,
                top: `${rankIndex * squareSize}px`,
                width: `${squareSize}px`,
                height: `${squareSize}px`,
                backgroundColor: squareColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: `${squareSize * 0.7}px`,
                userSelect: 'none'
              }}
            >
              {piece && pieceSymbols[piece]}
            </div>
          );
        })
      ))}

      {/* File labels (a-h) */}
      {files.map((file, index) => (
        <div
          key={`file-${file}`}
          style={{
            position: 'absolute',
            left: `${index * squareSize + squareSize - 16}px`,
            bottom: '2px',
            fontSize: '10px',
            fontWeight: 'bold',
            color: (index % 2 === 0) ? '#6366f1' : '#e0e7ff',
            userSelect: 'none',
            pointerEvents: 'none'
          }}
        >
          {file}
        </div>
      ))}

      {/* Rank labels (1-8) */}
      {ranks.map((rank, index) => (
        <div
          key={`rank-${rank}`}
          style={{
            position: 'absolute',
            left: '2px',
            top: `${index * squareSize + 2}px`,
            fontSize: '10px',
            fontWeight: 'bold',
            color: (index % 2 === 0) ? '#e0e7ff' : '#6366f1',
            userSelect: 'none',
            pointerEvents: 'none'
          }}
        >
          {rank}
        </div>
      ))}
    </div>
  );
}
