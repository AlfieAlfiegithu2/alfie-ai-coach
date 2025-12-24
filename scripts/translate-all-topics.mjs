
const SUPABASE_URL = 'https://cuumxmfzhwljylbdlflj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTkxMjEsImV4cCI6MjA2OTA5NTEyMX0.8jqO_ciOttSxSLZnKY0i5oJmEn79ROF53TjUMYhNemI';

const LANGUAGES = [
    'es', 'zh', 'hi', 'ar', 'pt', 'bn', 'ru', 'ja', 'de', 'fr', 'ko', 'vi', 'it', 'tr', 'th', 'pl', 'nl', 'id', 'uk', 'ms', 'fa', 'tl', 'ro', 'el', 'cs', 'sv', 'hu', 'he'
];

async function translateTopics(lang) {
    let finished = false;
    while (!finished) {
        console.log(`Translating Topics for ${lang} (offset: ongoing)...`);
        try {
            const res = await fetch(`${SUPABASE_URL}/functions/v1/translate-grammar-content`, {
                method: "POST",
                headers: {
                    "apikey": SUPABASE_KEY,
                    "Authorization": `Bearer ${SUPABASE_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    table: 'grammar_topics',
                    target_lang: lang,
                    batch_size: 10
                })
            });
            const data = await res.json();
            if (data.success) {
                console.log(`✅ ${lang}: ${data.message}`);
                if (data.message === "Up to date" || data.count === 0) {
                    finished = true;
                }
            } else {
                console.error(`❌ ${lang}: ${data.error}`);
                finished = true; // Stop on error for this language
            }
        } catch (e) {
            console.error(`❌ ${lang}: Network Error`);
            finished = true;
        }
        await new Promise(r => setTimeout(r, 1000));
    }
}

async function main() {
    console.log("Starting Bulk Topic Translation...");

    // Process in chunks to avoid overwhelming local network/supabase
    for (const lang of LANGUAGES) {
        if (lang === 'en') continue;
        await translateTopics(lang);
        await new Promise(r => setTimeout(r, 500)); // Small delay
    }

    console.log("All Topics Translated.");
}

main();
