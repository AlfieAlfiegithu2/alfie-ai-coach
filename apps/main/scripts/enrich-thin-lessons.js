
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cuumxmfzhwljylbdlflj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTkxMjEsImV4cCI6MjA2OTA5NTEyMX0.8jqO_ciOttSxSLZnKY0i5oJmEn79ROF53TjUMYhNemI';

const supabase = createClient(supabaseUrl, supabaseKey);

// Target lessons that still need content (from health check)
const THIN_LESSONS = [
    '22222222-2222-2222-2222-222222222214', // Relative Clauses
    '22222222-2222-2222-2222-222222222221', // Subjunctive Mood
    '22222222-2222-2222-2222-222222222222', // Phrasal Verbs in Context
    '22222222-2222-2222-2222-222222222223', // Discourse Markers
    '22222222-2222-2222-2222-222222222224', // Common Grammar Mistakes Review
    '103410d5-5292-4277-b5f8-00f4ef8a3907', // Feelings: To Be vs To Have
    '4dbea72a-309b-429c-8bdf-a640bed7f687', // This, That, These, Those
    'bfeaa818-6f5a-4ad7-9b06-c740385609ed', // He/She/It (The S Rule)
    '7c9ecc62-c5d3-49a7-8a3a-b2d1428c9a93', // Adjective Order
    '2022190a-ee34-4011-b5dc-bc2e1a7cd45d', // There is vs It is
    'b65c5a68-e570-4145-a17d-3988e1c90976', // Frequency Adverbs
    '8a4b0d25-9bcb-44c4-a06d-e2c9ad7ae04b', // Object Placement
    '22222222-2222-2222-2222-222222222205', // Pronouns & Possessives
];

async function enrichLesson(lessonId) {
    console.log(`\n🚀 Enriching Lesson: ${lessonId}`);

    // Get topic slug for context
    const { data: lessonData } = await supabase
        .from('grammar_lessons')
        .select('grammar_topics(slug)')
        .eq('id', lessonId)
        .single();

    const slug = lessonData?.grammar_topics?.slug || 'unknown';
    console.log(`  Topic: ${slug}`);

    // 1. Enrich English Lesson Content
    console.log('  - [en] Generating high-quality lesson content...');
    try {
        const { data: enData, error: enError } = await supabase.functions.invoke('enhance-grammar-lesson', {
            body: {
                lesson_id: lessonId,
                language_code: 'en',
                language_name: 'English'
            }
        });
        if (enError) throw enError;
        console.log('    ✅ English lesson enriched.');
    } catch (e) {
        console.error('    ❌ English lesson failed:', e.message);
        return;
    }

    // 2. Localize to Vietnamese
    console.log('  - [vi] Localizing to Vietnamese...');
    try {
        await supabase.functions.invoke('enhance-grammar-lesson', {
            body: {
                lesson_id: lessonId,
                language_code: 'vi',
                language_name: 'Vietnamese'
            }
        });
        console.log('    ✅ Localized to Vietnamese.');
    } catch (e) {
        console.error('    ❌ Vietnamese localization failed:', e.message);
    }
}

async function run() {
    console.log(`Starting enrichment for ${THIN_LESSONS.length} thin lessons...`);

    for (const lessonId of THIN_LESSONS) {
        await enrichLesson(lessonId);
        // Small delay between API calls
        await new Promise(r => setTimeout(r, 1000));
    }

    console.log('\n✨ Thin lesson enrichment complete!');
}

run().catch(console.error);
