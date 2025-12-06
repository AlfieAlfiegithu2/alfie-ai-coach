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
        const { imageBase64, questionRange, questionType, testType } = await req.json();

        console.log('📸 Extracting questions from image:', {
            questionRange: questionRange || 'AUTO-DETECT',
            questionType: questionType || 'AUTO-DETECT',
            testType,
            imageSize: imageBase64?.length || 0
        });

        // Validate inputs
        if (!imageBase64) {
            throw new Error('Missing required field: imageBase64');
        }

        let startNum, endNum, expectedQuestionType;
        let autoDetectMode = false;

        // Parse question range if provided, otherwise auto-detect
        if (questionRange && questionRange.trim()) {
            const parts = questionRange.split('-').map((n: string) => parseInt(n.trim()));
            startNum = parts[0];
            endNum = parts[1];

            if (isNaN(startNum) || isNaN(endNum) || startNum > endNum) {
                throw new Error('Invalid question range format. Use format: "1-13" or "14-21"');
            }
        } else {
            autoDetectMode = true;
            console.log('🔍 Auto-detect mode enabled for question range');
        }

        expectedQuestionType = questionType || null;
        if (!expectedQuestionType) {
            autoDetectMode = true;
            console.log('🔍 Auto-detect mode enabled for question type');
        }

        const totalQuestions = startNum && endNum ? endNum - startNum + 1 : null;
        if (totalQuestions) {
            console.log(`📊 Extracting ${totalQuestions} questions (${startNum}-${endNum})`);
        }

        // Initialize Gemini API
        const apiKey = Deno.env.get('GEMINI_API_KEY');
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY not configured');
        }

        const genAI = new GoogleGenerativeAI(apiKey);

        // Use the most capable model - Gemini 2.0 Flash for vision tasks
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash-exp",
            generationConfig: {
                temperature: 0.1, // Low temperature for accurate extraction
                topP: 0.95,
                topK: 40,
                maxOutputTokens: 8192,
            }
        });

        // Construct detailed prompt - with auto-detection if needed
        const rangeInstruction = startNum && endNum
            ? `Extract questions numbered ${startNum} to ${endNum} from the image.`
            : `First, identify the question numbers visible in this image. Then extract ALL questions you can see, starting from the lowest number to the highest.`;

        const typeInstruction = expectedQuestionType
            ? `The questions are of type: ${expectedQuestionType}`
            : `Analyze and determine the question type(s) from the following options: Multiple Choice, Fill in the Blank, True/False/Not Given, Matching, Sentence Completion, Short Answer, Summary Completion, Note Completion, Diagram Labeling, Table Completion.`;

        const prompt = `You are an expert IELTS test question extractor with perfect accuracy.

TASK: Analyze this image containing IELTS Listening questions.

${rangeInstruction}

INSTRUCTIONS:
1. ${autoDetectMode ? 'First identify the question range (start and end numbers) visible in the image' : 'Extract ONLY questions numbered ' + startNum + ' to ' + endNum}
2. ${typeInstruction}
3. For each question, extract ALL components exactly as shown.
4. **CRITICAL FOR NOTE/TABLE COMPLETION:** 
   - Include the row label/prompt in 'question_text' (e.g., if image shows "Weight (1) ...", text should be "Weight").
   - If there are informational rows/text without questions (e.g., "Make Allegro") appearing between questions, include this text in the 'question_text' of the NEXT question, separated by a newline. 
   - Capture any section headers (e.g., "Questions 1-5", "Complete the notes") in 'section_header'.
   - Capture specific section labels (e.g. "The Gherkin Building", "Features") in 'section_label'.
5. Preserve exact wording, spelling, and formatting from the image.
6. Number questions correctly based on what you see in the image.

OUTPUT FORMAT:
Return a valid JSON object with this exact structure:

{
  "detectedRange": "${autoDetectMode ? '<start>-<end> based on what you see' : questionRange}",
  "detectedType": "${expectedQuestionType || '<type you identified>'}",
  "questions": [
    {
      "question_number": <number>,
      "question_text": "<exact question text including labels and preceding informational rows>",
      "question_type": "<detected question type>",
      "options": <array of options for MCQ, or null for other types>,
      "correct_answer": "<correct answer if visible, or empty string>",
      "explanation": "<explanation if visible, or empty string>",
      "section_header": "<header text for the group of questions>",
      "section_label": "<specific label for this section/row>"
    }
  ]
}

IMPORTANT:
- Return ONLY the JSON object, no markdown formatting, no explanations
- For Multiple Choice: include all options (A, B, C, D) in the options array
- For Fill in the Blank: set options to null
- For True/False/Not Given: include ["True", "False", "Not Given"] as options
- If you cannot read a question clearly, include what you can see and mark with "[unclear]"
- Be precise with question numbers - use exactly what's shown in the image
${totalQuestions ? `- You should extract exactly ${totalQuestions} questions` : '- Extract ALL visible questions'}

BEGIN EXTRACTION:`;

        console.log('🤖 Calling Gemini API...');

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    mimeType: "image/jpeg",
                    data: imageBase64
                }
            }
        ]);

        const response = result.response.text();
        console.log('📝 Gemini response received:', response.substring(0, 200) + '...');

        // Parse JSON from response
        let parsedData;
        let questions;
        let detectedRange;
        let detectedType;

        try {
            // Remove any markdown code blocks if present
            let jsonStr = response.trim();

            // Remove markdown code blocks
            jsonStr = jsonStr.replace(/```json\s*/g, '').replace(/```\s*/g, '');

            // Find JSON object in the response
            const objectStart = jsonStr.indexOf('{');
            const objectEnd = jsonStr.lastIndexOf('}') + 1;

            if (objectStart !== -1 && objectEnd > objectStart) {
                jsonStr = jsonStr.substring(objectStart, objectEnd);
            }

            parsedData = JSON.parse(jsonStr);

            // Extract data from response
            if (parsedData.questions && Array.isArray(parsedData.questions)) {
                questions = parsedData.questions;
                detectedRange = parsedData.detectedRange || questionRange || 'Unknown';
                detectedType = parsedData.detectedType || questionType || 'Unknown';
            } else if (Array.isArray(parsedData)) {
                // Fallback: if response is just an array
                questions = parsedData;
                detectedRange = questionRange || 'Unknown';
                detectedType = questionType || 'Unknown';
            } else {
                throw new Error('Response does not contain a questions array');
            }

            // Validate each question has required fields
            questions = questions.map((q: any, index: number) => {
                if (!q.question_number) q.question_number = (startNum || 1) + index;
                if (!q.question_text) throw new Error(`Question ${index + 1} missing question_text`);
                if (!q.question_type) q.question_type = detectedType;
                if (q.options === undefined) q.options = null;
                if (!q.correct_answer) q.correct_answer = '';
                if (!q.explanation) q.explanation = '';

                return q;
            });

            console.log(`✅ Successfully extracted ${questions.length} questions`);
            console.log(`🔍 Detected range: ${detectedRange}, type: ${detectedType}`);

        } catch (parseError: any) {
            console.error('❌ JSON parsing error:', parseError);
            console.error('Raw response:', response);
            throw new Error(`Failed to parse Gemini response as JSON: ${parseError.message}`);
        }

        // Validate we got the expected number of questions (if specified)
        if (totalQuestions && questions.length !== totalQuestions) {
            console.warn(`⚠️ Expected ${totalQuestions} questions, got ${questions.length}`);
        }

        return new Response(JSON.stringify({
            success: true,
            questions,
            count: questions.length,
            expectedCount: totalQuestions,
            range: detectedRange,
            questionType: detectedType,
            autoDetected: autoDetectMode
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        console.error('❌ Error in gemini-question-extractor:', error);

        return new Response(JSON.stringify({
            success: false,
            error: error.message || 'Failed to extract questions',
            details: error.toString()
        }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
