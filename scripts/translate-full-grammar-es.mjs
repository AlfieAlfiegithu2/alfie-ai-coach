
const SUPABASE_URL = 'https://cuumxmfzhwljylbdlflj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTkxMjEsImV4cCI6MjA2OTA5NTEyMX0.8jqO_ciOttSxSLZnKY0i5oJmEn79ROF53TjUMYhNemI';

const TARGET_LANG = 'es';

async function translateTable(table, batchSize) {
    console.log(`\n--- Translating ${table} for ${TARGET_LANG} ---`);
    let active = true;
    while (active) {
        try {
            console.log(`Requesting translation batch...`);
            const res = await fetch(`${SUPABASE_URL}/functions/v1/translate-grammar-content`, {
                method: "POST",
                headers: {
                    "apikey": SUPABASE_KEY,
                    "Authorization": `Bearer ${SUPABASE_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    table: table,
                    target_lang: TARGET_LANG,
                    batch_size: batchSize
                })
            });

            const data = await res.json();
            if (data.success) {
                console.log("Success:", data.message);
                if (data.message.includes("Up to date") || data.count === 0) {
                    active = false;
                }
            } else {
                console.error("Failed:", data.error);
                await new Promise(r => setTimeout(r, 5000));
            }
        } catch (e) {
            console.error("Network error:", e);
            active = false;
        }
        await new Promise(r => setTimeout(r, 1000));
    }
    console.log(`Finished ${table}`);
}

async function main() {
    console.log(`Starting Full Grammar Translation for ${TARGET_LANG}...`);
    // 1. Lessons
    await translateTable('grammar_lessons', 3);
    // 2. Exercises
    await translateTable('grammar_exercises', 20);
    console.log("\nAll Done!");
}

main();
