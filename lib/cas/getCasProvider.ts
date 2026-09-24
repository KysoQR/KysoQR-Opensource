import { getEnv } from '../env';
import type { CasProvider } from './CasProvider';
import { CasEsignProvider } from './CasEsignProvider';

let cached: CasProvider | undefined;

/** The one CasProvider implementation — always the real CAS e-signing API. */
export function getCasProvider(): CasProvider {
  if (cached) return cached;
  const env = getEnv();
  cached = new CasEsignProvider(env.CAS_ESIGN_BASE_URL, env.CAS_ESIGN_CLIENT_ID, env.CAS_ESIGN_API_KEY);
  return cached;
}
