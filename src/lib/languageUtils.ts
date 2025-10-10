export function normalizeLanguageCode(input: string | null | undefined): string {
  if (!input) return 'en';
  const lower = String(input).toLowerCase();
  // Direct ISO codes
  if (['en','ko','zh','ja','es','pt','fr','de','ru','hi','vi','ar'].includes(lower)) {
    return lower;
  }
  // Region codes like zh-cn, en-US
  const short = lower.split('-')[0];
  if (['en','ko','zh','ja','es','pt','fr','de','ru','hi','vi','ar'].includes(short)) {
    return short;
  }
  // Names to codes
  const map: Record<string,string> = {
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
    'arabic': 'ar', 'العربية': 'ar'
  };
  return map[lower] || 'en';
}

export function getSupportedLanguages(): { code: string; name: string }[] {
  return [
    { code: 'en', name: 'English' },
    { code: 'ko', name: '한국어' },
    { code: 'zh', name: '中文' },
    { code: 'ja', name: '日本語' },
    { code: 'es', name: 'Español' },
    { code: 'pt', name: 'Português' },
    { code: 'fr', name: 'Français' },
    { code: 'de', name: 'Deutsch' },
    { code: 'ru', name: 'Русский' },
    { code: 'hi', name: 'हिन्दी' },
    { code: 'vi', name: 'Tiếng Việt' },
    { code: 'ar', name: 'العربية' }
  ];
}


