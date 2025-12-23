
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cuumxmfzhwljylbdlflj.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzUxOTEyMSwiZXhwIjoyMDY5MDk1MTIxfQ.1-IKqEM9i2Plmuat2iBWTtKB3u1gL_Bx6P5ZrkYSmLg';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function testPronAudio() {
    console.log(`Testing function: pronunciation-generate-audio...`);
    try {
        const { data, error } = await supabase.functions.invoke('pronunciation-generate-audio', {
            body: {
                text: 'Test',
                accent: 'us',
                test_id: 'test',
                item_id: 'test'
            }
        });
        if (error) {
            console.log(`❌ error:`, error.message);
            if (error.context) {
                console.log(`   Status: ${error.context.status}`);
            }
        } else {
            console.log(`✅ success!`);
        }
    } catch (e) {
        console.log(`❌ exception:`, e.message);
    }
}

testPronAudio();
