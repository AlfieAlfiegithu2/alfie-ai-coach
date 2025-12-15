
import { createClient } from "@supabase/supabase-js";

// Config
const SUPABASE_URL = 'https://cuumxmfzhwljylbdlflj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTkxMjEsImV4cCI6MjA2OTA5NTEyMX0.8jqO_ciOttSxSLZnKY0i5oJmEn79ROF53TjUMYhNemI';

async function fetchJson(url, options = {}) {
    // Use native fetch
    const res = await fetch(url, options);
    if (!res.ok) {
        throw new Error(`Request failed with status ${res.status}: ${res.statusText}`);
    }
    // Some endpoints might return empty body
    const text = await res.text();
    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
}

async function main() {
    console.log("Fetching topics and exercises...");

    // Headers for Supabase REST API
    const headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json"
    };

    // 1. Get All Topics
    const topics = await fetchJson(`${SUPABASE_URL}/rest/v1/grammar_topics?select=id,slug,level`, { headers });

    // 2. Get Topics with Exercises
    const exercises = await fetchJson(`${SUPABASE_URL}/rest/v1/grammar_exercises?select=topic_id`, { headers });
    const filledTopicIds = new Set(exercises.map(e => e.topic_id));

    // 3. Find Empty Topics
    const emptyTopics = topics.filter(t => !filledTopicIds.has(t.id));

    console.log(`Found ${emptyTopics.length} empty topics out of ${topics.length} total.`);

    if (emptyTopics.length === 0) {
        console.log("All topics have exercises!");
        return;
    }

    // 4. Generate Content for Empty Topics
    console.log("Starting generation...");

    for (const topic of emptyTopics) {
        const topicName = topic.slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        console.log(`Processing: ${topicName} (Level: ${topic.level})...`);

        try {
            const result = await fetchJson(`${SUPABASE_URL}/functions/v1/generate-grammar-content`, {
                method: "POST",
                headers: {
                    ...headers,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    topic: topicName,
                    topic_id: topic.id,
                    level: topic.level,
                    count: 5
                })
            });

            if (result.success) {
                console.log(`  ✅ Success: Generated ${result.count} exercises.`);
            } else {
                console.error(`  ❌ Failed: ${result.error || 'Unknown error'}`);
            }
        } catch (err) {
            console.error(`  ❌ Network/System Error: ${err.message}`);
        }

        // Wait a bit to be nice to Gemini rate limits
        await new Promise(r => setTimeout(r, 2000));
    }

    console.log("Done!");
}

main().catch(console.error);
