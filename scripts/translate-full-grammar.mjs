
const SUPABASE_URL = 'https://cuumxmfzhwljylbdlflj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTkxMjEsImV4cCI6MjA2OTA5NTEyMX0.8jqO_ciOttSxSLZnKY0i5oJmEn79ROF53TjUMYhNemI';

async function translateTable(table, batchSize) {
    console.log(`\n--- Translating ${table} ---`);
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
                    target_lang: 'ko',
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
                // Pause and retry? Or exit?
                console.log("Retrying in 5 seconds...");
                await new Promise(r => setTimeout(r, 5000));
            }
        } catch (e) {
            console.error("Network error:", e);
            active = false;
        }

        // Brief pause to be nice
        await new Promise(r => setTimeout(r, 1000));
    }
    console.log(`Finished ${table}`);
}

async function main() {
    console.log("Starting Full Grammar Translation for Korean (ko)...");

    // 1. Lessons (Theory)
    await translateTable('grammar_lessons', 3);

    // 2. Exercises (Questions)
    await translateTable('grammar_exercises', 20);

    console.log("\nAll Done!");
}

main();
