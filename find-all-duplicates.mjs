import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://cuumxmfzhwljylbdlflj.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTkxMjEsImV4cCI6MjA2OTA5NTEyMX0.8jqO_ciOttSxSLZnKY0i5oJmEn79ROF53TjUMYhNemI');

console.log('=== FINDING ALL UK/US SPELLING DUPLICATES ===\n');

// Get all vocab terms with pagination
let allCards = [];
let offset = 0;
const pageSize = 1000;

while (true) {
  const { data } = await supabase
    .from('vocab_cards')
    .select('id, term')
    .order('term')
    .range(offset, offset + pageSize - 1);
  
  if (!data || data.length === 0) break;
  allCards = allCards.concat(data);
  offset += pageSize;
  if (data.length < pageSize) break;
}

console.log(`Total vocab cards: ${allCards.length}\n`);

// Create term -> card map
const termToCard = {};
allCards.forEach(c => {
  termToCard[c.term.toLowerCase()] = c;
});

// UK/US spelling patterns - comprehensive list
const patterns = [
  // -ise/-ize verbs
  { uk: /ise$/, us: 'ize', name: '-ise/-ize' },
  { uk: /isation$/, us: 'ization', name: '-isation/-ization' },
  { uk: /ising$/, us: 'izing', name: '-ising/-izing' },
  { uk: /ised$/, us: 'ized', name: '-ised/-ized' },
  
  // -our/-or
  { uk: /our$/, us: 'or', name: '-our/-or' },
  { uk: /ours$/, us: 'ors', name: '-ours/-ors' },
  { uk: /oured$/, us: 'ored', name: '-oured/-ored' },
  { uk: /ouring$/, us: 'oring', name: '-ouring/-oring' },
  
  // -re/-er
  { uk: /tre$/, us: 'ter', name: '-tre/-ter' },
  { uk: /tres$/, us: 'ters', name: '-tres/-ters' },
  
  // -ogue/-og
  { uk: /ogue$/, us: 'og', name: '-ogue/-og' },
  { uk: /ogues$/, us: 'ogs', name: '-ogues/-ogs' },
  
  // -ence/-ense
  { uk: /ence$/, us: 'ense', name: '-ence/-ense' },
  
  // -ae-/-e- (archaeology, etc.)
  { uk: /ae/, us: 'e', name: '-ae-/-e-' },
  
  // -yse/-yze
  { uk: /yse$/, us: 'yze', name: '-yse/-yze' },
  { uk: /ysed$/, us: 'yzed', name: '-ysed/-yzed' },
  { uk: /ysing$/, us: 'yzing', name: '-ysing/-yzing' },
  
  // -ll-/-l- (enroll/enrol, fulfill/fulfil)
  { uk: /ll$/, us: 'l', name: '-ll/-l (US shorter)' },
  { uk: /lled$/, us: 'led', name: '-lled/-led' },
  { uk: /lling$/, us: 'ling', name: '-lling/-ling' },
  
  // -l-/-ll- (skillful/skilful - UK shorter)
  { uk: /ful$/, us: 'full', name: '-ful/-full' },
];

const duplicatePairs = [];
const processed = new Set();

for (const card of allCards) {
  const term = card.term.toLowerCase();
  if (processed.has(term)) continue;
  
  for (const pattern of patterns) {
    if (pattern.uk.test(term)) {
      const variant = term.replace(pattern.uk, pattern.us);
      
      if (termToCard[variant] && variant !== term && !processed.has(variant)) {
        // Verify it's actually a UK/US variant, not a different word
        // Skip false positives like "four"/"for", "bellow"/"below", "canoe"/"cane"
        const falsePositives = ['four', 'for', 'bellow', 'below', 'canoe', 'cane', 'our', 'or'];
        if (falsePositives.includes(term) || falsePositives.includes(variant)) {
          continue;
        }
        
        duplicatePairs.push({
          uk: term,
          ukId: card.id,
          us: variant,
          usId: termToCard[variant].id,
          pattern: pattern.name
        });
        processed.add(term);
        processed.add(variant);
      }
    }
    
    // Also check reverse (US -> UK)
    const usPattern = new RegExp(pattern.us.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$');
    if (usPattern.test(term)) {
      const ukVariant = term.replace(usPattern, pattern.uk.source.replace(/[$^]/g, ''));
      
      if (termToCard[ukVariant] && ukVariant !== term && !processed.has(ukVariant)) {
        const falsePositives = ['four', 'for', 'bellow', 'below', 'canoe', 'cane', 'our', 'or'];
        if (falsePositives.includes(term) || falsePositives.includes(ukVariant)) {
          continue;
        }
        
        // Check if we already have this pair
        const exists = duplicatePairs.some(p => 
          (p.uk === ukVariant && p.us === term) || (p.uk === term && p.us === ukVariant)
        );
        
        if (!exists) {
          duplicatePairs.push({
            uk: ukVariant,
            ukId: termToCard[ukVariant].id,
            us: term,
            usId: card.id,
            pattern: pattern.name
          });
          processed.add(term);
          processed.add(ukVariant);
        }
      }
    }
  }
}

console.log(`Found ${duplicatePairs.length} UK/US duplicate pairs:\n`);
duplicatePairs.forEach((p, i) => {
  console.log(`${i + 1}. UK: "${p.uk}" (${p.ukId.substring(0, 8)}) ↔ US: "${p.us}" (${p.usId.substring(0, 8)}) [${p.pattern}]`);
});

// Output as JSON for the merge script
console.log('\n=== JSON OUTPUT FOR MERGE SCRIPT ===');
console.log(JSON.stringify(duplicatePairs, null, 2));

