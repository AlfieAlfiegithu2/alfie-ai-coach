import { createClient } from '@supabase/supabase-js';

// Use service role key for admin operations (you'll need to provide this)
const SUPABASE_URL = 'https://cuumxmfzhwljylbdlflj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTkxMjEsImV4cCI6MjA2OTA5NTEyMX0.8jqO_ciOttSxSLZnKY0i5oJmEn79ROF53TjUMYhNemI';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// The 51 duplicate pairs found
const duplicatePairs = [
  { uk: "appall", us: "appal" },
  { uk: "archaeologist", us: "archeologist" },
  { uk: "catalogue", us: "catalog" },
  { uk: "categorisation", us: "categorization" },
  { uk: "characterisation", us: "characterization" },
  { uk: "crystallise", us: "crystallize" },
  { uk: "dehumanise", us: "dehumanize" },
  { uk: "digitalisation", us: "digitalization" },
  { uk: "digitalise", us: "digitalize" },
  { uk: "disorganised", us: "disorganized" },
  { uk: "endeavour", us: "endeavor" },
  { uk: "enroll", us: "enrol" },
  { uk: "familiarise", us: "familiarize" },
  { uk: "fulfill", us: "fulfil" },
  { uk: "generalisation", us: "generalization" },
  { uk: "harbour", us: "harbor" },
  { uk: "honour", us: "honor" },
  { uk: "hospitalise", us: "hospitalize" },
  { uk: "humanise", us: "humanize" },
  { uk: "idolise", us: "idolize" },
  { uk: "industrialise", us: "industrialize" },
  { uk: "instill", us: "instil" },
  { uk: "italicise", us: "italicize" },
  { uk: "jeopardise", us: "jeopardize" },
  { uk: "lacklustre", us: "lackluster" },
  { uk: "mechanise", us: "mechanize" },
  { uk: "mediaeval", us: "medieval" },
  { uk: "micrometre", us: "micrometer" },
  { uk: "millimetre", us: "millimeter" },
  { uk: "modernisation", us: "modernization" },
  { uk: "modernise", us: "modernize" },
  { uk: "neighbouring", us: "neighboring" },
  { uk: "neutralisation", us: "neutralization" },
  { uk: "neutralise", us: "neutralize" },
  { uk: "offence", us: "offense" },
  { uk: "overemphasise", us: "overemphasize" },
  { uk: "penalise", us: "penalize" },
  { uk: "personalisation", us: "personalization" },
  { uk: "personalise", us: "personalize" },
  { uk: "popularise", us: "popularize" },
  { uk: "publicise", us: "publicize" },
  { uk: "realisation", us: "realization" },
  { uk: "reorganise", us: "reorganize" },
  { uk: "revolutionise", us: "revolutionize" },
  { uk: "scrutinise", us: "scrutinize" },
  { uk: "socialise", us: "socialize" },
  { uk: "sympathise", us: "sympathize" },
  { uk: "tumour", us: "tumor" },
  { uk: "unauthorised", us: "unauthorized" },
  { uk: "utilise", us: "utilize" },
  { uk: "vigour", us: "vigor" },
];

// Note: Some pairs have UK as the longer version (appall vs appal)
// We need to determine which is actually UK and which is US
// Standard: UK uses -ise, -our, -re, -ogue, -ae, shorter -l
// US uses -ize, -or, -er, -og, -e, longer -ll

const correctPairs = duplicatePairs.map(p => {
  // For -ll/-l patterns, US typically uses -ll (fulfill, enroll, instill)
  // UK typically uses -l (fulfil, enrol, instil)
  if (p.uk.endsWith('ll') && p.us.endsWith('l') && !p.us.endsWith('ll')) {
    // Swap - US is actually the one with -ll
    return { uk: p.us, us: p.uk };
  }
  return p;
});

async function mergeDuplicates() {
  console.log('=== MERGING UK/US DUPLICATE VOCABULARY PAIRS ===\n');
  console.log(`Processing ${correctPairs.length} duplicate pairs...\n`);

  let merged = 0;
  let errors = 0;

  for (const pair of correctPairs) {
    try {
      // Get both cards
      const { data: ukCard } = await supabase
        .from('vocab_cards')
        .select('id, term, translation, pos, ipa, context_sentence, level, examples_json')
        .eq('term', pair.uk)
        .single();

      const { data: usCard } = await supabase
        .from('vocab_cards')
        .select('id, term, translation, pos, ipa, context_sentence, level, examples_json')
        .eq('term', pair.us)
        .single();

      if (!ukCard || !usCard) {
        console.log(`⚠️ Skipping "${pair.uk}/${pair.us}" - one or both cards not found`);
        continue;
      }

      // Create merged term (UK/US format, e.g., "colour/color")
      const mergedTerm = `${pair.uk}/${pair.us}`;
      
      // Keep the card with more data, prefer UK spelling as primary
      const keepCard = ukCard;
      const deleteCard = usCard;

      console.log(`Processing: "${pair.uk}" + "${pair.us}" → "${mergedTerm}"`);

      // Update the kept card with merged term
      const { error: updateError } = await supabase
        .from('vocab_cards')
        .update({ 
          term: mergedTerm,
          // Merge translation if US has better one
          translation: keepCard.translation || deleteCard.translation,
          pos: keepCard.pos || deleteCard.pos,
          ipa: keepCard.ipa || deleteCard.ipa,
          context_sentence: keepCard.context_sentence || deleteCard.context_sentence,
        })
        .eq('id', keepCard.id);

      if (updateError) {
        console.log(`  ❌ Error updating card: ${updateError.message}`);
        errors++;
        continue;
      }

      // Move translations from deleted card to kept card (if any unique ones)
      // First, get translations from the card being deleted
      const { data: deleteCardTrans } = await supabase
        .from('vocab_translations')
        .select('lang, translations')
        .eq('card_id', deleteCard.id);

      // Get existing translations for kept card
      const { data: keepCardTrans } = await supabase
        .from('vocab_translations')
        .select('lang')
        .eq('card_id', keepCard.id);

      const existingLangs = new Set(keepCardTrans?.map(t => t.lang) || []);

      // Add any missing translations
      for (const trans of (deleteCardTrans || [])) {
        if (!existingLangs.has(trans.lang)) {
          await supabase
            .from('vocab_translations')
            .insert({
              card_id: keepCard.id,
              lang: trans.lang,
              translations: trans.translations,
              is_system: true
            });
        }
      }

      // Delete translations for the card being removed
      await supabase
        .from('vocab_translations')
        .delete()
        .eq('card_id', deleteCard.id);

      // Delete the duplicate card
      const { error: deleteError } = await supabase
        .from('vocab_cards')
        .delete()
        .eq('id', deleteCard.id);

      if (deleteError) {
        console.log(`  ❌ Error deleting duplicate: ${deleteError.message}`);
        errors++;
        continue;
      }

      console.log(`  ✅ Merged successfully`);
      merged++;

    } catch (e) {
      console.log(`  ❌ Error: ${e.message}`);
      errors++;
    }
  }

  console.log(`\n=== MERGE COMPLETE ===`);
  console.log(`✅ Successfully merged: ${merged}`);
  console.log(`❌ Errors: ${errors}`);
  console.log(`📊 Total cards reduced by: ${merged}`);
}

// Run the merge
mergeDuplicates().catch(console.error);

