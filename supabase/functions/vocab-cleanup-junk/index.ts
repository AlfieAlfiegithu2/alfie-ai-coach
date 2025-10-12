import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Unauthorized');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false, autoRefreshToken: false } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    console.log('Starting junk cleanup...');

    // 1. Delete single letters and abbreviations
    const junkPatterns = [
      ...Array.from({ length: 26 }, (_, i) => String.fromCharCode(97 + i)),
      'cd', 'dvd', 'tv', 'pc', 'usa', 'uk', 'eu', 'ceo', 'cto', 'hr', 'it', 'pr'
    ];

    const { data: junkCards } = await supabase
      .from('vocab_cards')
      .select('id, term')
      .in('term', junkPatterns);

    const junkIds = junkCards?.map(c => c.id) || [];
    
    // 2. Find exact duplicates (same term)
    const { data: allCards } = await supabase
      .from('vocab_cards')
      .select('id, term, frequency_rank')
      .order('term');

    const duplicateIds: string[] = [];
    if (allCards) {
      const termMap = new Map<string, Array<{id: string, rank: number | null}>>();
      
      for (const card of allCards) {
        if (!termMap.has(card.term)) {
          termMap.set(card.term, []);
        }
        termMap.get(card.term)!.push({ id: card.id, rank: card.frequency_rank });
      }

      // Keep the one with lowest frequency_rank, delete others
      for (const [term, cards] of termMap) {
        if (cards.length > 1) {
          cards.sort((a, b) => (a.rank || 999999) - (b.rank || 999999));
          duplicateIds.push(...cards.slice(1).map(c => c.id));
        }
      }
    }

    // 3. Find plural forms where singular exists
    const pluralIds: string[] = [];
    if (allCards) {
      const terms = new Set(allCards.map(c => c.term));
      for (const card of allCards) {
        if (card.term.endsWith('s') && card.term.length > 2) {
          const singular = card.term.slice(0, -1);
          // Check if singular form exists and isn't itself
          if (terms.has(singular) && singular !== card.term) {
            pluralIds.push(card.id);
          }
        }
      }
    }

    const allDeleteIds = [...new Set([...junkIds, ...duplicateIds, ...pluralIds])];

    if (allDeleteIds.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No junk, duplicates, or unnecessary plurals found',
        deleted: 0
      }), { headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    console.log(`Found ${junkIds.length} junk, ${duplicateIds.length} duplicates, ${pluralIds.length} plurals to delete`);

    const { error: deleteError } = await supabase
      .from('vocab_cards')
      .delete()
      .in('id', allDeleteIds);

    if (deleteError) throw deleteError;

    return new Response(JSON.stringify({
      success: true,
      message: `Cleaned up ${allDeleteIds.length} entries (${junkIds.length} junk, ${duplicateIds.length} duplicates, ${pluralIds.length} plurals)`,
      deleted: allDeleteIds.length,
      breakdown: {
        junk: junkIds.length,
        duplicates: duplicateIds.length,
        plurals: pluralIds.length
      }
    }), { headers: { ...cors, 'Content-Type': 'application/json' } });

  } catch (e) {
    console.error('Cleanup error:', e);
    return new Response(JSON.stringify({ 
      success: false, 
      error: String((e as any).message || e) 
    }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' }
    });
  }
});
