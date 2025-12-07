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

        // Check if this is a TOEIC save request
        if (requestBody.mode === 'toeic') {
            return handleToeicSave(supabase, requestBody)
        }

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

        const testTitle = testData.title && testData.title.trim() ? testData.title : `IELTS Reading Test`;
        console.log('📝 Saving reading test:', testTitle, 'for testId:', testId)

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
                .eq('module', 'Reading')
                .ilike('test_name', `%Test ${testId}%`)
                .maybeSingle();
            existingTest = result.data;
            fetchError = result.error;
        }

        if (fetchError) throw fetchError

        if (existingTest) {
            testUUID = existingTest.id
            console.log('🔄 Updating existing test:', existingTest.test_name, '(', testUUID, ')')

            // Update test with title
            const updateData: any = {};
            if (testTitle && testTitle !== existingTest.test_name) {
                updateData.test_name = testTitle;
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
                    module: 'Reading',
                    skill_category: 'Reading'
                })
                .select()
                .single()

            if (createError) throw createError
            testUUID = newTest.id
            console.log('✅ Created new test with ID:', testUUID)
        }

        // 2. Prepare Questions with passage data
        const getPassageNumber = (questionNum: number) => {
            if (questionNum <= 13) return 1
            if (questionNum <= 26) return 2
            return 3
        }

        // Get passages data from testData
        const passages = testData.passages || [];
        console.log('📖 Processing', passages.length, 'passages');

        // Track which passages have had their first question processed
        const passageFirstQuestionProcessed: { [key: number]: boolean } = {};

        const questionsToInsert = questions.map((q: any, i: number) => {
            // Use question's part_number if provided, otherwise calculate from index
            const passageNum = q.part_number || getPassageNumber(q.question_number_in_part || (i + 1));
            const questionNum = q.question_number_in_part || q.question_number || (i + 1);
            
            // Check if this is the first question of this passage
            const isPassageStart = !passageFirstQuestionProcessed[passageNum];
            if (isPassageStart) {
                passageFirstQuestionProcessed[passageNum] = true;
            }
            
            // Get passage data for this question
            const passageData = passages.find((p: any) => p.passageNumber === passageNum);
            const passageText = q.passage_text || passageData?.passageText || '';
            
            // Get structure data - merge question's structure_data with passage-level data
            let structureDataForQuestion = null;
            
            // Start with question's own structure_data (from sections) if provided
            if (q.structure_data) {
                structureDataForQuestion = { ...q.structure_data };
            }
            
            // For first question of each passage, also include passage-level data
            if (isPassageStart && passageData) {
                structureDataForQuestion = {
                    ...(structureDataForQuestion || {}),
                    structureItems: passageData.structureItems || [],
                    questionType: passageData.extractionMetadata?.questionType || null,
                    taskInstructions: passageData.extractionMetadata?.taskInstructions || null,
                    passageTitle: passageData.title || `Passage ${passageNum}`,
                    questionRange: passageData.questionRange || '',
                    sections: passageData.sections || []
                };
            }

            // Handle choices - can come from q.choices, q.options, or structure_data.options
            let choicesValue = null;
            const choicesSource = q.choices || q.options || q.structure_data?.options;
            if (choicesSource) {
                choicesValue = Array.isArray(choicesSource) ? choicesSource.join(';') : choicesSource;
            }

            return {
                test_id: testUUID,
                part_number: passageNum,
                question_number_in_part: questionNum,
                question_text: q.question_text,
                question_type: q.question_type || 'Short Answer',
                correct_answer: q.correct_answer || '',
                choices: choicesValue,
                explanation: q.explanation || '',
                // Store passage text with the question for reading tests
                passage_text: passageText,
                // Store structure items as JSONB in structure_data field
                structure_data: structureDataForQuestion
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
            console.log('✅ Inserted', questionsToInsert.length, 'questions successfully')
        } else {
            console.log('⚠️ No questions to insert')
        }

        return new Response(
            JSON.stringify({ success: true, testId: testUUID, questionsCount: questionsToInsert.length }),
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

// Handler for TOEIC question saves
async function handleToeicSave(supabase: any, requestBody: any) {
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
}

