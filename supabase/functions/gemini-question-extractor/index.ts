import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.21.0";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// IELTS Listening Question Types with descriptions for accurate detection
const IELTS_LISTENING_QUESTION_TYPES = {
    'Multiple Choice': 'Questions with A, B, C, D options where you select one or more correct answers',
    'Matching': 'Match items from a list to options/criteria (e.g., match speakers to opinions)',
    'Plan/Map/Diagram Labelling': 'Label locations on a map, plan, or diagram, usually from a list',
    'Form Completion': 'Fill in blanks in a form with factual details (names, addresses, numbers)',
    'Note Completion': 'Fill in blanks in notes/bullet points summarizing information',
    'Table Completion': 'Fill in blanks in a table with categorized information',
    'Flow-chart Completion': 'Fill in blanks showing stages of a process with arrows',
    'Summary Completion': 'Fill in blanks in a paragraph summarizing the audio',
    'Sentence Completion': 'Complete sentences with words from the audio',
    'Short Answer': 'Write brief answers to questions (e.g., list 2 things, what is the price)'
};

// TOEIC Question Types by Part
const TOEIC_QUESTION_TYPES = {
    // Listening Parts (1-4)
    'Part 1 - Photos': 'Look at a photograph and choose the statement that best describes it (A, B, C, D)',
    'Part 2 - Question-Response': 'Listen to a question and choose the best response (A, B, C)',
    'Part 3 - Conversations': 'Listen to a conversation and answer questions about it (A, B, C, D)',
    'Part 4 - Talks': 'Listen to a talk/announcement and answer questions about it (A, B, C, D)',
    // Reading Parts (5-7)
    'Part 5 - Incomplete Sentences': 'Choose the word/phrase that best completes the sentence (A, B, C, D)',
    'Part 6 - Text Completion': 'Complete passages with missing words or sentences (A, B, C, D)',
    'Part 7 - Reading Comprehension': 'Read passages and answer questions about content (A, B, C, D)'
};

// PTE Academic Question Types
const PTE_QUESTION_TYPES = {
    // Reading (5 types)
    'Fill in the Blanks (Dropdown)': 'Select the correct word from dropdown options to complete the text',
    'Multiple Choice Multiple Answers': 'Select all correct answers from the options provided',
    'Reorder Paragraph': 'Arrange text boxes in the correct order to form a coherent paragraph',
    'Fill in the Blanks (Drag and Drop)': 'Drag words from a word bank to fill in the blanks in the text',
    'Multiple Choice Single Answer': 'Select the single correct answer from the options',
    // Listening (8 types)
    'Summarize Spoken Text': 'Write a 50-70 word summary of the audio',
    'Listening MCQ Multiple': 'Select all correct answers based on the audio',
    'Fill in Blanks Type In': 'Type the missing words you hear in the audio',
    'Highlight Correct Summary': 'Select the paragraph that best summarizes the audio',
    'Listening MCQ Single': 'Select the single correct answer based on the audio',
    'Select Missing Word': 'Select the word that completes the recording',
    'Highlight Incorrect Words': 'Click on words in the transcript that differ from what you hear',
    'Write from Dictation': 'Type the exact sentence you hear'
};

