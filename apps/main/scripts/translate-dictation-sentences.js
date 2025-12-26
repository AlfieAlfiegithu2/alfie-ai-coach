
import { createClient } from '@supabase/supabase-js';

// Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing Supabase configuration. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or service role key).');
    process.exit(1);
}

if (!GEMINI_API_KEY) {
    console.error('❌ Missing GEMINI_API_KEY. Please export it.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function translateText(text) {
    // Basic translation using Gemini API via REST if no SDK
    // Using gemini-1.5-flash for speed/cost
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const payload = {
        contents: [{
            parts: [{
                text: `Translate the following English sentence to natural, polite Korean. Do not include any explanations, just the translation.\n\nSentence: "${text}"`
            }]
        }]
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (data.candidates && data.candidates[0].content) {
            return data.candidates[0].content.parts[0].text.trim();
        } else {
            console.error('Gemini API Error:', JSON.stringify(data, null, 2));
            return null;
        }
    } catch (e) {
        console.error('Translation Request Failed:', e);
        return null;
    }
}

async function main() {
    console.log('🔄 Fetching untranslated sentences...');

    const { data: sentences, error } = await supabase
        .from('dictation_sentences')
        .select('*');

    if (error) {
        console.error('DB Error:', error);
        return;
    }

    const untranslated = sentences.filter(s => !s.translations || !s.translations.ko);
    console.log(`📝 Found ${untranslated.length} sentences to translate.`);

    let successCount = 0;

    for (const s of untranslated) {
        console.log(`Translating: "${s.sentence_text}"...`);
        const ko = await translateText(s.sentence_text);

        if (ko) {
            const newTranslations = { ...(s.translations || {}), ko };

            // Try updating 'translations' column
            const { error: updateError } = await supabase
                .from('dictation_sentences')
                .update({ translations: newTranslations })
                .eq('id', s.id);

            if (updateError) {
                // Fallback to hints if column missing (compatibility)
                if (updateError.code === '42703') {
                    await supabase
                        .from('dictation_sentences')
                        .update({ hints: JSON.stringify({ ko }) })
                        .eq('id', s.id);
                } else {
                    console.error('Update Failed:', updateError);
                }
            }

            console.log(`✅ Translated: ${ko}`);
            successCount++;
            // Rate limit helper
            await new Promise(r => setTimeout(r, 1000));
        }
    }

    console.log(`\n🎉 Completed! Translated ${successCount} sentences.`);
}

main();
