import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

    if (!geminiApiKey) {
      throw new Error('Gemini API key not configured');
    }

    const body = await req.json();
    const { questionsText, passageNumber = 1 } = body;

    if (!questionsText || typeof questionsText !== 'string') {
      throw new Error('questionsText is required');
    }

    console.log('🤖 Parsing IELTS Reading questions with Gemini Pro...');
    console.log('📝 Text length:', questionsText.length, 'characters');
    console.log('📖 Passage number:', passageNumber);

    // Calculate question range based on passage
    const questionRanges: { [key: number]: string } = {
      1: '1-13',
      2: '14-26', 
      3: '27-40'
    };
    const expectedRange = questionRanges[passageNumber] || '1-13';

    const prompt = `You are an expert IELTS Reading question parser. Parse the following IELTS Reading questions and return a structured JSON response.

IMPORTANT RULES:
1. A passage can have MULTIPLE question sections with DIFFERENT question types
2. For example: Questions 1-8 might be "Matching Headings" while Questions 9-13 are "True/False/Not Given"
3. Detect ALL question sections and their types
4. Question numbers should be relative to the passage (e.g., ${expectedRange} for passage ${passageNumber})

SUPPORTED QUESTION TYPES (use exact names):
- "Matching Headings"
- "Matching Paragraph Information"  
- "Matching Features"
- "Matching Sentence Endings"
- "True False Not Given"
- "Yes No Not Given"
- "Multiple Choice"
- "List Selection"
- "Choose a Title"
- "Short Answer"
- "Sentence Completion"
- "Summary Completion"
- "Table Completion"
- "Flow Chart Completion"
- "Diagram Completion"

Return a JSON object with this EXACT structure:
{
  "sections": [
    {
      "sectionTitle": "Questions 1-8",
      "questionType": "Matching Headings",
      "instructions": "Match the headings below to the paragraphs...",
      "questionRange": "1-8",
      "options": ["i. Title one", "ii. Title two"] or null,
      "questions": [
        {
          "question_number": 1,
          "question_text": "Paragraph A",
          "question_type": "Matching Headings",
          "options": null,
          "correct_answer": ""
        }
      ]
    },
    {
      "sectionTitle": "Questions 9-13",
      "questionType": "True False Not Given",
      "instructions": "Do the following statements agree with the information...",
      "questionRange": "9-13",
      "options": null,
      "questions": [
        {
          "question_number": 9,
          "question_text": "The first experiment was successful.",
          "question_type": "True False Not Given",
          "options": ["TRUE", "FALSE", "NOT GIVEN"],
          "correct_answer": ""
        }
      ]
    }
  ],
  "totalQuestions": 13,
  "passageNumber": ${passageNumber}
}

RESPOND ONLY WITH VALID JSON. NO EXPLANATIONS.

QUESTIONS TO PARSE:
${questionsText}`;

    // Use Gemini 2.5 Pro for better parsing
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro-preview-06-05:generateContent?key=${geminiApiKey}`, {
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
          temperature: 0.1, // Low temperature for consistent parsing
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192, // Large output for many questions
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Gemini API error:', errorData);
      throw new Error(`Gemini API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    let aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    console.log('📝 Raw AI response length:', aiResponse.length);

    // Clean up the response - remove markdown code blocks
    aiResponse = aiResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    // Parse JSON
    let parsedResult;
    try {
      parsedResult = JSON.parse(aiResponse);
    } catch (parseError) {
      console.error('JSON parse error. Response:', aiResponse.substring(0, 1000));
      throw new Error('Failed to parse AI response as JSON');
    }

    // Validate structure
    if (!parsedResult.sections || !Array.isArray(parsedResult.sections)) {
      throw new Error('Invalid response structure - missing sections array');
    }

    // Flatten all questions for backward compatibility
    const allQuestions: any[] = [];
    parsedResult.sections.forEach((section: any) => {
      if (section.questions && Array.isArray(section.questions)) {
        section.questions.forEach((q: any) => {
          allQuestions.push({
            ...q,
            sectionTitle: section.sectionTitle,
            sectionInstructions: section.instructions
          });
        });
      }
    });

    console.log(`✅ Parsed ${parsedResult.sections.length} sections with ${allQuestions.length} total questions`);

    return new Response(JSON.stringify({ 
      success: true, 
      sections: parsedResult.sections,
      questions: allQuestions,
      totalQuestions: allQuestions.length,
      passageNumber: passageNumber
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in parse-reading-questions:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

