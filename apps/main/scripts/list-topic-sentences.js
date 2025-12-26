
import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
    console.error('❌ SUPABASE_URL and SUPABASE_KEY env vars required.');
    process.exit(1);
}

const supabase = createClient(url, key);

async function listSentences() {
    // Get the topic ID
    const { data: topic } = await supabase
        .from('dictation_topics')
        .select('id, title')
        .eq('slug', 'numbers-counting')
        .single();

    if (!topic) {
        console.error('Topic numbers-counting not found');
        return;
    }

    console.log(`Listing sentences for: ${topic.title} (${topic.id})`);

    const { data: sentences, error } = await supabase
        .from('dictation_sentences')
        .select('sentence_text')
        .eq('topic_id', topic.id)
        .order('order_index', { ascending: true });

    if (error) {
        console.error('Error:', error.message);
        return;
    }

    sentences.forEach((s, idx) => {
        console.log(`${idx + 1}. "${s.sentence_text}"`);
    });
}

listSentences();
