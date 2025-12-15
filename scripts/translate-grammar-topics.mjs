
const SUPABASE_URL = 'https://cuumxmfzhwljylbdlflj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTkxMjEsImV4cCI6MjA2OTA5NTEyMX0.8jqO_ciOttSxSLZnKY0i5oJmEn79ROF53TjUMYhNemI';

async function main() {
    console.log("Starting translation for Korean (ko)...");

    // Headers for Supabase REST API
    const headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json"
    };

    try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/translate-grammar-content`, {
            method: "POST",
            headers,
            body: JSON.stringify({
                table: 'grammar_topics',
                target_lang: 'ko'
            })
        });

        const data = await res.json();
        if (data.success) {
            console.log("Success:", data.message);
        } else {
            console.error("Failed:", data.error);
        }
    } catch (e) {
        console.error("Network error:", e);
    }
}

main();
