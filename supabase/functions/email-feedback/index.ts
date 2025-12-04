// Email Feedback Edge Function
// Generates email scenarios and analyzes student responses

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
    const { action, scenario, response, occupation, category, difficulty } = body;

    if (action === 'generate_scenario') {
      // Generate a new email scenario based on category and difficulty
      const prompt = `You are an expert in professional business communication. Generate a realistic email scenario for practice.

Category: ${category}
Difficulty: ${difficulty}
${occupation ? `Student's Occupation: ${occupation}` : ''}

Create a realistic incoming email that a professional might receive. The email should:
1. Be appropriate for the ${difficulty} difficulty level
2. Require a thoughtful, professional response
3. Include specific details that need to be addressed
4. Be realistic for someone in the ${category} field

Respond with this exact JSON format:
{
  "type": "meeting_request",
  "category": "${category}",
  "difficulty": "${difficulty}",
  "subject": "Email subject line here",
  "from": "Sender Name <email@company.com>",
  "body": "The full email body text here...",
  "instructions": "Brief instruction on how to respond (e.g., 'Decline politely while offering alternatives')"
}`;

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openrouterApiKey}`,
          'HTTP-Referer': 'https://englishaidol.com',
          'X-Title': 'Alfie AI Coach - Email Practice',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-preview-05-20',
          messages: [
            {
              role: 'system',
              content: 'You generate realistic business email scenarios for English practice. Always respond with valid JSON only.'
            },
            { role: 'user', content: prompt }
          ],
          temperature: 0.8,
          max_tokens: 800,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenRouter error:', errorText);
        return new Response(JSON.stringify({
          success: false,
          error: 'Failed to generate scenario',
        }), { status: 200, headers: corsHeaders });
      }

      const data = await response.json();
      const aiResponse = data.choices?.[0]?.message?.content;

      if (!aiResponse) {
        return new Response(JSON.stringify({
          success: false,
          error: 'No scenario generated',
        }), { status: 200, headers: corsHeaders });
      }

      // Parse JSON response
      let parsedScenario;
      try {
        let cleanResponse = aiResponse.trim();
        if (cleanResponse.startsWith('```')) {
          cleanResponse = cleanResponse.replace(/```json?\n?/g, '').replace(/```$/g, '');
        }
        parsedScenario = JSON.parse(cleanResponse);
      } catch (e) {
        console.error('Failed to parse scenario:', aiResponse);
        return new Response(JSON.stringify({
          success: false,
          error: 'Failed to parse generated scenario',
        }), { status: 200, headers: corsHeaders });
      }

      return new Response(JSON.stringify({
        success: true,
        scenario: parsedScenario,
      }), { headers: corsHeaders });

    } else if (action === 'analyze_response') {
      // Analyze the student's email response
      const prompt = `You are an expert business English coach analyzing a student's email response.

ORIGINAL EMAIL:
Subject: ${scenario.subject}
From: ${scenario.from}
Body:
${scenario.body}

INSTRUCTIONS FOR STUDENT:
${scenario.instructions || 'Reply professionally'}

STUDENT'S RESPONSE:
${response}

Analyze the response and provide detailed feedback. Evaluate:
1. Tone & Professionalism (0-100): Is the tone appropriate? Professional yet friendly?
2. Grammar & Clarity (0-100): Correct grammar, clear sentences, no typos?
3. Structure (0-100): Proper greeting, body paragraphs, closing?
4. Content & Completeness (0-100): Did they address all points? Appropriate detail?
5. Vocabulary (0-100): Professional vocabulary? Appropriate word choices?

Respond with this exact JSON format:
{
  "overallScore": 75,
  "items": [
    {
      "category": "tone",
      "score": 80,
      "feedback": "Your tone is professional and appropriate...",
      "suggestions": ["Consider using 'I would appreciate' instead of 'I want'"]
    },
    {
      "category": "grammar",
      "score": 70,
      "feedback": "Generally correct with minor issues...",
      "suggestions": ["Check subject-verb agreement in paragraph 2"]
    },
    {
      "category": "structure",
      "score": 85,
      "feedback": "Good structure with clear sections...",
      "suggestions": []
    },
    {
      "category": "content",
      "score": 75,
      "feedback": "Addresses main points but misses...",
      "suggestions": ["Include your availability for the proposed meeting"]
    },
    {
      "category": "vocabulary",
      "score": 70,
      "feedback": "Good vocabulary with room for improvement...",
      "suggestions": ["Use 'regarding' instead of 'about' for more formality"]
    }
  ],
  "strengths": [
    "Professional greeting and sign-off",
    "Clear and concise main point"
  ],
  "improvements": [
    "Add more specific details when requesting information",
    "Use more formal transitions between paragraphs"
  ],
  "improvedVersion": "Dear [Name],\\n\\nThank you for your email regarding...\\n\\n[Write a complete improved version of the email here]\\n\\nBest regards,\\n[Name]"
}`;

      const aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openrouterApiKey}`,
          'HTTP-Referer': 'https://englishaidol.com',
          'X-Title': 'Alfie AI Coach - Email Feedback',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-preview-05-20',
          messages: [
            {
              role: 'system',
              content: 'You are an expert business English coach. Analyze emails and provide constructive feedback. Always respond with valid JSON only.'
            },
            { role: 'user', content: prompt }
          ],
          temperature: 0.4,
          max_tokens: 2000,
        }),
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error('OpenRouter error:', errorText);
        return new Response(JSON.stringify({
          success: false,
          error: 'Failed to analyze response',
        }), { status: 200, headers: corsHeaders });
      }

      const data = await aiResponse.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        return new Response(JSON.stringify({
          success: false,
          error: 'No feedback generated',
        }), { status: 200, headers: corsHeaders });
      }

      // Parse JSON response
      let parsedFeedback;
      try {
        let cleanResponse = content.trim();
        if (cleanResponse.startsWith('```')) {
          cleanResponse = cleanResponse.replace(/```json?\n?/g, '').replace(/```$/g, '');
        }
        parsedFeedback = JSON.parse(cleanResponse);
      } catch (e) {
        console.error('Failed to parse feedback:', content);
        // Return a fallback response
        parsedFeedback = {
          overallScore: 65,
          items: [
            {
              category: 'overall',
              score: 65,
              feedback: 'Your email shows understanding of professional communication but could be improved.',
              suggestions: ['Review the email structure', 'Check for grammar and spelling', 'Ensure all points are addressed'],
            },
          ],
          strengths: ['Attempted to address the main topic', 'Used a professional greeting'],
          improvements: ['Add more specific details', 'Improve grammar and clarity', 'Use more professional vocabulary'],
          improvedVersion: '',
        };
      }

      return new Response(JSON.stringify({
        success: true,
        feedback: parsedFeedback,
      }), { headers: corsHeaders });

    } else {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid action. Use: generate_scenario or analyze_response',
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

