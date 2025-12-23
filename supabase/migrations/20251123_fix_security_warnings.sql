-- Fix security warnings by setting fixed search_path for functions
-- This prevents malicious users from overriding operators or functions by manipulating the search_path

-- 1. Fix get_cards_needing_translation
ALTER FUNCTION public.get_cards_needing_translation(INTEGER, INTEGER, TEXT[]) SET search_path = public, pg_catalog;

-- 2. Fix update_earthworm_stats (Trigger function)
ALTER FUNCTION public.update_earthworm_stats() SET search_path = public, pg_catalog;

-- 3. Fix auto_translate_vocab_card (Trigger function)
ALTER FUNCTION public.auto_translate_vocab_card() SET search_path = public, pg_catalog;

-- 4. Fix get_translation_stats
ALTER FUNCTION public.get_translation_stats() SET search_path = public, pg_catalog;
