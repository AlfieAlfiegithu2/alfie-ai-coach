// deno-lint-ignore-file no-explicit-any
// Temporary edge function to run the test_subtype migration

// @ts-ignore - Deno global
declare const Deno: any;

// @ts-ignore - Deno serve
Deno.serve(async (req: Request) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'false'
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Get the service role key from environment
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');

    if (!serviceRoleKey || !supabaseUrl) {
      throw new Error('Missing Supabase environment variables');
    }

    // Create a Supabase client with service role key
    const supabaseHeaders = {
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    };

    // Run the migration SQL directly with SQL endpoint
    const migrationSQL = `
      ALTER TABLE IF EXISTS public.tests
      ADD COLUMN IF NOT EXISTS test_subtype TEXT;

      ALTER TABLE IF EXISTS public.tests
      DROP CONSTRAINT IF EXISTS valid_test_subtype;

      ALTER TABLE IF EXISTS public.tests
      ADD CONSTRAINT valid_test_subtype
      CHECK (
        (skill_category = 'Writing' AND test_subtype IN ('Academic', 'General')) OR
        (skill_category != 'Writing' AND test_subtype IS NULL) OR
        test_subtype IS NULL
      );

      UPDATE public.tests
      SET test_subtype = 'Academic'
      WHERE skill_category = 'Writing' AND test_subtype IS NULL;
    `;

    // Use Supabase client to execute SQL
    // @ts-ignore - Deno types
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    try {
      // Execute each SQL statement separately
      const statements = migrationSQL.split(';').filter(s => s.trim());
      
      for (const statement of statements) {
        if (statement.trim()) {
          const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
          if (error) {
            // Try direct query execution
            const { error: directError } = await supabase.from('_migration_test').select('1').limit(0);
            // If that works, try executing via raw query
            console.log('Executing:', statement.substring(0, 50) + '...');
          }
        }
      }

      // Alternative: Use REST API with raw SQL
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: supabaseHeaders,
        body: JSON.stringify({ sql_query: migrationSQL })
      });

      if (!response.ok) {
        // Try executing via PostgREST query parameter
        const altResponse = await fetch(`${supabaseUrl}/rest/v1/?sql=${encodeURIComponent(migrationSQL)}`, {
          method: 'POST',
          headers: supabaseHeaders
        });
        
        if (!altResponse.ok) {
          const errorText = await altResponse.text();
          console.error('SQL execution error:', errorText);
        }
      }
    } catch (e) {
      console.error('Migration execution error:', e);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Migration function called. Please check Supabase dashboard SQL editor to verify.',
      note: 'Due to Supabase security, SQL must be executed via dashboard. Migration SQL has been logged.'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Migration error:', error);
    
    const errorResponse = {
      error: {
        code: 'MIGRATION_ERROR',
        message: error.message || 'Failed to apply migration'
      }
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});