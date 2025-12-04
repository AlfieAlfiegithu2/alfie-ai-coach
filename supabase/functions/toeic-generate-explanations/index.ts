import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
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

    const systemPrompt = `You are an expert TOEIC instructor providing clear, educational explanations for TOEIC test questions.

Your explanations should:
1. Be concise but thorough (2-4 sentences per question)
2. Explain WHY the correct answer is right
3. Briefly mention why common wrong answers are incorrect
4. Include relevant grammar rules, vocabulary tips, or reading strategies
5. Be appropriate for intermediate to advanced English learners

For grammar questions: Explain the grammar rule being tested
For vocabulary questions: Explain word meaning and usage context
For reading comprehension: Explain how to find the answer in the passage
For listening questions: Explain key phrases or context clues`;

    const userPrompt = `Generate explanations for these ${testType} Part ${part} questions:

${questionsForPrompt}

Provide explanations in this JSON format:
{
  "explanations": [
    "Explanation for question 1...",
    "Explanation for question 2...",
    ...
  ]
}

Each explanation should correspond to the questions in order. Return ONLY valid JSON.`;

    console.log('🔄 Calling DeepSeek V3.2 via OpenRouter...');

    // Use DeepSeek V3.2 for explanations (as specified by user)
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://englishaidol.com',
        'X-Title': 'English Aidol TOEIC Explanations',
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-chat', // DeepSeek V3.2
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
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ DeepSeek API error:', errorText);
      
      // Fallback to Gemini if DeepSeek fails
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
          model: 'google/gemini-2.5-flash-lite',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.3,
          max_tokens: 4000,
        }),
      });

      if (!geminiResponse.ok) {
        throw new Error('Both DeepSeek and Gemini APIs failed');
      }

      const geminiData = await geminiResponse.json();
      const content = geminiData.choices?.[0]?.message?.content || '';
      
      return parseAndReturnExplanations(content, questions.length);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    console.log(`📥 DeepSeek response length: ${content.length}`);

    return parseAndReturnExplanations(content, questions.length);

  } catch (error: any) {
    console.error('❌ Error in toeic-generate-explanations:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Failed to generate explanations'
    }), { status: 500, headers: corsHeaders });
  }
});

function parseAndReturnExplanations(content: string, expectedCount: number): Response {
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
      model: 'deepseek-v3.2'
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
        model: 'deepseek-v3.2',
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

