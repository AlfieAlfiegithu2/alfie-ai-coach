// Interview Evaluator Edge Function
// Generates interview questions, grades answers, and provides comprehensive feedback

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const openrouterApiKey = Deno.env.get('OPENROUTER_API_KEY');
    if (!openrouterApiKey) {
      return new Response(JSON.stringify({
        success: false,
        error: 'API key not configured',
      }), { status: 200, headers: corsHeaders });
    }

    const body = await req.json();
    const { action, occupation, industry, question, answer, gradingMode, questions, count } = body;

    if (action === 'generate_questions') {
      // Generate occupation-specific interview questions
      const prompt = `You are an expert HR interviewer and career coach. Generate ${count || 10} interview questions for a ${occupation} position${industry ? ` in the ${industry} industry` : ''}.

Create a mix of:
- 4 behavioral questions (STAR method - Situation, Task, Action, Result)
- 3 situational questions (hypothetical scenarios)
- 3 technical/role-specific questions

Each question should be:
1. Clear and professional
2. Open-ended (not yes/no)
3. Relevant to the ${occupation} role
4. Designed to reveal the candidate's skills and experience

Respond with a JSON array of exactly ${count || 10} question strings, nothing else:
["Question 1 here?", "Question 2 here?", ...]`;

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openrouterApiKey}`,
          'HTTP-Referer': 'https://englishaidol.com',
          'X-Title': 'Alfie AI Coach - Interview Generator',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-preview-05-20',
          messages: [
            {
              role: 'system',
              content: 'You are an expert interviewer. Generate professional interview questions. Respond with valid JSON only.'
            },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 1500,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenRouter error:', errorText);
        return new Response(JSON.stringify({
          success: false,
          error: 'Failed to generate questions',
        }), { status: 200, headers: corsHeaders });
      }

      const data = await response.json();
      const aiResponse = data.choices?.[0]?.message?.content;

      if (!aiResponse) {
        return new Response(JSON.stringify({
          success: false,
          error: 'No questions generated',
        }), { status: 200, headers: corsHeaders });
      }

      // Parse JSON response
      let parsedQuestions;
      try {
        let cleanResponse = aiResponse.trim();
        if (cleanResponse.startsWith('```')) {
          cleanResponse = cleanResponse.replace(/```json?\n?/g, '').replace(/```$/g, '');
        }
        parsedQuestions = JSON.parse(cleanResponse);
      } catch (e) {
        console.error('Failed to parse questions:', aiResponse);
        // Fallback generic questions
        parsedQuestions = [
          `Tell me about yourself and why you're interested in this ${occupation} position.`,
          `What relevant experience do you have for this role?`,
          `Describe a challenging project you've worked on and how you handled it.`,
          `How do you prioritize tasks when you have multiple deadlines?`,
          `Tell me about a time you had to work with a difficult colleague.`,
          `What's your greatest professional achievement?`,
          `How do you stay updated with industry trends?`,
          `Describe a time you had to learn something new quickly.`,
          `What would you do in your first 90 days in this role?`,
          `Do you have any questions for me about this position?`,
        ];
      }

      return new Response(JSON.stringify({
        success: true,
        questions: parsedQuestions,
      }), { headers: corsHeaders });

    } else if (action === 'grade_answer') {
      // Grade a single answer
      const isEnglishGrading = gradingMode === 'quality_and_english';
      
      const prompt = `You are an expert interviewer and ${isEnglishGrading ? 'English language coach' : 'career coach'}. Evaluate this interview answer.

Question: ${question}
Candidate's Answer: ${answer}
Role: ${occupation}

${isEnglishGrading ? `
Evaluate TWO aspects:

1. ANSWER QUALITY (1-10):
- Relevance to the question
- Structure and organization (STAR method if applicable)
- Depth and specificity
- Use of concrete examples
- Professionalism

2. ENGLISH PROFICIENCY (1-10):
- Grammar accuracy
- Vocabulary appropriateness and variety
- Fluency and coherence
- Clarity of expression
- Pronunciation indicators (based on common speech patterns)
` : `
Evaluate ANSWER QUALITY (1-10):
- Relevance to the question
- Structure and organization (STAR method if applicable)
- Depth and specificity
- Use of concrete examples
- Professionalism
`}

Respond with this exact JSON format:
{
  "qualityScore": 7,
  ${isEnglishGrading ? '"englishScore": 7,' : ''}
  "feedback": "Brief 1-2 sentence feedback highlighting the main strength and one area for improvement"
}`;

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openrouterApiKey}`,
          'HTTP-Referer': 'https://englishaidol.com',
          'X-Title': 'Alfie AI Coach - Interview Grader',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-preview-05-20',
          messages: [
            {
              role: 'system',
              content: 'You are an expert interview evaluator. Be fair but constructive. Respond with valid JSON only.'
            },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenRouter error:', errorText);
        return new Response(JSON.stringify({
          success: false,
          error: 'Failed to grade answer',
        }), { status: 200, headers: corsHeaders });
      }

      const data = await response.json();
      const aiResponse = data.choices?.[0]?.message?.content;

      if (!aiResponse) {
        return new Response(JSON.stringify({
          success: false,
          error: 'No grade generated',
        }), { status: 200, headers: corsHeaders });
      }

      // Parse JSON response
      let parsedGrade;
      try {
        let cleanResponse = aiResponse.trim();
        if (cleanResponse.startsWith('```')) {
          cleanResponse = cleanResponse.replace(/```json?\n?/g, '').replace(/```$/g, '');
        }
        parsedGrade = JSON.parse(cleanResponse);
      } catch (e) {
        console.error('Failed to parse grade:', aiResponse);
        parsedGrade = {
          qualityScore: 5,
          englishScore: isEnglishGrading ? 5 : undefined,
          feedback: 'Your answer addresses the question. Try to include more specific examples and details.',
        };
      }

      return new Response(JSON.stringify({
        success: true,
        qualityScore: parsedGrade.qualityScore || 5,
        englishScore: isEnglishGrading ? (parsedGrade.englishScore || 5) : undefined,
        feedback: parsedGrade.feedback || '',
      }), { headers: corsHeaders });

    } else if (action === 'generate_summary') {
      // Generate overall interview summary
      const isEnglishGrading = gradingMode === 'quality_and_english';
      
      // Calculate averages
      const qualityScores = questions.filter((q: any) => q.qualityScore !== undefined).map((q: any) => q.qualityScore);
      const avgQualityScore = qualityScores.length > 0 
        ? qualityScores.reduce((a: number, b: number) => a + b, 0) / qualityScores.length 
        : 5;

      let avgEnglishScore;
      if (isEnglishGrading) {
        const englishScores = questions.filter((q: any) => q.englishScore !== undefined).map((q: any) => q.englishScore);
        avgEnglishScore = englishScores.length > 0 
          ? englishScores.reduce((a: number, b: number) => a + b, 0) / englishScores.length 
          : 5;
      }

      const prompt = `You are an expert career coach providing interview feedback for a ${occupation} candidate.

Interview Results:
${questions.map((q: any, i: number) => `
Q${i + 1}: ${q.question}
Answer: ${q.answer || 'Skipped'}
Quality Score: ${q.qualityScore || 'N/A'}/10
${isEnglishGrading ? `English Score: ${q.englishScore || 'N/A'}/10` : ''}
`).join('\n')}

Average Quality Score: ${avgQualityScore.toFixed(1)}/10
${isEnglishGrading ? `Average English Score: ${avgEnglishScore?.toFixed(1)}/10` : ''}

Provide a comprehensive interview summary with:
1. Overall feedback (2-3 sentences)
2. 3 specific strengths demonstrated
3. 3 specific areas for improvement
${isEnglishGrading ? '4. English language tips' : ''}

Respond with this exact JSON format:
{
  "summaryFeedback": "Overall feedback here...",
  "strengths": ["Strength 1", "Strength 2", "Strength 3"],
  "areasToImprove": ["Area 1", "Area 2", "Area 3"]${isEnglishGrading ? ',\n  "englishTips": ["Tip 1", "Tip 2"]' : ''}
}`;

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openrouterApiKey}`,
          'HTTP-Referer': 'https://englishaidol.com',
          'X-Title': 'Alfie AI Coach - Interview Summary',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-preview-05-20',
          messages: [
            {
              role: 'system',
              content: 'You are an expert career coach. Provide constructive, encouraging feedback. Respond with valid JSON only.'
            },
            { role: 'user', content: prompt }
          ],
          temperature: 0.5,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenRouter error:', errorText);
        return new Response(JSON.stringify({
          success: false,
          error: 'Failed to generate summary',
        }), { status: 200, headers: corsHeaders });
      }

      const data = await response.json();
      const aiResponse = data.choices?.[0]?.message?.content;

      if (!aiResponse) {
        return new Response(JSON.stringify({
          success: false,
          error: 'No summary generated',
        }), { status: 200, headers: corsHeaders });
      }

      // Parse JSON response
      let parsedSummary;
      try {
        let cleanResponse = aiResponse.trim();
        if (cleanResponse.startsWith('```')) {
          cleanResponse = cleanResponse.replace(/```json?\n?/g, '').replace(/```$/g, '');
        }
        parsedSummary = JSON.parse(cleanResponse);
      } catch (e) {
        console.error('Failed to parse summary:', aiResponse);
        parsedSummary = {
          summaryFeedback: 'Thank you for completing the interview practice. Your answers showed good understanding of the role requirements. Continue practicing to refine your responses.',
          strengths: ['Attempted all questions', 'Showed relevant knowledge', 'Maintained professional tone'],
          areasToImprove: ['Add more specific examples', 'Use the STAR method consistently', 'Practice concise responses'],
        };
      }

      return new Response(JSON.stringify({
        success: true,
        overallQualityScore: Number(avgQualityScore.toFixed(1)),
        overallEnglishScore: isEnglishGrading ? Number(avgEnglishScore?.toFixed(1)) : undefined,
        summaryFeedback: parsedSummary.summaryFeedback || '',
        strengths: parsedSummary.strengths || [],
        areasToImprove: parsedSummary.areasToImprove || [],
        englishTips: isEnglishGrading ? parsedSummary.englishTips : undefined,
      }), { headers: corsHeaders });

    } else {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid action. Use: generate_questions, grade_answer, or generate_summary',
      }), { status: 200, headers: corsHeaders });
    }

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), { status: 200, headers: corsHeaders });
  }
});

