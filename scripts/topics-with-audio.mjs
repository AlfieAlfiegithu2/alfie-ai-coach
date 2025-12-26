import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://cuumxmfzhwljylbdlflj.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTkxMjEsImV4cCI6MjA2OTA5NTEyMX0.8jqO_ciOttSxSLZnKY0i5oJmEn79ROF53TjUMYhNemI');

const { data: sentences } = await supabase.from('dictation_sentences').select('topic_id, audio_url_us, audio_url_uk');
const { data: topics } = await supabase.from('dictation_topics').select('id, slug, title');

const topicMap = {};
topics.forEach(t => topicMap[t.id] = t.slug);

const byTopic = {};
sentences.forEach(s => {
    const slug = topicMap[s.topic_id] || 'unknown';
    if (!byTopic[slug]) byTopic[slug] = { complete: 0, partial: 0, none: 0 };
    if (s.audio_url_us && s.audio_url_uk) byTopic[slug].complete++;
    else if (s.audio_url_us || s.audio_url_uk) byTopic[slug].partial++;
    else byTopic[slug].none++;
});

console.log('Topics with complete audio:');
Object.entries(byTopic).filter(([k, v]) => v.complete > 0).forEach(([slug, stats]) => {
    console.log(slug + ': ' + stats.complete + ' complete, ' + stats.none + ' pending');
});
