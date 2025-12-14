import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.21.0";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const { batchSize = 5 } = await req.json() || {};

        const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!geminiApiKey || !supabaseUrl || !supabaseServiceKey) {
            throw new Error('Missing required environment variables');
        }

        // Create Supabase client with service role to bypass RLS
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Fetch tasks WITHOUT model answers
        const { data: tasks, error: fetchError } = await supabase
            .from('questions')
            .select('id, question_type, part_number, passage_text, image_url, transcription')
            .in('question_type', ['Task 1', 'Task 2'])
            .or('transcription.is.null,transcription.eq.')
            .limit(batchSize);

        if (fetchError) {
            throw new Error(`Failed to fetch tasks: ${fetchError.message}`);
        }

        console.log(`📋 Found ${tasks?.length || 0} tasks needing model answers`);

        if (!tasks || tasks.length === 0) {
            return new Response(
                JSON.stringify({ success: true, message: 'All tasks already have model answers!', count: 0 }),
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
                    // Task 1 Academic with image
                    console.log('📷 Fetching image...');
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
                        } else {
                            console.log(`⚠️ Image fetch failed (${imageResponse.status}), using text-only fallback`);
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
   - PARAGRAPH 1 (Introduction): One sentence paraphrasing what the visual shows
   - PARAGRAPH 2 (Overview): 2-3 sentences describing the main trends/key features
   - PARAGRAPH 3-4 (Details): Describe specific data points, comparisons, stages

WRITING STYLE:
- For PROCESS diagrams: Describe the stages in flowing prose (e.g., "The process begins with... Following this... Finally...")
- For CHARTS/GRAPHS: Use data description language (e.g., "increased significantly", "remained stable", "peaked at")
- Include specific numbers/data from the visual
- Use appropriate cohesive devices (Overall, In contrast, Subsequently, etc.)

DO NOT:
- Use bullet points or numbered steps
- Write "Step 1:", "Stage 1:", or any numbered format
- Include titles or headings
- Write less than 160 words or more than 190 words

Write the model answer now (160-190 words, in paragraphs):`;

                        parts = [
                            { text: prompt },
                            { inlineData: { mimeType, data: base64Image } }
                        ];
                    } else {
                        // Fallback to text-based answer without image
                        prompt = `You are an IELTS Writing Task 1 examiner. Write a Band 8 model answer based on the topic described.

TASK INSTRUCTIONS: ${instructions}

CRITICAL FORMAT REQUIREMENTS:
1. Write EXACTLY 160-190 words (count carefully!)
2. Write in FULL PARAGRAPHS - absolutely NO bullet points, NO numbered lists
3. For PROCESS descriptions: Use flowing prose ("The process begins with... Subsequently... Finally...")
4. Include realistic, specific details appropriate to the topic

DO NOT:
- Use bullet points or numbered steps
- Write "Step 1:", "Stage 1:", or any numbered format
- Write less than 160 words or more than 190 words

Write the model answer now (160-190 words, in paragraphs):`;

                        parts = [{ text: prompt }];
                    }
                } else if (taskNumber === 1) {
                    // Task 1 General (letter)
                    prompt = `You are an IELTS Writing Task 1 examiner. Write a Band 8 model letter.

TASK INSTRUCTIONS: ${instructions}

CRITICAL FORMAT REQUIREMENTS:
1. Write EXACTLY 160-190 words (count carefully!)
2. Include proper greeting (Dear...) and sign-off (Yours sincerely/faithfully)
3. Write 3 clear paragraphs addressing all points
4. Use appropriate formal/semi-formal/informal tone based on recipient

DO NOT write less than 160 words or more than 190 words.

Write the model letter now (160-190 words):`;

                    parts = [{ text: prompt }];
                } else {
                    // Task 2 Essay
                    prompt = `You are an IELTS Writing Task 2 examiner. Write a Band 8 model essay.

ESSAY QUESTION: ${instructions}

CRITICAL REQUIREMENTS:
1. Write EXACTLY 260-290 words (count carefully - this is VERY important!)
2. Structure (4 paragraphs only):
   - Introduction (40-50 words): Paraphrase question + thesis + brief roadmap
   - Body 1 (70-80 words): First argument + explanation + example
   - Body 2 (70-80 words): Second argument + explanation + example  
   - Conclusion (40-50 words): Summarize + final opinion

3. Use this introduction format: "It is often argued that [paraphrase topic]. This essay [agrees/disagrees] with this view because [reason 1] and [reason 2]."

4. DO NOT:
   - Exceed 290 words under any circumstances
   - Use fabricated statistics or research studies
   - Use overly complex vocabulary
   - Include bullet points

5. Use natural linking words: However, Furthermore, For instance, In conclusion

Write the model essay now (260-290 words, 4 paragraphs):`;

                    parts = [{ text: prompt }];
                }

                console.log('🤖 Generating with Gemini...');
                const result = await model.generateContent(parts);
                const modelAnswer = result.response.text().trim();
                const wordCount = modelAnswer.split(/\s+/).filter((w: string) => w.length > 0).length;

                console.log(`✅ Generated ${wordCount} words`);

                // Save to database with service role (bypasses RLS)
                const { error: updateError } = await supabase
                    .from('questions')
                    .update({ transcription: modelAnswer })
                    .eq('id', task.id);

                if (updateError) {
                    throw new Error(`Failed to save: ${updateError.message} `);
                }

                console.log('💾 Saved to database');
                results.push({ id: task.id, success: true, wordCount });

                // Small delay to avoid rate limits
                await new Promise(r => setTimeout(r, 2000));

            } catch (error: any) {
                console.error(`❌ Error: ${error.message} `);
                results.push({ id: task.id, success: false, error: error.message });
            }
        }

        const successCount = results.filter(r => r.success).length;
        const errorCount = results.filter(r => !r.success).length;

        return new Response(
            JSON.stringify({
                success: true,
                message: `Processed ${tasks.length} tasks`,
                successCount,
                errorCount,
                results
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error: any) {
        console.error('❌ Error:', error);
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
