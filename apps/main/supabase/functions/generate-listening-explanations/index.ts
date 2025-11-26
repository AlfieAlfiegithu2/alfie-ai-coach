import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.21.0';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { questions, transcriptText, transcriptJson } = await req.json();

        if (!questions || !Array.isArray(questions)) {
            throw new Error('Questions array is required');
        }

        const apiKey = Deno.env.get('GEMINI_API_KEY');
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY not configured');
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

        console.log(`📝 Generating explanations for ${questions.length} questions...`);

        // Generate explanations for all questions
        const explanationsPromises = questions.map(async (question: any, index: number) => {
            try {
                const prompt = `You are an IELTS listening test expert. Generate a clear, concise explanation for why the given answer is correct.

**Question #${index + 1}:**
${question.question_text}

**Correct Answer:** ${question.correct_answer}

**Full Transcript:**
${transcriptText || 'No transcript available'}

${transcriptJson ? `**Timestamp Data Available:** Yes (you can reference specific times in the audio)` : ''}

**Instructions:**
1. Explain WHY this is the correct answer
2. Reference the specific part of the transcript where the answer is found
3. If timestamp data is available, include the approximate timestamp (e.g., "at around 1:23")
4. Keep the explanation concise (2-3 sentences max)
5. Use student-friendly language

**Format your response as:**
Explanation: [Your explanation here]
${transcriptJson ? 'Timestamp: [HH:MM:SS or MM:SS]' : ''}`;

                const result = await model.generateContent(prompt);
                const response = result.response;
                const explanation = response.text();

                console.log(`✅ Generated explanation for Q${index + 1}`);

                return {
                    questionIndex: index,
                    explanation: explanation.trim()
                };
            } catch (error) {
                console.error(`❌ Error generating explanation for Q${index + 1}:`, error);
                return {
                    questionIndex: index,
                    explanation: `The correct answer is "${question.correct_answer}". Please refer to the audio transcript.`,
                    error: error.message
                };
            }
        });

        const explanations = await Promise.all(explanationsPromises);

        console.log(`✅ Successfully generated ${explanations.length} explanations`);

        return new Response(
            JSON.stringify({
                success: true,
                explanations: explanations
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            }
        );

    } catch (error) {
        console.error('❌ Error in generate-listening-explanations:', error);
        return new Response(
            JSON.stringify({
                success: false,
                error: error.message
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400
            }
        );
    }
});
