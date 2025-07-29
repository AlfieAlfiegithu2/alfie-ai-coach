import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const { contentType, level = "intermediate", count = 5 } = await req.json();

    console.log('📚 Generating content:', { contentType, level, count });

    let prompt = '';
    
    switch (contentType) {
      case 'general_english':
        prompt = `Create ${count} General English lessons for ${level} level students. Each lesson should include:
        - Title and topic
        - Learning objectives
        - Vocabulary (5-7 key words with definitions)
        - Grammar focus point
        - Practice exercises (3-4 questions)
        - Real-life usage examples
        
        Format as JSON array with structure:
        {
          "title": "lesson title",
          "topic": "topic area",
          "level": "${level}",
          "objectives": ["objective1", "objective2"],
          "vocabulary": [{"word": "example", "definition": "meaning", "example": "usage"}],
          "grammar_focus": "grammar point with explanation",
          "exercises": [{"question": "...", "options": [...], "correct": "answer", "explanation": "why"}],
          "real_world_usage": "practical application examples"
        }`;
        break;
        
      case 'pte_mock':
        prompt = `Create ${count} PTE Academic mock test questions covering:
        - Speaking (Describe Image, Read Aloud, Repeat Sentence)
        - Writing (Summarize Written Text, Essay)
        - Reading (Multiple Choice, Fill in Blanks)
        - Listening (Summarize Spoken Text, Multiple Choice)
        
        Format as JSON array with PTE-specific scoring criteria and time limits.`;
        break;
        
      case 'toefl_mock':
        prompt = `Create ${count} TOEFL iBT mock test questions covering:
        - Reading (Academic passages with questions)
        - Listening (Conversations and lectures)
        - Speaking (Independent and Integrated tasks)
        - Writing (Independent and Integrated essays)
        
        Format as JSON array with TOEFL-specific rubrics and timing.`;
        break;
        
      default:
        throw new Error('Invalid content type');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert English test preparation specialist. Create high-quality, authentic practice materials. Always respond with valid JSON only.' 
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 3000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const contentJson = data.choices[0].message.content;

    // Parse the JSON response
    let content;
    try {
      content = JSON.parse(contentJson);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      throw new Error('Invalid JSON response from AI');
    }

    // Add metadata
    const result = {
      success: true,
      content: Array.isArray(content) ? content : [content],
      contentType,
      level,
      generated_at: new Date().toISOString(),
      count: Array.isArray(content) ? content.length : 1
    };

    console.log('✅ Content generated successfully:', result.count, 'items');

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error generating content:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});