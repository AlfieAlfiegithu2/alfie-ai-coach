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
    // Only remove truly junk entries: single letters and very short abbreviations
    // Exclude common words that happen to be short (e.g., 'it', 'us', 'a', 'i')
    const junkPatterns = [
      ...Array.from({ length: 26 }, (_, i) => String.fromCharCode(97 + i)), // a..z single letters
    ];
    // Remove common abbreviations that ARE actually valid words
    const commonWords = new Set(['a', 'i', 'it', 'us', 'tv', 'pc', 'ok', 'hr', 'pr', 'ad', 'am', 'pm', 'go', 'no', 'so', 'do', 'to', 'be', 'he', 'me', 'we', 'or', 'in', 'on', 'at', 'by', 'up', 'is', 'as', 'an']);
    const junkSet = new Set(junkPatterns.map((t) => t.toLowerCase()).filter(t => !commonWords.has(t)));

    // Only process public vocabulary cards to avoid affecting user's personal words
    const { data: allCards, error: loadErr } = await supabase
      .from('vocab_cards')
      .select('id, term, frequency_rank, created_at')
      .eq('is_public', true)
      .order('term');
    if (loadErr) throw loadErr;
    
    console.log(`Loaded ${allCards?.length || 0} public vocabulary cards for cleanup`);

    // 2) Detect junk (case/space insensitive)
    const junkIds: string[] = [];
    for (const c of allCards || []) {
      const norm = (c.term || '').trim().toLowerCase();
      if (junkSet.has(norm)) junkIds.push(c.id);
    }

    // 3) Normalize duplicates by trimmed, lowercase key
    const duplicateIds: string[] = [];
    const byNorm = new Map<string, Array<{ id: string; rank: number; created_at: string }>>();
    for (const c of allCards || []) {
      const norm = (c.term || '').trim().toLowerCase();
      if (!norm) continue;
      const rank = typeof c.frequency_rank === 'number' ? c.frequency_rank : 999999;
      if (!byNorm.has(norm)) byNorm.set(norm, []);
      byNorm.get(norm)!.push({ id: c.id, rank, created_at: c.created_at });
    }
    
    let duplicateCount = 0;
    for (const [term, arr] of byNorm) {
      if (arr.length > 1) {
        duplicateCount++;
        // Keep the one with lowest frequency rank, or oldest if ranks are equal
        arr.sort((a, b) => {
          if (a.rank !== b.rank) return a.rank - b.rank;
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        });
        duplicateIds.push(...arr.slice(1).map((x) => x.id));
        console.log(`Duplicate found: "${term}" has ${arr.length} entries, keeping oldest/lowest rank`);
      }
    }
    console.log(`Found ${duplicateCount} duplicate terms with ${duplicateIds.length} total entries to remove`);

    // 4) Detect British/American spelling variants (s/z differences)
    const normalizeSpelling = (w: string) => {
      const word = w.trim().toLowerCase();
      // Convert British spellings to American (ise->ize, yse->yze)
      return word
        .replace(/ise$/, 'ize')
        .replace(/isation$/, 'ization')
        .replace(/yse$/, 'yze')
        .replace(/yser$/, 'yzer');
    };

    const spellingVariantIds: string[] = [];
    const bySpellingNorm = new Map<string, Array<{ id: string; term: string; rank: number; created_at: string }>>();
    
    for (const c of allCards || []) {
      const norm = (c.term || '').trim().toLowerCase();
      if (!norm) continue;
      const spellingNorm = normalizeSpelling(norm);
      const rank = typeof c.frequency_rank === 'number' ? c.frequency_rank : 999999;
      if (!bySpellingNorm.has(spellingNorm)) bySpellingNorm.set(spellingNorm, []);
      bySpellingNorm.get(spellingNorm)!.push({ id: c.id, term: norm, rank, created_at: c.created_at });
    }

    let spellingVariantCount = 0;
    for (const [normalized, arr] of bySpellingNorm) {
      if (arr.length > 1) {
        spellingVariantCount++;
        // Keep American spelling (with 'z') or lowest rank, delete others
        arr.sort((a, b) => {
          // Prefer 'z' spelling
          const aHasZ = a.term.includes('ize') || a.term.includes('yze');
          const bHasZ = b.term.includes('ize') || b.term.includes('yze');
          if (aHasZ !== bHasZ) return bHasZ ? 1 : -1;
          // Then by rank
          if (a.rank !== b.rank) return a.rank - b.rank;
          // Finally by date
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        });
        spellingVariantIds.push(...arr.slice(1).map(x => x.id));
        console.log(`Spelling variant: "${arr[0].term}" vs "${arr.slice(1).map(x => x.term).join('", "')}" - keeping first`);
      }
    }
    console.log(`Found ${spellingVariantCount} spelling variant groups with ${spellingVariantIds.length} total entries to remove`);

    // 5) Singularize obvious plurals (tools -> tool, boxes -> box, cities -> city)
    // Be more conservative - only handle clear plural patterns
    const exceptionPlurals = new Set([
      'news','physics','mathematics','economics','series','species','means',
      'success','business','process','progress','address','access','stress',
      'class','mass','pass','grass','brass','glass','boss','loss','cross',
      'focus','genius','virus','status','census','thus','bus','plus',
      'atlas','gas','canvas','yes','lens','chorus'
    ]);
    
    const singularize = (w: string) => {
      const word = w.trim().toLowerCase();
      
      // Don't touch exception words
      if (exceptionPlurals.has(word)) return word;
      
      // Don't touch very short words (likely not plurals)
      if (word.length < 4) return word;
      
      // ies -> y (cities -> city, berries -> berry)
      if (/[^aeiou]ies$/.test(word) && word.length > 4) {
        return word.replace(/ies$/, 'y');
      }
      
      // es after sibilants: boxes/watches/buses -> box/watch/bus
      if (/(xes|ches|shes|sses|zes)$/.test(word) && word.length > 4) {
        return word.replace(/es$/, '');
      }
      
      // Regular plurals: only if word ends in 's' and is 5+ chars
      // This avoids false positives like "this", "thus", "as", etc.
      if (/^[a-z]{4,}[^s]s$/.test(word)) {
        return word.slice(0, -1);
      }
      
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

    // 6) Apply updates in small batches (distinct values per row -> per-row updates)
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

    // 7) Delete all marked IDs (junk + dupes + spelling variants + plurals)
    const allDeleteIds = [...new Set([...junkIds, ...duplicateIds, ...spellingVariantIds, ...pluralDeleteIds])];

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

    const summary = {
      success: true,
      message: `Cleanup complete: ${totalDeleted} deleted, ${updatedCount} singularized`,
      deleted: totalDeleted,
      updated_to_singular: updatedCount,
      breakdown: {
        junk_entries: junkIds.length,
        exact_duplicates: duplicateIds.length,
        spelling_variants: spellingVariantIds.length,
        plural_forms_removed: pluralDeleteIds.length,
        terms_singularized: updatedCount
      },
      details: {
        junk_patterns_removed: junkIds.length > 0 ? 'Single letters and obvious junk' : 'None',
        duplicate_strategy: 'Kept oldest entry for each term',
        spelling_variant_strategy: 'British/American (s/z) - kept American spelling',
        plural_strategy: 'Conservative - only clear plural patterns'
      }
    };
    
    console.log('Cleanup summary:', summary);
    
    return new Response(JSON.stringify(summary), { 
      headers: { ...cors, 'Content-Type': 'application/json' } 
    });

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
