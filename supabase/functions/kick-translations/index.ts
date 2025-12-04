// Deno Edge Function to aggressively kick off translation processing in batches
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { cycles = 30, parallel = 6, delayMs = 100 } = await safeJson(req);

    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!url || !serviceKey) throw new Error("Missing Supabase service configuration");

    const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

    const summary = {
      startedAt: new Date().toISOString(),
      kicks: 0,
      cyclesRun: 0,
      lastPending: 0,
      errors: 0,
    } as any;

    for (let i = 0; i < cycles; i++) {
      summary.cyclesRun++;

      const { count: pending } = await (supabase as any)
        .from("vocab_translation_queue")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      summary.lastPending = pending || 0;
      if (!pending || pending <= 0) break;

      // Fire multiple parallel kicks of the existing processor
      const kicks = Array.from({ length: parallel }).map(() =>
        (supabase as any).functions.invoke("process-translations", { body: { reason: "kick" } })
      );
      const results = await Promise.allSettled(kicks);
      summary.kicks += results.length;
      summary.errors += results.filter((r) => r.status === "rejected").length;

      // Small delay between cycles
      await new Promise((r) => setTimeout(r, delayMs));
    }

    const { count: remaining } = await (supabase as any)
      .from("vocab_translation_queue")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    return json({ success: true, remaining: remaining || 0, ...summary });
  } catch (e) {
    console.error("kick-translations error:", e);
    return json({ success: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

async function safeJson(req: Request) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
