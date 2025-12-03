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
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

    if (!geminiApiKey) {
      throw new Error('Gemini API key not configured');
    }

    const body = await req.json();
    const { questions, passages } = body;

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      throw new Error('Questions array is required');
    }

    console.log('🤖 Generating explanations for', questions.length, 'questions');
    console.log('📖 Using', passages?.length || 0, 'passages for context');

    // Build passage context
    const passageContext = passages?.map((p: any) => 
      `PASSAGE ${p.passageNumber}:\n${p.text || ''}`
    ).join('\n\n---\n\n') || 'No passage text provided';

    // Build questions list
    const questionsList = questions.map((q: any) => 
      `Q${q.globalQuestionNumber || q.question_number}: ${q.question_text}\nCorrect Answer: ${q.correct_answer || 'Not provided'}\nQuestion Type: ${q.question_type || 'Unknown'}`
    ).join('\n\n');

    const prompt = `You are an expert IELTS Reading examiner and tutor. Generate detailed explanations for the following IELTS Reading questions. For each question, explain:

1. WHERE in the passage the answer can be found (quote the relevant text)
2. WHY this is the correct answer (explain the reasoning)
3. COMMON MISTAKES students might make and how to avoid them
4. KEY SKILLS being tested (e.g., scanning, inference, understanding main idea)

Keep explanations concise but helpful. Focus on teaching students how to find answers efficiently.

PASSAGES:
${passageContext}

QUESTIONS TO EXPLAIN:
${questionsList}

Respond with a JSON array in this exact format:
[
  {
    "questionNumber": 1,
    "passageNumber": 1,
    "explanation": "Your detailed explanation here"
  }
]

Only respond with the JSON array, no additional text.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.3,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 4096,
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Gemini API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    let aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    console.log('📝 Raw AI response length:', aiResponse.length);

    // Clean up the response - remove markdown code blocks if present
    aiResponse = aiResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    // Parse the JSON response
    let explanations = [];
    try {
      explanations = JSON.parse(aiResponse);
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiResponse.substring(0, 500));
      throw new Error('Failed to parse AI response as JSON');
    }

    console.log('✅ Generated', explanations.length, 'explanations');

    return new Response(JSON.stringify({ 
      success: true, 
      explanations,
      count: explanations.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in generate-reading-explanations:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

