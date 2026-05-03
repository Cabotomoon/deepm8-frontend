/**
 * Export Service
 * Export game analysis in various formats
 */

import type { GameRecord, PlayerProfile } from './playerProfileService';
import type { CoachFeedback } from './llmCoachService';

interface MoveAnalysis {
  moveNumber: number;
  notation: string;
  evaluation: number;
  classification: 'excellent' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';
  comment: string;
  bestMove?: string;
}

interface ExportData {
  gameRecord: GameRecord;
  profile: PlayerProfile;
  moveAnalysis: MoveAnalysis[];
  coachFeedback: CoachFeedback;
  exportDate: number;
}

class ExportService {
  /**
   * Export analysis as JSON
   */
  exportAsJSON(data: ExportData): void {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `chess-analysis-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Export analysis as Markdown
   */
  exportAsMarkdown(data: ExportData): void {
    const md = this.generateMarkdown(data);
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `chess-analysis-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Generate Markdown report
   */
  private generateMarkdown(data: ExportData): string {
    const { gameRecord, profile, moveAnalysis, coachFeedback } = data;
    const date = new Date(gameRecord.timestamp).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return `# 🧠 Deep M8 Coach Engine - Análisis de Partida

**Fecha:** ${date}
**Color:** ${gameRecord.playerColor === 'white' ? 'Blancas ⚪' : 'Negras ⚫'}
**Precisión:** ${gameRecord.accuracy}%

---

## 📊 Resumen de la Partida

| Métrica | Valor |
|---------|-------|
| Movimientos Totales | ${gameRecord.totalMoves} |
| Movimientos Excelentes | ${gameRecord.excellentMoves} ✓✓ |
| Buenos Movimientos | ${gameRecord.goodMoves} ✓ |
| Imprecisiones | ${gameRecord.inaccuracies} ?! |
| Errores | ${gameRecord.mistakes} ? |
| Blunders | ${gameRecord.blunders} ?? |

---

## 💡 Feedback del Coach IA

### Resumen
${coachFeedback.summary}

### 💎 Insights Clave
${coachFeedback.keyInsights.map((insight, idx) => `${idx + 1}. ${insight}`).join('\n')}

### 📚 Plan de Entrenamiento
${coachFeedback.trainingPlan.map((task, idx) => `${idx + 1}. ${task}`).join('\n')}

### 🔍 Análisis Profundo
${coachFeedback.detailedAnalysis}

### ✨ Mensaje Motivacional
> ${coachFeedback.motivationalMessage}

---

## 📝 Análisis Movimiento por Movimiento

${moveAnalysis.map((move) => `
### Movimiento ${move.moveNumber}: ${move.notation}

- **Clasificación:** ${this.getClassificationEmoji(move.classification)} ${move.classification.toUpperCase()}
- **Evaluación:** ${move.evaluation > 0 ? '+' : ''}${(move.evaluation / 100).toFixed(2)}
- **Comentario:** ${move.comment}
${move.bestMove ? `- **Mejor jugada:** ${move.bestMove}` : ''}
`).join('\n')}

---

## 👤 Tu Perfil de Jugador

**Partidas Jugadas:** ${profile.totalGames}
**Precisión Promedio:** ${profile.averageAccuracy}%
**Movimientos Totales:** ${profile.totalMoves}

### 💪 Fortalezas
${profile.strengths.length > 0 ? profile.strengths.map(s => `- ${s}`).join('\n') : '_No identificadas aún_'}

### 🎯 Áreas de Mejora
${profile.weaknesses.length > 0 ? profile.weaknesses.map(w => `- ${w.description} (${w.occurrences}x)`).join('\n') : '_Ninguna identificada_'}

---

*Generado por Deep M8 Coach Engine V1*
*${new Date().toLocaleString('es-ES')}*
`;
  }

  /**
   * Get classification emoji
   */
  private getClassificationEmoji(classification: string): string {
    switch (classification) {
      case 'excellent': return '✓✓';
      case 'good': return '✓';
      case 'inaccuracy': return '?!';
      case 'mistake': return '?';
      case 'blunder': return '??';
      default: return '';
    }
  }

  /**
   * Copy analysis to clipboard
   */
  async copyToClipboard(data: ExportData): Promise<boolean> {
    try {
      const md = this.generateMarkdown(data);
      await navigator.clipboard.writeText(md);
      return true;
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      return false;
    }
  }
}

export const exportService = new ExportService();
export type { ExportData };
