-- Add word_translation_language column to user_preferences table
-- This controls the target language for double-click word translation feature
ALTER TABLE public.user_preferences
ADD COLUMN IF NOT EXISTS word_translation_language TEXT DEFAULT 'en';

COMMENT ON COLUMN public.user_preferences.word_translation_language IS 'Target language for double-click word translation feature (e.g., ko for Korean, zh for Chinese). Defaults to en (English).';

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_user_preferences_word_translation_language 
ON public.user_preferences(word_translation_language);
