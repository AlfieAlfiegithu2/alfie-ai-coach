// @ts-nocheck
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

// Helper function to call Gemini API
async function callGemini(prompt: string, systemPrompt: string, jsonMode: boolean = false): Promise<string | null> {
  const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
  if (!geminiApiKey) {
    console.error('GEMINI_API_KEY not configured');
    throw new Error('GEMINI_API_KEY not configured');
  }

  // Try verified models in order of preference
  const models = [
    'gemini-2.5-flash-lite-preview-06-17',
    'gemini-2.5-flash-lite-001',
    'gemini-2.0-flash-exp',
    'gemini-1.5-flash'
  ];

  let lastError = '';

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`;

      const body = {
        contents: [{
          role: 'user',
          parts: [{ text: prompt }]
        }],
        system_instruction: {
          parts: [{ text: systemPrompt }]
        },
        generationConfig: {
          temperature: 0.7,
          response_mime_type: jsonMode ? "application/json" : "text/plain"
        }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Gemini API error (${model}):`, response.status, errorText);
        lastError = `Model ${model} failed: ${response.status} ${errorText}`;
        continue;
      }

      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (content) return content;

    } catch (error) {
      console.error(`Network error calling (${model}):`, error);
      lastError = error.message;
    }
  }

  throw new Error(lastError || 'All models failed to generate response');
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const { action, jobPost, resumeData, companyName, position } = await req.json();

    if (action === 'analyze_job') {
      const prompt = `
      You are an expert ATS (Applicant Tracking System) analyzer and career coach.
      Analyze this job description and compare it to the candidate's resume.

      Job Description:
      ${jobPost}

      Candidate Resume:
      Name: ${resumeData?.fullName || 'Not provided'}
      Summary: ${resumeData?.summary || 'Not provided'}
      Experience: ${JSON.stringify(resumeData?.experience || [])}
      Skills: ${(resumeData?.skills || []).join(', ')}
      Education: ${JSON.stringify(resumeData?.education || [])}

      Provide your analysis in this exact JSON format:
      {
        "keywords": ["keyword1", "keyword2", ... (top 10-15 keywords from job)],
        "atsScore": 75, (0-100 match score)
        "suggestions": ["suggestion1", "suggestion2", ... (5 actionable tips)],
        "missingKeywords": ["keyword1", ...],
        "strongMatches": ["skill1", ...]
      }
      `;

      const systemPrompt = "You are an expert ATS analyzer. Respond with valid JSON only.";
      const result = await callGemini(prompt, systemPrompt, true);

      if (!result) throw new Error("No result from AI");
      const parsed = JSON.parse(result);

      return new Response(JSON.stringify({
        success: true,
        ...parsed
      }), { headers: corsHeaders });

    } else if (action === 'generate_cover_letter') {
      const prompt = `
      You are an expert career coach and professional writer. Write a compelling, personalized cover letter.
      
      Candidate:
      Name: ${resumeData?.fullName || 'Candidate'}
      Summary: ${resumeData?.summary || ''}
      Experience: ${resumeData?.experience?.map(e => `${e.position} at ${e.company}`).join(', ') || ''}
      Skills: ${(resumeData?.skills || []).slice(0, 10).join(', ')}

      Target Position: ${position}
      Target Company: ${companyName}

      Job Description Context:
      ${jobPost ? jobPost.substring(0, 2000) : 'No description provided'}

      Write a professional cover letter (300-400 words) that:
      1. Opens with a compelling hook showing enthusiasm.
      2. Highlights relevant achievements matching the job.
      3. Ends with a confident call to action.
      4. No markdown headers, just the body text (Dear Hiring Manager...).
      `;

      const systemPrompt = "You are an expert cover letter writer.";
      const result = await callGemini(prompt, systemPrompt, false);

      return new Response(JSON.stringify({
        success: true,
        coverLetter: result
      }), { headers: corsHeaders });

    } else if (action === 'improve_summary') {
      const prompt = `
      Improve this professional summary for a ${resumeData?.occupation || 'professional'}:
      
      Current Summary: "${resumeData?.summary || ''}"
      Skills: ${(resumeData?.skills || []).join(', ')}
      Latest Role: ${resumeData?.experience?.[0]?.position || ''}
      
      Target Job Context: ${jobPost ? jobPost.substring(0, 500) : ''}
      
      Write a 2-3 sentence professional summary that highlights expertise, skills, and achievements matching the industry tone. Return ONLY the text.
      `;

      const systemPrompt = "You are a professional resume writer.";
      const result = await callGemini(prompt, systemPrompt, false);

      return new Response(JSON.stringify({
        success: true,
        summary: result?.trim()
      }), { headers: corsHeaders });
    }

    return new Response(JSON.stringify({
      success: false,
      error: 'Invalid action'
    }), { status: 400, headers: corsHeaders });

  } catch (error) {
    console.error('Function error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Internal Server Error'
    }), { status: 200, headers: corsHeaders }); // Return 200 for frontend to handle error gracefully
  }
});
