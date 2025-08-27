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
        content: `Your Role: You are an expert IELTS writing rewriter. Your goal is to transform a student's essay into a high-scoring, Band 8+ model while providing comprehensive analysis data.

Your Three Critical Tasks:

1. Fact-Check Against Context: Compare all data (percentages, years, numbers) against the image_context_description and correct any errors.

2. Aggressively Improve Language: Replace common words with sophisticated academic synonyms and restructure sentences for complexity.

3. Provide Complete Analysis Data: Return both sentence-level comparisons AND word-level span data for highlighting.

Required Output Format - You MUST return a JSON object with ALL these fields:

{
  "sentence_comparisons": [
    {
      "original": "The graph shows population data.",
      "improved": "The chart illustrates comprehensive demographic trends.",
      "explanation": "Enhanced vocabulary by replacing 'shows' with 'illustrates' and added 'comprehensive demographic trends' for precision."
    }
  ],
  "originalSpans": [
    { "text": "The graph ", "status": "neutral" },
    { "text": "shows", "status": "suggestion" },
    { "text": " population data.", "status": "neutral" }
  ],
  "correctedSpans": [
    { "text": "The chart ", "status": "neutral" },
    { "text": "illustrates comprehensive demographic", "status": "enhancement" },
    { "text": " trends.", "status": "neutral" }
  ],
  "improvementSuggestions": [
    {
      "original": "shows",
      "suggested": "illustrates",
      "explanation": "More sophisticated academic vocabulary"
    }
  ]
}

CRITICAL RULES:
- Return ONLY valid JSON with ALL four required fields
- originalSpans: Mark words that need improvement with "suggestion" status
- correctedSpans: Mark improvements with "enhancement" status
- Include "neutral" status for unchanged text
- Ensure spans cover the complete text without gaps
- Every sentence must be in sentence_comparisons
- Correct factual errors using image context

The frontend expects all four fields to display improvements properly.`
      },
      {
        role: 'user',
        content: examinerPrompt
      }
    ];

    // Use Gemini only
    console.log('🔄 Using Gemini API...');
    const fullPrompt = `${messages[0].content}\n\n${messages[1].content}`;
    const aiResponse = await callGemini(fullPrompt, geminiApiKey);
    const modelUsed = 'gemini-2.0-flash-exp';
    console.log('✅ Gemini API succeeded');

    let content = aiResponse.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
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

    // Validate and process the AI response for frontend compatibility
    if (structured && structured.sentence_comparisons) {
      console.log('🔍 Processing AI response for frontend compatibility...');
      
      // Ensure all required fields exist, generate missing ones if needed
      if (!structured.originalSpans || !structured.correctedSpans || !structured.improvementSuggestions) {
        console.log('⚠️ Missing span data, generating from sentence comparisons...');
        
        // Generate span data from sentence comparisons
        const originalSpans = [];
        const correctedSpans = [];
        const improvementSuggestions = [];
        
        let originalText = '';
        let correctedText = '';
        
        for (const comparison of structured.sentence_comparisons) {
          if (comparison.original && comparison.improved) {
            originalText += (originalText ? ' ' : '') + comparison.original;
            correctedText += (correctedText ? ' ' : '') + comparison.improved;
            
            // Create improvement suggestions from explanations
            if (comparison.explanation) {
              improvementSuggestions.push({
                original: comparison.original,
                suggested: comparison.improved,
                explanation: comparison.explanation
              });
            }
          }
        }
        
        // Generate spans with basic word-level analysis
        if (originalText && correctedText) {
          const originalWords = originalText.split(' ');
          const correctedWords = correctedText.split(' ');
          
          // Simple heuristic: mark words that are different as suggestions/enhancements
          originalWords.forEach((word, index) => {
            const isChanged = correctedWords[index] && word !== correctedWords[index];
            originalSpans.push({
              text: word + (index < originalWords.length - 1 ? ' ' : ''),
              status: isChanged ? 'suggestion' : 'neutral'
            });
          });
          
          correctedWords.forEach((word, index) => {
            const isChanged = originalWords[index] && word !== originalWords[index];
            correctedSpans.push({
              text: word + (index < correctedWords.length - 1 ? ' ' : ''),
              status: isChanged ? 'enhancement' : 'neutral'
            });
          });
        }
        
        // Add generated data to structured response
        structured.originalSpans = originalSpans.length > 0 ? originalSpans : [{ text: originalText || 'No text available', status: 'neutral' }];
        structured.correctedSpans = correctedSpans.length > 0 ? correctedSpans : [{ text: correctedText || 'No text available', status: 'neutral' }];
        structured.improvementSuggestions = improvementSuggestions;
        
        console.log('✅ Generated span data from sentence comparisons');
      }
      
      // Validate that we have meaningful data
      const hasValidData = structured.sentence_comparisons.length > 0 || 
                          (structured.originalSpans && structured.originalSpans.length > 0);
      
      if (!hasValidData) {
        console.log('⚠️ AI response lacks meaningful improvement data, adding fallback...');
        structured.sentence_comparisons = structured.sentence_comparisons || [];
        structured.originalSpans = structured.originalSpans || [{ text: 'Analysis unavailable', status: 'neutral' }];
        structured.correctedSpans = structured.correctedSpans || [{ text: 'Analysis unavailable', status: 'neutral' }];
        structured.improvementSuggestions = structured.improvementSuggestions || [];
      }
      
      console.log('✅ AI response validated and processed for frontend compatibility');
    } else {
      console.log('⚠️ AI response missing sentence_comparisons, using fallback structure...');
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