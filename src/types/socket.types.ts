/**
 * Shared types for Socket.IO multiplayer
 */

export interface Player {
  id: string;
  name: string;
  elo: number;
  color: 'white' | 'black';
  connected: boolean;
}

export interface Room {
  id: string;
  name: string;
  timeControl?: 'bullet' | 'blitz' | 'rapid' | 'classical';
  players: Player[];
  status: 'waiting' | 'playing' | 'finished';
  createdAt: number;
}

export interface Move {
  from: { row: number; col: number };
  to: { row: number; col: number };
  notation: string;
  timestamp: number;
}

export interface ChatMessage {
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
}
