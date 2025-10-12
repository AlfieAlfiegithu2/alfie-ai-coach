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

    // Delete problematic entries
    const junkPatterns = [
      // Single letters (a-z)
      ...Array.from({ length: 26 }, (_, i) => String.fromCharCode(97 + i)),
      // Common abbreviations
      'cd', 'dvd', 'tv', 'pc', 'usa', 'uk', 'eu', 'ceo', 'cto', 'hr', 'it', 'pr',
      // Numbers as words
      'i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x'
    ];

    // Get all junk entries
    const { data: junkCards } = await supabase
      .from('vocab_cards')
      .select('id, term')
      .in('term', junkPatterns);

    if (!junkCards || junkCards.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No junk entries found',
        deleted: 0
      }), { headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    const junkIds = junkCards.map(c => c.id);
    console.log(`Found ${junkIds.length} junk entries to delete`);

    // Delete them
    const { error: deleteError } = await supabase
      .from('vocab_cards')
      .delete()
      .in('id', junkIds);

    if (deleteError) throw deleteError;

    return new Response(JSON.stringify({
      success: true,
      message: `Cleaned up ${junkIds.length} junk entries`,
      deleted: junkIds.length,
      deletedTerms: junkCards.map(c => c.term)
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
