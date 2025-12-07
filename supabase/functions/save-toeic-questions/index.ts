import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a service role client that bypasses RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Missing Supabase configuration' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

    const requestBody = await req.json()
    console.log('📥 Received save-toeic-questions request')

    const { testId, part, questions, passages } = requestBody

    if (!testId) {
      throw new Error('testId is required')
    }
    if (part === undefined || part === null) {
      throw new Error('part number is required')
    }
    if (!questions || !Array.isArray(questions)) {
      throw new Error('questions must be an array')
    }

    console.log(`📝 Saving TOEIC Part ${part} questions for test:`, testId)
    console.log(`📊 Questions count: ${questions.length}`)

    // 1. Delete existing questions for this part
    console.log('🗑️ Deleting existing questions for part', part)
    const { error: deleteQuestionsError } = await supabase
      .from('questions')
      .delete()
      .eq('test_id', testId)
      .eq('toeic_part', part)

    if (deleteQuestionsError) {
      console.error('Error deleting questions:', deleteQuestionsError)
      throw deleteQuestionsError
    }

    // 2. Delete existing passages for this part (if applicable)
    if (passages && passages.length > 0) {
      console.log('🗑️ Deleting existing passages for part', part)
      const { error: deletePassagesError } = await supabase
        .from('toeic_passages')
        .delete()
        .eq('test_id', testId)
        .eq('part_number', part)

      if (deletePassagesError) {
        console.error('Error deleting passages:', deletePassagesError)
        // Non-fatal, continue
      }

      // 3. Insert passages
      console.log(`📖 Inserting ${passages.length} passages`)
      const passagesToInsert = passages.map((p: any) => ({
        test_id: testId,
        part_number: part,
        passage_type: p.type,
        passage_title: p.title,
        passage_content: p.content,
        passage_image_url: p.imageUrl,
        question_range_start: p.questionStart,
        question_range_end: p.questionEnd
      }))

      const { error: insertPassagesError } = await supabase
        .from('toeic_passages')
        .insert(passagesToInsert)

      if (insertPassagesError) {
        console.error('Error inserting passages:', insertPassagesError)
        // Non-fatal, continue
      }
    }

    // 4. Insert questions
    if (questions.length > 0) {
      console.log(`📥 Inserting ${questions.length} questions`)
      const questionsToInsert = questions.map((q: any, index: number) => ({
        test_id: testId,
        question_number_in_part: q.question_number || index + 1,
        part_number: part,
        toeic_part: part,
        question_text: q.question_text,
        question_type: q.question_type || 'multiple_choice',
        choices: q.options ? JSON.stringify(q.options) : null,
        correct_answer: q.correct_answer || '',
        explanation: q.explanation || '',
        ai_explanation: q.ai_explanation || null,
        passage_context: q.passage_context || null,
        related_passage_id: q.related_passage_id || null
      }))

      const { error: insertQuestionsError } = await supabase
        .from('questions')
        .insert(questionsToInsert)

      if (insertQuestionsError) {
        console.error('Error inserting questions:', insertQuestionsError)
        throw insertQuestionsError
      }

      console.log('✅ Inserted', questions.length, 'questions successfully')
    } else {
      console.log('⚠️ No questions to insert')
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        testId, 
        part,
        questionsCount: questions.length,
        passagesCount: passages?.length || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

