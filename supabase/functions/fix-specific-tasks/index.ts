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
        const { taskIds } = await req.json() || {};

        if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
            throw new Error('taskIds array is required');
        }

        const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!geminiApiKey || !supabaseUrl || !supabaseServiceKey) {
            throw new Error('Missing required environment variables');
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const { data: tasks, error: fetchError } = await supabase
            .from('questions')
            .select('id, question_type, part_number, passage_text, image_url')
            .in('id', taskIds);

        if (fetchError) throw new Error(`Failed to fetch: ${fetchError.message}`);
        if (!tasks || tasks.length === 0) {
            return new Response(JSON.stringify({ success: false, error: 'No tasks found' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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

            try {
                let prompt = '';
                let parts: any[] = [];

                if (taskNumber === 1 && imageUrl) {
                    let base64Image = '';
                    let mimeType = 'image/png';

                    const imageResponse = await fetch(imageUrl);
                    if (imageResponse.ok) {
                        const imageBuffer = await imageResponse.arrayBuffer();
                        base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
                        mimeType = imageResponse.headers.get('content-type') || 'image/png';
                    }

                    if (base64Image) {
                        prompt = `You are an IELTS Writing Task 1 examiner. Write a Band 8 model answer.

TASK: ${instructions}

REQUIREMENTS:
1. Write EXACTLY 170-190 words
2. Use FULL PARAGRAPHS only - absolutely NO bullet points, NO numbered lists, NO "Step 1", "Step 2" format
3. Structure: Introduction → Overview → Details in flowing prose
4. For processes: "The process begins with... Subsequently... Finally..."
5. Include specific details from the image

DO NOT use any numbered steps or bullet points. Write in proper paragraphs.

Write the model answer (170-190 words):`;
                        parts = [{ text: prompt }, { inlineData: { mimeType, data: base64Image } }];
                    } else {
                        prompt = `Write a 170-190 word IELTS Task 1 answer for: ${instructions}. Use paragraphs, no bullet points.`;
                        parts = [{ text: prompt }];
                    }
                } else if (taskNumber === 1) {
                    prompt = `Write a 170-190 word IELTS Task 1 letter for: ${instructions}. Include greeting and sign-off.`;
                    parts = [{ text: prompt }];
                } else {
                    prompt = `You are an IELTS Writing Task 2 examiner. Write a Band 8 model essay.

QUESTION: ${instructions}

REQUIREMENTS:
1. Write EXACTLY 265-285 words (count carefully!)
2. 4 paragraphs: Introduction → Body 1 → Body 2 → Conclusion
3. Introduction: "It is often argued that [topic]. This essay [agrees/disagrees] because..."
4. DO NOT exceed 285 words

Write the essay (265-285 words):`;
                    parts = [{ text: prompt }];
                }

                const result = await model.generateContent(parts);
                let answer = result.response.text().trim();

                // Remove word count annotations like "(174 words)" at the end
                answer = answer.replace(/\s*\(\d+\s*words?\)\s*$/i, '');

                const wordCount = answer.split(/\s+/).filter((w: string) => w.length > 0).length;

                const { error: updateError } = await supabase
                    .from('questions')
                    .update({ transcription: answer })
                    .eq('id', task.id);

                if (updateError) throw new Error(`Failed to save: ${updateError.message}`);

                results.push({ id: task.id, type: task.question_type, success: true, wordCount });

            } catch (error: any) {
                results.push({ id: task.id, success: false, error: error.message });
            }
        }

        return new Response(JSON.stringify({ success: true, results }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    } catch (error: any) {
        return new Response(JSON.stringify({ success: false, error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
});
