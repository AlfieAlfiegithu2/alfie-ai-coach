// TURBO Dictation Translation Runner v2
// Optimized with timeout handling and 3 parallel workers

const SUPABASE_URL = "https://cuumxmfzhwljylbdlflj.supabase.co";
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/dictation-batch-translate`;

// Remaining languages (skip completed: zh, zh-TW, es, hi, ar, bn, pt, ru, ja, ko, vi, fr, de, it, tr)
const LANGUAGES = [
    'th', 'id', 'ms', 'tl', 'my', 'km', 'ur', 'ta', 'te', 'mr', 'gu', 'kn', 'ml', 'pa', 'or',
    'as', 'ne', 'si', 'fa', 'he', 'ps', 'nl', 'pl', 'uk', 'ro', 'el', 'cs', 'hu', 'sv', 'bg',
    'sr', 'hr', 'sk', 'no', 'da', 'fi', 'sq', 'sl', 'et', 'lv', 'lt', 'uz', 'kk', 'az', 'mn',
    'ka', 'hy', 'sw', 'ha', 'yo', 'ig', 'am', 'zu', 'af', 'yue'
];

const BATCH_SIZE = 20;
const PARALLEL_LANGS = 3; // Reduced to avoid timeout issues
const TIMEOUT_MS = 60000; // 60 second timeout per request

async function fetchWithTimeout(url, options, timeout) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
}

async function callTranslateFunction(lang, continueFrom = null) {
    const payload = { lang, batchSize: BATCH_SIZE };
    if (continueFrom) payload.continueFrom = continueFrom;

    const res = await fetchWithTimeout(FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    }, TIMEOUT_MS);
    return res.json();
}

async function translateLanguage(lang) {
    console.log(`🌍 [${lang}] Starting...`);
    let continueFrom = null;
    let totalProcessed = 0;
    let retries = 0;

    while (true) {
        try {
            const result = await callTranslateFunction(lang, continueFrom);

            if (!result.success) {
                console.error(`❌ [${lang}] Error: ${result.error}`);
                if (retries++ < 3) {
                    await new Promise(r => setTimeout(r, 5000));
                    continue;
                }
                break;
            }

            retries = 0;
            totalProcessed += result.processed || 0;
            process.stdout.write(`  [${lang}] ${totalProcessed} sentences\r`);

            if (!result.hasMore) {
                console.log(`✨ [${lang}] Complete! (${totalProcessed} sentences)`);
                break;
            }

            continueFrom = result.lastId;
            await new Promise(r => setTimeout(r, 200));
        } catch (err) {
            console.error(`❌ [${lang}] Error: ${err.message}`);
            if (retries++ < 3) {
                await new Promise(r => setTimeout(r, 5000));
                continue;
            }
            break;
        }
    }

    return totalProcessed;
}

async function main() {
    console.log('🚀 TURBO Mode v2: Parallel Dictation Translation (DeepSeek V3)');
    console.log(`📦 Remaining languages: ${LANGUAGES.length}`);
    console.log(`⚡ Parallel workers: ${PARALLEL_LANGS}`);
    console.log(`📝 Batch size: ${BATCH_SIZE} sentences per call\n`);

    const startTime = Date.now();
    let grandTotal = 0;

    for (let i = 0; i < LANGUAGES.length; i += PARALLEL_LANGS) {
        const chunk = LANGUAGES.slice(i, i + PARALLEL_LANGS);
        console.log(`\n🔥 Batch ${Math.floor(i / PARALLEL_LANGS) + 1}/${Math.ceil(LANGUAGES.length / PARALLEL_LANGS)}: ${chunk.join(', ')}`);

        const results = await Promise.all(chunk.map(lang => translateLanguage(lang)));
        grandTotal += results.reduce((a, b) => a + b, 0);

        const elapsed = Math.round((Date.now() - startTime) / 60000);
        console.log(`✅ Progress: ${i + chunk.length}/${LANGUAGES.length} langs | ${grandTotal} sentences | ${elapsed} min\n`);
    }

    console.log('\n🎉 All translations complete!');
    console.log(`📊 Total: ${grandTotal} sentences in ${Math.round((Date.now() - startTime) / 60000)} minutes`);
}

main().catch(console.error);
