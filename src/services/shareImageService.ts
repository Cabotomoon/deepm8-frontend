/**
 * Share Image Service
 * Generate shareable images for achievements and games using Canvas
 */

import type { Achievement } from './achievementService';
import type { GameRecord, PlayerProfile } from './playerProfileService';

interface ShareableAchievement {
  achievement: Achievement;
  unlockedAt: number;
  profile: PlayerProfile;
}

interface ShareableGame {
  gameRecord: GameRecord;
  profile: PlayerProfile;
  highlights: Array<{
    moveNumber: number;
    notation: string;
    type: 'brilliant' | 'blunder' | 'comeback';
    description: string;
  }>;
}

class ShareImageService {
  /**
   * Load DeepM8 logo
   */
  private async loadLogo(): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = '/branding/logo-m8.png';
    });
  }

  /**
   * Draw watermark with logo
   */
  private drawWatermark(ctx: CanvasRenderingContext2D, logo: HTMLImageElement, width: number, height: number): void {
    // Position: bottom-right corner with padding
    const logoSize = 80;
    const padding = 30;
    const x = width - logoSize - padding;
    const y = height - logoSize - padding;

    // Semi-transparent background for better visibility
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    this.roundRect(ctx, x - 10, y - 10, logoSize + 20, logoSize + 20, 12);

    // Draw logo with slight transparency
    ctx.globalAlpha = 0.9;
    ctx.drawImage(logo, x, y, logoSize, logoSize);
    ctx.globalAlpha = 1.0;
  }

  /**
   * Generate achievement card image
   */
  async generateAchievementImage(data: ShareableAchievement): Promise<string> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    // Set canvas size (1200x630 - optimal for social media)
    canvas.width = 1200;
    canvas.height = 630;

    const { achievement, profile } = data;

    // Load logo
    const logo = await this.loadLogo();

    // Background gradient based on rarity
    const gradient = this.createRarityGradient(ctx, achievement.rarity, canvas.width, canvas.height);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add subtle pattern
    this.drawPattern(ctx, canvas.width, canvas.height);

    // Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 8;
    ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

    // Title section
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(40, 40, canvas.width - 80, 140);

    ctx.font = 'bold 32px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText('🏆 Logro Desbloqueado en Deep M8 Coach', canvas.width / 2, 90);

    // Rarity badge
    const rarityLabel = this.getRarityLabel(achievement.rarity);
    const rarityEmoji = this.getRarityEmoji(achievement.rarity);
    ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillStyle = this.getRarityTextColor(achievement.rarity);
    ctx.fillText(`${rarityEmoji} ${rarityLabel}`, canvas.width / 2, 140);

    // Achievement icon and name
    ctx.font = 'bold 96px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(achievement.icon, canvas.width / 2, 280);

    ctx.font = 'bold 42px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(achievement.name, canvas.width / 2, 350);

    // Description
    ctx.font = '24px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    this.wrapText(ctx, achievement.description, canvas.width / 2, 390, canvas.width - 160, 32);

    // Stats section
    const stats = [
      { label: 'Partidas', value: profile.totalGames.toString(), emoji: '🎮' },
      { label: 'Precisión', value: `${profile.averageAccuracy}%`, emoji: '🎯' },
      { label: 'Logros', value: `${(profile.achievements || []).length}/24`, emoji: '🏆' }
    ];

    const statWidth = (canvas.width - 160) / 3;
    stats.forEach((stat, i) => {
      const x = 80 + i * statWidth + statWidth / 2;
      const y = 480;

      // Stat background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      this.roundRect(ctx, x - 100, y, 200, 100, 12);

      // Emoji
      ctx.font = '36px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(stat.emoji, x, y + 40);

      // Value
      ctx.font = 'bold 32px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(stat.value, x, y + 75);

      // Label
      ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillText(stat.label, x, y + 95);
    });

    // Footer
    ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillText('🧠 Deep M8 Coach Engine', canvas.width / 2, canvas.height - 30);

    // Draw watermark with logo
    this.drawWatermark(ctx, logo, canvas.width, canvas.height);

    return canvas.toDataURL('image/png');
  }

  /**
   * Generate game stats image
   */
  async generateGameImage(data: ShareableGame): Promise<string> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    canvas.width = 1200;
    canvas.height = 630;

    const { gameRecord, profile, highlights } = data;

    // Load logo
    const logo = await this.loadLogo();

    // Background gradient (blue/purple)
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(1, '#764ba2');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Pattern
    this.drawPattern(ctx, canvas.width, canvas.height);

    // Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 8;
    ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

    // Result icon and title
    const resultEmoji = gameRecord.result === 'win' ? '✅' : gameRecord.result === 'loss' ? '❌' : '⚖️';
    const resultText = gameRecord.result === 'win' ? 'Victoria' : gameRecord.result === 'loss' ? 'Derrota' : 'Tablas';
    const resultColor = gameRecord.result === 'win' ? '#10b981' : gameRecord.result === 'loss' ? '#ef4444' : '#6b7280';

    ctx.font = 'bold 72px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(resultEmoji, canvas.width / 2, 100);

    ctx.font = 'bold 48px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillStyle = resultColor;
    ctx.fillText(resultText, canvas.width / 2, 160);

    ctx.font = '24px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillText('Deep M8 Coach Analysis', canvas.width / 2, 190);

    // Stats grid
    const gameStats = [
      { label: 'Precisión', value: `${gameRecord.accuracy}%`, emoji: '🎯' },
      { label: 'Movimientos', value: gameRecord.totalMoves.toString(), emoji: '♟️' },
      { label: 'Excelentes', value: `${gameRecord.excellentMoves} ✓✓`, emoji: '⭐' },
      { label: 'Blunders', value: `${gameRecord.blunders} ??`, emoji: '💥' }
    ];

    const statWidth = (canvas.width - 160) / 4;
    gameStats.forEach((stat, i) => {
      const x = 80 + i * statWidth + statWidth / 2;
      const y = 240;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      this.roundRect(ctx, x - 80, y, 160, 100, 12);

      ctx.font = '28px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(stat.emoji, x, y + 35);

      ctx.font = 'bold 32px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillText(stat.value, x, y + 70);

      ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillText(stat.label, x, y + 90);
    });

    // Highlights section
    if (highlights.length > 0) {
      ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.fillText('⭐ Momentos Destacados', 80, 380);

      highlights.slice(0, 3).forEach((highlight, i) => {
        const y = 420 + i * 60;
        const emoji = highlight.type === 'brilliant' ? '🌟' : highlight.type === 'blunder' ? '💥' : '🔥';

        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.roundRect(ctx, 80, y - 25, canvas.width - 160, 50, 8);

        ctx.font = '24px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`${emoji} Jugada ${highlight.moveNumber}: ${highlight.description}`, 100, y + 5);
      });
    }

    // Player progress
    ctx.font = '18px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.textAlign = 'center';
    ctx.fillText(`🧠 Mi nivel: ${profile.totalGames} partidas • ${profile.averageAccuracy}% precisión promedio`, canvas.width / 2, canvas.height - 30);

    // Draw watermark with logo
    this.drawWatermark(ctx, logo, canvas.width, canvas.height);

    return canvas.toDataURL('image/png');
  }

  /**
   * Create rarity gradient
   */
  private createRarityGradient(
    ctx: CanvasRenderingContext2D,
    rarity: Achievement['rarity'],
    width: number,
    height: number
  ): CanvasGradient {
    const gradient = ctx.createLinearGradient(0, 0, width, height);

    switch (rarity) {
      case 'legendary':
        gradient.addColorStop(0, '#FFD700');
        gradient.addColorStop(1, '#FFA500');
        break;
      case 'epic':
        gradient.addColorStop(0, '#9333EA');
        gradient.addColorStop(1, '#7C3AED');
        break;
      case 'rare':
        gradient.addColorStop(0, '#3B82F6');
        gradient.addColorStop(1, '#2563EB');
        break;
      case 'common':
        gradient.addColorStop(0, '#64748B');
        gradient.addColorStop(1, '#475569');
        break;
    }

    return gradient;
  }

  /**
   * Draw subtle pattern
   */
  private drawPattern(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    for (let i = 0; i < width; i += 60) {
      for (let j = 0; j < height; j += 60) {
        ctx.fillRect(i, j, 30, 30);
      }
    }
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
   * Get rarity emoji
   */
  private getRarityEmoji(rarity: Achievement['rarity']): string {
    switch (rarity) {
      case 'legendary': return '💎';
      case 'epic': return '🌟';
      case 'rare': return '⭐';
      case 'common': return '🔷';
    }
  }

  /**
   * Get rarity label
   */
  private getRarityLabel(rarity: Achievement['rarity']): string {
    switch (rarity) {
      case 'legendary': return 'Legendario';
      case 'epic': return 'Épico';
      case 'rare': return 'Raro';
      case 'common': return 'Común';
    }
  }

  /**
   * Get rarity text color
   */
  private getRarityTextColor(rarity: Achievement['rarity']): string {
    switch (rarity) {
      case 'legendary': return '#FFD700';
      case 'epic': return '#C084FC';
      case 'rare': return '#60A5FA';
      case 'common': return '#94A3B8';
    }
  }

  /**
   * Download image
   */
  downloadImage(dataUrl: string, filename: string): void {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

export const shareImageService = new ShareImageService();
export type { ShareableAchievement, ShareableGame };
