import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cuumxmfzhwljylbdlflj.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTkxMjEsImV4cCI6MjA2OTA5NTEyMX0.8jqO_ciOttSxSLZnKY0i5oJmEn79ROF53TjUMYhNemI';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzUxOTEyMSwiZXhwIjoyMDY5MDk1MTIxfQ.1-IKqEM9i2Plmuat2iBWTtKB3u1gL_Bx6P5ZrkYSmLg';

async function test() {
    console.log('Testing with ANON_KEY...');
    const supabaseAnon = createClient(SUPABASE_URL, ANON_KEY);
    const { data: levelsAnon, error: errorAnon } = await supabaseAnon.from('dictation_levels').select('*');
    if (errorAnon) {
        console.error('ANON_KEY Error:', errorAnon.message);
    } else {
        console.log('ANON_KEY Success! Levels found:', levelsAnon.length);
    }

    console.log('\nTesting with SERVICE_KEY...');
    const supabaseService = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: levelsService, error: errorService } = await supabaseService.from('dictation_levels').select('*');
    if (errorService) {
        console.error('SERVICE_KEY Error:', errorService.message);
    } else {
        console.log('SERVICE_KEY Success! Levels found:', levelsService.length);
    }
}

test();
