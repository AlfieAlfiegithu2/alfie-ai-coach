
const SUPABASE_URL = 'https://cuumxmfzhwljylbdlflj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTkxMjEsImV4cCI6MjA2OTA5NTEyMX0.8jqO_ciOttSxSLZnKY0i5oJmEn79ROF53TjUMYhNemI';

const LANGUAGES = [
    'ko', 'zh', 'ja', 'es', 'pt', 'fr', 'de', 'ru', 'hi', 'vi', 'ar',
    'bn', 'ur', 'id', 'tr', 'fa', 'ta', 'ne', 'th', 'yue', 'ms', 'kk'
];

const TABLES = {
    topics: {
        source: 'grammar_topics',
        target: 'grammar_topic_translations',
        idField: 'id',
        targetIdField: 'topic_id',
        primaryKey: 'id', // To select ID from translations
        batchSize: 10
    },
    lessons: {
        source: 'grammar_lessons',
        target: 'grammar_lesson_translations',
        idField: 'id',
        targetIdField: 'lesson_id',
        primaryKey: 'id',
        batchSize: 5
    },
    exercises: {
        source: 'grammar_exercises',
        target: 'grammar_exercise_translations',
        idField: 'id',
        targetIdField: 'exercise_id',
        primaryKey: 'id',
        batchSize: 15
    }
};

async function supabaseFetch(query) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${query}`, {
        headers: {
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${SUPABASE_KEY}`
        }
    });
    if (!res.ok) {
        throw new Error(`Supabase Error: ${res.status} ${res.statusText}`);
    }
    return await res.json();
}

async function syncTableForLanguage(tableType, lang) {
    const config = TABLES[tableType];
    console.log(`\n[${lang}] Checking ${tableType}...`);

    try {
        // 1. Get all Source IDs (English Translation IDs - assuming source of truth is the English translation set which mirrors the base table)
        // Actually, better to check the base tables directly if 'en' translations might be missing too (unlikely but possible). 
        // But the prompt implies English is 100%. Let's query the specific translation table for 'en' to be consistent.
        const sourceData = await supabaseFetch(`${config.target}?language_code=eq.en&select=${config.targetIdField}`);
        const sourceIds = new Set(sourceData.map(item => item[config.targetIdField]));

        // 2. Get all Target Lang IDs
        const targetData = await supabaseFetch(`${config.target}?language_code=eq.${lang}&select=${config.targetIdField}`);
        const targetIds = new Set(targetData.map(item => item[config.targetIdField]));

        // 3. Find missing IDs
        const missingIds = [...sourceIds].filter(id => !targetIds.has(id));

        if (missingIds.length === 0) {
            console.log(`   ✅ [${lang}] ${tableType} is up to date (0 missing).`);
            return;
        }

        console.log(`   ⚠️ [${lang}] Missing ${missingIds.length} ${tableType}. Starting sync...`);

        // 4. Process in batches
        for (let i = 0; i < missingIds.length; i += config.batchSize) {
            const batch = missingIds.slice(i, i + config.batchSize);
            await triggerTranslation(config.source, lang, batch);

            // Progress bar
            const completed = Math.min(i + batch.length, missingIds.length);
            const progress = Math.round((completed / missingIds.length) * 100);
            process.stdout.write(`\r   Progress: ${progress}% (${completed}/${missingIds.length})`);

            // Small delay to be gentle on the edge function
            await new Promise(r => setTimeout(r, 1000));
        }
        console.log(""); // New line

    } catch (e) {
        console.error(`   ❌ Error checking ${tableType} for ${lang}:`, e.message);
    }
}

async function triggerTranslation(tableName, targetLang, specificIds) {
    try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/translate-grammar-content`, {
            method: "POST",
            headers: {
                "apikey": SUPABASE_KEY,
                "Authorization": `Bearer ${SUPABASE_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                table: tableName,
                target_lang: targetLang,
                source_lang: 'en',
                specific_ids: specificIds,
                batch_size: specificIds.length
            })
        });

        // Handle text response correctly even if it's not JSON
        const text = await res.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            console.error(`\n   ❌ [${targetLang}] Invalid JSON response:`, text.substring(0, 100));
            return;
        }

        if (!data.success) {
            console.error(`\n   ❌ [${targetLang}] API Error:`, data.error || data.message);
        }
    } catch (e) {
        console.error(`\n   ❌ [${targetLang}] Network Error:`, e.message);
    }
}

async function main() {
    console.log("🚀 Starting Global Grammar Sync (Gap Fill)...");

    for (const lang of LANGUAGES) {
        console.log(`\n========================================`);
        console.log(`   SYNCING LANGUAGE: ${lang.toUpperCase()}`);
        console.log(`========================================`);

        // 1. Topics
        await syncTableForLanguage('topics', lang);

        // 2. Lessons
        await syncTableForLanguage('lessons', lang);

        // 3. Exercises
        await syncTableForLanguage('exercises', lang);
    }

    console.log("\n✅ Global Sync Complete.");
}

main();
