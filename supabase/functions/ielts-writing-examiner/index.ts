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
            content: 'You are an expert IELTS writing analyst and master rewriter. You MUST return ONLY a valid JSON object with no additional text.'
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
      task1Length: task1Answer?.length || 0,
      task2Length: task2Answer?.length || 0 
    });

    const masterExaminerPrompt = `You are an expert IELTS writing analyst and a master rewriter. You will be given a student's essay. Your task is to perform a complete and exhaustive sentence-by-sentence analysis of the entire text. You must not skip any sentences. For every single sentence the student writes, you will provide an improved, higher-scoring version and a clear explanation of the changes.

Your Guiding Principles for Improvement:
For each sentence, you must analyze it and improve it based on all four of these dimensions:

1. Idea & Clarity: Is the student's idea clear? Can you make it more specific, more persuasive, or more directly relevant to the essay question?
2. Logic & Flow: Does the sentence connect logically to the one before it? Can you add a better transition word or rephrase it to improve the overall flow of the argument?
3. Vocabulary (Lexical Resource): Can you replace common words with more precise, academic, or sophisticated synonyms to elevate the tone?
4. Grammar & Structure: Can you fix grammatical errors or rewrite a simple sentence into a more complex and impressive structure?

You must be an ambitious rewriter. Even if a sentence is grammatically correct, you are required to find a way to make it better, clearer, or more sophisticated.

CRITICAL: Required JSON Output Structure
Your final output MUST be a single, valid JSON object containing ONLY a single key: sentence_by_sentence_analysis. This will be an array of objects. Do not include any other text before or after the JSON.

You will create one object in the array for every sentence in the student's original text. Each object must contain three keys:

1. original_spans: An array of spans breaking down the student's original sentence. Tag any specific words or phrases with clear errors or weaknesses with status: "error". The rest should be status: "neutral".

2. improved_spans: An array of spans breaking down your new, improved sentence. Only the specific words or short phrases that you changed or added for improvement should have status: "improvement". The rest should be status: "neutral".

3. explanation: A clear, concise explanation of the key improvements you made in that sentence, covering ideas, logic, or language.

EXAMPLE OUTPUT STRUCTURE:
{
  "sentence_by_sentence_analysis": [
    {
      "original_spans": [
        { "text": "This is a ", "status": "neutral" },
        { "text": "big problem", "status": "error" },
        { "text": " for social life in the family.", "status": "neutral" }
      ],
      "improved_spans": [
        { "text": "This presents a ", "status": "neutral" },
        { "text": "significant challenge", "status": "improvement" },
        { "text": " to social cohesion within the family unit.", "status": "neutral" }
      ],
      "explanation": "Improved vocabulary by replacing 'big problem' with 'significant challenge' and made the concept more specific with 'social cohesion within the family unit'."
    }
  ]
}

${hasTask1 ? `\nTask 1 Text for Analysis: "${task1Answer}"` : ''}
${hasTask2 ? `\nTask 2 Text for Analysis: "${task2Answer}"` : ''}

Analyze every single sentence from both tasks. Return ONLY the JSON with sentence_by_sentence_analysis.`;

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

    // Parse and validate JSON response
    let analysisResult;
    try {
      // Clean content by removing potential markdown wrapping
      const cleanedContent = content
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .replace(/^\s*[\r\n]+/gm, '')
        .trim();

      console.log('🧹 Cleaned AI response length:', cleanedContent.length);

      analysisResult = JSON.parse(cleanedContent);
      console.log('✅ JSON parsing successful');
      
      // Validate required structure - now expecting sentence_by_sentence_analysis
      if (!analysisResult.sentence_by_sentence_analysis || !Array.isArray(analysisResult.sentence_by_sentence_analysis)) {
        throw new Error('Invalid response: missing or invalid sentence_by_sentence_analysis array');
      }
      
      console.log(`✅ Found ${analysisResult.sentence_by_sentence_analysis.length} sentences analyzed`);
      
    } catch (parseError) {
      console.error('❌ JSON parsing failed:', parseError.message);
      console.log('Raw content excerpt:', content.substring(0, 500));
      
      // Try to extract JSON from response
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysisResult = JSON.parse(jsonMatch[0]);
          console.log('✅ Extracted JSON from response');
        } else {
          throw new Error('No valid JSON found in response');
        }
      } catch (extractError) {
        console.error('❌ JSON extraction failed:', extractError.message);
        
        return new Response(
          JSON.stringify({
            error: 'Failed to parse AI response',
            details: parseError.message,
            model_used: modelUsed
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }

    console.log('✅ Sentence-by-sentence analysis completed successfully');
    
    return new Response(
      JSON.stringify({
        sentence_by_sentence_analysis: analysisResult.sentence_by_sentence_analysis,
        model_used: modelUsed,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Error in ielts-writing-examiner function:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});