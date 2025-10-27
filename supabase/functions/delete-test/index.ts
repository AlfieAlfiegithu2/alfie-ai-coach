import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: corsHeaders
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error('Missing Supabase config');
      return new Response(
        JSON.stringify({ error: 'Missing Supabase configuration' }),
        { status: 500, headers: corsHeaders }
      );
    }

    console.log('✅ Supabase config loaded');

    const supabaseServiceRole = createClient(supabaseUrl, supabaseServiceRoleKey);
    const requestData = await req.json();
    const { testId } = requestData;

    console.log('🗑️ Deleting test:', testId);

    if (!testId) {
      return new Response(
        JSON.stringify({ error: 'testId is required' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Delete questions associated with this test
    const { error: questionsError } = await supabaseServiceRole
      .from('questions')
      .delete()
      .eq('test_id', testId);

    if (questionsError) {
      console.error('⚠️ Error deleting questions:', questionsError);
      // Continue with test deletion even if questions fail
    } else {
      console.log('✅ Questions deleted');
    }

    // Delete the test itself
    const { error: testError, count } = await supabaseServiceRole
      .from('tests')
      .delete()
      .eq('id', testId);

    if (testError) {
      console.error('❌ Error deleting test:', testError);
      return new Response(
        JSON.stringify({ error: `Delete error: ${testError.message}` }),
        { status: 400, headers: corsHeaders }
      );
    }

    console.log('✅ Test deleted successfully, rows affected:', count);
    return new Response(
      JSON.stringify({ success: true, message: 'Test deleted successfully' }),
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('❌ Function error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: corsHeaders }
    );
  }
});
