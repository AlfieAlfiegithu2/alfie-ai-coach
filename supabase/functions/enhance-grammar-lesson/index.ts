


import "https://deno.land/x/xhr@0.1.0/mod.ts";
// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// @ts-ignore
const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
// @ts-ignore
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
// @ts-ignore
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
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
            .select('*, grammar_lessons(grammar_topics(slug))')
            .eq('lesson_id', lesson_id)
            .eq('language_code', 'en')
            .maybeSingle();

        const topicSlug = enContent?.grammar_lessons?.grammar_topics?.slug || 'Unknown Topic';
        const isEnglishGeneration = language_code === 'en';
        const isThinEnglish = enContent && (enContent.theory_definition.includes('Coming soon') || (enContent.examples?.length || 0) < 3);

        if ((!enContent || isThinEnglish) && !isEnglishGeneration) {
            console.error('English content not found or thin, cannot translate:', fetchError);
            return new Response(JSON.stringify({ success: false, error: 'English content source missing or incomplete' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 2. Prepare Prompt
        let systemPrompt = '';
        let userPrompt = '';

        if (isEnglishGeneration) {
            systemPrompt = `You are an expert English grammar teacher. 
Your task is to create a COMPREHENSIVE grammar lesson for the topic: "${topicSlug}".
This content will be the source of truth for all other translations.

OUTPUT FORMAT:
Return a STRICT JSON object matching this structure:
{
  "theory_title": "Clear Title of the Topic",
  "theory_definition": "Markdown explanation of what this is (use headers, bold, etc.)",
  "theory_formation": "Markdown explanation of how to form it",
  "theory_usage": "When to use it, explained in detail",
  "theory_common_mistakes": "Markdown list of common mistakes with examples",
  "rules": [
    {
      "title": "Rule Name", 
      "formula": "The grammatical formula (e.g. S + V + O)", 
      "example": "A clear example sentence"
    }
  ],
  "examples": [
    {
      "english": "Example Sentence 1", 
      "native": "Detailed explanation of why this example fits the rule"
    },
    ... at least 10 examples ...
  ],
  "localized_tips": "General tips for learning this topic"
}

GUIDELINES:
- **Theory**: Write in clear, professional English.
- **Rules**: Provide at least 3-5 distinct rules/patterns.
- **Examples**: Provide at least 10 high-quality, varied examples.
- **Mistakes**: Focus on high-level errors.`;

            userPrompt = `Generate a complete English grammar lesson for topic: ${topicSlug}. 
Existing Title: ${enContent?.theory_title || topicSlug}`;
        } else {
            systemPrompt = `You are an expert ESL teacher who specializes in teaching English to ${language_name} speakers. 
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
  "rules": [{"title": "Rule name (Native)", "formula": "S+V+O", "example": "English example with Native translation"}],
  "examples": [{"english": "English Sentence", "native": "${language_name} translation/explanation"}],
  "localized_tips": "Specific tip for ${language_name} speakers about this topic"
}
`;
            userPrompt = `Localize this lesson content:
    
Title: ${enContent.theory_title}
Definition: ${enContent.theory_definition}
Formation: ${enContent.theory_formation}
Usage: ${enContent.theory_usage}
Mistakes: ${enContent.theory_common_mistakes}
Tips: ${enContent.localized_tips}
Rules: ${JSON.stringify(enContent.rules)}
Examples: ${JSON.stringify(enContent.examples)}
`;
        }

        // 3. Call Gemini 3.0 Flash
        // @ts-ignore
        const geminiKey = Deno.env.get('GEMINI_API_KEY');
        if (!geminiKey) {
            throw new Error('GEMINI_API_KEY not configured');
        }

        const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;

        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: fullPrompt }]
                }],
                generationConfig: {
                    temperature: 0.3,
                    maxOutputTokens: 8192,
                }
            }),
        });

        if (!res.ok) {
            const errText = await res.text();
            console.error('Gemini API Error:', errText);
            throw new Error(`Gemini API Error: ${res.status} ${errText}`);
        }

        const aiData = await res.json();
        let content = aiData.candidates?.[0]?.content?.parts?.[0]?.text || '';

        // Clean JSON
        if (content.includes('```')) {
            content = content.replace(/```json/g, '').replace(/```/g, '');
        }
        const localized = JSON.parse(content.trim());


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

    } catch (error: any) {
        const err = error as Error;
        console.error('Error:', error);
        return new Response(JSON.stringify({ success: false, error: err.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
