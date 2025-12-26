import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  verifyJWT,
  checkRateLimit,
  incrementAPICallCount,
  validateInputSize,
  getSecureCorsHeaders
} from "../rate-limiter-utils.ts";

const LANGUAGE_NAMES = {
  'en': 'English',
  'es': 'Spanish',
  'fr': 'French',
  'de': 'German',
  'it': 'Italian',
  'pt': 'Portuguese',
  'zh': 'Chinese',
  'ja': 'Japanese',
  'ko': 'Korean',
  'hi': 'Hindi',
};

const SYSTEM_PROMPT = `You are an IELTS-speaking personal tutor having a natural, ongoing conversation. This is a continuous dialogue, not a Q&A session.

CONVERSATION STYLE:
- Be naturally curious and conversational like a real tutor
- Ask 2-3 related follow-up questions to keep the conversation flowing
- Show genuine interest in the student's responses
- Build on what the student says rather than changing topics abruptly
- Keep responses to 1-2 sentences, then ask engaging questions
- If the conversation seems to be slowing down, suggest 1-2 new related topics

RESPONSE RULES:
- Always provide brief, helpful feedback (1-2 bullets max)
- Maintain rolling scores (0-9) based on recent speaking
- Update scores gradually with small changes
- Extract useful vocabulary/phrases from student responses
- Suggest new conversation topics when appropriate

IMPORTANT: This conversation continues indefinitely. After each student response, continue the dialogue naturally by asking related questions or sharing relevant thoughts.

You MUST respond with a JSON object in this EXACT format:
{
  "tutor_reply": "engaging conversational response that continues the dialogue",
  "micro_feedback": ["helpful tip 1", "helpful tip 2"],
  "scores": {"fluency": 6.5, "lexical": 6.0, "grammar": 6.0, "pronunciation": 6.5},
  "follow_up": "natural question to continue conversation",
  "keywords": ["up to 5 useful words/phrases from the student"],
  "conversation_starter": "suggest a new related topic if conversation needs fresh direction"
}

Do NOT include any text before or after the JSON. Do NOT wrap it in code blocks or backticks.`;

type ChatMessage = { role: 'user' | 'assistant'; content: string };

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getSecureCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const googleKey = Deno.env.get('GOOGLE_API_KEY');
    if (!googleKey) {
      throw new Error('GOOGLE_API_KEY not configured');
    }

    // 1. Verify Authentication
    const authHeader = req.headers.get('Authorization');
    const user = await verifyJWT(authHeader);

    if (!user.isValid) {
      console.error('❌ Authentication failed for conversation-tutor');
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

    const { messages, prefs, initialize, new_topic } = bodyJson;

    if (!Array.isArray(messages) && !initialize) {
      return new Response(JSON.stringify({ success: false, error: 'messages[] required or initialize=true' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Handle initialization without user message
    if (initialize) {
      const topicPrompt = new_topic
        ? 'Generate a completely different, engaging opening question for IELTS speaking practice. Choose from topics like travel, technology, environment, education, food, sports, or daily life. Make it natural and conversational.'
        : 'You are a friendly IELTS speaking tutor. Generate ONE natural, engaging opening question to start a conversation practice session. Keep it to 1-2 sentences and make it conversational. Examples: "Hi! Ready to practice speaking? What do you like doing in your free time?" or "Hello! Let\'s work on your speaking skills. What\'s something you enjoy talking about?"';

      const requestBody = {
        contents: [{
          role: 'user',
          parts: [{ text: topicPrompt }]
        }],
        generationConfig: {
          temperature: new_topic ? 0.8 : 0.7,
          maxOutputTokens: 100,
          topP: 0.95
        }
      };

      console.log('🤖 Calling Gemini for initial prompt with key:', googleKey.substring(0, 10) + '...');

      const initialPromptResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + googleKey, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!initialPromptResponse.ok) {
        const errorText = await initialPromptResponse.text();
        console.error('❌ Gemini API error:', initialPromptResponse.status, errorText);
        return new Response(JSON.stringify({
          success: false,
          error: `Gemini API error: ${initialPromptResponse.status}`,
          details: errorText
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const initialData = await initialPromptResponse.json();
      const initialGreeting = initialData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "Hi! Let's practice speaking English. What do you enjoy doing in your free time?";

      console.log('✅ Gemini initial response:', initialGreeting);

      return new Response(JSON.stringify({
        success: true,
        json: {
          tutor_reply: initialGreeting,
          micro_feedback: [],
          scores: { fluency: 6.0, lexical: 6.0, grammar: 6.0, pronunciation: 6.0 },
          follow_up: initialGreeting,
          keywords: [],
          conversation_starter: "Let's talk about your interests and experiences!"
        },
        reply: initialGreeting
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Continue with normal conversation handling
    const targetLanguage = prefs?.targetLanguage;
    let finalSystemPrompt = SYSTEM_PROMPT;

    if (targetLanguage && targetLanguage !== 'en' && LANGUAGE_NAMES[targetLanguage as keyof typeof LANGUAGE_NAMES]) {
      finalSystemPrompt += `\n\nIMPORTANT: The student has selected ${LANGUAGE_NAMES[targetLanguage as keyof typeof LANGUAGE_NAMES] || targetLanguage} as their preferred language. After generating your response in English, you must also provide a translation of your tutor_reply in ${LANGUAGE_NAMES[targetLanguage as keyof typeof LANGUAGE_NAMES] || targetLanguage}.`;
    }

    // Prepare messages for Gemini
    const finalMessages: ChatMessage[] = [
      ...messages
    ];

    const requestBody = {
      contents: finalMessages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      })),
      system_instruction: {
        parts: [{ text: finalSystemPrompt }]
      },
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 800,
        topP: 0.95
      }
    };

    console.log('🤖 Calling Gemini for conversation with', finalMessages.length, 'messages');

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + googleKey, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('❌ Gemini API error:', response.status, errText);
      return new Response(JSON.stringify({ success: false, error: 'Gemini API error', status: response.status, details: errText }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const data = await response.json();
    const content: string = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    console.log('📝 Raw Gemini response:', content.substring(0, 100));

    // Parse the JSON response
    let parsed: any = null;
    try {
      parsed = JSON.parse(content);
      console.log('✅ Successfully parsed JSON response');
    } catch (e) {
      console.error('❌ Failed to parse Gemini response as JSON:', e);
      console.error('Raw response:', content);
      return new Response(JSON.stringify({ success: false, error: 'Invalid JSON from Gemini', raw: content.substring(0, 200) }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Extract reply text
    const reply = parsed?.tutor_reply || parsed?.follow_up || 'Could you tell me more?';

    // Ensure all required fields are present
    if (!parsed.tutor_reply) parsed.tutor_reply = reply;
    if (!parsed.follow_up) parsed.follow_up = reply;
    if (!parsed.micro_feedback) parsed.micro_feedback = ["Keep practicing! You're doing well."];
    if (!parsed.keywords) parsed.keywords = [];
    if (!parsed.scores) parsed.scores = { fluency: 6.0, lexical: 6.0, grammar: 6.0, pronunciation: 6.0 };
    if (!parsed.conversation_starter) parsed.conversation_starter = "Would you like to explore a different topic?";

    console.log('✅ Final response ready');

    // 4. Track Successful Call
    await incrementAPICallCount(user.userId);

    return new Response(JSON.stringify({ success: true, json: parsed, reply }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('❌ conversation-tutor error:', e);
    return new Response(JSON.stringify({ success: false, error: String(e?.message || e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
