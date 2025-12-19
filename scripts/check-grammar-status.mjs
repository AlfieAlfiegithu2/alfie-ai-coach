
const SUPABASE_URL = 'https://cuumxmfzhwljylbdlflj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTkxMjEsImV4cCI6MjA2OTA5NTEyMX0.8jqO_ciOttSxSLZnKY0i5oJmEn79ROF53TjUMYhNemI';

const LANGUAGES = [
    'en', 'ko', 'zh', 'ja', 'es', 'pt', 'fr', 'de', 'ru', 'hi', 'vi', 'ar',
    'bn', 'ur', 'id', 'tr', 'fa', 'ta', 'ne', 'th', 'yue', 'ms', 'kk'
];

async function getCount(languageCode) {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/grammar_lesson_translations?language_code=eq.${languageCode}&select=*&limit=1`, {
            method: 'HEAD',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Prefer': 'count=exact'
            }
        });

        const range = response.headers.get('content-range');
        if (range) {
            return range.split('/')[1];
        }
        return '0';
    } catch (error) {
        console.error(`Error fetching count for ${languageCode}:`, error);
        return 'Error';
    }
}

async function main() {
    console.log("Checking Grammar Content Status...\n");
    console.log("| Language | Translated Lessons |");
    console.log("|----------|--------------------|");

    const results = [];
    for (const lang of LANGUAGES) {
        const count = await getCount(lang);
        results.push({ lang, count });
        console.log(`| ${lang.padEnd(8)} | ${count.padEnd(18)} |`);
    }
}

main();
