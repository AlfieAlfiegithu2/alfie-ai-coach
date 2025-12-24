
const SUPABASE_URL = 'https://cuumxmfzhwljylbdlflj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTkxMjEsImV4cCI6MjA2OTA5NTEyMX0.8jqO_ciOttSxSLZnKY0i5oJmEn79ROF53TjUMYhNemI';

async function checkEmptyExamples() {
    const url = `${SUPABASE_URL}/rest/v1/grammar_lesson_translations?select=id,language_code,examples,theory_title&limit=50`;
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
    const problematic = data.filter(d => {
        if (!d.examples) return true;
        if (!Array.isArray(d.examples)) return true;
        if (d.examples.length === 0) return true;
        // Check if all sentences are empty
        return d.examples.every(ex => !ex.sentence || ex.sentence.trim() === '');
    });

    console.log(`Found ${problematic.length} potentially problematic translations out of ${data.length}`);
    if (problematic.length > 0) {
        console.log('Sample problematic entries:');
        problematic.slice(0, 5).forEach(d => {
            console.log(`- [${d.language_code}] ${d.theory_title} (ID: ${d.id})`);
            console.log(`  Examples: ${JSON.stringify(d.examples)}`);
        });
    }

    const withEmptySentences = data.filter(d =>
        Array.isArray(d.examples) && d.examples.some(ex => !ex.sentence || ex.sentence.trim() === '')
    );
    console.log(`Found ${withEmptySentences.length} translations with at least one empty sentence in examples.`);
    if (withEmptySentences.length > 0) {
        console.log('Sample with empty sentences:');
        withEmptySentences.slice(0, 5).forEach(d => {
            console.log(`- [${d.language_code}] ${d.theory_title} (ID: ${d.id})`);
            console.log(`  Examples (first 2): ${JSON.stringify(d.examples.slice(0, 2))}`);
        });
    }
}

checkEmptyExamples();
