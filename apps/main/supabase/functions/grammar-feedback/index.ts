// @ts-nocheck - Deno runtime file, TypeScript errors for Deno imports are expected
import "https://deno.land/x/xhr@0.1.0/mod.ts";
// @ts-expect-error - Deno std library import
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

async function callGeminiFlashLite(prompt: string, apiKey: string, retryCount = 0) {
  console.log(`🚀 Attempting Gemini 2.5 Flash Lite API call via OpenRouter (attempt ${retryCount + 1}/2)...`);
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://englishaidol.com',
        'X-Title': 'Grammar Feedback'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Gemini Flash Lite API Error:', errorText);
      throw new Error(`Gemini Flash Lite API failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`✅ Gemini Flash Lite API call successful`);
    
    // Extract content from response (OpenRouter format)
    return data.choices?.[0]?.message?.content ?? '';
  } catch (error) {
    console.error(`❌ Gemini Flash Lite attempt ${retryCount + 1} failed:`, (error as any).message);
    
    if (retryCount < 1) {
      console.log(`🔄 Retrying Gemini Flash Lite API call in 500ms...`);
      await new Promise(resolve => setTimeout(resolve, 500));
      return callGeminiFlashLite(prompt, apiKey, retryCount + 1);
    }
    
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

  try {
    // Check for OpenRouter API key
    // @ts-expect-error - Deno global is available at runtime
    const openRouterApiKey = Deno.env.get('OPENROUTER_API_KEY');
    
    if (!openRouterApiKey) {
      console.error('❌ No OpenRouter API key configured for grammar feedback.');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Grammar feedback service temporarily unavailable. Please try again in a moment.',
        details: 'No OpenRouter API key configured'
      }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('✅ OpenRouter API key found for grammar feedback');

    let body;
    try {
      body = await req.json();
    } catch (error) {
      return new Response(JSON.stringify({
        error: 'Invalid JSON in request body',
        success: false
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { writing, taskType, taskNumber, targetLanguage } = body;

    console.log('📝 Grammar feedback request:', {
      writingLength: writing?.length || 0,
      taskType,
      taskNumber
    });

    if (!writing || typeof writing !== 'string' || writing.trim().length < 10) {
      return new Response(JSON.stringify({
        error: 'Please provide substantial writing content (at least 10 characters) for grammar analysis.',
        success: false
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const languageInstruction = targetLanguage && targetLanguage !== 'en' ? `
IMPORTANT LANGUAGE INSTRUCTION:
The "feedback" field should be written in ${targetLanguage === 'zh' ? 'Chinese (中文)' : targetLanguage === 'es' ? 'Spanish (Español)' : targetLanguage === 'fr' ? 'French (Français)' : targetLanguage === 'de' ? 'German (Deutsch)' : targetLanguage === 'ja' ? 'Japanese (日本語)' : targetLanguage === 'ko' ? 'Korean (한국어)' : targetLanguage === 'ar' ? 'Arabic (العربية)' : targetLanguage === 'pt' ? 'Portuguese (Português)' : targetLanguage === 'ru' ? 'Russian (Русский)' : targetLanguage === 'hi' ? 'Hindi (हिन्दी)' : targetLanguage === 'vi' ? 'Vietnamese (Tiếng Việt)' : 'English'}.

CRITICAL: Keep the following in ENGLISH:
- The "improved" field (the corrected version of the text) - MUST stay in English
- Grammar terminology (e.g., "subject-verb agreement", "tense consistency") - can be in target language but keep technical terms clear
- Only translate essential explanations, not every single word. Be concise.

TRANSLATE to ${targetLanguage === 'zh' ? 'Chinese' : targetLanguage === 'es' ? 'Spanish' : targetLanguage === 'fr' ? 'French' : targetLanguage === 'de' ? 'German' : targetLanguage === 'ja' ? 'Japanese' : targetLanguage === 'ko' ? 'Korean' : targetLanguage === 'ar' ? 'Arabic' : targetLanguage === 'pt' ? 'Portuguese' : targetLanguage === 'ru' ? 'Russian' : targetLanguage === 'hi' ? 'Hindi' : targetLanguage === 'vi' ? 'Vietnamese' : 'English'}:
- Brief error explanations in the "feedback" field
- Only essential parts of the feedback, keep it concise
` : '';

    const grammarPrompt = `Analyze this IELTS writing and identify ALL grammar errors. Provide brief explanations and an improved version.
${languageInstruction}
TASK: ${taskType || 'IELTS Writing'} - Task ${taskNumber || 'Unknown'}

STUDENT WRITING:
"${writing}"

Your response must be valid JSON with two fields:
1. "feedback": Brief explanation of ALL grammar errors found (one sentence per error). ${targetLanguage && targetLanguage !== 'en' ? `Write in ${targetLanguage}, but only translate essential parts.` : 'No markdown formatting.'}
2. "improved": The complete improved/corrected version of the entire text with all grammar errors fixed. MUST be in English.

Return ONLY valid JSON in this format:
{
  "feedback": "Brief explanation of errors...",
  "improved": "Complete improved version of the text..."
}`;

    const response = await callGeminiFlashLite(grammarPrompt, openRouterApiKey);

    if (!response || response.trim().length === 0) {
      console.error('❌ Empty response received from Gemini');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Received empty response from grammar analysis service. Please try again.',
        details: 'Gemini returned empty response'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Try to parse JSON response
    let parsedResponse;
    try {
      // Extract JSON from response (might have markdown code blocks)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      } else {
        parsedResponse = JSON.parse(response);
      }
    } catch (parseError) {
      console.error('❌ Failed to parse JSON response:', parseError);
      // Fallback: treat entire response as feedback, use original as improved
      parsedResponse = {
        feedback: response,
        improved: writing
      };
    }

    const feedback = parsedResponse.feedback || response;
    const improved = parsedResponse.improved || writing;

    console.log('✅ Grammar feedback generated successfully');

    return new Response(JSON.stringify({ 
      success: true, 
      feedback: feedback,
      improved: improved,
      taskType,
      taskNumber
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ Grammar feedback error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error?.message || 'Failed to generate grammar feedback. Please try again.',
      details: error?.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

