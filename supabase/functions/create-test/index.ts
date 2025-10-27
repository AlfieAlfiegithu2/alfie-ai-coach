import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create a service role client that bypasses RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Missing Supabase configuration' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseServiceRole = createClient(supabaseUrl, supabaseServiceRoleKey);

    const requestData = await req.json();
    const { test_name, test_type, module, skill_category } = requestData;

    console.log('Creating test:', { test_name, test_type, module, skill_category });

    // Validate input
    if (!test_name || !test_type || !module) {
      return new Response(
        JSON.stringify({ error: 'test_name, test_type, and module are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert test using service role (bypasses RLS)
    const insertData: any = {
      test_name,
      test_type,
      module
    };

    // Add skill_category if provided and it exists in the schema
    if (skill_category) {
      insertData.skill_category = skill_category;
    }

    console.log('Inserting data:', insertData);

    const { data, error } = await supabaseServiceRole
      .from('tests')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Error creating test:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Test created successfully:', data);
    return new Response(
      JSON.stringify({ 
        success: true, 
        data: data
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in create-test function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
