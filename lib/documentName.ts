/** Ported verbatim from x-sign-api/src/application/intent/use-cases/DispatchCasSignRequest.ts
 * — CAS rejects documentName outside 10..240 chars or containing control characters. */
const DOCUMENT_NAME_MIN = 10;
const DOCUMENT_NAME_MAX = 240;
export const CAS_MAX_FILE_BYTES = 10 * 1024 * 1024;

export function normalizeDocumentName(raw: string): string {
  const cleaned = raw
    .replace(/[\x00-\x1f\x7f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const clipped = cleaned.slice(0, DOCUMENT_NAME_MAX);
  if (clipped.length >= DOCUMENT_NAME_MIN) return clipped;
  return `${clipped || 'Tai lieu'} - KysoQR`.slice(0, DOCUMENT_NAME_MAX);
}
