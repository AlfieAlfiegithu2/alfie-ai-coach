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
      case 'csv_upload':
        result = await handleCsvUpload(supabaseClient, contentData.csvData, contentData.testType, contentData.testId, contentData.partNumber, contentData.module);
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
  
  console.log('Creating content:', { type, tableName, dataType: Array.isArray(data) ? 'array' : 'single' });
  
  // Clean data for tests table - only use valid columns
  if (tableName === 'tests') {
    const cleanData = Array.isArray(data) 
      ? data.map(item => ({
          test_name: item.test_name,
          test_type: item.test_type,
          module: item.module
        }))
      : {
          test_name: data.test_name,
          test_type: data.test_type,
          module: data.module
        };
    
    console.log('Cleaned test data:', cleanData);
    data = cleanData;
  }
  
  // Handle multiple records for bulk operations
  if (Array.isArray(data)) {
    const { data: result, error } = await supabaseClient
      .from(tableName)
      .insert(data)
      .select();
    
    if (error) {
      console.error('Bulk insert error:', error);
      throw error;
    }
    return { success: true, data: result };
  }
  
  // Handle single record
  const { data: result, error } = await supabaseClient
    .from(tableName)
    .insert([data])
    .select()
    .single();

  if (error) {
    console.error('Single insert error:', error);
    throw error;
  }
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
  
  // Simplified query - just select all from the table
  const { data, error } = await supabaseClient
    .from(tableName)
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return { success: true, data };
}

async function handleCsvUpload(supabaseClient: any, csvData: any[], testType: string, testId: string, partNumber: number, module?: string) {
  console.log('Edge Function "handleCsvUpload" received data for test ID:', testId);
  console.log('Received CSV data payload:', { testType, partNumber, module, rowCount: csvData.length });
  
  // PRE-EMPTIVE DATA VALIDATION - Guard Clause
  if (!csvData || csvData.length === 0) {
    console.error('Validation failed: No CSV data received');
    return new Response(
      JSON.stringify({ error: 'Invalid data received. No CSV data provided.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Validate first row has required fields
  const firstRow = csvData[0];
  const requiredFields = ['question_text', 'question_type', 'correct_answer'];
  
  for (const field of requiredFields) {
    if (!firstRow[field] || firstRow[field].trim() === '') {
      console.error(`Validation failed: Missing required field '${field}' in CSV data`);
      return new Response(
        JSON.stringify({ error: `Invalid data received. Missing '${field}' in CSV data.` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  console.log('Data validation passed');

  try {
    // Verify test exists first
    console.log('Verifying test exists with ID:', testId);
    const { data: testData, error: testError } = await supabaseClient
      .from('tests')
      .select('id, module')
      .eq('id', testId)
      .single();

    if (testError || !testData) {
      console.error('Test verification failed:', testError);
      throw new Error(`Test with ID ${testId} not found. Please create the test first.`);
    }

    console.log('Test verification successful. Target module for questions:', testData.module);

    const insertData = csvData.map((row, index) => {
      // Handle different CSV formats with robust mapping
      const questionText = row['Question Text'] || row['Question'] || row['QuestionText'] || row['question_text'] || '';
      const questionType = row['Question Type'] || row['Type'] || row['QuestionType'] || row['question_type'] || 'Multiple Choice';
      const correctAnswer = row['Correct Answer'] || row['Answer'] || row['CorrectAnswer'] || row['correct_answer'] || '';
      const explanation = row['Explanation'] || row['explanation'] || '';
      const choices = row['Choices'] || row['Options'] || row['choices'] || row['options'] || '';
      const passageText = row['Passage'] || row['PassageText'] || row['passage'] || row['passage_text'] || '';
      const audioUrl = row['Audio URL'] || row['AudioURL'] || row['audio_url'] || '';
      const imageUrl = row['Image URL'] || row['ImageURL'] || row['image_url'] || '';

      return {
        test_id: testId,
        question_text: questionText,
        question_type: questionType,
        correct_answer: correctAnswer,
        explanation: explanation || '',
        part_number: partNumber,
        question_number_in_part: index + 1,
        choices: choices,
        passage_text: passageText,
        audio_url: audioUrl || null,
        image_url: imageUrl || null
      };
    });

    console.log('Preparing to insert', insertData.length, 'questions into the database.');
    console.log('Sample of first question object being inserted:', insertData[0]);

    // ROBUST TRY-CATCH AROUND DATABASE INSERT
    try {
      const { data, error } = await supabaseClient
        .from('questions')
        .insert(insertData)
        .select();

      if (error) {
        console.error('Database insert error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        return new Response(
          JSON.stringify({ 
            error: 'Database insert failed.', 
            details: error.message || 'Unknown database error' 
          }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      console.log(`CSV upload successful: ${data?.length} questions inserted`);
      return { success: true, data };

    } catch (dbError: any) {
      console.error('Database operation catch block:', dbError);
      return new Response(
        JSON.stringify({ 
          error: 'Database insert failed.', 
          details: dbError.message || 'Database operation failed' 
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
  } catch (error: any) {
    console.error('handleCsvUpload general error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'CSV upload failed.', 
        details: error.message || 'Unknown error occurred' 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

function getTableName(type: string): string {
  const tableMap: Record<string, string> = {
    // Universal tables
    'tests': 'tests',
    'questions': 'questions',
    'csv_upload': 'questions', // CSV uploads go to questions table
    
    // Module-specific tables that still exist
    'writing_prompts': 'writing_prompts',
    'speaking_prompts': 'speaking_prompts',
    'pte_writing_prompts': 'pte_writing_prompts',
    'pte_speaking_prompts': 'pte_speaking_prompts',
    'toefl_writing_prompts': 'toefl_writing_prompts',
    'toefl_speaking_prompts': 'toefl_speaking_prompts',
    'general_writing_prompts': 'general_writing_prompts',
    'general_speaking_prompts': 'general_speaking_prompts'
  };

  const tableName = tableMap[type];
  if (!tableName) {
    throw new Error(`Invalid content type: ${type}`);
  }
  
  return tableName;
}