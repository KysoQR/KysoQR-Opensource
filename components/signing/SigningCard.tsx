import type { ReactNode } from 'react';

/** Ported verbatim from x-sign-web/src/components/signing/SigningCard.tsx. */
export function SigningCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={[
        'w-full',
        'rounded-2xl border border-border-subtle',
        'bg-white p-4 shadow-sm sm:p-6',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  );
}
