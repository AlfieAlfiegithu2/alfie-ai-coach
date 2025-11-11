-- Fix Duplicate Index Issues
-- Drop duplicate indexes to improve performance and reduce storage

-- IMPORTANT: Test these changes in a development environment first!
-- Dropping indexes can temporarily slow queries until they rebuild

-- vocab_translation_queue - Remove duplicate indexes
-- Keep: idx_vocab_translation_queue_cleanup (most comprehensive)
-- Drop: idx_translation_queue_status, idx_vocab_queue_status_created
DROP INDEX IF EXISTS public.idx_translation_queue_status;
DROP INDEX IF EXISTS public.idx_vocab_queue_status_created;
-- Keep idx_vocab_translation_queue_cleanup as it's the most comprehensive

-- vocab_translations - Remove duplicate indexes
-- Keep: vocab_translations_card_lang_key (covers card_id + lang)
-- Drop: vocab_translations_card_id_lang_key (redundant)
DROP INDEX IF EXISTS public.vocab_translations_card_id_lang_key;
-- Keep vocab_translations_card_lang_key
