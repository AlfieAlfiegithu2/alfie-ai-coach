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

CRITICAL: IELTS Note/Table Completion Format
The image likely shows a TWO-COLUMN format like this:
| Label (left)         | Value/Blank (right)     |
|---------------------|-------------------------|
| Weight              | (1) ...............     |
| Make                | Allegro                 | ← INFO ROW (no blank)
| Memory              | only (2) ..........     |
| Screen              | (3) ...............     |
| Touch pad...        |                         | ← INFO ROW (no blank)
| Battery lasts       | (4) ...............     |
| Latest programmes   | Not (5) ............    |

INSTRUCTIONS:
1. ${autoDetectMode ? 'First identify the question range (start and end numbers) visible in the image' : 'Extract ONLY questions numbered ' + startNum + ' to ' + endNum}
2. ${typeInstruction}
3. **FOR EACH ROW IN THE IMAGE:**
   - Extract the LEFT column text as 'label'
   - Extract the RIGHT column text as 'value' (may include question number like "(1)", "(2)", etc.)
   - If a row has a blank (.....), it's a QUESTION row
   - If a row has NO blank and just static text (like "Make Allegro"), it's an INFO row
4. Include ALL rows - both QUESTION rows AND INFO rows
5. For INFO rows: set question_number to 0 and is_info_row to true
6. Preserve exact wording, spelling, and formatting from the image

OUTPUT FORMAT:
Return a valid JSON object with this exact structure:

{
  "detectedRange": "${autoDetectMode ? '<start>-<end> based on what you see' : questionRange}",
  "detectedType": "${expectedQuestionType || '<type you identified>'}",
  "rows": [
    {
      "question_number": <number or 0 for info rows>,
      "is_info_row": <true if no blank, false if has blank>,
      "label": "<left column text>",
      "value": "<right column text including 'only', 'Not', etc. before the blank>",
      "question_type": "<detected question type>",
      "options": <array of options for MCQ, or null>,
      "correct_answer": "",
      "section_header": "<header text if this is first row>",
      "section_label": "<section label if applicable>"
    }
  ]
}

EXAMPLE for the image shown:
{
  "detectedRange": "1-5",
  "detectedType": "Note Completion",
  "rows": [
    { "question_number": 1, "is_info_row": false, "label": "Weight", "value": "", "question_type": "note_completion" },
    { "question_number": 0, "is_info_row": true, "label": "Make", "value": "Allegro", "question_type": "note_completion" },
    { "question_number": 2, "is_info_row": false, "label": "Memory", "value": "only", "question_type": "note_completion" },
    { "question_number": 3, "is_info_row": false, "label": "Screen", "value": "", "question_type": "note_completion" },
    { "question_number": 0, "is_info_row": true, "label": "Touch pad but with cordless mouse", "value": "", "question_type": "note_completion" },
    { "question_number": 4, "is_info_row": false, "label": "Battery lasts", "value": "", "question_type": "note_completion" },
    { "question_number": 5, "is_info_row": false, "label": "Latest programmes", "value": "Not", "question_type": "note_completion" }
  ]
}

IMPORTANT:
- Return ONLY the JSON object, no markdown formatting
- Extract EVERY row you see, including informational rows
- For info rows without blanks, set question_number to 0 and is_info_row to true
- Preserve the exact text from both columns
${totalQuestions ? `- You should find ${totalQuestions} question rows (plus any info rows)` : '- Extract ALL visible rows'}

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
            detectedRange = parsedData.detectedRange || questionRange || 'Unknown';
            detectedType = parsedData.detectedType || questionType || 'Unknown';

            // Handle new "rows" format (for IELTS note/table completion)
            if (parsedData.rows && Array.isArray(parsedData.rows)) {
                console.log(`📊 Processing ${parsedData.rows.length} rows (new format)`);
                
                // Convert rows to questions format, preserving info rows
                questions = parsedData.rows.map((row: any, index: number) => {
                    const isInfoRow = row.is_info_row === true || row.question_number === 0;
                    
                    // Build question_text from label + value
                    let questionText = row.label || '';
                    if (row.value && row.value.trim()) {
                        questionText = questionText; // Keep label as main text
                    }
                    
                    return {
                        question_number: isInfoRow ? 0 : (row.question_number || index + 1),
                        question_text: questionText,
                        question_type: row.question_type || detectedType || 'note_completion',
                        options: row.options || null,
                        correct_answer: row.correct_answer || '',
                        explanation: row.explanation || '',
                        section_header: row.section_header || '',
                        section_label: row.section_label || '',
                        // New fields for IELTS format
                        is_info_row: isInfoRow,
                        label: row.label || '',
                        value: row.value || '',
                    };
                });
            }
            // Handle old "questions" format (backward compatibility)
            else if (parsedData.questions && Array.isArray(parsedData.questions)) {
                console.log(`📊 Processing ${parsedData.questions.length} questions (old format - converting)`);
                questions = parsedData.questions.map((q: any) => ({
                    ...q,
                    // Ensure new fields exist
                    label: q.label || '',
                    value: q.value || '',
                    is_info_row: q.is_info_row || false,
                    section_header: q.section_header || '',
                    section_label: q.section_label || '',
                }));
            } else if (Array.isArray(parsedData)) {
                // Fallback: if response is just an array
                questions = parsedData;
            } else {
                throw new Error('Response does not contain a questions or rows array');
            }

            // Validate and normalize each question - ensure label/value fields exist
            questions = questions.map((q: any, index: number) => {
                if (q.question_number === undefined) q.question_number = (startNum || 1) + index;
                if (!q.question_type) q.question_type = detectedType || 'note_completion';
                if (q.options === undefined) q.options = null;
                if (!q.correct_answer) q.correct_answer = '';
                if (!q.explanation) q.explanation = '';
                
                // CRITICAL: Ensure label and value fields are properly set
                // If label exists, use it. Otherwise, try to extract from question_text
                if (!q.label && q.question_text) {
                    // question_text might be in format "Label: value" or just "Label"
                    const text = q.question_text;
                    // Remove question number patterns like "(1)", "(2)" etc.
                    const cleanText = text.replace(/\(\d+\)\s*\.+/g, '').replace(/\(\d+\)/g, '').trim();
                    // If there's a colon, split by it
                    if (cleanText.includes(':')) {
                        const parts = cleanText.split(':');
                        q.label = parts[0].trim();
                        q.value = parts.slice(1).join(':').trim();
                    } else {
                        q.label = cleanText;
                        q.value = q.value || '';
                    }
                }
                
                // Ensure these fields always exist
                if (!q.label) q.label = '';
                if (!q.value) q.value = '';
                if (q.is_info_row === undefined) q.is_info_row = false;
                
                // Set question_text from label if empty
                if (!q.question_text) {
                    q.question_text = q.label || `Question ${q.question_number}`;
                }

                return q;
            });

            console.log(`✅ Successfully extracted ${questions.length} items (questions + info rows)`);
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
