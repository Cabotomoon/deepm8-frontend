/**
 * WebSocket Service for Real-time Multiplayer Chess
 *
 * Features:
 * - MATCHMAKING: Automatic opponent pairing by ELO
 * - Real-time move synchronization
 * - Player presence tracking
 * - Chat messaging
 * - Auto-reconnection
 */

import { io, Socket } from 'socket.io-client';
import type { Player, Room, Move, ChatMessage } from '../types/socket.types';

// Re-export types for convenience
export type { Player, Room, Move, ChatMessage };

// Socket.IO server URL (deploy your own or use SeaVerse infrastructure)
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

class SocketService {
  private socket: Socket | null = null;
  private currentMatchId: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  /**
   * Initialize socket connection
   */
  connect(userId: string, userName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // If already connected with the same credentials, resolve immediately
        if (this.socket?.connected) {
          console.log('⚠️ Already connected with socket:', this.socket.id);
          resolve();
          return;
        }

        // Disconnect existing socket if any
        if (this.socket) {
          console.log('🔌 Disconnecting old socket before reconnecting');
          this.socket.disconnect();
          this.socket = null;
        }

        console.log('🔌 Creating new socket connection for:', userName);
        this.socket = io(SOCKET_URL, {
          auth: { userId, userName },
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          reconnectionAttempts: this.maxReconnectAttempts,
        });

        this.socket.on('connect', () => {
          console.log('✅ Socket connected:', this.socket?.id);
          this.reconnectAttempts = 0;
          resolve();
        });

        this.socket.on('connect_error', (error) => {
          console.error('❌ Socket connection error:', error);
          this.reconnectAttempts++;

          if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            reject(new Error('Failed to connect to multiplayer server'));
          }
        });

        this.socket.on('disconnect', (reason) => {
          console.warn('⚠️ Socket disconnected:', reason);

          if (reason === 'io server disconnect') {
            this.socket?.connect();
          }
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Disconnect socket
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.currentMatchId = null;
    }
  }

