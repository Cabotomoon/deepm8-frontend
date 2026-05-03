/**
 * Mock Socket Service for Local Development
 *
 * Simulates all server-side logic for disconnection/reconnection testing
 * without requiring a real backend server.
 *
 * Usage:
 * 1. Replace `socketService` imports with `mockSocketService`
 * 2. Test disconnection scenarios locally
 * 3. Verify victory/defeat screens appear correctly
 */

import type { Player, Room, Move, ChatMessage } from '../types/socket.types';

type EventCallback = (...args: any[]) => void;

interface MockGame {
  id: string;
  players: Player[];
  status: 'waiting' | 'playing' | 'ended';
  winner?: 'white' | 'black' | 'draw';
  endReason?: 'checkmate' | 'timeout' | 'resignation' | 'abandonment' | 'stalemate';
  disconnectionTimer?: NodeJS.Timeout | null;
  disconnectedPlayerId?: string | null;
  pendingResults?: Map<string, { winner: 'white' | 'black' | 'draw'; reason: string }>;
}

class MockSocketService {
  private eventListeners: Map<string, EventCallback[]> = new Map();
  private connected: boolean = false;
  private socketId: string = `mock-socket-${Math.random().toString(36).substr(2, 9)}`;
  private currentUserId: string | null = null;
  private currentUserName: string | null = null;
  private currentMatchId: string | null = null;

  // Mock game state
  private mockGame: MockGame | null = null;
  private myPlayerIndex: number = 0;

  /**
   * Simulate socket connection
   */
  connect(userId: string, userName: string): Promise<void> {
    return new Promise((resolve) => {
      console.log('🧪 [MOCK] Connecting to mock server...', { userId, userName });

      this.currentUserId = userId;
      this.currentUserName = userName;
      this.connected = true;
      this.socketId = `mock-socket-${userId}`;

      // Emit connect event
      setTimeout(() => {
        this.emit('connect');
        console.log('✅ [MOCK] Connected with socket ID:', this.socketId);

        // Check for pending game results (simulates server sending game-end on reconnect)
        this.checkPendingGameResults();

        resolve();
      }, 500);
    });
  }

  /**
   * Check if there are pending game results for this user
   * (Simulates server-side logic for sending game-end to reconnecting players)
   */
  private checkPendingGameResults(): void {
    if (!this.mockGame || !this.mockGame.pendingResults || !this.currentUserId) return;

    const pendingResult = this.mockGame.pendingResults.get(this.currentUserId);

    if (pendingResult) {
      console.log('🎯 [MOCK] Found pending game result for user:', this.currentUserId, pendingResult);

      // Simulate server sending game-end event
      setTimeout(() => {
        console.log('📡 [MOCK] Sending pending game-end event:', pendingResult);
        this.emit('game-end', pendingResult);

        // Clear pending result
        this.mockGame?.pendingResults?.delete(this.currentUserId!);
      }, 1000);
    }
  }

  /**
   * Disconnect from mock server
   */
  disconnect(): void {
    console.log('🔌 [MOCK] Disconnecting...');
    this.connected = false;
    this.currentMatchId = null;
    this.emit('disconnect', 'client disconnect');
  }

  /**
   * Find a match (simulates matchmaking)
   */
  findMatch(playerElo: number, timeControl: string): Promise<Room | null> {
    return new Promise((resolve) => {
      console.log('🎯 [MOCK] Finding match...', { playerElo, timeControl });

      setTimeout(() => {
        // Create mock room with 2 players
        const matchId = `mock-match-${Date.now()}`;

        const mockRoom: Room = {
          id: matchId,
          players: [
            {
              id: this.socketId,
              name: this.currentUserName || 'You',
              elo: playerElo,
              color: 'white'
            },
            {
              id: `mock-opponent-${Math.random().toString(36).substr(2, 9)}`,
              name: 'Mock Opponent',
              elo: playerElo + Math.floor(Math.random() * 100) - 50,
              color: 'black'
            }
          ],
          timeControl: timeControl as any,
          status: 'playing'
        };

        this.currentMatchId = matchId;
        this.mockGame = {
          id: matchId,
          players: mockRoom.players,
          status: 'playing',
          pendingResults: new Map()
        };

        console.log('✅ [MOCK] Match found:', mockRoom);
        resolve(mockRoom);
      }, 1000);
    });
  }

