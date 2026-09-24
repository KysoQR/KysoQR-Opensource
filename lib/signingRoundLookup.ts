import type { SigningRoundDetail } from './cas/CasProvider';
import { parseJsonSafely } from './http';

export type SigningRoundLookupResult =
  { ok: true; data: SigningRoundDetail } | { ok: false; message: string };

/**
 * Extracted from the old `app/verify/[code]/page.tsx` (now removed) so both
 * the home page's lookup box and the signing wizard's "Xem xác minh" button
 * can call the exact same fetch, no longer tied to a route/`use(params)`.
 */
export async function lookupSigningRound(code: string): Promise<SigningRoundLookupResult> {
  // `code` may arrive already percent-encoded (e.g. still containing a
  // literal "%23") or plain (e.g. straight from a controlled <input>) --
  // decoding first (a no-op if it was already plain) before the single
  // `encodeURIComponent` below avoids double-encoding either way, instead of
  // assuming one shape and breaking on the other.
  let normalizedCode = code;
  try {
    normalizedCode = decodeURIComponent(code);
  } catch {
    // Not valid percent-encoding -- use `code` as-is.
  }

  try {
    const res = await fetch(`/api/verify/signing-round/${encodeURIComponent(normalizedCode)}`);
    const body = await parseJsonSafely(res);
    if (!res.ok || !body.signingRound) {
      // `detail` (CAS errorCode/status, or a timeout flag) previously only
      // ever reached the server's own terminal log -- log the full body
      // here so a real deploy's DevTools console shows the same thing.
      if (!res.ok) console.error('[verify:signing-round] lookup failed', body);
      return { ok: false, message: body.message ?? '' };
    }
    return { ok: true, data: body.signingRound as SigningRoundDetail };
  } catch (err) {
    console.error('[verify:signing-round] lookup request failed', err);
    return { ok: false, message: err instanceof Error ? err.message : String(err) };
  }
}
