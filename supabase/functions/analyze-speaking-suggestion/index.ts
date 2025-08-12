import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { questionPrompt, studentTranscription } = await req.json();

    if (!questionPrompt || !studentTranscription) {
      throw new Error('Missing required fields: questionPrompt and studentTranscription');
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    console.log('🎯 Analyzing speaking suggestion for question:', questionPrompt.substring(0, 50) + '...');

    const prompt = `You are an expert IELTS Speaking examiner. Take the following student's answer to the IELTS question and rewrite it to a Band 7.5+ level.

IELTS Question: "${questionPrompt}"

Student's Answer: "${studentTranscription}"

Instructions:
1. Improve the answer by using more sophisticated vocabulary, more natural collocations, better grammatical structures, and a clearer, more coherent structure.
2. Do not just fix small errors. Create a model answer that is an improved version of what the student was trying to say.
3. Keep the same general meaning and intent but elevate the language quality.
4. Return a JSON object with two keys:
   - "original_spans": Array of objects with text segments from the student's transcription. Mark basic vocabulary, simple grammar, or unclear expressions with status: "error", and neutral text with status: "neutral"
   - "suggested_spans": Array of objects with text segments from your improved answer. Mark upgraded vocabulary, improved structures, or enhanced clarity with status: "improvement", and neutral text with status: "neutral"

Example format:
{
  "original_spans": [
    {"text": "I think ", "status": "neutral"},
    {"text": "it's good", "status": "error"},
    {"text": " because it helps people", "status": "neutral"}
  ],
  "suggested_spans": [
    {"text": "I believe ", "status": "neutral"},
    {"text": "it's highly beneficial", "status": "improvement"},
    {"text": " because it assists individuals", "status": "improvement"}
  ]
}

Focus on meaningful improvements that would actually raise the IELTS band score.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert IELTS Speaking examiner who provides detailed analysis and improvements. Ensure you only return valid JSON and never include Korean text in transcriptions unless the original text was Korean.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    console.log('🤖 AI Response received:', aiResponse.substring(0, 200) + '...');

    // Parse the JSON response from AI
    let parsedResult;
    try {
      // Try to extract JSON from the response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in AI response');
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      
      // Fallback: create basic spans if parsing fails
      parsedResult = {
        original_spans: [{ text: studentTranscription, status: "neutral" }],
        suggested_spans: [{ text: "AI analysis temporarily unavailable. Please try again.", status: "neutral" }]
      };
    }

    console.log('✅ Suggestion analysis complete');

    return new Response(JSON.stringify(parsedResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-speaking-suggestion:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      original_spans: [],
      suggested_spans: []
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});