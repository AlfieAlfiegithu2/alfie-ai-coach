
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const { lesson_id, language_code, language_name } = await req.json();

        if (!lesson_id || !language_code) {
            throw new Error('Missing lesson_id or language_code');
        }

        console.log(`Processing lesson ${lesson_id} for ${language_name} (${language_code})`);

        // 1. Fetch English Content
        const { data: enContent, error: fetchError } = await supabase
            .from('grammar_lesson_translations')
            .select('*')
            .eq('lesson_id', lesson_id)
            .eq('language_code', 'en')
            .single();

        if (fetchError || !enContent) {
            console.error('English content not found:', fetchError);
            return new Response(JSON.stringify({ success: false, error: 'English content source missing' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 2. Prepare Prompt
        const systemPrompt = `You are an expert ESL teacher who specializes in teaching English to ${language_name} speakers. 
Your task is to "localize" an English grammar lesson into ${language_name}.
Do NOT just translate word-for-word. Instead, EXPLAIN the concepts in ${language_name} so they are easy for a native speaker to understand.

OUTPUT FORMAT:
Return a STRICT JSON object matching this structure:
{
  "theory_title": "Title in ${language_name}",
  "theory_definition": "Explanation of what this is in ${language_name}",
  "theory_formation": "Explanation of how to form it in ${language_name}",
  "theory_usage": "When to use it, explained in ${language_name}",
  "theory_common_mistakes": "Common mistakes ${language_name} speakers make with this",
  "rules": [{"title": "Rule name (Native)", "description": "Rule explanation (Native)", "examples": ["English example"]}],
  "examples": [{"english": "English Sentence", "native": "${language_name} translation/explanation"}],
  "localized_tips": "Specific tip for ${language_name} speakers about this topic"
}

GUIDELINES:
- **Theory**: Write completely in ${language_name}. Use analogies if helpful.
- **Rules**: Explain the rule in ${language_name}, but keep the actual grammar terms in English if standard (e.g. 'Past Simple').
- **Examples**: The 'english' field MUST be the original English sentence. The 'native' field is the translation.
- **Mistakes**: Focus on specific errors ${language_name} speakers make (e.g. if they confuse he/she, or have no articles).`;

        const userPrompt = `Localize this lesson content:
    
Title: ${enContent.theory_title}
Definition: ${enContent.theory_definition}
Formation: ${enContent.theory_formation}
Usage: ${enContent.theory_usage}
Mistakes: ${enContent.theory_common_mistakes}
Tips: ${enContent.localized_tips}
Rules: ${JSON.stringify(enContent.rules)}
Examples: ${JSON.stringify(enContent.examples)}
`;

        // 3. Call AI
        // 3. Call DeepSeek API (V3)
        const deepseekKey = Deno.env.get('DEEPSEEK_API_KEY');
        if (!deepseekKey) {
            throw new Error('DEEPSEEK_API_KEY not configured');
        }

        const res = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${deepseekKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.3,
                stream: false
            }),
        });

        if (!res.ok) {
            const errText = await res.text();
            console.error('DeepSeek API Error:', errText);
            throw new Error(`[VERIFIED V3] DeepSeek API Error: ${res.status} ${errText}`);
        }

        const aiData = await res.json();
        let content = aiData.choices[0].message.content;

        // Clean JSON
        if (content.includes('```')) {
            content = content.replace(/```json/g, '').replace(/```/g, '');
        }
        const localized = JSON.parse(content);

        // 4. Save to Database
        const { error: upsertError } = await supabase
            .from('grammar_lesson_translations')
            .upsert({
                lesson_id: lesson_id,
                language_code: language_code,
                theory_title: localized.theory_title,
                theory_definition: localized.theory_definition,
                theory_formation: localized.theory_formation,
                theory_usage: localized.theory_usage,
                theory_common_mistakes: localized.theory_common_mistakes,
                rules: localized.rules,
                examples: localized.examples,
                localized_tips: localized.localized_tips,
                updated_at: new Date().toISOString()
            }, { onConflict: 'lesson_id,language_code' });

        if (upsertError) throw upsertError;

        return new Response(JSON.stringify({ success: true, lesson_id }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Error:', error);
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
