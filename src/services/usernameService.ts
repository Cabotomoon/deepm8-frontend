/**
 * Username Service — globally unique player names
 *
 * Routing and uniqueness are decided ONLY by the DeepM8 Express store
 * (`usernames.json` via GET/POST /api/users/...).
 * SeaVerse identity (Google display name, email local-part) is never treated
 * as a reserved chess username.
 */

import { DataClient } from '@seaverse/data-sdk';
import { config } from '../config';

const TABLE = 'chess_usernames';
const API_BASE = config.backendUrl.replace(/\/$/, '');

let client: DataClient | null = null;

async function getClient(): Promise<DataClient> {
  if (client) return client;

  const appId = (import.meta.env.VITE_APP_ID as string) || 'app-1775782200629-2f60caf6';
  const token =
    localStorage.getItem('seaverse_token') ||
    localStorage.getItem('chess_auth_token');

  if (!token) throw new Error('NO_TOKEN: No se encontró token de autenticación');

  client = await DataClient.create({ appId, token });
  return client;
}

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export interface UsernameRecord {
  id?: string;
  userId: string;
  username: string;
  usernameNormalized: string;
  createdAt: string;
  updatedAt: string;
}

export function validateUsernameFormat(username: string): { ok: boolean; error?: string } {
  const trimmed = username.trim();
  if (trimmed.length < 3) return { ok: false, error: 'El nombre debe tener al menos 3 caracteres.' };
  if (trimmed.length > 20) return { ok: false, error: 'El nombre no puede superar los 20 caracteres.' };
  if (!/^[a-zA-Z0-9_ ]+$/.test(trimmed)) {
    return { ok: false, error: 'Usa solo letras, números, espacios o guion bajo.' };
  }
  return { ok: true };
}

async function getSeaverseUsername(userId: string): Promise<UsernameRecord | null> {
  try {
    const c = await getClient();
    const rows = await c.query({
      table_name: TABLE,
      filters: { data: { userId } }
    });
    const list = (rows as any[]).map(r => ({ id: r.id, ...r.data_value })) as UsernameRecord[];
    return list.length > 0 ? list[0] : null;
  } catch {
    return null;
  }
}

const CONFIRMED_USERNAME_KEY_PREFIX = 'deepm8_confirmed_username:';

/**
 * Last username the Express server confirmed for this user, kept only as a
 * fallback while the server is unreachable. It is never an authority: it is
 * refreshed on every confirmed lookup / reservation and cleared when the
 * server confirms the user has no username.
 */
export function getCachedConfirmedUsername(userId: string): string | null {
  if (!userId) return null;
  try {
    const v = localStorage.getItem(CONFIRMED_USERNAME_KEY_PREFIX + userId);
    return v && v.trim() ? v.trim() : null;
  } catch {
    return null;
  }
}

function setCachedConfirmedUsername(userId: string, username: string | null): void {
  if (!userId) return;
  try {
    const key = CONFIRMED_USERNAME_KEY_PREFIX + userId;
    if (username) localStorage.setItem(key, username);
    else localStorage.removeItem(key);
  } catch {
    // storage unavailable: the cache is optional
  }
}

/** Max wait for the username lookup before the server is treated as unreachable. */
const USERNAME_LOOKUP_TIMEOUT_MS = 8000;

/**
 * Answer of the Express store to "does this user own a chess username?".
 *
 *  - found:       the server returned a reserved username.
 *  - none:        the server answered 200 and explicitly said there is none.
 *                 This is the ONLY state that means "user has no username".
 *  - unavailable: network error, timeout, non-2xx status or an unexpected body.
 *                 It says nothing about the user's username, so callers must
 *                 NOT treat it as "no username".
 */
export type UsernameLookup =
  | { status: 'found'; username: string }
  | { status: 'none' }
  | { status: 'unavailable'; reason: 'network' | 'timeout' | 'http' | 'invalid' };

/**
 * Lookup the reserved chess username in Express / usernames.json
 * (GET /api/users/username). Never throws; see UsernameLookup for the states.
 */
