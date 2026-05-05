/**
 * Stockfish Chess Engine Service
 * Browser-compatible version using Stockfish.js Web Worker
 */

type Difficulty = 'beginner' | 'intermediate' | 'advanced' | 'master' | 'grandmaster';

interface StockfishConfig {
  depth: number;
  moveTime: number; // milliseconds
  skillLevel: number; // 0-20
}

// Difficulty configurations - Calibrated to match real chess ELO ratings
// Skill Level (0-20) controls how often Stockfish makes mistakes
// Depth controls how deep the search tree goes
// MoveTime is a timeout to prevent long waits
const DIFFICULTY_CONFIGS: Record<Difficulty, StockfishConfig> = {
  beginner: { depth: 2, moveTime: 100, skillLevel: 1 },      // ~800 ELO - Makes frequent mistakes
  intermediate: { depth: 6, moveTime: 500, skillLevel: 5 },  // ~1400 ELO - Club player
  advanced: { depth: 10, moveTime: 1000, skillLevel: 10 },   // ~1800 ELO - Strong club player
  master: { depth: 14, moveTime: 2000, skillLevel: 15 },     // ~2200 ELO - Master level
  grandmaster: { depth: 18, moveTime: 5000, skillLevel: 20 } // ~2600 ELO - GM level (near perfect)
};

class StockfishEngine {
  private worker: Worker | null = null;
  private isReady: boolean = false;
  private messageQueue: Array<(message: string) => void> = [];

  /**
   * Initialize Stockfish engine using Web Worker
   */
  async init(): Promise<void> {
    if (this.worker) {
      console.log('♟️ Stockfish already initialized');
      return;
    }

    console.log('♟️ Initializing Stockfish Web Worker...');

    return new Promise((resolve, reject) => {
      try {
        // Use local stockfish.js (CORS-safe)
        this.worker = new Worker('/stockfish/stockfish.js');

        this.worker.onmessage = (event) => {
          const message = event.data;
          console.log('📥 Stockfish:', message);

          if (message === 'uciok') {
            console.log('✅ Stockfish UCI ready');
            this.sendCommand('isready');
          }

          if (message === 'readyok') {
            console.log('✅ Stockfish engine ready');
            this.isReady = true;
            resolve();
          }

          // Dispatch to message handlers
          this.messageQueue.forEach(handler => handler(message));
        };

        this.worker.onerror = (error) => {
          console.error('❌ Stockfish worker error:', error);
          reject(error);
        };

        // Initialize UCI protocol
        this.sendCommand('uci');

        // Timeout fallback
        setTimeout(() => {
          if (!this.isReady) {
            reject(new Error('Stockfish initialization timeout'));
          }
        }, 10000);

      } catch (error) {
        console.error('❌ Failed to initialize Stockfish:', error);
        reject(error);
      }
    });
  }

  /**
   * Send command to Stockfish engine
   */
  private sendCommand(command: string): void {
    if (!this.worker) {
      console.error('❌ Worker not initialized');
      return;
    }

    console.log('📤 Stockfish command:', command);
    this.worker.postMessage(command);
  }

  /**
   * Wait for Stockfish to be ready
   */
  private async waitForReady(): Promise<void> {
    if (this.isReady) return;

    return new Promise((resolve) => {
      const checkReady = setInterval(() => {
        if (this.isReady) {
          clearInterval(checkReady);
          resolve();
        }
      }, 100);

      setTimeout(() => {
        clearInterval(checkReady);
        resolve();
      }, 10000);
    });
  }

  /**
   * Get best move from current position
   */
  async getBestMove(fen: string, difficulty: Difficulty = 'intermediate'): Promise<string | null> {
    if (!this.worker) {
      await this.init();
    }

    await this.waitForReady();

    // Validate FEN string
    if (!fen || fen.trim().length === 0) {
      console.error('❌ Invalid FEN: empty string');
      return null;
    }

    const fenParts = fen.split(' ');
    if (fenParts.length < 4) {
      console.error('❌ Invalid FEN: missing parts', fen);
      return null;
    }

    const config = DIFFICULTY_CONFIGS[difficulty];

    console.log('🎯 Calculating best move for FEN:', fen);
    console.log('⚙️ Config:', config);

    return new Promise((resolve) => {
      let bestMove: string | null = null;
      let resolved = false;

      const messageHandler = (message: string) => {
        // Parse "bestmove e2e4" response
        if (message.startsWith('bestmove') && !resolved) {
          const parts = message.split(' ');
          bestMove = parts[1];

          // Remove handler
          const index = this.messageQueue.indexOf(messageHandler);
          if (index > -1) {
            this.messageQueue.splice(index, 1);
          }

          console.log('🎯 Stockfish best move:', bestMove);
          resolved = true;
          resolve(bestMove);
        }
      };

      // Register message handler
      this.messageQueue.push(messageHandler);

      // Set skill level
      this.sendCommand(`setoption name Skill Level value ${config.skillLevel}`);

      // Set position
      this.sendCommand(`position fen ${fen}`);

      // Calculate best move
      this.sendCommand(`go depth ${config.depth} movetime ${config.moveTime}`);

      console.log('⏳ Waiting for Stockfish to calculate best move...');

      // Timeout fallback - INCREASED to 10 seconds minimum
      const timeoutMs = Math.max(config.moveTime + 5000, 10000);
      setTimeout(() => {
        if (!resolved) {
          const index = this.messageQueue.indexOf(messageHandler);
          if (index > -1) {
            this.messageQueue.splice(index, 1);
          }
          console.warn(`⚠️ Stockfish timeout after ${timeoutMs}ms, returning null`);
          console.warn('📋 Last FEN:', fen);
          console.warn('📋 Difficulty:', difficulty);
          resolved = true;
          resolve(null);
        }
      }, timeoutMs);
    });
  }

