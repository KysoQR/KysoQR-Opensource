import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import vi from './locales/vi.json';
import en from './locales/en.json';

/**
 * VI/EN (ported from x-sign-web's i18next dictionary — pattern only
 * scaffolded here, full dictionary port is a separate step). Only 2
 * languages, dictionaries are small — no lazy-loading/backend plugin needed.
 */
if (!i18next.isInitialized) {
  void i18next.use(initReactI18next).init({
    resources: {
      vi: { translation: vi },
      en: { translation: en },
    },
    lng: 'vi',
    fallbackLng: 'vi',
    interpolation: { escapeValue: false },
  });
} else {
  // Dev-server HMR keeps this module's `i18next` singleton alive across
  // edits (same long-running Node.js process), so the `isInitialized` guard
  // above only ever runs once -- without this, newly added/changed keys in
  // the locale JSON files would silently show up as raw "namespace.key"
  // strings until the whole server process was restarted. Re-adding the
  // freshly re-imported JSON on every module reload keeps translations live.
  i18next.addResourceBundle('vi', 'translation', vi, true, true);
  i18next.addResourceBundle('en', 'translation', en, true, true);
}

export default i18next;
