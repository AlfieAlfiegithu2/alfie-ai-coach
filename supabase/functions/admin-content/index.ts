// supabase/functions/admin-content/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create a Supabase client with the service role key to bypass RLS for admin actions
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, payload } = await req.json();

    let data, error;

    switch (action) {
      case 'create_test':
        ({ data, error } = await supabaseAdmin
          .from('tests')
          .insert(payload)
          .select()
          .single());
        break;

      case 'upload_questions':
        ({ data, error } = await supabaseAdmin
          .from('questions')
          .insert(payload)
          .select());
        break;

      default:
        throw new Error(`Invalid action: ${action}`);
    }

    if (error) {
      console.error('Supabase error:', error);
      throw new Error(`Database Error: ${error.message}`);
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Edge Function critical error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});