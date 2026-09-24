// Helpers for reading CAS responses whose encoding is not guaranteed.
// Ported from x-sign-api/src/domain/verification/casPayload.ts — CAS's
// `download-file` may answer with either a raw PDF byte stream or a JSON
// envelope carrying the PDF as base64 under one of several possible keys.

const BASE64_CANDIDATE_KEYS = [
  'file',
  'data',
  'fileContent',
  'file_content',
  'pdfBase64',
  'pdf_base64',
  'base64',
  'base64Data',
  'base64_data',
  'content',
  'document',
  'signedFile',
  'signed_file',
] as const;

const DATA_URI_PREFIX = /^data:application\/pdf;base64,/;

export const extractBase64String = (input: unknown): string | null => {
  if (typeof input === 'string') {
    const clean = input
      .trim()
      .replace(DATA_URI_PREFIX, '')
      .replace(/[\s\r\n]+/g, '');
    if (clean.length > 20 && !clean.startsWith('{') && !clean.startsWith('<')) {
      return clean;
    }
    return null;
  }

  if (input && typeof input === 'object') {
    const record = input as Record<string, unknown>;
    for (const key of BASE64_CANDIDATE_KEYS) {
      if (record[key]) {
        const found = extractBase64String(record[key]);
        if (found) return found;
      }
    }
    for (const value of Object.values(record)) {
      const found = extractBase64String(value);
      if (found) return found;
    }
  }

  return null;
};

export const decodeBase64ToUint8Array = (input: string): Uint8Array => {
  let clean = input
    .trim()
    .replace(/^"|"$/g, '')
    .replace(DATA_URI_PREFIX, '')
    .replace(/[\s\r\n]+/g, '')
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const remainder = clean.length % 4;
  if (remainder === 2) clean += '==';
  else if (remainder === 3) clean += '=';

  return new Uint8Array(Buffer.from(clean, 'base64'));
};

const PDF_MAGIC = '%PDF-';

export const looksLikePdf = (bytes: Uint8Array, contentType?: string | null): boolean => {
  if (contentType && contentType.toLowerCase().includes('application/pdf')) return true;
  const head = Buffer.from(bytes.subarray(0, PDF_MAGIC.length)).toString('latin1');
  return head.startsWith(PDF_MAGIC);
};

/** Normalise a download-file response body into PDF bytes. Throws when
 * neither a PDF stream nor an extractable base64 payload is found. */
export const readPdfFromResponseBody = (
  raw: Uint8Array,
  contentType?: string | null
): Uint8Array => {
  if (looksLikePdf(raw, contentType)) return raw;

  const text = Buffer.from(raw).toString('utf8');
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    // Not JSON — fall through and try the raw text as base64.
  }

  const base64 = extractBase64String(parsed ?? text);
  if (!base64) {
    throw new Error('CAS download-file returned no readable PDF payload');
  }

  const decoded = decodeBase64ToUint8Array(base64);
  if (!looksLikePdf(decoded)) {
    throw new Error(
      'CAS download-file base64 payload did not decode to a PDF (missing %PDF- header)'
    );
  }
  return decoded;
};

/** Redact obvious PII/secrets before a payload reaches logs. */
export const sanitizeLogText = (input: string, maxLength = 2000): string =>
  input
    .slice(0, maxLength)
    .replace(/\b\d{8,}\b/g, '[redacted-number]')
    .replace(/(X-Amz-Signature|X-Amz-Credential)=[^&\s]+/gi, '$1=[redacted]');
