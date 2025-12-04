import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
const D1_API_URL = 'https://alfie-translations-api.ryanbigbang15.workers.dev';

interface WordItem {
  id: string;
  term: string;
  pos: string | null;
}

async function generateSentencesForBatch(words: WordItem[]): Promise<{ id: string; sentence: string }[]> {
  const wordList = words.map(w => `- ${w.term} (${w.pos || 'word'})`).join('\n');
  
  const prompt = `Generate ONE short English example sentence (8-15 words) for each vocabulary word below. 
The sentence should be natural, everyday language that clearly demonstrates the word's meaning.

Words:
${wordList}

Return ONLY a JSON array with objects containing "term" and "sentence". Example:
[{"term": "happy", "sentence": "She felt happy when she received the good news."}]

IMPORTANT: Return valid JSON array only, no other text.`;

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://englishaidol.com',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.0-flash-001',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter error: ${error}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content || '[]';
  
  // Parse JSON from response
  let sentences: { term: string; sentence: string }[] = [];
  try {
    // Try to find JSON array in the response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      sentences = JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('Failed to parse sentences:', e);
    return [];
  }

  // Map back to word IDs
  const results: { id: string; sentence: string }[] = [];
  for (const word of words) {
    const match = sentences.find(s => 
      s.term?.toLowerCase() === word.term.toLowerCase()
    );
    if (match?.sentence) {
      results.push({ id: word.id, sentence: match.sentence });
    }
  }
  
  return results;
}

async function updateD1Sentences(sentences: { id: string; sentence: string }[]): Promise<void> {
  // Update D1 via batch endpoint
  const response = await fetch(`${D1_API_URL}/cards/update-sentences`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sentences }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`D1 update error: ${error}`);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: cors });
  }

  try {
    if (!OPENROUTER_API_KEY) {
      throw new Error('Missing OPENROUTER_API_KEY');
    }

    const { batchSize = 20, offset = 0, limit = 100 } = await req.json().catch(() => ({}));

    // Fetch words without sentences from D1
    const cardsResponse = await fetch(
      `${D1_API_URL}/cards/without-sentences?limit=${limit}&offset=${offset}`
    );
    
    if (!cardsResponse.ok) {
      throw new Error(`Failed to fetch cards: ${await cardsResponse.text()}`);
    }
    
    const cardsData = await cardsResponse.json();
    const words: WordItem[] = cardsData.data || [];
    
    if (words.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No more words without sentences',
        processed: 0,
        remaining: 0,
      }), { headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    console.log(`Processing ${words.length} words starting from offset ${offset}`);
    
    let totalProcessed = 0;
    let totalSentences = 0;
    const errors: string[] = [];

    // Process in batches
    for (let i = 0; i < words.length; i += batchSize) {
      const batch = words.slice(i, i + batchSize);
      console.log(`Batch ${Math.floor(i / batchSize) + 1}: ${batch.length} words`);
      
      try {
        const sentences = await generateSentencesForBatch(batch);
        
        if (sentences.length > 0) {
          await updateD1Sentences(sentences);
          totalSentences += sentences.length;
        }
        
        totalProcessed += batch.length;
        
        // Small delay between batches
        if (i + batchSize < words.length) {
          await new Promise(r => setTimeout(r, 200));
        }
      } catch (e) {
        errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${(e as Error).message}`);
        console.error(`Batch error:`, e);
      }
    }

    // Get remaining count
    const remainingResponse = await fetch(`${D1_API_URL}/cards/without-sentences?limit=1&offset=0`);
    const remainingData = await remainingResponse.json();
    const remaining = remainingData.total || 0;

    return new Response(JSON.stringify({
      success: true,
      processed: totalProcessed,
      sentencesGenerated: totalSentences,
      remaining,
      errors: errors.length > 0 ? errors : undefined,
    }), { headers: { ...cors, 'Content-Type': 'application/json' } });

  } catch (e) {
    console.error('Error:', e);
    return new Response(JSON.stringify({
      success: false,
      error: (e as Error).message,
    }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
});

