import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ SUPABASE_URL and SUPABASE_KEY are required env variables.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
    // Find the Numbers & Counting topic
    const { data: topic, error: topicError } = await supabase
        .from('dictation_topics')
        .select('id, title, slug')
        .eq('slug', 'numbers-counting')
        .single();

    if (topicError || !topic) {
        console.log('Topic not found:', topicError?.message);
        return;
    }

    console.log('Topic:', topic.title, '(ID:', topic.id, ')');

    // Get sentences for this topic
    const { data: sentences, error: sentError } = await supabase
        .from('dictation_sentences')
        .select('id, sentence_text, audio_url_us, audio_url_uk')
        .eq('topic_id', topic.id)
        .limit(5);

    if (sentError || !sentences) {
        console.log('Error fetching sentences:', sentError?.message);
        return;
    }

    console.log('\nSentences:');
    let sameCount = 0;
    sentences.forEach((s, i) => {
        const text = s.sentence_text.length > 50 ? s.sentence_text.substring(0, 50) + '...' : s.sentence_text;
        console.log('\n' + (i + 1) + '. "' + text + '"');
        console.log('   US:', s.audio_url_us || 'NULL');
        console.log('   UK:', s.audio_url_uk || 'NULL');
        const same = s.audio_url_us === s.audio_url_uk;
        console.log('   Same?', same ? '⚠️ YES (PROBLEM!)' : '✅ NO (GOOD)');
        if (same && s.audio_url_us) sameCount++;
    });

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    if (sameCount > 0) {
        console.log('⚠️  Found', sameCount, 'sentences with identical US/UK audio');
    } else {
        console.log('✅ All audio URLs are distinct (or missing)');
    }
}

run();
