import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.21.0";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { audioUrl, transcript } = await req.json();

        console.log('🎙️ Generating timestamps for transcript:', {
            audioUrl,
            transcriptLength: transcript?.length || 0
        });

        // Validate inputs
        if (!audioUrl || !transcript) {
            throw new Error('Missing required fields: audioUrl, transcript');
        }

        // Initialize Gemini API
        const apiKey = Deno.env.get('GEMINI_API_KEY');
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY not configured');
        }

        const genAI = new GoogleGenerativeAI(apiKey);

        // Use Gemini 2.0 Flash for audio analysis
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash-exp",
            generationConfig: {
                temperature: 0.1,
                topP: 0.95,
                topK: 40,
                maxOutputTokens: 8192,
            }
        });

        // Fetch audio file
        console.log('📥 Fetching audio file...');
        const audioResponse = await fetch(audioUrl);
        if (!audioResponse.ok) {
            throw new Error(`Failed to fetch audio: ${audioResponse.status}`);
        }

        const audioBuffer = await audioResponse.arrayBuffer();
        const audioBase64 = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));

        console.log(`✅ Audio fetched: ${(audioBuffer.byteLength / 1024 / 1024).toFixed(2)} MB`);

        // Construct prompt for timestamp generation
        const prompt = `You are an expert audio transcription analyzer. Analyze this audio file and the provided transcript text.

TRANSCRIPT TEXT:
"${transcript}"

TASK:
Generate character-level timestamps for this transcript. Listen to the audio and determine when each character (letter, space, punctuation) is spoken.

OUTPUT FORMAT:
Return ONLY valid JSON with this exact structure:

{
  "characters": ["H", "e", "l", "l", "o", " ", "w", "o", "r", "l", "d"],
  "characterStartTimesSeconds": [0.0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5],
  "characterEndTimesSeconds": [0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55]
}

IMPORTANT:
- Split the transcript into individual characters
- Each character should have a start time and end time in seconds
- Times must be accurate based on when words are actually spoken in the audio
- Include spaces and punctuation as characters
- Ensure arrays are same length
- Return ONLY the JSON object, no markdown or explanations
- Times should progress chronologically

BEGIN ANALYSIS:`;

        console.log('🤖 Calling Gemini for timestamp generation...');

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    mimeType: "audio/mpeg",
                    data: audioBase64
                }
            }
        ]);

        const response = result.response.text();
        console.log('📝 Gemini response received');

        // Parse JSON response
        let timestamps;
        try {
            // Remove markdown code blocks if present
            let jsonStr = response.trim();
            jsonStr = jsonStr.replace(/```json\s*/g, '').replace(/```\s*/g, '');

            // Find JSON object
            const objectStart = jsonStr.indexOf('{');
            const objectEnd = jsonStr.lastIndexOf('}') + 1;

            if (objectStart !== -1 && objectEnd > objectStart) {
                jsonStr = jsonStr.substring(objectStart, objectEnd);
            }

            timestamps = JSON.parse(jsonStr);

            // Validate structure
            if (!timestamps.characters || !timestamps.characterStartTimesSeconds || !timestamps.characterEndTimesSeconds) {
                throw new Error('Invalid timestamp structure');
            }

            if (timestamps.characters.length !== timestamps.characterStartTimesSeconds.length ||
                timestamps.characters.length !== timestamps.characterEndTimesSeconds.length) {
                throw new Error('Timestamp arrays have mismatched lengths');
            }

            console.log(`✅ Generated timestamps for ${timestamps.characters.length} characters`);

        } catch (parseError: any) {
            console.error('❌ JSON parsing error:', parseError);
            console.error('Raw response:', response);
            throw new Error(`Failed to parse Gemini response: ${parseError.message}`);
        }

        return new Response(JSON.stringify({
            success: true,
            timestamps,
            characterCount: timestamps.characters.length,
            duration: timestamps.characterEndTimesSeconds[timestamps.characterEndTimesSeconds.length - 1]
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        console.error('❌ Error in generate-transcript-timestamps:', error);

        return new Response(JSON.stringify({
            success: false,
            error: error.message || 'Failed to generate timestamps',
            details: error.toString()
        }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
