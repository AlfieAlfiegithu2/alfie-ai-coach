/**
 * Migration Script: Supabase to Cloudflare D1
 * 
 * This script exports translation data from Supabase and imports it into D1.
 * Run this after creating the D1 database and initializing the schema.
 * 
 * Usage:
 *   1. Set environment variables: SUPABASE_URL, SUPABASE_SERVICE_KEY
 *   2. Run: npx ts-node scripts/migrate-from-supabase.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://cuumxmfzhwljylbdlflj.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const D1_API_URL = process.env.D1_API_URL || 'https://alfie-translations-api.YOUR_SUBDOMAIN.workers.dev';

const BATCH_SIZE = 1000;

async function migrateTranslations() {
  if (!SUPABASE_SERVICE_KEY) {
    console.error('❌ SUPABASE_SERVICE_KEY environment variable required');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  console.log('📊 Starting migration from Supabase to D1...\n');

  // 1. Migrate vocab_translations
  console.log('📦 Migrating vocab_translations...');
  let offset = 0;
  let totalTranslations = 0;

  while (true) {
    const { data, error } = await supabase
      .from('vocab_translations')
      .select('id, card_id, lang, translations, provider, created_at, updated_at')
      .range(offset, offset + BATCH_SIZE - 1);

    if (error) {
      console.error('❌ Error fetching translations:', error);
      break;
    }

    if (!data || data.length === 0) {
      break;
    }

    // Send to D1 API
    const response = await fetch(`${D1_API_URL}/translations/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ translations: data }),
    });

    if (!response.ok) {
      console.error('❌ Error inserting translations:', await response.text());
    } else {
      totalTranslations += data.length;
      console.log(`   ✓ Migrated ${totalTranslations} translations...`);
    }

    offset += BATCH_SIZE;
    
    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 100));
  }

  console.log(`✅ Migrated ${totalTranslations} translations\n`);

  // 2. Migrate vocab_translation_enrichments
  console.log('📦 Migrating vocab_translation_enrichments...');
  offset = 0;
  let totalEnrichments = 0;

  while (true) {
    const { data, error } = await supabase
      .from('vocab_translation_enrichments')
      .select('id, card_id, lang, translation, ipa, context, provider, created_at, updated_at')
      .range(offset, offset + BATCH_SIZE - 1);

    if (error) {
      console.error('❌ Error fetching enrichments:', error);
      break;
    }

    if (!data || data.length === 0) {
      break;
    }

    // Send to D1 API
    const response = await fetch(`${D1_API_URL}/enrichments/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enrichments: data }),
    });

    if (!response.ok) {
      console.error('❌ Error inserting enrichments:', await response.text());
    } else {
      totalEnrichments += data.length;
      console.log(`   ✓ Migrated ${totalEnrichments} enrichments...`);
    }

    offset += BATCH_SIZE;
    await new Promise(r => setTimeout(r, 100));
  }

  console.log(`✅ Migrated ${totalEnrichments} enrichments\n`);

  // 3. Verify migration
  console.log('🔍 Verifying migration...');
  const statsResponse = await fetch(`${D1_API_URL}/stats`);
  const stats = await statsResponse.json();
  
  console.log('\n📊 D1 Database Stats:');
  console.log(`   vocab_translations: ${stats.stats?.vocab_translations || 0}`);
  console.log(`   vocab_translation_enrichments: ${stats.stats?.vocab_translation_enrichments || 0}`);
  console.log(`   translation_cache: ${stats.stats?.translation_cache || 0}`);

  console.log('\n✅ Migration complete!');
}

migrateTranslations().catch(console.error);

