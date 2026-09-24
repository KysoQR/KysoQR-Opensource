/** Ported verbatim from x-sign-web/src/components/signing/Spinners.tsx. */
export function ButtonSpinner() {
  return (
    <span
      className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
      aria-hidden="true"
    />
  );
}

export function InlineSpinner() {
  return (
    <span
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-500"
      aria-hidden="true"
    />
  );
}
