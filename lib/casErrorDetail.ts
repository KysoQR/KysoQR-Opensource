import { CasESignError } from './cas/CasEsignProvider';
import { isTimeoutError } from './fetchWithTimeout';

/**
 * Shared by every `app/api/**` route that calls CAS: turns a caught error
 * into a small, machine-readable `detail` object to attach alongside the
 * existing friendly, generic `message` in an error JSON response.
 *
 * Previously this detail (CAS's own errorCode/status/casRequestId, or "this
 * was a timeout") only ever reached `console.error` on the server -- opening
 * the browser's own DevTools console on a real deploy showed nothing, only
 * the generic message. `message` stays exactly as friendly/generic as before
 * (still meant for on-screen display); `detail` is for logging (see the
 * client-side `console.error` calls that log the full response body).
 */
export function casErrorDetail(error: unknown): Record<string, unknown> | undefined {
  if (error instanceof CasESignError) {
    return {
      casErrorCode: error.errorCode,
      casStatus: error.status,
      casErrorType: error.errorType,
      casRequestId: error.casRequestId,
    };
  }
  if (isTimeoutError(error)) return { timeout: true };
  return undefined;
}
