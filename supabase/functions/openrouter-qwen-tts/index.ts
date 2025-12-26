// @ts-ignore
import "https://deno.land/x/xhr@0.1.0/mod.ts";
// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// @ts-ignore
declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: any) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authentication required');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error('❌ Authentication failed:', authError);
      // Return 200 with error details so Supabase client can read it
      return new Response(
        JSON.stringify({
          error: 'Invalid authentication',
          success: false,
          details: authError?.message || 'User not authenticated',
          statusCode: 401
        }),
        {
          status: 200, // Use 200 so response body is accessible
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    console.log(`✅ Authenticated user: ${user.email || user.id}`);

    // Use environment variable only - no fallback for security reasons
    const DASHSCOPE_API_KEY = Deno.env.get('DASHSCOPE_API_KEY');

    if (!DASHSCOPE_API_KEY || DASHSCOPE_API_KEY.length < 20) {
      console.error('❌ Invalid DASHSCOPE_API_KEY (too short or empty)');
      return new Response(
        JSON.stringify({
          error: 'DashScope API key not configured properly',
          success: false,
          statusCode: 500
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const apiKeySource = Deno.env.get('DASHSCOPE_API_KEY') ? 'environment variable' : 'hardcoded fallback';
    console.log(`🔑 Using DASHSCOPE_API_KEY from ${apiKeySource}: ${DASHSCOPE_API_KEY.substring(0, 10)}...${DASHSCOPE_API_KEY.substring(DASHSCOPE_API_KEY.length - 5)}`);
    console.log(`🔑 API key length: ${DASHSCOPE_API_KEY.length}, starts with: ${DASHSCOPE_API_KEY.substring(0, 3)}`);

    // Parse request body with error handling
    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      console.error('❌ Failed to parse request body:', parseError);
      return new Response(
        JSON.stringify({
          error: 'Invalid JSON in request body',
          success: false,
          details: parseError instanceof Error ? parseError.message : String(parseError)
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const { text, voice = 'Cherry', language_type = 'English' } = body;

    if (!text || typeof text !== 'string') {
      // Return 200 with error details so Supabase client can read it
      return new Response(
        JSON.stringify({
          error: 'Text is required and must be a string',
          success: false,
          statusCode: 400
        }),
        {
          status: 200, // Use 200 so response body is accessible
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Qwen3-TTS max input: 600 characters
    if (text.length > 600) {
      // Return 200 with error details so Supabase client can read it
      return new Response(
        JSON.stringify({
          error: 'Text too long (max 600 characters for Qwen3-TTS)',
          success: false,
          details: { textLength: text.length, maxLength: 600 },
          statusCode: 400
        }),
        {
          status: 200, // Use 200 so response body is accessible
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    console.log(`🎵 Generating Qwen 3 TTS Flash for text: ${text.substring(0, 100)}... with voice: ${voice}`);

    // Use DashScope (Alibaba Cloud) API for Qwen 3 TTS Flash
    // Documentation: https://www.alibabacloud.com/help/en/model-studio/qwen-tts
    // Endpoint: /api/v1/services/aigc/multimodal-generation/generation
    // Use Beijing endpoint only (China region - console.aliyun.com)
    const endpoints = [
      'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation', // Beijing (China - primary)
    ];

    let lastError: any = null;

    for (const endpoint of endpoints) {
      try {
        console.log(`Trying endpoint: ${endpoint}`);

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'qwen3-tts-flash',
            input: {
              text: text,
              voice: voice, // Voice name (Cherry, Ethan, Jennifer, etc.)
              language_type: language_type, // English, Chinese, Auto, etc.
            },
          }),
        });

        console.log(`📡 API Response status: ${response.status} for endpoint: ${endpoint}`);

        if (!response.ok) {
          const errorText = await response.text();
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { message: errorText };
          }
          console.error(`❌ Endpoint ${endpoint} failed:`, response.status, JSON.stringify(errorData));

          // If it's an authentication error, don't try other endpoints
          if (response.status === 401 || response.status === 403 || errorData.code === 'InvalidApiKey') {
            throw new Error(`Authentication failed: ${JSON.stringify(errorData)}`);
          }

          // Store detailed error information
          lastError = {
            status: response.status,
            statusText: response.statusText,
            error: errorData,
            errorMessage: errorData.message || errorData.error?.message || errorText,
            endpoint: endpoint,
            timestamp: new Date().toISOString()
          };
          console.error(`❌ Stored error for endpoint ${endpoint}:`, JSON.stringify(lastError));
          continue; // Try next endpoint
        }

        const data = await response.json();
        console.log('Response data structure:', JSON.stringify(data).substring(0, 500));

        // Response format: { output: { audio: { url: "..." } } } or { output: { audio: { data: "base64..." } } }
        // Check multiple possible locations for audio URL
        const audioUrl = data.output?.audio?.url || data.output?.audio_url || data.output?.url;
        const audioBase64 = data.output?.audio?.data || data.output?.audio_base64;

        if (audioUrl) {
          // Fetch the audio file from URL (valid for 24 hours)
          console.log(`Fetching audio from URL: ${audioUrl}`);
          const audioResponse = await fetch(audioUrl);
          if (!audioResponse.ok) {
            throw new Error(`Failed to fetch audio from URL: ${audioResponse.status}`);
          }
          const arrayBuffer = await audioResponse.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);

          // Convert to base64 using proper encoding
          // For large files, we need to encode in chunks to avoid memory issues
          // But we must ensure proper base64 padding between chunks
          let base64Audio = '';

          // Use chunked encoding for files larger than 50MB to avoid memory issues
          if (uint8Array.length > 50 * 1024 * 1024) {
            // For very large files, use chunked encoding with proper base64 padding
            const chunkSize = 3 * 1024 * 1024; // 3MB chunks (divisible by 3 for proper base64)
            for (let i = 0; i < uint8Array.length; i += chunkSize) {
              const chunk = uint8Array.slice(i, Math.min(i + chunkSize, uint8Array.length));
              let binaryString = '';
              for (let j = 0; j < chunk.length; j++) {
                binaryString += String.fromCharCode(chunk[j]);
              }
              base64Audio += btoa(binaryString);
            }
          } else {
            // For smaller files, encode entire buffer at once (more efficient)
            let binaryString = '';
            for (let i = 0; i < uint8Array.length; i++) {
              binaryString += String.fromCharCode(uint8Array[i]);
            }
            base64Audio = btoa(binaryString);
          }

          // Clean any whitespace (shouldn't be any, but just in case)
          base64Audio = base64Audio.replace(/\s/g, '');

          // Validate base64 format
          const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
          const isValidBase64 = base64Regex.test(base64Audio);
          console.log(`✅ Qwen 3 TTS Flash generation successful via ${endpoint} (URL format, ${base64Audio.length} chars, valid base64: ${isValidBase64})`);

          if (!isValidBase64) {
            const invalidChars = base64Audio.match(/[^A-Za-z0-9+/=]/g);
            console.error(`❌ Generated base64 contains invalid characters: ${invalidChars?.slice(0, 10).join(', ') || 'unknown'}`);
            console.error(`❌ First 100 chars: ${base64Audio.substring(0, 100)}`);
            throw new Error('Generated base64 contains invalid characters');
          }

          return new Response(
            JSON.stringify({
              audioContent: base64Audio,
              success: true,
              model: 'qwen3-tts-flash',
              voice: voice,
              language_type: language_type,
              provider: 'dashscope',
              endpoint: endpoint
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            },
          );
        } else if (audioBase64) {
          // Direct base64 response (for streaming output)
          // Clean and validate base64
          let cleanedBase64 = String(audioBase64).trim().replace(/\s/g, '');
          cleanedBase64 = cleanedBase64.replace(/-/g, '+').replace(/_/g, '/');
          while (cleanedBase64.length % 4) {
            cleanedBase64 += '=';
          }

          const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
          const isValidBase64 = base64Regex.test(cleanedBase64);
          console.log(`✅ Qwen 3 TTS Flash generation successful via ${endpoint} (base64 format, ${cleanedBase64.length} bytes, valid: ${isValidBase64})`);

          if (!isValidBase64) {
            const invalidChars = cleanedBase64.match(/[^A-Za-z0-9+/=]/g);
            console.error(`❌ Base64 response contains invalid characters: ${invalidChars?.slice(0, 10).join(', ') || 'unknown'}`);
            throw new Error('Base64 response contains invalid characters');
          }

          return new Response(
            JSON.stringify({
              audioContent: cleanedBase64,
              success: true,
              model: 'qwen3-tts-flash',
              voice: voice,
              language_type: language_type,
              provider: 'dashscope',
              endpoint: endpoint
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            },
          );
        } else {
          // Log the full response for debugging
          console.error('Unexpected response format:', JSON.stringify(data));
          lastError = { message: `Unexpected response format: ${JSON.stringify(data).substring(0, 500)}` };
          continue;
        }
      } catch (err: any) {
        console.error(`Error with endpoint ${endpoint}:`, err);
        // Store error details properly
        lastError = {
          endpoint: endpoint,
          error: err.message || String(err),
          errorType: err.name || err.constructor?.name || typeof err,
          stack: err.stack?.substring(0, 200),
          timestamp: new Date().toISOString()
        };
        console.error(`❌ Stored exception for endpoint ${endpoint}:`, JSON.stringify(lastError));
        continue;
      }
    }

    // All endpoints failed - return detailed error
    const errorMessage = lastError
      ? `Qwen 3 TTS Flash failed: ${lastError.errorMessage || lastError.error || JSON.stringify(lastError)}`
      : 'All Qwen 3 TTS Flash endpoints failed';

    console.error('❌ All endpoints failed:', errorMessage);
    console.error('❌ Last error details:', JSON.stringify(lastError, null, 2));

    // Return 200 with error details so Supabase client can read it
    return new Response(
      JSON.stringify({
        error: errorMessage,
        success: false,
        details: lastError || {},
        statusCode: 500
      }, null, 2),
      {
        status: 200, // Use 200 so response body is accessible
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );

  } catch (error: any) {
    console.error('❌ Qwen TTS error:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error name:', error.name);
    console.error('❌ Error message:', error.message);

    const statusCode = error.status || (error.message?.includes('Authentication') ? 401 : 500);
    const errorMessage = error.message || String(error);

    // Return 200 with error details so Supabase client can read it
    return new Response(
      JSON.stringify({
        error: errorMessage,
        success: false,
        message: errorMessage, // Also include as 'message' for compatibility
        statusCode: statusCode,
        details: {
          name: error.name,
          message: error.message,
          type: error.constructor?.name || typeof error,
          stack: error.stack?.substring(0, 500) // Limit stack trace length
        }
      }),
      {
        status: 200, // Use 200 so response body is accessible
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'X-Error-Type': error.name || 'UnknownError'
        },
      },
    );
  }
});
