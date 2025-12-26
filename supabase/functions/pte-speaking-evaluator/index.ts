import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  verifyJWT,
  checkRateLimit,
  incrementAPICallCount,
  validateInputSize,
  getSecureCorsHeaders
} from "../rate-limiter-utils.ts";

// Official PTE Scoring Criteria based on Pearson's Score Guide
// Reference: https://www.pearsonpte.com/score-guide

const PTE_SCORING_CRITERIA = {
  // SPEAKING TASKS
  read_aloud: {
    name: 'Read Aloud',
    maxScores: { content: 5, oral_fluency: 5, pronunciation: 5 },
    totalMax: 15,
    criteria: {
      content: `Score 0-5 based on how much of the text was read correctly:
        5: All words read correctly in sequence
        4: One or two words missed or incorrect
        3: A few words missed or incorrect
        2: Many words missed or incorrect, but some recognizable
        1: Most words missed, very poor attempt
        0: No response or completely unintelligible`,
      oral_fluency: `Score 0-5 based on rhythm, phrasing, and stress:
        5: Native-like fluency with natural rhythm, stress, and phrasing
        4: Smooth delivery with minor hesitations, good phrasing
        3: Acceptable fluency but some unnatural pauses or stress
        2: Noticeable hesitations, uneven rhythm
        1: Frequent pauses, choppy delivery
        0: Speech too fragmented to assess`,
      pronunciation: `Score 0-5 based on vowel/consonant sounds, word stress:
        5: Native-like pronunciation, all sounds clear
        4: Good pronunciation with minor deviations
        3: Mostly intelligible with some mispronunciations
        2: Frequent mispronunciations but still understandable
        1: Difficult to understand due to pronunciation
        0: Completely unintelligible`
    }
  },

  repeat_sentence: {
    name: 'Repeat Sentence',
    maxScores: { content: 3, oral_fluency: 5, pronunciation: 5 },
    totalMax: 13,
    criteria: {
      content: `Score 0-3 based on word accuracy:
        3: All words repeated correctly
        2: More than 50% of words correct
        1: Less than 50% of words correct
        0: No words correct or no response`,
      oral_fluency: `Same as Read Aloud (0-5)`,
      pronunciation: `Same as Read Aloud (0-5)`
    }
  },

  describe_image: {
    name: 'Describe Image',
    maxScores: { content: 5, oral_fluency: 5, pronunciation: 5 },
    totalMax: 15,
    criteria: {
      content: `Score 0-5 based on description completeness:
        5: All key elements described with supporting details
        4: Most key elements described with some details
        3: Main elements mentioned but lacking detail
        2: Some elements mentioned, major gaps
        1: Few elements, mostly irrelevant
        0: No response or completely off-topic`,
      oral_fluency: `Same as Read Aloud (0-5)`,
      pronunciation: `Same as Read Aloud (0-5)`
    }
  },

  retell_lecture: {
    name: 'Retell Lecture',
    maxScores: { content: 5, oral_fluency: 5, pronunciation: 5 },
    totalMax: 15,
    criteria: {
      content: `Score 0-5 based on lecture comprehension and retelling:
        5: All main points and key details accurately retold
        4: Most main points with adequate supporting details
        3: Some main points covered but missing key information
        2: Few main points, significant gaps
        1: Very little relevant content
        0: No response or completely irrelevant`,
      oral_fluency: `Same as Read Aloud (0-5)`,
      pronunciation: `Same as Read Aloud (0-5)`
    }
  },

  answer_short_question: {
    name: 'Answer Short Question',
    maxScores: { correctness: 1 },
    totalMax: 1,
    criteria: {
      correctness: `Score 0-1 based on answer accuracy:
        1: Correct answer given
        0: Incorrect or no answer`
    }
  },

  summarize_group_discussion: {
    name: 'Summarize Group Discussion',
    maxScores: { content: 5, oral_fluency: 5, pronunciation: 5 },
    totalMax: 15,
    criteria: {
      content: `Score 0-5 based on discussion summary accuracy:
        5: All speakers' main points and conclusions captured
        4: Most main points from each speaker included
        3: Some main points but missing perspectives
        2: Few main points, significant omissions
        1: Very little relevant content
        0: No response or completely irrelevant`,
      oral_fluency: `Same as Read Aloud (0-5)`,
      pronunciation: `Same as Read Aloud (0-5)`
    }
  },

  respond_to_situation: {
    name: 'Respond to a Situation',
    maxScores: { content: 5, oral_fluency: 5, pronunciation: 5 },
    totalMax: 15,
    criteria: {
      content: `Score 0-5 based on appropriateness of response:
        5: Completely appropriate tone, register, and content
        4: Mostly appropriate with minor issues
        3: Generally appropriate but some inconsistencies
        2: Partially appropriate, some inappropriate elements
        1: Largely inappropriate response
        0: No response or completely inappropriate`,
      oral_fluency: `Same as Read Aloud (0-5)`,
      pronunciation: `Same as Read Aloud (0-5)`
    }
  }
};

