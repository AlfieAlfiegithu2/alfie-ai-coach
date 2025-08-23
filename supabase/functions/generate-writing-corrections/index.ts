import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CorrectionSpan {
  text: string;
  status: "neutral" | "error" | "improvement";
}

interface CorrectionResponse {
  original_spans: CorrectionSpan[];
  corrected_spans: CorrectionSpan[];
  sentence_pairs: Array<{
    original: string;
    corrected: string;
    changes_made: string[];
  }>;
  summary: {
    total_corrections: number;
    error_types: string[];
    improvement_areas: string[];
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userSubmission } = await req.json();

    if (!userSubmission || typeof userSubmission !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid user submission provided' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const deepSeekApiKey = Deno.env.get('DEEPSEEK_API_KEY');
    if (!deepSeekApiKey) {
      console.error('❌ DEEPSEEK_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { 
          status: 503, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('🎯 Starting correction analysis for submission length:', userSubmission.length);

    const prompt = `You are an expert IELTS examiner and writing coach. Analyze the student's writing and create a high-quality improved version that would score Band 9.

TASK: For the given text, provide:
1. Word-level analysis of the original text, marking errors
2. An improved version with corrections and enhancements
3. Sentence-by-sentence comparison
4. Summary of improvements

STUDENT'S WRITING:
${userSubmission}

INSTRUCTIONS:
1. Break down the original text into spans (words/phrases)
2. Mark each span as "neutral", "error" if it contains mistakes
3. Create an improved version with sophisticated vocabulary, better grammar, and enhanced clarity
4. Mark improvements in the corrected version as "improvement"
5. Provide sentence-by-sentence pairs for detailed comparison

Return your analysis as a JSON object with this EXACT structure:
{
  "original_spans": [
    {"text": "word or phrase", "status": "neutral|error"},
    ...
  ],
  "corrected_spans": [
    {"text": "improved word or phrase", "status": "neutral|improvement"},
    ...
  ],
  "sentence_pairs": [
    {
      "original": "original sentence",
      "corrected": "improved sentence", 
      "changes_made": ["description of changes"]
    },
    ...
  ],
  "summary": {
    "total_corrections": number,
    "error_types": ["grammar", "vocabulary", "clarity", etc.],
    "improvement_areas": ["description of major improvements"]
  }
}

CRITICAL REQUIREMENTS:
- Maintain the original meaning and content
- Focus on IELTS band 9 criteria: Task Achievement, Coherence & Cohesion, Lexical Resource, Grammar
- Be thorough but not overly critical
- Ensure JSON is valid and parseable
- Mark substantial improvements, not just corrections`;

    console.log('🚀 Making DeepSeek API call...');

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${deepSeekApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'You are an expert IELTS examiner. Provide detailed writing corrections in the exact JSON format requested. Always return valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 4000,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      console.error('❌ DeepSeek API error:', response.status, response.statusText);
      throw new Error(`DeepSeek API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ DeepSeek API response received');

    if (!data.choices || data.choices.length === 0) {
      throw new Error('No response from AI');
    }

    let content = data.choices[0].message.content;
    console.log('🔍 Raw AI response length:', content.length);

    // Clean and parse JSON
    content = content.trim();
    
    // Remove markdown code blocks if present
    if (content.startsWith('```json')) {
      content = content.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (content.startsWith('```')) {
      content = content.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    let correctionData: CorrectionResponse;
    try {
      correctionData = JSON.parse(content);
    } catch (parseError) {
      console.error('❌ Failed to parse AI response as JSON:', parseError);
      console.log('🔍 Content that failed to parse:', content.substring(0, 500));
      
      // Fallback: create a basic correction structure
      const words = userSubmission.split(/\s+/);
      correctionData = {
        original_spans: words.map(word => ({ text: word + ' ', status: 'neutral' as const })),
        corrected_spans: words.map(word => ({ text: word + ' ', status: 'neutral' as const })),
        sentence_pairs: [
          {
            original: userSubmission,
            corrected: userSubmission,
            changes_made: ['AI analysis temporarily unavailable']
          }
        ],
        summary: {
          total_corrections: 0,
          error_types: [],
          improvement_areas: ['AI analysis will be available shortly']
        }
      };
    }

    // Validate the structure
    if (!correctionData.original_spans || !correctionData.corrected_spans) {
      throw new Error('Invalid correction data structure');
    }

    console.log('✅ Correction analysis completed:', {
      original_spans: correctionData.original_spans.length,
      corrected_spans: correctionData.corrected_spans.length,
      sentence_pairs: correctionData.sentence_pairs?.length || 0,
      total_corrections: correctionData.summary?.total_corrections || 0
    });

    return new Response(
      JSON.stringify(correctionData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('❌ Error in generate-writing-corrections:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate corrections',
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});