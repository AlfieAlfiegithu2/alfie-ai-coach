
import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.21.0";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { table, target_lang, source_lang = 'en', batch_size = 10, specific_ids = null } = await req.json();

        if (!table || !target_lang) {
            throw new Error('Table and target_lang are required');
        }

        const apiKey = Deno.env.get('GEMINI_API_KEY');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!apiKey || !supabaseUrl || !supabaseServiceKey) {
            throw new Error('Missing environment variables');
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

        let resultMsg = "";

        const batchTranslate = async (items, instructions) => {
            const prompt = `
            You are a professional translator for an IELTS Grammar app.
            Translate the following array of items from English to Language Code: "${target_lang}".
            
            Instructions: ${instructions}
            
            Return valid JSON array with the SAME structure.
            Do NOT translate fields that should remain in English (like IDs or English examples if specified).
            
            Input:
            ${JSON.stringify(items)}
        `;

            const result = await model.generateContent(prompt);
            const text = result.response.text();
            const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(jsonStr);
        };

        if (table === 'grammar_lessons') {
            let sources;
            if (specific_ids && specific_ids.length > 0) {
                const { data } = await supabase.from('grammar_lesson_translations')
                    .select('*')
                    .eq('language_code', source_lang)
                    .in('lesson_id', specific_ids);
                sources = data || [];
            } else {
                const { data } = await supabase.from('grammar_lesson_translations').select('*').eq('language_code', source_lang);
                sources = data || [];
            }

            let toProcess = sources;
            if (!specific_ids) {
                // Only missing
                const { data: targets } = await supabase.from('grammar_lesson_translations').select('lesson_id').eq('language_code', target_lang);
                const existingIds = new Set(targets.map(t => t.lesson_id));
                toProcess = sources.filter(s => !existingIds.has(s.lesson_id));
            }

            if (toProcess.length === 0) return new Response(JSON.stringify({ success: true, message: "Up to date", count: 0 }));

            const batch = toProcess.slice(0, Math.min(batch_size, 3));
            const toTranslate = batch.map(m => ({
                id: m.lesson_id,
                title: m.theory_title,
                definition: m.theory_definition,
                formation: m.theory_formation,
                usage: m.theory_usage,
                mistakes: m.theory_common_mistakes,
                rules: m.rules,
                examples: m.examples,
                tips: m.localized_tips
            }));

            const translated = await batchTranslate(toTranslate, `
            Translate 'title', 'definition', 'formation', 'usage', 'mistakes', 'rules', 'tips'.
            For 'examples', translate the 'explanation' field but KEEP the 'sentence' in English (as it is the example).
            Keep formatting (markdown, bullets).
        `);

            // Get existing translation IDs if updating
            if (specific_ids) {
                const { data: existingTargets } = await supabase.from('grammar_lesson_translations')
                    .select('id, lesson_id')
                    .eq('language_code', target_lang)
                    .in('lesson_id', specific_ids);

                // Map lesson_id to id
                const targetMap = new Map();
                existingTargets?.forEach(t => targetMap.set(t.lesson_id, t.id));

                for (const t of translated) {
                    const existingId = targetMap.get(t.id);
                    const payload = {
                        lesson_id: t.id,
                        language_code: target_lang,
                        theory_title: t.title,
                        theory_definition: t.definition,
                        theory_formation: t.formation,
                        theory_usage: t.usage,
                        theory_common_mistakes: t.mistakes,
                        rules: t.rules,
                        examples: t.examples,
                        localized_tips: t.tips,
                        updated_at: new Date().toISOString()
                    };

                    if (existingId) {
                        await supabase.from('grammar_lesson_translations').update(payload).eq('id', existingId);
                    } else {
                        await supabase.from('grammar_lesson_translations').insert(payload);
                    }
                }
            } else {
                // Normal insert
                for (const t of translated) {
                    await supabase.from('grammar_lesson_translations').insert({
                        lesson_id: t.id,
                        language_code: target_lang,
                        theory_title: t.title,
                        theory_definition: t.definition,
                        theory_formation: t.formation,
                        theory_usage: t.usage,
                        theory_common_mistakes: t.mistakes,
                        rules: t.rules,
                        examples: t.examples,
                        localized_tips: t.tips
                    });
                }
            }

            resultMsg = `Translated ${translated.length} lessons`;
        }
        // ... (Keep existing logic for exercises/topics if needed, or assume caller uses lessons for now)

        return new Response(JSON.stringify({ success: true, message: resultMsg }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Error:', error);
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
