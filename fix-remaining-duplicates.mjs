import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://cuumxmfzhwljylbdlflj.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTkxMjEsImV4cCI6MjA2OTA5NTEyMX0.8jqO_ciOttSxSLZnKY0i5oJmEn79ROF53TjUMYhNemI');

console.log('=== FIXING REMAINING DUPLICATES ===\n');

// Check what happened with sympathise/sympathize
const testPairs = [
  ['sympathise', 'sympathize'],
  ['honour', 'honor'],
  ['fulfil', 'fulfill'],
];

for (const [uk, us] of testPairs) {
  const { data: ukCards } = await supabase
    .from('vocab_cards')
    .select('id, term')
    .eq('term', uk);
  
  const { data: usCards } = await supabase
    .from('vocab_cards')
    .select('id, term')
    .eq('term', us);
  
  console.log(`"${uk}": ${ukCards?.length || 0} cards`);
  ukCards?.forEach(c => console.log(`  - ${c.id}: "${c.term}"`));
  
  console.log(`"${us}": ${usCards?.length || 0} cards`);
  usCards?.forEach(c => console.log(`  - ${c.id}: "${c.term}"`));
  console.log();
}

// Find all UK/US pairs that still exist separately
console.log('=== FINDING REMAINING UK/US DUPLICATES ===\n');

// Get all terms
let allCards = [];
let offset = 0;
while (true) {
  const { data } = await supabase
    .from('vocab_cards')
    .select('id, term')
    .range(offset, offset + 999);
  if (!data || data.length === 0) break;
  allCards = allCards.concat(data);
  offset += 1000;
  if (data.length < 1000) break;
}

const termToCards = {};
allCards.forEach(c => {
  const term = c.term.toLowerCase();
  if (!termToCards[term]) termToCards[term] = [];
  termToCards[term].push(c);
});

// UK/US patterns
const patterns = [
  { uk: /ise$/, us: 'ize' },
  { uk: /isation$/, us: 'ization' },
  { uk: /our$/, us: 'or' },
  { uk: /tre$/, us: 'ter' },
  { uk: /ogue$/, us: 'og' },
  { uk: /ence$/, us: 'ense' },
  { uk: /ae/, us: 'e' },
  { uk: /yse$/, us: 'yze' },
];

const remainingPairs = [];
const processed = new Set();

for (const card of allCards) {
  const term = card.term.toLowerCase();
  if (processed.has(term) || term.includes('/')) continue;
  
  for (const pattern of patterns) {
    if (pattern.uk.test(term)) {
      const variant = term.replace(pattern.uk, pattern.us);
      if (termToCards[variant] && variant !== term && !processed.has(variant)) {
        // Skip false positives
        const falsePositives = ['four', 'for', 'bellow', 'below', 'canoe', 'cane', 'our', 'or'];
        if (falsePositives.includes(term) || falsePositives.includes(variant)) continue;
        
        remainingPairs.push({
          uk: term,
          ukId: card.id,
          us: variant,
          usId: termToCards[variant][0].id
        });
        processed.add(term);
        processed.add(variant);
      }
    }
  }
}

console.log(`Found ${remainingPairs.length} remaining UK/US pairs to merge:\n`);
remainingPairs.forEach((p, i) => {
  console.log(`${i + 1}. "${p.uk}" + "${p.us}"`);
});

// Now merge them
if (remainingPairs.length > 0) {
  console.log('\n=== MERGING REMAINING PAIRS ===\n');
  
  for (const pair of remainingPairs) {
    const mergedTerm = `${pair.uk}/${pair.us}`;
    
    // Update UK card with merged term
    const { error: updateError } = await supabase
      .from('vocab_cards')
      .update({ term: mergedTerm })
      .eq('id', pair.ukId);
    
    if (updateError) {
      console.log(`❌ Error updating "${pair.uk}": ${updateError.message}`);
      continue;
    }
    
    // Delete translations for US card
    await supabase
      .from('vocab_translations')
      .delete()
      .eq('card_id', pair.usId);
    
    // Delete US card
    const { error: deleteError } = await supabase
      .from('vocab_cards')
      .delete()
      .eq('id', pair.usId);
    
    if (deleteError) {
      console.log(`❌ Error deleting "${pair.us}": ${deleteError.message}`);
      continue;
    }
    
    console.log(`✅ Merged: "${pair.uk}" + "${pair.us}" → "${mergedTerm}"`);
  }
}

// Also fix exact duplicates (january, december, it)
console.log('\n=== FIXING EXACT DUPLICATES ===\n');

const exactDuplicates = ['january', 'december', 'it'];

for (const term of exactDuplicates) {
  const { data: cards } = await supabase
    .from('vocab_cards')
    .select('id, term, created_at')
    .ilike('term', term)
    .order('created_at', { ascending: true });
  
  if (cards && cards.length > 1) {
    console.log(`"${term}" has ${cards.length} entries, keeping oldest...`);
    
    // Keep the first (oldest), delete the rest
    for (let i = 1; i < cards.length; i++) {
      await supabase.from('vocab_translations').delete().eq('card_id', cards[i].id);
      await supabase.from('vocab_cards').delete().eq('id', cards[i].id);
      console.log(`  Deleted duplicate: ${cards[i].id}`);
    }
  }
}

// Final count
const { count: finalCount } = await supabase.from('vocab_cards').select('*', { count: 'exact', head: true });
console.log(`\n=== FINAL COUNT ===`);
console.log(`Total vocabulary cards: ${finalCount}`);

