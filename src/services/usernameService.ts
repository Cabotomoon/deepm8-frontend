/**
 * Username Service — backend-enforced global uniqueness
 *
 * Usernames are reserved in the SeaVerse Data backend (NOT localStorage), so a
 * name like "JoseChess" is unique across every browser, device and country.
 *
 * Storage model (data-sdk, public table `chess_usernames`):
 *   {
 *     userId: string,               // owner (auth identity, primary link)
 *     username: string,             // display form as chosen
 *     usernameNormalized: string,   // lowercase+trimmed — the uniqueness key
 *     createdAt, updatedAt
 *   }
 *
 * The data-sdk is a document store without a native UNIQUE constraint, so
 * reservation is done as an atomic-ish "query-normalized → claim" sequence
 * with a final re-check to detect races. Records are keyed to the owner via
 * `userId`; a user has at most one username row.
 */

import { DataClient } from '@seaverse/data-sdk';

const TABLE = 'chess_usernames';

let client: DataClient | null = null;

async function getClient(): Promise<DataClient> {
  if (client) return client;
  const isDev = import.meta.env.DEV || window.location.hostname === 'localhost';
  if (isDev) {
    const appId = (import.meta.env.VITE_APP_ID as string) || 'chess-clash-dev-local';
    const token =
      localStorage.getItem('seaverse_token') ||
      localStorage.getItem('chess_auth_token');
    if (!token) throw new Error('NO_TOKEN');
    client = await DataClient.create({ appId, token });
  } else {
    client = await DataClient.create();
  }
  return client;
}

/** Normalize a username to its uniqueness key (lowercase, trimmed) */
export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export interface UsernameRecord {
  id: string;
  userId: string;
  username: string;
  usernameNormalized: string;
  createdAt: string;
  updatedAt: string;
}

/** Validate the shape of a username before touching the backend */
export function validateUsernameFormat(username: string): { ok: boolean; error?: string } {
  const trimmed = username.trim();
  if (trimmed.length < 3) return { ok: false, error: 'El nombre debe tener al menos 3 caracteres.' };
  if (trimmed.length > 20) return { ok: false, error: 'El nombre no puede superar los 20 caracteres.' };
  if (!/^[a-zA-Z0-9_ ]+$/.test(trimmed)) {
    return { ok: false, error: 'Usa solo letras, números, espacios o guion bajo.' };
  }
  return { ok: true };
}

/** Find the username row that owns a normalized name, if any */
async function findByNormalized(normalized: string): Promise<UsernameRecord[]> {
  const c = await getClient();
  const rows = await c.query({
    table_name: TABLE,
    filters: { data: { usernameNormalized: normalized } }
  });
  return (rows as any[]).map(r => ({ id: r.id, ...r.data_value })) as UsernameRecord[];
}

/** Get the username currently owned by a user (backend truth) */
export async function getUsernameForUser(userId: string): Promise<UsernameRecord | null> {
  const c = await getClient();
  const rows = await c.query({
    table_name: TABLE,
    filters: { data: { userId } }
  });
  const list = (rows as any[]).map(r => ({ id: r.id, ...r.data_value }));
  return list.length > 0 ? (list[0] as UsernameRecord) : null;
}

/**
 * Check availability against the backend.
 * Available when no row uses the normalized name, OR the only row is owned
 * by `selfUserId` (so re-submitting your own name is fine).
 */
export async function isUsernameAvailable(
  username: string,
  selfUserId?: string
): Promise<boolean> {
  const normalized = normalizeUsername(username);
  const owners = await findByNormalized(normalized);
  if (owners.length === 0) return true;
  return owners.every(o => o.userId === selfUserId);
}

export interface ReserveResult {
  ok: boolean;
  error?: string;
  record?: UsernameRecord;
}

/**
 * Atomically reserve (or rename to) a username for a user.
 * Query-then-claim with a post-write re-check to catch concurrent claims.
 */
export async function reserveUsername(
  userId: string,
  username: string
): Promise<ReserveResult> {
  const format = validateUsernameFormat(username);
  if (!format.ok) return { ok: false, error: format.error };

  const display = username.trim();
  const normalized = normalizeUsername(display);
  const c = await getClient();

  // 1. Pre-check: is it taken by someone else?
  const taken = await findByNormalized(normalized);
  const otherOwner = taken.find(o => o.userId !== userId);
  if (otherOwner) return { ok: false, error: 'Ese nombre ya está en uso. Elige otro.' };

  // 2. Does this user already own a username row? (rename path)
  const existing = await getUsernameForUser(userId);
  const now = new Date().toISOString();

  if (existing) {
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

  // 3. Post-write re-check for races: if another user grabbed the same
  //    normalized name, the earliest createdAt wins.
  const after = await findByNormalized(normalized);
  if (after.length > 1) {
    const sorted = [...after].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const winner = sorted[0];
    if (winner.userId !== userId) {
      return { ok: false, error: 'Ese nombre acaba de ser reservado por otra persona. Elige otro.' };
    }
  }

  const record = await getUsernameForUser(userId);
  return { ok: true, record: record || undefined };
}

