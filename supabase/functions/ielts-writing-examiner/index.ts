import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function callDeepSeek(messages: any[], apiKey: string, retryCount = 0) {
  console.log(`🚀 Attempting DeepSeek API call (attempt ${retryCount + 1}/2)...`);
  
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
        temperature: 0.1,
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
    return data;
  } catch (error) {
    console.error(`❌ DeepSeek attempt ${retryCount + 1} failed:`, error.message);
    
    if (retryCount < 1) {
      console.log(`🔄 Retrying DeepSeek API call in 500ms...`);
      await new Promise(resolve => setTimeout(resolve, 500));
      return callDeepSeek(messages, apiKey, retryCount + 1);
    }
    
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const deepSeekApiKey = Deno.env.get('DEEPSEEK_API_KEY');
    
    if (!deepSeekApiKey) {
      console.error('❌ No DeepSeek API key found');
      throw new Error('DeepSeek API key is required');
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
      "improvements": ["Improvement 1", "Improvement 2", "Improvement 3"],
      "improvements_detailed": [
        {
          "issue": "Grammar error - incorrect verb tense",
          "sentence_quote": "The graph shows data that were collected last year",
          "improved_version": "The graph shows data that was collected last year",
          "explanation": "Data is singular, so use 'was' not 'were'"
        }
      ]
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
      "improvements": ["Improvement 1", "Improvement 2", "Improvement 3"],
      "improvements_detailed": [
        {
          "issue": "Vocabulary choice - word collocation error",
          "sentence_quote": "People should make research about this topic",
          "improved_version": "People should conduct research on this topic",
          "explanation": "Use 'conduct research' instead of 'make research', and 'on' instead of 'about'"
        }
      ]
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

IMPROVEMENTS_DETAILED REQUIREMENTS:
For both Task 1 and Task 2, provide ALL significant sentence-level improvements that would help students reach higher band scores (typically 2-15 improvements depending on writing quality):
1. "issue": Brief description of the error type (e.g., "Grammar error - subject-verb agreement", "Vocabulary - word choice", "Coherence - unclear pronoun reference")  
2. "sentence_quote": Extract the EXACT problematic sentence or phrase from the student's writing
3. "improved_version": Provide a Band 9-level correction of the same sentence
4. "explanation": Clear explanation of why the change improves the writing (1-2 sentences)

DYNAMIC IMPROVEMENT STRATEGY:
- High-quality writing (Band 7+): Focus on 2-6 sophisticated improvements for precision and naturalness
- Medium-quality writing (Band 5-6): Provide 5-10 improvements covering grammar, vocabulary, and coherence  
- Lower-quality writing (Band 4 and below): Provide 8-15 fundamental corrections prioritizing clarity and accuracy
- Include grammar, vocabulary, coherence, and task-specific issues. Quote student text exactly as written.

JUSTIFICATION REQUIREMENTS (CRITICAL):
Each justification must be detailed and convincing with specific evidence:
1. Quote direct examples from the student's writing as evidence
2. Explain why this specific band was awarded (not higher/lower)
3. Reference band descriptors where relevant
4. Be comprehensive (2-4 sentences minimum)
5. Provide specific examples of strengths or weaknesses
6. Never just state facts - explain the reasoning behind the score

Example good justification: "Band 7.0 - Demonstrates good range of vocabulary with sophisticated items like 'unprecedented technological advancements' and attempts at less common words. However, shows some errors in word choice ('make a research' should be 'conduct research') and occasional awkwardness in phrasing. The vocabulary is generally appropriate for the task but lacks the precision and natural flexibility required for Band 8, while showing more sophistication than typical Band 6 responses."

- Be accurate and fair in your assessment`
      },
      {
        role: 'user',
        content: examinerPrompt
      }
    ];

    // Use DeepSeek only
    console.log('🔄 Using DeepSeek API...');
    const aiResponse = await callDeepSeek(messages, deepSeekApiKey);
    const modelUsed = 'deepseek-chat';
    console.log('✅ DeepSeek API succeeded');

    let content = aiResponse.choices?.[0]?.message?.content ?? '';
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
      console.log('⚠️ Failed to parse JSON directly, attempting extraction...');
      
      // Simple but effective JSON extraction
      let extractedJson = '';
      
      // Step 1: Remove markdown code blocks
      let cleaned = content.trim();
      
      // Remove ```json at start and ``` at end
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.substring(7);
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.substring(3);
      }
      
      if (cleaned.endsWith('```')) {
        cleaned = cleaned.substring(0, cleaned.length - 3);
      }
      
      cleaned = cleaned.trim();
      
      // Step 2: Find the main JSON object
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
          
          // Step 3: Try to fix common JSON issues
          try {
            // Remove any trailing commas
            let fixedJson = extractedJson.replace(/,(\s*[}\]])/g, '$1');
            
            // Try to balance braces if needed
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
      } else {
        console.log('❌ Could not find valid JSON structure in response');
      }
      
      if (!structured) {
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
              ],
              improvements_detailed: []
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
              ],
              improvements_detailed: []
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