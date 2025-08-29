import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Official IELTS Band Descriptors
const IELTS_BAND_DESCRIPTORS = {
  task_achievement: {
    9: "Fully addresses all parts of the task with very natural and sophisticated response. Covers all requirements with fully extended and well-supported ideas.",
    8: "Covers all requirements with well-developed response. Presents clearly relevant ideas which are well-extended and supported.",
    7: "Covers requirements with sufficiently developed response. Presents relevant main ideas but some may be inadequately developed.",
    6: "Addresses requirements but development is not always clear. Some irrelevant or inadequately supported ideas may be present.",
    5: "Generally addresses the task with some development of ideas. Limited development with irrelevant detail or repetition.",
    4: "Attempts to address the task but does not cover all key features. Ideas lack development and support."
  },
  task_response: {
    9: "Fully addresses all parts with comprehensive development. Clear position throughout with fully extended and well-supported ideas.",
    8: "Sufficiently addresses all parts with well-developed ideas. Clear position with relevant, extended and supported ideas.",
    7: "Addresses all parts though some parts may be more fully covered. Clear position with main ideas extended and supported.",
    6: "Addresses all parts but some parts may be inadequately covered. Relevant position but conclusions may be unclear.",
    5: "Addresses the task only partially. Limited development of ideas with unclear position and weak conclusion.",
    4: "Minimal addressing of the task. Few ideas developed with unclear position and little support."
  },
  coherence_cohesion: {
    9: "Uses cohesion naturally and effectively. Clear progression with wide range of cohesive devices. Paragraphing is logical and well-managed.",
    8: "Sequences information logically with clear progression. Wide range of cohesive devices with generally good paragraphing.",
    7: "Logically organizes information with clear progression. Range of cohesive devices though some may be over/under-used.",
    6: "Generally coherent with clear progression. Some cohesive devices used effectively but may lack clarity or be repetitive.",
    5: "Organization evident but not wholly logical. Some cohesive devices but may be inadequate or inaccurate.",
    4: "Information and ideas not always clearly connected. Limited range of cohesive devices with some inaccuracy."
  },
  lexical_resource: {
    9: "Wide range of vocabulary used naturally and accurately. Rare minor errors as slips. Full awareness of style and collocation.",
    8: "Wide range of vocabulary used fluently and flexibly. Occasional inaccuracies in word choice and collocation.",
    7: "Sufficient range with some flexibility. Generally appropriate word choice with some awareness of style and collocation.",
    6: "Adequate range for the task. Some inaccuracies in word choice but meaning is clear. Some awareness of style.",
    5: "Limited range but minimally adequate. Noticeable errors in word choice may cause difficulty for reader.",
    4: "Limited range with frequent repetition. Errors in word choice may impede meaning and cause strain for reader."
  },
  grammatical_range: {
    9: "Wide range of structures used accurately and appropriately. Rare minor errors. Full control of grammar and punctuation.",
    8: "Wide range of structures used flexibly and accurately. Most sentences error-free with only occasional errors.",
    7: "Range of complex structures with frequent error-free sentences. Generally good control despite some errors.",
    6: "Mix of simple and complex structures. Some errors but they rarely reduce communication.",
    5: "Limited range of structures with frequent errors that may reduce clarity. Complex structures attempted but often inaccurate.",
    4: "Limited range with frequent errors. Simple structures may be accurate but complex attempts have errors."
  }
};

// Common error patterns that should trigger lower scores
const ERROR_PATTERNS = {
  basic_vocabulary: ['bad', 'good', 'big', 'small', 'very', 'a lot', 'many people', 'nowadays', 'in my opinion'],
  weak_openings: ['I agree that', 'I disagree that', 'In my opinion', 'I think that', 'I believe that'],
  repetitive_connectors: ['also', 'and', 'but', 'so', 'because'],
  grammar_errors: ['have effect', 'make research', 'give opinion', 'do mistake', 'make crime'],
  informal_language: ['gonna', 'wanna', 'can\'t', 'don\'t', 'won\'t', 'it\'s', 'there\'s']
};

function analyzeWordCount(text: string, minWords: number): { penalty: number; message: string } {
  const wordCount = text.trim().split(/\s+/).length;
  if (wordCount < minWords) {
    const shortfall = minWords - wordCount;
    const penalty = shortfall <= 20 ? 0.5 : 1.0;
    return {
      penalty,
      message: `Essay is ${shortfall} words below minimum (${wordCount}/${minWords}). Band score reduced by ${penalty}.`
    };
  }
  return { penalty: 0, message: '' };
}

