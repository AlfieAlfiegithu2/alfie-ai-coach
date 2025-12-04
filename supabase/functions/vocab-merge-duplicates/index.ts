// deno-lint-ignore-file no-explicit-any
// Edge function to merge UK/US spelling duplicates in vocab_cards

// @ts-ignore - Deno global
declare const Deno: any;

const UK_US_PAIRS = [
  ['sympathise', 'sympathize'],
  ['honour', 'honor'],
  ['fulfil', 'fulfill'],
  ['scrutinise', 'scrutinize'],
  ['harbour', 'harbor'],
  ['personalise', 'personalize'],
  ['personalisation', 'personalization'],
  ['characterisation', 'characterization'],
  ['lacklustre', 'lackluster'],
  ['neutralise', 'neutralize'],
  ['neutralisation', 'neutralization'],
  ['digitalise', 'digitalize'],
  ['digitalisation', 'digitalization'],
  ['archaeologist', 'archeologist'],
  ['catalogue', 'catalog'],
  ['categorisation', 'categorization'],
  ['overemphasise', 'overemphasize'],
  ['penalise', 'penalize'],
  ['popularise', 'popularize'],
  ['crystallise', 'crystallize'],
  ['dehumanise', 'dehumanize'],
  ['endeavour', 'endeavor'],
  ['familiarise', 'familiarize'],
  ['generalisation', 'generalization'],
  ['hospitalise', 'hospitalize'],
  ['humanise', 'humanize'],
  ['idolise', 'idolize'],
  ['industrialise', 'industrialize'],
  ['italicise', 'italicize'],
  ['jeopardise', 'jeopardize'],
  ['mechanise', 'mechanize'],
  ['mediaeval', 'medieval'],
  ['micrometre', 'micrometer'],
  ['millimetre', 'millimeter'],
  ['modernisation', 'modernization'],
  ['modernise', 'modernize'],
  ['offence', 'offense'],
  ['reorganise', 'reorganize'],
  ['revolutionise', 'revolutionize'],
  ['publicise', 'publicize'],
  ['realisation', 'realization'],
  ['tumour', 'tumor'],
  ['utilise', 'utilize'],
  ['vigour', 'vigor'],
  ['socialise', 'socialize'],
  ['disorganised', 'disorganized'],
  ['enrol', 'enroll'],
  ['instil', 'instill'],
  ['neighbouring', 'neighboring'],
  ['unauthorised', 'unauthorized'],
  ['appal', 'appall'],
  ['skilful', 'skillful'],
];

// @ts-ignore - Deno serve
Deno.serve(async (req: Request) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');

    if (!serviceRoleKey || !supabaseUrl) {
      throw new Error('Missing Supabase environment variables');
    }

    // @ts-ignore - Deno import
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const results = {
      merged: [] as string[],
      skipped: [] as string[],
      errors: [] as string[],
      exactDuplicatesFixed: 0,
    };

    // Process UK/US pairs
    for (const [uk, us] of UK_US_PAIRS) {
      try {
        // Find UK card (case insensitive)
        const { data: ukCards } = await supabase
          .from('vocab_cards')
          .select('id, term')
          .ilike('term', uk);

        // Find US card (case insensitive)
        const { data: usCards } = await supabase
          .from('vocab_cards')
          .select('id, term')
          .ilike('term', us);

        const ukCard = ukCards?.find((c: any) => c.term.toLowerCase() === uk.toLowerCase());
        const usCard = usCards?.find((c: any) => c.term.toLowerCase() === us.toLowerCase());

        if (ukCard && usCard) {
          const mergedTerm = `${uk}/${us}`;

          // Update UK card with merged term
          const { error: updateError } = await supabase
            .from('vocab_cards')
            .update({ term: mergedTerm })
            .eq('id', ukCard.id);

          if (updateError) {
            results.errors.push(`Update ${uk}: ${updateError.message}`);
            continue;
          }

          // Delete translations for US card
          await supabase
            .from('vocab_translations')
            .delete()
            .eq('card_id', usCard.id);

          // Delete US card
          const { error: deleteError } = await supabase
            .from('vocab_cards')
            .delete()
            .eq('id', usCard.id);

          if (deleteError) {
            results.errors.push(`Delete ${us}: ${deleteError.message}`);
            continue;
          }

          results.merged.push(`${uk}/${us}`);
        } else {
          results.skipped.push(`${uk}/${us} (not both found)`);
        }
      } catch (e: any) {
        results.errors.push(`${uk}/${us}: ${e.message}`);
      }
    }

    // Fix exact duplicates (case-insensitive)
    const exactDuplicates = ['january', 'december', 'it'];
    
    for (const term of exactDuplicates) {
      const { data: cards } = await supabase
        .from('vocab_cards')
        .select('id, term, created_at')
        .ilike('term', term)
        .order('created_at', { ascending: true });

      if (cards && cards.length > 1) {
        // Keep oldest, delete rest
        for (let i = 1; i < cards.length; i++) {
          await supabase.from('vocab_translations').delete().eq('card_id', cards[i].id);
          await supabase.from('vocab_cards').delete().eq('id', cards[i].id);
          results.exactDuplicatesFixed++;
        }
      }
    }

    // Get final count
    const { count: finalCount } = await supabase
      .from('vocab_cards')
      .select('*', { count: 'exact', head: true });

    return new Response(JSON.stringify({
      success: true,
      results,
      finalCardCount: finalCount,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Merge error:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Failed to merge duplicates',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

