import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.21.0";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const { batchSize = 5, forceRegenerate = false } = await req.json() || {};

        const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!geminiApiKey || !supabaseUrl || !supabaseServiceKey) {
            throw new Error('Missing required environment variables');
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // If forceRegenerate, get ALL tasks (even with existing answers)
        let query = supabase
            .from('questions')
            .select('id, question_type, part_number, passage_text, image_url, transcription')
            .in('question_type', ['Task 1', 'Task 2']);

        if (!forceRegenerate) {
            query = query.or('transcription.is.null,transcription.eq.');
        }

        const { data: tasks, error: fetchError } = await query.limit(batchSize);

        if (fetchError) throw new Error(`Failed to fetch tasks: ${fetchError.message}`);

        console.log(`📋 Found ${tasks?.length || 0} tasks to process`);

        if (!tasks || tasks.length === 0) {
            return new Response(
                JSON.stringify({ success: true, message: 'No tasks to process!', count: 0 }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const genAI = new GoogleGenerativeAI(geminiApiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash-exp",
            generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
        });

        const results = [];

        for (const task of tasks) {
            const taskNumber = task.part_number;
            const instructions = task.passage_text || '';
            const imageUrl = task.image_url;

            console.log(`\n📄 Processing Task ${taskNumber} (${task.id.substring(0, 8)}...)`);

            try {
                let prompt = '';
                let parts: any[] = [];

                if (taskNumber === 1 && imageUrl) {
                    let useImage = false;
                    let base64Image = '';
                    let mimeType = 'image/png';

                    try {
                        const imageResponse = await fetch(imageUrl);
                        if (imageResponse.ok) {
                            const imageBuffer = await imageResponse.arrayBuffer();
                            base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
                            mimeType = imageResponse.headers.get('content-type') || 'image/png';
                            useImage = true;
                        }
                    } catch (e) {
                        console.log('⚠️ Image fetch error, using text-only fallback');
                    }

                    if (useImage) {
                        prompt = `You are an IELTS Writing Task 1 examiner. Write a Band 8 model answer that SUMMARIZES the visual information.

TASK INSTRUCTIONS: ${instructions}

CRITICAL FORMAT REQUIREMENTS:
1. Write EXACTLY 160-190 words (count carefully!)
2. Write in FULL PARAGRAPHS - absolutely NO bullet points, NO numbered lists, NO "Step 1", "Step 2" format
3. Structure:
   - PARAGRAPH 1: One sentence paraphrasing what the visual shows
   - PARAGRAPH 2: 2-3 sentences with main overview/key features
   - PARAGRAPH 3-4: Specific data, stages, or comparisons

WRITING STYLE:
- For PROCESS diagrams: "The process begins with... Following this... Finally..."
- For CHARTS/GRAPHS: Use data language like "increased significantly", "peaked at", "declined to"
- Use cohesive devices: Overall, In contrast, Subsequently, etc.

DO NOT:
- Use bullet points, numbered steps, or "Step 1:" format
- Include titles or headings
- Write less than 160 or more than 190 words

Write the model answer (160-190 words, proper paragraphs):`;

                        parts = [{ text: prompt }, { inlineData: { mimeType, data: base64Image } }];
                    } else {
                        prompt = `You are an IELTS Writing Task 1 examiner. Write a Band 8 model answer.

TASK INSTRUCTIONS: ${instructions}

REQUIREMENTS:
1. Write EXACTLY 160-190 words
2. Use FULL PARAGRAPHS - NO bullet points, NO "Step 1:" format
3. For process descriptions: "The process begins... Subsequently... Finally..."

Write the model answer (160-190 words):`;
                        parts = [{ text: prompt }];
                    }
                } else if (taskNumber === 1) {
                    prompt = `You are an IELTS Writing Task 1 examiner. Write a Band 8 model letter.

TASK INSTRUCTIONS: ${instructions}

REQUIREMENTS:
1. Write EXACTLY 160-190 words
2. Include greeting (Dear...) and sign-off
3. Write 3 clear paragraphs addressing all points

Write the model letter (160-190 words):`;
                    parts = [{ text: prompt }];
                } else {
                    prompt = `You are an IELTS Writing Task 2 examiner. Write a Band 8 model essay.

ESSAY QUESTION: ${instructions}

CRITICAL REQUIREMENTS:
1. Write EXACTLY 260-290 words (count carefully!)
2. Structure (4 paragraphs):
   - Introduction (40-50 words): Paraphrase + thesis + roadmap
   - Body 1 (70-80 words): Argument + explanation + example
   - Body 2 (70-80 words): Second argument + example
   - Conclusion (40-50 words): Summary + final opinion

3. Introduction format: "It is often argued that [topic]. This essay [agrees/disagrees] because [reason 1] and [reason 2]."

4. DO NOT exceed 290 words!

Write the model essay (260-290 words, 4 paragraphs):`;
                    parts = [{ text: prompt }];
                }

                console.log('🤖 Generating...');
                const result = await model.generateContent(parts);
                const modelAnswer = result.response.text().trim();
                const wordCount = modelAnswer.split(/\s+/).filter((w: string) => w.length > 0).length;

                console.log(`✅ Generated ${wordCount} words`);

                const { error: updateError } = await supabase
                    .from('questions')
                    .update({ transcription: modelAnswer })
                    .eq('id', task.id);

                if (updateError) throw new Error(`Failed to save: ${updateError.message}`);

                results.push({ id: task.id, success: true, wordCount });
                await new Promise(r => setTimeout(r, 2000));

            } catch (error: any) {
                console.error(`❌ Error: ${error.message}`);
                results.push({ id: task.id, success: false, error: error.message });
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: `Processed ${tasks.length} tasks`,
                successCount: results.filter(r => r.success).length,
                errorCount: results.filter(r => !r.success).length,
                results
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error: any) {
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
