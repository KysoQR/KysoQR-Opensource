import { z } from 'zod';

/**
 * Validated environment configuration.
 *
 * Rule (see Rule/RULES.md): no internal endpoint/key is ever given a
 * hardcoded default in source — every value
 * must come from the environment, and a missing required one must fail
 * loudly at startup rather than silently falling back to something that
 * leaks internal infrastructure or works "by accident".
 *
 * There is no mock/live toggle — the app always calls the real CAS
 * e-signing API, so all 3 variables below are unconditionally required.
 */
const envSchema = z.object({
  CAS_ESIGN_BASE_URL: z.string(),
  CAS_ESIGN_CLIENT_ID: z.string(),
  CAS_ESIGN_API_KEY: z.string(),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

/** Parse and validate `process.env` once, on first use. Throws with a clear
 * message (not a silent fallback) if something required is missing. */
export function getEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse({
    CAS_ESIGN_BASE_URL: process.env.CAS_ESIGN_BASE_URL,
    CAS_ESIGN_CLIENT_ID: process.env.CAS_ESIGN_CLIENT_ID,
    CAS_ESIGN_API_KEY: process.env.CAS_ESIGN_API_KEY,
  });
  if (!parsed.success) {
    throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
  }
  cached = parsed.data;
  return cached;
}

/** Test-only: clear the cached env so a test can re-parse under different values. */
export function resetEnvCacheForTests(): void {
  cached = undefined;
}