  /**
   * Analyze a move and get evaluation
   */
  async analyzeMove(fen: string, move: string, depth: number = 15): Promise<{
    evaluation: number; // in centipawns (100 = 1 pawn advantage)
    bestMove: string;
    variation: string[];
  } | null> {
    if (!this.worker) {
      await this.init();
    }

    await this.waitForReady();

    return new Promise((resolve) => {
      let evaluation: number | null = null;
      let bestMove: string | null = null;
      let resolved = false;

      const messageHandler = (message: string) => {
        // Parse evaluation from "info depth X score cp Y" or "info depth X score mate Y"
        if (message.includes('score cp')) {
          const match = message.match(/score cp (-?\d+)/);
          if (match) {
            evaluation = parseInt(match[1]);
          }
        } else if (message.includes('score mate')) {
          const match = message.match(/score mate (-?\d+)/);
          if (match) {
            const mateIn = parseInt(match[1]);
            evaluation = mateIn > 0 ? 100000 : -100000; // Mate scores
          }
        }

        // Parse best move
        if (message.startsWith('bestmove') && !resolved) {
          const parts = message.split(' ');
          bestMove = parts[1];

          const index = this.messageQueue.indexOf(messageHandler);
          if (index > -1) {
            this.messageQueue.splice(index, 1);
          }

          resolved = true;
          resolve(evaluation !== null && bestMove ? {
            evaluation,
            bestMove,
            variation: [bestMove] // Simplified - could extract PV line
          } : null);
        }
      };

      this.messageQueue.push(messageHandler);

      // Set max skill level for accurate analysis
      this.sendCommand('setoption name Skill Level value 20');

      // Set position
      this.sendCommand(`position fen ${fen}`);

      // Analyze
      this.sendCommand(`go depth ${depth}`);

      // Timeout
      setTimeout(() => {
        if (!resolved) {
          const index = this.messageQueue.indexOf(messageHandler);
          if (index > -1) {
            this.messageQueue.splice(index, 1);
          }
          resolved = true;
          resolve(null);
        }
      }, 10000);
    });
  }

  /**
   * Convert UCI move notation (e2e4) to position format
   */
  parseUCIMove(uciMove: string): { from: { row: number; col: number }; to: { row: number; col: number } } | null {
    if (!uciMove || uciMove.length < 4) return null;

    const fromSquare = uciMove.substring(0, 2);
    const toSquare = uciMove.substring(2, 4);

    const parseSquare = (square: string): { row: number; col: number } | null => {
      const file = square.charCodeAt(0) - 'a'.charCodeAt(0); // a=0, b=1, ..., h=7
      const rank = parseInt(square[1]) - 1; // 1=0, 2=1, ..., 8=7

      if (file < 0 || file > 7 || rank < 0 || rank > 7) return null;

      // Convert to board coordinates (row 0 = rank 8)
      return { row: 7 - rank, col: file };
    };

    const from = parseSquare(fromSquare);
    const to = parseSquare(toSquare);

    if (!from || !to) return null;

    return { from, to };
  }

  /**
   * Convert position format to UCI notation
   */
  toUCIMove(from: { row: number; col: number }, to: { row: number; col: number }): string {
    const files = 'abcdefgh';
    const fromFile = files[from.col];
    const fromRank = 8 - from.row;
    const toFile = files[to.col];
    const toRank = 8 - to.row;

    return `${fromFile}${fromRank}${toFile}${toRank}`;
  }

  /**
   * Terminate Stockfish engine
   */
  terminate(): void {
    if (this.worker) {
      console.log('🛑 Terminating Stockfish worker');
      this.worker.terminate();
      this.worker = null;
      this.isReady = false;
      this.messageQueue = [];
    }
  }
}

// Singleton instance
const stockfish = new StockfishEngine();

export default stockfish;
export { DIFFICULTY_CONFIGS };
export type { Difficulty, StockfishConfig };
