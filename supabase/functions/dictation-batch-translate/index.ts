
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY');
const D1_API_URL = 'https://alfie-translations-api.ryanbigbang15.workers.dev';

// Full list of 69 languages
const LANGUAGES = [
    'zh', 'zh-TW', 'es', 'hi', 'ar', 'bn', 'pt', 'ru', 'ja', 'ko', 'vi', 'fr', 'de', 'it', 'tr',
    'th', 'id', 'ms', 'tl', 'my', 'km', 'ur', 'ta', 'te', 'mr', 'gu', 'kn', 'ml', 'pa', 'or',
    'as', 'ne', 'si', 'fa', 'he', 'ps', 'nl', 'pl', 'uk', 'ro', 'el', 'cs', 'hu', 'sv', 'bg',
    'sr', 'hr', 'sk', 'no', 'da', 'fi', 'sq', 'sl', 'et', 'lv', 'lt', 'uz', 'kk', 'az', 'mn',
    'ka', 'hy', 'sw', 'ha', 'yo', 'ig', 'am', 'zu', 'af', 'yue'
];

const LANG_NAMES: Record<string, string> = {
    'zh': 'Chinese (Simplified)', 'zh-TW': 'Chinese (Traditional)', 'es': 'Spanish', 'hi': 'Hindi',
    'ar': 'Arabic', 'bn': 'Bengali', 'pt': 'Portuguese', 'ru': 'Russian', 'ja': 'Japanese',
    'ko': 'Korean', 'vi': 'Vietnamese', 'fr': 'French', 'de': 'German', 'it': 'Italian',
    'tr': 'Turkish', 'th': 'Thai', 'id': 'Indonesian', 'ms': 'Malay', 'tl': 'Filipino',
    'my': 'Burmese', 'km': 'Khmer', 'ur': 'Urdu', 'ta': 'Tamil', 'te': 'Telugu', 'mr': 'Marathi',
    'gu': 'Gujarati', 'kn': 'Kannada', 'ml': 'Malayalam', 'pa': 'Punjabi', 'or': 'Odia',
    'as': 'Assamese', 'ne': 'Nepali', 'si': 'Sinhala', 'fa': 'Persian', 'he': 'Hebrew',
    'ps': 'Pashto', 'nl': 'Dutch', 'pl': 'Polish', 'uk': 'Ukrainian', 'ro': 'Romanian',
    'el': 'Greek', 'cs': 'Czech', 'hu': 'Hungarian', 'sv': 'Swedish', 'bg': 'Bulgarian',
    'sr': 'Serbian', 'hr': 'Croatian', 'sk': 'Slovak', 'no': 'Norwegian', 'da': 'Danish',
    'fi': 'Finnish', 'sq': 'Shqip', 'sl': 'Slovenian', 'et': 'Estonian', 'lv': 'Latvian',
    'lt': 'Lithuanian', 'uz': 'Uzbek', 'kk': 'Kazakh', 'az': 'Azerbaijani', 'mn': 'Mongolian',
    'ka': 'Georgian', 'hy': 'Armenian', 'sw': 'Swahili', 'ha': 'Hausa', 'yo': 'Yoruba',
    'ig': 'Igbo', 'am': 'Amharic', 'zu': 'Zulu', 'af': 'Afrikaans', 'yue': 'Cantonese'
};

async function translateBatch(sentences: string[], langCode: string) {
    const langName = LANG_NAMES[langCode] || langCode;
    const prompt = `Translate these ${sentences.length} English sentences into natural, polite ${langName}. 
Return ONLY a JSON array of strings in the same order.

Sentences:
${sentences.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;

    const res = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1,
            response_format: { type: 'json_object' } // DeepSeek V3 supports this!
        }),
    });

    // Note: If JSON format is used, we need to wrap the prompt to ask for a specific key
    // But V3 is very good at following instructions. Let's try simple first.

    // Actually, DeepSeek V3 is best at simple JSON arrays if told correctly.
    const data = await res.json();
    let content = data.choices?.[0]?.message?.content || '[]';

    try {
        // Clean up markdown if any
        if (content.includes('```')) {
            content = content.replace(/```json?\s*|```/g, '');
        }
        const parsed = JSON.parse(content);
        return Array.isArray(parsed) ? parsed : (parsed.translations || []);
    } catch (e) {
        console.error('Parse error:', e, content);
        return [];
    }
}

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

    try {
        const { lang = 'ko', batchSize = 15, continueFrom = null } = await req.json();

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        // 1. Get sentences missing this translation in D1
        // For simplicity, we fetch from Supabase and check D1 (or just fetch a chunk)
        let query = supabase
            .from('dictation_sentences')
            .select('id, sentence_text')
            .order('id', { ascending: true })
            .limit(batchSize);

        if (continueFrom) {
            query = query.gt('id', continueFrom);
        }

        const { data: sentences, error: fetchError } = await query;
        if (fetchError) throw fetchError;
        if (!sentences || sentences.length === 0) {
            return new Response(JSON.stringify({ success: true, message: 'Done', hasMore: false }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // 2. Translate
        const translatedTexts = await translateBatch(sentences.map(s => s.sentence_text), lang);

        if (translatedTexts.length !== sentences.length) {
            throw new Error(`Scale mismatch: got ${translatedTexts.length}, expected ${sentences.length}`);
        }

        // 3. Save to D1
        const d1Payload = sentences.map((s, idx) => ({
            sentence_id: s.id,
            lang,
            translation: translatedTexts[idx]
        }));

        const saveRes = await fetch(`${D1_API_URL}/dictation-translations/batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ translations: d1Payload })
        });

        const lastId = sentences[sentences.length - 1].id;

        return new Response(JSON.stringify({
            success: true,
            processed: sentences.length,
            lastId,
            hasMore: sentences.length === batchSize
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
});
