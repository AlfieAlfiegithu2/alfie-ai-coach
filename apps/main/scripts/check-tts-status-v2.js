import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cuumxmfzhwljylbdlflj.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkVocabStats() {
    const { count: total, error: e1 } = await supabase
        .from('vocab_cards')
        .select('*', { count: 'exact', head: true });

    const { count: withAudio, error: e2 } = await supabase
        .from('vocab_cards')
        .select('*', { count: 'exact', head: true })
        .not('audio_url', 'is', null);

    const { count: publicEnglish, error: e3 } = await supabase
        .from('vocab_cards')
        .select('*', { count: 'exact', head: true })
        .eq('is_public', true)
        .eq('language', 'en');

    const { count: publicEnglishWithAudio, error: e4 } = await supabase
        .from('vocab_cards')
        .select('*', { count: 'exact', head: true })
        .eq('is_public', true)
        .eq('language', 'en')
        .not('audio_url', 'is', null);

    console.log(`Total vocab cards: ${total}`);
    console.log(`Cards with audio: ${withAudio}`);
    console.log(`Public English cards: ${publicEnglish}`);
    console.log(`Public English cards with audio: ${publicEnglishWithAudio}`);

    if (total > 0) {
        const { data: sample } = await supabase
            .from('vocab_cards')
            .select('term, language, is_public, audio_url')
            .limit(5);
        console.log('Sample cards:', JSON.stringify(sample, null, 2));
    }
}

checkVocabStats();
