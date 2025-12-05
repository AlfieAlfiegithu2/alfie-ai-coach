import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Official PTE Writing Scoring Criteria based on Pearson's Score Guide
// Reference: https://www.pearsonpte.com/score-guide

const PTE_WRITING_CRITERIA = {
  summarize_written_text: {
    name: 'Summarize Written Text',
    maxScores: { 
      content: 2, 
      form: 1, 
      grammar: 2, 
      vocabulary: 2,
      spelling: 2
    },
    totalMax: 9,
    wordLimit: { min: 5, max: 75 },
    criteria: {
      content: `Score 0-2 based on summary quality:
        2: Provides a good summary of the text. All relevant aspects mentioned
        1: Provides a fair summary but misses one or two aspects
        0: Omits or misrepresents the main aspects`,
      form: `Score 0-1 based on format:
        1: A single sentence of 5-75 words
        0: Not a single sentence OR fewer than 5 or more than 75 words`,
      grammar: `Score 0-2 based on grammatical accuracy:
        2: Correct grammatical structure throughout
        1: Contains grammatical errors but meaning is clear
        0: Grammatical errors obscure meaning`,
      vocabulary: `Score 0-2 based on word choice:
        2: Appropriate word choice throughout
        1: Some inappropriate choices but meaning is clear
        0: Inappropriate word choice obscures meaning`,
      spelling: `Score 0-2 based on spelling accuracy:
        2: Correct spelling
        1: One spelling error
        0: More than one spelling error`
    }
  },
  
  write_essay: {
    name: 'Write Essay',
    maxScores: { 
      content: 3, 
      development_structure_coherence: 2,
      form: 2,
      general_linguistic_range: 2,
      grammar_usage_mechanics: 2,
      vocabulary_range: 2,
      spelling: 2
    },
    totalMax: 15,
    wordLimit: { min: 200, max: 300 },
    criteria: {
      content: `Score 0-3 based on topic relevance:
        3: Addresses the topic, with all elements clearly related
        2: Addresses the topic but some elements loosely related
        1: Addresses the topic incompletely or contains inaccuracies
        0: Does not address the topic`,
      development_structure_coherence: `Score 0-2 based on organization:
        2: Shows good development and logical structure throughout
        1: Shows some development with adequate structure
        0: Lacks development, incoherent, no logical structure`,
      form: `Score 0-2 based on word count:
        2: Length is between 200 and 300 words
        1: Length is between 120-199 or 301-380 words
        0: Length is less than 120 or more than 380 words`,
      general_linguistic_range: `Score 0-2 based on language sophistication:
        2: Uses a wide range of grammatical structures and vocabulary
        1: Uses adequate range but some repetition
        0: Very limited range`,
      grammar_usage_mechanics: `Score 0-2 based on grammar and punctuation:
        2: Shows consistent grammatical control with appropriate punctuation
        1: Has some errors but they don't impede communication
        0: Frequent grammatical errors impede communication`,
      vocabulary_range: `Score 0-2 based on vocabulary:
        2: Uses a wide vocabulary range with good control of word forms
        1: Uses adequate vocabulary but may lack precision
        0: Very limited vocabulary`,
      spelling: `Score 0-2 based on spelling:
        2: Correct spelling
        1: One spelling error
        0: More than one spelling error`
    }
  },
  
  summarize_spoken_text: {
    name: 'Summarize Spoken Text',
    maxScores: { 
      content: 2, 
      form: 2, 
      grammar: 2, 
      vocabulary: 2,
      spelling: 2
    },
    totalMax: 10,
    wordLimit: { min: 50, max: 70 },
    criteria: {
      content: `Score 0-2 based on summary quality:
        2: Provides a good summary with all main points
        1: Provides fair summary but misses some points
        0: Omits or misrepresents main ideas`,
      form: `Score 0-2 based on format:
        2: Length is between 50 and 70 words
        1: Length is between 40-49 or 71-100 words
        0: Less than 40 or more than 100 words`,
      grammar: `Score 0-2 based on grammatical accuracy:
        2: Correct grammatical structure throughout
        1: Contains errors but meaning is clear
        0: Errors obscure meaning`,
      vocabulary: `Score 0-2 based on word choice:
        2: Appropriate word choice throughout
        1: Some inappropriate choices but meaning is clear
        0: Inappropriate choice obscures meaning`,
      spelling: `Score 0-2 based on spelling:
        2: Correct spelling
        1: One spelling error
        0: More than one spelling error`
    }
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const { 
      taskType,
      writtenResponse,
      originalPassage,
      essayPrompt,
      spokenTextContent
    } = await req.json();

    if (!taskType || !PTE_WRITING_CRITERIA[taskType]) {
      throw new Error(`Invalid task type: ${taskType}`);
    }

    const criteria = PTE_WRITING_CRITERIA[taskType];
    const wordCount = writtenResponse?.trim().split(/\s+/).filter((w: string) => w).length || 0;
    
    // Build the evaluation prompt
    let evaluationPrompt = `You are an official PTE Academic examiner. Evaluate this ${criteria.name} response using the EXACT official PTE scoring criteria.

## Task Type: ${criteria.name}

## Word Count Requirements:
- Minimum: ${criteria.wordLimit.min} words
- Maximum: ${criteria.wordLimit.max} words
- Student's word count: ${wordCount} words

## Scoring Criteria:
${Object.entries(criteria.criteria).map(([key, desc]) => `### ${key.toUpperCase().replace(/_/g, ' ')}:\n${desc}`).join('\n\n')}

## Maximum Scores:
${Object.entries(criteria.maxScores).map(([key, max]) => `- ${key.replace(/_/g, ' ')}: ${max}`).join('\n')}
Total Maximum: ${criteria.totalMax}

`;

    // Add task-specific context
    switch(taskType) {
      case 'summarize_written_text':
        evaluationPrompt += `
## Original Passage to Summarize:
"${originalPassage}"

## Student's One-Sentence Summary:
"${writtenResponse}"

IMPORTANT: The response MUST be a SINGLE sentence between 5-75 words. Check this carefully.`;
        break;
        
      case 'write_essay':
        evaluationPrompt += `
## Essay Prompt/Topic:
"${essayPrompt}"

## Student's Essay:
"${writtenResponse}"

Evaluate the essay for content, structure, grammar, vocabulary, and spelling.`;
        break;
        
      case 'summarize_spoken_text':
        evaluationPrompt += `
## Spoken Text Content/Main Points:
${spokenTextContent || 'An audio was played to the student'}

## Student's Written Summary:
"${writtenResponse}"

The summary should be 50-70 words and capture all main points.`;
        break;
    }

    evaluationPrompt += `

## IMPORTANT: Return a JSON response in this EXACT format:
{
  "scores": {
    ${Object.keys(criteria.maxScores).map(key => `"${key}": <number 0-${criteria.maxScores[key]}>`).join(',\n    ')}
  },
  "totalScore": <number>,
  "totalMax": ${criteria.totalMax},
  "percentage": <number 0-100>,
  "pteScore": <estimated PTE score 10-90>,
  "wordCount": ${wordCount},
  "wordCountStatus": "<within range / too short / too long>",
  "feedback": {
    ${Object.keys(criteria.maxScores).map(key => `"${key}": "<specific feedback for ${key.replace(/_/g, ' ')}>"`).join(',\n    ')}
  },
  "overallFeedback": "<2-3 sentences of encouraging overall feedback>",
  "improvements": ["<specific improvement tip 1>", "<specific improvement tip 2>", "<specific improvement tip 3>"],
  "strengths": ["<identified strength 1>", "<identified strength 2>"],
  "grammarErrors": ["<error 1>", "<error 2>"],
  "spellingErrors": ["<misspelled word 1>", "<misspelled word 2>"],
  "suggestedRevision": "<optional: a slightly improved version of their response>"
}

Be encouraging but accurate. Give constructive feedback that helps the student improve.`;

    console.log(`📝 Evaluating PTE ${criteria.name} task (${wordCount} words)...`);

    // Call Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: evaluationPrompt }]
          }],
          generationConfig: {
            temperature: 0.3,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const geminiData = await response.json();
    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
      throw new Error('No response from Gemini');
    }

    // Parse JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse evaluation response');
    }

    const evaluation = JSON.parse(jsonMatch[0]);

    console.log(`✅ PTE writing evaluation complete. Score: ${evaluation.totalScore}/${evaluation.totalMax}`);

    return new Response(
      JSON.stringify({
        success: true,
        taskType,
        taskName: criteria.name,
        evaluation,
        scoringCriteria: criteria.maxScores,
        wordLimits: criteria.wordLimit
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('PTE writing evaluation error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

