
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cuumxmfzhwljylbdlflj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTkxMjEsImV4cCI6MjA2OTA5NTEyMX0.8jqO_ciOttSxSLZnKY0i5oJmEn79ROF53TjUMYhNemI';

const supabase = createClient(supabaseUrl, supabaseKey);

// Languages to support (add more if needed)
const LANGUAGES = [
    { code: 'es', name: 'Español' },
    { code: 'zh', name: 'Chinese (Simplified)' },
    { code: 'hi', name: 'Hindi' },
    { code: 'ar', name: 'Arabic' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'bn', name: 'Bengali' },
    { code: 'ru', name: 'Russian' },
    { code: 'ja', name: 'Japanese' },
    { code: 'de', name: 'German' },
    { code: 'fr', name: 'French' },
    { code: 'ko', name: 'Korean' },
    { code: 'vi', name: 'Vietnamese' },
    { code: 'it', name: 'Italian' },
    { code: 'tr', name: 'Turkish' },
    { code: 'th', name: 'Thai' },
    { code: 'pl', name: 'Polish' },
    { code: 'nl', name: 'Dutch' },
    { code: 'id', name: 'Indonesian' },
    { code: 'uk', name: 'Ukrainian' },
    { code: 'ms', name: 'Malay' },
    { code: 'fa', name: 'Persian' },
    { code: 'tl', name: 'Tagalog' },
    { code: 'ro', name: 'Romanian' },
    { code: 'el', name: 'Greek' },
    { code: 'cs', name: 'Czech' },
    { code: 'sv', name: 'Swedish' },
    { code: 'hu', name: 'Hungarian' },
    { code: 'he', name: 'Hebrew' }
];

async function main() {
    console.log('🚀 Starting Batch Grammar Content Generation...');

    // 1. Get all lessons
    const { data: lessons, error: lessonError } = await supabase
        .from('grammar_lessons')
        .select('id, topic_id, grammar_topics(slug)');

    if (lessonError) {
        console.error('❌ Failed to fetch lessons:', lessonError);
        return;
    }

    console.log(`📚 Found ${lessons.length} lessons.`);

    for (const lesson of lessons) {
        const topicSlug = lesson.grammar_topics?.slug || 'Unknown Topic';
        console.log(`\nProcessing Lesson: ${topicSlug} (${lesson.id})`);

        for (const lang of LANGUAGES) {
            // 2. Check if translation exists
            const { data: existing, error: checkError } = await supabase
                .from('grammar_lesson_translations')
                .select('id')
                .eq('lesson_id', lesson.id)
                .eq('language_code', lang.code)
                .maybeSingle();

            if (existing) {
                console.log(`  - [${lang.code}] already exists. Skipping.`);
                continue;
            }

            console.log(`  - [${lang.code}] Generating content...`);

            // Retry logic
            let attempts = 0;
            const maxAttempts = 3;
            let success = false;

            while (attempts < maxAttempts && !success) {
                try {
                    attempts++;
                    // 3. Generate content
                    const { data, error } = await supabase.functions.invoke('enhance-grammar-lesson', {
                        body: {
                            lesson_id: lesson.id,
                            language_code: lang.code,
                            language_name: lang.name
                        }
                    });

                    if (error) {
                        throw error;
                    } else if (!data.success) {
                        throw new Error(data.error || 'Unknown API failure');
                    } else {
                        console.log(`    ✅ Success! Content generated for ${lang.name}`);
                        success = true;
                    }
                } catch (err) {
                    console.error(`    ⚠️  Attempt ${attempts}/${maxAttempts} failed for ${lang.code}:`, err.message || err);
                    if (attempts < maxAttempts) {
                        console.log(`    ⏳ Retrying in ${attempts * 2} seconds...`);
                        await new Promise(resolve => setTimeout(resolve, attempts * 2000));
                    } else {
                        console.error(`    ❌ Given up on ${lang.code} after ${maxAttempts} attempts.`);
                    }
                }
            }

            // Shorter delay for DeepSeek
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    console.log('\n✨ Batch generation complete!');
}

main().catch(console.error);
