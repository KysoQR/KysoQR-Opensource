/** Validate that an uploaded file is really a PDF — extension + declared
 * mimetype + magic bytes must all agree, applied consistently on every
 * route that accepts a file. */
export function isValidPdfUpload(
  buffer: Buffer,
  filename: string | null | undefined,
  mimetype: string | null | undefined
): boolean {
  const extensionOk = (filename ?? '').toLowerCase().endsWith('.pdf');
  const mimetypeOk = (mimetype ?? '').toLowerCase() === 'application/pdf';
  const magicBytesOk = buffer.subarray(0, 5).toString('ascii') === '%PDF-';
  return extensionOk && mimetypeOk && magicBytesOk;
}
