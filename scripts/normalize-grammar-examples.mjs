
const SUPABASE_URL = 'https://cuumxmfzhwljylbdlflj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTkxMjEsImV4cCI6MjA2OTA5NTEyMX0.8jqO_ciOttSxSLZnKY0i5oJmEn79ROF53TjUMYhNemI';

async function normalizeExamples() {
    let offset = 0;
    const limit = 500;
    let totalUpdated = 0;
    let hasMore = true;

    console.log("Starting normalization of grammar examples...");

    while (hasMore) {
        console.log(`Fetching translations (offset: ${offset})...`);
        const url = `${SUPABASE_URL}/rest/v1/grammar_lesson_translations?select=id,language_code,examples,theory_title&limit=${limit}&offset=${offset}&order=id`;
        const response = await fetch(url, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });

        if (!response.ok) {
            console.error('Failed to fetch:', await response.text());
            break;
        }

        const data = await response.json();
        if (data.length === 0) {
            hasMore = false;
            break;
        }

        console.log(`Checking ${data.length} translations...`);

        for (const item of data) {
            if (!Array.isArray(item.examples) || item.examples.length === 0) continue;

            let changed = false;
            const newExamples = item.examples.map(ex => {
                const newEx = { ...ex };

                // Rename 'english' to 'sentence'
                if (newEx.english && !newEx.sentence) {
                    newEx.sentence = newEx.english;
                    delete newEx.english;
                    changed = true;
                }

                // Rename 'native' to 'explanation' or 'translation'
                if (newEx.native && !newEx.explanation && !newEx.translation) {
                    if (item.language_code === 'en') {
                        newEx.explanation = newEx.native;
                    } else {
                        newEx.translation = newEx.native;
                    }
                    delete newEx.native;
                    changed = true;
                }

                return newEx;
            });

            if (changed) {
                console.log(`Updating [${item.language_code}] ${item.theory_title}...`);
                const updateUrl = `${SUPABASE_URL}/rest/v1/grammar_lesson_translations?id=eq.${item.id}`;
                const updateRes = await fetch(updateUrl, {
                    method: 'PATCH',
                    headers: {
                        'apikey': SUPABASE_KEY,
                        'Authorization': `Bearer ${SUPABASE_KEY}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify({ examples: newExamples })
                });

                if (updateRes.ok) {
                    totalUpdated++;
                } else {
                    console.error(`Failed to update ${item.id}:`, await updateRes.text());
                }
            }
        }

        if (data.length < limit) {
            hasMore = false;
        } else {
            offset += limit;
        }
    }

    console.log(`Finished! Updated ${totalUpdated} total translations.`);
}

normalizeExamples();
