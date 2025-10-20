import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

// Language resources will be loaded dynamically from JSON files via backend

i18n
  // Load translations using http backend
  .use(Backend)
  // Use browser language detector
  .use(LanguageDetector)
  // Pass i18n down to react-i18next
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    debug: false, // Disable debug in production

    // Language detection options
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'ui_language',
    },

    // Backend options
    backend: {
      loadPath: `${(import.meta as any)?.env?.BASE_URL || '/'}locales/{{lng}}.json`,
      requestOptions: {
        cache: 'default',
      },
      allowMultiLoading: false,
    },

    // Preload languages to avoid async issues
    preload: ['en'],

    interpolation: {
      escapeValue: false, // React already escapes by default
    },

    // If a key is missing in the current locale, show a readable fallback
    parseMissingKeyHandler: (key) => {
      try {
        const last = String(key || '').split('.').pop() || '';
        if (!last) return '';
        // Humanize snake_case / kebab-case
        return last.replace(/[-_]/g, ' ');
      } catch { return ''; }
    },

    react: {
      useSuspense: false,
      bindI18n: 'languageChanged loaded',
      bindI18nStore: 'added removed',
      transEmptyNodeValue: '',
      transSupportBasicHtmlNodes: true,
      transKeepBasicHtmlNodesFor: ['br', 'strong', 'i', 'em'],
    },

    // Handle initialization errors gracefully
    initImmediate: false,
  });

// Handle i18n initialization errors
i18n.on('failedLoading', (lng, ns, msg) => {
  console.warn(`Failed loading ${ns} for ${lng}: ${msg}`);
});

i18n.on('missingKey', (lngs, namespace, key, res) => {
  console.warn(`Missing translation key: ${key} for ${lngs.join(', ')}`);
});

export default i18n;
