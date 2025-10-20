import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

interface ValidateRequest {
  token: string;
  userId: string;
}

interface ValidateResponse {
  valid: boolean;
  userId?: string;
  email?: string;
  expiresAt?: number;
  error?: string;
}

export default async (req: Request): Promise<Response> => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      },
    });
  }

  try {
    // Get request body
    const body: ValidateRequest = await req.json();
    const { token, userId } = body;

    if (!token || !userId) {
      return new Response(
        JSON.stringify({
          valid: false,
          error: 'Missing token or userId',
        } as ValidateResponse),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Verify token with Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from Supabase
    const { data: { user }, error } = await supabase.auth.admin.getUserById(userId);

    if (error || !user) {
      return new Response(
        JSON.stringify({
          valid: false,
          error: 'Invalid user',
        } as ValidateResponse),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Token is valid - return user info
    return new Response(
      JSON.stringify({
        valid: true,
        userId: user.id,
        email: user.email,
        expiresAt: Date.now() + 3600000, // 1 hour from now
      } as ValidateResponse),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Earthworm auth validation error:', error);
    return new Response(
      JSON.stringify({
        valid: false,
        error: 'Internal server error',
      } as ValidateResponse),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
