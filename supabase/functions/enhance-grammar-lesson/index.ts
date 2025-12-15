
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
        const { lesson_id } = await req.json();

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

        // 1. Fetch current English content to use as a seed/context
        const { data: currentLesson } = await supabase
            .from('grammar_lesson_translations')
            .select('*')
            .eq('lesson_id', lesson_id)
            .eq('language_code', 'en')
            .single();

        if (!currentLesson) throw new Error('Lesson not found');

        const prompt = `
        You are an expert IELTS Grammar Coach.
        The user finds the current explanation for the topic "${currentLesson.theory_title}" too brief.
        
        Please REWRITE and EXPAND the theory content to be comprehensive, detailed, and clear.
        Cover:
        - Deep definition of the concept.
        - Detailed formation rules (tables/lists).
        - Detailed usage scenarios with nuance.
        - Common mistakes with explanations.
        - Advanced tips (C1/C2 level tips if applicable).
        - Comparison between similar structures (e.g. Will vs Going to).
        
        Current Title: ${currentLesson.theory_title}
        Current Definition: ${currentLesson.theory_definition}
        
        Return a valid JSON object with the following fields:
        - theory_title (String)
        - theory_definition (String - Definition)
        - theory_formation (String - Markdown)
        - theory_usage (String - Markdown)
        - theory_common_mistakes (String - Markdown)
        - rules (Array of Strings)
        - examples (Array of Objects with { sentence, explanation })
        - localized_tips (String)
        
        Make the markdown structured and easy to read. Use logical sections.
        For "Future Tenses", ensure you cover Will, Going To, Present Continuous, and briefly mention Future Continuous/Perfect importance if relevant.
    `;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        // With JSON mode, text should be valid JSON directly.
        const enhanced = JSON.parse(text);

        // Update English content
        const { error } = await supabase
            .from('grammar_lesson_translations')
            .update({
                theory_title: enhanced.theory_title,
                theory_definition: enhanced.theory_definition,
                theory_formation: enhanced.theory_formation,
                theory_usage: enhanced.theory_usage,
                theory_common_mistakes: enhanced.theory_common_mistakes,
                rules: enhanced.rules,
                examples: enhanced.examples,
                localized_tips: enhanced.localized_tips,
                updated_at: new Date().toISOString()
            })
            .eq('id', currentLesson.id);

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
