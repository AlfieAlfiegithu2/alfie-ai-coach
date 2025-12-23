
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cuumxmfzhwljylbdlflj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTkxMjEsImV4cCI6MjA2OTA5NTEyMX0.8jqO_ciOttSxSLZnKY0i5oJmEn79ROF53TjUMYhNemI';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkContent() {
    const { count: skillTestCount } = await supabase.from('skill_tests').select('*', { count: 'exact', head: true }).eq('skill_slug', 'listening-for-details');
    const { count: levelCount } = await supabase.from('dictation_levels').select('*', { count: 'exact', head: true });
    const { count: topicCount } = await supabase.from('dictation_topics').select('*', { count: 'exact', head: true });
    const { count: sentenceCount } = await supabase.from('dictation_sentences').select('*', { count: 'exact', head: true });

    console.log('--- Content Count Status ---');
    console.log(`Levels: ${levelCount}`);
    console.log(`Topics: ${topicCount}`);
    console.log(`Sentences: ${sentenceCount}`);

    // Check coverage
    const { data: topics } = await supabase.from('dictation_topics').select('id, title');
    const { data: sentences } = await supabase.from('dictation_sentences').select('topic_id');

    const topicsWithSentences = new Set(sentences.map(s => s.topic_id));
    const lackingTopics = topics.filter(t => !topicsWithSentences.has(t.id));

    console.log(`Topics with content: ${topicsWithSentences.size} / ${topicCount}`);
    if (lackingTopics.length > 0) {
        console.log('Lacking topics:', lackingTopics.map(t => t.title).join(', '));
    } else {
        console.log('✅ All topics have sentences!');
    }
}

checkContent();
