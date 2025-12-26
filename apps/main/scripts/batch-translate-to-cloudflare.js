
import { createClient } from '@supabase/supabase-js';

// Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || process.env.VITE_OPENROUTER_API_KEY;
const D1_API_URL = 'https://alfie-translations-api.ryanbigbang15.workers.dev';

// Full list of 69 supported languages from VocabLevels.tsx
const LANGUAGE_OPTIONS = [
    { code: 'zh', name: 'Chinese (Simplified)' },
    { code: 'zh-TW', name: 'Chinese (Traditional)' },
    { code: 'es', name: 'Spanish' },
    { code: 'hi', name: 'Hindi' },
    { code: 'ar', name: 'Arabic' },
    { code: 'bn', name: 'Bengali' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'ru', name: 'Russian' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' },
    { code: 'vi', name: 'Vietnamese' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'tr', name: 'Turkish' },
    { code: 'th', name: 'Thai' },
    { code: 'id', name: 'Indonesian' },
    { code: 'ms', name: 'Malay' },
    { code: 'tl', name: 'Filipino' },
    { code: 'my', name: 'Burmese' },
    { code: 'km', name: 'Khmer' },
    { code: 'ur', name: 'Urdu' },
    { code: 'ta', name: 'Tamil' },
    { code: 'te', name: 'Telugu' },
    { code: 'mr', name: 'Marathi' },
    { code: 'gu', name: 'Gujarati' },
    { code: 'kn', name: 'Kannada' },
    { code: 'ml', name: 'Malayalam' },
    { code: 'pa', name: 'Punjabi' },
    { code: 'or', name: 'Odia' },
    { code: 'as', name: 'Assamese' },
    { code: 'ne', name: 'Nepali' },
    { code: 'si', name: 'Sinhala' },
    { code: 'fa', name: 'Persian' },
    { code: 'he', name: 'Hebrew' },
    { code: 'ps', name: 'Pashto' },
    { code: 'nl', name: 'Dutch' },
    { code: 'pl', name: 'Polski' },
    { code: 'uk', name: 'Ukrainian' },
    { code: 'ro', name: 'Romanian' },
    { code: 'el', name: 'Greek' },
    { code: 'cs', name: 'Czech' },
    { code: 'hu', name: 'Hungarian' },
    { code: 'sv', name: 'Svenska' },
    { code: 'bg', name: 'Bulgarian' },
    { code: 'sr', name: 'Serbian' },
    { code: 'hr', name: 'Croatian' },
    { code: 'sk', name: 'Slovak' },
    { code: 'no', name: 'Norwegian' },
    { code: 'da', name: 'Danish' },
    { code: 'fi', name: 'Suomi' },
    { code: 'sq', name: 'Shqip' },
    { code: 'sl', name: 'Slovenian' },
    { code: 'et', name: 'Estonian' },
    { code: 'lv', name: 'Latvian' },
    { code: 'lt', name: 'Lithuanian' },
    { code: 'uz', name: 'Uzbek' },
    { code: 'kk', name: 'Kazakh' },
    { code: 'az', name: 'Azerbaijani' },
    { code: 'mn', name: 'Mongolian' },
    { code: 'ka', name: 'Georgian' },
    { code: 'hy', name: 'Armenian' },
    { code: 'sw', name: 'Swahili' },
    { code: 'ha', name: 'Hausa' },
    { code: 'yo', name: 'Yoruba' },
    { code: 'ig', name: 'Igbo' },
    { code: 'am', name: 'Amharic' },
    { code: 'zu', name: 'Zulu' },
    { code: 'af', name: 'Afrikaans' },
    { code: 'yue', name: 'Cantonese' }
];

if (!SUPABASE_URL || !SUPABASE_KEY || !OPENROUTER_API_KEY) {
    console.error('❌ Missing configuration. Ensure SUPABASE_URL, SUPABASE_KEY, and OPENROUTER_API_KEY are set.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function translateBatch(sentences, langCode) {
    const langObj = LANGUAGE_OPTIONS.find(l => l.code === langCode);
    const langName = langObj ? langObj.name : langCode;

    console.log(`  Translating ${sentences.length} sentences to ${langName} (${langCode})...`);

    const prompt = `Translate the following English sentences into natural, polite ${langName}. 
Return ONLY a JSON array of strings in the same order. No numbering, no extra text.

Sentences:
${sentences.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;

    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://englishaidol.com',
                'X-Title': 'Alfie AI Translation'
            },
            body: JSON.stringify({
                model: 'deepseek/deepseek-chat',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.1
            })
        });

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '[]';

        let jsonStr = content.trim();
        if (jsonStr.startsWith('```')) {
            jsonStr = jsonStr.replace(/^```json?\s*/i, '').replace(/\s*```$/, '');
        }

        return JSON.parse(jsonStr);
    } catch (e) {
        console.error(`  ❌ Translation failed for ${langCode}:`, e.message);
        return [];
    }
}

