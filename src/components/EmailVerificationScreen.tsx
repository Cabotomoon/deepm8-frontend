/**
 * EmailVerificationScreen
 *
 * Shown when a freshly-registered (or unverified) account must confirm its
 * email before continuing. No password or token is stored in localStorage as
 * a credential — the session token only appears after the backend verifies
 * the email (handled by authService.handleAuthRedirect on the return visit).
 */

import { useState } from 'react';
import { loginWithEmail, logout, type AuthResult } from '../services/authService';

interface EmailVerificationScreenProps {
  email: string;
  password?: string; // in-memory only, used to re-check after verifying
  onVerified: (result: AuthResult) => void;
  onBackToAuth: () => void;
}

export default function EmailVerificationScreen({
  email,
  password,
  onVerified,
  onBackToAuth
}: EmailVerificationScreenProps) {
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  // Poll the backend by attempting a login again (works once verified)
  const handleCheck = async () => {
    if (!password) {
      setInfo('Abre el enlace de tu correo y luego vuelve a iniciar sesión.');
      return;
    }
    setBusy(true);
    setInfo(null);
    try {
      const result = await loginWithEmail(email, password);
      if (result.emailVerified) {
        onVerified(result);
      } else {
        setInfo('Tu correo aún no está verificado. Revisa tu bandeja de entrada.');
      }
    } catch (err: any) {
      const code = err?.response?.data?.code || err?.code;
      if (code === 'EMAIL_NOT_VERIFIED') {
        setInfo('Tu correo aún no está verificado. Revisa tu bandeja de entrada.');
      } else {
        setInfo('No se pudo comprobar la verificación. Inténtalo de nuevo en un momento.');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    onBackToAuth();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#07070A] via-[#0F0F17] to-[#07070A] text-white p-4 md:p-8 flex items-center justify-center">
      <div className="max-w-md w-full text-center">
        <div className="text-5xl mb-4">📧</div>
        <h1 className="text-2xl font-bold mb-3">Verifica tu correo electrónico para continuar</h1>
        <p className="text-slate-400 mb-2">
          Enviamos un enlace de verificación a:
        </p>
        <p className="text-blue-300 font-semibold mb-6 break-all">{email}</p>

        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6 space-y-4">
          {info && (
            <div className="bg-blue-500/15 border border-blue-500/40 rounded-lg px-4 py-3 text-sm text-blue-200">
              {info}
            </div>
          )}
          <p className="text-sm text-slate-400">
            Abre el enlace del correo. Cuando lo hayas hecho, vuelve aquí y pulsa el botón.
          </p>
          <button
            onClick={handleCheck}
            disabled={busy}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 disabled:opacity-60 text-white font-bold py-3 rounded-lg transition-all"
          >
            {busy ? 'Comprobando...' : 'Ya verifiqué mi correo'}
          </button>
          <button
            onClick={handleLogout}
            className="w-full text-slate-400 hover:text-white text-sm"
          >
            Cerrar sesión y volver
          </button>
        </div>
      </div>
    </div>
  );
}
