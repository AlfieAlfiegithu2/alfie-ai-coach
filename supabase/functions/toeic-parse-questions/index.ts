import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

interface ParsedQuestion {
  question_number: number;
  question_text: string;
  question_type: string;
  options: string[];
  correct_answer: string;
  passage_context?: string;
}

interface ParsedPassage {
  title?: string;
  content: string;
  type: 'single' | 'double' | 'triple';
  questionStart: number;
  questionEnd: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { text, part, testType } = await req.json();

    if (!text || !part) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required fields: text and part'
      }), { status: 400, headers: corsHeaders });
    }

    console.log(`📝 Parsing TOEIC ${testType} Part ${part} questions`);
    console.log(`📄 Text length: ${text.length} characters`);

    const openRouterApiKey = Deno.env.get('OPENROUTER_API_KEY');
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

    if (!openRouterApiKey && !geminiApiKey) {
      return new Response(JSON.stringify({
        success: false,
        error: 'No API key configured'
      }), { status: 500, headers: corsHeaders });
    }

    // Build parsing prompt based on part
    let prompt = '';
    
    if (part === 5) {
      // Part 5: Incomplete Sentences
      prompt = `You are a TOEIC test parser. Parse the following Part 5 (Incomplete Sentences) questions.

INPUT TEXT:
${text}

INSTRUCTIONS:
1. Extract each question number, question text (the sentence with the blank), and all 4 options (A, B, C, D)
2. The blank is usually indicated by "-------" or "______" or "..."
3. Keep the question text exactly as written, preserving the blank
4. Extract options in order (A), (B), (C), (D)

OUTPUT FORMAT (JSON):
{
  "questions": [
    {
      "question_number": 101,
      "question_text": "The Technical Department is currently formulating written guidelines ------- the use of our micro-publishing facilities.",
      "question_type": "incomplete_sentence",
      "options": ["in", "for", "at", "with"],
      "correct_answer": ""
    }
  ]
}

Parse ALL questions from the input. Return ONLY valid JSON.`;
    } else if (part === 6) {
      // Part 6: Text Completion
      prompt = `You are a TOEIC test parser. Parse the following Part 6 (Text Completion) questions.

INPUT TEXT:
${text}

INSTRUCTIONS:
1. Part 6 has passages (emails, letters, articles) with blanks numbered (e.g., 131, 132, 133, 134)
2. Extract the full passage as "passage_context" for each question
3. Each passage typically has 4 questions
4. Identify where each blank appears in the passage
5. Extract the 4 options for each blank

OUTPUT FORMAT (JSON):
{
  "passages": [
    {
      "title": "Email from HR Department",
      "content": "Dear employees, We are pleased to announce that ------- (131) new policies...",
      "type": "single",
      "questionStart": 131,
      "questionEnd": 134
    }
  ],
  "questions": [
    {
      "question_number": 131,
      "question_text": "Fill in blank 131 in the passage",
      "question_type": "text_completion",
      "options": ["several", "some", "few", "many"],
      "correct_answer": "",
      "passage_context": "Dear employees, We are pleased to announce..."
    }
  ]
}

Parse ALL passages and questions. Return ONLY valid JSON.`;
    } else if (part === 7) {
      // Part 7: Reading Comprehension
      prompt = `You are a TOEIC test parser. Parse the following Part 7 (Reading Comprehension) questions.

INPUT TEXT:
${text}

INSTRUCTIONS:
1. Part 7 has reading passages followed by questions about the content
2. Passages can be: notices, emails, articles, advertisements, memos, etc.
3. Questions ask about main idea, details, inferences, vocabulary, etc.
4. Extract the passage content and all related questions
5. Single passages have 2-5 questions, double/triple passages have more

PASSAGE TYPES:
- "single": One text (questions like 147-150)
- "double": Two related texts (questions like 176-180)
- "triple": Three related texts (questions like 186-190)

OUTPUT FORMAT (JSON):
{
  "passages": [
    {
      "title": "Parking Notice",
      "content": "Parking is available in the Yorkdale Parking Lot...",
      "type": "single",
      "questionStart": 147,
      "questionEnd": 150
    }
  ],
  "questions": [
    {
      "question_number": 147,
      "question_text": "What is the purpose of this notice?",
      "question_type": "reading_comprehension",
      "options": ["To announce new parking rates", "To explain parking regulations", "To advertise parking spaces", "To describe a new parking lot"],
      "correct_answer": "",
      "passage_context": "Parking is available in the Yorkdale Parking Lot..."
    }
  ]
}

Parse ALL passages and questions. Return ONLY valid JSON.`;
    } else {
      // Listening parts (1-4) - simpler structure
      prompt = `You are a TOEIC test parser. Parse the following TOEIC Listening Part ${part} questions.

INPUT TEXT:
${text}

INSTRUCTIONS:
1. Extract each question with its number and options
2. Part 1: Photo descriptions (options A-D)
3. Part 2: Question-Response (options A-C)
4. Part 3 & 4: Conversations/Talks with questions (options A-D)

OUTPUT FORMAT (JSON):
{
  "questions": [
    {
      "question_number": 1,
      "question_text": "Question text or audio transcript reference",
      "question_type": "${part === 1 ? 'photo_description' : part === 2 ? 'question_response' : part === 3 ? 'conversation' : 'talk'}",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": ""
    }
  ]
}

Parse ALL questions. Return ONLY valid JSON.`;
    }

    let response;
    let apiUsed = '';

    // Try OpenRouter first (with Gemini or DeepSeek)
    if (openRouterApiKey) {
      console.log('🔄 Using OpenRouter API...');
      apiUsed = 'OpenRouter';
      
      response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openRouterApiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://englishaidol.com',
          'X-Title': 'English Aidol TOEIC Parser',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-lite',
          messages: [
            {
              role: 'system',
              content: 'You are a precise TOEIC test parser. Extract questions accurately and return valid JSON only.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1,
          max_tokens: 8000,
        }),
      });
    } else if (geminiApiKey) {
      console.log('🔄 Using Gemini API directly...');
      apiUsed = 'Gemini';
      
      response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 8000,
          }
        }),
      });
    }

    if (!response || !response.ok) {
      const errorText = response ? await response.text() : 'No response';
      console.error(`❌ ${apiUsed} API error:`, errorText);
      throw new Error(`${apiUsed} API request failed`);
    }

    const data = await response.json();
    
    // Extract content based on API
    let content = '';
    if (apiUsed === 'OpenRouter') {
      content = data.choices?.[0]?.message?.content || '';
    } else {
      content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }

    console.log(`📥 ${apiUsed} response length:`, content.length);

    // Parse JSON from response
    let parsedResult;
    try {
      // Clean up the response
      let jsonStr = content.trim();
      jsonStr = jsonStr.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      
      const objectStart = jsonStr.indexOf('{');
      const objectEnd = jsonStr.lastIndexOf('}') + 1;
      
      if (objectStart !== -1 && objectEnd > objectStart) {
        jsonStr = jsonStr.substring(objectStart, objectEnd);
      }
      
      parsedResult = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('❌ JSON parsing error:', parseError);
      console.error('Raw content:', content.substring(0, 500));
      
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to parse AI response as JSON',
        rawContent: content.substring(0, 1000)
      }), { status: 400, headers: corsHeaders });
    }

    const questions = parsedResult.questions || [];
    const passages = parsedResult.passages || [];

    console.log(`✅ Parsed ${questions.length} questions and ${passages.length} passages`);

    return new Response(JSON.stringify({
      success: true,
      questions,
      passages,
      count: questions.length,
      passageCount: passages.length,
      part,
      apiUsed
    }), { headers: corsHeaders });

  } catch (error: any) {
    console.error('❌ Error in toeic-parse-questions:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Failed to parse questions'
    }), { status: 500, headers: corsHeaders });
  }
});

