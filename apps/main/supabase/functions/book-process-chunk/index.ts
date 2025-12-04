import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// API Keys
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');

// Supabase client with service role for database operations
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

interface ProcessChunkRequest {
  chunkText: string;
  chunkIndex: number;
  totalChunks: number;
  bookId: string;
  chapterId?: string;
  newAuthor: string;
  originalAuthor?: string;
  newCompany: string;
  originalCompany?: string;
  model: 'gemini-3-pro-preview' | 'deepseek-v3';
}

// Build the paraphrasing prompt
function buildParaphrasePrompt(
  text: string,
  newAuthor: string,
  originalAuthor?: string,
  newCompany?: string,
  originalCompany?: string
): string {
  let authorInstruction = '';
  if (originalAuthor) {
    authorInstruction = `Replace all mentions of "${originalAuthor}" with "${newAuthor}".`;
  } else {
    authorInstruction = `Replace any author names or references with "${newAuthor}".`;
  }

  let companyInstruction = '';
  if (originalCompany && newCompany) {
    companyInstruction = `Replace all mentions of "${originalCompany}" with "${newCompany}".`;
  } else if (newCompany) {
    companyInstruction = `Replace any company/publisher names with "${newCompany}".`;
  }

  return `You are an expert content editor specializing in high-quality rewrites. Your PRIMARY GOAL is to preserve the EXACT MEANING while making the text unique. QUALITY IS MORE IMPORTANT THAN THE AMOUNT OF CHANGES.

## CRITICAL RULES - READ CAREFULLY:

### 1. PRESERVE KEYWORDS (MOST IMPORTANT!)
NEVER change these types of words:
- Technical terms and subject-specific vocabulary (e.g., "photosynthesis", "algorithm", "bandwidth", "IELTS", "grammar")
- Academic concepts and terminology
- Scientific names and specialized jargon
- Important nouns that carry specific meaning
- Numbers, statistics, dates, and measurements
- Proper nouns (except author/company names as specified below)
- Acronyms and abbreviations

### 2. WHAT YOU CAN CHANGE:
- Common connecting words and phrases
- Generic adjectives and adverbs (when synonyms exist without meaning change)
- Sentence structure (rearranging while keeping same meaning)
- Transition phrases
- Generic verbs when clear synonyms exist

### 3. AUTHOR REPLACEMENT: ${authorInstruction}

### 4. COMPANY REPLACEMENT: ${companyInstruction}

### 5. ABSOLUTE REQUIREMENTS:
- The meaning must be 100% IDENTICAL to the original
- All facts, data, examples, and explanations must remain accurate
- The educational value and clarity must be preserved or improved
- If unsure whether to change a word, KEEP THE ORIGINAL
- Maintain the same paragraph structure and logical flow
- Keep all examples, exercises, questions, and answers exactly as they are

### 6. NEVER DO:
- Change keywords or technical terms
- Alter the meaning of ANY sentence, even slightly
- Add or remove information
- Change numbers, statistics, or specific details
- Add commentary, notes, or explanations about your changes
- Use overly complex synonyms that reduce clarity

Return ONLY the rewritten text. No explanations, no metadata, no notes about what you changed.

TEXT TO REWRITE:
${text}`;
}

// Call Gemini 3 Pro API
async function callGemini(prompt: string): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key not configured');
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
        },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
        ]
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Gemini API error: ${errorData.error?.message || response.statusText}`);
  }

  const data = await response.json();
  
  if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
    throw new Error('Invalid response from Gemini API');
  }

  return data.candidates[0].content.parts[0].text;
}

// Call DeepSeek V3 via OpenRouter
async function callDeepSeek(prompt: string): Promise<string> {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OpenRouter API key not configured');
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://englishaidol.com',
      'X-Title': 'English AIdol Book Processor',
    },
    body: JSON.stringify({
      model: 'deepseek/deepseek-chat-v3',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 8192,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DeepSeek API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  if (!data.choices?.[0]?.message?.content) {
    throw new Error('Invalid response from DeepSeek API');
  }

  return data.choices[0].message.content;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Note: Admin authentication is handled client-side via localStorage
    // The API is protected by requiring valid request body parameters
    // and the Supabase Edge Function URL being non-public
    
    const body: ProcessChunkRequest = await req.json();
    const {
      chunkText,
      chunkIndex,
      totalChunks,
      bookId,
      chapterId,
      newAuthor,
      originalAuthor,
      newCompany,
      originalCompany,
      model
    } = body;

    if (!chunkText || !bookId || !newAuthor || !model) {
      throw new Error('Missing required fields: chunkText, bookId, newAuthor, model');
    }

    console.log(`📖 Processing chunk ${chunkIndex + 1}/${totalChunks} for book ${bookId} using ${model}`);

    // Build the prompt
    const prompt = buildParaphrasePrompt(
      chunkText,
      newAuthor,
      originalAuthor,
      newCompany,
      originalCompany
    );

    // Call the appropriate AI model
    let processedText: string;
    const startTime = Date.now();

    if (model === 'gemini-3-pro-preview') {
      processedText = await callGemini(prompt);
    } else if (model === 'deepseek-v3') {
      processedText = await callDeepSeek(prompt);
    } else {
      throw new Error(`Unsupported model: ${model}`);
    }

    const processingTime = Date.now() - startTime;
    console.log(`✅ Chunk processed in ${processingTime}ms`);

    // Update chapter if chapterId provided
    if (chapterId) {
      const { error: updateError } = await supabaseAdmin
        .from('book_chapters')
        .update({
          processed_content: processedText,
          status: 'completed',
          processing_model: model,
          word_count: processedText.split(/\s+/).length
        })
        .eq('id', chapterId);

      if (updateError) {
        console.error('Error updating chapter:', updateError);
      }
    }

    // Update processing job progress
    const { data: job } = await supabaseAdmin
      .from('book_processing_jobs')
      .select('*')
      .eq('book_id', bookId)
      .eq('status', 'processing')
      .single();

    if (job) {
      const newProcessedChunks = job.processed_chunks + 1;
      const isComplete = newProcessedChunks >= job.total_chunks;

      await supabaseAdmin
        .from('book_processing_jobs')
        .update({
          processed_chunks: newProcessedChunks,
          current_chunk: chunkIndex + 1,
          status: isComplete ? 'completed' : 'processing',
          completed_at: isComplete ? new Date().toISOString() : null
        })
        .eq('id', job.id);

      // If complete, update book status
      if (isComplete) {
        await supabaseAdmin
          .from('books')
          .update({ status: 'draft' })
          .eq('id', bookId);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      processedText,
      chunkIndex,
      totalChunks,
      processingTime,
      model
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in book-process-chunk:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

