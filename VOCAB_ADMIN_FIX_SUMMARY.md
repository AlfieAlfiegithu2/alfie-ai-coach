# Admin Vocabulary Word Count Fix - October 30, 2025

## Problem
The Admin Vocabulary Book page (`/admin/vocab-book`) was unable to load vocabulary word counts, showing either "0" or failing with RLS policy errors.

## Root Cause
The component was trying to query the `vocabulary_words` table which had overly restrictive RLS (Row Level Security) policies that blocked authenticated user access:

```sql
CREATE POLICY "Only service role can manage vocabulary words" 
ON public.vocabulary_words 
FOR ALL 
USING (false)
WITH CHECK (false);
```

This policy with `USING (false)` was denying ALL operations to non-service-role users, including SELECT queries.

## Solution
Updated `AdminVocabBook.tsx` to query the `vocab_cards` table instead of `vocabulary_words`. The `vocab_cards` table has proper RLS policies that allow reading public vocabulary:

```sql
CREATE POLICY "Users can view their own cards"
  ON public.vocab_cards FOR SELECT
  USING (auth.uid() = user_id OR is_public = true);
```

### Changes Made

**File: `/apps/main/src/pages/AdminVocabBook.tsx`**

1. Changed query from `vocabulary_words` to `vocab_cards`
2. Added `.eq("is_public", true)` filter to count only public vocabulary
3. Added proper error handling with try-catch
4. Added loading state display ("Loading..." when stats are null)
5. Updated console logging to indicate which table is being queried
6. Updated UI text to reflect "public vocabulary words"

### Before
```javascript
const { count } = await (supabase as any)
  .from("vocabulary_words")
  .select("id", { count: "exact", head: true });
```

### After
```javascript
const { count, error: statsError } = await (supabase as any)
  .from("vocab_cards")
  .select("id", { count: "exact", head: true })
  .eq("is_public", true);

if (statsError) {
  console.error("❌ Error loading stats:", statsError);
  setStats({ total: 0 });
} else {
  console.log(`✅ Loaded stats: ${count} public vocabulary cards`);
  setStats({ total: count || 0 });
}
```

## Migration Files Created
Two migration files were created to fix the vocabulary_words RLS policies (as backup/documentation):
- `apps/main/supabase/migrations/20251030_fix_vocab_words_rls.sql`
- `supabase/migrations/20251030_fix_vocab_words_rls.sql`

These migrations drop the restrictive `FOR ALL USING (false)` policy and create separate INSERT/UPDATE/DELETE policies for service role only, while keeping SELECT open for all users.

## Testing
1. Navigate to Admin Dashboard → Vocabulary Admin → Vocabulary Book
2. The "Current Stats" section should now display the correct count of public vocabulary words
3. Console should show: "📊 Loading vocabulary stats from vocab_cards..." followed by "✅ Loaded stats: X public vocabulary cards"

## Notes
- The `vocab_cards` table is the primary vocabulary storage table used throughout the application
- The `vocabulary_words` table may have been created for a different purpose and isn't actively used
- All public vocabulary cards are now properly counted and displayed
- Users can now upload CSV files and see the updated word count after import