async function saveToD1(translations) {
    try {
        const response = await fetch(`${D1_API_URL}/dictation-translations/batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ translations })
        });
        const result = await response.json();
        return result.success;
    } catch (e) {
        console.error('  ❌ D1 Save Error:', e.message);
        return false;
    }
}

async function checkExisting(sentenceIds, lang) {
    try {
        const response = await fetch(`${D1_API_URL}/dictation-translations?lang=${lang}&sentence_ids=${sentenceIds.join(',')}`);
        const result = await response.json();
        return new Set((result.data || []).map(r => r.sentence_id));
    } catch (e) {
        return new Set();
    }
}

async function main() {
    console.log('🚀 Starting Global Dictation Translation (All Topics, 69 Languages)...');

    const { data: sentences, error } = await supabase
        .from('dictation_sentences')
        .select('id, sentence_text');

    if (error) {
        console.error('DB Error:', error);
        return;
    }

    console.log(`📦 Found ${sentences.length} total sentences across all topics.`);
    console.log(`🌍 Supported languages: ${LANGUAGE_OPTIONS.length}`);

    const BATCH_SIZE = 15;

    // Process language by language to avoid overloading the worker or API
    for (const langObj of LANGUAGE_OPTIONS) {
        const lang = langObj.code;
        console.log(`\n🌎 Starting Language: ${langObj.name} (${lang})`);

        for (let i = 0; i < sentences.length; i += BATCH_SIZE) {
            const batch = sentences.slice(i, i + BATCH_SIZE);
            const sentenceIds = batch.map(s => s.id);

            // Skip if already translated in D1
            const existingIds = await checkExisting(sentenceIds, lang);
            const missingBatch = batch.filter(s => !existingIds.has(s.id));

            if (missingBatch.length === 0) {
                console.log(`  ⏩ Skipping batch ${Math.floor(i / BATCH_SIZE) + 1} for ${lang} (already translated).`);
                continue;
            }

            console.log(`  🔹 Batch ${Math.floor(i / BATCH_SIZE) + 1}: Translating ${missingBatch.length} missing sentences...`);
            const translatedTexts = await translateBatch(missingBatch.map(s => s.sentence_text), lang);

            if (translatedTexts.length === missingBatch.length) {
                const d1Payload = missingBatch.map((s, idx) => ({
                    sentence_id: s.id,
                    lang,
                    translation: translatedTexts[idx]
                }));

                const ok = await saveToD1(d1Payload);
                if (ok) {
                    console.log(`  ✅ Successfully saved ${lang} batch to Cloudflare.`);
                }
            } else {
                console.warn(`  ⚠️ Count mismatch for ${lang}. Translated: ${translatedTexts.length}, Sent: ${missingBatch.length}`);
            }

            // Brief pause between batches
            await new Promise(r => setTimeout(r, 1000));
        }
    }

    console.log('\n✨ Global translation task completed successfully!');
}

main();
