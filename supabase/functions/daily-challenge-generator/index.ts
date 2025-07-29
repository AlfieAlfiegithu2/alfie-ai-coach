import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const { difficulty = "intermediate", topic = "general" } = await req.json();

    console.log('🎯 Generating daily challenge:', { difficulty, topic });

    const challengePrompt = `Generate a daily English challenge for ${difficulty} level learners focusing on ${topic}. 

Create a JSON response with exactly this structure:
{
  "title": "Challenge title (max 50 chars)",
  "description": "Brief description (max 100 chars)", 
  "type": "vocabulary|grammar|idioms|listening|pronunciation",
  "difficulty": "${difficulty}",
  "content": {
    "question": "Main challenge question",
    "options": ["option1", "option2", "option3", "option4"],
    "correct_answer": "option1",
    "explanation": "Why this is correct and what it teaches"
  },
  "tips": ["tip1", "tip2", "tip3"],
  "bonus_fact": "Interesting language fact related to the challenge"
}

Make it engaging, educational, and appropriate for daily practice. Focus on practical English skills.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an expert English teacher creating daily challenges. Always respond with valid JSON only.' },
          { role: 'user', content: challengePrompt }
        ],
        max_tokens: 800,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const challengeJson = data.choices[0].message.content;

    // Parse the JSON response
    let challenge;
    try {
      challenge = JSON.parse(challengeJson);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      throw new Error('Invalid JSON response from AI');
    }

    // Add metadata
    challenge.generated_at = new Date().toISOString();
    challenge.id = `challenge_${Date.now()}`;

    console.log('✅ Daily challenge generated successfully');

    return new Response(JSON.stringify({ 
      success: true, 
      challenge: challenge
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error generating daily challenge:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});