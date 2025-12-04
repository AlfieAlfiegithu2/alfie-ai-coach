import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  
  try {
    const { batchSize = 50 } = await req.json().catch(() => ({}));
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get words missing IPA
    const { data: words, error: fetchError } = await supabase
      .from('vocab_cards')
      .select('id, term')
      .or('ipa.is.null,ipa.eq.')
      .limit(batchSize);
    
    if (fetchError) throw fetchError;
    if (!words || words.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No words missing IPA',
        processed: 0 
      }), { headers: { ...cors, 'Content-Type': 'application/json' } });
    }
    
    console.log(`Processing ${words.length} words for IPA generation`);
    
    // Build batch prompt for efficiency
    const termList = words.map(w => w.term).join('\n');
    
    const systemPrompt = `You are a phonetics expert. Generate IPA (International Phonetic Alphabet) transcriptions for English words.
Return a JSON object where keys are the words and values are their IPA transcriptions.
Use standard IPA notation with slashes, e.g., /ˈwɔːtər/ for "water".
Only return valid JSON, no explanation.`;

    const userPrompt = `Generate IPA for these words:\n${termList}`;
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://englishaidol.com',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-001',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        max_tokens: 4000,
      })
    });
    
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenRouter error: ${errText}`);
    }
    
    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || '{}';
    
    // Parse the IPA results
    let ipaMap: Record<string, string> = {};
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        ipaMap = JSON.parse(jsonMatch[0]);
      }
    } catch (parseErr) {
      console.error('Failed to parse IPA response:', parseErr);
      throw new Error('Failed to parse IPA response');
    }
    
    // Update each word with its IPA
    let updated = 0;
    let failed = 0;
    
    for (const word of words) {
      const ipa = ipaMap[word.term] || ipaMap[word.term.toLowerCase()];
      if (ipa) {
        const { error: updateError } = await supabase
          .from('vocab_cards')
          .update({ ipa })
          .eq('id', word.id);
        
        if (updateError) {
          console.error(`Failed to update ${word.term}:`, updateError);
          failed++;
        } else {
          updated++;
        }
      } else {
        console.log(`No IPA found for: ${word.term}`);
        failed++;
      }
    }
    
    // Check remaining count
    const { count: remaining } = await supabase
      .from('vocab_cards')
      .select('id', { count: 'exact', head: true })
      .or('ipa.is.null,ipa.eq.');
    
    return new Response(JSON.stringify({ 
      success: true, 
      processed: words.length,
      updated,
      failed,
      remaining: remaining || 0
    }), { headers: { ...cors, 'Content-Type': 'application/json' } });
    
  } catch (e) {
    console.error('Error:', e);
    return new Response(JSON.stringify({ 
      success: false, 
      error: String((e as any).message || e) 
    }), { 
      status: 500, 
      headers: { ...cors, 'Content-Type': 'application/json' } 
    });
  }
});

