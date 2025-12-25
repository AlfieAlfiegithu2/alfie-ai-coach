import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

// Normalize language codes (strip region codes like en-GB -> en)
function normalizeLanguageCode(lng: string): string {
  if (!lng) return 'en';
  // Split by hyphen and take the first part (language code)
  const parts = lng.split('-');
  return parts[0].toLowerCase();
}

// Supported language codes (matching available locale files)
const SUPPORTED_LANGUAGES = [
  'en', 'ko', 'zh', 'ja', 'es', 'pt', 'fr', 'de', 'ru', 'hi', 'vi',
  'ar', 'bn', 'ur', 'id', 'tr', 'fa', 'ta', 'ne', 'th', 'yue', 'ms', 'kk', 'sr', 'tl'
];

// RTL (Right-to-Left) languages
const RTL_LANGUAGES = ['ar', 'fa', 'ur', 'he'];

// Update HTML lang and dir attributes when language changes
function updateDocumentLanguage(lng: string) {
  const normalizedLng = normalizeLanguageCode(lng);
  const htmlElement = document.documentElement;

  // Set the lang attribute for SEO and accessibility
  htmlElement.setAttribute('lang', normalizedLng);

  // Set text direction for RTL languages
  if (RTL_LANGUAGES.includes(normalizedLng)) {
    htmlElement.setAttribute('dir', 'rtl');
    document.body.classList.add('rtl');
  } else {
    htmlElement.setAttribute('dir', 'ltr');
    document.body.classList.remove('rtl');
  }
}

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

    // Language detection options - IMPROVED
    detection: {
      // Detection order: querystring → localStorage → cookie → navigator
      // This allows marketing links (?lang=es) to override everything
      order: ['querystring', 'localStorage', 'cookie', 'navigator'],

      // Cache detected language in both localStorage and cookies
      caches: ['localStorage', 'cookie'],

      // localStorage key for user's language preference
      lookupLocalStorage: 'ui_language',

      // Query string parameter name (e.g., ?lang=ko or ?lng=ko)
      lookupQuerystring: 'lang',

      // Cookie settings for cross-session persistence
      lookupCookie: 'ui_language',
      cookieMinutes: 365 * 24 * 60, // 1 year
      cookieOptions: { path: '/', sameSite: 'lax' },

      // Normalize detected language codes (e.g., en-US → en)
      convertDetectedLanguage: (lng: string) => {
        const normalized = normalizeLanguageCode(lng);
        // Only return if it's a supported language, otherwise fallback to 'en'
        return SUPPORTED_LANGUAGES.includes(normalized) ? normalized : 'en';
      },
    },


    // Backend options
    backend: {
      // Normalize language code before loading
      loadPath: (lngs: string[], namespaces: string[]) => {
        const normalizedLng = normalizeLanguageCode(lngs[0]);
        // Use consistent base path - always use root relative path
        // This ensures same behavior in dev and production
        const baseUrl = import.meta.env.BASE_URL || '/';
        // Ensure baseUrl ends with / for proper path joining
        const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
        return `${normalizedBase}locales/${normalizedLng}.json`;
      },
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

// Update document language on initialization and language change
i18n.on('initialized', () => {
  updateDocumentLanguage(i18n.language);
});

i18n.on('languageChanged', (lng) => {
  updateDocumentLanguage(lng);
});

// Handle i18n initialization errors
i18n.on('failedLoading', (lng, ns, msg) => {
  console.warn(`Failed loading ${ns} for ${lng}: ${msg}`);
});

i18n.on('missingKey', (lngs, namespace, key, res) => {
  console.warn(`Missing translation key: ${key} for ${lngs.join(', ')}`);
});

// Export supported languages and RTL check for use elsewhere
export const getSupportedLanguages = () => SUPPORTED_LANGUAGES;
export const isRTL = (lng: string) => RTL_LANGUAGES.includes(normalizeLanguageCode(lng));

export default i18n;

