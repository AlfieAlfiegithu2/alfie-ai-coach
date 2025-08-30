import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function callGemini(prompt: string, apiKey: string, retryCount = 0) {
  console.log(`🚀 Attempting Gemini API call (attempt ${retryCount + 1}/2)...`);
  
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`, {
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
          temperature: 0.1,
          maxOutputTokens: 4000
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Gemini API Error:', errorText);
      throw new Error(`Gemini API failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Gemini API call successful');
    return data;
  } catch (error) {
    console.error(`❌ Gemini attempt ${retryCount + 1} failed:`, error.message);
    
    if (retryCount < 1) {
      console.log(`🔄 Retrying Gemini API call in 500ms...`);
      await new Promise(resolve => setTimeout(resolve, 500));
      return callGemini(prompt, apiKey, retryCount + 1);
    }
    
    throw error;
  }
}

async function callOpenAI(prompt: string, apiKey: string, retryCount = 0) {
  console.log(`🚀 Attempting OpenAI API call (attempt ${retryCount + 1}/2)...`);
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'system',
            content: 'You are an expert IELTS examiner with 15+ years of experience. You follow official IELTS band descriptors precisely and provide accurate, evidence-based scoring. You MUST return ONLY a valid JSON object with no additional text.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_completion_tokens: 4000
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenAI API Error:', errorText);
      throw new Error(`OpenAI API failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ OpenAI API call successful');
    return data;
  } catch (error) {
    console.error(`❌ OpenAI attempt ${retryCount + 1} failed:`, error.message);
    
    if (retryCount < 1) {
      console.log(`🔄 Retrying OpenAI API call in 500ms...`);
      await new Promise(resolve => setTimeout(resolve, 500));
      return callOpenAI(prompt, apiKey, retryCount + 1);
    }
    
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { task1Answer, task2Answer, task1Data, task2Data, apiProvider = 'gemini' } = await req.json();

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (apiProvider === 'gemini' && !geminiApiKey) {
      console.error('❌ No Gemini API key found');
      throw new Error('Gemini API key is required');
    }
    
    if (apiProvider === 'openai' && !openaiApiKey) {
      console.error('❌ No OpenAI API key found');
      throw new Error('OpenAI API key is required');
    }

    // Allow single task submissions - check for meaningful content
    const hasTask1 = task1Answer && task1Answer.trim() !== '' && task1Answer !== 'Not completed';
    const hasTask2 = task2Answer && task2Answer.trim() !== '' && task2Answer !== 'Not completed';
    
    if (!hasTask1 && !hasTask2) {
      throw new Error('At least one task answer is required');
    }

    console.log('🔍 AI Examiner Request:', { 
      task1Length: task1Answer.length,
      task2Length: task2Answer.length 
    });

    const masterExaminerPrompt = `Your Role & Core Instruction

You are an expert IELTS writing analyst and a master rewriter. You will be given a student's essay. Your task is to perform a complete and exhaustive sentence-by-sentence analysis of the entire text. You must not skip any sentences. For every single sentence the student writes, you will provide an improved, higher-scoring version and a clear explanation of the changes.

Your Guiding Principles for Improvement

For each sentence, you must analyze it and improve it based on all four of these dimensions:

1. Idea & Clarity: Is the student's idea clear? Can you make it more specific, more persuasive, or more directly relevant to the essay question?
2. Logic & Flow: Does the sentence connect logically to the one before it? Can you add a better transition word or rephrase it to improve the overall flow of the argument?
3. Vocabulary (Lexical Resource): Can you replace common words with more precise, academic, or sophisticated synonyms to elevate the tone?
4. Grammar & Structure: Can you fix grammatical errors or rewrite a simple sentence into a more complex and impressive structure?

You must be an ambitious rewriter. Even if a sentence is grammatically correct, you are required to find a way to make it better, clearer, or more sophisticated.

CRITICAL: Required JSON Output Structure

Your final output MUST be a single, valid JSON object containing a single key: sentence_by_sentence_analysis. This will be an array of objects. Do not include any other text before or after the JSON.

You will create one object in the array for every sentence in the student's original text. Each object must contain three keys:

1. original_spans: An array of spans breaking down the student's original sentence. Tag any specific words or phrases with clear errors or weaknesses with status: "error". The rest should be status: "neutral".

2. improved_spans: An array of spans breaking down your new, improved sentence. Only the specific words or short phrases that you changed or added for improvement should have status: "improvement". The rest should be status: "neutral".

3. explanation: A clear, concise explanation of the key improvements you made in that sentence, covering ideas, logic, or language.

Combined Essay Text for Analysis:

${hasTask1 ? `Task 1 Essay:
${task1Answer}

` : ''}${hasTask2 ? `Task 2 Essay:
${task2Answer}` : ''}

You must return a JSON object with the following structure:

{
  "sentence_by_sentence_analysis": [
    {
      "original_spans": [
        { "text": "This is a ", "status": "neutral" },
        { "text": "big problem for social life", "status": "error" },
        { "text": " in the family.", "status": "neutral" }
      ],
      "improved_spans": [
        { "text": "This presents a ", "status": "neutral" },
        { "text": "significant challenge to social cohesion", "status": "improvement" },
        { "text": " within the family unit.", "status": "neutral" }
      ],
      "explanation": "Improved vocabulary by replacing 'big problem' with 'significant challenge' and 'social life' with the more precise term 'social cohesion'."
    },
    {
      "original_spans": [
        { "text": "Another important reason is that people don't meet face-to-face anymore.", "status": "neutral" }
      ],
      "improved_spans": [
        { "text": "Furthermore, a ", "status": "improvement" },
        { "text": "decline in face-to-face interaction", "status": "improvement" },
        { "text": " represents another critical factor.", "status": "neutral" }
      ],
      "explanation": "Restructured the sentence for a more academic tone and used a better transition word ('Furthermore') instead of starting with 'Another'."
    }
  ]
}
`;

    // Use selected API provider with fallback
    let aiResponse: any;
    let modelUsed: string;
    let content: string;

    if (apiProvider === 'openai') {
      console.log('🔄 Using OpenAI API...');
      aiResponse = await callOpenAI(masterExaminerPrompt, openaiApiKey);
      modelUsed = 'OpenAI GPT-4.1';
      content = aiResponse.choices?.[0]?.message?.content ?? '';
      console.log('✅ OpenAI API succeeded');
    } else {
      try {
        console.log('🔄 Using Gemini API...');
        aiResponse = await callGemini(masterExaminerPrompt, geminiApiKey);
        modelUsed = 'Google Gemini AI';
        content = aiResponse.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        console.log('✅ Gemini API succeeded');
      } catch (geminiError) {
        console.log('⚠️ Gemini failed, falling back to OpenAI:', geminiError.message);
        if (!openaiApiKey) {
          throw new Error('Gemini quota exceeded and no OpenAI API key available for fallback');
        }
        console.log('🔄 Fallback: Using OpenAI API...');
        aiResponse = await callOpenAI(masterExaminerPrompt, openaiApiKey);
        modelUsed = 'OpenAI GPT-4.1 (Fallback)';
        content = aiResponse.choices?.[0]?.message?.content ?? '';
        console.log('✅ OpenAI fallback succeeded');
      }
    }

    console.log('🔍 Raw API response content length:', content.length);
    
    if (!content || content.length < 10) {
      console.error('❌ API response content is empty or too short:', content);
      throw new Error('API returned empty or invalid response');
    }
    
    console.log('🔍 Raw API response first 500 chars:', content.substring(0, 500));
    console.log('🔍 Raw API response last 500 chars:', content.substring(content.length - 500));

    let structured: any = null;
    try {
      structured = JSON.parse(content);
      console.log('✅ Successfully parsed structured response');
    } catch (_e) {
      console.log('⚠️ Failed to parse JSON directly, attempting extraction...');
      
      let extractedJson = '';
      let cleaned = content.trim();
      
      // Remove markdown code blocks
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.substring(7);
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.substring(3);
      }
      
      if (cleaned.endsWith('```')) {
        cleaned = cleaned.substring(0, cleaned.length - 3);
      }
      
      cleaned = cleaned.trim();
      
      // Find the main JSON object
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        extractedJson = cleaned.substring(firstBrace, lastBrace + 1);
        
        console.log('🔍 Extracted JSON length:', extractedJson.length);
        console.log('🔍 Extracted JSON first 200 chars:', extractedJson.substring(0, 200));
        console.log('🔍 Extracted JSON last 200 chars:', extractedJson.substring(extractedJson.length - 200));
        
        try {
          structured = JSON.parse(extractedJson);
          console.log('✅ Successfully parsed extracted JSON');
        } catch (parseError) {
          console.log('❌ Failed to parse extracted JSON:', parseError.message);
          
          // Try to fix common JSON issues
          try {
            let fixedJson = extractedJson.replace(/,(\s*[}\]])/g, '$1');
            
            // Balance braces if needed
            const openBraces = (fixedJson.match(/\{/g) || []).length;
            const closeBraces = (fixedJson.match(/\}/g) || []).length;
            
            if (openBraces > closeBraces) {
              fixedJson += '}'.repeat(openBraces - closeBraces);
            }
            
            console.log('🔧 Attempting to parse fixed JSON...');
            structured = JSON.parse(fixedJson);
            console.log('✅ Successfully parsed fixed JSON');
          } catch (fixError) {
            console.log('❌ Final parsing attempt failed:', fixError.message);
          }
        }
      }
    }

    // Validate the new sentence-by-sentence structure
    if (structured && structured.sentence_by_sentence_analysis) {
      console.log('✅ Sentence-by-sentence analysis found:', structured.sentence_by_sentence_analysis.length, 'sentences');
    } else {
      console.log('⚠️ No sentence-by-sentence analysis found in response');
    }

    const feedback = structured && structured.sentence_by_sentence_analysis ? 
      `# IELTS Writing Analysis - Sentence-by-Sentence Feedback\n\n**${structured.sentence_by_sentence_analysis.length} sentences analyzed**\n\n${JSON.stringify(structured, null, 2)}` : 
      content;

    return new Response(JSON.stringify({ 
      success: true, 
      feedback,
      structured,
      apiUsed: modelUsed,
      task1WordCount: task1Answer.trim().split(/\s+/).length,
      task2WordCount: task2Answer.trim().split(/\s+/).length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in ielts-writing-examiner function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});