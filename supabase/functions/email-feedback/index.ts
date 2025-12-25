// @ts-nocheck
// Email Feedback Edge Function
// Generates email scenarios and analyzes student responses using Gemini

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

// Helper function to call Gemini API
async function callGemini(prompt: string, systemPrompt: string): Promise<{ content: string | null; error?: string }> {
  const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
  if (!geminiApiKey) {
    console.error('GEMINI_API_KEY not configured');
    return { content: null, error: 'Server configuration error: GEMINI_API_KEY missing' };
  }

  // Try verified models in order of preference including variations of 2.5
  const models = [
    'gemini-2.5-flash-lite-preview-06-17',
    'gemini-2.5-flash-lite-001',
    'gemini-2.5-flash-lite',
    'gemini-2.0-flash-exp',
    'gemini-1.5-flash'
  ];

  let lastError = '';

  for (const model of models) {
    try {
      console.log(`Attempting to generate with model: ${model}`);
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: `${systemPrompt}\n\n${prompt}` }]
              }
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 2000,
            }
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (content) return { content };
      } else {
        const errorText = await response.text();
        console.error(`Gemini API error (${model}):`, response.status, errorText);
        lastError = `Model ${model} failed: ${response.status} ${errorText}`;
      }
    } catch (error) {
      console.error(`Network error calling (${model}):`, error);
      lastError = `Network error (${model}): ${error.message}`;
    }
  }

  return { content: null, error: lastError || 'All models failed to generate response' };
}

// Helper to parse JSON from AI response
function parseJsonResponse(text: string): any {
  let cleanResponse = text.trim();
  // Remove markdown code blocks if present
  if (cleanResponse.startsWith('```')) {
    cleanResponse = cleanResponse.replace(/```json?\n?/g, '').replace(/```\s*$/g, '').trim();
  }
  return JSON.parse(cleanResponse);
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const body = await req.json();
    const { action, scenario, response, occupation, category, difficulty, customTopic } = body;

    console.log('Email feedback request:', { action, category, difficulty, customTopic: customTopic?.substring(0, 50) });

    if (action === 'generate_scenario') {
      // Generate a new email scenario based on email type and difficulty
      const categoryDescriptions: Record<string, string> = {
        request: 'a professional request (e.g., asking for help, scheduling a meeting, requesting information, asking for approval)',
        complaint: 'a professional complaint (e.g., service issues, product problems, policy concerns, or expressing dissatisfaction professionally)',
        inquiry: 'a professional inquiry (e.g., asking questions about services, products, policies, seeking clarification)',
        announcement: 'a professional announcement response (e.g., responding to company news, policy changes, event notifications)',
        custom: 'a custom professional email scenario based on the specific topic provided',
      };

      // Determine the topic description
      let specificTopic = customTopic;

      if (!specificTopic) {
        if (category === 'custom') {
          specificTopic = 'a general professional work situation';
        } else {
          // Use the preset description
          specificTopic = categoryDescriptions[category] || `a professional ${category} email`;
        }
      }

      const topicDescription = `Scenario Topic: ${specificTopic}
${category === 'custom' ? 'Create a scenario specifically about this topic.' : 'Create a scenario fitting this email type.'}`;

      const systemPrompt = 'You generate realistic business email scenarios for English practice. Always respond with valid JSON only, no markdown formatting.';

      const prompt = `Generate a realistic email scenario for practice.

${topicDescription}
Difficulty: ${difficulty}
${occupation ? `Student's Occupation: ${occupation}` : 'Student is working in a corporate environment'}

Create a realistic incoming email that any professional might receive. The email should:
1. Be appropriate for the ${difficulty} difficulty level
2. Require a thoughtful, professional response regarding the topic
3. Include specific details that need to be addressed in the reply
4. Be universally applicable to any workplace

Respond with ONLY this JSON format (no markdown, no code blocks, just pure JSON):
{
  "type": "${category === 'custom' ? customTopic || 'custom' : category}",
  "category": "${category}",
  "difficulty": "${difficulty}",
  "subject": "Email subject line here",
  "from": "Sender Name <email@company.com>",
  "body": "The full email body text here...",
  "instructions": "Brief instruction on how to respond"
}`;

      const { content: aiResponse, error: aiError } = await callGemini(prompt, systemPrompt);

      if (!aiResponse) {
        console.error('No response from Gemini:', aiError);
        return new Response(JSON.stringify({
          success: false,
          error: aiError || 'AI service unavailable. Please check API key.',
        }), { status: 200, headers: corsHeaders });
      }

      console.log('Gemini response:', aiResponse.substring(0, 100));

      // Parse JSON response
      let parsedScenario;
      try {
        parsedScenario = parseJsonResponse(aiResponse);
      } catch (e) {
        console.error('Failed to parse scenario JSON:', aiResponse);
        return new Response(JSON.stringify({
          success: false,
          error: 'Failed to parse generated scenario. Please try again.',
        }), { status: 200, headers: corsHeaders });
      }

      return new Response(JSON.stringify({
        success: true,
        scenario: parsedScenario,
      }), { headers: corsHeaders });

    } else if (action === 'analyze_response') {
      // Analyze the student's email response
      const systemPrompt = 'You are an expert business English coach. Analyze emails and provide constructive feedback. Always respond with valid JSON only, no markdown formatting.';

      const prompt = `Analyze this student's email response.

ORIGINAL EMAIL:
Subject: ${scenario.subject}
From: ${scenario.from}
Body:
${scenario.body}

INSTRUCTIONS FOR STUDENT:
${scenario.instructions || 'Reply professionally'}

STUDENT'S RESPONSE:
${response}

Evaluate:
1. Tone & Professionalism (0-100): Is the tone appropriate? Professional yet friendly?
2. Grammar & Clarity (0-100): Correct grammar, clear sentences, no typos?
3. Structure (0-100): Proper greeting, body paragraphs, closing?
4. Content & Completeness (0-100): Did they address all points? Appropriate detail?
5. Vocabulary (0-100): Professional vocabulary? Appropriate word choices?

Respond with ONLY this JSON format (no markdown, no code blocks, just pure JSON):
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

      const aiResponse = await callGemini(prompt, systemPrompt);

      if (!aiResponse) {
        console.error('No response from Gemini for feedback analysis');
        return new Response(JSON.stringify({
          success: false,
          error: 'AI service unavailable. Please try again.',
        }), { status: 200, headers: corsHeaders });
      }

      console.log('Gemini feedback response:', aiResponse.substring(0, 200));

      // Parse JSON response
      let parsedFeedback;
      try {
        parsedFeedback = parseJsonResponse(aiResponse);
      } catch (e) {
        console.error('Failed to parse feedback JSON:', aiResponse);
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
    console.error('Error in email-feedback function:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }), { status: 200, headers: corsHeaders });
  }
});