// Function to build PTE-specific prompts
function buildPTEPrompt(testType: string, questionRange: string | null, isAnswersOnly: boolean): string {
    if (isAnswersOnly) {
        return `You are an expert PTE Academic answer key extractor with perfect accuracy.

TASK: Extract ONLY the answer key from this PTE test answer sheet image.

INSTRUCTIONS:
1. Look for numbered answers
2. Extract the correct answer for each question
3. Be precise - copy answers EXACTLY as shown
4. Handle all answer formats: letters (A, B, C, D), words, phrases

OUTPUT FORMAT:
Return a valid JSON object:

{
  "detectedRange": "${questionRange || '<start>-<end> based on what you see'}",
  "detectedType": "Answer Key",
  "questions": [
    {
      "question_number": <number>,
      "question_text": "Answer for question <number>",
      "question_type": "Answer Key",
      "options": null,
      "correct_answer": "<exact answer from image>",
      "explanation": ""
    }
  ]
}

IMPORTANT:
- Return ONLY the JSON object, no markdown formatting
- Extract ALL visible answers in order

BEGIN EXTRACTION:`;
    }

    // Full question extraction for PTE
    return `You are an expert PTE Academic test question extractor. Extract questions from this PTE test image.

PTE ACADEMIC QUESTION TYPES:

READING SECTION:
- Fill in the Blanks (Dropdown): Text with blanks, select correct word from dropdown
- Multiple Choice Multiple Answers: Select all correct answers
- Reorder Paragraph: Arrange text boxes in correct order
- Fill in the Blanks (Drag and Drop): Drag words to fill blanks
- Multiple Choice Single Answer: Select one correct answer

LISTENING SECTION:
- Summarize Spoken Text: Write 50-70 word summary
- Multiple Choice Multiple Answers: Select all correct based on audio
- Fill in the Blanks (Type In): Type missing words heard
- Highlight Correct Summary: Select best summary paragraph
- Multiple Choice Single Answer: Select one correct answer
- Select Missing Word: Select word completing recording
- Highlight Incorrect Words: Click words differing from audio
- Write from Dictation: Type sentence heard

QUESTION TYPE DETECTION:
${Object.entries(PTE_QUESTION_TYPES).map(([type, desc]) => `- ${type}: ${desc}`).join('\n')}

EXTRACTION INSTRUCTIONS:
1. Identify the PTE question type from the format
2. Extract question number, text, and all options
3. For Fill in Blanks: Identify blank positions with [BLANK] marker
4. For Reorder: Extract each paragraph as separate item
5. For MCQ: Extract all options (A, B, C, D, E)
6. For passages: Include the full passage text

OUTPUT FORMAT:
Return a valid JSON object:

{
  "detectedRange": "${questionRange || '<start>-<end>'}",
  "detectedType": "<detected PTE question type>",
  "pteSection": "reading|listening",
  "passage": "<full passage text if applicable>",
  "paragraphs": [
    {
      "id": "A",
      "text": "<paragraph text for reorder questions>"
    }
  ],
  "wordBank": ["word1", "word2"],
  "questions": [
    {
      "question_number": <number>,
      "question_text": "<full question text with [BLANK] markers if applicable>",
      "question_type": "<detected type>",
      "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
      "correct_answer": "<correct answer or comma-separated for multiple>",
      "explanation": "",
      "passage_context": "<relevant passage text if applicable>"
    }
  ]
}

SPECIAL HANDLING:

For Reorder Paragraph:
- Extract each text box as a paragraph with id (A, B, C, D, E)
- The correct_answer should be the correct order (e.g., "C, A, D, B")

For Fill in the Blanks:
- Mark blank positions in question_text with [BLANK]
- Include word bank in "wordBank" array
- correct_answer should be comma-separated in order of blanks

For Highlight Incorrect Words:
- Include the transcript in question_text
- correct_answer should be comma-separated list of incorrect words

CRITICAL RULES:
- Return ONLY valid JSON, no markdown
- Extract ALL visible questions
- Preserve exact text including punctuation
- Detect the correct question type based on format

BEGIN EXTRACTION:`;
}

