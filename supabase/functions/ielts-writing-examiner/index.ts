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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    
    if (!geminiApiKey) {
      console.error('❌ No Gemini API key found');
      throw new Error('Gemini API key is required');
    }

    const { task1Answer, task2Answer, task1Data, task2Data } = await req.json();

    if (!task1Answer || !task2Answer) {
      throw new Error('Both Task 1 and Task 2 answers are required');
    }

    console.log('🔍 AI Examiner Request:', { 
      task1Length: task1Answer.length,
      task2Length: task2Answer.length 
    });

    const examinerPrompt = `You are a senior IELTS examiner. Analyze the following writing tasks and provide accurate band scores.

TASK 1:
Prompt: ${task1Data?.title || 'Task 1'}
Instructions: ${task1Data?.instructions || ''}
${task1Data?.imageContext ? `Image Description: ${task1Data.imageContext}` : ''}

Student Response: "${task1Answer}"

TASK 2:
Prompt: ${task2Data?.title || 'Task 2'}
Instructions: ${task2Data?.instructions || ''}

Student Response: "${task2Answer}"

Provide your assessment as a JSON object with this EXACT structure:

{
  "structured": {
    "task1": {
      "criteria": {
        "task_achievement": 6.5,
        "coherence_and_cohesion": 6.0,
        "lexical_resource": 6.0,
        "grammatical_range_and_accuracy": 6.5
      },
      "overall_band": 6.0,
      "feedback_markdown": "### Task 1 Assessment\\n\\nProvide detailed feedback here...",
      "feedback": {
        "strengths": ["List specific strengths"],
        "improvements": ["List specific improvements needed"]
      }
    },
    "task2": {
      "criteria": {
        "task_response": 7.0,
        "coherence_and_cohesion": 6.5,
        "lexical_resource": 6.5,
        "grammatical_range_and_accuracy": 7.0
      },
      "overall_band": 6.5,
      "feedback_markdown": "### Task 2 Assessment\\n\\nProvide detailed feedback here...",
      "feedback": {
        "strengths": ["List specific strengths"],
        "improvements": ["List specific improvements needed"]
      }
    },
    "overall": {
      "band": 6.5,
      "calculation": "Task 1: 6.0, Task 2: 6.5 (weighted average)",
      "feedback_markdown": "### Overall Assessment\\n\\nProvide overall feedback here..."
    }
  }
}

SCORING GUIDELINES:
- Use IELTS band scores 0-9 (half points allowed: 5.5, 6.0, 6.5, etc.)
- Task 1: Assess task_achievement, coherence_and_cohesion, lexical_resource, grammatical_range_and_accuracy
- Task 2: Assess task_response, coherence_and_cohesion, lexical_resource, grammatical_range_and_accuracy
- Overall band = Task 1 (33%) + Task 2 (67%)
- Return ONLY the JSON object, no other text.`;

    // Use Gemini only
    console.log('🔄 Using Gemini API...');
    const aiResponse = await callGemini(examinerPrompt, geminiApiKey);
    const modelUsed = 'gemini-2.0-flash-exp';
    console.log('✅ Gemini API succeeded');

    let content = aiResponse.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    console.log('🔍 Raw API response content length:', content.length);
    
    // Check if content is empty or too short
    if (!content || content.length < 10) {
      console.error('❌ API response content is empty or too short:', content);
      throw new Error('API returned empty or invalid response');
    }
    
    console.log('🔍 Raw API response first 300 chars:', content.substring(0, 300));
    console.log('🔍 Raw API response last 300 chars:', content.substring(content.length - 300));

    let structured: any = null;
    
    // Simplified JSON parsing
    try {
      // Remove markdown code blocks if present
      let cleaned = content.trim();
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
        const jsonStr = cleaned.substring(firstBrace, lastBrace + 1);
        structured = JSON.parse(jsonStr);
        console.log('✅ Successfully parsed JSON response');
      } else {
        throw new Error('No valid JSON structure found');
      }
    } catch (parseError) {
      console.error('❌ JSON parsing failed:', parseError.message);
      throw new Error('Failed to parse AI response as valid JSON');
    }

    // Validate required structure
    if (!structured?.structured?.task1 || !structured?.structured?.task2) {
      console.error('❌ Missing required task data in structured response');
      throw new Error('AI response missing required task assessment data');
    }

    // Clamp band scores to valid range (0-9)
    const clampBands = (obj: any) => {
      if (!obj || typeof obj !== 'object') return;
      for (const k in obj) {
        const v = (obj as any)[k];
        if (k === 'band' && typeof v === 'number') (obj as any)[k] = Math.min(9, Math.max(0, v));
        else if (typeof v === 'object') clampBands(v);
      }
    };
    clampBands(structured);

    const feedback = structured?.structured?.full_report_markdown || content;

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