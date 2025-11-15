export function normalizeLanguageCode(input: string | null | undefined): string {
  if (!input) return 'en';
  const lower = String(input).toLowerCase();
  
  // Get all supported codes from getSupportedLanguages
  const supported = getSupportedLanguages();
  const supportedCodes = supported.map(l => l.code);
  
  // Direct ISO codes
  if (supportedCodes.includes(lower)) {
    return lower;
  }
  // Region codes like zh-cn, en-US
  const short = lower.split('-')[0];
  if (supportedCodes.includes(short)) {
    return short;
  }
  
  // Names to codes mapping (English names and native names)
  const map: Record<string, string> = {
    'english': 'en',
    'korean': 'ko', '한국어': 'ko',
    'chinese': 'zh', '中文': 'zh', 'chinese (simplified)': 'zh',
    'japanese': 'ja', '日本語': 'ja',
    'spanish': 'es', 'español': 'es',
    'portuguese': 'pt', 'português': 'pt',
    'french': 'fr', 'français': 'fr',
    'german': 'de', 'deutsch': 'de',
    'russian': 'ru', 'русский': 'ru',
    'hindi': 'hi', 'हिन्दी': 'hi',
    'vietnamese': 'vi', 'tiếng việt': 'vi',
    'arabic': 'ar', 'العربية': 'ar',
    'bengali': 'bn', 'বাংলা': 'bn',
    'urdu': 'ur', 'اردو': 'ur',
    'indonesian': 'id', 'bahasa indonesia': 'id',
    'turkish': 'tr', 'türkçe': 'tr',
    'persian': 'fa', 'farsi': 'fa', 'فارسی': 'fa',
    'tamil': 'ta', 'தமிழ்': 'ta',
    'nepali': 'ne', 'नेपाली': 'ne',
    'thai': 'th', 'ไทย': 'th',
    'cantonese': 'yue', '粵語': 'yue',
    'malay': 'ms', 'bahasa melayu': 'ms',
    'kazakh': 'kk', 'қазақ тілі': 'kk', 'қазақша': 'kk',
    'italian': 'it', 'italiano': 'it',
    'telugu': 'te', 'తెలుగు': 'te',
    'marathi': 'mr', 'मराठी': 'mr',
    'gujarati': 'gu', 'ગુજરાતી': 'gu',
    'kannada': 'kn', 'ಕನ್ನಡ': 'kn',
    'malayalam': 'ml', 'മലയാളം': 'ml',
    'punjabi': 'pa', 'ਪੰਜਾਬੀ': 'pa',
    'odia': 'or', 'ଓଡ଼ିଆ': 'or',
    'assamese': 'as', 'অসমীয়া': 'as',
    'swahili': 'sw', 'kiswahili': 'sw',
    'hausa': 'ha',
    'yoruba': 'yo', 'yorùbá': 'yo',
    'igbo': 'ig', 'ásụ̀sụ́ ìgbò': 'ig',
    'amharic': 'am', 'አማርኛ': 'am',
    'zulu': 'zu', 'isizulu': 'zu',
    'afrikaans': 'af',
    'polish': 'pl', 'polski': 'pl',
    'ukrainian': 'uk', 'українська': 'uk',
    'romanian': 'ro', 'română': 'ro',
    'dutch': 'nl', 'nederlands': 'nl',
    'greek': 'el', 'ελληνικά': 'el',
    'czech': 'cs', 'čeština': 'cs',
    'hungarian': 'hu', 'magyar': 'hu',
    'swedish': 'sv', 'svenska': 'sv',
    'bulgarian': 'bg', 'български': 'bg',
    'serbian': 'sr', 'српски': 'sr',
    'croatian': 'hr', 'hrvatski': 'hr',
    'slovak': 'sk', 'slovenčina': 'sk',
    'norwegian': 'no', 'norsk': 'no',
    'danish': 'da', 'dansk': 'da',
    'finnish': 'fi', 'suomi': 'fi',
    'albanian': 'sq', 'shqip': 'sq',
    'slovenian': 'sl', 'slovenščina': 'sl',
    'estonian': 'et', 'eesti': 'et',
    'latvian': 'lv', 'latviešu': 'lv',
    'lithuanian': 'lt', 'lietuvių': 'lt',
    'uzbek': 'uz', 'oʻzbek': 'uz',
    'azeri': 'az', 'azerbaijani': 'az', 'azərbaycan': 'az',
    'mongolian': 'mn', 'монгол': 'mn',
    'hebrew': 'he', 'עברית': 'he',
    'pashto': 'ps', 'پښتو': 'ps',
    'georgian': 'ka', 'ქართული': 'ka',
    'armenian': 'hy', 'հայերեն': 'hy',
    'filipino': 'tl', 'tagalog': 'tl',
    'burmese': 'my', 'မြန်မာ': 'my',
    'khmer': 'km', 'ភាសាខ្មែរ': 'km',
    'sinhala': 'si', 'සිංහල': 'si'
  };
  return map[lower] || 'en';
}

