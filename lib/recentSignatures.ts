const STORAGE_KEY = 'kysoqr.recentSignatures';
const MAX_ENTRIES = 5;

export interface RecentSignature {
  /** orgIdSigned, e.g. "kysoqr.com#8F2K-4T7Q" -- used for the signing-round lookup popup. */
  code: string;
  /** Document name at signing time, for display in the list. */
  name: string;
  /** ISO timestamp, for display/sort. */
  signedAt: string;
  /** CAS's ~5-use, ~1-day download token -- undefined once we know it's unusable
   * (kept simple: caller only omits it, we never separately track "spent"). */
  identityKey?: string;
  identityKeyExpiresAt?: string;
}

function isRecentSignature(value: unknown): value is RecentSignature {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.code === 'string' && typeof v.name === 'string' && typeof v.signedAt === 'string';
}

/** Reads the saved list, most-recent-first. Never throws -- malformed/missing
 * localStorage data (or SSR, where `window` doesn't exist) just yields `[]`. */
export function getRecentSignatures(): RecentSignature[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isRecentSignature);
  } catch {
    return [];
  }
}

/** Adds a newly-signed session to the front of the list (position #1),
 * replacing any existing entry for the same `code` (re-signing the same
 * document moves it back to the front instead of duplicating it), then caps
 * the list at MAX_ENTRIES -- the oldest entry (previously in last place)
 * falls off once a 6th is added. Never throws. */
export function addRecentSignature(entry: RecentSignature): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getRecentSignatures().filter((existing) => existing.code !== entry.code);
    const next = [entry, ...current].slice(0, MAX_ENTRIES);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // localStorage unavailable/full/disabled -- non-critical, just skip persisting.
  }
}
