/**
 * AuthScreen — the mandatory entry gate for Deep M8
 *
 * No profile creation, ELO selection, menu or games are reachable until the
 * user authenticates here. Offers:
 *   • Continuar con Google (OAuth via backend proxy)
 *   • Crear cuenta con correo (email + password)
 *   • Iniciar sesión (existing account)
 *
 * All identity work is delegated to authService (backend-backed). This
 * component only handles presentation + input validation.
 */

import React, { useState } from 'react';
import {
  loginWithEmail,
  registerWithEmail,
  startGoogleLogin,
  type AuthResult
} from '../services/authService';

type Mode = 'choice' | 'register' | 'login';

interface AuthScreenProps {
  /** Called with the session once the user is authenticated */
  onAuthenticated: (result: AuthResult) => void;
  /** Called when registration needs email verification before continuing */
  onNeedsVerification: (email: string) => void;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function passwordIssue(pw: string): string | null {
  if (pw.length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
  if (!/[a-zA-Z]/.test(pw) || !/[0-9]/.test(pw)) {
    return 'Incluye al menos una letra y un número.';
  }
  return null;
}

export default function AuthScreen({ onAuthenticated, onNeedsVerification }: AuthScreenProps) {
  const [mode, setMode] = useState<Mode>('choice');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const resetFields = () => {
    setError(null);
    setPassword('');
    setConfirm('');
  };

  const handleGoogle = async () => {
    setBusy(true);
    setError(null);
    try {
      await startGoogleLogin();
      // Redirects away; nothing else to do here.
    } catch (e: any) {
      setBusy(false);
      setError('No se pudo iniciar sesión con Google. Inténtalo de nuevo.');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidEmail(email)) return setError('Introduce un correo válido.');
    if (!password) return setError('Introduce tu contraseña.');
    setBusy(true);
    setError(null);
    try {
      const result = await loginWithEmail(email, password);
      if (!result.emailVerified) {
        onNeedsVerification(email.trim());
        return;
      }
      onAuthenticated(result);
    } catch (err: any) {
      const code = err?.response?.data?.code || err?.code;
      if (code === 'EMAIL_NOT_VERIFIED') {
        onNeedsVerification(email.trim());
      } else if (code === 'INVALID_CREDENTIALS') {
        setError('Correo o contraseña incorrectos.');
      } else {
        setError('No se pudo iniciar sesión. Verifica tus datos e inténtalo de nuevo.');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidEmail(email)) return setError('Introduce un correo válido.');
    const pwIssue = passwordIssue(password);
    if (pwIssue) return setError(pwIssue);
    if (password !== confirm) return setError('Las contraseñas no coinciden.');
    setBusy(true);
    setError(null);
    try {
      const outcome = await registerWithEmail(email, password);
      if (outcome.status === 'authenticated' && outcome.result) {
        onAuthenticated(outcome.result);
      } else if (outcome.status === 'needs-verification') {
        onNeedsVerification(email.trim());
      } else if (outcome.status === 'needs-invite') {
        setError(outcome.message || 'Se requiere un código de invitación para registrarse.');
      } else {
        setError(outcome.message || 'No se pudo crear la cuenta.');
      }
    } catch (err: any) {
      const code = err?.response?.data?.code || err?.code;
      if (code === 'ACCOUNT_EXISTS') {
        setError('Ya existe una cuenta con ese correo. Inicia sesión.');
      } else if (code === 'PASSWORD_TOO_WEAK') {
        setError('La contraseña es demasiado débil. Usa una más segura.');
      } else if (code === 'INVALID_EMAIL') {
        setError('El correo no es válido.');
      } else {
        setError('No se pudo crear la cuenta. Inténtalo de nuevo.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#07070A] via-[#0F0F17] to-[#07070A] text-white p-4 md:p-8 flex items-center justify-center">
      <div className="max-w-md w-full">
        <div className="mb-8 flex flex-col items-center text-center">
          <img
            src="/branding/logo-m8.png"
            alt="DeepM8"
            className="h-28 md:h-36 object-contain mb-4"
            onError={(ev) => { (ev.target as HTMLImageElement).style.display = 'none'; }}
          />
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-200 via-blue-400 to-blue-600 bg-clip-text text-transparent">
            Deep M8
          </h1>
          <p className="text-slate-400 mt-2">Inicia sesión para jugar y guardar tu progreso</p>
        </div>

        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6 sm:p-8">
          {error && (
            <div className="mb-4 bg-red-500/15 border border-red-500/40 rounded-lg px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {mode === 'choice' && (
            <div className="space-y-4">
              <button
                onClick={handleGoogle}
                disabled={busy}
                className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-100 disabled:opacity-60 text-slate-800 font-semibold py-3 rounded-lg transition-all"
              >
                <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                Continuar con Google
              </button>

              <div className="flex items-center gap-3 text-slate-500 text-xs">
                <div className="h-px bg-slate-700 flex-1" /> o <div className="h-px bg-slate-700 flex-1" />
              </div>

              <button
                onClick={() => { resetFields(); setMode('register'); }}
                disabled={busy}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 disabled:opacity-60 text-white font-bold py-3 rounded-lg transition-all"
              >
                Crear cuenta con correo
              </button>

              <p className="text-center text-sm text-slate-400">
                ¿Ya tienes una cuenta?{' '}
                <button
                  onClick={() => { resetFields(); setMode('login'); }}
                  className="text-blue-400 hover:text-blue-300 font-semibold"
                >
                  Iniciar sesión
                </button>
              </p>
            </div>
          )}

          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <h2 className="text-xl font-bold">Crear cuenta</h2>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="Correo electrónico" autoComplete="email"
                className="w-full bg-slate-900/70 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
              />
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Contraseña (mín. 8, letra y número)" autoComplete="new-password"
                className="w-full bg-slate-900/70 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
              />
              <input
                type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                placeholder="Confirmar contraseña" autoComplete="new-password"
                className="w-full bg-slate-900/70 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit" disabled={busy}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 disabled:opacity-60 text-white font-bold py-3 rounded-lg transition-all"
              >
                {busy ? 'Creando...' : 'Crear cuenta'}
              </button>
              <button type="button" onClick={() => { resetFields(); setMode('choice'); }} className="w-full text-slate-400 hover:text-white text-sm">
                ← Volver
              </button>
            </form>
          )}

          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <h2 className="text-xl font-bold">Iniciar sesión</h2>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="Correo electrónico" autoComplete="email"
                className="w-full bg-slate-900/70 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
              />
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Contraseña" autoComplete="current-password"
                className="w-full bg-slate-900/70 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit" disabled={busy}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 disabled:opacity-60 text-white font-bold py-3 rounded-lg transition-all"
              >
                {busy ? 'Entrando...' : 'Iniciar sesión'}
              </button>
              <button type="button" onClick={() => { resetFields(); setMode('choice'); }} className="w-full text-slate-400 hover:text-white text-sm">
                ← Volver
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
