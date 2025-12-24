
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from "@google/generative-ai";

const SUPABASE_URL = 'https://cuumxmfzhwljylbdlflj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTkxMjEsImV4cCI6MjA2OTA5NTEyMX0.8jqO_ciOttSxSLZnKY0i5oJmEn79ROF53TjUMYhNemI';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''; // I should probably look for it in .env if not set

const SUPPORTED_LANGUAGES = [
    { code: 'es', name: 'Español' },
    { code: 'zh', name: '中文' },
    { code: 'hi', name: 'हिन्दी' },
    { code: 'ar', name: 'العربية' },
    { code: 'pt', name: 'Português' },
    { code: 'bn', name: 'বাংলা' },
    { code: 'ru', name: 'Русский' },
    { code: 'ja', name: '日本語' },
    { code: 'de', name: 'Deutsch' },
    { code: 'fr', name: 'Français' },
    { code: 'ko', name: '한국어' },
    { code: 'vi', name: 'Tiếng Việt' },
    { code: 'it', name: 'Italiano' },
    { code: 'tr', name: 'Türkçe' },
    { code: 'th', name: 'ไทย' },
    { code: 'pl', name: 'Polski' },
    { code: 'nl', name: 'Nederlands' },
    { code: 'id', name: 'Bahasa Indonesia' },
    { code: 'uk', name: 'Українська' },
    { code: 'ms', name: 'Bahasa Melayu' },
    { code: 'fa', name: 'فارسی' },
    { code: 'tl', name: 'Tagalog' },
    { code: 'ro', name: 'Română' },
    { code: 'el', name: 'Ελληνικά' },
    { code: 'cs', name: 'Čeština' },
    { code: 'sv', name: 'Svenska' },
    { code: 'hu', name: 'Magyar' },
    { code: 'he', name: 'עברית' },
];

async function translateTitles() {
    if (!GEMINI_API_KEY) {
        console.error('GEMINI_API_KEY is missing');
        // I'll try to find it in the environment or files if possible, but for now I'll expect it in env.
        // Actually, I can use the same approach as the Edge Function if I run this in a context where it's available.
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // 1. Get all topics with English titles
    const { data: topics, error: topicsError } = await supabase
        .from('grammar_topics')
        .select(`
            id,
            slug,
            grammar_topic_translations(title, language_code)
        `)
        .order('topic_order');

    if (topicsError) {
        console.error('Error fetching topics:', topicsError);
        return;
    }

    console.log(`Processing ${topics.length} topics...`);

    for (const topic of topics) {
        const enTranslation = topic.grammar_topic_translations.find(t => t.language_code === 'en');
        const englishTitle = enTranslation ? enTranslation.title : topic.slug.replace(/-/g, ' ');

        const existingLangs = new Set(topic.grammar_topic_translations.map(t => t.language_code));
        const missingLangs = SUPPORTED_LANGUAGES.filter(l => !existingLangs.has(l.code));

        if (missingLangs.length === 0) {
            console.log(`✅ Topic "${englishTitle}" is already translated to all languages.`);
            continue;
        }

        console.log(`🌐 Translating "${englishTitle}" to ${missingLangs.length} languages...`);

        // Batch translate missing titles
        const prompt = `You are a professional translator for an IELTS Grammar app. 
Translate the English grammar topic title "${englishTitle}" into the following languages.
Return ONLY a JSON object where keys are the language codes and values are the translated titles.

Languages to translate into:
${missingLangs.map(l => `${l.code}: ${l.name}`).join('\n')}

Example Output:
{"es": "Presente Simple", "fr": "Présent Simple"}
`;

        try {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            // Clean up JSON
            const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const translations = JSON.parse(jsonStr);

            const uploadPayload = Object.entries(translations).map(([lang, title]) => ({
                topic_id: topic.id,
                language_code: lang,
                title: title,
                description: `Learn about ${englishTitle} in your language.` // Placeholder or skip
            }));

            if (uploadPayload.length > 0) {
                const { error: upsertError } = await supabase
                    .from('grammar_topic_translations')
                    .upsert(uploadPayload, { onConflict: 'topic_id,language_code' });

                if (upsertError) {
                    console.error(`❌ Error upserting translations for "${englishTitle}":`, upsertError);
                } else {
                    console.log(`✅ Successfully translated "${englishTitle}" to ${uploadPayload.length} languages.`);
                }
            }

        } catch (err) {
            console.error(`❌ Failed to translate "${englishTitle}":`, err.message);
        }

        // Avoid rate limiting
        await new Promise(r => setTimeout(r, 1000));
    }

    console.log('Done!');
}

translateTitles();
