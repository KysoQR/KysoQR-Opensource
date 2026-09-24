import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getEnv, resetEnvCacheForTests } from './env';

describe('getEnv', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    resetEnvCacheForTests();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    resetEnvCacheForTests();
  });

  it('throws when any CAS credential is missing — no silent fallback', () => {
    delete process.env.CAS_ESIGN_BASE_URL;
    delete process.env.CAS_ESIGN_CLIENT_ID;
    delete process.env.CAS_ESIGN_API_KEY;

    // A missing credential must fail loudly, not silently run with a default
    // — this is exactly what let a broken deploy's .env silently serve fake
    // "signed" results with zero error (see Rule/RULES.md, "no hardcoded
    // default").
    expect(() => getEnv()).toThrow(/Invalid environment configuration/);
  });

  it('accepts when all 3 CAS credentials are present', () => {
    process.env.CAS_ESIGN_BASE_URL = 'https://sandbox.bankhub.dev';
    process.env.CAS_ESIGN_CLIENT_ID = 'client-id';
    process.env.CAS_ESIGN_API_KEY = 'api-key';

    const env = getEnv();

    expect(env.CAS_ESIGN_BASE_URL).toBe('https://sandbox.bankhub.dev');
    expect(env.CAS_ESIGN_CLIENT_ID).toBe('client-id');
    expect(env.CAS_ESIGN_API_KEY).toBe('api-key');
  });
});
