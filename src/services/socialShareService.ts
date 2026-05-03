/**
 * Social Share Service
 * Generate shareable content for achievements and game highlights
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
  highlights: GameHighlight[];
}

interface GameHighlight {
  moveNumber: number;
  notation: string;
  type: 'brilliant' | 'blunder' | 'comeback';
  description: string;
}

class SocialShareService {
  /**
   * Generate shareable text for achievement
   */
  generateAchievementText(data: ShareableAchievement): string {
    const { achievement, profile } = data;
    const rarityEmoji = this.getRarityEmoji(achievement.rarity);

    return `🏆 ¡Logro Desbloqueado en Deep M8 Coach! ${rarityEmoji}

${achievement.icon} ${achievement.name}
${achievement.description}

📊 Mi progreso:
• ${profile.totalGames} partidas jugadas
• ${profile.averageAccuracy}% precisión promedio
• ${(profile.achievements || []).length} logros desbloqueados

#DeepM8Coach #Chess #Achievement #Gaming`;
  }

  /**
   * Generate shareable text for game
   */
  generateGameText(data: ShareableGame): string {
    const { gameRecord, profile } = data;

    const result = gameRecord.result === 'win' ? '✅ Victoria' :
                   gameRecord.result === 'loss' ? '❌ Derrota' :
                   gameRecord.result === 'draw' ? '⚖️ Tablas' : '🎮 Partida';

    return `♟️ ${result} - Deep M8 Coach Analysis

📊 Estadísticas:
• Precisión: ${gameRecord.accuracy}%
• Movimientos: ${gameRecord.totalMoves}
• Excelentes: ${gameRecord.excellentMoves} ✓✓
• Blunders: ${gameRecord.blunders} ??

🧠 Mi nivel actual:
• ${profile.totalGames} partidas analizadas
• ${profile.averageAccuracy}% precisión promedio

#DeepM8Coach #Chess #ChessGame #Strategy`;
  }

  /**
   * Share to Twitter/X
   */
  shareToTwitter(text: string): void {
    const encodedText = encodeURIComponent(text);
    const url = `https://twitter.com/intent/tweet?text=${encodedText}`;
    window.open(url, '_blank', 'width=550,height=420');
  }

  /**
   * Share to Discord (copy to clipboard with instructions)
   */
  async shareToDiscord(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      return false;
    }
  }

  /**
   * Share to WhatsApp (with download instructions)
   */
  shareToWhatsApp(text: string): void {
    const encodedText = encodeURIComponent(text);
    const url = `https://wa.me/?text=${encodedText}`;
    window.open(url, '_blank');
  }

  /**
   * Share to Facebook (with download instructions)
   */
  shareToFacebook(text: string): void {
    const encodedText = encodeURIComponent(text);
    const url = `https://www.facebook.com/sharer/sharer.php?quote=${encodedText}`;
    window.open(url, '_blank', 'width=550,height=420');
  }

  /**
   * Share to Telegram (with download instructions)
   */
  shareToTelegram(text: string): void {
    const encodedText = encodeURIComponent(text);
    const url = `https://t.me/share/url?text=${encodedText}`;
    window.open(url, '_blank');
  }

  /**
   * Share to Instagram (download instructions + open app)
   */
  shareToInstagram(text: string): void {
    // Instagram no permite compartir directamente por URL, abrir app
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      window.open('instagram://story-camera', '_blank');
    } else {
      window.open('https://www.instagram.com/', '_blank');
    }
  }

  /**
   * Share to TikTok (download instructions + open app)
   */
  shareToTikTok(text: string): void {
    // TikTok no permite compartir directamente por URL, abrir app
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      window.open('snssdk1233://upload', '_blank');
    } else {
      window.open('https://www.tiktok.com/upload', '_blank');
    }
  }

  /**
   * Copy media file with text to clipboard
   */
  async copyMediaToClipboard(mediaBlob: Blob, text: string): Promise<boolean> {
    try {
      // Try to copy both image and text (supported on modern browsers)
      const clipboardItems = [
        new ClipboardItem({
          [mediaBlob.type]: mediaBlob,
          'text/plain': new Blob([text], { type: 'text/plain' })
        })
      ];
      await navigator.clipboard.write(clipboardItems);
      return true;
    } catch (error) {
      // Fallback: just copy text
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (err) {
        console.error('Error copying to clipboard:', err);
        return false;
      }
    }
  }

  /**
   * Download media file
   */
  downloadMediaFile(url: string, filename: string): void {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  /**
   * Generate achievement card data for image generation
   */
  generateAchievementCardData(data: ShareableAchievement): {
    title: string;
    subtitle: string;
    stats: Array<{ label: string; value: string }>;
    colors: { primary: string; secondary: string };
  } {
    const { achievement, profile } = data;

    const colors = this.getRarityColors(achievement.rarity);

    return {
      title: `${achievement.icon} ${achievement.name}`,
      subtitle: achievement.description,
      stats: [
        { label: 'Rareza', value: this.getRarityLabel(achievement.rarity) },
        { label: 'Partidas', value: profile.totalGames.toString() },
        { label: 'Precisión', value: `${profile.averageAccuracy}%` },
        { label: 'Logros', value: `${(profile.achievements || []).length}/24` }
      ],
      colors
    };
  }

  /**
   * Extract game highlights
   */
  extractHighlights(
    moveAnalysis: Array<{
      moveNumber: number;
      notation: string;
      classification: string;
      evaluationChange?: number;
    }>,
    gameRecord: GameRecord
  ): GameHighlight[] {
    const highlights: GameHighlight[] = [];

    // Find brilliant moves (excellent with significant advantage)
    const brilliantMoves = moveAnalysis.filter(
      m => m.classification === 'excellent' && Math.abs(m.evaluationChange || 0) > 50
    );

    if (brilliantMoves.length > 0) {
      const best = brilliantMoves[0];
      highlights.push({
        moveNumber: best.moveNumber,
        notation: best.notation,
        type: 'brilliant',
        description: `¡Jugada brillante! ${best.notation} dio ventaja decisiva`
      });
    }

    // Find biggest blunder
    const blunders = moveAnalysis.filter(m => m.classification === 'blunder');
    if (blunders.length > 0) {
      const worst = blunders.reduce((a, b) =>
        Math.abs(b.evaluationChange || 0) > Math.abs(a.evaluationChange || 0) ? b : a
      );

      highlights.push({
        moveNumber: worst.moveNumber,
        notation: worst.notation,
        type: 'blunder',
        description: `Error crítico en ${worst.notation}`
      });
    }

    // Find comeback moment (recovery after blunder)
    for (let i = 1; i < moveAnalysis.length; i++) {
      const prev = moveAnalysis[i - 1];
      const curr = moveAnalysis[i];

      if (
        prev.classification === 'blunder' &&
        curr.classification === 'excellent' &&
        (curr.evaluationChange || 0) > 100
      ) {
        highlights.push({
          moveNumber: curr.moveNumber,
          notation: curr.notation,
          type: 'comeback',
          description: `¡Remontada épica con ${curr.notation}!`
        });
        break;
      }
    }

    return highlights;
  }

  /**
   * Generate shareable game summary with highlights
   */
  generateGameSummary(data: ShareableGame): string {
    const { gameRecord, highlights } = data;

    let summary = `🎯 Partida Deep M8 Coach\n\n`;
    summary += `📊 ${gameRecord.accuracy}% precisión | ${gameRecord.totalMoves} movimientos\n`;
    summary += `✓✓ ${gameRecord.excellentMoves} excelentes | ?? ${gameRecord.blunders} blunders\n\n`;

    if (highlights.length > 0) {
      summary += `⭐ Momentos Destacados:\n`;
      highlights.forEach((h, idx) => {
        const emoji = h.type === 'brilliant' ? '🌟' :
                     h.type === 'blunder' ? '💥' : '🔥';
        summary += `${idx + 1}. ${emoji} Jugada ${h.moveNumber}: ${h.description}\n`;
      });
    }

    return summary;
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
   * Get rarity colors
   */
  private getRarityColors(rarity: Achievement['rarity']): { primary: string; secondary: string } {
    switch (rarity) {
      case 'legendary':
        return { primary: '#FFD700', secondary: '#FFA500' };
      case 'epic':
        return { primary: '#9333EA', secondary: '#7C3AED' };
      case 'rare':
        return { primary: '#3B82F6', secondary: '#2563EB' };
      case 'common':
        return { primary: '#64748B', secondary: '#475569' };
    }
  }

  /**
   * Download achievement card as HTML
   */
  downloadAchievementCard(data: ShareableAchievement): void {
    const cardData = this.generateAchievementCardData(data);
    const html = this.generateAchievementCardHTML(cardData);

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `achievement-${data.achievement.id}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Generate achievement card HTML
   */
  private generateAchievementCardHTML(data: ReturnType<typeof this.generateAchievementCardData>): string {
    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    .card {
      width: 600px;
      background: linear-gradient(135deg, ${data.colors.primary}, ${data.colors.secondary});
      border-radius: 24px;
      padding: 48px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      color: white;
    }
    .header {
      text-align: center;
      margin-bottom: 32px;
    }
    .title {
      font-size: 48px;
      font-weight: bold;
      margin-bottom: 16px;
    }
    .subtitle {
      font-size: 20px;
      opacity: 0.9;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      margin-top: 32px;
    }
    .stat {
      background: rgba(255,255,255,0.1);
      border-radius: 12px;
      padding: 16px;
      text-align: center;
    }
    .stat-value {
      font-size: 32px;
      font-weight: bold;
      margin-bottom: 8px;
    }
    .stat-label {
      font-size: 14px;
      opacity: 0.8;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .footer {
      text-align: center;
      margin-top: 32px;
      font-size: 18px;
      opacity: 0.9;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="title">${data.title}</div>
      <div class="subtitle">${data.subtitle}</div>
    </div>
    <div class="stats">
      ${data.stats.map(stat => `
        <div class="stat">
          <div class="stat-value">${stat.value}</div>
          <div class="stat-label">${stat.label}</div>
        </div>
      `).join('')}
    </div>
    <div class="footer">
      🧠 Deep M8 Coach Engine
    </div>
  </div>
</body>
</html>`;
  }
}

export const socialShareService = new SocialShareService();
export type { ShareableAchievement, ShareableGame, GameHighlight };
