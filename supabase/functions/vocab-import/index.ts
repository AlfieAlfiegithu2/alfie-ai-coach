import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ImportRow = Record<string, string>;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { csvText, delimiter = ",", previewOnly = false } = await req.json();
    if (!csvText || typeof csvText !== "string") {
      throw new Error("csvText is required");
    }

    // Parse CSV (simple, supports quoted values)
    const lines = csvText.split(/\r?\n/).filter((l: string) => l.trim().length > 0);
    if (lines.length < 2) throw new Error("CSV must contain header and at least one row");

    const parseLine = (line: string): string[] => {
      const out: string[] = [];
      let current = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        const next = line[i + 1];
        if (ch === '"') {
          if (inQuotes && next === '"') { current += '"'; i++; }
          else { inQuotes = !inQuotes; }
        } else if (ch === delimiter && !inQuotes) {
          out.push(current);
          current = "";
        } else {
          current += ch;
        }
      }
      out.push(current);
      return out.map((s) => s.trim());
    };

    const headers = parseLine(lines[0]).map((h) => h.trim());
    // Expect: word and language columns (e.g., en, ko, ja ...)
    const wordIdx = headers.findIndex((h) => h.toLowerCase() === "word");
    if (wordIdx === -1) throw new Error("CSV must include a 'word' column");

    const langCols = headers
      .map((h, idx) => ({ h, idx }))
      .filter(({ h }) => h.toLowerCase() !== "word" && /^[a-z]{2}(-[a-z]{2})?$/i.test(h))
      .map(({ h, idx }) => ({ code: h.toLowerCase(), idx }));

    if (langCols.length === 0) throw new Error("CSV must include at least one language column like 'ko', 'ja', 'vi', 'zh', 'es'");

    const rows: ImportRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const vals = parseLine(lines[i]);
      if (!vals[wordIdx]) continue;
      const word = vals[wordIdx];
      for (const { code, idx } of langCols) {
        const translation = vals[idx];
        if (translation && translation.length > 0) {
          rows.push({ word, language_code: code, translation });
        }
      }
    }

    if (previewOnly) {
      return new Response(JSON.stringify({ success: true, preview: rows.slice(0, 100), totalRows: rows.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Upsert rows into vocabulary_words using PostgREST (service role)
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) throw new Error("Missing service role configuration");

    // Batch insert to avoid payload limits
    const batchSize = 1000;
    let inserted = 0;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const res = await fetch(`${supabaseUrl}/rest/v1/vocabulary_words`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": serviceKey,
          "Authorization": `Bearer ${serviceKey}`,
          "Prefer": "resolution=merge-duplicates" // upsert on unique(word,language_code)
        },
        body: JSON.stringify(batch.map((r) => ({ word: r.word, language_code: r.language_code, translation: r.translation, verified: false }))),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Insert failed: ${res.status} ${t}`);
      }
      inserted += batch.length;
    }

    return new Response(JSON.stringify({ success: true, inserted }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: (e as Error).message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});


