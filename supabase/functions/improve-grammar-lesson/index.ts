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
        const { topic_slug, lesson_id, current_content } = await req.json();

        if (!lesson_id) {
            throw new Error('lesson_id is required');
        }

        const apiKey = Deno.env.get('GEMINI_API_KEY');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!apiKey) throw new Error('GEMINI_API_KEY is missing');
        if (!supabaseUrl) throw new Error('SUPABASE_URL is missing');
        if (!supabaseServiceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is missing');

        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        // Get current content if not provided
        let content = current_content;
        if (!content) {
            const { data: translation } = await supabase
                .from('grammar_lesson_translations')
                .select('*')
                .eq('lesson_id', lesson_id)
                .eq('language_code', 'en')
                .single();
            content = translation;
        }

        if (!content) {
            throw new Error('No content found for lesson');
        }

        const prompt = `You are an expert English grammar teacher creating easy-to-read lesson content for IELTS students.

Current content for topic "${topic_slug || content.theory_title}":
- Title: ${content.theory_title}

Create well-formatted, SCANNABLE content that's easy to read. Use:
- Short paragraphs (2-3 sentences max)
- Bullet points for lists
- Clear section headers with emojis
- Visual separators

Return ONLY valid JSON with these exact fields:
{
    "theory_definition": "Format with SHORT paragraphs and visual structure:

🎯 **What is [Topic]?**

[1-2 sentence definition]

📌 **Key Point:**
[Core concept in simple terms]

💡 **Why It Matters:**
[1-2 sentences on importance]

🔑 **Remember:**
• Point 1
• Point 2
• Point 3",

    "theory_formation": "Format with clear structure:

📐 **Basic Formula:**
\`Subject + Verb + Object\`

✅ **Positive Form:**
• Formula: [formula]
• Example: [example]

❌ **Negative Form:**
• Formula: [formula]
• Example: [example]

❓ **Question Form:**
• Formula: [formula]
• Example: [example]

📝 **Quick Reference:**
| Form | Structure | Example |
|------|-----------|---------|
| + | S + V + O | I eat apples |
| - | S + don't + V | I don't eat |
| ? | Do + S + V? | Do you eat? |",

    "theory_usage": "Format with categories:

📍 **When to Use:**

**1️⃣ [Category 1]**
• [Use case]
• Example: \"[sentence]\"

**2️⃣ [Category 2]**
• [Use case]
• Example: \"[sentence]\"

**3️⃣ [Category 3]**
• [Use case]
• Example: \"[sentence]\"

⏰ **Signal Words:**
• [word] - [meaning]
• [word] - [meaning]",

    "theory_common_mistakes": "Format clearly:

**❌ Mistake 1:**
Wrong: \"[incorrect sentence]\"
✅ Right: \"[correct sentence]\"
💡 Why: [explanation]

**❌ Mistake 2:**
Wrong: \"[incorrect sentence]\"
✅ Right: \"[correct sentence]\"
💡 Why: [explanation]

(Include 5 mistakes)",

    "rules": [
        {"title": "📌 Rule Name", "example": "Clear example sentence", "formula": "Pattern here"},
        {"title": "📌 Another Rule", "example": "Another example", "formula": "Pattern"}
    ],
    "examples": [
        {"sentence": "Example sentence here.", "explanation": "Brief explanation"},
        {"sentence": "Another example.", "explanation": "Brief explanation"}
    ],
    "localized_tips": "💡 **Pro Tip:** [A memorable tip or mnemonic to remember this grammar point]"
}

Important formatting rules:
1. Keep paragraphs SHORT (2-3 sentences max)
2. Use bullet points (•) for lists
3. Use emojis for visual scanning
4. Leave blank lines between sections
5. Use **bold** for key terms
6. Include 5+ rules and 6+ examples

Return ONLY the JSON object, no markdown code blocks.`;

        console.log(`Generating improved content for ${topic_slug || content.theory_title}...`);

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Clean up potential markdown formatting
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        let improvedContent;
        try {
            improvedContent = JSON.parse(jsonStr);
        } catch (e) {
            console.error("Failed to parse JSON:", jsonStr.substring(0, 500));
            throw new Error("Failed to parse generated JSON");
        }

        // Update the translation
        const { error: updateError } = await supabase
            .from('grammar_lesson_translations')
            .update({
                theory_definition: improvedContent.theory_definition,
                theory_formation: improvedContent.theory_formation,
                theory_usage: improvedContent.theory_usage,
                theory_common_mistakes: improvedContent.theory_common_mistakes,
                rules: improvedContent.rules,
                examples: improvedContent.examples,
                localized_tips: improvedContent.localized_tips,
                updated_at: new Date().toISOString()
            })
            .eq('lesson_id', lesson_id)
            .eq('language_code', 'en');

        if (updateError) {
            console.error("Update error:", updateError);
            throw new Error('Failed to update content: ' + updateError.message);
        }

        const newLen = (improvedContent.theory_definition?.length || 0) +
            (improvedContent.theory_formation?.length || 0) +
            (improvedContent.theory_usage?.length || 0);

        console.log(`✅ Updated ${topic_slug}! New content length: ${newLen} chars`);

        return new Response(JSON.stringify({
            success: true,
            new_length: newLen,
            title: content.theory_title
        }), {
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
