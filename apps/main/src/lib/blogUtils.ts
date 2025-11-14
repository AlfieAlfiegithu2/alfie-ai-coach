import { useTranslation } from 'react-i18next';
import { useLocation, useParams } from 'react-router-dom';

// Supported languages array matching LanguageSelector
export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸', nativeName: 'English' },
  { code: 'es', name: 'Español', flag: '🇪🇸', nativeName: 'Español' },
  { code: 'fr', name: 'Français', flag: '🇫🇷', nativeName: 'Français' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪', nativeName: 'Deutsch' },
  { code: 'ko', name: '한국어', flag: '🇰🇷', nativeName: '한국어' },
  { code: 'zh', name: '中文', flag: '🇨🇳', nativeName: '中文' },
  { code: 'ja', name: '日本語', flag: '🇯🇵', nativeName: '日本語' },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳', nativeName: 'Tiếng Việt' },
  { code: 'pt', name: 'Português', flag: '🇵🇹', nativeName: 'Português' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺', nativeName: 'Русский' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦', nativeName: 'العربية' },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳', nativeName: 'हिन्दी' },
  { code: 'bn', name: 'বাংলা', flag: '🇧🇩', nativeName: 'বাংলা' },
  { code: 'ur', name: 'اردو', flag: '🇵🇰', nativeName: 'اردو' },
  { code: 'id', name: 'Bahasa Indonesia', flag: '🇮🇩', nativeName: 'Bahasa Indonesia' },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷', nativeName: 'Türkçe' },
  { code: 'fa', name: 'فارسی', flag: '🇮🇷', nativeName: 'فارسی' },
  { code: 'ta', name: 'தமிழ்', flag: '🇮🇳', nativeName: 'தமிழ்' },
  { code: 'ne', name: 'नेपाली', flag: '🇳🇵', nativeName: 'नेपाली' },
  { code: 'th', name: 'ไทย', flag: '🇹🇭', nativeName: 'ไทย' },
  { code: 'yue', name: '粵語', flag: '🇭🇰', nativeName: '粵語' },
  { code: 'ms', name: 'Bahasa Melayu', flag: '🇲🇾', nativeName: 'Bahasa Melayu' },
  { code: 'kk', name: 'Қазақ тілі', flag: '🇰🇿', nativeName: 'Қазақша' },
];

export const LANGUAGE_CODES = SUPPORTED_LANGUAGES.map(l => l.code);

// Hook to get current language from URL or i18n
export const useBlogLanguage = () => {
  const { i18n } = useTranslation();
  const params = useParams<{ lang?: string }>();
  const location = useLocation();
  
  // Check if language is in URL path (e.g., /zh/blog/post-slug)
  const urlLang = params.lang;
  
  // Check if language is in query params (e.g., /blog/post-slug?lang=zh)
  const searchParams = new URLSearchParams(location.search);
  const queryLang = searchParams.get('lang');
  
  // Priority: URL param > Query param > i18n language > 'en'
  const currentLang = urlLang || queryLang || i18n.language || 'en';
  
  // Normalize language code (ensure it's valid)
  const normalizedLang = LANGUAGE_CODES.includes(currentLang) ? currentLang : 'en';
  
  return normalizedLang;
};

// Generate blog URL for a specific language
export const getBlogUrl = (slug: string, lang: string, baseUrl: string = 'https://englishaidol.com') => {
  // Option 1: Subdirectory (better for SEO)
  return `${baseUrl}/${lang}/blog/${slug}`;
  
  // Option 2: Query parameter (simpler but less SEO-friendly)
  // return `${baseUrl}/blog/${slug}?lang=${lang}`;
};

// Generate hreflang URLs for all available translations
export const generateHreflangUrls = (
  slug: string,
  availableLanguages: string[],
  baseUrl: string = 'https://englishaidol.com'
) => {
  return availableLanguages.map(lang => ({
    lang,
    url: getBlogUrl(slug, lang, baseUrl)
  }));
};

// Generate blog listing URL
export const getBlogListingUrl = (lang: string, baseUrl: string = 'https://englishaidol.com') => {
  return `${baseUrl}/${lang}/blog`;
};

// Slugify function for creating URL-friendly slugs
export const slugify = (text: string): string => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')           // Replace spaces with hyphens
    .replace(/[^\w\-]+/g, '')        // Remove all non-word chars
    .replace(/\-\-+/g, '-')          // Replace multiple hyphens with single hyphen
    .replace(/^-+/, '')              // Trim hyphens from start
    .replace(/-+$/, '');              // Trim hyphens from end
};

// Get language name by code
export const getLanguageName = (code: string): string => {
  const lang = SUPPORTED_LANGUAGES.find(l => l.code === code);
  return lang?.nativeName || lang?.name || code.toUpperCase();
};

// Get language flag by code
export const getLanguageFlag = (code: string): string => {
  const lang = SUPPORTED_LANGUAGES.find(l => l.code === code);
  return lang?.flag || '🌐';
};