function detectErrorPatterns(text: string): string[] {
  const detectedErrors: string[] = [];
  const lowerText = text.toLowerCase();
  
  // Check for basic vocabulary
  const basicVocabFound = ERROR_PATTERNS.basic_vocabulary.filter(word => 
    lowerText.includes(word.toLowerCase())
  );
  if (basicVocabFound.length > 2) {
    detectedErrors.push(`Over-reliance on basic vocabulary: ${basicVocabFound.slice(0, 3).join(', ')}`);
  }
  
  // Check for weak openings
  const weakOpenings = ERROR_PATTERNS.weak_openings.filter(phrase => 
    lowerText.includes(phrase.toLowerCase())
  );
  if (weakOpenings.length > 0) {
    detectedErrors.push(`Weak essay opening: "${weakOpenings[0]}"`);
  }
  
  // Check for grammar patterns
  const grammarErrors = ERROR_PATTERNS.grammar_errors.filter(error => 
    lowerText.includes(error.toLowerCase())
  );
  if (grammarErrors.length > 0) {
    detectedErrors.push(`Grammar errors detected: ${grammarErrors.join(', ')}`);
  }
  
  return detectedErrors;
}

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
            content: 'You are an expert IELTS examiner with 15+ years of experience. You follow official IELTS band descriptors precisely and provide accurate, evidence-based scoring. You MUST return ONLY a valid JSON object with no additional text.'
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

    // Analyze word counts and detect error patterns
    const task1WordAnalysis = analyzeWordCount(task1Answer, 150);
    const task2WordAnalysis = analyzeWordCount(task2Answer, 250);
    const task1Errors = detectErrorPatterns(task1Answer);
    const task2Errors = detectErrorPatterns(task2Answer);

    console.log('📊 Analysis Results:', {
      task1Words: task1Answer.trim().split(/\s+/).length,
      task2Words: task2Answer.trim().split(/\s+/).length,
      task1Penalty: task1WordAnalysis.penalty,
      task2Penalty: task2WordAnalysis.penalty,
      task1Errors: task1Errors.length,
      task2Errors: task2Errors.length
    });

    const improvedExaminerPrompt = `You are an expert IELTS examiner with 15+ years of experience. Use the official IELTS band descriptors to provide accurate, evidence-based scoring.

**OFFICIAL IELTS BAND DESCRIPTORS:**

**Task Achievement (Task 1):**
- Band 9: ${IELTS_BAND_DESCRIPTORS.task_achievement[9]}
- Band 8: ${IELTS_BAND_DESCRIPTORS.task_achievement[8]}
- Band 7: ${IELTS_BAND_DESCRIPTORS.task_achievement[7]}
- Band 6: ${IELTS_BAND_DESCRIPTORS.task_achievement[6]}
- Band 5: ${IELTS_BAND_DESCRIPTORS.task_achievement[5]}

**Task Response (Task 2):**
- Band 9: ${IELTS_BAND_DESCRIPTORS.task_response[9]}
- Band 8: ${IELTS_BAND_DESCRIPTORS.task_response[8]}
- Band 7: ${IELTS_BAND_DESCRIPTORS.task_response[7]}
- Band 6: ${IELTS_BAND_DESCRIPTORS.task_response[6]}
- Band 5: ${IELTS_BAND_DESCRIPTORS.task_response[5]}

**Coherence & Cohesion:**
- Band 9: ${IELTS_BAND_DESCRIPTORS.coherence_cohesion[9]}
- Band 8: ${IELTS_BAND_DESCRIPTORS.coherence_cohesion[8]}
- Band 7: ${IELTS_BAND_DESCRIPTORS.coherence_cohesion[7]}
- Band 6: ${IELTS_BAND_DESCRIPTORS.coherence_cohesion[6]}
- Band 5: ${IELTS_BAND_DESCRIPTORS.coherence_cohesion[5]}

**Lexical Resource:**
- Band 9: ${IELTS_BAND_DESCRIPTORS.lexical_resource[9]}
- Band 8: ${IELTS_BAND_DESCRIPTORS.lexical_resource[8]}
- Band 7: ${IELTS_BAND_DESCRIPTORS.lexical_resource[7]}
- Band 6: ${IELTS_BAND_DESCRIPTORS.lexical_resource[6]}
- Band 5: ${IELTS_BAND_DESCRIPTORS.lexical_resource[5]}

**Grammatical Range & Accuracy:**
- Band 9: ${IELTS_BAND_DESCRIPTORS.grammatical_range[9]}
- Band 8: ${IELTS_BAND_DESCRIPTORS.grammatical_range[8]}
- Band 7: ${IELTS_BAND_DESCRIPTORS.grammatical_range[7]}
- Band 6: ${IELTS_BAND_DESCRIPTORS.grammatical_range[6]}
- Band 5: ${IELTS_BAND_DESCRIPTORS.grammatical_range[5]}

**WORD COUNT ANALYSIS:**
- Task 1: ${task1Answer.trim().split(/\s+/).length} words (minimum: 150) ${task1WordAnalysis.message}
- Task 2: ${task2Answer.trim().split(/\s+/).length} words (minimum: 250) ${task2WordAnalysis.message}

**ERROR PATTERNS DETECTED:**
Task 1 Issues: ${task1Errors.length > 0 ? task1Errors.join('; ') : 'None detected'}
Task 2 Issues: ${task2Errors.length > 0 ? task2Errors.join('; ') : 'None detected'}

**SCORING GUIDELINES:**
- Use the exact band descriptors above to justify your scores
- Quote specific examples from student writing as evidence
- Apply word count penalties: ${task1WordAnalysis.penalty + task2WordAnalysis.penalty} total penalty
- Basic vocabulary (bad/good) should lower Lexical Resource to Band 5-6
- Weak openings ("I agree that") should impact Task Response
- Grammar errors should significantly reduce Grammatical Range scores

**TASK DETAILS:**

**Task 1:**
Prompt: ${task1Data?.title || 'Task 1'}
Instructions: ${task1Data?.instructions || ''}
${task1Data?.imageContext ? `Visual Data: ${task1Data.imageContext}` : ''}

Student Response: "${task1Answer}"

**Task 2:**
Prompt: ${task2Data?.title || 'Task 2'}
Instructions: ${task2Data?.instructions || ''}

Student Response: "${task2Answer}"

**CRITICAL REQUIREMENTS:**
1. Return ONLY valid JSON, no additional text
2. Use bands: 4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0
3. Quote exact text from student writing in justifications
4. Apply penalties for word count shortfalls
5. Lower scores for detected error patterns
6. Provide specific, actionable improvements

**JSON SCHEMA:**
{
  "task1": {
    "criteria": {
      "task_achievement": { 
        "band": 6.5, 
        "justification": "Quote specific examples and reference band descriptors. Must be 2-3 sentences minimum." 
      },
      "coherence_and_cohesion": { 
        "band": 6.0, 
        "justification": "Quote specific examples and reference band descriptors. Must be 2-3 sentences minimum." 
      },
      "lexical_resource": { 
        "band": 5.5, 
        "justification": "Quote specific examples and reference band descriptors. Must be 2-3 sentences minimum." 
      },
      "grammatical_range_and_accuracy": { 
        "band": 6.0, 
        "justification": "Quote specific examples and reference band descriptors. Must be 2-3 sentences minimum." 
      }
    },
    "overall_band": 6.0,
    "word_count": ${task1Answer.trim().split(/\s+/).length},
    "word_count_penalty": ${task1WordAnalysis.penalty}
  },
  "task2": {
    "criteria": {
      "task_response": { 
        "band": 6.0, 
        "justification": "Quote specific examples and reference band descriptors. Must be 2-3 sentences minimum." 
      },
      "coherence_and_cohesion": { 
        "band": 6.5, 
        "justification": "Quote specific examples and reference band descriptors. Must be 2-3 sentences minimum." 
      },
      "lexical_resource": { 
        "band": 5.5, 
        "justification": "Quote specific examples and reference band descriptors. Must be 2-3 sentences minimum." 
      },
      "grammatical_range_and_accuracy": { 
        "band": 6.0, 
        "justification": "Quote specific examples and reference band descriptors. Must be 2-3 sentences minimum." 
      }
    },
    "overall_band": 6.0,
    "word_count": ${task2Answer.trim().split(/\s+/).length},
    "word_count_penalty": ${task2WordAnalysis.penalty}
  },
  "overall": {
    "band": 6.0,
    "calculation": "(6.0 * 1 + 6.0 * 2) / 3 = 6.0"
  },
  "specific_improvements": [
    {
      "issue": "Weak vocabulary - replace 'bad' with sophisticated alternatives",
      "original": "bad effect",
      "improved": "detrimental/adverse impact",
      "explanation": "Academic writing requires precise, sophisticated vocabulary"
    },
    {
      "issue": "Weak opening - avoid basic stance statements",
      "original": "I agree that technology has a bad effect",
      "improved": "While technology undoubtedly transforms social interactions, its impact proves predominantly beneficial",
      "explanation": "Strong openings present nuanced positions rather than simple agreement"
    }
  ],
  "error_patterns_found": ${JSON.stringify([...task1Errors, ...task2Errors])}
}`;

    // Use selected API provider
    let aiResponse: any;
    let modelUsed: string;
    let content: string;

    if (apiProvider === 'openai') {
      console.log('🔄 Using OpenAI API...');
      aiResponse = await callOpenAI(improvedExaminerPrompt, openaiApiKey);
      modelUsed = 'OpenAI GPT-4o';
      content = aiResponse.choices?.[0]?.message?.content ?? '';
      console.log('✅ OpenAI API succeeded');
    } else {
      console.log('🔄 Using Gemini API...');
      aiResponse = await callGemini(improvedExaminerPrompt, geminiApiKey);
      modelUsed = 'Google Gemini AI';
      content = aiResponse.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      console.log('✅ Gemini API succeeded');
    }

    console.log('🔍 Raw API response content length:', content.length);
    
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
      
      let extractedJson = '';
      let cleaned = content.trim();
      
      // Remove markdown code blocks
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
        extractedJson = cleaned.substring(firstBrace, lastBrace + 1);
        
        console.log('🔍 Extracted JSON length:', extractedJson.length);
        console.log('🔍 Extracted JSON first 200 chars:', extractedJson.substring(0, 200));
        console.log('🔍 Extracted JSON last 200 chars:', extractedJson.substring(extractedJson.length - 200));
        
        try {
          structured = JSON.parse(extractedJson);
          console.log('✅ Successfully parsed extracted JSON');
        } catch (parseError) {
          console.log('❌ Failed to parse extracted JSON:', parseError.message);
          
          // Try to fix common JSON issues
          try {
            let fixedJson = extractedJson.replace(/,(\s*[}\]])/g, '$1');
            
            // Balance braces if needed
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
      }
    }

    // Apply word count penalties to final scores
    if (structured && (task1WordAnalysis.penalty > 0 || task2WordAnalysis.penalty > 0)) {
      console.log('⚠️ Applying word count penalties');
      
      if (structured.task1?.overall_band) {
        structured.task1.overall_band = Math.max(4.0, structured.task1.overall_band - task1WordAnalysis.penalty);
      }
      
      if (structured.task2?.overall_band) {
        structured.task2.overall_band = Math.max(4.0, structured.task2.overall_band - task2WordAnalysis.penalty);
      }
      
      // Recalculate overall band
      if (structured.overall && structured.task1?.overall_band && structured.task2?.overall_band) {
        const newOverall = (structured.task1.overall_band * 1 + structured.task2.overall_band * 2) / 3;
        structured.overall.band = Math.round(newOverall * 2) / 2; // Round to nearest 0.5
        structured.overall.calculation = `(${structured.task1.overall_band} * 1 + ${structured.task2.overall_band} * 2) / 3 = ${structured.overall.band}`;
      }
    }

    const feedback = structured ? 
      `# IELTS Writing Assessment Results\n\n**Overall Band Score: ${structured.overall?.band || 6.0}**\n\n${JSON.stringify(structured, null, 2)}` : 
      content;

    return new Response(JSON.stringify({ 
      success: true, 
      feedback,
      structured,
      apiUsed: modelUsed,
      task1WordCount: task1Answer.trim().split(/\s+/).length,
      task2WordCount: task2Answer.trim().split(/\s+/).length,
      wordCountPenalties: {
        task1: task1WordAnalysis.penalty,
        task2: task2WordAnalysis.penalty
      },
      errorPatternsDetected: [...task1Errors, ...task2Errors]
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