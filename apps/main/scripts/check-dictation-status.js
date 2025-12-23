
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_KEY;

if (!url || !key) {
    console.error('❌ SUPABASE_URL and SUPABASE_KEY env vars required.');
    process.exit(1);
}

const supabase = createClient(url, key);

async function checkStatus() {
    console.log('📊 Checking Dictation Audio Status...');

    // Total count
    const { count: total, error: countError } = await supabase
        .from('dictation_sentences')
        .select('*', { count: 'exact', head: true });

    if (countError) {
        console.error('Error fetching total:', countError.message);
        return;
    }

    // Pending count: fetch specific columns to filter in JS if needed, 
    // or use a more complex query. 
    // Logic: !audio_url_us OR !audio_url_uk OR audio_url_us == audio_url_uk

    // To avoid fetching all data, let's do a paginated check or just fetch ID/urls
    // For 1700 rows, fetching ID+URLs is fine (approx 200KB data)

    const { data: sentences, error: dataError } = await supabase
        .from('dictation_sentences')
        .select('id, audio_url_us, audio_url_uk');

    if (dataError) {
        console.error('Error fetching data:', dataError.message);
        return;
    }

    const pending = sentences.filter(s =>
        !s.audio_url_us ||
        !s.audio_url_uk ||
        s.audio_url_us === s.audio_url_uk
    ).length;

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📝 Total Sentences:   ${total}`);
    console.log(`⏳ Pending Audio:     ${pending}`);
    console.log(`✅ Completed:         ${total - pending}`);
    console.log(`📉 Completion Rate:   ${(((total - pending) / total) * 100).toFixed(1)}%`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

checkStatus();
