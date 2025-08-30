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
        model: 'gpt-4.1-2025-04-14',
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
        max_completion_tokens: 4000
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

    // Allow single task submissions - check for meaningful content
    const hasTask1 = task1Answer && task1Answer.trim() !== '' && task1Answer !== 'Not completed';
    const hasTask2 = task2Answer && task2Answer.trim() !== '' && task2Answer !== 'Not completed';
    
    if (!hasTask1 && !hasTask2) {
      throw new Error('At least one task answer is required');
    }

    console.log('🔍 AI Examiner Request:', { 
      task1Length: task1Answer.length,
      task2Length: task2Answer.length 
    });

    const masterExaminerPrompt = `Core Principles & Directives

You are an expert IELTS examiner and writing coach. You must adhere to the following core principles at all times.

1. Preserve the Student's Original Ideas and Arguments:
This is your most important rule. You must never change the core meaning, opinion, or arguments of the student's essay.
Your role is to improve how the ideas are expressed, not what the ideas are. You will elevate their language, grammar, and structure, but the student's original voice and perspective must remain intact.

2. Implement Precise, Word-for-Word Highlighting:
When you generate the sentence_comparisons and the improvements array, your feedback must be granular.
For the side-by-side correction view, you will generate original_spans and corrected_spans. In these arrays, you must isolate and tag only the specific words or short phrases that have been changed. Do not highlight entire sentences if only a few words were improved. This precision is essential.

Your Role and Core Instruction:

You are an expert IELTS examiner with 15+ years of experience. Your task is to provide a comprehensive, fair, and accurate assessment of an IELTS Writing submission (both Task 1 and Task 2).

Your entire analysis must be based on the Official IELTS Band Descriptors provided below. You will first form a holistic, overall impression of the work, and then you will use the specific criteria to justify your scores.

You must perform all analysis yourself. Your expert judgment is the only thing that matters.

Official IELTS Band Descriptors (Complete 0-9 Scale)

Task Achievement (Task 1) / Task Response (Task 2):
9: Fully satisfies all requirements. A fully developed and comprehensive response.
8: Sufficiently covers all requirements. A well-developed response.
7: Addresses all parts of the prompt, though some may be more developed than others.
6: Addresses the prompt, but the treatment is more general and may be underdeveloped.
5: Partially addresses the prompt. Ideas are limited and not well-supported.
4: Responds to the task only in a minimal way. Content is often irrelevant.
3: Fails to address the task. Ideas are largely irrelevant to the prompt.
2: Response is barely related to the task. The writer has failed to understand the prompt.
1: Fails to attend to the task at all. The content has no relation to the question.
0: Did not attend, or wrote a response that is completely memorized and unrelated.

Coherence & Cohesion:
9: Uses cohesion seamlessly and naturally. Paragraphing is flawless.
8: Information is sequenced logically. Paragraphing is well-managed.
7: Logically organized with clear progression. Uses a range of cohesive devices.
6: Organization is apparent but can be mechanical or repetitive.
5: Some organization, but not logical. Paragraphing is confusing. Causes significant difficulty for the reader.
4: Not logically organized. Very limited and incorrect use of linking words.
3: Ideas are disconnected. No logical progression.
2: Has very little control of organizational features.
1: Fails to communicate any message.
0: Did not attend.

Lexical Resource (Vocabulary):
9: Wide range of vocabulary used with very natural and sophisticated control.
8: Wide vocabulary used fluently and flexibly. Skillfully uses less common vocabulary.
7: Sufficient range of vocabulary with some flexibility. Attempts less common vocabulary.
6: Vocabulary is adequate for the task. Errors do not generally impede communication.
5: Limited and repetitive vocabulary. Frequent errors cause difficulty for the reader.
4: Uses only very basic vocabulary. Errors cause severe difficulty.
3: Extremely limited vocabulary. Severe errors distort meaning.
2: Can only use isolated words.
1: No evidence of any vocabulary knowledge.
0: Did not attend.

Grammatical Range and Accuracy:
9: Wide range of structures used with full flexibility and accuracy. Almost entirely error-free.
8: Wide range of structures. The majority of sentences are error-free.
7: Uses a variety of complex sentence structures, but with some errors.
6: Uses a mix of simple and complex sentences. Some errors, but they rarely reduce communication.
5: Limited range of structures. Frequent errors cause some difficulty for the reader.
4: Uses only very basic sentence structures. Frequent errors cause significant confusion.
3: Cannot produce basic sentence forms.
2: Cannot write in sentences at all.
1: No evidence of sentence structure.
0: Did not attend.

Your Required Tasks & Output Format

After analyzing the provided Task 1 and Task 2 essays, you must return a single, valid JSON object.

Score Each Criterion: For both Task 1 and Task 2, provide a band score (from 0.0 to 9.0, in 0.5 increments) for each of the four criteria based on the descriptors above.

Write Justifications: For each score, you must write a 2-3 sentence justification, quoting specific examples from the student's writing as evidence.

Handle Word Count: You must check if the essays are under the word count (150 for Task 1, 250 for Task 2). If an essay is significantly under length, you must state that this will lower the Task Achievement/Response score and reflect this in your scoring.

Provide Overall Feedback: Based on your analysis, provide a bulleted list of 2-3 "Key Strengths" and 2-3 "Specific, Actionable Improvements."

CRITICAL: Comprehensive Sentence-by-Sentence Analysis

After you have completed the band score assessment, you must generate comprehensive feedback for each task.

For EACH task (Task 1 and Task 2), you must analyze EVERY SINGLE SENTENCE in the submission and provide improvement suggestions for each sentence that needs enhancement. Do not limit yourself to only 3-5 improvements - analyze from beginning to end.

Each object in the improvements array MUST contain the following four keys:
- issue: A short title for the problem area (e.g., "Repetitive Vocabulary," "Simple Sentence Structure," "Unsupported Idea," "Weak Introduction," "Unclear Transition," "Imprecise Data Description," "Informal Tone," "Redundant Phrasing," "Missing Concession," "Weak Conclusion," "Poor Linking," "Vague Language," "Overuse of Basic Words," "Comma Splicing," "Subject-Verb Disagreement," "Article Misuse," "Preposition Error," "Tense Inconsistency," "Pronoun Ambiguity," "Passive Voice Overuse," "Fragment Sentence," "Run-on Sentence," "Paragraph Transition," "Evidence Integration," "Counter-argument Development," "Thesis Clarity," "Topic Sentence Strength," "Supporting Detail Quality," "Citation Format," "Academic Register").
- original: The exact quote from the student's writing that demonstrates this issue (single sentence or specific phrase only).
- improved: Your rewritten, high-scoring version of that specific sentence or phrase, making sure to preserve the student's original idea completely.
- explanation: A clear, concise explanation of why your improved version is better and which IELTS criterion it addresses.

Requirements for comprehensive analysis:
- Analyze EVERY sentence in both tasks
- Provide improvements for all sentences that can be enhanced
- No maximum limit on number of improvements
- Categories include but are not limited to: Grammar (articles, prepositions, tense, subject-verb agreement, sentence fragments, run-on sentences), Vocabulary (word choice, collocations, academic register, precision, variety), Structure (sentence complexity, paragraph organization, transitions, cohesive devices), Task Response (relevance, development, examples, argumentation), Coherence (logical flow, paragraph unity, progression of ideas), Style (formal register, conciseness, clarity, sophistication), Mechanics (punctuation, capitalization, spelling)
- Always preserve the student's original ideas, opinions, and arguments completely
- Focus on elevating expression quality while maintaining content integrity
- Only highlight specific words or phrases that are changed, never entire sentences

Task 1:
Prompt: ${task1Data?.title || 'Task 1'}
Instructions: ${task1Data?.instructions || ''}
${task1Data?.imageContext ? `Visual Data: ${task1Data.imageContext}` : ''}
Student Response: "${task1Answer}"

Task 2:
Prompt: ${task2Data?.title || 'Task 2'}
Instructions: ${task2Data?.instructions || ''}
Student Response: "${task2Answer}"

JSON SCHEMA:
{
  "task1": {
    "criteria": {
      "task_achievement": { 
        "band": 0.0, 
        "justification": "Quote specific examples and reference band descriptors. Must be 2-3 sentences minimum." 
      },
      "coherence_and_cohesion": { 
        "band": 0.0, 
        "justification": "Quote specific examples and reference band descriptors. Must be 2-3 sentences minimum." 
      },
      "lexical_resource": { 
        "band": 0.0, 
        "justification": "Quote specific examples and reference band descriptors. Must be 2-3 sentences minimum." 
      },
      "grammatical_range_and_accuracy": { 
        "band": 0.0, 
        "justification": "Quote specific examples and reference band descriptors. Must be 2-3 sentences minimum." 
      }
    },
    "feedback": {
      "improvements": [
        {
          "issue": "Article Misuse",
          "original": "The graph shows big increase in sales.",
          "improved": "The graph shows a significant increase in sales.",
          "explanation": "Added the missing article 'a' before 'significant increase' - this grammatical accuracy improves the Grammatical Range and Accuracy score."
        },
        {
          "issue": "Word Choice Sophistication",
          "original": "The graph shows a significant increase in sales.",
          "improved": "The chart illustrates a substantial surge in sales revenue.",
          "explanation": "Replaced basic vocabulary ('shows', 'increase') with more academic terms ('illustrates', 'surge') and specified 'sales revenue' for precision (improves Lexical Resource)."
        },
        {
          "issue": "Data Description Precision",
          "original": "The numbers went up a lot during the period.",
          "improved": "The figures demonstrated a marked upward trajectory, rising by 40% over the five-year period.",
          "explanation": "Replaced vague language with specific data references and precise vocabulary, improving Task Achievement through accurate data interpretation."
        },
        {
          "issue": "Sentence Structure Variety",
          "original": "Sales increased. Profits also increased.",
          "improved": "Alongside the substantial increase in sales, profits also experienced corresponding growth.",
          "explanation": "Combined simple sentences using sophisticated linking ('Alongside') and parallel structure, demonstrating better Grammatical Range and improving Coherence."
        },
        {
          "issue": "Tense Consistency",
          "original": "The chart shows that sales have increased in 2020.",
          "improved": "The chart shows that sales increased significantly in 2020.",
          "explanation": "Corrected tense from present perfect to past simple for completed actions in a specific time period, improving grammatical accuracy."
        },
        {
          "issue": "Paragraph Transition",
          "original": "Now I will look at the second part of the data.",
          "improved": "Turning to the latter half of the timeframe, the data reveals contrasting trends.",
          "explanation": "Replaced informal transition with sophisticated academic language that creates smooth flow between ideas (improves Coherence and Cohesion)."
        },
        {
          "issue": "Conclusion Strength",
          "original": "In conclusion, the graph shows different things.",
          "improved": "In summary, the data demonstrates distinct patterns of growth across all measured categories.",
          "explanation": "Enhanced conclusion with specific reference to findings and formal academic register, strengthening Task Achievement and overall clarity."
        }
      ],
      "feedback_markdown": "## Task 1 Detailed Feedback\n\n**Strengths:** List specific Task 1 strengths here.\n\n**Areas for Improvement:** Provide detailed Task 1 feedback here with specific examples."
    },
    "overall_band": 0.0,
    "word_count": ${task1Answer.trim().split(/\s+/).length}
  },
  "task2": {
    "criteria": {
      "task_response": { 
        "band": 0.0, 
        "justification": "Quote specific examples and reference band descriptors. Must be 2-3 sentences minimum." 
      },
      "coherence_and_cohesion": { 
        "band": 0.0, 
        "justification": "Quote specific examples and reference band descriptors. Must be 2-3 sentences minimum." 
      },
      "lexical_resource": { 
        "band": 0.0, 
        "justification": "Quote specific examples and reference band descriptors. Must be 2-3 sentences minimum." 
      },
      "grammatical_range_and_accuracy": { 
        "band": 0.0, 
        "justification": "Quote specific examples and reference band descriptors. Must be 2-3 sentences minimum." 
      }
    },
    "feedback": {
      "improvements": [
        {
          "issue": "Thesis Statement Clarity",
          "original": "I think this is good because people like it.",
          "improved": "This approach proves beneficial as it addresses the fundamental needs of the target population.",
          "explanation": "Replaced informal language ('I think', 'people like it') with formal academic expressions ('proves beneficial', 'fundamental needs') to create a stronger, more precise thesis (improves Task Response and Lexical Resource)."
        },
        {
          "issue": "Sentence Structure Complexity",
          "original": "The company was successful. It made a lot of profit.",
          "improved": "As a result of its successful operational strategy, the company generated substantial revenue streams.",
          "explanation": "Combined simple sentences using sophisticated linking ('As a result of') and enhanced vocabulary ('operational strategy', 'revenue streams'), demonstrating better Grammatical Range and Coherence."
        },
        {
          "issue": "Evidence Integration",
          "original": "Many people agree with this idea.",
          "improved": "Recent surveys conducted by leading research institutions consistently support this perspective.",
          "explanation": "Replaced vague generalization with specific, credible evidence source, strengthening argument development and Task Response effectiveness."
        },
        {
          "issue": "Cohesive Device Sophistication",
          "original": "First, education is important. Second, health is important too.",
          "improved": "While education remains paramount in societal development, healthcare infrastructure proves equally indispensable for long-term prosperity.",
          "explanation": "Replaced basic sequencing with sophisticated contrast structure ('While...remains paramount...proves equally') that creates natural flow and demonstrates advanced Coherence and Cohesion."
        },
        {
          "issue": "Counter-argument Development",
          "original": "Some people disagree but they are wrong.",
          "improved": "Although critics argue that alternative approaches may yield better results, this perspective fails to consider the long-term implications of such policies.",
          "explanation": "Transformed dismissive statement into sophisticated counter-argument acknowledgment with reasoned refutation, improving argumentative structure and Task Response quality."
        },
        {
          "issue": "Conclusion Synthesis",
          "original": "In conclusion, I believe my opinion is correct.",
          "improved": "In light of the evidence presented, it becomes apparent that this approach offers the most viable solution to contemporary challenges.",
          "explanation": "Enhanced conclusion with evidence synthesis and formal academic register, demonstrating sophisticated reasoning and improving overall Task Response effectiveness."
        },
        {
          "issue": "Preposition Accuracy",
          "original": "People are interested for this topic.",
          "improved": "People demonstrate considerable interest in this contemporary issue.",
          "explanation": "Corrected preposition error ('for' to 'in') and enhanced vocabulary ('demonstrate considerable interest', 'contemporary issue'), improving grammatical accuracy and lexical sophistication."
        }
      ],
      "feedback_markdown": "## Task 2 Detailed Feedback\n\n**Strengths:** List specific Task 2 strengths here.\n\n**Areas for Improvement:** Provide detailed Task 2 feedback here with specific examples."
    },
    "overall_band": 0.0,
    "word_count": ${task2Answer.trim().split(/\s+/).length}
  },
  "overall": {
    "band": 0.0,
    "calculation": "Calculation explanation"
  },
  "key_strengths": [
    "List 2-3 specific strengths from both tasks"
  ]
}`;

    // Use selected API provider with fallback
    let aiResponse: any;
    let modelUsed: string;
    let content: string;

    if (apiProvider === 'openai') {
      console.log('🔄 Using OpenAI API...');
      aiResponse = await callOpenAI(masterExaminerPrompt, openaiApiKey);
      modelUsed = 'OpenAI GPT-4.1';
      content = aiResponse.choices?.[0]?.message?.content ?? '';
      console.log('✅ OpenAI API succeeded');
    } else {
      try {
        console.log('🔄 Using Gemini API...');
        aiResponse = await callGemini(masterExaminerPrompt, geminiApiKey);
        modelUsed = 'Google Gemini AI';
        content = aiResponse.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        console.log('✅ Gemini API succeeded');
      } catch (geminiError) {
        console.log('⚠️ Gemini failed, falling back to OpenAI:', geminiError.message);
        if (!openaiApiKey) {
          throw new Error('Gemini quota exceeded and no OpenAI API key available for fallback');
        }
        console.log('🔄 Fallback: Using OpenAI API...');
        aiResponse = await callOpenAI(masterExaminerPrompt, openaiApiKey);
        modelUsed = 'OpenAI GPT-4.1 (Fallback)';
        content = aiResponse.choices?.[0]?.message?.content ?? '';
        console.log('✅ OpenAI fallback succeeded');
      }
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

    // AI handles all scoring and word count considerations internally

    // Validate and add fallback data for frontend compatibility
    if (structured) {
      // Ensure task1 feedback structure exists
      if (!structured.task1?.feedback) {
        structured.task1 = structured.task1 || {};
        structured.task1.feedback = {
          improvements: [],
          feedback_markdown: "## Task 1 Feedback\n\nNo specific improvements available."
        };
      }
      
      // Ensure task2 feedback structure exists
      if (!structured.task2?.feedback) {
        structured.task2 = structured.task2 || {};
        structured.task2.feedback = {
          improvements: [],
          feedback_markdown: "## Task 2 Feedback\n\nNo specific improvements available."
        };
      }
      
      // Migrate legacy specific_improvements to task-specific feedback if needed
      if (structured.specific_improvements && Array.isArray(structured.specific_improvements)) {
        console.log('🔄 Migrating legacy specific_improvements to task-specific format...');
        
        // Split improvements between tasks based on content analysis
        const task1Improvements = [];
        const task2Improvements = [];
        
        structured.specific_improvements.forEach((improvement) => {
          // Simple heuristic: if original text appears in task1Answer, assign to task1, otherwise task2
          if (task1Answer.includes(improvement.original?.substring(0, 50) || '')) {
            task1Improvements.push(improvement);
          } else {
            task2Improvements.push(improvement);
          }
        });
        
        if (task1Improvements.length > 0) {
          structured.task1.feedback.improvements = task1Improvements;
        }
        if (task2Improvements.length > 0) {
          structured.task2.feedback.improvements = task2Improvements;
        }
        
        // Remove legacy field
        delete structured.specific_improvements;
      }
      
      console.log('✅ Response structure validated and enhanced');
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