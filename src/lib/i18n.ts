import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

// Language resources will be loaded dynamically
const resources = {
  en: {
    translation: {
      // English translations will be loaded from JSON files
    }
  },
  es: {
    translation: {
      // Spanish translations will be loaded from JSON files
    }
  },
  ko: {
    translation: {
      // Korean translations will be loaded from JSON files
    }
  },
  zh: {
    translation: {
      // Chinese translations will be loaded from JSON files
    }
  },
  vi: {
    translation: {
      // Vietnamese translations will be loaded from JSON files
    }
  }
};

// Custom language detector that includes location-based detection
const customDetector = {
  name: 'customDetector',
  lookup: async () => {
    // First check if user has a saved preference
    const savedLang = localStorage.getItem('i18nextLng');
    if (savedLang) return savedLang;

    // Check browser language
    const browserLang = navigator.language || (navigator as any).userLanguage;
    if (browserLang) {
      const langCode = browserLang.split('-')[0];
      if (['en', 'es', 'ko', 'zh', 'vi'].includes(langCode)) {
        return langCode;
      }
    }

    // Try location-based detection
    try {
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      const country = data.country_code;

      // Map countries to languages
      const countryToLang: Record<string, string> = {
        'ES': 'es', // Spain
        'MX': 'es', // Mexico
        'AR': 'es', // Argentina
        'CO': 'es', // Colombia
        'KR': 'ko', // Korea
        'CN': 'zh', // China
        'TW': 'zh', // Taiwan
        'HK': 'zh', // Hong Kong
        'VN': 'vi', // Vietnam
        'US': 'en', // United States
        'GB': 'en', // United Kingdom
        'CA': 'en', // Canada
        'AU': 'en', // Australia
      };

      if (countryToLang[country]) {
        return countryToLang[country];
      }
    } catch (error) {
      console.log('Location detection failed:', error);
    }

    return 'en'; // Default fallback
  },
  cacheUserLanguage: (lng: string) => {
    localStorage.setItem('i18nextLng', lng);
  }
};

i18n
  // Load translations using http backend
  .use(Backend)
  // Use custom language detector
  .use(customDetector)
  // Pass i18n down to react-i18next
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: process.env.NODE_ENV === 'development',

    // Language detection options
    detection: {
      order: ['customDetector'],
      caches: ['localStorage'],
    },

    // Backend options
    backend: {
      loadPath: '/locales/{{lng}}.json',
    },

    interpolation: {
      escapeValue: false, // React already escapes by default
    },

    react: {
      useSuspense: false,
    },
  });

export default i18n;
