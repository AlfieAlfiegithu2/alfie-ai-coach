import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

interface ParsedAnswer {
  question_number: number;
  answer: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { text, part } = await req.json();

    if (!text) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required field: text'
      }), { status: 400, headers: corsHeaders });
    }

    console.log(`📝 Parsing TOEIC answer key for Part ${part || 'all'}`);
    console.log(`📄 Text length: ${text.length} characters`);

    // Parse answer key using regex patterns
    // Supports multiple formats:
    // - "101. (A)" or "101.(A)" or "101 (A)" or "101: (A)"
    // - "101. A" or "101.A" or "101 A"
    // - "101(A)" format
    // - Multi-line or space-separated

    const answers: ParsedAnswer[] = [];
    
    // Clean up the text
    const cleanText = text
      .replace(/\n+/g, ' ')  // Replace newlines with spaces
      .replace(/\s+/g, ' ')  // Normalize whitespace
      .trim();

    // Pattern 1: "101. (A)" or "101.(A)" or "101 (A)" or "101: (A)"
    const pattern1 = /(\d+)\s*[.:)]*\s*\(([A-Da-d])\)/g;
    
    // Pattern 2: "101. A" or "101.A" (without parentheses)
    const pattern2 = /(\d+)\s*[.:]\s*([A-Da-d])(?=\s|$|\d)/g;
    
    // Pattern 3: "101(A)" format (no space)
    const pattern3 = /(\d+)\(([A-Da-d])\)/g;

    let match;
    const foundNumbers = new Set<number>();

    // Try pattern 1 first (most common)
    while ((match = pattern1.exec(cleanText)) !== null) {
      const questionNumber = parseInt(match[1]);
      const answer = match[2].toUpperCase();
      
      if (!foundNumbers.has(questionNumber)) {
        foundNumbers.add(questionNumber);
        answers.push({ question_number: questionNumber, answer });
      }
    }

    // Try pattern 2
    pattern2.lastIndex = 0;
    while ((match = pattern2.exec(cleanText)) !== null) {
      const questionNumber = parseInt(match[1]);
      const answer = match[2].toUpperCase();
      
      if (!foundNumbers.has(questionNumber)) {
        foundNumbers.add(questionNumber);
        answers.push({ question_number: questionNumber, answer });
      }
    }

    // Try pattern 3
    pattern3.lastIndex = 0;
    while ((match = pattern3.exec(cleanText)) !== null) {
      const questionNumber = parseInt(match[1]);
      const answer = match[2].toUpperCase();
      
      if (!foundNumbers.has(questionNumber)) {
        foundNumbers.add(questionNumber);
        answers.push({ question_number: questionNumber, answer });
      }
    }

    // Sort by question number
    answers.sort((a, b) => a.question_number - b.question_number);

    console.log(`✅ Parsed ${answers.length} answers`);
    
    if (answers.length > 0) {
      console.log(`📊 Question range: ${answers[0].question_number} - ${answers[answers.length - 1].question_number}`);
    }

    // Validate answers are within expected ranges for TOEIC
    const validAnswers = answers.filter(a => {
      // TOEIC has questions 1-200
      // Listening: 1-100, Reading: 101-200
      if (a.question_number < 1 || a.question_number > 200) {
        console.warn(`⚠️ Invalid question number: ${a.question_number}`);
        return false;
      }
      
      // Validate answer is A, B, C, or D
      if (!['A', 'B', 'C', 'D'].includes(a.answer)) {
        console.warn(`⚠️ Invalid answer for Q${a.question_number}: ${a.answer}`);
        return false;
      }
      
      return true;
    });

    // Group by part if requested
    let partAnswers = validAnswers;
    if (part) {
      const partRanges: { [key: number]: [number, number] } = {
        1: [1, 6],      // Part 1: Photos (6 questions)
        2: [7, 31],     // Part 2: Q&R (25 questions)
        3: [32, 70],    // Part 3: Conversations (39 questions)
        4: [71, 100],   // Part 4: Talks (30 questions)
        5: [101, 140],  // Part 5: Incomplete Sentences (40 questions)
        6: [141, 152],  // Part 6: Text Completion (12 questions)
        7: [153, 200],  // Part 7: Reading Comprehension (48 questions)
      };
      
      const range = partRanges[part];
      if (range) {
        partAnswers = validAnswers.filter(a => 
          a.question_number >= range[0] && a.question_number <= range[1]
        );
        console.log(`📋 Filtered to Part ${part}: ${partAnswers.length} answers (Q${range[0]}-Q${range[1]})`);
      }
    }

    // Create answer lookup map
    const answerMap: { [key: number]: string } = {};
    partAnswers.forEach(a => {
      answerMap[a.question_number] = a.answer;
    });

    return new Response(JSON.stringify({
      success: true,
      answers: partAnswers,
      answerMap,
      count: partAnswers.length,
      totalParsed: answers.length,
      part: part || 'all',
      range: partAnswers.length > 0 ? {
        start: partAnswers[0].question_number,
        end: partAnswers[partAnswers.length - 1].question_number
      } : null
    }), { headers: corsHeaders });

  } catch (error: any) {
    console.error('❌ Error in toeic-parse-answers:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Failed to parse answer key'
    }), { status: 500, headers: corsHeaders });
  }
});