export function getSupportedLanguages(): { code: string; name: string }[] {
  // Languages sorted by global speaker count (most common to least common)
  return [
    // Top 10 most spoken languages globally
    { code: 'en', name: 'English' },
    { code: 'zh', name: '中文' },
    { code: 'hi', name: 'हिन्दी' },
    { code: 'es', name: 'Español' },
    { code: 'fr', name: 'Français' },
    { code: 'ar', name: 'العربية' },
    { code: 'bn', name: 'বাংলা' },
    { code: 'pt', name: 'Português' },
    { code: 'ru', name: 'Русский' },
    { code: 'ja', name: '日本語' },
    
    // Next tier (20-100M+ speakers)
    { code: 'ur', name: 'اردو' },
    { code: 'id', name: 'Bahasa Indonesia' },
    { code: 'de', name: 'Deutsch' },
    { code: 'vi', name: 'Tiếng Việt' },
    { code: 'tr', name: 'Türkçe' },
    { code: 'it', name: 'Italiano' },
    { code: 'ko', name: '한국어' },
    { code: 'fa', name: 'فارسی' },
    { code: 'ta', name: 'தமிழ்' },
    { code: 'th', name: 'ไทย' },
    { code: 'yue', name: '粵語' },
    { code: 'ms', name: 'Bahasa Melayu' },
    
    // Major Indian languages (sorted by speaker count)
    { code: 'te', name: 'తెలుగు' },
    { code: 'mr', name: 'मराठी' },
    { code: 'gu', name: 'ગુજરાતી' },
    { code: 'kn', name: 'ಕನ್ನಡ' },
    { code: 'ml', name: 'മലയാളം' },
    { code: 'pa', name: 'ਪੰਜਾਬੀ' },
    { code: 'or', name: 'ଓଡ଼ିଆ' },
    { code: 'as', name: 'অসমীয়া' },
    
    // Major African languages
    { code: 'sw', name: 'Kiswahili' },
    { code: 'ha', name: 'Hausa' },
    { code: 'yo', name: 'Yorùbá' },
    { code: 'ig', name: 'Ásụ̀sụ́ Ìgbò' },
    { code: 'am', name: 'አማርኛ' },
    { code: 'zu', name: 'isiZulu' },
    { code: 'af', name: 'Afrikaans' },
    
    // European languages (sorted by population)
    { code: 'pl', name: 'Polski' },
    { code: 'uk', name: 'Українська' },
    { code: 'ro', name: 'Română' },
    { code: 'nl', name: 'Nederlands' },
    { code: 'el', name: 'Ελληνικά' },
    { code: 'cs', name: 'Čeština' },
    { code: 'hu', name: 'Magyar' },
    { code: 'sv', name: 'Svenska' },
    { code: 'bg', name: 'Български' },
    { code: 'sr', name: 'Српски' },
    { code: 'hr', name: 'Hrvatski' },
    { code: 'sk', name: 'Slovenčina' },
    { code: 'no', name: 'Norsk' },
    { code: 'da', name: 'Dansk' },
    { code: 'fi', name: 'Suomi' },
    { code: 'sq', name: 'Shqip' },
    { code: 'sl', name: 'Slovenščina' },
    { code: 'et', name: 'Eesti' },
    { code: 'lv', name: 'Latviešu' },
    { code: 'lt', name: 'Lietuvių' },
    
    // Central Asian and other languages
    { code: 'uz', name: 'Oʻzbek' },
    { code: 'kk', name: 'Қазақша' },
    { code: 'az', name: 'Azərbaycan' },
    { code: 'mn', name: 'Монгол' },
    
    // Middle Eastern and other languages
    { code: 'he', name: 'עברית' },
    { code: 'ps', name: 'پښتو' },
    { code: 'ka', name: 'ქართული' },
    { code: 'hy', name: 'Հայերեն' },
    
    // Southeast Asian and other languages
    { code: 'tl', name: 'Filipino' },
    { code: 'my', name: 'မြန်မာ' },
    { code: 'km', name: 'ភាសាខ្មែរ' },
    { code: 'si', name: 'සිංහල' },
    { code: 'ne', name: 'नेपाली' }
  ];
}

