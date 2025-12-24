
const SUPABASE_URL = 'https://cuumxmfzhwljylbdlflj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTkxMjEsImV4cCI6MjA2OTA5NTEyMX0.8jqO_ciOttSxSLZnKY0i5oJmEn79ROF53TjUMYhNemI';

async function checkEmptyExamples() {
    const url = `${SUPABASE_URL}/rest/v1/grammar_lesson_translations?select=id,language_code,examples,grammar_lessons(grammar_topics(slug,title))`;
    const response = await fetch(url, {
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
        }
    });

    if (!response.ok) {
        console.error('Failed to fetch:', await response.text());
        return;
    }

    const data = await response.json();
    const empty = data.filter(d => !d.examples || (Array.isArray(d.examples) && d.examples.length === 0));

    console.log(`Found ${empty.length} translations with empty examples out of ${data.length}`);
    if (empty.length > 0) {
        console.log('Sample empty entries:');
        empty.slice(0, 20).forEach(d => {
            console.log(`- [${d.language_code}] ${d.grammar_lessons?.grammar_topics?.title} (${d.grammar_lessons?.grammar_topics?.slug})`);
        });
    }
}

checkEmptyExamples();
