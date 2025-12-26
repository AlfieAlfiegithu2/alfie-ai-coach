
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
    console.error('❌ SUPABASE_URL and SUPABASE_KEY env vars required.');
    process.exit(1);
}

const supabase = createClient(url, key);

async function addTranslations() {
    console.log('Adding Korean translations for numbers-counting...');

    // Get the topic ID
    const { data: topic } = await supabase
        .from('dictation_topics')
        .select('id')
        .eq('slug', 'numbers-counting')
        .single();

    if (!topic) {
        console.error('Topic numbers-counting not found');
        return;
    }

    // Get sentences
    const { data: sentences } = await supabase
        .from('dictation_sentences')
        .select('*')
        .eq('topic_id', topic.id);

    if (!sentences || sentences.length === 0) {
        console.log('No sentences found for this topic.');
        return;
    }

    // Basic dictionary for numbers topic (fallback/demo)
    const translations = {
        "I have two dogs and one cat.": "나는 개 두 마리와 고양이 한 마리를 키워요.",
        "There are five people in my family.": "우리 가족은 다섯 명이에요.",
        "Please wait for ten minutes.": "10분만 기다려 주세요.",
        "My phone number is 555-0123.": "제 전화번호는 555-0123입니다.",
        "It costs twenty dollars.": "그것은 20달러입니다.",
        "I wake up at seven o'clock.": "나는 7시에 일어납니다.",
        "There are twelve months in a year.": "일 년은 12달입니다.",
        "She is thirty years old.": "그녀는 서른 살입니다.",
        "We need three more chairs.": "의자가 3개 더 필요해요.",
        "The bus arrives at six thirty.": "버스는 6시 30분에 도착합니다."
    };

    let updated = 0;
    for (const sentence of sentences) {
        const ko = translations[sentence.sentence_text] || `[Korean translation for: ${sentence.sentence_text}]`; // Fallback for demo

        // Don't overwrite if it exists and looks real (unless we forcing)
        if (sentence.translations?.ko && !sentence.translations.ko.startsWith('[')) {
            continue;
        }

        const newTranslations = {
            ...sentence.translations,
            ko: ko
        };

        const { error } = await supabase
            .from('dictation_sentences')
            .update({ translations: newTranslations })
            .eq('id', sentence.id);

        if (error) {
            if (error.code === '42703') { // Undefined column
                console.warn(`Column 'translations' missing, falling back to 'hints' column for ${sentence.id}`);
                await supabase
                    .from('dictation_sentences')
                    .update({ hints: JSON.stringify({ ko: ko }) })
                    .eq('id', sentence.id);
                updated++;
            } else {
                console.error(`Failed to update sentence ${sentence.id}:`, error.message);
            }
        } else {
            updated++;
        }
    }

    console.log(`✅ Updated ${updated} sentences with Korean translations.`);
}

addTranslations();
