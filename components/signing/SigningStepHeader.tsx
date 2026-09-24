import type { ReactNode } from 'react';

/** Ported verbatim from x-sign-web/src/components/signing/SigningStepHeader.tsx. */
export function SigningStepHeader({
  stepNumber,
  title,
  trailingContent,
}: {
  stepNumber: number;
  title: ReactNode;
  trailingContent?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-2">
      <h2 className="flex items-center gap-2 text-base font-semibold text-primary-strong sm:text-lg">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
          {stepNumber}
        </span>
        <span>{title}</span>
      </h2>
      {trailingContent ? <div className="text-xs text-text-muted">{trailingContent}</div> : null}
    </div>
  );
}
