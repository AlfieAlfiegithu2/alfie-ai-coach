-- Add preferred_feedback_language column to user_preferences table
ALTER TABLE public.user_preferences
ADD COLUMN IF NOT EXISTS preferred_feedback_language TEXT DEFAULT 'en';

-- Add comment
COMMENT ON COLUMN public.user_preferences.preferred_feedback_language IS 'Preferred language for receiving feedback and explanations in tests (e.g., ko for Korean, zh for Chinese). Defaults to en (English).';

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_user_preferences_feedback_language 
ON public.user_preferences(preferred_feedback_language);

