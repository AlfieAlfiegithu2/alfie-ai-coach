import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://cuumxmfzhwljylbdlflj.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTkxMjEsImV4cCI6MjA2OTA5NTEyMX0.8jqO_ciOttSxSLZnKY0i5oJmEn79ROF53TjUMYhNemI');

console.log('=== CHECKING DELETE OPERATIONS ===\n');

// Try to find and delete a specific duplicate
const { data: januaryCards } = await supabase
  .from('vocab_cards')
  .select('id, term, created_at')
  .ilike('term', 'january')
  .order('created_at', { ascending: true });

console.log('January cards found:', januaryCards?.length);
januaryCards?.forEach(c => console.log(`  ${c.id}: "${c.term}" - ${c.created_at}`));

if (januaryCards && januaryCards.length > 1) {
  const cardToDelete = januaryCards[1];
  console.log(`\nAttempting to delete: ${cardToDelete.id}`);
  
  // Try delete
  const { data: deleteData, error: deleteError } = await supabase
    .from('vocab_cards')
    .delete()
    .eq('id', cardToDelete.id)
    .select();
  
  console.log('Delete result:', deleteData);
  console.log('Delete error:', deleteError);
  
  // Check if it was deleted
  const { data: checkCard } = await supabase
    .from('vocab_cards')
    .select('id')
    .eq('id', cardToDelete.id);
  
  console.log('Card still exists:', checkCard?.length > 0);
}

// Check sympathise cards
console.log('\n=== CHECKING SYMPATHISE CARDS ===');
const { data: sympathiseCards } = await supabase
  .from('vocab_cards')
  .select('id, term')
  .or('term.eq.sympathise,term.eq.sympathize');

console.log('Sympathise/sympathize cards:', sympathiseCards?.length);
sympathiseCards?.forEach(c => console.log(`  ${c.id}: "${c.term}"`));

// Try to update one
if (sympathiseCards && sympathiseCards.length >= 2) {
  const ukCard = sympathiseCards.find(c => c.term === 'sympathise');
  const usCard = sympathiseCards.find(c => c.term === 'sympathize');
  
  if (ukCard && usCard) {
    console.log(`\nAttempting to update UK card to merged term...`);
    const { data: updateData, error: updateError } = await supabase
      .from('vocab_cards')
      .update({ term: 'sympathise/sympathize' })
      .eq('id', ukCard.id)
      .select();
    
    console.log('Update result:', updateData);
    console.log('Update error:', updateError);
    
    // Check the result
    const { data: checkCard } = await supabase
      .from('vocab_cards')
      .select('term')
      .eq('id', ukCard.id)
      .single();
    
    console.log('Card term now:', checkCard?.term);
  }
}

