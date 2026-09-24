import type { ButtonHTMLAttributes, ReactNode } from 'react';

/** Ported verbatim from x-sign-web/src/components/signing/SigningButtons.tsx. */
type SigningButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode };

export function SigningPrimaryButton({ children, className, ...buttonProps }: SigningButtonProps) {
  return (
    <button
      type="button"
      {...buttonProps}
      className={[
        'inline-flex items-center justify-center rounded-full',
        'bg-primary px-6 py-2',
        'text-sm font-semibold text-white shadow-sm transition',
        'hover:bg-primary-strong',
        'disabled:cursor-not-allowed disabled:opacity-60',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </button>
  );
}

export function SigningSecondaryButton({
  children,
  className,
  ...buttonProps
}: SigningButtonProps) {
  return (
    <button
      type="button"
      {...buttonProps}
      className={[
        'inline-flex items-center justify-center rounded-full border',
        'border-primary bg-white px-6 py-2',
        'text-sm font-semibold text-primary shadow-sm transition',
        'hover:bg-surface-soft-strong',
        'disabled:cursor-not-allowed disabled:opacity-60',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </button>
  );
}
