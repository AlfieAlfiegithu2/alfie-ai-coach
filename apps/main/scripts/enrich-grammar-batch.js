
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cuumxmfzhwljylbdlflj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTkxMjEsImV4cCI6MjA2OTA5NTEyMX0.8jqO_ciOttSxSLZnKY0i5oJmEn79ROF53TjUMYhNemI';

const supabase = createClient(supabaseUrl, supabaseKey);

const LANGUAGES = [
    { code: 'en', name: 'English' },
    { code: 'vi', name: 'Vietnamese' }
];

async function enrichTopic(topicId, slug) {
    console.log(`\n🚀 Enriching Topic: ${slug} (${topicId})`);

    // 1. Enrich English Lesson Content
    console.log('  - [en] Generating high-quality lesson content...');
    const lessonId = await getLessonId(topicId);
    if (!lessonId) {
        console.error('    ❌ No lesson found for topic.');
        return;
    }

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
        return false;
    }

    // 2. Generate Exercises (in English first)
    console.log('  - [en] Generating exercises...');
    try {
        const { data: exData, error: exError } = await supabase.functions.invoke('generate-grammar-exercises', {
            body: {
                topic_id: topicId,
                language_code: 'en',
                language_name: 'English',
                count: 15
            }
        });
        if (exError) throw exError;
        console.log(`    ✅ Generated ${exData.count} exercises.`);
    } catch (e) {
        console.error('    ❌ Exercises failed:', e.message);
    }

    // 3. Localize to other languages (e.g., Vietnamese)
    for (const lang of LANGUAGES) {
        if (lang.code === 'en') continue;
        console.log(`  - [${lang.code}] Localizing enriched content...`);
        try {
            await supabase.functions.invoke('enhance-grammar-lesson', {
                body: {
                    lesson_id: lessonId,
                    language_code: lang.code,
                    language_name: lang.name
                }
            });
            console.log(`    ✅ Localized to ${lang.name}.`);
        } catch (e) {
            console.error(`    ❌ Localization to ${lang.code} failed:`, e.message);
        }
    }
}

async function getLessonId(topicId) {
    const { data } = await supabase
        .from('grammar_lessons')
        .select('id')
        .eq('topic_id', topicId)
        .limit(1)
        .maybeSingle();
    return data?.id;
}

async function findThinTopics() {
    console.log('🔍 Finding topics with missing content...');
    const { data: thinTranslations, error } = await supabase
        .from('grammar_lesson_translations')
        .select('lesson_id, examples, grammar_lessons(topic_id, grammar_topics(slug))')
        .eq('language_code', 'en');

    if (error) {
        console.error('Error finding thin topics:', error);
        return [];
    }

    return thinTranslations
        .filter(t => !t.examples || t.examples.length < 3 || (t.grammar_lessons && t.grammar_lessons.grammar_topics && t.grammar_lessons.grammar_topics.slug === 'future-tenses'))
        .map(t => ({
            id: t.grammar_lessons.topic_id,
            slug: t.grammar_lessons.grammar_topics.slug
        }));
}

async function run() {
    const topicsToEnrich = await findThinTopics();
    console.log(`Found ${topicsToEnrich.length} topics to enrich.`);

    // Process top 10 topics to fulfill the user's request for "some topics"
    const batch = topicsToEnrich.slice(0, 10);

    for (const topic of batch) {
        await enrichTopic(topic.id, topic.slug);
    }

    console.log('\n✨ Custom enrichment task complete!');
}

run().catch(console.error);
