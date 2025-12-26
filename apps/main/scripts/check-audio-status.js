import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://cuumxmfzhwljylbdlflj.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5MTc1ODMsImV4cCI6MjA1MDQ5MzU4M30.uSwP0h696vRGAeKm4_Ax7PNmrZzVe9j1VW2UGqBNhsU');

async function check() {
    // Get all dictation topics
    const { data: topics } = await supabase.from('dictation_topics').select('id, title, slug').order('order_index');

    if (!topics || topics.length === 0) {
        console.log('No topics found');
        return;
    }

    console.log('Listening for Details - Audio Status:\n');

    for (const topic of topics) {
        const { data: sentences } = await supabase
            .from('dictation_sentences')
            .select('id, audio_url_us, audio_url_uk')
            .eq('topic_id', topic.id);

        const total = sentences?.length || 0;
        const withBothAudio = sentences?.filter(s => s.audio_url_us && s.audio_url_uk).length || 0;
        const withUsOnly = sentences?.filter(s => s.audio_url_us && !s.audio_url_uk).length || 0;
        const withUkOnly = sentences?.filter(s => !s.audio_url_us && s.audio_url_uk).length || 0;
        const noAudio = sentences?.filter(s => !s.audio_url_us && !s.audio_url_uk).length || 0;

        console.log(`📂 ${topic.title} (${topic.slug})`);
        console.log(`   Total: ${total} | ✅ Complete: ${withBothAudio} | 🇺🇸 US only: ${withUsOnly} | 🇬🇧 UK only: ${withUkOnly} | ❌ None: ${noAudio}`);
    }
}
check();
