import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const D1_API_URL = 'https://alfie-translations-api.ryanbigbang15.workers.dev';
const BATCH_SIZE = 500;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { table = 'vocab_translations', offset = 0, limit = 5000 } = await req.json().catch(() => ({}));

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    let totalMigrated = 0;
    let currentOffset = offset;
    const maxRows = limit;

    console.log(`🚀 Starting migration of ${table} from offset ${offset}...`);

    if (table === 'vocab_translations') {
      while (totalMigrated < maxRows) {
        const { data, error } = await supabase
          .from('vocab_translations')
          .select('id, card_id, lang, translations, provider')
          .range(currentOffset, currentOffset + BATCH_SIZE - 1);

        if (error) {
          console.error('Error fetching from Supabase:', error);
          break;
        }

        if (!data || data.length === 0) {
          console.log('No more data to migrate');
          break;
        }

        // Send to D1
        const response = await fetch(`${D1_API_URL}/translations/batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ translations: data }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('D1 batch insert error:', errorText);
          break;
        }

        totalMigrated += data.length;
        currentOffset += BATCH_SIZE;
        console.log(`✅ Migrated ${totalMigrated} translations...`);

        // Small delay to avoid overwhelming D1
        await new Promise(r => setTimeout(r, 100));

        if (data.length < BATCH_SIZE) {
          break; // No more data
        }
      }
    } else if (table === 'vocab_translation_enrichments') {
      while (totalMigrated < maxRows) {
        const { data, error } = await supabase
          .from('vocab_translation_enrichments')
          .select('id, card_id, lang, translation, ipa, context, provider')
          .range(currentOffset, currentOffset + BATCH_SIZE - 1);

        if (error) {
          console.error('Error fetching from Supabase:', error);
          break;
        }

        if (!data || data.length === 0) {
          console.log('No more data to migrate');
          break;
        }

        // Send to D1
        const response = await fetch(`${D1_API_URL}/enrichments/batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enrichments: data }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('D1 batch insert error:', errorText);
          break;
        }

        totalMigrated += data.length;
        currentOffset += BATCH_SIZE;
        console.log(`✅ Migrated ${totalMigrated} enrichments...`);

        await new Promise(r => setTimeout(r, 100));

        if (data.length < BATCH_SIZE) {
          break;
        }
      }
    }

    // Get D1 stats
    const statsResponse = await fetch(`${D1_API_URL}/stats`);
    const stats = await statsResponse.json();

    return new Response(JSON.stringify({
      success: true,
      table,
      migrated: totalMigrated,
      nextOffset: currentOffset,
      d1Stats: stats.stats
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Migration error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

