import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NCLEXQuestion {
  question_text: string;
  options: string[];
  rationale: string;
}

interface ModifiedQuestion {
  question_text: string;
  options: string[];
  rationale: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openrouterApiKey = Deno.env.get('OPENROUTER_API_KEY');
    
    if (!openrouterApiKey) {
      throw new Error('OpenRouter API key not configured');
    }

    const body = await req.json();
    const { questions } = body as { questions: NCLEXQuestion[] };

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      throw new Error('Questions array is required');
    }

    if (questions.length > 50) {
      throw new Error('Maximum 50 questions per request');
    }

    console.log(`🔄 Processing ${questions.length} NCLEX questions for AI modification`);

    const systemPrompt = `You are a medical education expert helping to rephrase NCLEX nursing exam questions. 
Your task is to slightly modify questions, options, and rationales to make them unique while:

1. PRESERVING the exact medical/nursing meaning and correctness
2. Keeping the same difficulty level
3. Using synonyms and alternative phrasing
4. NOT changing any clinical facts, drug names, or medical terminology that could alter the answer
5. Making changes subtle - approximately 10-20% of words should be different

For each question, provide:
- A slightly rephrased question text
- Slightly rephrased options (same number and order)
- A slightly rephrased rationale

IMPORTANT: The modifications must be subtle enough that the question tests the same knowledge but different enough to be considered original content.

Respond in valid JSON format only.`;

    const userPrompt = `Please modify these NCLEX questions:

${JSON.stringify(questions, null, 2)}

Respond with a JSON object containing a "modifications" array with the same structure:
{
  "modifications": [
    {
      "question_text": "modified question",
      "options": ["modified option 1", "modified option 2", ...],
      "rationale": "modified rationale"
    },
    ...
  ]
}`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openrouterApiKey}`,
        'HTTP-Referer': 'https://englishaidol.com',
        'X-Title': 'English AIdol NCLEX',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-001',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 8000,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error:', errorText);
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No response content from AI');
    }

    // Parse the JSON response
    let modifications: ModifiedQuestion[];
    try {
      const parsed = JSON.parse(content);
      modifications = parsed.modifications || parsed;
      
      // Validate the response structure
      if (!Array.isArray(modifications)) {
        throw new Error('Invalid response structure');
      }
      
      // Ensure we have the same number of questions
      if (modifications.length !== questions.length) {
        console.warn(`Mismatch: got ${modifications.length} modifications for ${questions.length} questions`);
        // Pad with originals if needed
        while (modifications.length < questions.length) {
          modifications.push(questions[modifications.length]);
        }
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      // Return original questions if parsing fails
      return new Response(
        JSON.stringify({ modifications: questions }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ Successfully modified ${modifications.length} questions`);

    return new Response(
      JSON.stringify({ modifications }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ NCLEX modification error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to modify questions',
        modifications: [] 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