  /**
   * Cancel matchmaking
   */
  cancelMatchmaking(): Promise<void> {
    return Promise.resolve();
  }

  /**
   * Leave current match
   */
  leaveMatch(): Promise<void> {
    console.log('🚪 [MOCK] Leaving match...');
    this.currentMatchId = null;
    this.mockGame = null;
    return Promise.resolve();
  }

  /**
   * Send a chess move
   */
  sendMove(move: Move): void {
    console.log('📤 [MOCK] Sending move:', move.notation);

    // Simulate opponent receiving the move
    setTimeout(() => {
      // (In real app, this would be handled by server broadcasting to opponent)
    }, 100);
  }

  /**
   * Send chat message
   */
  sendChatMessage(message: string): void {
    console.log('💬 [MOCK] Sending chat:', message);

    // Simulate opponent receiving message
    setTimeout(() => {
      const mockMessage: ChatMessage = {
        playerId: this.socketId,
        playerName: this.currentUserName || 'You',
        message,
        timestamp: Date.now()
      };

      // Echo back (in real app, server would broadcast to opponent)
      this.emit('chat-message', mockMessage);
    }, 200);
  }

  /**
   * Send game end notification
   */
  sendGameEnd(winner: 'white' | 'black' | 'draw', reason: string): void {
    console.log('📡 [MOCK] Sending game-end:', { winner, reason });

    if (!this.mockGame) return;

    // Update game state
    this.mockGame.status = 'ended';
    this.mockGame.winner = winner;
    this.mockGame.endReason = reason as any;

    // Clear disconnection timer if active
    if (this.mockGame.disconnectionTimer) {
      clearTimeout(this.mockGame.disconnectionTimer);
      this.mockGame.disconnectionTimer = null;
    }

    // Simulate server broadcasting game-end to both players
    setTimeout(() => {
      this.emit('game-end', { winner, reason });
    }, 500);
  }

  /**
   * 🧪 SIMULATE OPPONENT DISCONNECTION
   * Call this to test the disconnection flow
   */
  simulateOpponentDisconnect(): void {
    console.log('🧪 [MOCK] Simulating opponent disconnection...');

    if (!this.mockGame) {
      console.warn('⚠️ [MOCK] No active game to disconnect from');
      return;
    }

    // Emit opponent-disconnected event
    this.emit('opponent-disconnected');

    // Start 30-second abandonment timer (simulates server-side logic)
    this.mockGame.disconnectionTimer = setTimeout(() => {
      console.log('⏰ [MOCK] Disconnection timer expired - opponent abandoned');

      if (!this.mockGame) return;

      // Determine winner (I win because opponent disconnected)
      const myPlayer = this.mockGame.players.find(p => p.id === this.socketId);
      const winner = myPlayer?.color || 'white';

      // Mark game as ended
      this.mockGame.status = 'ended';
      this.mockGame.winner = winner;
      this.mockGame.endReason = 'abandonment';

      // Send game-end to ME (the connected player)
      console.log('📡 [MOCK] Sending game-end to connected player (YOU):', { winner, reason: 'abandonment' });
      this.emit('game-end', { winner, reason: 'abandonment' });

      // Store pending result for disconnected opponent (for when they reconnect)
      const opponentPlayer = this.mockGame.players.find(p => p.id !== this.socketId);
      if (opponentPlayer) {
        const opponentUserId = opponentPlayer.id; // In real app, this would be userId not socketId
        const opponentColor = opponentPlayer.color === 'white' ? 'black' : 'white';

        console.log('💾 [MOCK] Storing pending result for opponent:', {
          opponentUserId,
          winner,
          reason: 'abandonment'
        });

        this.mockGame.pendingResults?.set(opponentUserId, {
          winner,
          reason: 'abandonment'
        });
      }

    }, 30000); // 30 seconds
  }

