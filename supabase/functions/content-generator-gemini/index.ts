// @ts-ignore
import "https://deno.land/x/xhr@0.1.0/mod.ts";
// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

// @ts-ignore
declare const Deno: any;
import {
  verifyJWT,
  checkRateLimit,
  incrementAPICallCount,
  validateInputSize,
  getSecureCorsHeaders
} from "../rate-limiter-utils.ts";

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
      console.error('❌ Authentication failed for content-generator-gemini');
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

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('Gemini API key not configured');
    }

    const { contentType, level, count = 10 } = bodyJson;

    let prompt = '';

    switch (contentType) {
      case 'vocabulary':
        prompt = `Generate ${count} vocabulary lessons for ${level} level English learners. Each lesson should include:
        - 10-15 new words with definitions
        - Example sentences
        - Usage tips
        - Memory techniques
        Format as JSON array with structure: { "title": "Lesson Title", "words": [{"word": "example", "definition": "meaning", "example": "sentence", "tip": "memory tip"}], "exercises": ["exercise1", "exercise2"] }`;
        break;
      case 'grammar':
        prompt = `Generate ${count} grammar lessons for ${level} level English learners. Cover topics like:
        - Tenses, conditionals, passive voice, articles, prepositions
        - Clear explanations with examples
        - Practice exercises
        Format as JSON array with structure: { "title": "Grammar Topic", "explanation": "detailed explanation", "examples": ["example1", "example2"], "exercises": [{"question": "fill blank", "answer": "correct answer"}] }`;
        break;
      case 'conversation':
        prompt = `Generate ${count} conversation practice scenarios for ${level} level English learners. Include:
        - Real-life situations (shopping, job interviews, social events)
        - Useful phrases and expressions
        - Role-play activities
        Format as JSON array with structure: { "title": "Scenario Title", "situation": "description", "phrases": ["useful phrase 1", "phrase 2"], "dialogue": "sample conversation", "practice_questions": ["question1", "question2"] }`;
        break;
      default:
        throw new Error('Invalid content type');
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
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
          temperature: 0.3,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 4096,
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Gemini API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const generatedContent = data.candidates[0].content.parts[0].text;

    // Try to parse JSON, fallback to raw text if parsing fails
    let parsedContent;
    try {
      parsedContent = JSON.parse(generatedContent.replace(/```json\n?|\n?```/g, ''));
    } catch {
      parsedContent = [{ title: `${contentType} content`, content: generatedContent }];
    }

    console.log('✅ Content generated successfully with Gemini');

    // 4. Track Successful Call
    await incrementAPICallCount(user.userId);

    return new Response(JSON.stringify({
      success: true,
      content: parsedContent,
      contentType,
      level,
      generatedAt: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in content-generator-gemini:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});