// Language flags mapping
const LANGUAGE_FLAGS: Record<string, string> = {
  'en': '🇺🇸', 'zh': '🇨🇳', 'hi': '🇮🇳', 'es': '🇪🇸', 'fr': '🇫🇷',
  'ar': '🇸🇦', 'bn': '🇧🇩', 'pt': '🇵🇹', 'ru': '🇷🇺', 'ja': '🇯🇵',
  'ur': '🇵🇰', 'id': '🇮🇩', 'de': '🇩🇪', 'vi': '🇻🇳', 'tr': '🇹🇷',
  'it': '🇮🇹', 'ko': '🇰🇷', 'fa': '🇮🇷', 'ta': '🇮🇳', 'th': '🇹🇭',
  'yue': '🇭🇰', 'ms': '🇲🇾', 'te': '🇮🇳', 'mr': '🇮🇳', 'gu': '🇮🇳',
  'kn': '🇮🇳', 'ml': '🇮🇳', 'pa': '🇮🇳', 'or': '🇮🇳', 'as': '🇮🇳',
  'sw': '🇹🇿', 'ha': '🇳🇬', 'yo': '🇳🇬', 'ig': '🇳🇬', 'am': '🇪🇹',
  'zu': '🇿🇦', 'af': '🇿🇦', 'pl': '🇵🇱', 'uk': '🇺🇦', 'ro': '🇷🇴',
  'nl': '🇳🇱', 'el': '🇬🇷', 'cs': '🇨🇿', 'hu': '🇭🇺', 'sv': '🇸🇪',
  'bg': '🇧🇬', 'sr': '🇷🇸', 'hr': '🇭🇷', 'sk': '🇸🇰', 'no': '🇳🇴',
  'da': '🇩🇰', 'fi': '🇫🇮', 'sq': '🇦🇱', 'sl': '🇸🇮', 'et': '🇪🇪',
  'lv': '🇱🇻', 'lt': '🇱🇹', 'uz': '🇺🇿', 'kk': '🇰🇿', 'az': '🇦🇿',
  'mn': '🇲🇳', 'he': '🇮🇱', 'ps': '🇦🇫', 'ka': '🇬🇪', 'hy': '🇦🇲',
  'tl': '🇵🇭', 'my': '🇲🇲', 'km': '🇰🇭', 'si': '🇱🇰', 'ne': '🇳🇵'
};

