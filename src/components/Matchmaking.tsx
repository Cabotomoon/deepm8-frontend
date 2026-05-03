/**
 * Matchmaking Component
 *
 * Features:
 * - Automatic opponent matching by ELO (±200 points)
 * - Real-time queue status
 * - Cancel search
 * - Match found notification
 */

import { useState, useEffect } from 'react';
import { socketService } from '../services/socketService';
import type { Room } from '../types/socket.types';

interface MatchmakingProps {
  playerName: string;
  playerElo: number;
  timeControl: 'bullet' | 'blitz' | 'rapid' | 'classical';
  onMatchFound: (match: Room) => void;
  onBack: () => void;
}

export default function Matchmaking({ playerName, playerElo, timeControl, onMatchFound, onBack }: MatchmakingProps) {
  const [isSearching, setIsSearching] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [playersInQueue, setPlayersInQueue] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState(0);
  const [searchTime, setSearchTime] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Connect to socket server
    const connectToServer = async () => {
      try {
        setIsConnecting(true);
        setError(null);

        // Only connect if not already connected
        if (!socketService.isConnected()) {
          // Generate or retrieve persistent userId
          let userId = localStorage.getItem('chess_user_id');
          if (!userId) {
            userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            localStorage.setItem('chess_user_id', userId);
          }

          console.log('🔌 Connecting with userId:', userId);
          await socketService.connect(userId, playerName);
        }

        // ⚠️ CRITICAL: Listen for game-end event (for reconnection to finished games)
        socketService.onGameEnd((result) => {
          console.log('🏁 [Matchmaking] Received game-end during reconnection:', result);
          // Create a mock match to trigger the game view
          const mockMatch: Room = {
            id: 'reconnection-finished-game',
            players: [
              { id: 'mock-me', name: playerName, elo: playerElo, color: 'white' },
              { id: 'mock-opponent', name: 'Opponent', elo: playerElo, color: 'black' }
            ],
            timeControl: timeControl,
            status: 'finished' as any
          };

          // Store the game result for Home.tsx to pick up
          sessionStorage.setItem('pending_game_result', JSON.stringify(result));

          // Trigger match found to navigate to game view
          onMatchFound(mockMatch);
        });

        // Listen for match found
        socketService.onMatchFound((match) => {
          console.log('🎮 Match found!', match);
          setIsSearching(false);
          onMatchFound(match);
        });

        // Listen for matchmaking progress
        socketService.onMatchmakingProgress((data) => {
          console.log('📊 Matchmaking progress:', data);
          setPlayersInQueue(data.playersInQueue);
          setEstimatedTime(data.estimatedTime);
        });

        setIsConnecting(false);
      } catch (err) {
        console.error('Failed to connect:', err);
        setError('No se pudo conectar al servidor. Por favor intenta de nuevo.');
        setIsConnecting(false);
      }
    };

    connectToServer();

    return () => {
      // Cleanup: Cancel search and remove listeners when component unmounts
      if (isSearching) {
        console.log('🧹 Cleanup: Canceling matchmaking search');
        socketService.cancelMatchmaking().catch(err => console.error('Cancel error:', err));
      }
      // DO NOT disconnect here - connection is managed by parent component
    };
  }, [playerName, onMatchFound, timeControl, playerElo]);

  // Search timer
  useEffect(() => {
    if (!isSearching) {
      setSearchTime(0);
      return;
    }

    const interval = setInterval(() => {
      setSearchTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isSearching]);

  const handleStartSearch = async () => {
    try {
      setIsSearching(true);
      setError(null);
      setSearchTime(0);

      console.log('🔍 Starting matchmaking with ELO:', playerElo, 'Time control:', timeControl);
      const match = await socketService.findMatch(playerElo, timeControl);

      // If match is null, we're in queue waiting
      if (match) {
        console.log('✅ Immediate match found!', match);
        onMatchFound(match);
      } else {
        console.log('⏳ Added to queue, waiting for opponent...');
        // Keep searching state active, will be notified via onMatchFound
      }
    } catch (err: any) {
      console.error('Matchmaking error:', err);
      setError(err.message || 'Error al buscar partida');
      setIsSearching(false);
    }
  };

  const handleCancelSearch = async () => {
    try {
      await socketService.cancelMatchmaking();
      setIsSearching(false);
      setSearchTime(0);
    } catch (err) {
      console.error('Cancel error:', err);
    }
  };

  const handleBack = () => {
    if (isSearching) {
      socketService.cancelMatchmaking();
    }
    socketService.disconnect();
    onBack();
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-4 md:p-8 flex items-center justify-center">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-amber-200 to-amber-500 bg-clip-text text-transparent">
            🌐 Multijugador Online
          </h1>
          <p className="text-slate-400 text-lg">
            Jugador: <span className="text-white font-semibold">{playerName}</span> • ELO: <span className="text-amber-400 font-semibold">{playerElo}</span>
          </p>
          <div className="mt-3">
            <span className={`inline-block px-4 py-2 rounded-lg font-semibold text-sm ${
              timeControl === 'bullet' ? 'bg-gradient-to-r from-red-500 to-orange-500' :
              timeControl === 'blitz' ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
              timeControl === 'rapid' ? 'bg-gradient-to-r from-blue-500 to-cyan-500' :
              'bg-gradient-to-r from-purple-500 to-indigo-500'
            }`}>
              {timeControl === 'bullet' ? '⚡ Bullet' :
               timeControl === 'blitz' ? '⏱️ Blitz' :
               timeControl === 'rapid' ? '🕐 Rapid' :
               '♟️ Clásico'}
            </span>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 bg-red-500/20 border border-red-500 rounded-xl p-4 animate-shake">
            <p className="text-red-400">❌ {error}</p>
          </div>
        )}

        {/* Main Card */}
        <div className="bg-slate-800/50 backdrop-blur border-2 border-slate-700 rounded-3xl p-8 md:p-12">
          {isConnecting ? (
            // Connecting state
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-6 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
              <h2 className="text-2xl font-bold mb-2">Conectando...</h2>
              <p className="text-slate-400">Conectando con el servidor de matchmaking</p>
            </div>
          ) : isSearching ? (
            // Searching state
            <div className="text-center">
              <div className="relative w-32 h-32 mx-auto mb-8">
                <div className="absolute inset-0 border-8 border-amber-500/30 rounded-full"></div>
                <div className="absolute inset-0 border-8 border-transparent border-t-amber-500 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-4xl">🔍</span>
                </div>
              </div>

              <h2 className="text-3xl font-bold mb-4">Buscando Oponente...</h2>

              <div className="space-y-4 mb-8">
                <div className="text-6xl font-bold text-amber-400">
                  {formatTime(searchTime)}
                </div>

                {playersInQueue > 0 && (
                  <p className="text-slate-300">
                    👥 <span className="font-semibold">{playersInQueue}</span> jugadores en cola
                  </p>
                )}

                {estimatedTime > 0 && (
                  <p className="text-slate-400 text-sm">
                    ⏱️ Tiempo estimado: ~{estimatedTime}s
                  </p>
                )}
              </div>

              <div className="bg-blue-500/20 border border-blue-500/50 rounded-xl p-4 mb-6">
                <p className="text-blue-300 text-sm mb-2">
                  🎯 Buscando oponentes con:
                </p>
                <ul className="text-blue-200 text-sm space-y-1">
                  <li>• ELO similar ({playerElo - 200} - {playerElo + 200})</li>
                  <li>• Control de tiempo: <span className="font-semibold">
                    {timeControl === 'bullet' ? '⚡ Bullet (1 min)' :
                     timeControl === 'blitz' ? '⏱️ Blitz (3+2)' :
                     timeControl === 'rapid' ? '🕐 Rapid (10 min)' :
                     '♟️ Clásico (30 min)'}
                  </span></li>
                </ul>
              </div>

              <button
                onClick={handleCancelSearch}
                className="px-8 py-4 bg-red-500/20 hover:bg-red-500/30 border-2 border-red-500 hover:border-red-400 rounded-xl font-semibold transition-all duration-200 hover:scale-105"
              >
                ❌ Cancelar Búsqueda
              </button>
            </div>
          ) : (
            // Idle state
            <div className="text-center">
              <div className="text-8xl mb-8 animate-bounce">⚔️</div>

              <h2 className="text-3xl font-bold mb-4">¿Listo para Jugar?</h2>
              <p className="text-slate-400 mb-8 text-lg">
                Encuentra un oponente de tu nivel y demuestra tus habilidades
              </p>

              <button
                onClick={handleStartSearch}
                disabled={isConnecting}
                className="group relative px-12 py-6 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 rounded-2xl font-bold text-xl transition-all duration-200 hover:scale-105 shadow-lg shadow-amber-500/50 disabled:opacity-50 disabled:cursor-not-allowed mb-6"
              >
                <span className="relative z-10">🎮 Buscar Partida</span>
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-700 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </button>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-slate-900/50 rounded-xl p-4">
                  <div className="text-3xl mb-2">⚡</div>
                  <div className="text-sm font-semibold text-slate-400">Búsqueda Rápida</div>
                  <div className="text-xs text-slate-500 mt-1">Encuentra partida en segundos</div>
                </div>
                <div className="bg-slate-900/50 rounded-xl p-4">
                  <div className="text-3xl mb-2">🎯</div>
                  <div className="text-sm font-semibold text-slate-400">ELO Equilibrado</div>
                  <div className="text-xs text-slate-500 mt-1">Oponentes de tu nivel</div>
                </div>
                <div className="bg-slate-900/50 rounded-xl p-4">
                  <div className="text-3xl mb-2">💬</div>
                  <div className="text-sm font-semibold text-slate-400">Chat en Vivo</div>
                  <div className="text-xs text-slate-500 mt-1">Comunícate con tu rival</div>
                </div>
              </div>

              <div className="bg-blue-500/20 border border-blue-500 rounded-xl p-6">
                <h3 className="font-semibold mb-2 text-blue-400">ℹ️ ¿Cómo funciona el matchmaking?</h3>
                <ul className="text-sm text-slate-300 space-y-1 text-left">
                  <li>• Sistema automático de emparejamiento por ELO y tipo de partida</li>
                  <li>• Busca oponentes con ±200 puntos de diferencia</li>
                  <li>• Solo empareja jugadores con el mismo control de tiempo</li>
                  <li>• Si no hay oponentes cercanos, amplía el rango de ELO</li>
                  <li>• Partidas clasificatorias que afectan tu ranking</li>
                  <li>• Reconexión automática si pierdes conexión</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Back button */}
        <div className="text-center mt-6">
          <button
            onClick={handleBack}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold transition-all"
          >
            ← Volver al Menú
          </button>
        </div>
      </div>
    </div>
  );
}
