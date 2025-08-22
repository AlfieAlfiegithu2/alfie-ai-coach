import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function callDeepSeek(messages: any[], apiKey: string, retryCount = 0) {
  console.log(`🚀 Attempting DeepSeek API call (attempt ${retryCount + 1}/3)...`);
  
  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages,
        max_tokens: 4000,
        temperature: 0.1, // Lower temperature for more consistent JSON
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ DeepSeek API Error:', errorText);
      throw new Error(`DeepSeek API failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ DeepSeek API call successful');
    console.log('🔍 DeepSeek response structure:', {
      hasChoices: !!data.choices,
      choicesLength: data.choices?.length || 0,
      hasContent: !!data.choices?.[0]?.message?.content,
      contentLength: data.choices?.[0]?.message?.content?.length || 0
    });
    
    return data;
  } catch (error) {
    console.error(`❌ DeepSeek attempt ${retryCount + 1} failed:`, error.message);
    
    if (retryCount < 2) {
      console.log(`🔄 Retrying DeepSeek API call in 1 second...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return callDeepSeek(messages, apiKey, retryCount + 1);
    }
    
    throw error;
  }
}

async function callOpenAI(messages: any[], apiKey: string) {
  console.log('🚀 Attempting OpenAI API call as backup...');
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4.1-2025-04-14',
      messages,
      max_completion_tokens: 4000,
      // Note: no temperature for newer models
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
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const deepSeekApiKey = Deno.env.get('DEEPSEEK_API_KEY');
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    
    console.log('🔍 API Keys status:', {
      hasDeepSeek: !!deepSeekApiKey,
      hasOpenAI: !!openAIApiKey,
      deepSeekLength: deepSeekApiKey?.length || 0,
      openAILength: openAIApiKey?.length || 0,
    });
    
    if (!deepSeekApiKey && !openAIApiKey) {
      console.error('❌ No API keys found');
      throw new Error('No AI API keys configured');
    }

    const { task1Answer, task2Answer, task1Data, task2Data } = await req.json();

    if (!task1Answer || !task2Answer) {
      throw new Error('Both Task 1 and Task 2 answers are required');
    }

    console.log('🔍 AI Examiner Request:', { 
      task1Length: task1Answer.length,
      task2Length: task2Answer.length 
    });

    const examinerPrompt = `TASK 1 DETAILS:
Prompt: ${task1Data?.title || 'Task 1'}
Instructions: ${task1Data?.instructions || ''}
${task1Data?.imageContext ? `Image Description: ${task1Data.imageContext}` : ''}
${task1Data?.imageUrl ? `Visual Data Present: Yes` : 'Visual Data Present: No'}

STUDENT TASK 1 RESPONSE:
"${task1Answer}"

TASK 2 DETAILS:
Prompt: ${task2Data?.title || 'Task 2'}
Instructions: ${task2Data?.instructions || ''}

STUDENT TASK 2 RESPONSE:
"${task2Answer}"

IMPORTANT: You must return ONLY a valid JSON object. Do not include any text before or after the JSON.`;



    const messages = [
      {
        role: 'system',
        content: `You are a senior IELTS Writing examiner. You must return ONLY a valid JSON object with no additional text.

JSON SCHEMA (MANDATORY):
{
  "task1": {
    "criteria": {
      "task_achievement": { "band": 7.5, "justification": "Clear explanation here..." },
      "coherence_and_cohesion": { "band": 8.0, "justification": "Clear explanation here..." },
      "lexical_resource": { "band": 7.0, "justification": "Clear explanation here..." },
      "grammatical_range_and_accuracy": { "band": 7.5, "justification": "Clear explanation here..." }
    },
    "overall_band": 7.5,
    "overall_reason": "Averaged from criteria scores",
    "feedback": {
      "strengths": ["Strength 1", "Strength 2", "Strength 3"],
      "improvements": ["Improvement 1", "Improvement 2", "Improvement 3"]
    },
    "feedback_markdown": "Detailed Task 1 feedback here..."
  },
  "task2": {
    "criteria": {
      "task_response": { "band": 8.0, "justification": "Clear explanation here..." },
      "coherence_and_cohesion": { "band": 7.5, "justification": "Clear explanation here..." },
      "lexical_resource": { "band": 7.0, "justification": "Clear explanation here..." },
      "grammatical_range_and_accuracy": { "band": 7.5, "justification": "Clear explanation here..." }
    },
    "overall_band": 7.5,
    "overall_reason": "Averaged from criteria scores",
    "feedback": {
      "strengths": ["Strength 1", "Strength 2", "Strength 3"],
      "improvements": ["Improvement 1", "Improvement 2", "Improvement 3"]
    },
    "feedback_markdown": "Detailed Task 2 feedback here..."
  },
  "overall": {
    "band": 7.5,
    "calculation": "(7.5 * 1 + 7.5 * 2) / 3 = 7.5",
    "feedback_markdown": "Overall assessment here..."
  },
  "full_report_markdown": "Complete report here..."
}

CRITICAL RULES:
- Return ONLY the JSON object, no other text
- Bands must be whole or half numbers: 0, 0.5, 1.0, ..., 9.0
- Calculate overall_band by averaging criteria and rounding to nearest 0.5
- Calculate overall.band using: (Task1_overall*1 + Task2_overall*2) / 3, then round to 0.5
- Provide exactly 3 strengths and 3 improvements for each task
- Be accurate and fair in your assessment`
      },
      {
        role: 'user',
        content: examinerPrompt
      }
    ];

    let data;
    let apiUsed = 'deepseek';
    
    // Try DeepSeek first, then OpenAI as backup
    if (deepSeekApiKey) {
      console.log('🔄 Using DeepSeek API as primary...');
      try {
        data = await callDeepSeek(messages, deepSeekApiKey);
        console.log('✅ DeepSeek API call completed successfully');
      } catch (deepSeekError) {
        console.error('❌ DeepSeek API failed:', deepSeekError.message);
        
        if (openAIApiKey) {
          console.log('🔄 Falling back to OpenAI API...');
          try {
            data = await callOpenAI(messages, openAIApiKey);
            apiUsed = 'openai';
            console.log('✅ OpenAI fallback succeeded');
          } catch (openAIError) {
            console.error('❌ OpenAI fallback also failed:', openAIError.message);
            throw new Error(`Both APIs failed - DeepSeek: ${deepSeekError.message}, OpenAI: ${openAIError.message}`);
          }
        } else {
          throw new Error(`DeepSeek failed and no OpenAI key available: ${deepSeekError.message}`);
        }
      }
    } else if (openAIApiKey) {
      console.log('🔄 Using OpenAI API (DeepSeek not available)...');
      try {
        data = await callOpenAI(messages, openAIApiKey);
        apiUsed = 'openai';
        console.log('✅ OpenAI API call completed successfully');
      } catch (openAIError) {
        console.error('❌ OpenAI API failed:', openAIError.message);
        throw new Error(`OpenAI API failed: ${openAIError.message}`);
      }
    } else {
      throw new Error('No API keys available');
    }

    console.log(`✅ AI Examiner response generated using ${apiUsed.toUpperCase()}`);

    let content = data.choices?.[0]?.message?.content ?? '';
    console.log('🔍 Raw API response content length:', content.length);
    
    // Check if content is empty or too short
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
      console.log('⚠️ Failed to parse JSON directly, trying multiple extraction strategies...');
      
      // Advanced JSON extraction and cleaning
      let jsonMatch = null;
      
      // Enhanced cleaning function with more robust patterns
      const cleanJson = (str: string) => {
        let cleaned = str
          .replace(/^\s*```json\s*/i, '')  // Remove starting ```json
          .replace(/^\s*```\s*/i, '')      // Remove starting ```
          .replace(/\s*```\s*$/i, '')      // Remove ending ```
          .replace(/^\s*[\s\S]*?(\{)/, '$1')  // Remove everything before first {
          .replace(/(\})\s*[\s\S]*?$/s, '$1')  // Remove everything after last }
          .replace(/,(\s*[}\]])/g, '$1')   // Remove trailing commas
          .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":') // Quote unquoted keys
          .replace(/:\s*'([^']*)'/g, ': "$1"')  // Replace single quotes with double
          .replace(/\t/g, ' ')             // Replace tabs with spaces
          .replace(/\r\n/g, '\n')          // Normalize line endings
          .replace(/\n\s*/g, ' ')          // Replace newlines with space
          .replace(/\s+/g, ' ')            // Normalize whitespace
          .replace(/([{}])\s+/g, '$1')     // Remove spaces after braces
          .replace(/\s+([{}])/g, '$1')     // Remove spaces before braces
          .trim();
        
        // Try to fix common JSON issues
        try {
          // Attempt to balance braces
          const openBraces = (cleaned.match(/\{/g) || []).length;
          const closeBraces = (cleaned.match(/\}/g) || []).length;
          if (openBraces > closeBraces) {
            cleaned += '}';
          }
        } catch (e) {
          console.log('❌ Error in brace balancing:', e.message);
        }
        
        return cleaned;
      };

      // Enhanced extraction patterns - order matters (most specific first)
      const patterns = [
        // 1. Complete JSON structure with all required fields
        /\{[\s\S]*?"task1"[\s\S]*?"criteria"[\s\S]*?"task2"[\s\S]*?"criteria"[\s\S]*?"overall"[\s\S]*?\}/i,
        
        // 2. Standard code block formats
        /```json\s*(\{[\s\S]*?\})\s*```/gi,
        /```\s*(\{[\s\S]*?\})\s*```/gi,
        
        // 3. Look for largest complete JSON object
        /(\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\})/g,
        
        // 4. Capture from first { to last }
        /(\{[\s\S]*\})/,
        
        // 5. Any object containing task1 and overall
        /\{[\s\S]*?"task1"[\s\S]*?"overall"[\s\S]*?\}/i,
        
        // 6. Any object containing task2 and overall  
        /\{[\s\S]*?"task2"[\s\S]*?"overall"[\s\S]*?\}/i,
        
        // 7. Any large object (500+ chars)
        /\{[\s\S]{500,}\}/i,
        
        // 8. Any object with criteria
        /\{[\s\S]*?"criteria"[\s\S]*?\}/i,
        
        // 9. Fallback - any JSON-like structure
        /\{[\s\S]*?\}/
      ];
      
      console.log('🔄 Trying', patterns.length, 'extraction patterns...');
      
      for (let i = 0; i < patterns.length; i++) {
        const pattern = patterns[i];
        const matches = content.match(pattern);
        
        if (matches) {
          for (const match of Array.isArray(matches) ? matches : [matches]) {
            const jsonStr = match[1] || match[0] || match;
            console.log(`🔍 Pattern ${i + 1} found potential JSON (length: ${jsonStr.length})`);
            
            try {
              const cleanedJson = cleanJson(jsonStr);
              console.log(`🧹 Cleaned JSON first 200 chars:`, cleanedJson.substring(0, 200));
              
              structured = JSON.parse(cleanedJson);
              console.log(`✅ Successfully parsed JSON using pattern ${i + 1}`);
              jsonMatch = true;
              break;
            } catch (e) {
              console.log(`❌ Pattern ${i + 1} failed:`, e.message.substring(0, 100));
            }
          }
          
          if (jsonMatch) break;
        }
      }
      
      if (!jsonMatch) {
        console.error('❌ All JSON extraction strategies failed');
        console.log('🔧 Creating comprehensive fallback structured data...');
          
        // Create comprehensive fallback structured data when JSON parsing completely fails
        const fallbackBand = 6.5; // More conservative fallback
        structured = {
          task1: {
            criteria: {
              task_achievement: { 
                band: fallbackBand, 
                justification: "Technical processing issue prevented detailed assessment. This is a fallback score." 
              },
              coherence_and_cohesion: { 
                band: fallbackBand, 
                justification: "Technical processing issue prevented detailed assessment. This is a fallback score." 
              },
              lexical_resource: { 
                band: fallbackBand, 
                justification: "Technical processing issue prevented detailed assessment. This is a fallback score." 
              },
              grammatical_range_and_accuracy: { 
                band: fallbackBand, 
                justification: "Technical processing issue prevented detailed assessment. This is a fallback score." 
              }
            },
            overall_band: fallbackBand,
            overall_reason: "Fallback assessment - technical processing issue occurred",
            feedback: {
              strengths: [
                "Response was submitted successfully",
                "Writing attempt demonstrates engagement with the task",
                "Content was provided for both required elements"
              ],
              improvements: [
                "Technical issue prevented detailed feedback - please retake the test",
                "For accurate assessment, we recommend trying the test again",
                "Contact support if this issue continues to occur"
              ]
            },
            feedback_markdown: `### Technical Processing Issue

Due to a technical processing issue, we were unable to provide detailed feedback for this Task 1 response. 

**What happened:** The AI assessment system encountered a parsing error while analyzing your response.

**Fallback score:** ${fallbackBand} (This is not your actual performance level)

**Next steps:** Please retake the test for an accurate assessment of your writing skills.`
          },
          task2: {
            criteria: {
              task_response: { 
                band: fallbackBand, 
                justification: "Technical processing issue prevented detailed assessment. This is a fallback score." 
              },
              coherence_and_cohesion: { 
                band: fallbackBand, 
                justification: "Technical processing issue prevented detailed assessment. This is a fallback score." 
              },
              lexical_resource: { 
                band: fallbackBand, 
                justification: "Technical processing issue prevented detailed assessment. This is a fallback score." 
              },
              grammatical_range_and_accuracy: { 
                band: fallbackBand, 
                justification: "Technical processing issue prevented detailed assessment. This is a fallback score." 
              }
            },
            overall_band: fallbackBand,
            overall_reason: "Fallback assessment - technical processing issue occurred",
            feedback: {
              strengths: [
                "Response was submitted successfully",
                "Writing attempt demonstrates engagement with the task", 
                "Content was provided for both required elements"
              ],
              improvements: [
                "Technical issue prevented detailed feedback - please retake the test",
                "For accurate assessment, we recommend trying the test again", 
                "Contact support if this issue continues to occur"
              ]
            },
            feedback_markdown: `### Technical Processing Issue

Due to a technical processing issue, we were unable to provide detailed feedback for this Task 2 response.

**What happened:** The AI assessment system encountered a parsing error while analyzing your response.

**Fallback score:** ${fallbackBand} (This is not your actual performance level)

**Next steps:** Please retake the test for an accurate assessment of your writing skills.`
          },
          overall: {
            band: fallbackBand,
            calculation: `(${fallbackBand} * 1 + ${fallbackBand} * 2) / 3 = ${fallbackBand}`,
            feedback_markdown: `### Technical Processing Issue - Overall Assessment

**Overall Band Score:** ${fallbackBand} (Fallback Score)

Due to technical processing issues, we were unable to provide a detailed analysis of your IELTS Writing performance. This score is a fallback value and does not reflect your actual writing ability.

**What this means:**
- The AI assessment system encountered errors while processing your responses
- Your actual performance may be higher or lower than this fallback score  
- This technical issue is temporary and should not reflect on your writing skills

**Recommended actions:**
1. Retake the IELTS Writing test for an accurate assessment
2. Contact support if this issue persists
3. Your responses have been saved and can be reviewed manually if needed

We apologize for the inconvenience and appreciate your patience.`
          },
          full_report_markdown: `# IELTS Writing Assessment - Technical Issue Report

## Summary
A technical processing error prevented the completion of your IELTS Writing assessment. This report contains fallback scores that do not reflect your actual writing performance.

## Technical Details
- **Issue Type:** JSON parsing error in AI assessment system
- **Fallback Score Applied:** ${fallbackBand} for all criteria
- **Raw AI Response Length:** ${content.length} characters
- **Processing Status:** Failed with fallback data generated

## Next Steps
Please retake the IELTS Writing test to receive an accurate assessment of your writing skills. If you continue to experience technical issues, please contact our support team.

---

*This is an automated technical report. The scores shown are not indicative of actual writing performance.*`
        };
        console.log('✅ Comprehensive fallback data created with detailed explanations');
      }
    }

    const clampBands = (obj: any) => {
      if (!obj || typeof obj !== 'object') return;
      for (const k in obj) {
        const v = (obj as any)[k];
        if (k === 'band' && typeof v === 'number') (obj as any)[k] = Math.min(9, Math.max(0, v));
        else if (typeof v === 'object') clampBands(v);
      }
    };
    if (structured) clampBands(structured);
    const feedback = structured?.full_report_markdown || content;

    return new Response(JSON.stringify({ 
      success: true, 
      feedback,
      structured,
      apiUsed,
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