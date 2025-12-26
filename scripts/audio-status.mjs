import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://cuumxmfzhwljylbdlflj.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTkxMjEsImV4cCI6MjA2OTA5NTEyMX0.8jqO_ciOttSxSLZnKY0i5oJmEn79ROF53TjUMYhNemI');

const { data } = await supabase.from('dictation_sentences').select('id, audio_url_us, audio_url_uk');

const bothComplete = data.filter(s => s.audio_url_us && s.audio_url_uk).length;
const usOnly = data.filter(s => s.audio_url_us && !s.audio_url_uk).length;
const ukOnly = data.filter(s => !s.audio_url_us && s.audio_url_uk).length;
const none = data.filter(s => !s.audio_url_us && !s.audio_url_uk).length;

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📊 DETAILED AUDIO STATUS');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Both US+UK:  ' + bothComplete);
console.log('US only:     ' + usOnly);
console.log('UK only:     ' + ukOnly);
console.log('No audio:    ' + none);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Total:       ' + data.length);
