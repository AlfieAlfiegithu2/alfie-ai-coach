
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
        const { lesson_id, language_code = 'en', language_name = 'English' } = await req.json();

        const apiKey = Deno.env.get('GEMINI_API_KEY');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!apiKey || !supabaseUrl || !supabaseServiceKey) {
            throw new Error('Missing environment variables');
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const genAI = new GoogleGenerativeAI(apiKey);

        // Configure for JSON output
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash-exp",
            generationConfig: { responseMimeType: "application/json" }
        });

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
        
        Make the markdown structured and easy to read.
    `;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const enhanced = JSON.parse(text);

        // Update content for the specific language
        const { error } = await supabase
            .from('grammar_lesson_translations')
            .upsert({
                lesson_id: lesson_id,
                language_code: language_code, // Use the requested language code
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

        return new Response(JSON.stringify({ success: true, message: "Enhanced English content", data: enhanced }), {
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
