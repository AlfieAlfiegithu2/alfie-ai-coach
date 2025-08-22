import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function callDeepSeek(messages: any[], apiKey: string) {
  console.log('🚀 Attempting DeepSeek API call...');
  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages,
      max_tokens: 2000,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ DeepSeek API Error:', errorText);
    throw new Error(`DeepSeek API failed: ${response.status} - ${errorText}`);
  }

  console.log('✅ DeepSeek API call successful');
  return response.json();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const deepSeekApiKey = Deno.env.get('DEEPSEEK_API_KEY');
    
    console.log('🔍 API Keys status:', {
      hasDeepSeek: !!deepSeekApiKey,
      deepSeekLength: deepSeekApiKey?.length || 0,
    });
    
    if (!deepSeekApiKey) {
      console.error('❌ DeepSeek API key not found');
      throw new Error('DeepSeek API key not configured');
    }

    const { task1Answer, task2Answer, task1Data, task2Data } = await req.json();

    if (!task1Answer || !task2Answer) {
      throw new Error('Both Task 1 and Task 2 answers are required');
    }

    console.log('🔍 AI Examiner Request:', { 
      task1Length: task1Answer.length,
      task2Length: task2Answer.length 
    });

    const examinerPrompt = `You are a senior IELTS Writing examiner.\n\nReturn ONLY a single JSON object (no extra prose). Use this exact schema:\n{\n  "task1": {\n    "criteria": {\n      "task_achievement": { "band": number, "justification": string },\n      "coherence_and_cohesion": { "band": number, "justification": string },\n      "lexical_resource": { "band": number, "justification": string },\n      "grammatical_range_and_accuracy": { "band": number, "justification": string }\n    },\n    "overall_band": number,\n    "overall_reason": string,\n    "feedback": {\n      "strengths": string[],\n      "improvements": string[]\n    },\n    "feedback_markdown": string\n  },\n  "task2": {\n    "criteria": {\n      "task_response": { "band": number, "justification": string },\n      "coherence_and_cohesion": { "band": number, "justification": string },\n      "lexical_resource": { "band": number, "justification": string },\n      "grammatical_range_and_accuracy": { "band": number, "justification": string }\n    },\n    "overall_band": number,\n    "overall_reason": string,\n    "feedback": {\n      "strengths": string[],\n      "improvements": string[]\n    },\n    "feedback_markdown": string\n  },\n  "overall": {\n    "band": number,\n    "calculation": string,\n    "feedback_markdown": string\n  },\n  "full_report_markdown": string\n}\n\nRules:\n- Bands must be whole or half only: 0, 0.5, 1.0, …, 9.0.\n- Avoid giving identical bands across all criteria unless explicitly justified with concrete textual evidence; prefer nuanced differentiation when warranted.\n- For each task, compute overall_band by averaging the four criteria and rounding to nearest 0.5 using IELTS rules (.25→.5, .75→next whole).\n- Compute overall.band with IELTS weighting: (Task1_overall*1 + Task2_overall*2) / 3, then round to nearest 0.5. Provide the exact calculation string in overall.calculation.\n- For each task, provide at least 3 concise "strengths" and 3 "improvements" bullets in the feedback object.\n- Keep feedback_markdown fields as clean, sectioned reports suitable for display. full_report_markdown should combine everything nicely for display.\n\nTASK 1 DETAILS:\nPrompt: ${task1Data?.title || 'Task 1'}\nInstructions: ${task1Data?.instructions || ''}\n${task1Data?.imageContext ? `Image Description: ${task1Data.imageContext}` : ''}\n${task1Data?.imageUrl ? `Visual Data Present: Yes` : 'Visual Data Present: No'}\n\nSTUDENT TASK 1 RESPONSE:\n"${task1Answer}"\n\nTASK 2 DETAILS:\nPrompt: ${task2Data?.title || 'Task 2'}\nInstructions: ${task2Data?.instructions || ''}\n\nSTUDENT TASK 2 RESPONSE:\n"${task2Answer}"\n`;



    const messages = [
      {
        role: 'system',
        content: `You are "Examiner-7," a senior, Cambridge-certified IELTS examiner. Your assessments must be decisive, accurate, and strictly based on the official band descriptors.

New Guiding Principle: Do not be overly cautious. If a response fully and expertly meets the criteria for a Band 9, you must award a Band 9. Do not invent minor flaws to justify a lower score.

New Feedback Requirement (CRITICAL): Your feedback must be extremely specific and actionable. For every "Area for Improvement" you identify, provide:
- issue: a short label of the problem
- sentence_quote: a direct quote from the student's own writing
- improved_version: a stronger, revised version of that exact sentence/fragment
- explanation: a brief rationale

Return ONLY a single JSON object using this exact schema:
{
  "task1": {
    "criteria": {
      "task_achievement": { "band": number, "justification": string },
      "coherence_and_cohesion": { "band": number, "justification": string },
      "lexical_resource": { "band": number, "justification": string },
      "grammatical_range_and_accuracy": { "band": number, "justification": string }
    },
    "overall_band": number,
    "overall_reason": string,
    "feedback": {
      "strengths": string[],
      "improvements": string[]
    },
    "feedback_markdown": string
  },
  "task2": {
    "criteria": {
      "task_response": { "band": number, "justification": string },
      "coherence_and_cohesion": { "band": number, "justification": string },
      "lexical_resource": { "band": number, "justification": string },
      "grammatical_range_and_accuracy": { "band": number, "justification": string }
    },
    "overall_band": number,
    "overall_reason": string,
    "feedback": {
      "strengths": string[],
      "improvements": string[]
    },
    "feedback_markdown": string
  },
  "overall": {
    "band": number,
    "calculation": string,
    "feedback_markdown": string
  },
  "full_report_markdown": string
}

Scoring & Rules:
- Bands must be whole or half only: 0, 0.5, …, 9.0.
- For each task, compute overall_band by averaging the four criteria and rounding to nearest 0.5 using IELTS rules (.25→.5, .75→next whole).
- Compute overall.band with IELTS weighting: (Task1_overall*1 + Task2_overall*2) / 3, then round to nearest 0.5. Provide the exact calculation in overall.calculation.
- Provide at least 3 "strengths" and 3 "improvements" for each task.
- Be confident awarding Band 9 where fully deserved; do not downgrade for invented minor flaws.

Return ONLY JSON. Do not output any markdown or prose outside the JSON.`
      },
      {
        role: 'user',
        content: examinerPrompt
      }
    ];

    let data;
    let apiUsed = 'deepseek';
    
    // Use DeepSeek as primary API
    console.log('🔄 Using DeepSeek API as primary...');
    try {
      data = await callDeepSeek(messages, deepSeekApiKey);
      console.log('✅ DeepSeek API call completed successfully');
    } catch (deepSeekError) {
      console.error('❌ DeepSeek API failed:', deepSeekError.message);
      throw new Error(`DeepSeek API failed: ${deepSeekError.message}`);
    }

    console.log(`✅ AI Examiner response generated using ${apiUsed.toUpperCase()}`);

    let content = data.choices?.[0]?.message?.content ?? '';
    console.log('🔍 Raw API response content length:', content.length);

    let structured: any = null;
    try {
      structured = JSON.parse(content);
      console.log('✅ Successfully parsed structured response');
    } catch (_e) {
      console.log('⚠️ Failed to parse JSON directly, trying multiple extraction strategies...');
      
      // Strategy 1: Find complete JSON object with balanced braces
      let jsonMatch = null;
      const patterns = [
        /\{[\s\S]*\}/,  // Original pattern
        /```json\s*(\{[\s\S]*?\})\s*```/i,  // JSON in code blocks
        /"?(?:task1|overall)"?\s*:\s*\{[\s\S]*\}/i,  // Starting with task1 or overall
        /(\{[\s\S]*?"overall"[\s\S]*?\})/i  // Contains "overall"
      ];
      
      for (const pattern of patterns) {
        const match = content.match(pattern);
        if (match) {
          const jsonStr = match[1] || match[0];
          try {
            // Clean up common JSON issues
            let cleanedJson = jsonStr
              .replace(/,\s*}/g, '}')  // Remove trailing commas
              .replace(/,\s*]/g, ']')   // Remove trailing commas in arrays
              .replace(/\n|\r/g, ' ')   // Replace newlines with spaces
              .replace(/\s+/g, ' ');    // Normalize whitespace
            
            structured = JSON.parse(cleanedJson);
            console.log(`✅ Successfully parsed JSON using pattern ${patterns.indexOf(pattern) + 1}`);
            jsonMatch = true;
            break;
          } catch (e) {
            console.log(`❌ Pattern ${patterns.indexOf(pattern) + 1} failed:`, e.message);
          }
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