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

            // Prepare update data with all fields from testData
            const updateData: any = {};

            // Basic metadata
            if (testTitle) updateData.test_name = testTitle;
            if (testData.instructions !== undefined) updateData.instructions = testData.instructions;

            // Audio and Transcript
            if (testData.audioUrl !== undefined) updateData.audio_url = testData.audioUrl;
            if (testData.transcriptText !== undefined) updateData.transcript_text = testData.transcriptText;
            if (testData.transcriptJson !== undefined) updateData.transcript_json = testData.transcriptJson;

            // Images
            if (testData.answerImageUrl !== undefined) updateData.answer_image_url = testData.answerImageUrl;
            if (testData.referenceImageUrl !== undefined) updateData.reference_image_url = testData.referenceImageUrl;

            // Configuration
            if (testData.totalParts !== undefined) updateData.total_parts = testData.totalParts;
            if (testData.partConfigs !== undefined) updateData.part_configs = testData.partConfigs;

            console.log('📊 Updating tests table with:', Object.keys(updateData).join(', '));

            if (Object.keys(updateData).length > 0) {
                const { error: updateError } = await supabase
                    .from('tests')
                    .update(updateData)
                    .eq('id', testUUID)

                if (updateError) throw updateError
                console.log('✅ Updated test successfully')
            }
        } else {
            console.log('✨ Creating new test:', testTitle)
            const insertData: any = {
                test_name: testTitle,
                test_type: 'IELTS',
                module: 'Listening',
                instructions: testData.instructions || null,
                audio_url: testData.audioUrl || null,
                transcript_text: testData.transcriptText || null,
                transcript_json: testData.transcriptJson || null,
                answer_image_url: testData.answerImageUrl || null,
                reference_image_url: testData.referenceImageUrl || null,
                total_parts: testData.totalParts || 4,
                part_configs: testData.partConfigs || null
            };

            const { data: newTest, error: createError } = await supabase
                .from('tests')
                .insert(insertData)
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
            const questionNum = q.question_number_in_part || (i + 1)
            const partNum = q.part_number || getPartNumber(i)

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
                passage_text: q.passage_text || (i === 0 ? testData.instructions : null), // Use question specific passage if available
                section_header: q.section_header || q.section_label, // Try to save section info
                question_image_url: q.question_image_url || q.diagram_image_url, // Save question image
                structure_data: q.structure_data || null
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
