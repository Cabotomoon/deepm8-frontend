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
    <div className="min-h-screen bg-gradient-to-br from-[#07070A] via-[#0F0F17] to-[#07070A] flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <img
              src="/branding/logo-m8.png"
              alt="DeepM8"
              className="h-28 md:h-36 object-contain"
            />
          </div>
          <p className="text-xl text-slate-300">
            Selecciona tu perfil o crea uno nuevo
          </p>
        </div>

        {/* User List */}
        <div className="bg-[#181825] backdrop-blur-sm rounded-xl p-6 border border-white/6 shadow-[0_8px_32px_rgba(0,0,0,0.6)] mb-4">
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
                        ? 'bg-purple-600/30 border-purple-500 shadow-lg shadow-purple-500/50'
                        : 'bg-[#12121A] border-white/6 hover:bg-[#1E1E2E] hover:border-white/12'
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
              className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-200 ${
                selectedUserId
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg shadow-purple-500/50 hover:shadow-xl hover:shadow-purple-500/70'
                  : 'bg-[#12121A] border border-white/6 text-slate-500 cursor-not-allowed'
              }`}
            >
              {selectedUserId ? '✓ Continuar con este usuario' : 'Selecciona un usuario'}
            </button>
          )}
          <button
            onClick={onCreateNew}
            className="w-full py-4 rounded-xl font-bold text-lg bg-green-600 hover:bg-green-700 text-white transition-all duration-200 shadow-lg shadow-green-500/50 hover:shadow-xl hover:shadow-green-500/70"
          >
            ➕ Crear Nuevo Usuario
          </button>
          {users.length > 0 && (
            <button
              onClick={handleClearAllData}
              className="w-full py-3 rounded-xl font-medium text-sm bg-red-600/20 hover:bg-red-600/30 border border-red-500/50 hover:border-red-500 text-red-400 transition-all duration-200"
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
