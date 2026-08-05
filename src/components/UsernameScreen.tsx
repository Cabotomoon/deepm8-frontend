/**
 * UsernameScreen — "Elige tu nombre de jugador"
 *
 * Shown after the first successful authentication when the user has no
 * username yet. The name is mandatory and globally unique; uniqueness is
 * validated and reserved in the backend (usernameService), never localStorage.
 */

import React, { useState } from 'react';
import {
  validateUsernameFormat,
  isUsernameAvailable,
  reserveUsername
} from '../services/usernameService';

interface UsernameScreenProps {
  userId: string;
  /** Called once a username has been reserved successfully in the backend */
  onReserved: (username: string) => void;
  /** Optional prefill (e.g. from the account email) */
  suggestion?: string;
}

export default function UsernameScreen({ userId, onReserved, suggestion }: UsernameScreenProps) {
  const [username, setUsername] = useState(suggestion || '');
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const fmt = validateUsernameFormat(username);
    if (!fmt.ok) return setError(fmt.error!);

    setBusy(true);
    try {
      // Backend availability pre-check for a friendly message
      setChecking(true);
      const available = await isUsernameAvailable(username, userId);
      setChecking(false);
      if (!available) {
        setBusy(false);
        return setError('Ese nombre ya está en uso. Elige otro.');
      }

      // Atomic reservation (authoritative)
      const res = await reserveUsername(userId, username);
      if (!res.ok) {
        setBusy(false);
        return setError(res.error || 'No se pudo reservar el nombre. Inténtalo de nuevo.');
      }
      onReserved(res.record?.username || username.trim());
    } catch (err: any) {
      setChecking(false);
      setBusy(false);
      if (err?.message === 'NO_TOKEN') {
        setError('Tu sesión expiró. Vuelve a iniciar sesión.');
      } else {
        setError('No se pudo validar el nombre. Revisa tu conexión e inténtalo de nuevo.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#07070A] via-[#0F0F17] to-[#07070A] text-white p-4 md:p-8 flex items-center justify-center">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">♟️</div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-200 via-blue-400 to-blue-600 bg-clip-text text-transparent">
            Elige tu nombre de jugador
          </h1>
          <p className="text-slate-400 mt-2">
            Será tu identidad pública en Deep M8 y es único en todo el mundo.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6 sm:p-8 space-y-4">
          {error && (
            <div className="bg-red-500/15 border border-red-500/40 rounded-lg px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="Ej. JoseChess"
            maxLength={20}
            autoFocus
            className="w-full bg-slate-900/70 border border-slate-700 rounded-lg px-4 py-3 text-white text-lg focus:outline-none focus:border-blue-500"
          />
          <p className="text-xs text-slate-500">
            3–20 caracteres. Letras, números, espacios o guion bajo.
          </p>
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 disabled:opacity-60 text-white font-bold py-3 rounded-lg transition-all"
          >
            {checking ? 'Comprobando disponibilidad...' : busy ? 'Reservando...' : 'Continuar'}
          </button>
        </form>
      </div>
    </div>
  );
}
