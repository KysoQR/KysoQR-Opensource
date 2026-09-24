'use client';

import { useTranslation } from 'react-i18next';

/** Simplified port of x-sign-web/src/components/LanguageSwitcher.tsx (VI/EN toggle). */
export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const current = i18n.language?.startsWith('en') ? 'en' : 'vi';

  return (
    <div className="flex items-center gap-1 rounded-full border border-border-subtle bg-white p-0.5 text-xs font-semibold">
      {(['vi', 'en'] as const).map((lng) => (
        <button
          key={lng}
          type="button"
          onClick={() => i18n.changeLanguage(lng)}
          aria-pressed={current === lng}
          className={`rounded-full px-2.5 py-1 uppercase transition ${
            current === lng
              ? 'bg-primary text-white'
              : 'text-text-secondary hover:bg-surface-soft hover:text-text-main'
          }`}
        >
          {lng}
        </button>
      ))}
    </div>
  );
}
