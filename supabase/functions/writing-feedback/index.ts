import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const { writing, prompt, taskType } = await req.json();

    if (!writing || !prompt) {
      throw new Error('Writing content and prompt are required');
    }

    const feedbackPrompt = `You are an expert IELTS Writing examiner. Analyze this IELTS Academic Writing ${taskType} response comprehensively.

TASK PROMPT: ${prompt}

STUDENT RESPONSE:
"${writing}"

Provide detailed analysis in the following format:

**WORD COUNT**: [Count and note if appropriate for task]

**TASK ACHIEVEMENT/RESPONSE** (25%):
- Task requirements addressed: [Rate 1-10]
- Key features covered: [List what's included/missing]
- Position clarity: [For Task 2, is the position clear?]
- Overview effectiveness: [For Task 1, is overview present and effective?]
- Band Score: [0-9 with half-bands (e.g., 6.5, 7.5) - detailed justification]

**COHERENCE & COHESION** (25%):
- Overall organization: [Rate 1-10]
- Paragraph structure: [Analyze logical flow]
- Cohesive devices: [Identify overuse/underuse/misuse]
- Progression of ideas: [Note any unclear connections]
- Band Score: [0-9 with half-bands (e.g., 6.5, 7.5) - detailed justification]

**LEXICAL RESOURCE** (25%):
- Vocabulary range: [Rate 1-10, note sophistication]
- Accuracy of word choice: [Identify errors/awkward usage]
- Spelling accuracy: [Count and list errors]
- Word formation: [Note any issues]
- Collocations: [Identify natural/unnatural combinations]
- Band Score: [0-9 with half-bands (e.g., 6.5, 7.5) - detailed justification]

**GRAMMATICAL RANGE & ACCURACY** (25%):
- Sentence variety: [Analyze simple/complex structures]
- Grammar accuracy: [Count and categorize errors]
- Punctuation: [Note errors and patterns]
- Common error patterns: [Identify systematic issues]
- Band Score: [0-9 with half-bands (e.g., 6.5, 7.5) - detailed justification]

**PREDICTED BAND SCORE**: [Overall band 0-9 with half-bands (e.g., 6.5, 7.5) - detailed explanation]

**ERROR ANALYSIS**:
- Critical errors: [List errors that impede communication]
- Minor errors: [List errors that don't impede meaning]
- Patterns to address: [Systematic issues to focus on]

**SPECIFIC IMPROVEMENTS**:
1. **Immediate Priority**: [Most important area with specific examples]
2. **Vocabulary Development**: [Specific words/phrases to learn]
3. **Grammar Focus**: [Specific structures to practice]
4. **Organization**: [Structural improvements needed]

**REWRITE SUGGESTIONS**:
[Provide 2-3 improved versions of problematic sentences]

**PRACTICE RECOMMENDATIONS**:
- [3-5 specific exercises targeting identified weaknesses]
- [Resources for improvement]

**STRENGTH HIGHLIGHTS**:
[Acknowledge what the student did well]

Be specific, constructive, and provide actionable feedback that helps achieve higher band scores.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are an expert IELTS Writing examiner with deep knowledge of band descriptors and assessment criteria. Use the official IELTS 0-9 band scale with half-bands (e.g., 6.5, 7.5). Provide detailed, professional feedback.'
          },
          {
            role: 'user',
            content: feedbackPrompt
          }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`Writing analysis failed: ${await response.text()}`);
    }

    const result = await response.json();
    const feedback = result.choices[0].message.content;

    return new Response(
      JSON.stringify({
        feedback,
        wordCount: writing.trim().split(/\s+/).length,
        success: true
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Writing feedback error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});