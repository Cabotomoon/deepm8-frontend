/**
 * Multiplayer Lobby Component
 *
 * Features:
 * - View available game rooms
 * - Create new room
 * - Join existing room
 * - Real-time room updates
 * - Player count and ELO display
 */

import { useState, useEffect } from 'react';
import { socketService } from '../services/socketService';
import type { Room } from '../types/socket.types';

interface MultiplayerLobbyProps {
  playerName: string;
  playerElo: number;
  onRoomJoined: (room: Room) => void;
  onBack: () => void;
}

export default function MultiplayerLobby({ playerName, playerElo, onRoomJoined, onBack }: MultiplayerLobbyProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    // Connect to socket server
    const connectAndLoadRooms = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Connect to WebSocket server
        await socketService.connect(Date.now().toString(), playerName);

        // Load available rooms
        const availableRooms = await socketService.getRooms();
        setRooms(availableRooms);
      } catch (err) {
        console.error('Failed to connect or load rooms:', err);
        setError('No se pudo conectar al servidor. Por favor intenta de nuevo.');
      } finally {
        setIsLoading(false);
      }
    };

    connectAndLoadRooms();

    // Refresh rooms every 5 seconds
    const interval = setInterval(async () => {
      try {
        const availableRooms = await socketService.getRooms();
        setRooms(availableRooms);
      } catch (err) {
        console.error('Failed to refresh rooms:', err);
      }
    }, 5000);

    return () => {
      clearInterval(interval);
    };
  }, [playerName]);

  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) {
      setError('Por favor ingresa un nombre para la sala');
      return;
    }

    try {
      setIsCreating(true);
      setError(null);

      const room = await socketService.createRoom(newRoomName.trim(), playerElo);
      onRoomJoined(room);
    } catch (err: any) {
      setError(err.message || 'Error al crear la sala');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinRoom = async (roomId: string) => {
    try {
      setIsConnecting(true);
      setError(null);

      const room = await socketService.joinRoom(roomId, playerElo);
      onRoomJoined(room);
    } catch (err: any) {
      setError(err.message || 'Error al unirse a la sala');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleBack = () => {
    socketService.disconnect();
    onBack();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-amber-200 to-amber-500 bg-clip-text text-transparent">
              🌐 Multijugador Online
            </h1>
            <p className="text-slate-400 mt-2">
              Jugador: <span className="text-white font-semibold">{playerName}</span> • ELO: <span className="text-amber-400 font-semibold">{playerElo}</span>
            </p>
          </div>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold transition-all"
          >
            ← Volver
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 bg-red-500/20 border border-red-500 rounded-xl p-4">
            <p className="text-red-400">❌ {error}</p>
          </div>
        )}

        {/* Create Room Section */}
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4 text-amber-400">➕ Crear Nueva Sala</h2>
          <div className="flex gap-4">
            <input
              type="text"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateRoom()}
              placeholder="Nombre de la sala (ej: 'Partida Rápida')"
              className="flex-1 px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg focus:outline-none focus:border-amber-500 text-white placeholder-slate-500"
              disabled={isCreating}
              maxLength={30}
            />
            <button
              onClick={handleCreateRoom}
              disabled={isCreating || !newRoomName.trim()}
              className={`px-8 py-3 rounded-lg font-semibold transition-all ${
                isCreating || !newRoomName.trim()
                  ? 'bg-slate-600 cursor-not-allowed'
                  : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 hover:scale-105'
              }`}
            >
              {isCreating ? '⏳ Creando...' : '🎮 Crear Sala'}
            </button>
          </div>
        </div>

        {/* Available Rooms Section */}
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-amber-400">🎲 Salas Disponibles</h2>
            {isLoading && (
              <div className="flex items-center gap-2 text-blue-400">
                <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                Cargando...
              </div>
            )}
          </div>

          {/* Rooms Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rooms.length === 0 && !isLoading && (
              <div className="col-span-full text-center py-12">
                <div className="text-6xl mb-4">🎮</div>
                <p className="text-slate-400 text-lg">No hay salas disponibles</p>
                <p className="text-slate-500 text-sm mt-2">¡Crea una nueva sala para comenzar!</p>
              </div>
            )}

            {rooms.map((room) => (
              <div
                key={room.id}
                className="bg-slate-900/50 border border-slate-600 rounded-xl p-6 hover:border-amber-500 transition-all"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-2">{room.name}</h3>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">Estado:</span>
                        <span className={`font-semibold ${
                          room.status === 'waiting' ? 'text-green-400' :
                          room.status === 'playing' ? 'text-yellow-400' :
                          'text-slate-400'
                        }`}>
                          {room.status === 'waiting' ? '🟢 Esperando' :
                           room.status === 'playing' ? '🟡 Jugando' :
                           '⚪ Finalizado'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">Jugadores:</span>
                        <span className="text-white font-semibold">{room.players.length}/2</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Players */}
                <div className="mb-4 space-y-2">
                  {room.players.map((player, idx) => (
                    <div key={player.id} className="flex items-center gap-2 text-sm">
                      <span className="text-2xl">{player.color === 'white' ? '♔' : '♚'}</span>
                      <span className="text-slate-300">{player.name}</span>
                      <span className="text-amber-400 font-semibold">({player.elo} ELO)</span>
                      {!player.connected && <span className="text-red-400">🔴 Desconectado</span>}
                    </div>
                  ))}
                  {room.players.length === 1 && (
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <span className="text-2xl">⏳</span>
                      <span>Esperando oponente...</span>
                    </div>
                  )}
                </div>

                {/* Join Button */}
                {room.status === 'waiting' && room.players.length < 2 && (
                  <button
                    onClick={() => handleJoinRoom(room.id)}
                    disabled={isConnecting}
                    className={`w-full py-3 rounded-lg font-semibold transition-all ${
                      isConnecting
                        ? 'bg-slate-600 cursor-not-allowed'
                        : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 hover:scale-[1.02]'
                    }`}
                  >
                    {isConnecting ? '⏳ Uniéndose...' : '🎯 Unirse a la Sala'}
                  </button>
                )}

                {room.status === 'playing' && (
                  <div className="w-full py-3 rounded-lg bg-yellow-500/20 border border-yellow-500/50 text-yellow-400 text-center font-semibold">
                    ⏳ Partida en curso
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-blue-500/20 border border-blue-500 rounded-xl p-6">
          <h3 className="font-semibold mb-2 text-blue-400">ℹ️ ¿Cómo funciona?</h3>
          <ul className="text-sm text-slate-300 space-y-1">
            <li>• Crea una sala o únete a una existente</li>
            <li>• Juega en tiempo real contra oponentes de todo el mundo</li>
            <li>• Tu ELO subirá o bajará según el resultado de la partida</li>
            <li>• Si te desconectas, puedes reconectarte automáticamente</li>
            <li>• Usa el chat para comunicarte con tu oponente</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
