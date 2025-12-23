import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cuumxmfzhwljylbdlflj.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
    console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkVocabStats() {
    const { count, error } = await supabase
        .from('vocab_cards')
        .select('*', { count: 'exact', head: true })
        .eq('is_public', true)
        .eq('language', 'en')
        .is('audio_url', null);

    if (error) {
        console.error('Error fetching count:', error);
        return;
    }

    console.log(`Total public English vocab cards without audio: ${count}`);
}

checkVocabStats();
