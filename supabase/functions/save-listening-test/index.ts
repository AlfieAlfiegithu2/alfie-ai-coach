import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { testData, questions, testId } = await req.json()

        const testTitle = testData.title && testData.title.trim() ? testData.title : `IELTS Listening Test ${testId}`;
        console.log('📝 Saving listening test:', testTitle, 'for testId:', testId)

        // 1. Get or Create Test - use more specific pattern matching to avoid duplicates
        let testUUID;

        // Try to find existing test first with improved query
        const { data: existingTest, error: fetchError } = await supabase
            .from('tests')
            .select('id, test_name')
            .eq('test_type', 'IELTS')
            .eq('module', 'Listening')
            .or(`test_name.ilike.%Test ${testId},%test_name.ilike.%Test ${testId} -%`)
            .maybeSingle()

        if (fetchError) throw fetchError

        if (existingTest) {
            testUUID = existingTest.id
            console.log('🔄 Updating existing test:', existingTest.test_name, '(', testUUID, ')')

            // Only update if title is actually different and not empty
            if (testTitle && testTitle !== existingTest.test_name) {
                const { error: updateError } = await supabase
                    .from('tests')
                    .update({
                        test_name: testTitle,
                    })
                    .eq('id', testUUID)

                if (updateError) throw updateError
                console.log('✅ Updated test name to:', testTitle)
            }
        } else {
            console.log('✨ Creating new test:', testTitle)
            const { data: newTest, error: createError } = await supabase
                .from('tests')
                .insert({
                    test_name: testTitle,
                    test_type: 'IELTS',
                    module: 'Listening'
                })
                .select()
                .single()

            if (createError) throw createError
            testUUID = newTest.id
            console.log('✅ Created new test with ID:', testUUID)
        }

        // 2. Prepare Questions
        const getPartNumber = (index: number) => {
            if (index < 10) return 1
            if (index < 20) return 2
            if (index < 30) return 3
            return 4
        }

        const questionsToInsert = questions.map((q: any, i: number) => {
            const questionNum = i + 1
            const partNum = getPartNumber(i)

            return {
                test_id: testUUID,
                part_number: partNum,
                question_number_in_part: questionNum,
                question_text: q.question_text,
                question_type: q.question_type || 'multiple_choice',
                correct_answer: q.correct_answer,
                choices: q.options ? (Array.isArray(q.options) ? q.options.join(';') : q.options) : null,
                explanation: q.explanation || '',
                audio_url: testData.audioUrl,
                transcription: testData.transcriptText || null,
                transcript_json: testData.transcriptJson,
                answer_image_url: testData.answerImageUrl,
                passage_text: i === 0 || i === 10 || i === 20 || i === 30 ? testData.instructions : null
            }
        })

        // 3. Delete existing questions
        console.log('🗑️ Deleting existing questions for test:', testUUID)
        const { error: deleteError } = await supabase
            .from('questions')
            .delete()
            .eq('test_id', testUUID)

        if (deleteError) throw deleteError

        // 4. Insert new questions
        if (questionsToInsert.length > 0) {
            console.log(`📥 Inserting ${questionsToInsert.length} questions`)
            const { error: insertError } = await supabase
                .from('questions')
                .insert(questionsToInsert)

            if (insertError) throw insertError
        }

        return new Response(
            JSON.stringify({ success: true, testId: testUUID }),
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
