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

    const task1WordCount = task1Answer.trim().split(/\s+/).length;
    const task2WordCount = task2Answer.trim().split(/\s+/).length;

    const examinerPrompt = `You are an experienced IELTS examiner certified to assess IELTS Academic Writing. Follow official IELTS band descriptors precisely.

ASSESSMENT DATA:
TASK 1 (Academic Report Writing):
Title: ${task1Data?.title || 'Academic Task 1'}
Instructions: ${task1Data?.instructions || 'Summarize the information shown in the visual data'}
${task1Data?.imageContext ? `Visual Data Description: ${task1Data.imageContext}` : ''}
Word Count: ${task1WordCount} words (Target: 150+ words)

Student Response:
"${task1Answer}"

TASK 2 (Essay Writing):
Title: ${task2Data?.title || 'Academic Task 2'}  
Instructions: ${task2Data?.instructions || 'Write an essay responding to the given prompt'}
Word Count: ${task2WordCount} words (Target: 250+ words)

Student Response:
"${task2Answer}"

OFFICIAL IELTS SCORING CRITERIA:

TASK 1 CRITERIA:
- Task Achievement (25%): Covers all requirements, presents clear overview, accurately describes data, highlights key features
- Coherence & Cohesion (25%): Logical organization, clear progression, appropriate linking, paragraphing
- Lexical Resource (25%): Range of vocabulary, accuracy, appropriateness, spelling
- Grammatical Range & Accuracy (25%): Range of structures, accuracy, punctuation

TASK 2 CRITERIA:
- Task Response (25%): Addresses all parts, clear position, develops arguments, relevant ideas
- Coherence & Cohesion (25%): Logical organization, clear progression, cohesive devices, paragraphing
- Lexical Resource (25%): Range of vocabulary, accuracy, appropriateness, collocation, spelling  
- Grammatical Range & Accuracy (25%): Range of structures, accuracy, complex sentences, punctuation

BAND SCORE GUIDELINES:
Band 9: Expert user - fully operational command
Band 8: Very good user - fully operational with occasional inaccuracies
Band 7: Good user - operational command with occasional inaccuracies
Band 6: Competent user - generally effective despite inaccuracies
Band 5: Modest user - partial command, frequent problems but conveys meaning
Band 4: Limited user - basic competence, frequent breakdowns
Band 3-1: Lower levels with increasing limitations

WORD COUNT PENALTIES:
- Task 1 under 150 words: reduce Task Achievement by 1 band
- Task 2 under 250 words: reduce Task Response by 1 band

CALCULATE OVERALL BAND:
Overall Writing Band = (Task 1 Overall × 0.33) + (Task 2 Overall × 0.67)
Round to nearest 0.5

Return ONLY this JSON structure with no additional text:

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
      "feedback_markdown": "### Task 1 Assessment (${task1WordCount} words)\\n\\n**Task Achievement:** [Specific feedback]\\n\\n**Coherence & Cohesion:** [Specific feedback]\\n\\n**Lexical Resource:** [Specific feedback]\\n\\n**Grammatical Range & Accuracy:** [Specific feedback]",
      "feedback": {
        "strengths": ["Specific strength 1", "Specific strength 2"],
        "improvements": ["Specific improvement 1", "Specific improvement 2"]
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
      "feedback_markdown": "### Task 2 Assessment (${task2WordCount} words)\\n\\n**Task Response:** [Specific feedback]\\n\\n**Coherence & Cohesion:** [Specific feedback]\\n\\n**Lexical Resource:** [Specific feedback]\\n\\n**Grammatical Range & Accuracy:** [Specific feedback]",
      "feedback": {
        "strengths": ["Specific strength 1", "Specific strength 2"],
        "improvements": ["Specific improvement 1", "Specific improvement 2"]
      }
    },
    "overall": {
      "band": 6.5,
      "calculation": "Task 1: 6.0 (33%) + Task 2: 6.5 (67%) = 6.5",
      "feedback_markdown": "### Overall Writing Assessment\\n\\n**Final Band Score: 6.5**\\n\\n[Overall performance summary and key recommendations]"
    }
  }
}`;

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

    // Enhanced validation and scoring accuracy
    const validateAndNormalize = (structured: any) => {
      if (!structured?.structured?.task1 || !structured?.structured?.task2) {
        throw new Error('AI response missing required task assessment data');
      }

      // Validate and clamp all band scores to valid IELTS range (0-9, 0.5 increments)
      const roundToHalf = (score: number) => Math.round(score * 2) / 2;
      const clampScore = (score: number) => Math.min(9, Math.max(0, roundToHalf(score)));

      // Task 1 validation and normalization
      const task1 = structured.structured.task1;
      if (task1.criteria) {
        task1.criteria.task_achievement = clampScore(task1.criteria.task_achievement || 0);
        task1.criteria.coherence_and_cohesion = clampScore(task1.criteria.coherence_and_cohesion || 0);
        task1.criteria.lexical_resource = clampScore(task1.criteria.lexical_resource || 0);
        task1.criteria.grammatical_range_and_accuracy = clampScore(task1.criteria.grammatical_range_and_accuracy || 0);
        
        // Calculate Task 1 overall band (average of 4 criteria)
        const task1Average = (
          task1.criteria.task_achievement +
          task1.criteria.coherence_and_cohesion +
          task1.criteria.lexical_resource +
          task1.criteria.grammatical_range_and_accuracy
        ) / 4;
        task1.overall_band = clampScore(task1Average);
      }

      // Task 2 validation and normalization
      const task2 = structured.structured.task2;
      if (task2.criteria) {
        task2.criteria.task_response = clampScore(task2.criteria.task_response || 0);
        task2.criteria.coherence_and_cohesion = clampScore(task2.criteria.coherence_and_cohesion || 0);
        task2.criteria.lexical_resource = clampScore(task2.criteria.lexical_resource || 0);
        task2.criteria.grammatical_range_and_accuracy = clampScore(task2.criteria.grammatical_range_and_accuracy || 0);
        
        // Calculate Task 2 overall band (average of 4 criteria)
        const task2Average = (
          task2.criteria.task_response +
          task2.criteria.coherence_and_cohesion +
          task2.criteria.lexical_resource +
          task2.criteria.grammatical_range_and_accuracy
        ) / 4;
        task2.overall_band = clampScore(task2Average);
      }

      // Calculate accurate overall band: Task 1 (33.33%) + Task 2 (66.67%)
      const overallRaw = (task1.overall_band * 0.3333) + (task2.overall_band * 0.6667);
      const overallBand = clampScore(overallRaw);
      
      structured.structured.overall.band = overallBand;
      structured.structured.overall.calculation = `Task 1: ${task1.overall_band} (33%) + Task 2: ${task2.overall_band} (67%) = ${overallBand}`;

      console.log('✅ Validated and normalized all band scores');
      console.log(`📊 Final Scores - Task 1: ${task1.overall_band}, Task 2: ${task2.overall_band}, Overall: ${overallBand}`);
      
      return structured;
    };

    // Validate required structure and normalize scores
    const normalizedStructured = validateAndNormalize(structured);

    const feedback = structured?.structured?.full_report_markdown || content;

    return new Response(JSON.stringify({ 
      success: true, 
      feedback: normalizedStructured?.structured?.overall?.feedback_markdown || content,
      structured: normalizedStructured,
      apiUsed: modelUsed,
      task1WordCount,
      task2WordCount
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