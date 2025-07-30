import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, type, data: contentData } = await req.json();

    // Simple auth check (in production, verify JWT token)
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let result;

    switch (action) {
      case 'create':
        result = await createContent(supabaseClient, type, contentData);
        break;
      case 'update':
        result = await updateContent(supabaseClient, type, contentData);
        break;
      case 'delete':
        result = await deleteContent(supabaseClient, type, contentData.id);
        break;
      case 'list':
        result = await listContent(supabaseClient, type);
        break;
      default:
        throw new Error('Invalid action');
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in admin-content function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function createContent(supabaseClient: any, type: string, data: any) {
  const tableName = getTableName(type);
  
  // Handle multiple records for bulk operations
  if (Array.isArray(data)) {
    const { data: result, error } = await supabaseClient
      .from(tableName)
      .insert(data)
      .select();
    
    if (error) throw error;
    return { success: true, data: result };
  }
  
  // Handle single record
  const { data: result, error } = await supabaseClient
    .from(tableName)
    .insert([data])
    .select()
    .single();

  if (error) throw error;
  return { success: true, data: result };
}

async function updateContent(supabaseClient: any, type: string, data: any) {
  const tableName = getTableName(type);
  const { data: result, error } = await supabaseClient
    .from(tableName)
    .update(data)
    .eq('id', data.id)
    .select()
    .single();

  if (error) throw error;
  return { success: true, data: result };
}

async function deleteContent(supabaseClient: any, type: string, id: string) {
  const tableName = getTableName(type);
  const { error } = await supabaseClient
    .from(tableName)
    .delete()
    .eq('id', id);

  if (error) throw error;
  return { success: true };
}

async function listContent(supabaseClient: any, type: string) {
  const tableName = getTableName(type);
  let query = supabaseClient.from(tableName).select('*');
  
  // Add joins for questions
  if (type === 'reading_questions') {
    query = query.select('*, reading_passages(title)');
  } else if (type === 'listening_questions') {
    query = query.select('*, listening_sections(title)');
  }
  
  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;
  return { success: true, data };
}

function getTableName(type: string): string {
  const tableMap: Record<string, string> = {
    // IELTS tables
    'reading_passages': 'reading_passages',
    'reading_questions': 'reading_questions',
    'listening_sections': 'listening_sections',
    'listening_questions': 'listening_questions',
    'writing_prompts': 'writing_prompts',
    'speaking_prompts': 'speaking_prompts',
    'ielts_reading_tests': 'ielts_reading_tests',
    
    // PTE tables
    'pte_passages': 'pte_passages',
    'pte_questions': 'pte_questions',
    'pte_listening_sections': 'pte_listening_sections',
    'pte_listening_questions': 'pte_listening_questions',
    'pte_writing_prompts': 'pte_writing_prompts',
    'pte_speaking_prompts': 'pte_speaking_prompts',
    
    // TOEFL tables
    'toefl_passages': 'toefl_passages',
    'toefl_questions': 'toefl_questions',
    'toefl_listening_sections': 'toefl_listening_sections',
    'toefl_listening_questions': 'toefl_listening_questions',
    'toefl_writing_prompts': 'toefl_writing_prompts',
    'toefl_speaking_prompts': 'toefl_speaking_prompts',
    
    // General tables
    'general_passages': 'general_passages',
    'general_questions': 'general_questions',
    'general_listening_sections': 'general_listening_sections',
    'general_listening_questions': 'general_listening_questions',
    'general_writing_prompts': 'general_writing_prompts',
    'general_speaking_prompts': 'general_speaking_prompts'
  };

  const tableName = tableMap[type];
  if (!tableName) {
    throw new Error(`Invalid content type: ${type}`);
  }
  
  return tableName;
}