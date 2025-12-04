// Resume AI Assistant Edge Function
// Handles job post analysis, ATS scoring, and cover letter generation

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
    const { action, jobPost, resumeData, companyName, position } = body;

    if (action === 'analyze_job') {
      // Analyze job post and score resume against it
      const prompt = `You are an expert ATS (Applicant Tracking System) analyzer and career coach.

Analyze this job description and compare it to the candidate's resume to provide:
1. Extract the top 10-15 most important keywords/skills from the job description
2. Calculate an ATS match score (0-100) based on how well the resume matches the job requirements
3. Provide 5 specific, actionable suggestions to improve the resume for this role

Job Description:
${jobPost}

Candidate's Resume:
Name: ${resumeData?.fullName || 'Not provided'}
Summary: ${resumeData?.summary || 'Not provided'}
Experience: ${JSON.stringify(resumeData?.experience || [])}
Skills: ${(resumeData?.skills || []).join(', ')}
Education: ${JSON.stringify(resumeData?.education || [])}

Respond in this exact JSON format:
{
  "keywords": ["keyword1", "keyword2", ...],
  "atsScore": 75,
  "suggestions": [
    "Add specific metrics to your achievement about...",
    "Include the keyword 'data analysis' which appears 5 times in the job description",
    ...
  ],
  "missingKeywords": ["keyword that appears in job but not resume", ...],
  "strongMatches": ["skill that strongly matches", ...]
}`;

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openrouterApiKey}`,
          'HTTP-Referer': 'https://englishaidol.com',
          'X-Title': 'Alfie AI Coach - Resume Analyzer',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-preview-05-20',
          messages: [
            {
              role: 'system',
              content: 'You are an expert ATS analyzer. Always respond with valid JSON only, no markdown or explanations.'
            },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
          max_tokens: 1500,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenRouter error:', errorText);
        return new Response(JSON.stringify({
          success: false,
          error: 'AI analysis failed',
          details: errorText,
        }), { status: 200, headers: corsHeaders });
      }

      const data = await response.json();
      const aiResponse = data.choices?.[0]?.message?.content;

      if (!aiResponse) {
        return new Response(JSON.stringify({
          success: false,
          error: 'No response from AI',
        }), { status: 200, headers: corsHeaders });
      }

      // Parse JSON response
      let parsedResponse;
      try {
        // Clean the response - remove markdown code blocks if present
        let cleanResponse = aiResponse.trim();
        if (cleanResponse.startsWith('```')) {
          cleanResponse = cleanResponse.replace(/```json?\n?/g, '').replace(/```$/g, '');
        }
        parsedResponse = JSON.parse(cleanResponse);
      } catch (e) {
        console.error('Failed to parse AI response:', aiResponse);
        // Return a fallback response
        parsedResponse = {
          keywords: ['leadership', 'communication', 'teamwork', 'problem-solving', 'technical skills'],
          atsScore: 50,
          suggestions: [
            'Add more specific keywords from the job description',
            'Include quantifiable achievements with metrics',
            'Tailor your summary to match the role requirements',
            'Add relevant certifications or training',
            'Use industry-standard terminology',
          ],
        };
      }

      return new Response(JSON.stringify({
        success: true,
        keywords: parsedResponse.keywords || [],
        atsScore: parsedResponse.atsScore || 50,
        suggestions: parsedResponse.suggestions || [],
        missingKeywords: parsedResponse.missingKeywords || [],
        strongMatches: parsedResponse.strongMatches || [],
      }), { headers: corsHeaders });

    } else if (action === 'generate_cover_letter') {
      // Generate a personalized cover letter
      const prompt = `You are an expert career coach and professional writer. Write a compelling, personalized cover letter.

Candidate Information:
Name: ${resumeData?.fullName || 'Candidate'}
Summary: ${resumeData?.summary || 'Professional seeking new opportunities'}
Key Experience: ${resumeData?.experience?.slice(0, 2).map((e: any) => `${e.position} at ${e.company}`).join(', ') || 'Various professional roles'}
Skills: ${(resumeData?.skills || []).slice(0, 8).join(', ')}

Target Position: ${position}
Target Company: ${companyName}

${jobPost ? `Job Description:\n${jobPost.substring(0, 1500)}` : ''}

Write a professional cover letter that:
1. Opens with a compelling hook that shows enthusiasm for the company and role
2. Highlights 2-3 relevant achievements that match the job requirements
3. Shows knowledge of the company (if company is well-known)
4. Ends with a confident call to action
5. Keeps a professional yet personable tone
6. Is approximately 300-400 words

Write the cover letter directly without any preamble or explanation.`;

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openrouterApiKey}`,
          'HTTP-Referer': 'https://englishaidol.com',
          'X-Title': 'Alfie AI Coach - Cover Letter',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-preview-05-20',
          messages: [
            {
              role: 'system',
              content: 'You are an expert career coach who writes compelling, professional cover letters. Write directly without explanations.'
            },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenRouter error:', errorText);
        return new Response(JSON.stringify({
          success: false,
          error: 'Cover letter generation failed',
        }), { status: 200, headers: corsHeaders });
      }

      const data = await response.json();
      const coverLetter = data.choices?.[0]?.message?.content;

      if (!coverLetter) {
        return new Response(JSON.stringify({
          success: false,
          error: 'No cover letter generated',
        }), { status: 200, headers: corsHeaders });
      }

      return new Response(JSON.stringify({
        success: true,
        coverLetter: coverLetter.trim(),
      }), { headers: corsHeaders });

    } else if (action === 'improve_summary') {
      // Generate an improved professional summary
      const prompt = `Improve this professional summary for a ${resumeData?.occupation || 'professional'}.

Current Summary: ${resumeData?.summary || 'No summary provided'}
Skills: ${(resumeData?.skills || []).join(', ')}
Latest Role: ${resumeData?.experience?.[0]?.position || 'Not specified'} at ${resumeData?.experience?.[0]?.company || 'Not specified'}

${jobPost ? `Target Job:\n${jobPost.substring(0, 500)}` : ''}

Write a 2-3 sentence professional summary that:
1. Highlights years of experience and key expertise
2. Mentions 2-3 most relevant skills
3. Includes a notable achievement if possible
4. Matches the tone expected in the target industry

Write only the summary, nothing else.`;

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openrouterApiKey}`,
          'HTTP-Referer': 'https://englishaidol.com',
          'X-Title': 'Alfie AI Coach - Summary',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-preview-05-20',
          messages: [
            { role: 'user', content: prompt }
          ],
          temperature: 0.6,
          max_tokens: 300,
        }),
      });

      if (!response.ok) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Summary improvement failed',
        }), { status: 200, headers: corsHeaders });
      }

      const data = await response.json();
      const improvedSummary = data.choices?.[0]?.message?.content;

      return new Response(JSON.stringify({
        success: true,
        summary: improvedSummary?.trim() || '',
      }), { headers: corsHeaders });

    } else {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid action. Use: analyze_job, generate_cover_letter, or improve_summary',
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

