import { useTranslation } from 'react-i18next';
import { getSupportedLanguages } from '@/lib/i18n';

/**
 * Hook to generate hreflang tags for multilingual SEO
 * Returns an array of { lang, url } objects for all supported languages
 */
export function useHreflangTags(basePath?: string) {
    const { i18n } = useTranslation();
    const supportedLanguages = getSupportedLanguages();

    // Get the current URL without query params
    const currentPath = basePath || (typeof window !== 'undefined' ? window.location.pathname : '/');
    const baseUrl = 'https://englishaidol.com';

    // Generate hreflang tags for all supported languages
    const hreflangTags = supportedLanguages.map(lang => ({
        lang,
        url: `${baseUrl}${currentPath}${currentPath.includes('?') ? '&' : '?'}lang=${lang}`
    }));

    return {
        hreflang: hreflangTags,
        currentLang: i18n.language,
        currentUrl: `${baseUrl}${currentPath}`
    };
}

/**
 * Get language name from code
 */
export const LANGUAGE_NAMES: Record<string, string> = {
    en: 'English',
    ko: '한국어',
    zh: '中文',
    ja: '日本語',
    es: 'Español',
    pt: 'Português',
    fr: 'Français',
    de: 'Deutsch',
    ru: 'Русский',
    hi: 'हिन्दी',
    vi: 'Tiếng Việt',
    ar: 'العربية',
    bn: 'বাংলা',
    ur: 'اردو',
    id: 'Bahasa Indonesia',
    tr: 'Türkçe',
    fa: 'فارسی',
    ta: 'தமிழ்',
    ne: 'नेपाली',
    th: 'ไทย',
    yue: '粵語',
    ms: 'Bahasa Melayu',
    kk: 'Қазақ',
    sr: 'Српски',
    tl: 'Filipino'
};

/**
 * Get the native name of a language
 */
export function getLanguageName(code: string): string {
    return LANGUAGE_NAMES[code] || code.toUpperCase();
}
