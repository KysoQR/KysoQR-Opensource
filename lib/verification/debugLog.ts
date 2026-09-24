/**
 * Step-by-step trace for the verify-upload pipeline, printed to the server
 * terminal (`npm run dev`) so the actual data flowing through each stage
 * (extraction, signature check, content digest, chain) can be watched live.
 *
 * Gated on NODE_ENV so it is automatically silent in a production build --
 * this pipeline handles personal certificate data (subject DN, signature
 * bytes), and `docs/DEPLOY.md` already says not to log PII in a real
 * deployment. No call site needs to remember to remove anything.
 *
 * The payload is embedded into the single message string (not passed as a
 * second `console.log` argument) because Next's file-based dev log
 * (`.next/dev/logs/next-development.log`) only persists the first argument
 * of each `console.log` call -- a second object argument is silently
 * dropped there (though it still shows up fine in the raw terminal). Keeping
 * everything in one string means both the terminal and that log file show
 * the real data.
 */
export function verifyDebug(step: string, data: unknown): void {
  if (process.env.NODE_ENV === 'production') return;
  let serialized: string;
  try {
    serialized = JSON.stringify(data);
  } catch {
    serialized = String(data);
  }
  console.log(`[verify:${step}] ${serialized}`);
}
