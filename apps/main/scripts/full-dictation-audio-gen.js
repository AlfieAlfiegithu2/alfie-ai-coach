import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://cuumxmfzhwljylbdlflj.supabase.co';
const ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTkxMjEsImV4cCI6MjA2OTA5NTEyMX0.8jqO_ciOttSxSLZnKY0i5oJmEn79ROF53TjUMYhNemI';

// We use ANON_KEY because it's valid for reading topics, and the Edge Function is deployed with --no-verify-jwt
const AUTH_KEY = ANON_KEY;

if (!AUTH_KEY || AUTH_KEY.length < 50) {
    console.error('❌ AUTH_KEY is required and must be valid');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, AUTH_KEY);

async function runFullAudioGeneration() {
    console.log('🚀 Starting Full Dictation Audio Generation (Gemini 2.5)');
    console.log('📡 Project URL:', SUPABASE_URL);

    // 1. Get all topics
    const { data: topics, error: topicsError } = await supabase
        .from('dictation_topics')
        .select('slug, title')
        .order('level_id', { ascending: true })
        .order('order_index', { ascending: true });

    if (topicsError) {
        console.error('❌ Error fetching topics:', topicsError.message);
        return;
    }

    console.log(`📚 Found ${topics.length} topics to process.\n`);

    const logFile = 'dictation_audio_gen_progress.log';
    fs.writeFileSync(logFile, `Generation started at ${new Date().toISOString()}\n\n`);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < topics.length; i++) {
        const topic = topics[i];
        const progress = `[${i + 1}/${topics.length}]`;
        console.log(`${progress} Processing topic: ${topic.title} (${topic.slug})...`);

        try {
            const startTime = Date.now();
            const response = await fetch(`${SUPABASE_URL}/functions/v1/dictation-regenerate-audio`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${AUTH_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    topicSlug: topic.slug,
                    limit: 25 // Topics usually have 20 sentences
                })
            });

            const result = await response.json();
            const duration = ((Date.now() - startTime) / 1000).toFixed(1);

            if (result.success) {
                const successes = result.results?.filter(r => r.status === 'success').length || 0;
                const errors = result.results?.filter(r => r.status === 'error');

                const msg = `✅ ${progress} ${topic.title}: ${successes} successful, ${errors.length} failed (${duration}s)`;
                console.log(msg);
                fs.appendFileSync(logFile, msg + '\n');

                if (errors.length > 0) {
                    const sampleError = errors[0].error;
                    console.log(`   ⚠️ Sample error: ${sampleError.substring(0, 100)}...`);
                    fs.appendFileSync(logFile, `   ⚠️ Sample error: ${sampleError}\n`);

                    // Stop if we hit quota limits
                    if (sampleError.includes('429') || sampleError.includes('quota') || sampleError.includes('RESOURCE_EXHAUSTED')) {
                        const stopMsg = '🚨 Quota exceeded / Rate limited. Stopping generation to avoid further errors.';
                        console.error(stopMsg);
                        fs.appendFileSync(logFile, stopMsg + '\n');
                        process.exit(0);
                    }
                }

                successCount += successes;
                failCount += errors.length;
            } else {
                const msg = `❌ ${progress} ${topic.title} Request Failed: ${result.error}`;
                console.error(msg);
                fs.appendFileSync(logFile, msg + '\n');
                failCount += 20; // Assume 20 failed
            }
        } catch (err) {
            const msg = `💥 ${progress} ${topic.title} Error: ${err.message}`;
            console.error(msg);
            fs.appendFileSync(logFile, msg + '\n');
            failCount++;
        }

        // Delay between topics to stay well within Gemini/Supabase limits
        await new Promise(r => setTimeout(r, 2000));
    }

    const summary = `\n🏁 Generation Complete!\n✅ Success: ${successCount}\n❌ Failed: ${failCount}\nLog saved to: ${logFile}`;
    console.log(summary);
    fs.appendFileSync(logFile, summary + '\n');
}

runFullAudioGeneration();