// Function to build TOEIC-specific prompts
function buildTOEICPrompt(testType: string, questionRange: string | null, isAnswersOnly: boolean): string {
    if (isAnswersOnly) {
        return `You are an expert TOEIC answer key extractor with perfect accuracy.

TASK: Extract ONLY the answer key from this TOEIC test answer sheet image.

INSTRUCTIONS:
1. Look for numbered answers (typically 1-200 for full test, or specific ranges)
2. Extract the correct answer letter (A, B, C, D) for each question
3. Be precise - copy answers EXACTLY as shown
4. TOEIC uses letters only (no words or True/False)

OUTPUT FORMAT:
Return a valid JSON object:

{
  "detectedRange": "${questionRange || '<start>-<end> based on what you see'}",
  "detectedType": "Answer Key",
  "questions": [
    {
      "question_number": <number>,
      "question_text": "Answer for question <number>",
      "question_type": "Answer Key",
      "options": null,
      "correct_answer": "<A, B, C, or D>",
      "explanation": ""
    }
  ]
}

IMPORTANT:
- Return ONLY the JSON object, no markdown formatting
- Extract ALL visible answers in order
- Answers should be single letters: A, B, C, or D

BEGIN EXTRACTION:`;
    }

    // Full question extraction for TOEIC
    return `You are an expert TOEIC test question extractor. Extract questions from this TOEIC test image.

TOEIC STRUCTURE:
- Part 1 (Listening - Photos): 6 questions, look at photo choose best description
- Part 2 (Listening - Q&R): 25 questions, question and best response
- Part 3 (Listening - Conversations): 39 questions, conversations with 3 questions each
- Part 4 (Listening - Talks): 30 questions, talks with 3 questions each
- Part 5 (Reading - Incomplete Sentences): 40 questions, sentences with blank + 4 options
- Part 6 (Reading - Text Completion): 12 questions, passages with blanks
- Part 7 (Reading - Comprehension): 48 questions, passages with questions

QUESTION TYPE DETECTION:
${Object.entries(TOEIC_QUESTION_TYPES).map(([type, desc]) => `- ${type}: ${desc}`).join('\n')}

EXTRACTION INSTRUCTIONS:
1. Identify which TOEIC Part this is from the question format
2. Extract the question number, text, and all options (A, B, C, D)
3. For Part 5: The question is a sentence with a blank (-------)
4. For Part 6 & 7: Include passage context if visible
5. Detect if this is a passage-based question set

OUTPUT FORMAT:
Return a valid JSON object:

{
  "detectedRange": "${questionRange || '<start>-<end>'}",
  "detectedType": "<detected TOEIC part type>",
  "toeicPart": <1-7>,
  "passages": [
    {
      "title": "<passage title if any>",
      "content": "<passage text>",
      "type": "single|double|triple",
      "questionStart": <first question number>,
      "questionEnd": <last question number>
    }
  ],
  "questions": [
    {
      "question_number": <number>,
      "question_text": "<full question or sentence with blank>",
      "question_type": "<detected type>",
      "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
      "correct_answer": "",
      "explanation": "",
      "passage_context": "<relevant passage text if Part 6 or 7>"
    }
  ]
}

CRITICAL RULES:
- Return ONLY valid JSON, no markdown
- Extract ALL visible questions
- Options should be the actual text, not just letters
- For sentences with blanks, preserve the blank marker (------- or ______)
- Detect Part 5/6/7 based on format: isolated sentences (P5), passages with blanks (P6), passages with questions (P7)

BEGIN EXTRACTION:`;
}

