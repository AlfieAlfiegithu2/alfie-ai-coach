
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cuumxmfzhwljylbdlflj.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzUxOTEyMSwiZXhwIjoyMDY5MDk1MTIxfQ.1-IKqEM9i2Plmuat2iBWTtKB3u1gL_Bx6P5ZrkYSmLg';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function testFunctions() {
    const funcs = ['elevenlabs-voice', 'text-to-speech', 'vocab-batch-tts'];

    for (const name of funcs) {
        console.log(`Testing function: ${name}...`);
        try {
            const { data, error } = await supabase.functions.invoke(name, {
                body: { text: 'test' }
            });
            if (error) {
                console.log(`❌ ${name} returned error:`, error.message);
                if (error.context) {
                    console.log(`   Status: ${error.context.status}`);
                }
            } else {
                console.log(`✅ ${name} success!`);
            }
        } catch (e) {
            console.log(`❌ ${name} threw exception:`, e.message);
        }
    }
}

testFunctions();
