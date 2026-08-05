/**
 * SeaVerse Auth Client (centralized, backend-backed)
 *
 * Single source of truth for identity. Wraps @seaverse/auth-sdk's
 * SeaVerseBackendAPIClient so the rest of the app never talks to the SDK
 * directly. All authentication (email/password, Google OAuth, email
 * verification, session restore) is handled by the SeaVerse backend — NOT
 * by localStorage.
 *
 * localStorage is used ONLY to cache the issued session token so the page
 * can be reopened without re-authenticating; the token is always validated
 * against the backend via getCurrentUser() before it is trusted.
 */

import { SeaVerseBackendAPIClient, type User } from '@seaverse/auth-sdk';

/** localStorage keys (token cache only — never identity source of truth) */
export const AUTH_TOKEN_KEY = 'chess_auth_token';
export const SEAVERSE_TOKEN_KEY = 'seaverse_token';

let client: SeaVerseBackendAPIClient | null = null;

/** Resolve the configured application id */
function getAppId(): string {
  return (import.meta.env.VITE_APP_ID as string) || 'chess-clash-dev-local';
}

/** Lazily construct the backend client (environment auto-detected) */
export function getAuthClient(): SeaVerseBackendAPIClient {
  if (client) return client;
  client = new SeaVerseBackendAPIClient({ appId: getAppId() });
  // Re-apply any cached token so authenticated calls work immediately
  const cached = localStorage.getItem(AUTH_TOKEN_KEY);
  if (cached) client.setToken(cached);
  return client;
}

/** True when the app is embedded in a SeaVerse iframe */
export function isInIframe(): boolean {
  return SeaVerseBackendAPIClient.isInIframe();
}

/**
 * Persist the issued session token so the data-sdk (which reads
 * `seaverse_token` / `chess_auth_token`) and future page loads can reuse it.
 * The token is a cache, never the identity source of truth.
 */
export function persistToken(token: string): void {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(SEAVERSE_TOKEN_KEY, token);
  getAuthClient().setToken(token);
}

/** Remove the cached session token (logout). Player data is left intact. */
export function clearToken(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(SEAVERSE_TOKEN_KEY);
}

/** Read the cached session token, if any */
export function getCachedToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export { type User };
