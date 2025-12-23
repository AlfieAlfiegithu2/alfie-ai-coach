
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cuumxmfzhwljylbdlflj.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzUxOTEyMSwiZXhwIjoyMDY5MDk1MTIxfQ.1-IKqEM9i2Plmuat2iBWTtKB3u1gL_Bx6P5ZrkYSmLg';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function testVocabGenerateTTS() {
    console.log(`Testing function: vocab-generate-tts...`);
    try {
        const { data, error } = await supabase.functions.invoke('vocab-generate-tts', {
            body: { card_id: 'test', term: 'test' }
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

testVocabGenerateTTS();
