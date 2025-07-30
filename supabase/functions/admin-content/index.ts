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

async function handleCsvUpload(supabaseClient: any, csvData: any[], testType: string, testId: string, partNumber: number, module?: string) {
  console.log('Handling CSV upload:', { testType, testId, partNumber, module, rowCount: csvData.length });
  
  try {
    // Verify test exists first
    const { data: testData, error: testError } = await supabaseClient
      .from('tests')
      .select('id, module')
      .eq('id', testId)
      .single();

    if (testError || !testData) {
      throw new Error(`Test with ID ${testId} not found. Please create the test first.`);
    }

    const targetModule = module || testData.module;
    console.log('Target module for questions:', targetModule);

    // Determine which questions table to use
    let tableName = 'questions'; // Default universal table
    if (targetModule === 'Reading') {
      tableName = 'reading_questions';
    } else if (targetModule === 'Listening') {
      tableName = 'listening_questions';
    }

    const insertData = csvData.map((row, index) => {
      // Handle different CSV formats with more robust mapping
      const questionText = row['Question Text'] || row['Question'] || row['QuestionText'] || row['question_text'] || '';
      const questionType = row['Question Type'] || row['Type'] || row['QuestionType'] || row['question_type'] || 'Multiple Choice';
      const correctAnswer = row['Correct Answer'] || row['Answer'] || row['CorrectAnswer'] || row['correct_answer'] || '';
      const explanation = row['Explanation'] || row['explanation'] || '';
      const choices = row['Choices'] || row['Options'] || row['choices'] || row['options'] || '';
      const passageText = row['Passage'] || row['PassageText'] || row['passage'] || row['passage_text'] || '';

      // Base question data
      const questionData: any = {
        question_number: ((partNumber - 1) * 10) + (index + 1),
        question_text: questionText,
        question_type: questionType,
        correct_answer: correctAnswer,
        explanation: explanation || '',
        part_number: partNumber,
        test_id: testId
      };

      // Add module-specific fields
      if (tableName === 'reading_questions') {
        questionData.options = choices ? JSON.stringify(choices.split(';').map(c => c.trim())) : null;
        questionData.cambridge_book = `${testType?.toUpperCase()} Test`;
        questionData.section_number = partNumber;
      } else if (tableName === 'listening_questions') {
        questionData.options = choices ? JSON.stringify(choices.split(';').map(c => c.trim())) : null;
      } else {
        // Universal questions table
        questionData.question_number_in_part = index + 1;
        questionData.choices = choices;
        questionData.passage_text = passageText;
      }

      return questionData;
    });

    console.log('Inserting into table:', tableName, 'with data:', insertData[0]);

    const { data, error } = await supabaseClient
      .from(tableName)
      .insert(insertData)
      .select();

    if (error) {
      console.error('CSV upload error:', error);
      throw new Error(`Database insert failed: ${error.message}`);
    }

    console.log(`CSV upload successful: ${data?.length} questions inserted into ${tableName}`);
    
    // Update test question count
    await supabaseClient
      .from('tests')
      .update({ 
        total_questions: data.length,
        parts_completed: partNumber,
        status: partNumber >= 3 ? 'complete' : 'incomplete'
      })
      .eq('id', testId);

    return { success: true, data, table: tableName };
  } catch (error) {
    console.error('handleCsvUpload error:', error);
    throw error;
  }
}

function getTableName(type: string): string {
  const tableMap: Record<string, string> = {
    // Universal tables
    'tests': 'tests',
    'questions': 'questions',
    'csv_upload': 'questions', // CSV uploads go to questions table
    
    // Legacy tables for backward compatibility
    'reading_passages': 'reading_passages',
    'reading_questions': 'reading_questions',
    'listening_sections': 'listening_sections',
    'listening_questions': 'listening_questions',
    'writing_prompts': 'writing_prompts',
    'speaking_prompts': 'speaking_prompts',
    'ielts_reading_tests': 'tests', // Map to universal tests table
    
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