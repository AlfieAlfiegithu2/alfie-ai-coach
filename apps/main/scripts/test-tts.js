
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cuumxmfzhwljylbdlflj.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzUxOTEyMSwiZXhwIjoyMDY5MDk1MTIxfQ.1-IKqEM9i2Plmuat2iBWTtKB3u1gL_Bx6P5ZrkYSmLg';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function testTTS() {
    console.log('Testing elevenlabs-voice edge function...');

    const { data, error } = await supabase.functions.invoke('elevenlabs-voice', {
        body: {
            text: 'Hello, this is a test for the dictation feature.',
            voice_id: 'EXAVITQu4vr4xnSDxMaL' // Bella (US)
        }
    });

    if (error) {
        console.error('❌ Edge Function Error:', error);
    } else {
        console.log('✅ Success! Audio URL:', data.audio_url);
    }
}

testTTS();
