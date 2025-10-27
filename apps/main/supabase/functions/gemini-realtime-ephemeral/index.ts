// Supabase Edge Function: gemini-realtime-ephemeral
// Returns an ephemeral token for Gemini 2.5 Flash Realtime and prompt metadata

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

type JsonResponse = {
  token: string;
  expiresInSeconds: number;
  model: string;
  prompt: {
    id: string | null;
    systemPrompt: string;
    voice: string;
    language: string;
    modelConfig: Record<string, unknown>;
  };
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) });
  }

  try {
    // TODO: Validate auth and fetch user_id
    // TODO: Read default prompt from voice_tutor_prompts
    // For now, return stubbed prompt and token placeholder
    const body = await req.json().catch(() => ({}));
    const promptId = body?.promptId ?? null;

    const response: JsonResponse = {
      token: "EPHEMERAL_TOKEN_PLACEHOLDER",
      expiresInSeconds: 300,
      model: "gemini-2.5-flash-realtime",
      prompt: {
        id: promptId,
        systemPrompt: "You are English Tutora, a concise, encouraging IELTS Speaking tutor for exam preparation. Use IELTS band descriptors as your coaching lens. Keep replies under 15 seconds and end with a short follow-up question.",
        voice: "default",
        language: "en",
        modelConfig: {},
      },
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (e) {
    console.error('ephemeral token error', e);
    return new Response(JSON.stringify({ error: 'failed_to_issue_token' }), {
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

function corsHeaders(req: Request) {
  const origin = req.headers.get('origin') ?? '*';
  return {
    "Access-Control-Allow-Origin": origin,
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}


