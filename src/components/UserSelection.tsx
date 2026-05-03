import { useState, useEffect } from 'react';

interface UserProfile {
  userId: string;
  name: string;
  email: string;
  avatar?: string;
  eloRating: number;
  totalGames: number;
  wins: number;
  losses: number;
  draws: number;
}

interface UserSelectionProps {
  onSelectUser: (userId: string) => void;
  onCreateNew: () => void;
}

export default function UserSelection({ onSelectUser, onCreateNew }: UserSelectionProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = () => {
    // Load all saved user profiles
    const savedProfiles = localStorage.getItem('chess_local_profiles');
    if (savedProfiles) {
      try {
        const profiles = JSON.parse(savedProfiles);
        console.log('📋 Loaded profiles:', profiles);
        setUsers(profiles);
      } catch (error) {
        console.error('Error loading profiles:', error);
      }
    }
  };

  const handleClearAllData = () => {
    if (confirm('⚠️ ¿ADVERTENCIA: Esto eliminará TODOS los perfiles y datos guardados. ¿Estás seguro?')) {
      localStorage.removeItem('chess_local_profiles');
      localStorage.removeItem('chess_auth_token');
      localStorage.removeItem('chess_user_profile');
      localStorage.removeItem('chess_local_game_history');
      localStorage.removeItem('chess_local_piece_stats');
      localStorage.removeItem('chess_local_leaderboard');
      setUsers([]);
      alert('✅ Todos los datos han sido eliminados');
    }
  };

  const handleSelectUser = (userId: string) => {
    setSelectedUserId(userId);
  };

  const handleContinue = () => {
    if (selectedUserId) {
      onSelectUser(selectedUserId);
    }
  };

  const getWinRate = (user: UserProfile) => {
    if (user.totalGames === 0) return '0.0';
    return ((user.wins / user.totalGames) * 100).toFixed(1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-3 drop-shadow-lg">
            ♔ Chess Clash ♛
          </h1>
          <p className="text-xl text-slate-300">
            Selecciona tu perfil o crea uno nuevo
          </p>
        </div>

        {/* User List */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700 shadow-2xl mb-4">
          {users.length > 0 ? (
            <>
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <span>👤</span>
                Usuarios Existentes
              </h2>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {users.map((user) => (
                  <button
                    key={user.userId}
                    onClick={() => handleSelectUser(user.userId)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 ${
                      selectedUserId === user.userId
                        ? 'bg-blue-600/30 border-blue-500 shadow-lg shadow-blue-500/50'
                        : 'bg-slate-700/50 border-slate-600 hover:bg-slate-700 hover:border-slate-500'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {user.avatar && (
                            <img
                              src={user.avatar}
                              alt={user.name}
                              className="w-10 h-10 rounded-full border-2 border-slate-500"
                            />
                          )}
                          <div>
                            <h3 className="text-lg font-bold text-white">
                              {user.name}
                            </h3>
                            <p className="text-sm text-slate-400">{user.email}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div className="bg-slate-800/50 p-2 rounded">
                            <div className="text-slate-400">ELO</div>
                            <div className="text-yellow-400 font-bold text-lg">
                              {user.eloRating}
                            </div>
                          </div>
                          <div className="bg-slate-800/50 p-2 rounded">
                            <div className="text-slate-400">Partidas</div>
                            <div className="text-white font-bold text-lg">
                              {user.totalGames}
                            </div>
                          </div>
                          <div className="bg-slate-800/50 p-2 rounded">
                            <div className="text-slate-400">V-E-D</div>
                            <div className="text-white font-bold text-lg">
                              {user.wins}-{user.draws}-{user.losses}
                            </div>
                          </div>
                          <div className="bg-slate-800/50 p-2 rounded">
                            <div className="text-slate-400">% Victorias</div>
                            <div className="text-green-400 font-bold text-lg">
                              {getWinRate(user)}%
                            </div>
                          </div>
                        </div>
                      </div>
                      {selectedUserId === user.userId && (
                        <div className="ml-4">
                          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm">✓</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">🎮</div>
              <p className="text-xl text-slate-300 mb-2">
                No hay usuarios registrados
              </p>
              <p className="text-slate-400">
                Crea tu primer perfil para comenzar a jugar
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {users.length > 0 && (
            <button
              onClick={handleContinue}
              disabled={!selectedUserId}
              className={`w-full py-4 rounded-lg font-bold text-lg transition-all duration-200 ${
                selectedUserId
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/50 hover:shadow-xl hover:shadow-blue-500/70'
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }`}
            >
              {selectedUserId ? '✓ Continuar con este usuario' : 'Selecciona un usuario'}
            </button>
          )}
          <button
            onClick={onCreateNew}
            className="w-full py-4 rounded-lg font-bold text-lg bg-green-600 hover:bg-green-700 text-white transition-all duration-200 shadow-lg shadow-green-500/50 hover:shadow-xl hover:shadow-green-500/70"
          >
            ➕ Crear Nuevo Usuario
          </button>
          {users.length > 0 && (
            <button
              onClick={handleClearAllData}
              className="w-full py-3 rounded-lg font-medium text-sm bg-red-600/20 hover:bg-red-600/30 border border-red-500/50 hover:border-red-500 text-red-400 transition-all duration-200"
            >
              🗑️ Limpiar Todos los Datos (Debug)
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-slate-400 text-sm">
          <p>Tus datos se guardan localmente en tu navegador</p>
          {users.length > 0 && (
            <p className="mt-2 text-xs text-slate-500">
              {users.length} {users.length === 1 ? 'perfil guardado' : 'perfiles guardados'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
