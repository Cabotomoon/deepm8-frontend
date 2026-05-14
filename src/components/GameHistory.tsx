/**
 * Game History Component
 * Shows list of past games with replay functionality
 */

import { useState, useEffect } from 'react';
import { getGameHistory, clearAllGameHistory, type GameHistory } from '../services/localDataService';

interface GameHistoryProps {
  userId: string;
  onClose: () => void;
  onReplayGame: (game: GameHistory) => void;
}

export default function GameHistoryComponent({ userId, onClose, onReplayGame }: GameHistoryProps) {
  const [games, setGames] = useState<GameHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'won' | 'lost' | 'draw'>('all');

  useEffect(() => {
    loadGames();
  }, [userId]);

  const loadGames = async () => {
    setLoading(true);
    const history = await getGameHistory(userId, 50);
    setGames(history);
    setLoading(false);
  };

  const handleClearHistory = async () => {
    if (window.confirm('⚠️ ¿Estás seguro de que quieres borrar TODO el historial de partidas? Esta acción no se puede deshacer.')) {
      await clearAllGameHistory();
      await loadGames();
    }
  };

  const getFilteredGames = () => {
    return games.filter(game => {
      if (filter === 'all') return true;

      const isWhite = game.whitePlayerId === userId;
      const result = game.result;

      if (filter === 'won') {
        return (isWhite && result === 'white') || (!isWhite && result === 'black');
      }
      if (filter === 'lost') {
        return (isWhite && result === 'black') || (!isWhite && result === 'white');
      }
      if (filter === 'draw') {
        return result === 'draw';
      }
      return true;
    });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Hoy';
    if (days === 1) return 'Ayer';
    if (days < 7) return `Hace ${days} días`;
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const filteredGames = getFilteredGames();
  const stats = {
    total: games.length,
    won: games.filter(g => {
      const isWhite = g.whitePlayerId === userId;
      return (isWhite && g.result === 'white') || (!isWhite && g.result === 'black');
    }).length,
    lost: games.filter(g => {
      const isWhite = g.whitePlayerId === userId;
      return (isWhite && g.result === 'black') || (!isWhite && g.result === 'white');
    }).length,
    draw: games.filter(g => g.result === 'draw').length
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-2xl border-2 border-slate-700 max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-white via-blue-400 to-blue-600 p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-bold text-purple-600 mb-2">📜 Historial de Partidas</h2>
              <p className="text-blue-900">{stats.total} partidas jugadas</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-lg px-4 py-2 transition-all font-semibold"
            >
              ✕ Cerrar
            </button>
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-4 gap-4 mt-6">
            <div className="bg-blue-900/40 rounded-lg p-3 text-center backdrop-blur border border-blue-700/50">
              <div className="text-2xl font-bold text-blue-900">{stats.total}</div>
              <div className="text-xs text-blue-800">Total</div>
            </div>
            <div className="bg-green-500/30 rounded-lg p-3 text-center backdrop-blur border border-green-600/50">
              <div className="text-2xl font-bold text-green-700">{stats.won}</div>
              <div className="text-xs text-green-800">Victorias</div>
            </div>
            <div className="bg-red-500/30 rounded-lg p-3 text-center backdrop-blur border border-red-600/50">
              <div className="text-2xl font-bold text-red-700">{stats.lost}</div>
              <div className="text-xs text-red-800">Derrotas</div>
            </div>
            <div className="bg-yellow-500/30 rounded-lg p-3 text-center backdrop-blur border border-yellow-600/50">
              <div className="text-2xl font-bold text-yellow-700">{stats.draw}</div>
              <div className="text-xs text-yellow-800">Tablas</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-slate-700 flex gap-2 justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                filter === 'all'
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            Todas ({stats.total})
          </button>
          <button
            onClick={() => setFilter('won')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              filter === 'won'
                ? 'bg-green-500 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            🏆 Victorias ({stats.won})
          </button>
          <button
            onClick={() => setFilter('lost')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              filter === 'lost'
                ? 'bg-red-500 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            💀 Derrotas ({stats.lost})
          </button>
          <button
            onClick={() => setFilter('draw')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              filter === 'draw'
                ? 'bg-yellow-500 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            🤝 Tablas ({stats.draw})
          </button>
          </div>
          <button
            onClick={handleClearHistory}
            className="px-4 py-2 rounded-lg font-semibold bg-red-600 hover:bg-red-700 text-white transition-all"
            title="Borrar todo el historial"
          >
            🗑️ Limpiar historial
          </button>
        </div>

        {/* Games List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4 animate-bounce">♟️</div>
              <p className="text-slate-400">Cargando historial...</p>
            </div>
          ) : filteredGames.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎮</div>
              <p className="text-slate-400 text-lg">No hay partidas en esta categoría</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredGames.map((game) => {
                const isWhite = game.whitePlayerId === userId;
                const myColor = isWhite ? 'white' : 'black';
                const opponentName = isWhite ? game.blackPlayerName : game.whitePlayerName;
                const won = (isWhite && game.result === 'white') || (!isWhite && game.result === 'black');
                const lost = (isWhite && game.result === 'black') || (!isWhite && game.result === 'white');
                const draw = game.result === 'draw';
                const eloChange = isWhite ? game.whiteEloChange : game.blackEloChange;

                return (
                  <div
                    key={game.id}
                    className={`bg-slate-800/50 rounded-lg p-4 border-2 transition-all hover:border-slate-600 cursor-pointer ${
                      won ? 'border-green-500/30 hover:border-green-500/50' :
                      lost ? 'border-red-500/30 hover:border-red-500/50' :
                      'border-yellow-500/30 hover:border-yellow-500/50'
                    }`}
                    onClick={() => onReplayGame(game)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        {/* Result Icon */}
                        <div className={`text-4xl ${
                          won ? 'text-green-400' : lost ? 'text-red-400' : 'text-yellow-400'
                        }`}>
                          {won ? '🏆' : lost ? '💀' : '🤝'}
                        </div>

                        {/* Game Info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <span className="text-lg font-bold text-white">
                              vs {opponentName}
                            </span>
                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                              myColor === 'white' ? 'bg-white/20 text-white' : 'bg-slate-700 text-slate-300'
                            }`}>
                              {myColor === 'white' ? '⚪ Blancas' : '⚫ Negras'}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-slate-400">
                            <span>📅 {formatDate(game.timestamp)}</span>
                            <span>⏱️ {formatDuration(game.duration)}</span>
                            <span>🎯 {game.moves.length} movimientos</span>
                            <span className={eloChange >= 0 ? 'text-green-400' : 'text-red-400'}>
                              {eloChange >= 0 ? '+' : ''}{eloChange} ELO
                            </span>
                          </div>
                        </div>

                        {/* Replay Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onReplayGame(game);
                          }}
                          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg font-semibold transition-all"
                        >
                          ▶️ Ver Replay
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
