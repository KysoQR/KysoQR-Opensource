export type InternalSignStatus =
  'PENDING' | 'ACCEPTED' | 'SIGNED' | 'REJECTED' | 'FAILED' | 'EXPIRED';

/** Ported verbatim from x-sign-api/src/application/intent/mapCasState.ts —
 * business rule ("what does CAS's 'COMPLETED' mean to us"), one place. */
export function mapCasState(state: string): InternalSignStatus {
  switch (state.toUpperCase()) {
    case 'COMPLETED':
      return 'SIGNED';
    case 'ACCEPTED':
      return 'ACCEPTED';
    case 'REJECTED':
      return 'REJECTED';
    case 'FAILED':
    case 'CANCELLED':
    case 'CANCELED':
      return 'FAILED';
    case 'EXPIRED':
      return 'EXPIRED';
    default:
      // NEW / anything else: still pending.
      return 'PENDING';
  }
}