export async function fetchRegisteredUsername(
  userId: string,
  timeoutMs: number = USERNAME_LOOKUP_TIMEOUT_MS
): Promise<UsernameLookup> {
  if (!userId) return { status: 'unavailable', reason: 'invalid' };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(
      `${API_BASE}/api/users/username?userId=${encodeURIComponent(userId)}`,
      { headers: { Accept: 'application/json' }, signal: controller.signal }
    );

    if (!res.ok) {
      console.warn('[usernameService] Express username lookup HTTP', res.status);
      return { status: 'unavailable', reason: 'http' };
    }

    let data: unknown;
    try {
      data = await res.json();
    } catch {
      console.warn('[usernameService] Express username lookup: invalid JSON');
      return { status: 'unavailable', reason: 'invalid' };
    }

    // The server answers { username: null } when the user has no username.
    // Anything that is not that exact shape is an invalid response.
    if (!data || typeof data !== 'object' || !('username' in data)) {
      console.warn('[usernameService] Express username lookup: unexpected response');
      return { status: 'unavailable', reason: 'invalid' };
    }

    const value = (data as { username?: unknown }).username;
    if (value === null) {
      setCachedConfirmedUsername(userId, null);
      return { status: 'none' };
    }
    if (typeof value === 'string' && value.trim()) {
      setCachedConfirmedUsername(userId, value.trim());
      return { status: 'found', username: value.trim() };
    }

    console.warn('[usernameService] Express username lookup: unexpected username value');
    return { status: 'unavailable', reason: 'invalid' };
  } catch (err) {
    const timedOut = controller.signal.aborted;
    console.warn(
      timedOut
        ? '[usernameService] Express username lookup timed out'
        : '[usernameService] Express username lookup failed:',
      timedOut ? '' : err
    );
    return { status: 'unavailable', reason: timedOut ? 'timeout' : 'network' };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Get the username currently owned by a user (Express / usernames.json only).
 * Returns null only when the server confirms there is none. Throws when the
 * server cannot be reached, so an outage is never confused with "no username".
 */
export async function getUsernameForUser(userId: string): Promise<UsernameRecord | null> {
  const lookup = await fetchRegisteredUsername(userId);
  if (lookup.status === 'unavailable') {
    throw new Error(`USERNAME_LOOKUP_UNAVAILABLE: ${lookup.reason}`);
  }
  if (lookup.status === 'none') return null;
  return {
    userId,
    username: lookup.username,
    usernameNormalized: normalizeUsername(lookup.username),
    createdAt: '',
    updatedAt: ''
  };
}

/** Check availability against Express / usernames.json only. */
export async function isUsernameAvailable(
  username: string,
  selfUserId?: string
): Promise<boolean> {
  const format = validateUsernameFormat(username);
  if (!format.ok) return false;

  try {
    const res = await fetch(`${API_BASE}/api/users/check-username`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, userId: selfUserId })
    });
    if (!res.ok) throw new Error(`check-username ${res.status}`);
    const data = await res.json();
    return data.available === true;
  } catch (err) {
    console.error('[usernameService] check-username failed:', err);
    throw err;
  }
}

export interface ReserveResult {
  ok: boolean;
  error?: string;
  record?: UsernameRecord;
}

export async function reserveUsername(
  userId: string,
  username: string
): Promise<ReserveResult> {
  const format = validateUsernameFormat(username);
  if (!format.ok) return { ok: false, error: format.error };

  try {
    const res = await fetch(`${API_BASE}/api/users/set-username`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, username })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok === false) {
      return {
        ok: false,
        error: data.message || data.error || 'No se pudo reservar el nombre. Inténtalo de nuevo.'
      };
    }

    const record: UsernameRecord = data.record || {
      userId,
      username: data.username || username.trim(),
      usernameNormalized: normalizeUsername(data.username || username),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setCachedConfirmedUsername(userId, record.username);

    // Mirror into SeaVerse so older clients still see the reservation
    try {
      const c = await getClient();
      const existing = await getSeaverseUsername(userId);
      const now = new Date().toISOString();
      const display = record.username;
      const normalized = record.usernameNormalized;
      if (existing?.id) {
        await c.update(existing.id, {
          visibility: 'public',
          data_value: {
            userId,
            username: display,
            usernameNormalized: normalized,
            createdAt: existing.createdAt,
            updatedAt: now
          }
        });
      } else {
        await c.create({
          table_name: TABLE,
          visibility: 'public',
          data_value: {
            userId,
            username: display,
            usernameNormalized: normalized,
            createdAt: now,
            updatedAt: now
          }
        });
      }
    } catch (mirrorErr) {
      console.warn('[usernameService] SeaVerse mirror skipped:', mirrorErr);
    }

    return { ok: true, record };
  } catch (error: any) {
    console.error('[reserveUsername] Error:', error);
    throw error;
  }
}
