import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://cuumxmfzhwljylbdlflj.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTkxMjEsImV4cCI6MjA2OTA5NTEyMX0.8jqO_ciOttSxSLZnKY0i5oJmEn79ROF53TjUMYhNemI'
);

async function check() {
    const { data } = await supabase.from('dictation_sentences').select('id, audio_url_us, audio_url_uk');
    const pending = data.filter(s => !s.audio_url_us || !s.audio_url_uk || s.audio_url_us === s.audio_url_uk).length;
    console.log(`Total: ${data.length} | Pending: ${pending} | Complete: ${data.length - pending} | Rate: ${(((data.length - pending) / data.length) * 100).toFixed(1)}%`);
}
check();
