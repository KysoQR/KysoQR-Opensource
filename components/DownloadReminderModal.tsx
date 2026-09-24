'use client';

import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@iconify/react';
import { InlineSpinner } from './signing/Spinners';

/**
 * Ported verbatim from x-sign-web/src/components/DownloadReminderModal.tsx.
 * Shown once, the moment a signing session reaches SIGNED.
 */
export function DownloadReminderModal({
  isDownloading,
  onDownload,
  onDismiss,
}: {
  isDownloading: boolean;
  onDownload: () => void;
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
      aria-label={t('downloadReminder.ariaLabel')}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className="w-full max-w-sm rounded-2xl border border-border-subtle bg-white p-6 text-center shadow-xl">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface-soft text-primary">
          <Icon icon="lucide:circle-check-big" className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-text-main">{t('downloadReminder.title')}</h2>
        <p className="mt-2 text-sm text-text-muted">{t('downloadReminder.body')}</p>

        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={onDownload}
            disabled={isDownloading}
            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-strong disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isDownloading && <InlineSpinner />}
            {isDownloading ? t('common.fetching') : t('downloadReminder.downloadButton')}
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-medium text-text-muted hover:text-text-main"
          >
            {t('downloadReminder.dismissButton')}
          </button>
        </div>
      </div>
    </div>
  );
}
