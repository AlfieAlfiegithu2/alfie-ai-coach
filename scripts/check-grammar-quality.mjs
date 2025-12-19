import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cuumxmfzhwljylbdlflj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTkxMjEsImV4cCI6MjA2OTA5NTEyMX0.8jqO_ciOttSxSLZnKY0i5oJmEn79ROF53TjUMYhNemI';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkGrammarContent() {
    console.log('Checking grammar content quality...\n');

    // Get all grammar topics
    const { data: topics, error: topicsError } = await supabase
        .from('grammar_topics')
        .select('id, slug, level')
        .order('level', { ascending: true });

    if (topicsError) {
        console.error('Error fetching topics:', topicsError);
        return;
    }

    console.log(`Found ${topics.length} grammar topics\n`);

    const needsImprovement = [];

    for (const topic of topics) {
        // Get English lesson content
        const { data: lessons } = await supabase
            .from('grammar_lessons')
            .select('id, language_code, theory_definition, formation, usage, common_mistakes, localized_tips')
            .eq('topic_id', topic.id)
            .eq('language_code', 'en');

        const lesson = lessons?.[0];

        if (!lesson) {
            console.log(`[${topic.level}] ${topic.slug}: NO ENGLISH LESSON`);
            needsImprovement.push({ topic, reason: 'No English lesson' });
            continue;
        }

        const defLen = lesson.theory_definition?.length || 0;
        const formLen = lesson.formation?.length || 0;
        const usageLen = lesson.usage?.length || 0;
        const mistakesLen = lesson.common_mistakes?.length || 0;
        const tipsLen = lesson.localized_tips?.length || 0;
        const totalLen = defLen + formLen + usageLen;

        const status = totalLen < 500 ? '⚠️ SHORT' : totalLen < 1000 ? '📝 OK' : '✅ GOOD';

        console.log(`${status} [${topic.level}] ${topic.slug}: ${totalLen} chars`);

        if (totalLen < 800) {
            needsImprovement.push({
                topic,
                lesson,
                totalLen,
                reason: `Content too short (${totalLen} chars)`
            });
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`Topics needing improvement: ${needsImprovement.length}`);
    console.log('='.repeat(60) + '\n');

    for (const item of needsImprovement) {
        console.log(`- [${item.topic.level}] ${item.topic.slug}: ${item.reason}`);
    }

    return needsImprovement;
}

checkGrammarContent();
