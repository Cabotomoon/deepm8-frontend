/**
 * Victory Image Generation Service
 * Generates professional victory images when a game ends
 */

export interface VictoryImageData {
  winnerName: string;
  winnerElo: number;
  loserName: string;
  loserElo: number;
  eloChange: number;
  gameResult: 'checkmate' | 'timeout' | 'resignation' | 'draw';
  totalMoves: number;
  gameDuration: string;
}

/**
 * Generate victory image using canvas (local generation)
 */
export async function generateVictoryImage(data: VictoryImageData): Promise<string> {
  // Use local canvas generation for instant results
  // Future: Integrate with image-pro skill for AI-generated victory images
  return generateFallbackVictoryImage(data);
}

/**
 * Create AI prompt for victory image
 */
function createVictoryPrompt(data: VictoryImageData): string {
  const resultText = data.gameResult === 'draw' ? 'DRAW' : 'CHECKMATE';
  const eloChangeText = data.eloChange > 0 ? `+${data.eloChange}` : `${data.eloChange}`;

  return `Professional chess game victory celebration screen, elegant dark background with golden amber accents,
    large "${resultText}" text in metallic gold, chess pieces celebration arrangement (${data.gameResult === 'checkmate' ? 'king fallen' : 'peaceful draw'}),
    winner trophy with crown, modern minimalist UI design,
    stats panel showing: "${data.winnerName} (${data.winnerElo} ${eloChangeText})" vs "${data.loserName}",
    game duration ${data.gameDuration}, ${data.totalMoves} moves,
    4K quality, cinematic lighting, professional esports aesthetic,
    dark slate background with amber gradient highlights,
    elegant typography, modern gaming UI elements,
    chess board subtle pattern in background`;
}

/**
 * Generate fallback victory image using canvas
 */
function generateFallbackVictoryImage(data: VictoryImageData): string {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 630;
  const ctx = canvas.getContext('2d');

  if (!ctx) return '';

  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, 1200, 630);
  gradient.addColorStop(0, '#0f172a');
  gradient.addColorStop(0.5, '#1e293b');
  gradient.addColorStop(1, '#0f172a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1200, 630);

  // Title
  ctx.fillStyle = '#f59e0b';
  ctx.font = 'bold 80px Arial';
  ctx.textAlign = 'center';
  const titleText = data.gameResult === 'draw' ? 'DRAW' : 'VICTORY!';
  ctx.fillText(titleText, 600, 150);

  // Winner info
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 48px Arial';
  ctx.fillText(data.winnerName, 600, 250);

  // ELO info
  ctx.fillStyle = '#fbbf24';
  ctx.font = '36px Arial';
  const eloChange = data.eloChange > 0 ? `+${data.eloChange}` : `${data.eloChange}`;
  ctx.fillText(`${data.winnerElo} (${eloChange})`, 600, 310);

  // VS
  ctx.fillStyle = '#94a3b8';
  ctx.font = '24px Arial';
  ctx.fillText('VS', 600, 360);

  // Loser info
  ctx.fillStyle = '#cbd5e1';
  ctx.font = '32px Arial';
  ctx.fillText(data.loserName, 600, 410);

  // Game stats
  ctx.fillStyle = '#64748b';
  ctx.font = '20px Arial';
  ctx.fillText(`${data.totalMoves} moves • ${data.gameDuration}`, 600, 480);

  // Chess pieces decoration
  ctx.font = '60px Arial';
  ctx.fillText('♔', 150, 350);
  ctx.fillText('♕', 1050, 350);

  // Border
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 4;
  ctx.strokeRect(20, 20, 1160, 590);

  return canvas.toDataURL('image/png');
}

/**
 * Download victory image
 */
export function downloadVictoryImage(imageUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.href = imageUrl;
  link.download = filename || 'chess-victory.png';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Share victory image on social media
 */
export function shareVictoryImage(imageUrl: string, data: VictoryImageData): void {
  const text = `Just ${data.gameResult === 'draw' ? 'drew' : 'won'} a chess game! ${data.winnerName} (${data.winnerElo}) vs ${data.loserName}. ${data.totalMoves} moves in ${data.gameDuration}. #ChessClash`;

  if (navigator.share) {
    navigator.share({
      title: 'Chess Clash Victory',
      text: text,
      url: imageUrl
    }).catch(err => console.log('Error sharing:', err));
  } else {
    // Fallback: copy to clipboard
    navigator.clipboard.writeText(`${text}\n${imageUrl}`);
    alert('Victory details copied to clipboard!');
  }
}
