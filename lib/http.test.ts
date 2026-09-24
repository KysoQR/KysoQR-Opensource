import { describe, expect, it } from 'vitest';
import { parseJsonSafely } from './http';

describe('parseJsonSafely', () => {
  it('parses a valid JSON response normally', async () => {
    const res = new Response(JSON.stringify({ hello: 'world' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

    await expect(parseJsonSafely(res)).resolves.toEqual({ hello: 'world' });
  });

  it('throws a readable error instead of a raw parse exception on a non-JSON (e.g. Nginx 413) body', async () => {
    const res = new Response('<html><h1>413 Request Entity Too Large</h1></html>', {
      status: 413,
      statusText: 'Request Entity Too Large',
      headers: { 'Content-Type': 'text/html' },
    });

    await expect(parseJsonSafely(res)).rejects.toThrow(/HTTP 413/);
  });
});
