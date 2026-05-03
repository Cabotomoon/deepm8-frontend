/**
 * Professional Chess Opening Book
 * Contains famous openings and their optimal move sequences
 */

export interface Opening {
  name: string;
  eco: string; // Encyclopedia of Chess Openings code
  moves: string[];
  description: string;
}

export const CHESS_OPENINGS: Opening[] = [
  // King's Pawn Openings (1. e4)
  {
    name: "Italian Game",
    eco: "C50",
    moves: ["e4", "e5", "Nf3", "Nc6", "Bc4"],
    description: "Classical opening focusing on center control and quick development"
  },
  {
    name: "Ruy Lopez",
    eco: "C60",
    moves: ["e4", "e5", "Nf3", "Nc6", "Bb5"],
    description: "One of the oldest and most popular openings"
  },
  {
    name: "Sicilian Defense",
    eco: "B20",
    moves: ["e4", "c5"],
    description: "Asymmetrical, fighting defense for black"
  },
  {
    name: "French Defense",
    eco: "C00",
    moves: ["e4", "e6"],
    description: "Solid but slightly passive defense"
  },
  {
    name: "Caro-Kann Defense",
    eco: "B10",
    moves: ["e4", "c6"],
    description: "Solid defense leading to symmetric pawn structure"
  },
  {
    name: "Scotch Game",
    eco: "C45",
    moves: ["e4", "e5", "Nf3", "Nc6", "d4"],
    description: "Aggressive opening with early central pawn break"
  },

  // Queen's Pawn Openings (1. d4)
  {
    name: "Queen's Gambit",
    eco: "D06",
    moves: ["d4", "d5", "c4"],
    description: "Classic gambit offering a pawn for center control"
  },
  {
    name: "King's Indian Defense",
    eco: "E60",
    moves: ["d4", "Nf6", "c4", "g6"],
    description: "Hypermodern defense with fianchetto setup"
  },
  {
    name: "Nimzo-Indian Defense",
    eco: "E20",
    moves: ["d4", "Nf6", "c4", "e6", "Nc3", "Bb4"],
    description: "Strategic opening pinning white's knight"
  },
  {
    name: "Slav Defense",
    eco: "D10",
    moves: ["d4", "d5", "c4", "c6"],
    description: "Solid defense supporting the center"
  },
  {
    name: "London System",
    eco: "D02",
    moves: ["d4", "d5", "Nf3", "Nf6", "Bf4"],
    description: "Flexible system for white"
  },

  // Other Openings
  {
    name: "English Opening",
    eco: "A10",
    moves: ["c4"],
    description: "Flexible hypermodern opening"
  },
  {
    name: "Reti Opening",
    eco: "A09",
    moves: ["Nf3", "d5", "c4"],
    description: "Hypermodern opening with knight development"
  },
  {
    name: "Four Knights Game",
    eco: "C47",
    moves: ["e4", "e5", "Nf3", "Nc6", "Nc3", "Nf6"],
    description: "Symmetric development of all knights"
  },
  {
    name: "Pirc Defense",
    eco: "B07",
    moves: ["e4", "d6", "d4", "Nf6", "Nc3", "g6"],
    description: "Hypermodern defense with fianchetto"
  },
  {
    name: "Alekhine's Defense",
    eco: "B02",
    moves: ["e4", "Nf6"],
    description: "Provocative defense inviting white to advance"
  }
];

/**
 * Get matching opening based on current moves
 */
export function getMatchingOpening(moves: string[]): Opening | null {
  if (moves.length === 0) return null;

  // Find openings that match the current move sequence
  for (const opening of CHESS_OPENINGS) {
    if (movesMatchOpening(moves, opening.moves)) {
      return opening;
    }
  }

  return null;
}

/**
 * Check if current moves match an opening sequence
 */
function movesMatchOpening(currentMoves: string[], openingMoves: string[]): boolean {
  if (currentMoves.length > openingMoves.length) return false;

  for (let i = 0; i < currentMoves.length; i++) {
    if (normalizeMove(currentMoves[i]) !== normalizeMove(openingMoves[i])) {
      return false;
    }
  }

  return true;
}

/**
 * Normalize move notation for comparison
 */
function normalizeMove(move: string): string {
  // Remove check/checkmate symbols
  return move.replace(/[+#]/g, '').trim();
}

/**
 * Get next move from opening book
 */
export function getOpeningMove(moves: string[]): string | null {
  const matching = getMatchingOpening(moves);

  if (!matching) return null;

  // Check if there's a next move in the opening
  if (moves.length < matching.moves.length) {
    return matching.moves[moves.length];
  }

  return null;
}

/**
 * Get opening name if current position matches
 */
export function getOpeningName(moves: string[]): string | null {
  const matching = getMatchingOpening(moves);
  return matching ? `${matching.name} (${matching.eco})` : null;
}

/**
 * Enhanced position evaluation with opening knowledge
 */
export function evaluateOpeningPosition(moves: string[]): number {
  const opening = getMatchingOpening(moves);

  if (!opening) return 0;

  // Bonus for following known opening theory
  const progressBonus = (moves.length / opening.moves.length) * 0.5;

  return progressBonus;
}

/**
 * Get random opening for AI to play
 */
export function getRandomOpening(): Opening {
  return CHESS_OPENINGS[Math.floor(Math.random() * CHESS_OPENINGS.length)];
}

/**
 * Get all available openings
 */
export function getAllOpenings(): Opening[] {
  return [...CHESS_OPENINGS];
}
