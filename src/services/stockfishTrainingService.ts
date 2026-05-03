/**
 * Stockfish Training Service
 * Advanced chess engine integration for DeepM8 Personal Trainer
 * Uses Web Worker for non-blocking analysis
 *
 * NOTE: Stockfish engine currently disabled due to browser compatibility
 * Using fallback training mode with pre-generated puzzles
 */

export interface StockfishMove {
  move: string;
  score: number; // centipawns
  mate?: number; // mate in N moves
}

export interface PositionEvaluation {
  score: number;
  mate?: number;
  bestMove: string;
  topMoves: StockfishMove[];
}

class StockfishTrainingService {
  private stockfish: any = null; // stockfish.js returns a worker-like object
  private isReady = false;
  private pendingCommands: Array<{ command: string; resolve: (value: string) => void }> = [];
  private commandResolvers: Map<string, (value: string) => void> = new Map();

  constructor() {
    this.initStockfish();
  }

  /**
   * Initialize Stockfish Web Worker
   */
  private initStockfish() {
    try {
      // Stockfish integration is currently disabled due to browser compatibility
      // Using fallback training mode with pre-generated puzzles
      console.log('ℹ️ Stockfish engine disabled - using fallback training mode');
      this.isReady = false;
      this.stockfish = null;

      // Mark as "ready" so the app doesn't hang waiting for it
      setTimeout(() => {
        this.isReady = true;
        console.log('✅ Fallback training mode initialized');
      }, 100);

      return;

      /* Original Stockfish initialization (kept for future use)
      // Use local stockfish.js package
      this.stockfish = STOCKFISH();

      this.stockfish.onmessage = (event) => {
        const message = typeof event === 'string' ? event : event.data;
        console.log('🤖 Stockfish:', message);

        if (message === 'uciok') {
          this.isReady = true;
          console.log('✅ Stockfish initialized');
          this.processPendingCommands();
        }

        // Handle best move responses
        if (message.startsWith('bestmove')) {
          const parts = message.split(' ');
          const bestMove = parts[1];
          const resolver = this.commandResolvers.get('bestmove');
          if (resolver) {
            resolver(bestMove);
            this.commandResolvers.delete('bestmove');
          }
        }

        // Handle evaluation responses
        if (message.includes('score cp') || message.includes('score mate')) {
          const resolver = this.commandResolvers.get('evaluation');
          if (resolver) {
            resolver(message);
          }
        }
      };

      // Initialize UCI
      this.sendCommand('uci');
      this.sendCommand('setoption name MultiPV value 3');
      */
    } catch (error) {
      console.error('❌ Error initializing Stockfish:', error);
      this.isReady = true; // Mark as ready to not block the app
    }
  }

  /**
   * Send command to Stockfish
   */
  private sendCommand(command: string) {
    if (this.stockfish && this.isReady) {
      console.log('📤 Sending to Stockfish:', command);
      this.stockfish.postMessage(command);
    } else {
      this.pendingCommands.push({
        command,
        resolve: () => {}
      });
    }
  }

  /**
   * Process pending commands after initialization
   */
  private processPendingCommands() {
    while (this.pendingCommands.length > 0) {
      const { command } = this.pendingCommands.shift()!;
      this.sendCommand(command);
    }
  }

  /**
   * Get best move for a position
   */
  async getBestMove(fen: string, depth = 15): Promise<string> {
    return new Promise((resolve) => {
      this.commandResolvers.set('bestmove', resolve);
      this.sendCommand(`position fen ${fen}`);
      this.sendCommand(`go depth ${depth}`);
    });
  }

  /**
   * Evaluate a position
   */
  async evaluatePosition(fen: string, depth = 15): Promise<PositionEvaluation> {
    return new Promise((resolve) => {
      const topMoves: StockfishMove[] = [];

      this.commandResolvers.set('evaluation', (message: string) => {
        // Parse evaluation info
        const scoreMatch = message.match(/score (cp|mate) (-?\d+)/);
        const moveMatch = message.match(/pv (\w+)/);

        if (scoreMatch && moveMatch) {
          const scoreType = scoreMatch[1];
          const scoreValue = parseInt(scoreMatch[2]);
          const move = moveMatch[1];

          if (scoreType === 'cp') {
            topMoves.push({ move, score: scoreValue });
          } else {
            topMoves.push({ move, score: 0, mate: scoreValue });
          }
        }

        // When we have enough moves, resolve
        if (message.includes('bestmove')) {
          const bestMove = message.split(' ')[1];
          const mainScore = topMoves[0]?.score || 0;
          const mainMate = topMoves[0]?.mate;

          resolve({
            score: mainScore,
            mate: mainMate,
            bestMove,
            topMoves: topMoves.slice(0, 3)
          });
        }
      });

      this.sendCommand(`position fen ${fen}`);
      this.sendCommand(`go depth ${depth}`);
    });
  }

  /**
   * Get top N moves for a position
   */
  async getTopMoves(fen: string, multipv = 3, depth = 15): Promise<StockfishMove[]> {
    const evaluation = await this.evaluatePosition(fen, depth);
    return evaluation.topMoves;
  }

  /**
   * Validate if a move is the best move
   */
  async isBestMove(fen: string, move: string, tolerance = 50): Promise<boolean> {
    const evaluation = await this.evaluatePosition(fen);

    // Check if the move is in top moves
    const moveScore = evaluation.topMoves.find(m => m.move === move)?.score;
    const bestScore = evaluation.topMoves[0]?.score || 0;

    if (moveScore === undefined) return false;

    // Allow tolerance (50 centipawns by default)
    return Math.abs(moveScore - bestScore) <= tolerance;
  }

  /**
   * Cleanup
   */
  destroy() {
    if (this.stockfish) {
      this.stockfish.terminate();
      this.stockfish = null;
    }
  }
}

export const stockfishTrainingService = new StockfishTrainingService();
