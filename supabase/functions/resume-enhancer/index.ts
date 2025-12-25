// @ts-nocheck
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Content-Type': 'application/json',
};

async function callGemini(prompt: string, systemPrompt: string): Promise<string | null> {
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
        console.error('GEMINI_API_KEY not configured');
        return null;
    }

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite-preview-06-17:generateContent?key=${geminiApiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [
                    {
                        role: 'user',
                        parts: [{ text: `${systemPrompt}\n\n${prompt}` }]
                    }
                ],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 1000,
                }
            }),
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini API error:', response.status, errorText);
        return null;
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return content || null;
}

function parseJsonResponse(text: string): any {
    let cleanResponse = text.trim();
    if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/```json?\n?/g, '').replace(/```\s*$/g, '').trim();
    }
    return JSON.parse(cleanResponse);
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders, status: 204 });
    }

    try {
        const body = await req.json();
        const { jobTitle, company, keywords } = body;

        const systemPrompt = 'You are an expert resume writer. Generate high-impact, professional resume bullet points. Always respond with valid JSON only.';
        const prompt = `Generate 5 professional resume bullet points for a "${jobTitle}" role${company ? ` at ${company}` : ''}.
${keywords ? `incorporate these keywords: ${keywords}` : ''}
Use strong action verbs (e.g., Spearheaded, Orchestrated, Developed).
Focus on achievements and impact (using numbers where possible).
Output strictly valid JSON in this format:
{
  "bullets": [
    "bullet point 1",
    "bullet point 2",
    ...
  ]
}`;

        const aiResponse = await callGemini(prompt, systemPrompt);

        if (!aiResponse) {
            throw new Error('No response from AI');
        }

        const parsedData = parseJsonResponse(aiResponse);

        return new Response(JSON.stringify({
            success: true,
            data: parsedData
        }), { headers: corsHeaders });

    } catch (error) {
        console.error('Error in resume-enhancer:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), { status: 500, headers: corsHeaders });
    }
});
