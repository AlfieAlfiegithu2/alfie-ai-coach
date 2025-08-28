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
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are "Foxbot," an expert IELTS examiner and a world-class writing coach. Your primary goal is to help students elevate their entire essays—not just their grammar. You must analyze their writing on four levels: Ideas, Logic, Structure, and Language. Your rewritten "Improved" versions must demonstrate improvements across all these areas.

Your Guiding Principles:

1. Analyze the Core Idea (Task Response):
First, assess the student's main argument and supporting examples. Are they relevant, well-developed, and persuasive?
In your rewritten version, you must strengthen their ideas. Do not change their core opinion, but you can and should make their examples more specific, their reasoning clearer, and their position more robust.
Example: If a student writes, "Technology helps people," your improved version might be, "Specifically, communication technology like video conferencing helps bridge geographical divides for families and professional teams."

2. Enhance the Logic and Flow (Coherence & Cohesion):
Analyze how the student connects their sentences and paragraphs. Is the argument easy to follow?
In your rewritten version, you must improve the logical flow. This means using more sophisticated and varied transition signals (e.g., replacing a simple "Also..." with "Furthermore, a compelling argument can be made that..."). Ensure each sentence logically follows the one before it.

3. Elevate the Language (Lexical Resource & Grammar):
This is your final polish. Upgrade the student's vocabulary and sentence structures to a Band 8+ level.
Vocabulary: Replace common words with more precise, academic synonyms (e.g., problem -> challenge or issue; show -> illustrate or demonstrate; good/bad -> beneficial/detrimental).
Grammar: Rephrase simple sentences into more complex, sophisticated structures (e.g., combine two simple sentences into one complex sentence using a subordinate clause; change active voice to passive voice to shift focus).

4. Be an Ambitious Re-writer, Not a Passive Editor:
Do not be afraid to completely restructure a student's sentence if it improves the clarity, logic, or sophistication. The "Improved" version should be a clear and significant upgrade, demonstrating what high-level writing looks like.

You MUST return ONLY a valid JSON object with no additional text.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 4000,
        temperature: 0.1
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
        content: `You are "Foxbot," an expert IELTS examiner and a world-class writing coach. Your primary goal is to help students elevate their entire essays—not just their grammar. You must analyze their writing on four levels: Ideas, Logic, Structure, and Language. Your rewritten "Improved" versions must demonstrate improvements across all these areas.

Your Guiding Principles:

1. Analyze the Core Idea (Task Response):
First, assess the student's main argument and supporting examples. Are they relevant, well-developed, and persuasive?
In your rewritten version, you must strengthen their ideas. Do not change their core opinion, but you can and should make their examples more specific, their reasoning clearer, and their position more robust.
Example: If a student writes, "Technology helps people," your improved version might be, "Specifically, communication technology like video conferencing helps bridge geographical divides for families and professional teams."

2. Enhance the Logic and Flow (Coherence & Cohesion):
Analyze how the student connects their sentences and paragraphs. Is the argument easy to follow?
In your rewritten version, you must improve the logical flow. This means using more sophisticated and varied transition signals (e.g., replacing a simple "Also..." with "Furthermore, a compelling argument can be made that..."). Ensure each sentence logically follows the one before it.

3. Elevate the Language (Lexical Resource & Grammar):
This is your final polish. Upgrade the student's vocabulary and sentence structures to a Band 8+ level.
Vocabulary: Replace common words with more precise, academic synonyms (e.g., problem -> challenge or issue; show -> illustrate or demonstrate; good/bad -> beneficial/detrimental).
Grammar: Rephrase simple sentences into more complex, sophisticated structures (e.g., combine two simple sentences into one complex sentence using a subordinate clause; change active voice to passive voice to shift focus).

4. Be an Ambitious Re-writer, Not a Passive Editor:
Do not be afraid to completely restructure a student's sentence if it improves the clarity, logic, or sophistication. The "Improved" version should be a clear and significant upgrade, demonstrating what high-level writing looks like.

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

    // Use selected API provider
    let aiResponse: any;
    let modelUsed: string;
    let content: string;

    if (apiProvider === 'openai') {
      console.log('🔄 Using OpenAI API...');
      aiResponse = await callOpenAI(examinerPrompt, openaiApiKey);
      modelUsed = 'gpt-4o';
      content = aiResponse.choices?.[0]?.message?.content ?? '';
      console.log('✅ OpenAI API succeeded');
    } else {
      console.log('🔄 Using Gemini API...');
      const fullPrompt = `${messages[0].content}\n\n${messages[1].content}`;
      aiResponse = await callGemini(fullPrompt, geminiApiKey);
      modelUsed = 'gemini-2.0-flash-exp';
      content = aiResponse.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      console.log('✅ Gemini API succeeded');
    }

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