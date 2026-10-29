/**
 * UsernameScreen — "Elige tu nombre de jugador"
 *
 * Mandatory step after authentication when the user has no reserved chess
 * username yet. Availability is checked live against Express
 * (POST /api/users/check-username) with a debounce.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  validateUsernameFormat,
  isUsernameAvailable,
  reserveUsername
} from '../services/usernameService';

interface UsernameScreenProps {
  userId: string;
  onReserved: (username: string) => void;
  suggestion?: string;
}

type Availability = 'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'error';

const DEBOUNCE_MS = 450;

export default function UsernameScreen({ userId, onReserved, suggestion }: UsernameScreenProps) {
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [availability, setAvailability] = useState<Availability>('idle');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    const raw = username;
    const fmt = validateUsernameFormat(raw);

    if (!raw.trim()) {
      setAvailability('idle');
      setStatusMessage(null);
      setError(null);
      return;
    }

    if (!fmt.ok) {
      setAvailability('invalid');
      setStatusMessage(fmt.error || null);
      setError(null);
      return;
    }

    setAvailability('checking');
    setStatusMessage('Comprobando disponibilidad…');
    setError(null);

    const id = ++requestId.current;
    const timer = window.setTimeout(async () => {
      try {
        const available = await isUsernameAvailable(raw, userId);
        if (id !== requestId.current) return;
        if (available) {
          setAvailability('available');
          setStatusMessage('Este nombre está disponible');
        } else {
          setAvailability('taken');
          setStatusMessage('Ese nombre ya está en uso. Elige otro.');
        }
      } catch {
        if (id !== requestId.current) return;
        setAvailability('error');
        setStatusMessage('No se pudo comprobar el nombre. Revisa tu conexión.');
      }
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [username, userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const fmt = validateUsernameFormat(username);
    if (!fmt.ok) return setError(fmt.error!);
    if (availability !== 'available') return;

    setBusy(true);
    try {
      const stillFree = await isUsernameAvailable(username, userId);
      if (!stillFree) {
        setBusy(false);
        setAvailability('taken');
        setStatusMessage('Ese nombre ya está en uso. Elige otro.');
        return;
      }

      const res = await reserveUsername(userId, username);
      if (!res.ok) {
        setBusy(false);
        setAvailability('taken');
        return setError(res.error || 'No se pudo reservar el nombre. Inténtalo de nuevo.');
      }
      onReserved(res.record?.username || username.trim());
    } catch (err: any) {
      setBusy(false);
      if (err?.message === 'NO_TOKEN') {
        setError('Tu sesión expiró. Vuelve a iniciar sesión.');
      } else {
        setError('No se pudo guardar el nombre. Revisa tu conexión e inténtalo de nuevo.');
      }
    }
  };

  const canSubmit = availability === 'available' && !busy && !!userId;
  const ringClass =
    availability === 'available'
      ? 'border-emerald-400/70 focus:border-emerald-400'
      : availability === 'taken' || availability === 'invalid'
        ? 'border-rose-400/70 focus:border-rose-400'
        : 'border-white/10 focus:border-violet-400';

  return (
    <div className="min-h-screen bg-[#07070A] text-white flex items-center justify-center p-4 md:p-8 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(124,58,237,0.18),_transparent_55%),radial-gradient(ellipse_at_bottom,_rgba(37,99,235,0.12),_transparent_50%)]" />

      <div className="relative w-full max-w-md">
        <div className="rounded-3xl border border-white/10 bg-[#12121A]/90 backdrop-blur-xl shadow-[0_24px_80px_rgba(0,0,0,0.55)] p-6 sm:p-8">
          <div className="text-center mb-7">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 text-2xl shadow-lg shadow-violet-500/30">
              ♟
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-200 via-blue-200 to-violet-400 bg-clip-text text-transparent">
              Elige tu nombre de jugador
            </h1>
            <p className="text-slate-400 mt-2 text-sm leading-relaxed">
              Este será tu identidad pública en Deep M8. Es único y no se puede saltar.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-rose-500/15 border border-rose-500/40 rounded-xl px-4 py-3 text-sm text-rose-200">
                {error}
              </div>
            )}

            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder={suggestion || 'Ej. JoseChess'}
              maxLength={20}
              autoFocus
              autoComplete="username"
              className={`w-full bg-[#07070A]/80 border rounded-xl px-4 py-3.5 text-white text-lg placeholder:text-slate-600 focus:outline-none transition-colors ${ringClass}`}
            />

            <div className="flex items-start justify-between gap-3 min-h-[1.5rem]">
              <p
                className={`text-xs ${
                  availability === 'available'
                    ? 'text-emerald-400'
                    : availability === 'taken' || availability === 'invalid'
                      ? 'text-rose-300'
                      : availability === 'checking'
                        ? 'text-violet-300'
                        : 'text-slate-500'
                }`}
              >
                {availability === 'checking' && (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" />
                    {statusMessage}
                  </span>
                )}
                {availability !== 'checking' && (statusMessage || '3–20 caracteres. Letras, números, espacios o guion bajo.')}
              </p>
              <span className="text-xs text-slate-600 tabular-nums">{username.trim().length}/20</span>
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full bg-gradient-to-r from-violet-500 to-blue-500 hover:from-violet-400 hover:to-blue-400 disabled:opacity-40 disabled:hover:from-violet-500 disabled:hover:to-blue-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-violet-500/20"
            >
              {busy ? 'Guardando…' : 'Continuar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
