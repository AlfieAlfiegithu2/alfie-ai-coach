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


        const requestBody = await req.json()
        console.log('📥 Received request body:', JSON.stringify(requestBody, null, 2))

        const { testData, questions, testId } = requestBody

        if (!testId) {
            throw new Error('testId is required')
        }
        if (!testData) {
            throw new Error('testData is required')
        }
        if (!questions || !Array.isArray(questions)) {
            throw new Error('questions must be an array')
        }

        const testTitle = testData.title && testData.title.trim() ? testData.title : `IELTS Listening Test ${testId}`;
        console.log('📝 Saving listening test:', testTitle, 'for testId:', testId)

        // 1. Get or Create Test - handle both UUID and numeric testId
        let testUUID;

        // Check if testId is a UUID (contains hyphens) or a number
        const isUUID = testId.includes('-');

        let existingTest;
        let fetchError;

        if (isUUID) {
            // If testId is already a UUID, use it directly
            console.log('🔍 Looking up test by UUID:', testId);
            const result = await supabase
                .from('tests')
                .select('id, test_name')
                .eq('id', testId)
                .maybeSingle();
            existingTest = result.data;
            fetchError = result.error;
        } else {
            // If testId is a number, search by test name pattern
            console.log('🔍 Looking up test by name pattern for testId:', testId);
            const result = await supabase
                .from('tests')
                .select('id, test_name')
                .eq('test_type', 'IELTS')
                .eq('module', 'Listening')
                .ilike('test_name', `%Test ${testId}%`)
                .maybeSingle();
            existingTest = result.data;
            fetchError = result.error;
        }

        if (fetchError) throw fetchError

        if (existingTest) {
            testUUID = existingTest.id
            console.log('🔄 Updating existing test:', existingTest.test_name, '(', testUUID, ')')

            // Update test with title and audio URL
            const updateData: any = {};
            if (testTitle && testTitle !== existingTest.test_name) {
                updateData.test_name = testTitle;
            }
            // Always update audio_url if provided
            if (testData.audioUrl) {
                updateData.audio_url = testData.audioUrl;
                console.log('📼 Storing audio URL in tests table:', testData.audioUrl);
            }

            if (Object.keys(updateData).length > 0) {
                const { error: updateError } = await supabase
                    .from('tests')
                    .update(updateData)
                    .eq('id', testUUID)

                if (updateError) throw updateError
                console.log('✅ Updated test:', Object.keys(updateData).join(', '))
            }
        } else {
            console.log('✨ Creating new test:', testTitle)
            const { data: newTest, error: createError } = await supabase
                .from('tests')
                .insert({
                    test_name: testTitle,
                    test_type: 'IELTS',
                    module: 'Listening',
                    audio_url: testData.audioUrl || null
                })
                .select()
                .single()

            if (createError) throw createError
            testUUID = newTest.id
            console.log('✅ Created new test with ID:', testUUID)
            if (testData.audioUrl) {
                console.log('📼 Stored audio URL in tests table:', testData.audioUrl);
            }
        }

        // 2. Prepare Questions
        const getPartNumber = (index: number) => {
            if (index < 10) return 1
            if (index < 20) return 2
            if (index < 30) return 3
            return 4
        }

        const questionsToInsert = questions.map((q: any, i: number) => {
            const questionNum = q.question_number || i + 1
            const partNum = q.part_number || getPartNumber(questionNum - 1)
            const questionInPart = q.question_number_in_part || ((questionNum - 1) % 10) + 1

            return {
                test_id: testUUID,
                part_number: partNum,
                question_number_in_part: questionInPart,
                question_text: q.question_text,
                question_type: q.question_type || 'multiple_choice',
                correct_answer: q.correct_answer,
                choices: q.options ? (Array.isArray(q.options) ? q.options.join(';') : q.options) : null,
                explanation: q.explanation || '',
                section_header: q.section_header || null,
                section_instruction: q.section_instruction || null,
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
