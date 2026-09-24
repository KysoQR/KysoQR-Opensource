'use client';

import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';

/** Ported verbatim from x-sign-web/src/components/Footer.tsx. */
export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer>
      <div className="mx-auto flex max-w-4xl flex-row justify-center gap-6 px-4 py-3 text-center text-xs sm:px-6">
        <div className="flex flex-col items-center justify-center gap-1.5 text-center font-medium text-text-secondary sm:flex-row">
          <Icon icon="lucide:shield-check" className="inline-block" />
          <p>{t('footer.title1')}</p>
        </div>
        <div className="flex flex-col items-center justify-center gap-1.5 text-center font-medium text-text-secondary sm:flex-row">
          <Icon icon="lucide:zap" className="inline-block" />
          <p>{t('footer.title2')}</p>
        </div>
        <div className="flex flex-col items-center justify-center gap-1.5 text-center font-medium text-text-secondary sm:flex-row">
          <Icon icon="lucide:check-circle" className="inline-block" />
          <p>{t('footer.title3')}</p>
        </div>
      </div>
      <div className="mt-1 border-t border-border-subtle pt-2 text-center text-xs text-text-secondary">
        {t('footer.footer')}
      </div>
    </footer>
  );
}
