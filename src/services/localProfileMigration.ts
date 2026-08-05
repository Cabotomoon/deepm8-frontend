/**
 * Local Profile Migration
 *
 * Existing users created before backend authentication have profiles stored
 * under `chess_local_profiles`, keyed by a `local_...` guest userId. When such
 * a user signs in with a real account for the first time, we OFFER to adopt
 * their most recent local profile (ELO, W/L/D, games) under the new backend
 * userId — WITHOUT deleting the original local data.
 *
 * This is non-destructive and idempotent:
 *   • Legacy local data is never removed.
 *   • Migration only runs when the authenticated user has NO backend profile.
 *   • A per-user flag prevents repeat prompts.
 */

import type { UserProfile } from './dataService';

const LOCAL_PROFILES_KEY = 'chess_local_profiles';
const MIGRATION_FLAG_PREFIX = 'chess_migrated_'; // + userId

interface StoredProfile extends UserProfile {}

function readLocalProfiles(): StoredProfile[] {
  try {
    const raw = localStorage.getItem(LOCAL_PROFILES_KEY);
    return raw ? (JSON.parse(raw) as StoredProfile[]) : [];
  } catch {
    return [];
  }
}

/** Legacy profiles are those created by the old local-guest flow */
function isLegacy(p: StoredProfile): boolean {
  return typeof p.userId === 'string' && p.userId.startsWith('local_');
}

/** True when there is a legacy local profile worth importing */
export function hasMigratableProfile(): boolean {
  return readLocalProfiles().some(p => isLegacy(p) && (p.totalGames > 0 || p.eloRating !== p.initialElo));
}

/** Return the most relevant legacy profile (most games, else most recent) */
export function getBestLegacyProfile(): StoredProfile | null {
  const legacy = readLocalProfiles().filter(isLegacy);
  if (legacy.length === 0) return null;
  return [...legacy].sort((a, b) => {
    if (b.totalGames !== a.totalGames) return b.totalGames - a.totalGames;
    return (b.updatedAt || '').localeCompare(a.updatedAt || '');
  })[0];
}

/** Whether we've already handled migration for this backend user */
export function isMigrationDone(userId: string): boolean {
  return localStorage.getItem(MIGRATION_FLAG_PREFIX + userId) === '1';
}

/** Mark migration handled (whether adopted or declined) so we don't re-prompt */
export function markMigrationDone(userId: string): void {
  localStorage.setItem(MIGRATION_FLAG_PREFIX + userId, '1');
}

/**
 * Build a new profile payload that carries over a legacy profile's rating and
 * record under the authenticated identity. The caller persists it via the
 * normal profile-creation path (so the userId link is correct).
 */
export function buildMigratedStats(legacy: StoredProfile): {
  initialElo: number;
  carry: Pick<UserProfile, 'eloRating' | 'totalGames' | 'wins' | 'losses' | 'draws'>;
} {
  return {
    initialElo: legacy.initialElo,
    carry: {
      eloRating: legacy.eloRating,
      totalGames: legacy.totalGames,
      wins: legacy.wins,
      losses: legacy.losses,
      draws: legacy.draws
    }
  };
}
