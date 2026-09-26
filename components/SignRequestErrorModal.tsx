'use client';

import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@iconify/react';

/**
 * Shown as a popup instead of an inline banner when `/api/sign/request`
 * fails -- the inline version sat at the bottom of a potentially tall,
 * scrollable form column, easy to miss entirely.
 */
export function SignRequestErrorModal({
  message,
  onRetry,
  onDismiss,
}: {
  message: string;
  onRetry: () => void;
  onDismiss: () => void;
}) {
  const { t } = useTranslation();

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Escape') onDismiss();
    },
    [onDismiss]
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t('signRequestError.title')}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className="w-full max-w-sm rounded-2xl border border-border-subtle bg-white p-6 text-center shadow-xl">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-error-bg text-error-text">
          <Icon icon="lucide:alert-triangle" className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-text-main">{t('signRequestError.title')}</h2>
        <p className="mt-2 text-sm text-text-muted">{message}</p>

        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-strong"
          >
            {t('common.retry')}
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-medium text-text-muted hover:text-text-main"
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
