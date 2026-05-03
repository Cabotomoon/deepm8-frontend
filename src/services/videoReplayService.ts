/**
 * Video Replay Service
 * Generate animated video replays of chess games with highlights
 */

import { Chess } from 'chess.js';
import type { GameRecord } from './playerProfileService';

// Dynamic imports para FFmpeg
type FFmpeg = any;

interface ReplayOptions {
  includeHighlights?: boolean;
  speed?: 'slow' | 'normal' | 'fast'; // 2s, 1s, 0.5s per move
  quality?: 'draft' | 'standard' | 'high';
  includeAudio?: boolean;
}

interface GameHighlight {
  moveNumber: number;
  notation: string;
  type: 'brilliant' | 'blunder' | 'comeback';
  description: string;
}

class VideoReplayService {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private videoWidth = 1280;
  private videoHeight = 720;
  private maxFramesInMemory = 100;
  private ffmpeg: FFmpeg | null = null;
  private ffmpegLoaded = false;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.videoWidth;
    this.canvas.height = this.videoHeight;
    this.ctx = this.canvas.getContext('2d', {
      willReadFrequently: true,
      alpha: false
    })!;
  }

  /**
   * Load FFmpeg for MP4 conversion
   */
  private async loadFFmpeg(): Promise<void> {
    if (this.ffmpegLoaded) return;

    try {
      const { FFmpeg } = await import('@ffmpeg/ffmpeg');
      const { toBlobURL } = await import('@ffmpeg/util');

      this.ffmpeg = new FFmpeg();

      // Usar jsdelivr CDN que es más confiable
      const baseURL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd';

      await this.ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });

      this.ffmpegLoaded = true;
      console.log('✅ FFmpeg loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load FFmpeg:', error);
      throw new Error('No se pudo cargar el convertidor de video');
    }
  }

  /**
   * Generate video frames for a game replay
   * OPTIMIZED: Generates frames in batches to reduce memory usage
   */
  async generateReplayFrames(
    gameRecord: GameRecord,
    highlights: GameHighlight[],
    options: ReplayOptions = {}
  ): Promise<string[]> {
    // Validate that moves data exists
    if (!gameRecord.moves) {
      throw new Error('No se pueden generar frames de video: faltan las jugadas de la partida. El registro de la partida debe incluir el campo "moves" con la notación PGN.');
    }

    const {
      speed = 'normal',
      includeHighlights = true
    } = options;

    const frames: string[] = [];
    const movesPerSecond = speed === 'slow' ? 0.5 : speed === 'normal' ? 1 : 2;
    const framesPerMove = Math.floor(30 / movesPerSecond); // 30 fps

    // OPTIMIZACIÓN 1: Reducir frames de intro/outro
    const introFrame = await this.generateIntroFrame(gameRecord);
    for (let i = 0; i < 60; i++) { // Reducido de 90 a 60 frames (2 segundos)
      frames.push(introFrame);
    }

    // CRITICAL FIX: Use chess.js to properly reconstruct all board positions
    const chess = new Chess();
    const moves = this.parseMoves(gameRecord.moves);

    console.log(`🎬 Starting optimized video generation: ${moves.length} moves total`);

    // OPTIMIZACIÓN 2: Reducir frames por movimiento
    const optimizedFramesPerMove = Math.max(1, Math.floor(framesPerMove / 2)); // Reducir a la mitad

    for (let i = 0; i < moves.length; i++) {
      const move = moves[i];
      const highlight = highlights.find(h => h.moveNumber === i + 1);

      // Apply move using chess.js
      try {
        const moveResult = chess.move(move);
        if (!moveResult) {
          console.error(`❌ Move ${i + 1} (${move}) failed validation!`);
          continue;
        }
      } catch (error) {
        console.error(`❌ Error applying move ${i + 1} (${move}):`, error);
        continue;
      }

      // Get current board state from chess.js (AFTER applying move)
      const board = this.fenToBoard(chess.fen());

      // Check if this move is a highlight
      const isHighlight = includeHighlights && highlight;

      // Generate frame for this position
      const frame = await this.generateBoardFrame(
        board,
        i + 1,
        move,
        gameRecord,
        isHighlight ? highlight : undefined
      );

      // OPTIMIZACIÓN 3: Reducir cantidad de frames duplicados
      const frameCount = isHighlight ? optimizedFramesPerMove * 2 : optimizedFramesPerMove;
      for (let j = 0; j < frameCount; j++) {
        frames.push(frame);
      }

      // OPTIMIZACIÓN 4: Liberar memoria periódicamente
      if (i % 10 === 0 && frames.length > this.maxFramesInMemory) {
        // Forzar garbage collection sugerido
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    console.log(`✅ Video generation complete: ${frames.length} frames generated`);

    // Outro frame with final stats
    const outroFrame = await this.generateOutroFrame(gameRecord);
    for (let i = 0; i < 60; i++) { // Reducido de 120 a 60 frames (2 segundos)
      frames.push(outroFrame);
    }

    return frames;
  }

  /**
   * Generate intro frame
   */
  private async generateIntroFrame(gameRecord: GameRecord): Promise<string> {
    // Background gradient
    const gradient = this.ctx.createLinearGradient(0, 0, this.videoWidth, this.videoHeight);
    gradient.addColorStop(0, '#1e293b');
    gradient.addColorStop(1, '#0f172a');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.videoWidth, this.videoHeight);

    // Title
    this.ctx.font = 'bold 120px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    this.ctx.fillStyle = '#ffffff';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('♟️ Deep M8 Coach', this.videoWidth / 2, 300);

    // Subtitle
    this.ctx.font = 'bold 60px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    this.ctx.fillStyle = '#a78bfa';
    this.ctx.fillText('Replay de Partida', this.videoWidth / 2, 400);

    // Result
    const resultEmoji = gameRecord.result === 'win' ? '🏆' : gameRecord.result === 'loss' ? '💀' : '🤝';
    const resultText = gameRecord.result === 'win' ? 'Victoria' : gameRecord.result === 'loss' ? 'Derrota' : 'Tablas';
    const resultColor = gameRecord.result === 'win' ? '#10b981' : gameRecord.result === 'loss' ? '#ef4444' : '#6b7280';

    this.ctx.font = 'bold 80px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillText(resultEmoji, this.videoWidth / 2, 550);

    this.ctx.font = 'bold 60px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    this.ctx.fillStyle = resultColor;
    this.ctx.fillText(resultText, this.videoWidth / 2, 650);

    // Stats
    this.ctx.font = '40px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    this.ctx.fillStyle = '#94a3b8';
    this.ctx.fillText(
      `${gameRecord.accuracy}% Precisión • ${gameRecord.totalMoves} Movimientos`,
      this.videoWidth / 2,
      750
    );

    return this.canvas.toDataURL('image/jpeg', 0.85); // OPTIMIZACIÓN: JPEG con 85% calidad (menor tamaño)
  }

  /**
   * Generate board frame
   */
  private async generateBoardFrame(
    board: string[][],
    moveNumber: number,
    move: string,
    gameRecord: GameRecord,
    highlight?: GameHighlight
  ): Promise<string> {
    // Background
    const gradient = this.ctx.createLinearGradient(0, 0, this.videoWidth, this.videoHeight);
    gradient.addColorStop(0, '#1e293b');
    gradient.addColorStop(1, '#0f172a');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.videoWidth, this.videoHeight);

    // Board container (centered, optimized size)
    const boardSize = 600; // Reducido de 800 para menos detalle y menor memoria
    const boardX = (this.videoWidth - boardSize) / 2;
    const boardY = (this.videoHeight - boardSize) / 2;
    const squareSize = boardSize / 8;

    // Draw chess board
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const isLight = (row + col) % 2 === 0;
        this.ctx.fillStyle = isLight ? '#f0d9b5' : '#b58863';
        this.ctx.fillRect(
          boardX + col * squareSize,
          boardY + row * squareSize,
          squareSize,
          squareSize
        );

        // Draw piece
        const piece = board[row][col];
        if (piece) {
          this.ctx.font = `${squareSize * 0.8}px serif`;
          this.ctx.fillStyle = '#000000';
          this.ctx.textAlign = 'center';
          this.ctx.textBaseline = 'middle';
          this.ctx.fillText(
            this.getPieceSymbol(piece),
            boardX + col * squareSize + squareSize / 2,
            boardY + row * squareSize + squareSize / 2
          );
        }
      }
    }

    // Info panel on the right
    const panelX = boardX + boardSize + 50;
    const panelY = boardY;

    // Move number
    this.ctx.font = 'bold 48px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    this.ctx.fillStyle = '#ffffff';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`Jugada ${moveNumber}`, panelX, panelY + 50);

    // Move notation
    this.ctx.font = 'bold 72px monospace';
    this.ctx.fillStyle = '#a78bfa';
    this.ctx.fillText(move, panelX, panelY + 140);

    // Highlight badge
    if (highlight) {
      const emoji = highlight.type === 'brilliant' ? '🌟' : highlight.type === 'blunder' ? '💥' : '🔥';
      const label = highlight.type === 'brilliant' ? 'Brillante!' : highlight.type === 'blunder' ? 'Blunder' : 'Comeback!';
      const color = highlight.type === 'brilliant' ? '#10b981' : highlight.type === 'blunder' ? '#ef4444' : '#f59e0b';

      // Badge background
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      this.roundRect(this.ctx, panelX - 20, panelY + 200, 400, 100, 16);

      // Emoji
      this.ctx.font = '60px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      this.ctx.fillStyle = '#ffffff';
      this.ctx.textAlign = 'left';
      this.ctx.fillText(emoji, panelX, panelY + 260);

      // Label
      this.ctx.font = 'bold 48px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      this.ctx.fillStyle = color;
      this.ctx.fillText(label, panelX + 80, panelY + 260);

      // Description
      this.ctx.font = '32px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      this.ctx.fillStyle = '#94a3b8';
      this.wrapText(this.ctx, highlight.description, panelX, panelY + 330, 400, 40);
    }

    // Stats at bottom
    this.ctx.font = '36px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    this.ctx.fillStyle = '#64748b';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`Precisión: ${gameRecord.accuracy}%`, panelX, panelY + 500);
    this.ctx.fillText(`Excelentes: ${gameRecord.excellentMoves}`, panelX, panelY + 560);
    this.ctx.fillText(`Blunders: ${gameRecord.blunders}`, panelX, panelY + 620);

    // Branding
    this.ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    this.ctx.fillStyle = '#475569';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('🧠 Deep M8 Coach Engine', this.videoWidth / 2, this.videoHeight - 40);

    return this.canvas.toDataURL('image/jpeg', 0.85); // OPTIMIZACIÓN: JPEG con 85% calidad (menor tamaño)
  }

  /**
   * Generate outro frame
   */
  private async generateOutroFrame(gameRecord: GameRecord): Promise<string> {
    // Background
    const gradient = this.ctx.createLinearGradient(0, 0, this.videoWidth, this.videoHeight);
    gradient.addColorStop(0, '#1e293b');
    gradient.addColorStop(1, '#0f172a');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.videoWidth, this.videoHeight);

    // Title
    this.ctx.font = 'bold 80px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    this.ctx.fillStyle = '#ffffff';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Análisis Completo', this.videoWidth / 2, 200);

    // Final stats grid
    const stats = [
      { label: 'Precisión Final', value: `${gameRecord.accuracy}%`, emoji: '🎯' },
      { label: 'Movimientos', value: gameRecord.totalMoves.toString(), emoji: '♟️' },
      { label: 'Excelentes', value: gameRecord.excellentMoves.toString(), emoji: '⭐' },
      { label: 'Buenos', value: gameRecord.goodMoves.toString(), emoji: '✓' },
      { label: 'Imprecisiones', value: gameRecord.inaccuracies.toString(), emoji: '?!' },
      { label: 'Blunders', value: gameRecord.blunders.toString(), emoji: '💥' }
    ];

    const cols = 3;
    const rows = Math.ceil(stats.length / cols);
    const boxWidth = 500;
    const boxHeight = 200;
    const gapX = 100;
    const gapY = 50;
    const startX = (this.videoWidth - (cols * boxWidth + (cols - 1) * gapX)) / 2;
    const startY = 350;

    stats.forEach((stat, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (boxWidth + gapX);
      const y = startY + row * (boxHeight + gapY);

      // Box background
      this.ctx.fillStyle = 'rgba(100, 116, 139, 0.2)';
      this.roundRect(this.ctx, x, y, boxWidth, boxHeight, 16);

      // Emoji
      this.ctx.font = '60px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      this.ctx.fillStyle = '#ffffff';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(stat.emoji, x + boxWidth / 2, y + 70);

      // Value
      this.ctx.font = 'bold 56px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      this.ctx.fillStyle = '#a78bfa';
      this.ctx.fillText(stat.value, x + boxWidth / 2, y + 130);

      // Label
      this.ctx.font = '28px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      this.ctx.fillStyle = '#94a3b8';
      this.ctx.fillText(stat.label, x + boxWidth / 2, y + 170);
    });

    // Call to action
    this.ctx.font = 'bold 48px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillText('🧠 Mejora tu juego con Deep M8 Coach', this.videoWidth / 2, this.videoHeight - 100);

    return this.canvas.toDataURL('image/jpeg', 0.85); // OPTIMIZACIÓN: JPEG con 85% calidad (menor tamaño)
  }

  /**
   * Initialize chess board
   */
  private initializeBoard(): string[][] {
    return [
      ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
      ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
      ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
    ];
  }

  /**
   * Convert FEN string to board array
   */
  private fenToBoard(fen: string): string[][] {
    const rows = fen.split(' ')[0].split('/');
    const board: string[][] = [];

    for (const row of rows) {
      const boardRow: string[] = [];
      for (const char of row) {
        if (char >= '1' && char <= '8') {
          // Empty squares
          const emptyCount = parseInt(char);
          for (let i = 0; i < emptyCount; i++) {
            boardRow.push('');
          }
        } else {
          // Piece
          boardRow.push(char);
        }
      }
      board.push(boardRow);
    }

    return board;
  }

  /**
   * Parse move notation to board coordinates
   */
  private parseMoves(movesString: string): string[] {
    if (!movesString || typeof movesString !== 'string') {
      return [];
    }
    // Split by move numbers and filter out empty strings
    return movesString
      .split(/\d+\./)
      .filter(m => m.trim())
      .flatMap(m => m.trim().split(/\s+/))
      .filter(m => m && !m.includes('...'));
  }

  /**
   * Get Unicode chess piece symbol
   */
  private getPieceSymbol(piece: string): string {
    const symbols: Record<string, string> = {
      'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
      'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'
    };
    return symbols[piece] || '';
  }

  /**
   * Round rectangle helper
   */
  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
  }

  /**
   * Wrap text helper
   */
  private wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number
  ): void {
    const words = text.split(' ');
    let line = '';
    let currentY = y;

    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + ' ';
      const metrics = ctx.measureText(testLine);

      if (metrics.width > maxWidth && i > 0) {
        ctx.fillText(line, x, currentY);
        line = words[i] + ' ';
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, currentY);
  }

  /**
   * Convert frames to MP4 video blob using FFmpeg (with WebM fallback)
   */
  async framesToVideoBlob(frames: string[], fps: number = 30): Promise<Blob> {
    console.log('🎬 Starting video generation...');

    // Generar WebM primero (siempre funciona)
    const webmBlob = await this.generateWebMBlob(frames, fps);
    console.log('✅ WebM generated');

    try {
      // Intentar convertir a MP4
      await this.loadFFmpeg();

      if (!this.ffmpeg) {
        console.warn('⚠️ FFmpeg not available, returning WebM');
        return webmBlob;
      }

      const { fetchFile } = await import('@ffmpeg/util');

      console.log('🔄 Converting to MP4...');
      await this.ffmpeg.writeFile('input.webm', await fetchFile(webmBlob));

      await this.ffmpeg.exec([
        '-i', 'input.webm',
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '23',
        '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart',
        'output.mp4'
      ]);

      const data = await this.ffmpeg.readFile('output.mp4');
      const mp4Blob = new Blob([data], { type: 'video/mp4' });

      await this.ffmpeg.deleteFile('input.webm');
      await this.ffmpeg.deleteFile('output.mp4');

      console.log('✅ MP4 conversion complete!');
      return mp4Blob;

    } catch (error) {
      console.warn('⚠️ FFmpeg conversion failed, using WebM fallback:', error);
      console.log('📝 Note: Para MP4 necesitas configurar CORS headers en el servidor');
      // Retornar WebM como fallback
      return webmBlob;
    }
  }

  /**
   * Generate WebM blob using MediaRecorder
   */
  private async generateWebMBlob(frames: string[], fps: number): Promise<Blob> {
    return new Promise(async (resolve, reject) => {
      try {
        const stream = this.canvas.captureStream(fps);

        let mimeType = 'video/webm;codecs=vp8';
        if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
          mimeType = 'video/webm;codecs=vp9';
        }

        const mediaRecorder = new MediaRecorder(stream, {
          mimeType,
          videoBitsPerSecond: 5000000
        });

        const chunks: Blob[] = [];
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunks.push(e.data);
          }
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'video/webm' });
          resolve(blob);
        };

        mediaRecorder.onerror = (e) => {
          console.error('MediaRecorder error:', e);
          reject(e);
        };

        mediaRecorder.start(100);

        const frameDuration = 1000 / fps;
        for (let i = 0; i < frames.length; i++) {
          await this.drawFrameToCanvas(frames[i]);
          await this.sleep(frameDuration);
          this.ctx.drawImage(this.canvas, 0, 0);
        }

        await this.sleep(500);
        mediaRecorder.stop();

      } catch (error) {
        console.error('Video generation error:', error);
        reject(error);
      }
    });
  }

  /**
   * Draw frame image to canvas
   */
  private async drawFrameToCanvas(dataUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.ctx.drawImage(img, 0, 0);
        resolve();
      };
      img.onerror = reject;
      img.src = dataUrl;
    });
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Download video
   */
  downloadVideo(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

export const videoReplayService = new VideoReplayService();
export type { ReplayOptions, GameHighlight };
