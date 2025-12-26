import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://cuumxmfzhwljylbdlflj.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTkxMjEsImV4cCI6MjA2OTA5NTEyMX0.8jqO_ciOttSxSLZnKY0i5oJmEn79ROF53TjUMYhNemI'
);

async function showSamples() {
    const { data } = await supabase.from('dictation_sentences').select('*');
    const completed = data.filter(s => s.audio_url_us && s.audio_url_uk && s.audio_url_us !== s.audio_url_uk);

    console.log(`\n🎉 Verified ${completed.length} completed sentences.`);
    console.log('Sample Audio URLs (Copy & Paste to browser to listen):');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    completed.slice(0, 5).forEach((s, i) => {
        console.log(`\n${i + 1}. "${s.sentence_text}"`);
        console.log(`   🇺🇸 US: ${s.audio_url_us}`);
        console.log(`   🇬🇧 UK: ${s.audio_url_uk}`);
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

showSamples();
