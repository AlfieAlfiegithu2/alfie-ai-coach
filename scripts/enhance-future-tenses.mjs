
const SUPABASE_URL = 'https://cuumxmfzhwljylbdlflj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTkxMjEsImV4cCI6MjA2OTA5NTEyMX0.8jqO_ciOttSxSLZnKY0i5oJmEn79ROF53TjUMYhNemI';

const FUTURE_LESSON_ID = "22222222-2222-2222-2222-222222222203";

async function main() {
    console.log("🚀 Enhancing 'Future Tenses' content...");

    // 1. enhance-grammar-lesson
    try {
        const res1 = await fetch(`${SUPABASE_URL}/functions/v1/enhance-grammar-lesson`, {
            method: "POST",
            headers: {
                "apikey": SUPABASE_KEY,
                "Authorization": `Bearer ${SUPABASE_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                lesson_id: FUTURE_LESSON_ID
            })
        });
        const data1 = await res1.json();
        if (data1.success) {
            console.log("✅ English content enhanced successfully.");
            console.log("New Title:", data1.data.theory_title);
        } else {
            console.error("❌ Enhancement failed:", data1.error);
            return;
        }
    } catch (e) {
        console.error("Network error (Enhance):", e);
        return;
    }

    // 2. translate-grammar-content (Update KO)
    console.log("🔄 Updating Korean translation...");
    try {
        const res2 = await fetch(`${SUPABASE_URL}/functions/v1/translate-grammar-content`, {
            method: "POST",
            headers: {
                "apikey": SUPABASE_KEY,
                "Authorization": `Bearer ${SUPABASE_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                table: 'grammar_lessons',
                target_lang: 'ko',
                specific_ids: [FUTURE_LESSON_ID]
            })
        });
        const data2 = await res2.json();
        if (data2.success) {
            console.log("✅ Korean translation updated successfully.");
        } else {
            console.error("❌ Translation update failed:", data2.error);
        }

    } catch (e) {
        console.error("Network error (Translate):", e);
    }
}

main();
