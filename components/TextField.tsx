import type { InputHTMLAttributes, ReactNode } from 'react';

/** Ported verbatim from x-sign-web/src/components/TextField.tsx. */
export type TextFieldProps = {
  id: string;
  label: ReactNode;
  value: string;
  onChange: (value: string) => void;
  hint?: ReactNode;
  error?: string | null;
  required?: boolean;
  labelAccessory?: ReactNode;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'value' | 'onChange' | 'className'>;

// `placeholder:text-xs` shrinks only the hint text (via the `::placeholder`
// pseudo-element), not what the user actually types (`text-sm`) -- needed
// because some fields are paired side by side at half width (see
// SignerConfigPanel.tsx's Tên công ty/Người đại diện row), where a full-size
// placeholder like "Họ tên người đại diện pháp luật" would just get clipped.
const INPUT_CLASS =
  'w-full rounded-lg border bg-white px-3 py-1.5 text-sm text-text-main shadow-sm outline-none focus:ring-2 disabled:bg-gray-50 placeholder:text-xs';

export function TextField({
  id,
  label,
  value,
  onChange,
  hint,
  error,
  required = false,
  labelAccessory,
  ...inputProps
}: TextFieldProps) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="block text-xs font-medium text-text-main">
          {label}
          {required && <span className="ml-0.5 text-error-text">*</span>}
        </label>
        {labelAccessory}
      </div>
      <input
        {...inputProps}
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`${INPUT_CLASS} ${
          error
            ? 'border-error-border focus:border-error-text focus:ring-error-text/30'
            : 'border-border-subtle focus:border-primary focus:ring-primary/30'
        }`}
      />
      {error ? (
        <p id={`${id}-error`} className="mt-0.5 text-[11px] text-error-text">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-0.5 text-[11px] text-text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export default TextField;
