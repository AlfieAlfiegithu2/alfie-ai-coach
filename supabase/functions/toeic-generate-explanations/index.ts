import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

interface Question {
  question_number: number;
  question_text: string;
  options: string[] | null;
  correct_answer: string;
  passage_context?: string;
  part: number;
}

serve(async (req) => {
  // Handle CORS preflight - MUST return 200
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { questions, testType, part } = await req.json();

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing or empty questions array'
      }), { status: 400, headers: corsHeaders });
    }

    console.log(`🧠 Generating AI explanations for ${questions.length} TOEIC questions`);
    console.log(`📚 Test type: ${testType}, Part: ${part}`);

    const openRouterApiKey = Deno.env.get('OPENROUTER_API_KEY');

    if (!openRouterApiKey) {
      return new Response(JSON.stringify({
        success: false,
        error: 'OPENROUTER_API_KEY not configured'
      }), { status: 500, headers: corsHeaders });
    }

    // Build the prompt for explanation generation
    const questionsForPrompt = questions.map((q: Question) => {
      let questionDesc = `Question ${q.question_number}:\n`;
      
      if (q.passage_context) {
        questionDesc += `Context: ${q.passage_context.substring(0, 300)}...\n`;
      }
      
      questionDesc += `Question: ${q.question_text}\n`;
      
      if (q.options && q.options.length > 0) {
        questionDesc += `Options:\n`;
        q.options.forEach((opt, i) => {
          const letter = String.fromCharCode(65 + i);
          const isCorrect = q.correct_answer === letter || q.correct_answer === opt;
          questionDesc += `  (${letter}) ${opt}${isCorrect ? ' ✓' : ''}\n`;
        });
      }
      
      questionDesc += `Correct Answer: ${q.correct_answer}\n`;
      
      return questionDesc;
    }).join('\n---\n');

    const systemPrompt = `You are a friendly English teacher explaining TOEIC answers to students learning English. Your goal is to help them UNDERSTAND and REMEMBER.

IMPORTANT RULES for your explanations:
1. Use SIMPLE, everyday English - avoid grammar terms like "adverb", "conjunction", "modifier"
2. Start with the MEANING - what does the sentence want to say?
3. Give a REAL-LIFE EXAMPLE that students can relate to
4. Explain WHY each wrong answer doesn't fit (in simple terms)
5. End with a MEMORY TIP or pattern to remember
6. Keep it friendly and encouraging - like talking to a friend
7. Use 4-6 sentences per explanation

GOOD EXAMPLE:
"The correct answer is (C) 'even'. Look at the sentence - it's saying something surprising happened. 'Even' is used when we want to say 'wow, this is more than expected!' For example: 'Even my strict boss smiled today' = surprising! The other choices: 'very' just means 'a lot', 'so' connects two ideas, and 'too' means 'also' or 'more than needed'. 💡 Tip: When you see something unexpected or surprising in the sentence, think 'even'!"

BAD EXAMPLE (too technical):
"This question tests adverbs of emphasis. 'Even' functions as an intensifying adverb..."`;

    const userPrompt = `Generate STUDENT-FRIENDLY explanations for these ${testType} Part ${part} questions.

${questionsForPrompt}

Remember:
- Write like you're explaining to a friend who is learning English
- Use simple words, real examples, and helpful tips
- NO grammar jargon - explain the MEANING instead
- Include why wrong answers don't work
- Add a 💡 Tip at the end of each explanation

Provide explanations in this JSON format:
{
  "explanations": [
    "Friendly explanation for question 1 with example and tip...",
    "Friendly explanation for question 2 with example and tip...",
    ...
  ]
}

Each explanation should correspond to the questions in order. Return ONLY valid JSON.`;

    console.log('🔄 Calling Gemini 2.5 Pro via OpenRouter...');

    // Use Gemini 2.5 Pro Preview for explanations
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://englishaidol.com',
        'X-Title': 'English Aidol TOEIC Explanations',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro-preview-03-25', // Gemini 2.5 Pro Preview
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        temperature: 0.3, // Lower temperature for consistent, focused explanations
        max_tokens: 8000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Gemini Pro API error:', errorText);
      
      // Fallback to Gemini Flash if Pro fails
      console.log('🔄 Falling back to Gemini Flash...');
      
      const geminiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openRouterApiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://englishaidol.com',
          'X-Title': 'English Aidol TOEIC Explanations',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-preview-05-20',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.3,
          max_tokens: 8000,
        }),
      });

      if (!geminiResponse.ok) {
        throw new Error('Both Gemini Pro and Flash APIs failed');
      }

      const geminiData = await geminiResponse.json();
      const content = geminiData.choices?.[0]?.message?.content || '';
      
      return parseAndReturnExplanations(content, questions.length, 'gemini-2.5-flash');
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    console.log(`📥 Gemini Pro response length: ${content.length}`);

    return parseAndReturnExplanations(content, questions.length, 'gemini-2.5-pro');

  } catch (error: any) {
    console.error('❌ Error in toeic-generate-explanations:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Failed to generate explanations'
    }), { status: 500, headers: corsHeaders });
  }
});

function parseAndReturnExplanations(content: string, expectedCount: number, model: string = 'gemini-2.5-pro'): Response {
  try {
    // Clean up the response
    let jsonStr = content.trim();
    jsonStr = jsonStr.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    
    const objectStart = jsonStr.indexOf('{');
    const objectEnd = jsonStr.lastIndexOf('}') + 1;
    
    if (objectStart !== -1 && objectEnd > objectStart) {
      jsonStr = jsonStr.substring(objectStart, objectEnd);
    }
    
    const parsed = JSON.parse(jsonStr);
    const explanations = parsed.explanations || [];

    console.log(`✅ Parsed ${explanations.length} explanations`);

    // Ensure we have the right number of explanations
    while (explanations.length < expectedCount) {
      explanations.push('Explanation not available for this question.');
    }

    return new Response(JSON.stringify({
      success: true,
      explanations: explanations.slice(0, expectedCount),
      count: Math.min(explanations.length, expectedCount),
      model
    }), { headers: corsHeaders });

  } catch (parseError) {
    console.error('❌ JSON parsing error:', parseError);
    console.error('Raw content:', content.substring(0, 500));
    
    // Try to extract explanations from non-JSON response
    const lines = content.split('\n').filter(line => line.trim().length > 20);
    const explanations = lines.slice(0, expectedCount);
    
    if (explanations.length > 0) {
      return new Response(JSON.stringify({
        success: true,
        explanations,
        count: explanations.length,
        model,
        note: 'Extracted from non-JSON response'
      }), { headers: corsHeaders });
    }
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to parse AI response',
      rawContent: content.substring(0, 500)
    }), { status: 400, headers: corsHeaders });
  }
}

