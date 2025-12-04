import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://cuumxmfzhwljylbdlflj.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTkxMjEsImV4cCI6MjA2OTA5NTEyMX0.8jqO_ciOttSxSLZnKY0i5oJmEn79ROF53TjUMYhNemI');

// Verify the merge
const { count: totalCards } = await supabase.from('vocab_cards').select('*', { count: 'exact', head: true });
const { count: totalTrans } = await supabase.from('vocab_translations').select('*', { count: 'exact', head: true });

console.log('=== POST-MERGE STATUS ===');
console.log('Total vocab cards:', totalCards);
console.log('Total translations:', totalTrans);
console.log('Expected cards after merge: 7988 - 51 =', 7988 - 51);

// Check merged words
const { data: mergedWords } = await supabase.from('vocab_cards').select('term').ilike('term', '%/%').limit(20);
console.log('\nSample merged words (UK/US format):');
mergedWords?.forEach(w => console.log('  -', w.term));

// Check if any cards are missing translations
const { data: allCardIds } = await supabase.from('vocab_cards').select('id');
const cardIdSet = new Set(allCardIds?.map(c => c.id));

let offset = 0;
const translatedIds = new Set();
while (true) {
  const { data } = await supabase.from('vocab_translations').select('card_id').range(offset, offset + 999);
  if (!data || data.length === 0) break;
  data.forEach(t => translatedIds.add(t.card_id));
  offset += 1000;
  if (data.length < 1000) break;
}

const missingTrans = [...cardIdSet].filter(id => !translatedIds.has(id));
console.log('\nCards without translations:', missingTrans.length);

if (missingTrans.length > 0) {
  console.log('Cards missing translations:');
  for (const id of missingTrans.slice(0, 10)) {
    const { data: card } = await supabase.from('vocab_cards').select('term').eq('id', id).single();
    console.log('  -', card?.term);
  }
}

// Check translation distribution
const transCounts = {};
offset = 0;
while (true) {
  const { data } = await supabase.from('vocab_translations').select('card_id').range(offset, offset + 999);
  if (!data || data.length === 0) break;
  data.forEach(t => {
    transCounts[t.card_id] = (transCounts[t.card_id] || 0) + 1;
  });
  offset += 1000;
  if (data.length < 1000) break;
}

const distribution = {};
Object.values(transCounts).forEach(count => {
  distribution[count] = (distribution[count] || 0) + 1;
});

console.log('\nTranslation count distribution:');
Object.entries(distribution)
  .sort((a, b) => Number(a[0]) - Number(b[0]))
  .forEach(([count, numCards]) => {
    console.log(`  ${count} translations: ${numCards} cards`);
  });

