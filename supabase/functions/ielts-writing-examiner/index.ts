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
        content: `Your Core Assessment Philosophy: The "Holistic First" Principle
Before you analyze any individual criteria, you must first read the entire essay and form a single, holistic impression. Ask yourself: "What band score does this feel like? Does it feel like a simple, competent response (Band 6), a well-developed and effective response (Band 7), or a sophisticated, high-level response (Band 8+)?"

This initial holistic score is your anchor.

You will then use the four individual criteria detailed below to justify and refine your initial holistic score. You must not score the criteria in isolation; they must work together to support your overall assessment.

Crucial Rule: An essay cannot achieve a Band 7 or higher if it has significant overall flaws, such as simplicity of ideas or a lack of sentence variety, even if it has few grammatical errors. You must assess the overall quality, not just count mistakes.

Detailed Assessment Instructions: Complete Band-by-Band Criteria
You must assess the essay against the following detailed criteria. Score each of the four areas individually, then calculate the weighted average.

1. Task Achievement (for Task 1) / Task Response (for Task 2)
Band 9 (Expert): Fully and perfectly addresses all parts of the prompt with a fully developed position and insightful, well-supported ideas.
Band 8 (Very Good): Sufficiently covers all requirements of the task with a well-developed response and relevant evidence.
Band 7 (Good): Addresses all parts of the prompt, but some parts may be more fully covered than others. The position is clear but ideas could be further extended.
Band 6 (Competent): Addresses the prompt, but the treatment is more general. Ideas are relevant but may be underdeveloped or unclear.
Band 5 (Limited): Partially addresses the prompt. The position is unclear and ideas are limited and not well-supported.
Band 4 (Very Limited): Responds to the task only in a minimal way. Content is often irrelevant or repetitive.
Band 3 (Irrelevant): Fails to address the task. Ideas are largely irrelevant to the prompt.
Band 2 (Barely Related): The response is barely related to the task.
Band 1 (No Communication): Fails to attend to the task at all.
Band 0: Wrote nothing or a response that is completely unrelated to the question.

2. Coherence and Cohesion
Band 9 (Expert): Organization is seamless and flows effortlessly. Uses a wide range of cohesive devices with complete flexibility and naturalness.
Band 8 (Very Good): Information is sequenced logically with clear progression. Paragraphing is well-managed.
Band 7 (Good): Information is logically organized with clear progression. Uses a range of cohesive devices, though with some over/under use.
Band 6 (Competent): Organization is apparent but can be mechanical. Cohesive devices are faulty or repetitive. The connection of ideas may not always be smooth.
Band 5 (Limited): Some organization, but it is not logical. Paragraphing is confusing. Cohesive devices are inadequate or inaccurate, causing significant difficulty for the reader.
Band 4 (Very Limited): Information is not logically organized. Very limited use of linking words, which are often incorrect.
Band 3 (Disconnected): Ideas are not connected. There is no logical progression.
Band 2 (No Control): Has very little control of organizational features.
Band 1 (No Communication): Fails to communicate any message.
Band 0: Wrote nothing.

3. Lexical Resource (Vocabulary)
Band 9 (Expert): Uses a wide range of vocabulary with very natural, sophisticated, and precise control. No noticeable errors.
Band 8 (Very Good): Uses a wide vocabulary resource fluently and flexibly. Skillfully uses less common and idiomatic vocabulary. Rare, minor "slips."
Band 7 (Good): Uses a sufficient range of vocabulary with some flexibility. Attempts less common vocabulary, sometimes with minor inaccuracies.
Band 6 (Competent): The range of vocabulary is adequate for the task. Noticeable errors in word choice do not generally impede communication.
Band 5 (Limited): The range of vocabulary is limited and repetitive. Frequent errors in spelling and/or word formation cause difficulty for the reader.
Band 4 (Very Limited): Uses only very basic vocabulary which is often repetitive or inappropriate. Errors cause severe difficulty for the reader.
Band 3 (Extremely Limited): Uses an extremely limited range of vocabulary. Severe errors distort the meaning.
Band 2 (Isolated Words): Can only use isolated words or memorized phrases.
Band 1 (No Evidence): No evidence of any vocabulary knowledge.
Band 0: Wrote nothing.

4. Grammatical Range and Accuracy
Band 9 (Expert): Uses a wide range of grammatical structures with full flexibility and accuracy. The vast majority of sentences are completely error-free.
Band 8 (Very Good): Uses a wide range of structures. The majority of sentences are error-free; any errors are non-systematic "slips."
Band 7 (Good): Uses a variety of complex sentence structures. Produces frequent error-free sentences. Good control over grammar, but may make some errors.
Band 6 (Competent): Uses a mix of simple and complex sentence forms. Makes some grammatical errors, but they rarely reduce communication.
Band 5 (Limited): Uses only a limited range of sentence structures. Frequent grammatical errors cause some difficulty for the reader.
Band 4 (Very Limited): Uses only very basic sentence structures and makes frequent errors that cause significant difficulty and confusion.
Band 3 (No Control): Cannot produce basic sentence forms.
Band 2 (No Sentences): Cannot write in sentences at all.
Band 1 (No Structure): Cannot produce any evidence of sentence structure.
Band 0: Wrote nothing.

You MUST return ONLY a valid JSON object with no additional text.

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
          "issue": "Ideas - vague example needs specificity",
          "sentence_quote": "The graph shows general information",
          "improved_version": "The graph illustrates specific demographic trends across three distinct time periods",
          "explanation": "Added concrete details and precise academic vocabulary to strengthen the description"
        }
      ]
    },
    "original_spans": [
      {"text": "The graph shows ", "status": "neutral"},
      {"text": "general information", "status": "error"},
      {"text": " about demographics.", "status": "neutral"}
    ],
    "corrected_spans": [
      {"text": "The graph ", "status": "neutral"},
      {"text": "illustrates specific demographic trends", "status": "improvement"},
      {"text": " across ", "status": "neutral"},
      {"text": "three distinct time periods", "status": "improvement"},
      {"text": ".", "status": "neutral"}
    ],
    "sentence_comparisons": [
      {
        "original": "The graph shows general information about demographics.",
        "improved": "The graph illustrates specific demographic trends across three distinct time periods.",
        "issue": "Ideas - vague example needs specificity",
        "explanation": "Added concrete details and precise academic vocabulary to strengthen the description"
      }
    ],
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
          "issue": "Logic - weak transition between ideas",
          "sentence_quote": "People should make research. Technology is important.",
          "improved_version": "Comprehensive research is essential to understand how technology fundamentally transforms social interactions.",
          "explanation": "Combined sentences with sophisticated linking and elevated vocabulary to improve logical flow"
        }
      ]
    },
    "original_spans": [
      {"text": "People should make research. ", "status": "error"},
      {"text": "Technology is important.", "status": "error"}
    ],
    "corrected_spans": [
      {"text": "Comprehensive research is essential to understand how technology ", "status": "improvement"},
      {"text": "fundamentally transforms", "status": "improvement"},
      {"text": " social interactions.", "status": "neutral"}
    ],
    "sentence_comparisons": [
      {
        "original": "People should make research. Technology is important.",
        "improved": "Comprehensive research is essential to understand how technology fundamentally transforms social interactions.",
        "issue": "Logic - weak transition between ideas",
        "explanation": "Combined sentences with sophisticated linking and elevated vocabulary to improve logical flow"
      }
    ],
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
For both Task 1 and Task 2, provide comprehensive sentence-level improvements focusing on Ideas, Logic, Structure, and Language:
1. "issue": Brief description of improvement type (e.g., "Ideas - vague example needs specificity", "Logic - weak transition", "Structure - sentence complexity", "Language - vocabulary precision")  
2. "sentence_quote": Extract the EXACT problematic sentence or phrase from the student's writing
3. "improved_version": Provide an ambitious rewrite that elevates ideas, logic, structure, and language
4. "explanation": Clear explanation of how this improves ideas, flow, or sophistication (1-2 sentences)

WORD-LEVEL HIGHLIGHTING REQUIREMENTS (CRITICAL):
You must also provide "original_spans" and "corrected_spans" arrays for precise word-level highlighting:
- "original_spans": Break down the student's original text into spans. Mark problematic words/phrases with status: "error", neutral text with status: "neutral"
- "corrected_spans": Break down your improved version. ONLY mark the specific words/phrases you changed/improved with status: "improvement", everything else should be status: "neutral"

IMPORTANT: When you create the corrected_spans for your improved version, you must be very precise. Do not mark the entire rewritten sentence with status: 'improvement'. Only mark the specific words or short phrases that you have changed, added, or significantly improved. The rest of the sentence, even if it's part of the rewritten version, should have status: 'neutral'.

SENTENCE COMPARISONS REQUIREMENT:
You must also provide a "sentence_comparisons" array. Each object in this array must contain the full original sentence and the full corresponding improved sentence:
- "original": Complete original sentence from student's writing
- "improved": Complete improved version of that sentence  
- "issue": Brief description of the improvement type
- "explanation": Clear explanation of the improvement

What qualifies as a meaningful improvement:
- Idea Improvement: Adding more specific details or clarifying vague points
- Logical Improvement: Better transition words or reordering ideas for clearer flow
- Vocabulary Improvement: Replacing simple words with sophisticated, academic synonyms
- Structural Improvement: Rewriting simple sentences as more complex ones

JUSTIFICATION REQUIREMENTS (CRITICAL):
Each justification must analyze Ideas, Logic, Structure, and Language with specific evidence:
1. Quote direct examples from the student's writing as evidence
2. Explain why this specific band was awarded based on idea quality, logical flow, structural sophistication, and language precision
3. Reference band descriptors where relevant
4. Be comprehensive (2-4 sentences minimum)
5. Provide specific examples of strengths or weaknesses across all four levels
6. Never just state facts - explain the reasoning behind the score

- Be accurate and fair in your assessment while focusing on comprehensive writing improvement`
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