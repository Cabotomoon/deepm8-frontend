/**
 * Username Service — globally unique player names
 *
 * Source of truth for uniqueness is the DeepM8 Express backend
 * (POST /api/users/check-username, POST /api/users/set-username).
 *
 * SeaVerse `chess_usernames` is kept as a compatibility fallback so players
 * who already reserved a name there are not asked again.
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

async function findByNormalized(normalized: string): Promise<UsernameRecord[]> {
  try {
    const c = await getClient();
    const rows = await c.query({
      table_name: TABLE,
      filters: { data: { usernameNormalized: normalized } }
    });
    return (rows as any[]).map(r => ({ id: r.id, ...r.data_value })) as UsernameRecord[];
  } catch {
    return [];
  }
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

async function syncToExpress(userId: string, username: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/api/users/set-username`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, username })
    });
  } catch {
    // Best-effort mirror; uniqueness already held in SeaVerse
  }
}

/** Get the username currently owned by a user (Express first, SeaVerse fallback). */
export async function getUsernameForUser(userId: string): Promise<UsernameRecord | null> {
  try {
    const res = await fetch(`${API_BASE}/api/users/username?userId=${encodeURIComponent(userId)}`);
    if (res.ok) {
      const data = await res.json();
      if (data?.username && data.record) return data.record as UsernameRecord;
      if (data?.username) {
        return {
          userId,
          username: data.username,
          usernameNormalized: normalizeUsername(data.username),
          createdAt: '',
          updatedAt: ''
        };
      }
    }
  } catch (err) {
    console.warn('[usernameService] Express lookup failed, trying SeaVerse:', err);
  }

  const legacy = await getSeaverseUsername(userId);
  if (legacy?.username) {
    void syncToExpress(userId, legacy.username);
    return legacy;
  }
  return null;
}

/**
 * Check availability against Express (authoritative) and SeaVerse (legacy).
 * Available when no row uses the normalized name, OR the only owner is `selfUserId`.
 */
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
    if (res.ok) {
      const data = await res.json();
      if (data.available === false) return false;
    } else {
      throw new Error(`check-username ${res.status}`);
    }
  } catch (err) {
    console.error('[usernameService] check-username failed:', err);
    throw err;
  }

  const owners = await findByNormalized(normalizeUsername(username));
  if (owners.length === 0) return true;
  return owners.every(o => o.userId === selfUserId);
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
