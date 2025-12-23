import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cuumxmfzhwljylbdlflj.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDecks() {
    const { data: decks, error } = await supabase
        .from('vocab_decks')
        .select('id, name, is_public')
        .limit(10);

    if (error) {
        console.error('Error fetching decks:', error);
        return;
    }

    console.log(`Found ${decks?.length || 0} decks.`);
    if (decks && decks.length > 0) {
        console.log('Sample decks:', JSON.stringify(decks, null, 2));

        // Check cards for the first deck
        const { count } = await supabase
            .from('vocab_cards')
            .select('*', { count: 'exact', head: true })
            .eq('deck_id', decks[0].id);
        console.log(`Cards in first deck (${decks[0].name}): ${count}`);
    }
}

checkDecks();
