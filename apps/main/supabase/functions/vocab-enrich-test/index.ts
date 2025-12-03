import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { cardsPerRun = 5 } = body;

    console.log(`🚀 Test function called with cardsPerRun=${cardsPerRun}`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Get cards count
    const { count, error: countError } = await supabase
      .from('vocab_cards')
      .select('*', { count: 'exact', head: true })
      .eq('is_public', true)
      .eq('language', 'en');

    // Get a few cards
    const { data: cards, error: cardsError } = await supabase
      .from('vocab_cards')
      .select('id, term, ipa')
      .eq('is_public', true)
      .eq('language', 'en')
      .limit(cardsPerRun);

    // Get enrichments count for first card
    let enrichmentInfo = null;
    if (cards && cards.length > 0) {
      const { data: enrichments, error: enrichError } = await supabase
        .from('vocab_translation_enrichments')
        .select('card_id, lang, ipa, context')
        .eq('card_id', cards[0].id)
        .limit(5);
      
      enrichmentInfo = {
        cardId: cards[0].id,
        term: cards[0].term,
        enrichments: enrichments?.map(e => ({
          lang: e.lang,
          hasIpa: !!e.ipa,
          hasContext: !!e.context
        }))
      };
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Test function working!',
      debug: {
        totalCards: count,
        countError: countError?.message || null,
        fetchedCards: cards?.length || 0,
        cardsError: cardsError?.message || null,
        sampleCards: cards?.slice(0, 3).map(c => ({ id: c.id, term: c.term, hasIpa: !!c.ipa })),
        enrichmentInfo
      }
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