Deno.serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { imageBase64, questionRange, questionType, extractionType, testType, testId } = await req.json();

        console.log('📸 Extracting questions from image:', {
            questionRange: questionRange || 'AUTO-DETECT',
            questionType: questionType || 'AUTO-DETECT',
            extractionType: extractionType || 'questions',
            testType,
            testId,
            imageSize: imageBase64?.length || 0
        });

        // Validate inputs
        if (!imageBase64) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Missing required field: imageBase64',
                details: 'Please upload an image to extract questions from'
            }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Validate base64 format - should be clean base64 without data URL prefix
        let cleanBase64 = imageBase64;
        if (imageBase64.includes(',')) {
            cleanBase64 = imageBase64.split(',')[1];
        }

        if (!cleanBase64 || cleanBase64.length < 100) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Invalid image data',
                details: 'The image data appears to be empty or malformed'
            }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        let startNum: number | null = null;
        let endNum: number | null = null;
        let expectedQuestionType = questionType || null;
        let autoDetectMode = false;
        const isAnswersOnly = extractionType === 'answers';

        // Parse question range if provided, otherwise auto-detect
        if (questionRange && questionRange.trim()) {
            const parts = questionRange.split('-').map((n: string) => parseInt(n.trim()));
            startNum = parts[0];
            endNum = parts[1];

            if (isNaN(startNum) || isNaN(endNum) || startNum > endNum) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'Invalid question range format',
                    details: 'Use format: "1-13" or "14-21"'
                }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
        } else {
            autoDetectMode = true;
            console.log('🔍 Auto-detect mode enabled for question range');
        }

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
            return new Response(JSON.stringify({
                success: false,
                error: 'GEMINI_API_KEY not configured',
                details: 'Please configure the GEMINI_API_KEY in your Supabase Edge Function secrets'
            }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const genAI = new GoogleGenerativeAI(apiKey);

        // Use Gemini 2.0 Flash for vision tasks
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash-exp",
            generationConfig: {
                temperature: 0.1, // Low temperature for accurate extraction
                topP: 0.95,
                topK: 40,
                maxOutputTokens: 8192,
            }
        });

        // Build prompt based on extraction type and test type
        let prompt: string;

        // Check if this is a TOEIC or PTE test
        const isTOEIC = testType?.toUpperCase() === 'TOEIC';
        const isPTE = testType?.toUpperCase() === 'PTE';
        
        if (isTOEIC) {
            // Use TOEIC-specific prompt
            console.log('📋 Using TOEIC extraction prompt');
            prompt = buildTOEICPrompt(testType, questionRange, isAnswersOnly);
        } else if (isPTE) {
            // Use PTE-specific prompt
            console.log('📋 Using PTE extraction prompt');
            prompt = buildPTEPrompt(testType, questionRange, isAnswersOnly);
        } else if (isAnswersOnly) {
            // Answers-only extraction prompt for IELTS
            prompt = `You are an expert IELTS answer key extractor with perfect accuracy.

TASK: Extract ONLY the answer key from this IELTS Listening test answer sheet image.

INSTRUCTIONS:
1. Look for numbered answers (1-40 typically)
2. Extract the correct answer for each question number
3. Be precise - copy answers EXACTLY as shown
4. Handle all answer formats: letters (A, B, C, D), words, numbers, True/False/Not Given

OUTPUT FORMAT:
Return a valid JSON object:

{
  "detectedRange": "${startNum && endNum ? `${startNum}-${endNum}` : '<start>-<end> based on what you see'}",
  "detectedType": "Answer Key",
  "taskInstructions": "",
  "questions": [
    {
      "question_number": <number>,
      "question_text": "Answer for question <number>",
      "question_type": "Answer Key",
      "options": null,
      "correct_answer": "<exact answer from image>",
      "explanation": ""
    }
  ]
}

IMPORTANT:
- Return ONLY the JSON object, no markdown formatting
- Extract ALL visible answers in order
- Copy answers EXACTLY as written (including capital letters, numbers, etc.)

BEGIN EXTRACTION:`;
        } else {
            // Full question extraction prompt for IELTS Listening
            const rangeInstruction = startNum && endNum
                ? `Extract questions numbered ${startNum} to ${endNum} from the image.`
                : `First, identify the question numbers visible in this image. Then extract ALL questions you can see.`;

            const typeInstruction = expectedQuestionType && expectedQuestionType !== 'auto'
                ? `The questions are of type: ${expectedQuestionType}`
                : `CRITICALLY IMPORTANT - Detect the EXACT question type from these IELTS Listening types:
${Object.entries(IELTS_LISTENING_QUESTION_TYPES).map(([type, desc]) => `- ${type}: ${desc}`).join('\n')}`;

            prompt = `You are an expert IELTS Listening test question extractor. Your job is to accurately extract the COMPLETE exam paper structure from test images.

TASK: Extract the COMPLETE IELTS Listening question paper from this image.

${rangeInstruction}

QUESTION TYPE DETECTION:
${typeInstruction}

KEY DETECTION RULES:
- If you see blanks to fill in within NOTES or BULLET POINTS → "Note Completion"
- If you see blanks to fill in within a TABLE with rows/columns → "Table Completion"  
- If you see blanks to fill in within a FORM (name, address, phone fields) → "Form Completion"
- If you see blanks within connected BOXES WITH ARROWS → "Flow-chart Completion"
- If you see blanks within a PARAGRAPH of text → "Summary Completion"
- If you see A, B, C, D OPTIONS to choose from → "Multiple Choice"
- If you see a MAP or DIAGRAM with labels to complete → "Plan/Map/Diagram Labelling"
- If you see items to MATCH between two lists → "Matching"
- If you see standalone SENTENCES with blanks → "Sentence Completion"
- If you see questions asking to LIST things or give SHORT ANSWERS → "Short Answer"

⚠️ CRITICAL - EXTRACT THE COMPLETE STRUCTURE:
In IELTS exams, students see the ENTIRE form/notes/table - not just the blanks!
You MUST extract BOTH:
1. Items WITH blanks (questions) - mark as isQuestion: true
2. Items WITHOUT blanks (context) - mark as isQuestion: false

For example, if the paper shows:
"Weight: (1) ...........
Make: Allegro
Memory: only (2) ........"

You must extract ALL THREE rows - "Make: Allegro" is context that students need to see!

EXTRACTION INSTRUCTIONS:
1. Extract the TASK INSTRUCTIONS exactly (e.g., "Write NO MORE THAN TWO WORDS...")
2. Identify the Part/Section number if shown
3. Extract the COMPLETE STRUCTURE including ALL items visible
4. For items with blanks → isQuestion: true, include question_number
5. For items without blanks → isQuestion: false, question_number: null

OUTPUT FORMAT:
Return a valid JSON object:

{
  "detectedRange": "${autoDetectMode ? '<start>-<end>' : questionRange}",
  "detectedType": "<detected IELTS question type>",
  "partNumber": "<Part 1/2/3/4 or Section number>",
  "taskInstructions": "<EXACT task instructions including word limits>",
  "structureItems": [
    {
      "order": 1,
      "label": "<field label, e.g., 'Weight', 'Name'>",
      "displayText": "<full text to display, e.g., 'Weight: (1) ___' or 'Make: Allegro'>",
      "isQuestion": true,
      "questionNumber": 1,
      "prefixText": "<text before the blank>",
      "suffixText": "<text after the blank>"
    },
    {
      "order": 2,
      "label": "Make",
      "displayText": "Make: Allegro",
      "isQuestion": false,
      "questionNumber": null,
      "value": "Allegro"
    }
  ],
  "questions": [
    {
      "question_number": 1,
      "question_text": "Weight: (1) _______________",
      "question_type": "<detected type>",
      "options": null,
      "correct_answer": "",
      "explanation": "",
      "fieldLabel": "Weight"
    }
  ]
}

EXAMPLE 1 - Note Completion (short labels with blanks):
Image shows:
"Part 1 - Questions 1-5
Complete the notes below. Write NO MORE THAN TWO WORDS OR A NUMBER.

Weight: (1) ..................
Make: Allegro
Memory: only (2) ................"

Output:
{
  "detectedRange": "1-2",
  "detectedType": "Note Completion",
  "partNumber": "Part 1",
  "taskInstructions": "Complete the notes below. Write NO MORE THAN TWO WORDS OR A NUMBER for each answer.",
  "structureItems": [
    { "order": 1, "label": "Weight", "displayText": "Weight: (1) ___", "isQuestion": true, "questionNumber": 1 },
    { "order": 2, "label": "Make", "displayText": "Make: Allegro", "isQuestion": false, "value": "Allegro" },
    { "order": 3, "label": "Memory", "displayText": "Memory: only (2) ___", "isQuestion": true, "questionNumber": 2, "prefixText": "only" }
  ],
  "questions": [
    { "question_number": 1, "question_text": "Weight: (1) ___", "question_type": "Note Completion", "fieldLabel": "Weight" },
    { "question_number": 2, "question_text": "Memory: only (2) ___", "question_type": "Note Completion", "fieldLabel": "Memory" }
  ]
}

EXAMPLE 2 - Sentence Completion (FULL SENTENCES with blanks):
⚠️ CRITICAL RULES FOR SENTENCE COMPLETION:
1. DO NOT split sentences into left/right parts
2. DO NOT put the question number inside the sentence text
3. Keep question number ONLY in questionNumber field
4. The displayText should be the CLEAN sentence with just the blank marker
5. Use "........................" or "_______" for the blank

Image shows:
"Questions 16-20    Complete the information below.
Write NO MORE THAN TWO WORDS for each answer.

(16) The Health Sciences building is next to the history ......................... .
(17) There are .......................... each term.
(18) In the first module, students will study health and safety in the .......................... .
(19) Students will have to complete a .......................... by the end of the course.
(20) There will be speakers from various .......................... ."

Output:
{
  "detectedRange": "16-20",
  "detectedType": "Sentence Completion",
  "partNumber": "Part 2",
  "taskInstructions": "Complete the information below. Write NO MORE THAN TWO WORDS for each answer.",
  "structureItems": [
    { "order": 1, "displayText": "The Health Sciences building is next to the history ......................... .", "isQuestion": true, "questionNumber": 16, "fullSentence": true },
    { "order": 2, "displayText": "There are ......................... each term.", "isQuestion": true, "questionNumber": 17, "fullSentence": true },
    { "order": 3, "displayText": "In the first module, students will study health and safety in the ......................... .", "isQuestion": true, "questionNumber": 18, "fullSentence": true },
    { "order": 4, "displayText": "Students will have to complete a ......................... by the end of the course.", "isQuestion": true, "questionNumber": 19, "fullSentence": true },
    { "order": 5, "displayText": "There will be speakers from various ......................... .", "isQuestion": true, "questionNumber": 20, "fullSentence": true }
  ],
  "questions": [
    { "question_number": 16, "question_text": "The Health Sciences building is next to the history ......................... .", "question_type": "Sentence Completion" },
    { "question_number": 17, "question_text": "There are ......................... each term.", "question_type": "Sentence Completion" },
    { "question_number": 18, "question_text": "In the first module, students will study health and safety in the ......................... .", "question_type": "Sentence Completion" },
    { "question_number": 19, "question_text": "Students will have to complete a ......................... by the end of the course.", "question_type": "Sentence Completion" },
    { "question_number": 20, "question_text": "There will be speakers from various ......................... .", "question_type": "Sentence Completion" }
  ]
}

⚠️ IMPORTANT: Notice that displayText does NOT include "(16)", "(17)", etc. - the question number is ONLY in the questionNumber field!

KEY DIFFERENCE:
- Note/Form Completion: Short labels like "Weight:", "Name:", "Memory:" → use "label" field
- Sentence Completion: Full sentences → use "displayText" with the CLEAN sentence (no question number), set "fullSentence": true

CRITICAL RULES:
- Return ONLY valid JSON, no markdown
- MUST include structureItems with ALL visible items (questions AND context)
- questions array should only contain items with blanks
- Detect the CORRECT question type
- Extract task instructions EXACTLY as written
${totalQuestions ? `- Extract exactly ${totalQuestions} questions` : '- Extract ALL visible questions'}

BEGIN EXTRACTION:`;
        }

        console.log('🤖 Calling Gemini API...');
        console.log('📋 Prompt type:', isAnswersOnly ? 'Answers Only' : 'Full Questions');

        // Detect mime type from base64
        let mimeType = "image/jpeg";
        if (cleanBase64.startsWith('/9j/')) {
            mimeType = "image/jpeg";
        } else if (cleanBase64.startsWith('iVBORw')) {
            mimeType = "image/png";
        } else if (cleanBase64.startsWith('UklGR')) {
            mimeType = "image/webp";
        }

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    mimeType,
                    data: cleanBase64
                }
            }
        ]);

        const response = result.response.text();
        console.log('📝 Gemini response received:', response.substring(0, 300) + '...');

        // Parse JSON from response
        let parsedData;
        let questions;
        let structureItems: any[] = [];
        let detectedRange;
        let detectedType;
        let taskInstructions = '';
        let partNumber = '';

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
                taskInstructions = parsedData.taskInstructions || '';
                partNumber = parsedData.partNumber || parsedData.toeicPart?.toString() || '';
                structureItems = parsedData.structureItems || [];
                
                // Handle TOEIC-specific passages
                if (parsedData.passages && Array.isArray(parsedData.passages)) {
                    structureItems = [...structureItems, ...parsedData.passages.map((p: any) => ({
                        ...p,
                        isPassage: true
                    }))];
                }
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
                if (!q.question_text) q.question_text = `Question ${q.question_number}`;
                if (!q.question_type) q.question_type = detectedType;
                if (q.options === undefined) q.options = null;
                if (!q.correct_answer) q.correct_answer = '';
                if (!q.explanation) q.explanation = '';
                if (!q.fieldLabel) q.fieldLabel = '';

                return q;
            });

            // Validate and clean structure items
            structureItems = structureItems.map((item: any, index: number) => {
                let cleanDisplayText = item.displayText || '';
                
                // For sentence completion (fullSentence items), clean up the displayText
                // Remove any embedded question numbers like "(16)" or "16." from the text
                if (item.fullSentence || (cleanDisplayText.length > 40 && !item.label)) {
                    cleanDisplayText = cleanDisplayText
                        .replace(/^\s*\(?\d+\)?\s*\.?\s*/, '') // Remove leading "(16)" or "16."
                        .replace(/\s*\(\d+\)\s*/g, ' ') // Remove "(17)" from middle
                        .trim();
                }
                
                return {
                    order: item.order || index + 1,
                    label: item.label || '',
                    displayText: cleanDisplayText,
                    isQuestion: item.isQuestion || false,
                    questionNumber: item.questionNumber || null,
                    value: item.value || null,
                    prefixText: item.prefixText || '',
                    suffixText: item.suffixText || '',
                    fullSentence: item.fullSentence || false
                };
            });

            console.log(`✅ Successfully extracted ${questions.length} questions`);
            console.log(`📋 Structure items: ${structureItems.length}`);
            console.log(`🔍 Detected range: ${detectedRange}, type: ${detectedType}`);
            console.log(`📋 Task instructions: ${taskInstructions}`);
            console.log(`📍 Part number: ${partNumber}`);

        } catch (parseError: any) {
            console.error('❌ JSON parsing error:', parseError);
            console.error('Raw response:', response);
            return new Response(JSON.stringify({
                success: false,
                error: `Failed to parse Gemini response as JSON: ${parseError.message}`,
                details: 'The AI response was not in the expected format. Please try again.',
                rawResponse: response.substring(0, 500)
            }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Validate we got the expected number of questions (if specified)
        if (totalQuestions && questions.length !== totalQuestions) {
            console.warn(`⚠️ Expected ${totalQuestions} questions, got ${questions.length}`);
        }

        // Build response with TOEIC-specific fields if applicable
        const responseData: any = {
            success: true,
            questions,
            structureItems,
            count: questions.length,
            structureCount: structureItems.length,
            expectedCount: totalQuestions,
            range: detectedRange,
            questionType: detectedType,
            taskInstructions,
            partNumber,
            autoDetected: autoDetectMode,
            extractionType: isAnswersOnly ? 'answers' : 'questions',
            testType: testType || 'IELTS'
        };

        // Add TOEIC-specific fields
        if (isTOEIC) {
            responseData.toeicPart = parsedData?.toeicPart || parseInt(partNumber) || null;
            responseData.passages = parsedData?.passages || structureItems.filter((s: any) => s.isPassage);
        }

        // Add PTE-specific fields
        if (isPTE) {
            responseData.pteSection = parsedData?.pteSection || null;
            responseData.passage = parsedData?.passage || null;
            responseData.paragraphs = parsedData?.paragraphs || [];
            responseData.wordBank = parsedData?.wordBank || [];
        }

        return new Response(JSON.stringify(responseData), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        console.error('❌ Error in gemini-question-extractor:', error);

        // Check for specific Gemini API errors
        let errorMessage = error.message || 'Failed to extract questions';
        let errorDetails = error.toString();

        if (error.message?.includes('API key')) {
            errorMessage = 'Invalid or missing Gemini API key';
            errorDetails = 'Please check your GEMINI_API_KEY configuration';
        } else if (error.message?.includes('quota')) {
            errorMessage = 'API quota exceeded';
            errorDetails = 'Please try again later or upgrade your Gemini API plan';
        } else if (error.message?.includes('safety')) {
            errorMessage = 'Content filtered by safety settings';
            errorDetails = 'The image may have been blocked by content filters. Please try a different image.';
        }

        return new Response(JSON.stringify({
            success: false,
            error: errorMessage,
            details: errorDetails
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});

