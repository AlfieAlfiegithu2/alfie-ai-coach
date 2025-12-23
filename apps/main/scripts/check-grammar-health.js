
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cuumxmfzhwljylbdlflj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTkxMjEsImV4cCI6MjA2OTA5NTEyMX0.8jqO_ciOttSxSLZnKY0i5oJmEn79ROF53TjUMYhNemI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkContent() {
    console.log('🔍 Checking grammar content for English (en)...');

    const { data: lessons, error } = await supabase
        .from('grammar_lesson_translations')
        .select('lesson_id, language_code, theory_title, examples, rules')
        .eq('language_code', 'en');

    if (error) {
        console.error('❌ Error fetching lessons:', error);
        return;
    }

    console.log(`Found ${lessons.length} English translations.\n`);

    const thinLessons = [];

    for (const lesson of lessons) {
        const exampleCount = Array.isArray(lesson.examples) ? lesson.examples.length : 0;
        const ruleCount = Array.isArray(lesson.rules) ? lesson.rules.length : 0;

        if (exampleCount < 3 || ruleCount === 0) {
            thinLessons.push({
                id: lesson.lesson_id,
                title: lesson.theory_title,
                examples: exampleCount,
                rules: ruleCount
            });
        }
    }

    if (thinLessons.length > 0) {
        console.log('⚠️  Thin Lessons (less than 3 examples or no rules):');
        console.table(thinLessons);
    } else {
        console.log('✅ All English lessons seem to have sufficient content (>= 3 examples & >= 1 rule).');
    }

    // Also check exercises
    console.log('\n🔍 Checking exercise counts per topic...');
    const { data: topics, error: topicError } = await supabase
        .from('grammar_topics')
        .select('id, slug');

    if (topicError) {
        console.error('❌ Error fetching topics:', topicError);
        return;
    }

    const topicStats = [];
    for (const topic of topics) {
        const { count, error: exerciseError } = await supabase
            .from('grammar_exercises')
            .select('*', { count: 'exact', head: true })
            .eq('topic_id', topic.id);

        topicStats.push({
            slug: topic.slug,
            exerciseCount: count || 0
        });
    }

    const lowExerciseTopics = topicStats.filter(t => t.exerciseCount < 10);
    if (lowExerciseTopics.length > 0) {
        console.log('⚠️  Topics with low exercise counts (< 10):');
        console.table(lowExerciseTopics);
    } else {
        console.log('✅ All topics have >= 10 exercises.');
    }
}

checkContent().catch(console.error);
