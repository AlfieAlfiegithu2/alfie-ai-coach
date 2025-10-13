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

    // 1) Load cards and prepare helpers
    const junkPatterns = [
      ...Array.from({ length: 26 }, (_, i) => String.fromCharCode(97 + i)), // a..z
      'cd','dvd','tv','pc','usa','uk','eu','ceo','cto','hr','it','pr'
    ];
    const junkSet = new Set(junkPatterns.map((t) => t.toLowerCase()));

    const { data: allCards, error: loadErr } = await supabase
      .from('vocab_cards')
      .select('id, term, frequency_rank')
      .order('term');
    if (loadErr) throw loadErr;

    // 2) Detect junk (case/space insensitive)
    const junkIds: string[] = [];
    for (const c of allCards || []) {
      const norm = (c.term || '').trim().toLowerCase();
      if (junkSet.has(norm)) junkIds.push(c.id);
    }

    // 3) Normalize duplicates by trimmed, lowercase key
    const duplicateIds: string[] = [];
    const byNorm = new Map<string, Array<{ id: string; rank: number }>>();
    for (const c of allCards || []) {
      const norm = (c.term || '').trim().toLowerCase();
      if (!norm) continue;
      const rank = typeof c.frequency_rank === 'number' ? c.frequency_rank : 999999;
      if (!byNorm.has(norm)) byNorm.set(norm, []);
      byNorm.get(norm)!.push({ id: c.id, rank });
    }
    for (const [, arr] of byNorm) {
      if (arr.length > 1) {
        arr.sort((a, b) => a.rank - b.rank); // keep lowest rank
        duplicateIds.push(...arr.slice(1).map((x) => x.id));
      }
    }

    // 4) Singularize obvious plurals (tools -> tool, boxes -> box, cities -> city)
    const exceptionPlurals = new Set(['news','physics','mathematics','economics','series','species','means']);
    const singularize = (w: string) => {
      const word = w.trim().toLowerCase();
      if (exceptionPlurals.has(word)) return word; // don't touch
      // ies -> y
      if (/[^aeiou]ies$/.test(word)) return word.replace(/ies$/, 'y');
      // es after sibilants: boxes/watches/buses -> box/watch/bus
      if (/(xes|ches|shes|sses|zes|ses)$/.test(word)) return word.replace(/es$/, '');
      // default: trailing 's' -> remove
      if (/^[a-z]{3,}s$/.test(word)) return word.slice(0, -1);
      return word;
    };

    const updates: Array<{ id: string; newTerm: string }> = [];
    const pluralDeleteIds: string[] = [];

    // Build a quick lookup of existing normalized terms
    const normExists = new Set<string>([...byNorm.keys()]);

    for (const c of allCards || []) {
      const norm = (c.term || '').trim().toLowerCase();
      if (!norm) continue;
      const lemma = singularize(norm);
      if (lemma !== norm) {
        if (normExists.has(lemma)) {
          // Singular already exists somewhere -> drop plural copy
          pluralDeleteIds.push(c.id);
        } else {
          // No singular in DB -> normalize this record to singular
          updates.push({ id: c.id, newTerm: lemma });
          normExists.add(lemma);
        }
      }
    }

    // 5) Apply updates in small batches (distinct values per row -> per-row updates)
    let updatedCount = 0;
    for (const u of updates) {
      const { error } = await supabase
        .from('vocab_cards')
        .update({ term: u.newTerm })
        .eq('id', u.id);
      if (error) {
        console.error('Update term failed', u, error.message);
        continue; // skip but keep going
      }
      updatedCount++;
    }

    // 6) Delete all marked IDs (junk + dupes + plurals)
    const allDeleteIds = [...new Set([...junkIds, ...duplicateIds, ...pluralDeleteIds])];

    let totalDeleted = 0;
    if (allDeleteIds.length) {
      const batchSize = 100;
      for (let i = 0; i < allDeleteIds.length; i += batchSize) {
        const batch = allDeleteIds.slice(i, i + batchSize);
        const { error: deleteError } = await supabase
          .from('vocab_cards')
          .delete()
          .in('id', batch);
        if (deleteError) throw deleteError;
        totalDeleted += batch.length;
        console.log(`Deleted batch ${Math.floor(i / batchSize) + 1}: ${batch.length} items`);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Cleaned ${totalDeleted} deleted, ${updatedCount} singularized` ,
      deleted: totalDeleted,
      updated_to_singular: updatedCount,
      breakdown: {
        junk: junkIds.length,
        duplicates: duplicateIds.length,
        plurals_deleted: pluralDeleteIds.length,
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
