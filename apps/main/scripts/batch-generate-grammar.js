
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cuumxmfzhwljylbdlflj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTkxMjEsImV4cCI6MjA2OTA5NTEyMX0.8jqO_ciOttSxSLZnKY0i5oJmEn79ROF53TjUMYhNemI';

const supabase = createClient(supabaseUrl, supabaseKey);

// Languages to support (add more if needed)
const LANGUAGES = [
    { code: 'zh', name: 'Chinese (Simplified)' },
    { code: 'hi', name: 'Hindi' },
    { code: 'vi', name: 'Vietnamese' },
    { code: 'ja', name: 'Japanese' },
    { code: 'es', name: 'Spanish' },
    { code: 'ko', name: 'Korean' },
    { code: 'ar', name: 'Arabic' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'fr', name: 'French' },
    { code: 'ru', name: 'Russian' },
    { code: 'id', name: 'Indonesian' },
    { code: 'th', name: 'Thai' }
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

            // 3. Generate content
            const { data, error } = await supabase.functions.invoke('enhance-grammar-lesson', {
                body: {
                    lesson_id: lesson.id,
                    language_code: lang.code,
                    language_name: lang.name
                }
            });

            if (error) {
                console.error(`    ❌ Error generating ${lang.code}:`, error.message);
            } else if (!data.success) {
                console.error(`    ❌ API returned failure for ${lang.code}:`, data.error);
            } else {
                console.log(`    ✅ Success! Content generated for ${lang.name}`);
            }

            // Delay to respect rate limits (Gemini API)
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    console.log('\n✨ Batch generation complete!');
}

main().catch(console.error);