  /**
   * 🧪 SIMULATE OPPONENT RECONNECTION (before timer expires)
   */
  simulateOpponentReconnect(): void {
    console.log('🧪 [MOCK] Simulating opponent reconnection...');

    if (!this.mockGame) {
      console.warn('⚠️ [MOCK] No active game');
      return;
    }

    // Clear disconnection timer
    if (this.mockGame.disconnectionTimer) {
      clearTimeout(this.mockGame.disconnectionTimer);
      this.mockGame.disconnectionTimer = null;
      console.log('✅ [MOCK] Disconnection timer cleared');
    }

    // Emit opponent-reconnected event
    this.emit('opponent-reconnected');
  }

  /**
   * 🧪 SIMULATE MY DISCONNECTION (lose by abandonment)
   * This will cause ME to see the defeat screen when I reconnect
   */
  simulateMyDisconnect(): void {
    console.log('🧪 [MOCK] Simulating MY disconnection...');

    if (!this.mockGame) {
      console.warn('⚠️ [MOCK] No active game');
      return;
    }

    // Disconnect from server
    this.connected = false;
    this.emit('disconnect', 'simulated disconnect');

    // Simulate server-side: After 30s, mark game as ended
    setTimeout(() => {
      if (!this.mockGame || !this.currentUserId) return;

      // Determine winner (opponent wins because I disconnected)
      const myPlayer = this.mockGame.players.find(p => p.id === this.socketId);
      const opponentPlayer = this.mockGame.players.find(p => p.id !== this.socketId);
      const winner = opponentPlayer?.color || 'black';

      console.log('⏰ [MOCK] I abandoned the game - opponent wins');

      // Store pending result for ME (for when I reconnect)
      this.mockGame.pendingResults?.set(this.currentUserId, {
        winner,
        reason: 'abandonment'
      });

      console.log('💾 [MOCK] Stored pending defeat for me:', {
        userId: this.currentUserId,
        winner,
        reason: 'abandonment'
      });

    }, 30000); // 30 seconds
  }

  /**
   * Listen for events
   */
  on(event: string, callback: EventCallback): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  /**
   * Emit events to listeners
   */
  private emit(event: string, ...args: any[]): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(...args));
    }
  }

  /**
   * Wrapper methods for event listeners (matching real socketService API)
   */
  onMove(callback: (move: Move) => void): void {
    this.on('chess-move', callback);
  }

  onChatMessage(callback: (message: ChatMessage) => void): void {
    this.on('chat-message', callback);
  }

  onMatchFound(callback: (match: Room) => void): void {
    this.on('match-found', callback);
  }

  onMatchmakingProgress(callback: (data: { playersInQueue: number; estimatedTime: number }) => void): void {
    this.on('matchmaking-progress', callback);
  }

  onGameStart(callback: (match: Room) => void): void {
    this.on('game-start', callback);
  }

  onGameEnd(callback: (result: { winner: 'white' | 'black' | 'draw'; reason: string }) => void): void {
    this.on('game-end', callback);
  }

  onOpponentReconnected(callback: () => void): void {
    this.on('opponent-reconnected', callback);
  }

  onOpponentDisconnected(callback: () => void): void {
    this.on('opponent-disconnected', callback);
  }

  onReconnect(callback: () => void): void {
    this.on('connect', callback);
  }

  removeAllListeners(): void {
    this.eventListeners.clear();
  }

  isConnected(): boolean {
    return this.connected;
  }

  getSocketId(): string | undefined {
    return this.socketId;
  }

  getCurrentMatch(): string | null {
    return this.currentMatchId;
  }
}

// Singleton instance
export const mockSocketService = new MockSocketService();
