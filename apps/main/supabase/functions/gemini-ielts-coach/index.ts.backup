// Supabase Edge Function: gemini-ielts-coach
// Takes student transcript, returns AI coach response using Gemini 2.5 Flash

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Use the provided API key directly
const GEMINI_API_KEY = "AIzaSyB4b-vDRpqbEZVMye8LBS6FugK1Wtgm1Us";

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { transcript, conversationHistory } = await req.json();

    if (!transcript) {
      return new Response(
        JSON.stringify({ error: "transcript required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    console.log("✅ Using provided GEMINI_API_KEY");
    console.log(`📝 Processing student transcript: "${transcript.substring(0, 50)}..."`);
    console.log(`📋 Conversation history: "${conversationHistory?.substring(0, 50)}..."`);

    // Build IELTS coaching prompt
    const systemPrompt = `You are English Tutora, an expert IELTS Speaking coach. Your role is to help students prepare for the IELTS Speaking exam.

Guidelines:
- Keep responses SHORT (1-2 sentences max, under 120 characters)
- Use IELTS band descriptors as your coaching lens (Fluency, Lexical Resource, Grammatical Accuracy, Pronunciation)
- Provide immediate, actionable feedback
- Ask follow-up questions to keep the conversation flowing
- If student made an error, gently correct and ask them to try again
- Be encouraging and supportive
- Speak naturally and conversationally

Current conversation:
${conversationHistory || "Starting new conversation"}

Student just said: "${transcript}"

Provide a SHORT coaching response (1-2 sentences). Be specific and exam-focused.`;

    // Build pronunciation analysis prompt
    const pronunciationPrompt = `You are a pronunciation coach analyzing IELTS Speaking performance.

Student said: "${transcript}"

Analyze ONLY pronunciation, accent, intonation and stress patterns. Respond with ONLY valid JSON (no markdown):
{
  "score": <1-10>,
  "areas": {
    "pronunciation": "<phonetic accuracy (0-5)>",
    "intonation": "<rising/falling patterns, natural rhythm (0-5)>",
    "stress": "<word and sentence stress patterns (0-5)>",
    "accent": "<native-like vs non-native accent analysis (0-5)>"
  },
  "feedback": "<1-sentence specific improvement tip>",
  "positive": "<1-sentence what went well>"
}`;

    // Call Gemini API for coaching response
    console.log("🔄 Calling Gemini API for coaching response...");
    const geminiResponse = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: systemPrompt,
                },
              ],
            },
          ],
          generationConfig: {
            maxOutputTokens: 100,
            temperature: 0.7,
          },
        }),
      }
    );

    console.log(`📡 Gemini coaching response status: ${geminiResponse.status}`);

    if (!geminiResponse.ok) {
      const error = await geminiResponse.text();
      console.error("❌ Gemini API error:", error);
      return new Response(
        JSON.stringify({ 
          error: "Failed to generate response",
          details: error,
          statusCode: geminiResponse.status
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    const data = await geminiResponse.json();
    const response = data.candidates?.[0]?.content?.parts?.[0]?.text || "Could you repeat that?";

    console.log(`✅ Coaching response: "${response}"`);

    // Call Gemini API for pronunciation analysis (in parallel with response)
    let pronunciationData: any = { score: 0, feedback: "" };
    try {
      console.log("🔄 Calling Gemini API for pronunciation analysis...");
      const pronunciationResponse = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": GEMINI_API_KEY,
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: pronunciationPrompt,
                  },
                ],
              },
            ],
            generationConfig: {
              maxOutputTokens: 200,
              temperature: 0.3,
            },
          }),
        }
      );

      console.log(`📡 Gemini pronunciation response status: ${pronunciationResponse.status}`);

      if (pronunciationResponse.ok) {
        const pronunciationJson = await pronunciationResponse.json();
        const pronunciationText = pronunciationJson.candidates?.[0]?.content?.parts?.[0]?.text || "";
        
        // Extract JSON from response (handle markdown if present)
        let jsonStr = pronunciationText;
        if (jsonStr.includes("```json")) {
          jsonStr = jsonStr.split("```json")[1].split("```")[0];
        } else if (jsonStr.includes("```")) {
          jsonStr = jsonStr.split("```")[1].split("```")[0];
        }
        
        // Find JSON object
        const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          pronunciationData = JSON.parse(jsonMatch[0]);
          console.log(`✅ Pronunciation analysis: score ${pronunciationData.score}/10`);
        }
      }
    } catch (e) {
      console.error("⚠️ Pronunciation analysis error:", e);
      // Continue without pronunciation data
    }

    return new Response(
      JSON.stringify({
        response,
        student_transcript: transcript,
        pronunciation: {
          score: pronunciationData.score || 0,
          feedback: pronunciationData.feedback || "",
          positive: pronunciationData.positive || ""
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("❌ Error in gemini-ielts-coach:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        details: String(error)
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
