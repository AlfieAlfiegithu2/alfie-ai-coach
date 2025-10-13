import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

  try {
    if (!DEEPSEEK_API_KEY) throw new Error('Missing DEEPSEEK_API_KEY');
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Unauthorized');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false, autoRefreshToken: false } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const body = await req.json().catch(() => ({}));
    const batchSize = 50;

    // Fetch words without proper level classification (level 1 or null)
    const { data: cards, error: fetchError } = await supabase
      .from('vocab_cards')
      .select('id, term, translation, context_sentence')
      .or('level.eq.1,level.is.null')
      .limit(1000);

    if (fetchError) throw fetchError;
    if (!cards || cards.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No words need classification',
        classified: 0
      }), { headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    console.log(`Classifying ${cards.length} words...`);
    let classified = 0;

    // Process in batches
    for (let i = 0; i < cards.length; i += batchSize) {
      const batch = cards.slice(i, i + batchSize);
      const words = batch.map(c => c.term).join(', ');

      const prompt = `Classify these English words by CEFR level (1=A1, 2=A2, 3=B1, 4=B2, 5=C1/C2). Return ONLY a JSON array with format: [{"word":"the","level":1},{"word":"subsequently","level":5},...]. Words: ${words}`;

      const resp = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${DEEPSEEK_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1,
          max_tokens: 2000
        })
      });

      if (!resp.ok) {
        console.error(`AI classification failed for batch ${i / batchSize + 1}`);
        continue;
      }

      const data = await resp.json();
      const raw = data?.choices?.[0]?.message?.content || '[]';
      let classifications: any[] = [];
      
      try {
        classifications = JSON.parse(raw);
      } catch {
        const m = raw.match(/\[[\s\S]*\]/);
        if (m) {
          try { classifications = JSON.parse(m[0]); } catch {}
        }
      }

      // Update each word's level
      for (const cls of classifications) {
        const card = batch.find(c => c.term.toLowerCase() === cls.word?.toLowerCase());
        if (card && cls.level >= 1 && cls.level <= 5) {
          await supabase
            .from('vocab_cards')
            .update({ level: cls.level })
            .eq('id', card.id);
          classified++;
        }
      }

      console.log(`Classified batch ${i / batchSize + 1}: ${classifications.length} words`);
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Classified ${classified} words using AI`,
      classified
    }), { headers: { ...cors, 'Content-Type': 'application/json' } });

  } catch (e) {
    console.error('Classification error:', e);
    return new Response(JSON.stringify({ 
      success: false, 
      error: String((e as any).message || e) 
    }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' }
    });
  }
});