serve(async (req: any) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getSecureCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Verify Authentication
    const authHeader = req.headers.get('Authorization');
    const user = await verifyJWT(authHeader);

    if (!user.isValid) {
      console.error('❌ Authentication failed for pte-speaking-evaluator');
      return new Response(JSON.stringify({
        success: false,
        error: 'Authentication required. Please log in first.'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Check Input Size
    const clone = req.clone();
    const bodyJson = await clone.json();
    const sizeCheck = validateInputSize(bodyJson, 50); // 50KB limit

    if (!sizeCheck.isValid) {
      return new Response(JSON.stringify({
        success: false,
        error: sizeCheck.error
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Check Rate Limit
    const quota = await checkRateLimit(user.userId, user.planType);
    if (quota.isLimited) {
      console.error(`❌ Rate limit exceeded for user ${user.userId}`);
      return new Response(JSON.stringify({
        success: false,
        error: 'You have exceeded your daily API limit.',
        remaining: 0,
        resetTime: new Date(quota.resetTime).toISOString(),
        isPremium: user.planType === 'premium'
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const {
      taskType,
      transcribedText,
      audioBase64,
      originalText,
      imageDescription,
      lectureContent,
      situationContext,
      correctAnswer
    } = bodyJson;

    // @ts-ignore: taskType is validated to be a key of PTE_SCORING_CRITERIA
    if (!taskType || !PTE_SCORING_CRITERIA[taskType]) {
      throw new Error(`Invalid task type: ${taskType}`);
    }

    // @ts-ignore: taskType is validated to be a key of PTE_SCORING_CRITERIA
    const criteria = PTE_SCORING_CRITERIA[taskType];

    // Build the evaluation prompt based on task type
    let evaluationPrompt = `You are an official PTE Academic examiner. Evaluate this ${criteria.name} response using the EXACT official PTE scoring criteria.

## Task Type: ${criteria.name}

## Scoring Criteria:
${Object.entries(criteria.criteria).map(([key, desc]) => `### ${key.toUpperCase()}:\n${desc}`).join('\n\n')}

## Maximum Scores:
${Object.entries(criteria.maxScores).map(([key, max]) => `- ${key}: ${max}`).join('\n')}
Total Maximum: ${criteria.totalMax}

`;

    // Add task-specific context
    switch (taskType) {
      case 'read_aloud':
        evaluationPrompt += `
## Original Text to Read:
"${originalText}"

## Student's Transcribed Speech:
"${transcribedText}"

Evaluate how accurately the student read the text aloud.`;
        break;

      case 'repeat_sentence':
        evaluationPrompt += `
## Original Sentence:
"${originalText}"

## Student's Repeated Sentence:
"${transcribedText}"

Evaluate word-for-word accuracy and speaking quality.`;
        break;

      case 'describe_image':
        evaluationPrompt += `
## Image Description/Context:
${imageDescription || 'An image was shown to the student'}

## Student's Description:
"${transcribedText}"

Evaluate completeness and accuracy of the image description.`;
        break;

      case 'retell_lecture':
        evaluationPrompt += `
## Lecture Content/Main Points:
${lectureContent || 'A lecture was played to the student'}

## Student's Retelling:
"${transcribedText}"

Evaluate how well the student captured the main points.`;
        break;

      case 'answer_short_question':
        evaluationPrompt += `
## Correct Answer(s):
${correctAnswer}

## Student's Answer:
"${transcribedText}"

Evaluate if the answer is correct (1) or incorrect (0).`;
        break;

      case 'summarize_group_discussion':
        evaluationPrompt += `
## Discussion Content/Main Points:
${lectureContent || 'A group discussion was played'}

## Student's Summary:
"${transcribedText}"

Evaluate coverage of all speakers' main points.`;
        break;

      case 'respond_to_situation':
        evaluationPrompt += `
## Situation Context:
${situationContext || originalText}

## Student's Response:
"${transcribedText}"

Evaluate appropriateness of tone, register, and content.`;
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
  "feedback": {
    ${Object.keys(criteria.maxScores).map(key => `"${key}": "<specific feedback for ${key}>"`).join(',\n    ')}
  },
  "overallFeedback": "<2-3 sentences of encouraging overall feedback>",
  "improvements": ["<specific improvement tip 1>", "<specific improvement tip 2>", "<specific improvement tip 3>"],
  "strengths": ["<identified strength 1>", "<identified strength 2>"]
}

Be encouraging but accurate. Give constructive feedback that helps the student improve.`;

    console.log(`🎯 Evaluating PTE ${criteria.name} task...`);

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

    console.log(`✅ PTE evaluation complete. Score: ${evaluation.totalScore}/${evaluation.totalMax}`);

    // 4. Track Successful Call
    await incrementAPICallCount(user.userId);

    return new Response(
      JSON.stringify({
        success: true,
        taskType,
        taskName: criteria.name,
        evaluation,
        scoringCriteria: criteria.maxScores
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('PTE evaluation error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: (error as any).message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

