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

    const systemPrompt = `You are a friendly English teacher explaining TOEIC answers to students learning English. Your goal is to help them UNDERSTAND the grammar logic and REMEMBER patterns.

IMPORTANT RULES for your explanations:
1. ALWAYS explain the GRAMMAR REASON - WHY this word form is needed in this position
2. Use simple grammar terms: verb, noun, adjective (describes noun), adverb (describes verb/how)
3. Show the sentence structure: "We need [adverb] here because it tells us HOW the action happens"
4. Give a REAL-LIFE EXAMPLE that shows the same pattern
5. Explain WHY each wrong answer doesn't fit grammatically
6. End with a MEMORY TIP for the grammar pattern
7. Keep it friendly but educational - like a tutor explaining to a student
8. Use 5-7 sentences per explanation

GOOD EXAMPLE for word form question:
"The correct answer is (C) 'precisely'. WHY? Look at the blank: 'will begin _____ at 7 PM'. We need a word that describes HOW the action (begin) happens. 'Precisely' is an adverb - it tells us the meeting starts EXACTLY at 7, not a minute early or late. The wrong answers: (A) 'precise' is an adjective (describes nouns like 'precise time'), (B) 'precision' is a noun (a thing), (D) 'preciseness' is awkward/uncommon. 💡 Pattern: When you need to describe HOW something happens (verbs), use -ly adverbs!"

GOOD EXAMPLE for vocabulary question:
"The correct answer is (B) 'despite'. WHY? The sentence shows CONTRAST - good results happened even though there was a problem. 'Despite' means 'even though there was X, Y still happened'. Example: 'Despite the rain, we had fun.' The wrong answers: (A) 'although' needs a full sentence after it, (C) 'because' shows cause not contrast, (D) 'therefore' shows result. 💡 Pattern: 'Despite' + noun/gerund shows unexpected contrast!"

BAD EXAMPLE (not explaining the grammar reason):
"The correct answer is 'precisely'. It means exactly. The other options don't fit."`;

    const userPrompt = `Generate GRAMMAR-FOCUSED explanations for these ${testType} Part ${part} questions.

${questionsForPrompt}

For EACH question, you MUST include:
1. ✅ The correct answer
2. 🔍 WHY this answer is correct (grammar reason: what word type is needed and why)
3. 📝 Show the sentence structure that requires this word form
4. 🌍 A real-life example using the same pattern
5. ❌ Why EACH wrong answer doesn't fit (grammar reason)
6. 💡 A pattern/tip to remember for similar questions

Provide explanations in this JSON format:
{
  "explanations": [
    "Explanation with grammar reasoning for question 1...",
    "Explanation with grammar reasoning for question 2...",
    ...
  ]
}

Each explanation should correspond to the questions in order. Return ONLY valid JSON.`;

    console.log('🔄 Calling Gemini via OpenRouter...');

    // Use Gemini 2.0 Flash via OpenRouter (stable model)
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://englishaidol.com',
        'X-Title': 'English Aidol TOEIC Explanations',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-001',
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
        temperature: 0.3,
        max_tokens: 8000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenRouter API error:', errorText);
      throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    console.log(`📥 Gemini 2.0 Flash response length: ${content.length}`);

    return parseAndReturnExplanations(content, questions.length, 'gemini-2.0-flash');

  } catch (error: any) {
    console.error('❌ Error in toeic-generate-explanations:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Failed to generate explanations'
    }), { status: 500, headers: corsHeaders });
  }
});

function parseAndReturnExplanations(content: string, expectedCount: number, model: string = 'gemini-2.0-flash'): Response {
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
