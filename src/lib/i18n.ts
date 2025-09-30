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
  fr: {
    translation: {
      // French translations will be loaded from JSON files
    }
  },
  de: {
    translation: {
      // German translations will be loaded from JSON files
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
  ja: {
    translation: {
      // Japanese translations will be loaded from JSON files
    }
  },
  vi: {
    translation: {
      // Vietnamese translations will be loaded from JSON files
    }
  },
  pt: {
    translation: {
      // Portuguese translations will be loaded from JSON files
    }
  },
  ru: {
    translation: {
      // Russian translations will be loaded from JSON files
    }
  },
  ar: {
    translation: {
      // Arabic translations will be loaded from JSON files
    }
  },
  hi: {
    translation: {
      // Hindi translations will be loaded from JSON files
    }
  }
};

// Custom language detector that includes location-based detection
const customDetector: any = {
  name: 'customDetector',
  type: 'languageDetector',
  async: true,
  detect: async (callback: (lng: string) => void) => {
    // First check if user has a saved preference
    const savedLang = localStorage.getItem('i18nextLng');
    if (savedLang) return savedLang;

    // Check browser language
    const browserLang = navigator.language || (navigator as any).userLanguage;
    if (browserLang) {
      const langCode = browserLang.split('-')[0];
      const supportedLanguages = ['en', 'es', 'fr', 'de', 'ko', 'zh', 'ja', 'vi', 'pt', 'ru', 'ar', 'hi'];
      if (supportedLanguages.includes(langCode)) {
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
        // Spanish-speaking countries
        'ES': 'es', // Spain
        'MX': 'es', // Mexico
        'AR': 'es', // Argentina
        'CO': 'es', // Colombia
        'PE': 'es', // Peru
        'VE': 'es', // Venezuela
        'CL': 'es', // Chile
        'EC': 'es', // Ecuador
        'GT': 'es', // Guatemala
        'CU': 'es', // Cuba
        'BO': 'es', // Bolivia
        'DO': 'es', // Dominican Republic
        'HN': 'es', // Honduras
        'PY': 'es', // Paraguay
        'SV': 'es', // El Salvador
        'NI': 'es', // Nicaragua
        'CR': 'es', // Costa Rica
        'PA': 'es', // Panama
        'UY': 'es', // Uruguay

        // French-speaking countries
        'FR': 'fr', // France
        'CA': 'fr', // Canada (Quebec)
        'BE': 'fr', // Belgium
        'SN': 'fr', // Senegal
        'CI': 'fr', // Ivory Coast
        'ML': 'fr', // Mali
        'TN': 'fr', // Tunisia
        'MA': 'fr', // Morocco

        // German-speaking countries
        'DE': 'de', // Germany
        'AT': 'de', // Austria
        'CH': 'de', // Switzerland (German is most widely spoken)
        'LI': 'de', // Liechtenstein
        'LU': 'de', // Luxembourg

        // Korean-speaking countries
        'KR': 'ko', // Korea

        // Chinese-speaking countries
        'CN': 'zh', // China
        'TW': 'zh', // Taiwan
        'HK': 'zh', // Hong Kong
        'MO': 'zh', // Macau
        'SG': 'zh', // Singapore

        // Japanese-speaking countries
        'JP': 'ja', // Japan

        // Vietnamese-speaking countries
        'VN': 'vi', // Vietnam

        // Portuguese-speaking countries
        'PT': 'pt', // Portugal
        'BR': 'pt', // Brazil
        'AO': 'pt', // Angola
        'MZ': 'pt', // Mozambique
        'CV': 'pt', // Cape Verde

        // Russian-speaking countries
        'RU': 'ru', // Russia
        'BY': 'ru', // Belarus
        'KZ': 'ru', // Kazakhstan
        'KG': 'ru', // Kyrgyzstan
        'TJ': 'ru', // Tajikistan
        'UZ': 'ru', // Uzbekistan
        'TM': 'ru', // Turkmenistan

        // Arabic-speaking countries
        'SA': 'ar', // Saudi Arabia
        'AE': 'ar', // United Arab Emirates
        'EG': 'ar', // Egypt
        'JO': 'ar', // Jordan
        'LB': 'ar', // Lebanon
        'SY': 'ar', // Syria
        'IQ': 'ar', // Iraq
        'PS': 'ar', // Palestine
        'YE': 'ar', // Yemen
        'OM': 'ar', // Oman
        'KW': 'ar', // Kuwait
        'QA': 'ar', // Qatar
        'BH': 'ar', // Bahrain

        // Hindi-speaking countries (primarily India)
        'IN': 'hi', // India

        // English-speaking countries (as fallback)
        'US': 'en', // United States
        'GB': 'en', // United Kingdom
        'AU': 'en', // Australia
        'NZ': 'en', // New Zealand
        'IE': 'en', // Ireland
      };

      if (countryToLang[country]) {
        return countryToLang[country];
      }
    } catch (error) {
      console.log('Location detection failed:', error);
    }

    const result = 'en'; // Default fallback
    callback(result);
    return result;
  },
  init: () => {},
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
    debug: false, // Disable debug in production

    // Language detection options
    detection: {
      order: ['customDetector'],
      caches: ['localStorage'],
    },

    // Backend options
    backend: {
      loadPath: '/locales/{{lng}}.json',
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