export interface LanguageWithFlag {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

export function getLanguagesWithFlags(): LanguageWithFlag[] {
  const supported = getSupportedLanguages();
  return supported.map(lang => ({
    code: lang.code,
    name: lang.name,
    nativeName: lang.name, // Native name is the same as name in our system
    flag: LANGUAGE_FLAGS[lang.code] || '🌐'
  }));
}

// Map language codes to English names for SettingsModal
const CODE_TO_ENGLISH_NAME: Record<string, string> = {
  'en': 'English', 'zh': 'Chinese', 'hi': 'Hindi', 'es': 'Spanish', 'fr': 'French',
  'ar': 'Arabic', 'bn': 'Bengali', 'pt': 'Portuguese', 'ru': 'Russian', 'ja': 'Japanese',
  'ur': 'Urdu', 'id': 'Indonesian', 'de': 'German', 'vi': 'Vietnamese', 'tr': 'Turkish',
  'it': 'Italian', 'ko': 'Korean', 'fa': 'Persian', 'ta': 'Tamil', 'th': 'Thai',
  'yue': 'Cantonese', 'ms': 'Malay', 'te': 'Telugu', 'mr': 'Marathi', 'gu': 'Gujarati',
  'kn': 'Kannada', 'ml': 'Malayalam', 'pa': 'Punjabi', 'or': 'Odia', 'as': 'Assamese',
  'sw': 'Swahili', 'ha': 'Hausa', 'yo': 'Yoruba', 'ig': 'Igbo', 'am': 'Amharic',
  'zu': 'Zulu', 'af': 'Afrikaans', 'pl': 'Polish', 'uk': 'Ukrainian', 'ro': 'Romanian',
  'nl': 'Dutch', 'el': 'Greek', 'cs': 'Czech', 'hu': 'Hungarian', 'sv': 'Swedish',
  'bg': 'Bulgarian', 'sr': 'Serbian', 'hr': 'Croatian', 'sk': 'Slovak', 'no': 'Norwegian',
  'da': 'Danish', 'fi': 'Finnish', 'sq': 'Albanian', 'sl': 'Slovenian', 'et': 'Estonian',
  'lv': 'Latvian', 'lt': 'Lithuanian', 'uz': 'Uzbek', 'kk': 'Kazakh', 'az': 'Azerbaijani',
  'mn': 'Mongolian', 'he': 'Hebrew', 'ps': 'Pashto', 'ka': 'Georgian', 'hy': 'Armenian',
  'tl': 'Filipino', 'my': 'Burmese', 'km': 'Khmer', 'si': 'Sinhala', 'ne': 'Nepali'
};

export function getLanguagesForSettings(): { value: string; label: string }[] {
  const supported = getSupportedLanguages();
  return supported.map(lang => ({
    value: CODE_TO_ENGLISH_NAME[lang.code] || lang.code,
    label: `${CODE_TO_ENGLISH_NAME[lang.code] || lang.code} (${lang.name})`
  }));
}

// Convert language code to English name (for UI display)
export function codeToEnglishName(code: string | null | undefined): string {
  if (!code) return 'English';
  const normalized = normalizeLanguageCode(code);
  return CODE_TO_ENGLISH_NAME[normalized] || 'English';
}

// Convert English name to language code (for DB storage)
export function englishNameToCode(name: string | null | undefined): string {
  if (!name) return 'en';
  // First try normalizeLanguageCode which handles both codes and names
  const code = normalizeLanguageCode(name);
  // Verify it's a valid code by checking if it exists in CODE_TO_ENGLISH_NAME
  if (CODE_TO_ENGLISH_NAME[code]) {
    return code;
  }
  // If not found, try reverse lookup
  const reverseMap: Record<string, string> = {};
  Object.entries(CODE_TO_ENGLISH_NAME).forEach(([code, name]) => {
    reverseMap[name.toLowerCase()] = code;
  });
  return reverseMap[name.toLowerCase()] || 'en';
}


