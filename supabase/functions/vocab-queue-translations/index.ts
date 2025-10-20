import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type QueueBody = {
  languages?: string[];
  maxWords?: number;
  onlyMissing?: boolean;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') || '';
    const body = (await req.json().catch(() => ({}))) as QueueBody;

    // Authenticated user client for admin check
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false, autoRefreshToken: false } }
    );

    // Authenticate if Authorization header present; otherwise allow public triggering
    let user: any = null;
    if (authHeader) {
      const res = await userClient.auth.getUser();
      user = (res as any)?.data?.user || null;
    }
    // If a user is provided, optionally enforce admin; otherwise continue for public kickoff
    if (user) {
      try {
        const { data: isAdmin } = await (userClient as any).rpc('is_admin');
        if (!isAdmin) {
          return new Response(JSON.stringify({ success: false, error: 'Forbidden: admin only' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      } catch (_) { /* if rpc missing, continue */ }
    }

    // Service role client for queue inserts (bypass RLS)
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const SUPPORTED_LANGS = ['ar','bn','de','es','fa','fr','hi','id','ja','kk','ko','ms','ne','pt','ru','ta','th','tr','ur','vi','yue','zh','zh-TW'];
    const targetLangs = Array.isArray(body.languages) && body.languages.length ? body.languages : SUPPORTED_LANGS;
    const maxWords = typeof body.maxWords === 'number' && body.maxWords > 0 ? Math.min(body.maxWords, 20000) : undefined;

    // Fetch public EN cards
    let cardQuery = serviceClient
      .from('vocab_cards')
      .select('id, term')
      .eq('is_public', true)
      .eq('language', 'en');
    if (maxWords) cardQuery = cardQuery.limit(maxWords);

    const { data: cards, error: cardsError } = await cardQuery as any;
    if (cardsError) throw cardsError;

    if (!cards || cards.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'No cards found to translate' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Build queue jobs
    const nowIso = new Date().toISOString();
    const jobs: any[] = [];
    for (const c of cards as any[]) {
      for (const lang of targetLangs) {
        jobs.push({
          user_id: user?.id || null,
          card_id: c.id,
          term: c.term,
          target_lang: lang,
          status: 'pending',
          created_at: nowIso
        });
      }
    }

    // Insert in chunks
    let inserted = 0;
    for (let i = 0; i < jobs.length; i += 1000) {
      const chunk = jobs.slice(i, i + 1000);
      const { error: insErr } = await serviceClient.from('vocab_translation_queue').insert(chunk);
      if (insErr) {
        // Continue on conflict or RLS issues to insert as much as possible
        console.error('Queue insert error', insErr);
      } else {
        inserted += chunk.length;
      }
      // Small delay
      await new Promise((r) => setTimeout(r, 50));
    }

    // Count pending jobs
    const { count: pendingCount } = await serviceClient
      .from('vocab_translation_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    return new Response(JSON.stringify({ success: true, inserted, pending: pendingCount || 0, totalCandidates: (cards as any[]).length * targetLangs.length }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('vocab-queue-translations error', e);
    return new Response(JSON.stringify({ success: false, error: String((e as any).message || e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
