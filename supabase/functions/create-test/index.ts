// @deno-types="https://deno.land/x/types/index.d.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts";
// @ts-ignore - Deno types
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore - Deno types
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// @ts-ignore - Deno global
declare const Deno: any;

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
    const { test_name, test_type, module, skill_category, training_type, test_subtype } = requestData;

    console.log('Creating test:', { test_name, test_type, module, skill_category, training_type, test_subtype });

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
      module,
      is_published: false  // New tests are unpublished by default
    };

    // Add skill_category if provided and it exists in the schema
    if (skill_category) {
      insertData.skill_category = skill_category;
    }

    // Add test_subtype (supports both training_type and test_subtype for backward compatibility)
    const subtype = test_subtype || training_type;

    console.log('📋 Requested test_subtype:', subtype);
    console.log('Inserting data:', insertData);

    // Try inserting with test_subtype first
    let insertDataWithSubtype = { ...insertData };
    if (subtype) {
      insertDataWithSubtype.test_subtype = subtype;
      console.log('✅ Attempting to create test with test_subtype:', subtype);
    }

    let { data, error } = await supabaseServiceRole
      .from('tests')
      .insert(insertDataWithSubtype)
      .select('*, test_subtype')
      .single();

    // If error is about missing column, try without test_subtype, then update if possible
    if (error && error.message && (error.message.includes('test_subtype') || error.message.includes('column'))) {
      console.warn('⚠️ test_subtype column does not exist. Creating test without it first...');
      console.warn('⚠️ Please apply migration 20251113221619_add_test_subtype_to_tests.sql');

      // Retry without test_subtype
      const { data: retryData, error: retryError } = await supabaseServiceRole
        .from('tests')
        .insert(insertData)
        .select('*, test_subtype')
        .single();

      if (retryError) {
        console.error('Error creating test:', retryError);
        return new Response(
          JSON.stringify({ error: retryError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      data = retryData;
      error = null;

      // Try to update with test_subtype if column exists (will fail silently if it doesn't)
      if (subtype && data && data.id) {
        console.log('🔄 Attempting to update test with test_subtype:', subtype);
        const { error: updateError } = await supabaseServiceRole
          .from('tests')
          .update({ test_subtype: subtype })
          .eq('id', data.id);

        if (updateError) {
          console.warn('⚠️ Could not update test_subtype (column may not exist):', updateError.message);
          console.warn('⚠️ Test created but test_subtype not saved. Apply migration to enable this feature.');
        } else {
          console.log('✅ Successfully updated test with test_subtype:', subtype);
          // Refetch to get updated data with test_subtype
          const { data: updatedData, error: refetchError } = await supabaseServiceRole
            .from('tests')
            .select('*, test_subtype')
            .eq('id', data.id)
            .single();
          if (updatedData) {
            console.log('✅ Refetched test with test_subtype:', updatedData.test_subtype);
            data = updatedData;
          } else if (refetchError) {
            console.warn('⚠️ Could not refetch test:', refetchError.message);
          }
        }
      }
    }

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
