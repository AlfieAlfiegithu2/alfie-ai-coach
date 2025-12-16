
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cuumxmfzhwljylbdlflj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTkxMjEsImV4cCI6MjA2OTA5NTEyMX0.8jqO_ciOttSxSLZnKY0i5oJmEn79ROF53TjUMYhNemI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixPresentSimple() {
    console.log('🔍 Searching for Present Simple topic...');

    // 1. Find the Lesson ID for Present Simple
    const { data: topics, error: topicError } = await supabase
        .from('grammar_topics')
        .select('id, slug')
        .ilike('slug', '%present%simple%')
        .limit(1);

    if (topicError || !topics || topics.length === 0) {
        console.error('❌ Topic not found', topicError);
        return;
    }

    const topic = topics[0];
    console.log(`✅ Found topic: ${topic.title} (${topic.id})`);

    // Find the lesson for this topic
    const { data: lessons, error: lessonError } = await supabase
        .from('grammar_lessons')
        .select('id')
        .eq('topic_id', topic.id)
        .limit(1);

    if (lessonError || !lessons || lessons.length === 0) {
        console.error('❌ Lesson not found for topic');
        return;
    }

    const lesson = lessons[0];
    console.log(`✅ Found lesson ID: ${lesson.id}`);

    // 2. Trigger Generation for Chinese
    console.log('🤖 Generating Chinese content via Edge Function...');
    const { data: funcData, error: funcError } = await supabase.functions.invoke('enhance-grammar-lesson', {
        body: {
            lesson_id: lesson.id,
            language_code: 'zh',
            language_name: 'Chinese (Simplified)'
        }
    });

    if (funcError) {
        console.error('❌ Edge Function Failed:', funcError);
    } else {
        console.log('✅ Edge Function Success!', funcData);
    }
}

fixPresentSimple();
