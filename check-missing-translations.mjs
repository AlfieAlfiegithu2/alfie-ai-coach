import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://cuumxmfzhwljylbdlflj.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTkxMjEsImV4cCI6MjA2OTA5NTEyMX0.8jqO_ciOttSxSLZnKY0i5oJmEn79ROF53TjUMYhNemI');

console.log('=== CHECKING FOR CARDS WITHOUT TRANSLATIONS ===\n');

// Get all card IDs that have translations
const translatedCardIds = new Set();
let offset = 0;
const pageSize = 1000;

console.log('Loading all translated card IDs...');
while (true) {
  const { data } = await supabase
    .from('vocab_translations')
    .select('card_id')
    .range(offset, offset + pageSize - 1);
  
  if (!data || data.length === 0) break;
  data.forEach(t => translatedCardIds.add(t.card_id));
  offset += pageSize;
  if (data.length < pageSize) break;
}
console.log(`Found ${translatedCardIds.size} cards with translations\n`);

// Get all vocab cards
console.log('Loading all vocab cards...');
let allCards = [];
offset = 0;

while (true) {
  const { data } = await supabase
    .from('vocab_cards')
    .select('id, term, created_at')
    .order('created_at', { ascending: true })
    .range(offset, offset + pageSize - 1);
  
  if (!data || data.length === 0) break;
  allCards = allCards.concat(data);
  offset += pageSize;
  if (data.length < pageSize) break;
}
console.log(`Found ${allCards.length} total vocab cards\n`);

// Find cards without translations
const cardsWithoutTranslations = allCards.filter(c => !translatedCardIds.has(c.id));

console.log(`=== CARDS WITHOUT TRANSLATIONS: ${cardsWithoutTranslations.length} ===\n`);

if (cardsWithoutTranslations.length > 0) {
  console.log('First 50 cards without translations:');
  cardsWithoutTranslations.slice(0, 50).forEach((c, i) => {
    console.log(`  ${i + 1}. "${c.term}" (created: ${c.created_at})`);
  });
  
  if (cardsWithoutTranslations.length > 50) {
    console.log(`  ... and ${cardsWithoutTranslations.length - 50} more`);
  }
}

// Check translation counts per card
console.log('\n=== TRANSLATION COUNT DISTRIBUTION ===');
const translationCounts = {};

offset = 0;
while (true) {
  const { data } = await supabase
    .from('vocab_translations')
    .select('card_id')
    .range(offset, offset + pageSize - 1);
  
  if (!data || data.length === 0) break;
  data.forEach(t => {
    translationCounts[t.card_id] = (translationCounts[t.card_id] || 0) + 1;
  });
  offset += pageSize;
  if (data.length < pageSize) break;
}

// Count distribution
const distribution = {};
Object.values(translationCounts).forEach(count => {
  distribution[count] = (distribution[count] || 0) + 1;
});

console.log('Cards by number of translations:');
Object.entries(distribution)
  .sort((a, b) => Number(a[0]) - Number(b[0]))
  .forEach(([count, numCards]) => {
    console.log(`  ${count} translations: ${numCards} cards`);
  });

// Check for fulfill/fulfil specifically
console.log('\n=== CHECKING SPECIFIC WORDS ===');
const specificWords = ['fulfill', 'fulfil', 'enroll', 'enrol', 'install', 'instal', 'distill', 'distil', 'skillful', 'skilful', 'willful', 'wilful'];

for (const word of specificWords) {
  const { data: card } = await supabase
    .from('vocab_cards')
    .select('id, term')
    .eq('term', word)
    .single();
  
  if (card) {
    const { count } = await supabase
      .from('vocab_translations')
      .select('*', { count: 'exact', head: true })
      .eq('card_id', card.id);
    
    console.log(`  "${word}": EXISTS, ${count || 0} translations`);
  } else {
    console.log(`  "${word}": NOT FOUND`);
  }
}

