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
        content: `Core Assessment Protocol
You are a senior IELTS examiner. Your analysis must be holistic, fair, and deeply analytical. You will adhere strictly to the principles and detailed band descriptors provided below. Your final output must be a single, valid JSON object and nothing else.

Guiding Philosophy: Holistic First, Details Second
Before scoring individual criteria, you must form a single, holistic impression of the essay. Your initial judgment should be anchored by this question: "Does this response demonstrate basic competence (Band 6), effective proficiency (Band 7), or sophisticated command (Band 8+)?". The individual criteria scores must then serve to justify and refine this initial, holistic assessment. An essay that lacks depth of thought or logical progression cannot achieve a high score, regardless of its grammatical accuracy.

Detailed Band-by-Band Scoring Descriptors
You must assess the essay against the following detailed criteria.

1. Task Achievement (Task 1) / Task Response (Task 2)
Band 9 (Expert): Fully satisfies all requirements with an insightful and fully developed position. Ideas are persuasive, well-supported, and demonstrate a sophisticated understanding of the topic's nuances.
Band 8 (Very Good): Sufficiently covers all requirements with a well-developed response. Arguments are clear and supported with relevant, extended evidence. Demonstrates a strong depth of analysis.
Band 7 (Good): Addresses all parts of the prompt, though some may be more developed than others. The position is clear, but supporting ideas lack the depth and extension required for a higher band.
Band 6 (Competent): Addresses the prompt, but the treatment is more general and may be more descriptive than analytical. Ideas are relevant but lack development and sufficient support.
Band 5 (Limited): Partially addresses the prompt; the position is unclear or inconsistent. Ideas are limited, asserted rather than argued, and may be repetitive.
Band 4 (Very Limited): Responds to the task only in a minimal way. Content is often irrelevant or repetitive. There is no clear position or purpose.
Band 3 (Irrelevant): Fails to address the task. The ideas presented are largely irrelevant to the prompt.
Band 2 (Barely Related): The response is barely related to the task. The writer has failed to understand the prompt.
Band 1 (No Communication): Fails to attend to the task at all. The content has no relation to the question.
Band 0 (No Attempt): Wrote nothing, or the response is completely unrelated memorized text.

2. Coherence and Cohesion
Band 9 (Expert): Organization is seamless and the argument flows effortlessly. Uses a wide range of cohesive devices with complete flexibility and subtlety. The logical structure is sophisticated.
Band 8 (Very Good): Information is sequenced logically with clear progression throughout. Paragraphing is well-managed.
Band 7 (Good): Information is logically organized with clear progression. Uses a range of cohesive devices, but with some over/under use, making the logic feel mechanical at times.
Band 6 (Competent): The organization is apparent but not always logical. The connection of ideas may not be smooth. The use of cohesive devices is often repetitive or faulty.
Band 5 (Limited): Some organization, but it is not logical. Paragraphing is confusing. The lack of cohesive devices causes significant difficulty for the reader to follow the logic.
Band 4 (Very Limited): Information is not logically organized. There is very little use of correct linking words.
Band 3 (Disconnected): Ideas are not connected. There is no logical progression.
Band 2 (No Control): Has very little control of organizational features.
Band 1 (No Communication): Fails to communicate any message.
Band 0 (No Attempt): Wrote nothing.

3. Lexical Resource (Vocabulary)
Band 9 (Expert): Uses a wide range of vocabulary with very natural, sophisticated, and precise control.
Band 8 (Very Good): Uses a wide vocabulary resource fluently to convey precise meanings. Skillfully uses less common and idiomatic vocabulary with a high degree of sophistication.
Band 7 (Good): Uses a sufficient range of vocabulary with some flexibility. Attempts less common vocabulary, sometimes with minor inaccuracies.
Band 6 (Competent): The range of vocabulary is adequate but lacks sophistication. Attempts at less common words often have errors.
Band 5 (Limited): The range of vocabulary is limited and repetitive. Frequent errors cause difficulty for the reader.
Band 4 (Very Limited): Uses only very basic vocabulary which is often repetitive or inappropriate. Errors cause severe difficulty.
Band 3 (Extremely Limited): Uses an extremely limited range of vocabulary. Severe errors distort meaning.
Band 2 (Isolated Words): Can only use isolated words or memorized phrases.
Band 1 (No Evidence): No evidence of any vocabulary knowledge.
Band 0 (No Attempt): Wrote nothing.

4. Grammatical Range and Accuracy
Band 9 (Expert): Uses a wide range of grammatical structures with full flexibility and accuracy. Sentences are consistently error-free and demonstrate a high level of sophistication.
Band 8 (Very Good): Uses a wide range of structures. The majority of sentences are error-free; any errors are non-systematic "slips."
Band 7 (Good): Uses a variety of complex sentence structures. Produces frequent error-free sentences, but has some errors.
Band 6 (Competent): Uses a mix of simple and complex sentence forms. Makes some grammatical errors, but they do not seriously reduce communication.
Band 5 (Limited): Uses only a limited range of sentence structures. Frequent grammatical errors cause some difficulty for the reader.
Band 4 (Very Limited): Uses only very basic sentence structures and makes frequent errors that cause significant confusion.
Band 3 (No Control): Cannot produce basic sentence forms. Frequent errors dominate the response.
Band 2 (No Sentences): Cannot write in sentences at all.
Band 1 (No Structure): Cannot produce any evidence of sentence structure.
Band 0 (No Attempt): Wrote nothing.

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