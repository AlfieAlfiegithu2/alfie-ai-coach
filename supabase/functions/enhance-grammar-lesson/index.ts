/// <reference lib="deno.ns" />

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { lesson_id, language_code = 'en', language_name = 'English' } = await req.json();

        const apiKey = Deno.env.get('GEMINI_API_KEY');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!apiKey || !supabaseUrl || !supabaseServiceKey) {
            throw new Error('Missing environment variables');
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // DeepSeek via OpenRouter Configuration
        const openRouterKey = Deno.env.get('OPENROUTER_API_KEY');
        if (!openRouterKey) throw new Error('Missing OPENROUTER_API_KEY');

        // 1. Fetch English content to use as a generic seed/context (source of truth for the topic)
        const { data: sourceLesson } = await supabase
            .from('grammar_lesson_translations')
            .select('*')
            .eq('lesson_id', lesson_id)
            .eq('language_code', 'en')
            .single();

        if (!sourceLesson) throw new Error('Source English lesson not found. Please create English content first.');

        const prompt = `
        You are an expert IELTS Grammar Coach and multilinguist.
        
        TASK: Generate comprehensive, LOCALIZED grammar lesson content for the topic "${sourceLesson.theory_title}" in ${language_name} (${language_code}).
        
        CRITICAL INSTRUCTIONS:
        1. **LANGUAGE**: All output content (definitions, explanations, tips) MUST be in ${language_name}. Only keep the actual English grammar terms/examples in English if typically taught that way (e.g., "Present Simple"), but explain them in ${language_name}.
        2. **LOCALIZATION**: Do NOT just translate. Adapt the explanations for a native speaker of ${language_name}. Use analogies, comparisons to ${language_name} grammar, and idioms that help them understand the English concept easier.
        3. **DEPTH**: The user specifically requested "sufficient" and "comprehensive" content. 
           - The definition must be deep and clear.
           - Usage scenarios must be detailed with nuance.
           - Formation rules must be exhaustive.
        
        Source Context (English):
        Title: ${sourceLesson.theory_title}
        Definition: ${sourceLesson.theory_definition}
        
        Return a valid JSON object with the following fields (keys must be exactly these strings):
        - theory_title (String: The title in ${language_name})
        - theory_definition (String: A comprehensive, easy-to-understand definition in ${language_name})
        - theory_formation (String - Markdown: How to build the tense/structure, explained in ${language_name})
        - theory_usage (String - Markdown: When to use it, detailed scenarios in ${language_name})
        - theory_common_mistakes (String - Markdown: Common errors, especially for ${language_name} speakers if known, explained in ${language_name})
        - rules (Array of Objects: { "title": "Section Name", "formula": "Subject + ...", "example": "English Example Sentence" })
        - examples (Array of Objects: { "sentence": "English Sentence", "translation": "Natural ${language_name} translation", "explanation": "Why this is used, in ${language_name}", "correct": true })
        - localized_tips (String - Markdown: Special tips specifically for ${language_name} speakers learning this English concept)
        
        Ensure the output is pure JSON without markdown code fences.
    `;

        console.log(`🤖 Using DeepSeek (via OpenRouter) for ${language_name}...`);

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openRouterKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://alfie-ai-coach.com',
                'X-Title': 'Alfie Grammar Coach'
            },
            body: JSON.stringify({
                model: 'deepseek/deepseek-chat',
                messages: [{ role: 'user', content: prompt }],
                response_format: { type: 'json_object' },
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`OpenRouter/DeepSeek API Error: ${response.status} - ${errText}`);
        }

        const data = await response.json();
        const contentStr = data.choices?.[0]?.message?.content;

        if (!contentStr) throw new Error('No content returned from DeepSeek');

        // Parse JSON (handle potential markdown fences if model ignores instruction)
        const cleanJson = contentStr.replace(/```json\n?|\n?```/g, '').trim();
        const enhanced = JSON.parse(cleanJson);

        // Update content for the specific language
        const { error } = await supabase
            .from('grammar_lesson_translations')
            .upsert({
                lesson_id: lesson_id,
                language_code: language_code,
                theory_title: enhanced.theory_title,
                theory_definition: enhanced.theory_definition,
                theory_formation: enhanced.theory_formation,
                theory_usage: enhanced.theory_usage,
                theory_common_mistakes: enhanced.theory_common_mistakes,
                rules: enhanced.rules,
                examples: enhanced.examples,
                localized_tips: enhanced.localized_tips,
                updated_at: new Date().toISOString()
            }, { onConflict: 'lesson_id,language_code' });

        if (error) throw error;

        return new Response(JSON.stringify({ success: true, message: `Generated ${language_name} content`, data: enhanced }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: (error as Error).message,
            details: error
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
