/**
 * Progress Chart Component
 * Visualizes player improvement over time
 */

import type { GameRecord } from '../services/playerProfileService';

interface ProgressChartProps {
  gameHistory: GameRecord[];
}

export default function ProgressChart({ gameHistory }: ProgressChartProps) {
  // Validate gameHistory
  if (!gameHistory || !Array.isArray(gameHistory) || gameHistory.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        <div className="text-5xl mb-4">📊</div>
        <p>Juega más partidas para ver tu progreso</p>
      </div>
    );
  }

  // Get last 10 games for chart (reverse order for chronological display)
  const recentGames = gameHistory.slice(0, 10).reverse();
  const maxAccuracy = 100;

  // Calculate chart dimensions
  const chartWidth = 100; // percentage
  const chartHeight = 200; // pixels
  const barWidth = chartWidth / recentGames.length;

  // Calculate moving average
  const movingAverage = recentGames.map((_, idx) => {
    const window = recentGames.slice(Math.max(0, idx - 2), idx + 1);
    return window.reduce((sum, g) => sum + g.accuracy, 0) / window.length;
  });

  // Get color based on accuracy
  const getAccuracyColor = (accuracy: number): string => {
    if (accuracy >= 85) return 'bg-green-500';
    if (accuracy >= 70) return 'bg-blue-500';
    if (accuracy >= 60) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  // Get trend
  const firstHalf = recentGames.slice(0, Math.floor(recentGames.length / 2));
  const secondHalf = recentGames.slice(Math.floor(recentGames.length / 2));
  const firstAvg = firstHalf.reduce((sum, g) => sum + g.accuracy, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, g) => sum + g.accuracy, 0) / secondHalf.length;
  const trend = secondAvg - firstAvg;

  return (
    <div className="space-y-6">
      {/* Trend Summary */}
      <div className="flex items-center justify-between bg-slate-900/50 rounded-lg p-4">
        <div>
          <div className="text-slate-400 text-sm mb-1">Tendencia de Progreso</div>
          <div className={`text-2xl font-bold ${
            trend > 5 ? 'text-green-400' :
            trend < -5 ? 'text-red-400' :
            'text-blue-400'
          }`}>
            {trend > 0 ? '+' : ''}{trend.toFixed(1)}% {trend > 5 ? '📈' : trend < -5 ? '📉' : '➡️'}
          </div>
        </div>
        <div className="text-right">
          <div className="text-slate-400 text-sm mb-1">Mejor Racha</div>
          <div className="text-2xl font-bold text-purple-400">
            {Math.max(...recentGames.map(g => g.accuracy))}%
          </div>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="bg-slate-900/50 rounded-lg p-6">
        <h4 className="text-white font-semibold mb-4">Precisión por Partida (Últimas 10)</h4>

        <div className="relative" style={{ height: `${chartHeight}px` }}>
          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-slate-500 pr-2">
            <span>100%</span>
            <span>75%</span>
            <span>50%</span>
            <span>25%</span>
            <span>0%</span>
          </div>

          {/* Chart area */}
          <div className="ml-12 h-full relative border-l border-b border-slate-700">
            {/* Horizontal grid lines */}
            {[0, 25, 50, 75, 100].map((value) => (
              <div
                key={value}
                className="absolute w-full border-t border-slate-800"
                style={{ bottom: `${value}%` }}
              />
            ))}

            {/* Bars */}
            <div className="absolute inset-0 flex items-end justify-around px-2">
              {recentGames.map((game, idx) => (
                <div key={game.id} className="flex-1 flex flex-col items-center">
                  {/* Bar */}
                  <div
                    className={`w-full max-w-[40px] ${getAccuracyColor(game.accuracy)} rounded-t-lg transition-all hover:opacity-80 cursor-pointer relative group`}
                    style={{ height: `${game.accuracy}%` }}
                  >
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white text-xs rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                      <div className="font-bold">{game.accuracy}%</div>
                      <div className="text-slate-400">Partida #{recentGames.length - idx}</div>
                      <div className="text-slate-500 text-[10px]">
                        {new Date(game.timestamp).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  {/* Label */}
                  <div className="text-[10px] text-slate-500 mt-1">
                    {recentGames.length - idx}
                  </div>
                </div>
              ))}
            </div>

            {/* Moving average line */}
            <svg
              className="absolute inset-0 pointer-events-none"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              style={{ width: '100%', height: '100%' }}
            >
              <polyline
                points={movingAverage.map((avg, idx) => {
                  const svgWidth = 100; // Will scale to container
                  const svgHeight = 100; // Will scale to container
                  const x = ((idx + 0.5) / recentGames.length) * svgWidth;
                  const y = svgHeight - avg; // avg is 0-100, y is 0-100
                  return `${x.toFixed(2)} ${y.toFixed(2)}`; // Use space separator, not comma
                }).join(' ')}
                fill="none"
                stroke="rgb(168, 85, 247)"
                strokeWidth="1"
                strokeDasharray="4 4"
                opacity="0.6"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-6 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span>Excelente (85%+)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span>Bueno (70-84%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-500 rounded"></div>
            <span>Regular (60-69%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-orange-500 rounded"></div>
            <span>Bajo (&lt;60%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-dashed border-purple-500 rounded"></div>
            <span>Media Móvil</span>
          </div>
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-400">
            {recentGames.filter(g => g.accuracy >= 80).length}
          </div>
          <div className="text-slate-400 text-xs mt-1">Partidas +80%</div>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-400">
            {(recentGames.reduce((sum, g) => sum + g.accuracy, 0) / recentGames.length).toFixed(1)}%
          </div>
          <div className="text-slate-400 text-xs mt-1">Promedio Reciente</div>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-purple-400">
            {Math.min(...recentGames.map(g => g.accuracy))}%
          </div>
          <div className="text-slate-400 text-xs mt-1">Peor Partida</div>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-orange-400">
            {(recentGames.reduce((sum, g) => sum + g.blunders, 0) / recentGames.length).toFixed(1)}
          </div>
          <div className="text-slate-400 text-xs mt-1">Blunders Promedio</div>
        </div>
      </div>
    </div>
  );
}
