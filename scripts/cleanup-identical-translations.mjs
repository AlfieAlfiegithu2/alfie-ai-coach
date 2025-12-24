
const SUPABASE_URL = 'https://cuumxmfzhwljylbdlflj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTkxMjEsImV4cCI6MjA2OTA5NTEyMX0.8jqO_ciOttSxSLZnKY0i5oJmEn79ROF53TjUMYhNemI';

async function cleanup() {
    console.log('Fetching translations...');
    const res = await fetch(`${SUPABASE_URL}/rest/v1/grammar_topic_translations?select=id,language_code,title,topic_id`, {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    });
    const data = await res.json();

    const enMap = {};
    data.filter(d => d.language_code === 'en').forEach(d => enMap[d.topic_id] = d.title);

    const toDelete = data.filter(d => d.language_code !== 'en' && d.title === enMap[d.topic_id]);
    console.log(`Found ${toDelete.length} identical translations to delete.`);

    for (let i = 0; i < toDelete.length; i += 50) {
        const batch = toDelete.slice(i, i + 50);
        console.log(`Deleting batch ${i / 50 + 1}...`);
        for (const item of batch) {
            await fetch(`${SUPABASE_URL}/rest/v1/grammar_topic_translations?id=eq.${item.id}`, {
                method: 'DELETE',
                headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
            });
        }
    }
    console.log('Cleanup finished.');
}
cleanup();