  /**
   * Join matchmaking queue (automatic pairing by ELO and time control)
   */
  findMatch(playerElo: number, timeControl: 'bullet' | 'blitz' | 'rapid' | 'classical'): Promise<Room | null> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.socket.emit('find-match', { playerElo, timeControl }, (response: { success: boolean; match?: Room; error?: string }) => {
        if (response.success) {
          // Match found immediately
          if (response.match) {
            this.currentMatchId = response.match.id;
            resolve(response.match);
          } else {
            // Added to queue, waiting for opponent
            resolve(null);
          }
        } else {
          reject(new Error(response.error || 'Failed to find match'));
        }
      });
    });
  }

  /**
   * Cancel matchmaking search
   */
  cancelMatchmaking(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.socket.emit('cancel-matchmaking', (response: { success: boolean; error?: string }) => {
        if (response.success) {
          resolve();
        } else {
          reject(new Error(response.error || 'Failed to cancel matchmaking'));
        }
      });
    });
  }

  /**
   * Leave current match
   */
  leaveMatch(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.currentMatchId) {
        reject(new Error('Not in a match'));
        return;
      }

      this.socket.emit('leave-match', { matchId: this.currentMatchId }, (response: { success: boolean; error?: string }) => {
        if (response.success) {
          this.currentMatchId = null;
          resolve();
        } else {
          reject(new Error(response.error || 'Failed to leave match'));
        }
      });
    });
  }

  /**
   * Send a chess move
   */
  sendMove(move: Move): void {
    if (!this.socket || !this.currentMatchId) {
      console.error('❌ Cannot send move: not in a match');
      console.error('   Socket connected:', this.socket?.connected);
      console.error('   Current matchId:', this.currentMatchId);
      return;
    }

    console.log('📤 Sending move to matchId:', this.currentMatchId, 'Move:', move.notation);
    this.socket.emit('chess-move', {
      matchId: this.currentMatchId,
      move,
    });
  }

  /**
   * Send a chat message
   */
  sendChatMessage(message: string): void {
    if (!this.socket || !this.currentMatchId) {
      console.error('Cannot send message: not in a match');
      return;
    }

    this.socket.emit('chat-message', {
      matchId: this.currentMatchId,
      message,
    });
  }

  /**
   * Send game end notification
   */
  sendGameEnd(winner: 'white' | 'black' | 'draw', reason: string): void {
    if (!this.socket || !this.currentMatchId) {
      console.error('Cannot send game-end: not in a match');
      return;
    }

    console.log('📡 Sending game-end event:', { winner, reason, matchId: this.currentMatchId });
    this.socket.emit('game-end', {
      matchId: this.currentMatchId,
      winner,
      reason,
    });
  }

  /**
   * Listen for chess moves from opponent
   */
  onMove(callback: (move: Move) => void): void {
    if (!this.socket) return;

    // Wrapper to add logging
    this.socket.on('chess-move', (move: Move) => {
      console.log('🔵 [SocketService] chess-move event received:', move);
      callback(move);
    });
  }

  /**
   * Listen for chat messages
   */
  onChatMessage(callback: (message: ChatMessage) => void): void {
    if (!this.socket) return;
    this.socket.on('chat-message', callback);
  }

  /**
   * Listen for match found event
   */
  onMatchFound(callback: (match: Room) => void): void {
    if (!this.socket) return;

    // Wrapper to auto-save matchId
    this.socket.on('match-found', (match: Room) => {
      console.log('🎯 [SocketService] Match found, saving matchId:', match.id);
      this.currentMatchId = match.id;
      callback(match);
    });
  }

  /**
   * Listen for matchmaking progress
   */
  onMatchmakingProgress(callback: (data: { playersInQueue: number; estimatedTime: number }) => void): void {
    if (!this.socket) return;
    this.socket.on('matchmaking-progress', callback);
  }

  /**
   * Listen for game start event
   */
  onGameStart(callback: (match: Room) => void): void {
    if (!this.socket) return;

    // Wrapper to auto-save matchId
    this.socket.on('game-start', (match: Room) => {
      console.log('🎮 [SocketService] Game started, confirming matchId:', match.id);
      this.currentMatchId = match.id;
      callback(match);
    });
  }

  /**
   * Listen for game end event
   */
  onGameEnd(callback: (result: { winner: 'white' | 'black' | 'draw'; reason: string }) => void): void {
    if (!this.socket) return;

    // Wrapper to add logging
    this.socket.on('game-end', (result: { winner: 'white' | 'black' | 'draw'; reason: string }) => {
      console.log('🏁 [SocketService] game-end event received:', result);
      callback(result);
    });
  }

  /**
   * Listen for opponent reconnection
   */
  onOpponentReconnected(callback: () => void): void {
    if (!this.socket) return;
    this.socket.on('opponent-reconnected', callback);
  }

  /**
   * Listen for opponent disconnection
   */
  onOpponentDisconnected(callback: () => void): void {
    if (!this.socket) return;
    this.socket.on('opponent-disconnected', callback);
  }

  /**
   * Listen for my own reconnection (when I come back after disconnecting)
   */
  onReconnect(callback: () => void): void {
    if (!this.socket) return;
    this.socket.on('connect', callback);
  }

  /**
   * Listen for my own disconnection (when I lose connection)
   */
  onDisconnect(callback: () => void): void {
    if (!this.socket) return;
    this.socket.on('disconnect', callback);
  }

  /**
   * Remove all event listeners
   */
  removeAllListeners(): void {
    if (!this.socket) return;
    this.socket.removeAllListeners();
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Get current socket ID
   */
  getSocketId(): string | undefined {
    return this.socket?.id;
  }

  /**
   * Get current match ID
   */
  getCurrentMatch(): string | null {
    return this.currentMatchId;
  }
}

// Singleton instance
export const socketService = new SocketService();
