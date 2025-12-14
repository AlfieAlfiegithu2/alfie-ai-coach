import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.21.0";

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
        const { taskNumber, instructions, imageUrl, trainingType } = await req.json();

        if (!instructions) {
            throw new Error('Task instructions are required');
        }

        const apiKey = Deno.env.get('GEMINI_API_KEY');
        if (!apiKey) {
            throw new Error('Gemini API key not configured');
        }

        const genAI = new GoogleGenerativeAI(apiKey);

        // Use Gemini 2.0 Flash (same as gemini-question-extractor which works)
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash-exp",
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 1024,
            }
        });

        let prompt = '';
        let parts: any[] = [];

        if (taskNumber === 1) {
            // Task 1 - may have image (Academic) or just text (General)
            if (trainingType === 'Academic' && imageUrl) {
                // Fetch the image and convert to base64
                console.log('📷 Fetching image from:', imageUrl);
                const imageResponse = await fetch(imageUrl);
                if (!imageResponse.ok) {
                    throw new Error(`Failed to fetch image: ${imageResponse.status}`);
                }
                const imageBuffer = await imageResponse.arrayBuffer();
                const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
                const mimeType = imageResponse.headers.get('content-type') || 'image/png';

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
                // General Training Task 1 (letter) or Academic without image
                prompt = `You are an IELTS Writing Task 1 examiner. Write a Band 8 model answer.

TASK INSTRUCTIONS: ${instructions}

CRITICAL FORMAT REQUIREMENTS:
1. Write EXACTLY 160-190 words (count carefully!)
2. For LETTERS: Include greeting, 3 clear paragraphs, and appropriate sign-off
3. For PROCESSES/DIAGRAMS without image: Describe in flowing prose, NOT bullet points

DO NOT:
- Use bullet points or numbered steps
- Write less than 160 words or more than 190 words
- Include titles, headings, or "Step 1/2/3" format

Write the model answer now (160-190 words):`;

                parts = [{ text: prompt }];
            }
        } else {
            // Task 2 - Essay
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

        console.log(`📝 Generating Task ${taskNumber} model answer...`);
        const result = await model.generateContent(parts);
        const response = await result.response;
        const modelAnswer = response.text().trim();

        console.log(`✅ Generated ${modelAnswer.split(/\s+/).length} words`);

        return new Response(
            JSON.stringify({
                success: true,
                modelAnswer,
                wordCount: modelAnswer.split(/\s+/).filter((w: string) => w.length > 0).length
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        );

    } catch (error) {
        console.error('❌ Error:', error);
        return new Response(
            JSON.stringify({
                success: false,
                error: error.message || 'Failed to generate model answer'
            }),
            {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        );
    }
});
