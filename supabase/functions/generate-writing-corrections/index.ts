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
  };
}

serve(async (req) => {
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
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { 
          status: 503, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('🎯 Starting simple correction analysis for submission:', userSubmission.substring(0, 100));

    // Simple prompt focusing on quick corrections
    const prompt = `Analyze this IELTS writing and provide corrections in JSON format:

TEXT: ${userSubmission}

Provide ONLY a valid JSON response with this structure:
{
  "original_spans": [{"text": "word ", "status": "neutral"}],
  "corrected_spans": [{"text": "word ", "status": "neutral"}], 
  "sentence_pairs": [
    {
      "original": "original sentence",
      "corrected": "improved sentence",
      "changes_made": ["brief change description"]
    }
  ],
  "summary": {
    "total_corrections": 3,
    "error_types": ["grammar", "vocabulary"]
  }
}

Rules:
- Keep spans simple (1-2 words max)
- Mark errors as "error", improvements as "improvement", rest as "neutral"
- Focus on major grammar/vocabulary issues only
- Keep it concise and fast`;

    console.log('🚀 Making DeepSeek API call...');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

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
            content: 'You are an IELTS examiner. Return only valid JSON. Be quick and concise.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.2,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error('❌ DeepSeek API error:', response.status);
      throw new Error(`DeepSeek API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ DeepSeek response received');

    if (!data.choices || data.choices.length === 0) {
      throw new Error('No response from AI');
    }

    let content = data.choices[0].message.content.trim();
    
    // Clean JSON
    if (content.startsWith('```json')) {
      content = content.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (content.startsWith('```')) {
      content = content.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    let correctionData: CorrectionResponse;
    try {
      correctionData = JSON.parse(content);
    } catch (parseError) {
      console.error('❌ Parse error, using fallback');
      
      // Simple fallback
      const words = userSubmission.split(/\s+/);
      correctionData = {
        original_spans: words.map(word => ({ text: word + ' ', status: 'neutral' as const })),
        corrected_spans: words.map(word => ({ text: word + ' ', status: 'neutral' as const })),
        sentence_pairs: [
          {
            original: userSubmission,
            corrected: userSubmission,
            changes_made: ['Analysis temporarily unavailable']
          }
        ],
        summary: {
          total_corrections: 0,
          error_types: []
        }
      };
    }

    // Ensure structure exists
    if (!correctionData.original_spans || !correctionData.corrected_spans) {
      throw new Error('Invalid correction structure');
    }

    console.log('✅ Analysis completed successfully');

    return new Response(
      JSON.stringify(correctionData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('❌ Error:', error);
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