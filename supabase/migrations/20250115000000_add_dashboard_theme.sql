-- Add dashboard_theme column to user_preferences
ALTER TABLE public.user_preferences 
ADD COLUMN IF NOT EXISTS dashboard_theme TEXT DEFAULT 'note';

-- Add comment
COMMENT ON COLUMN public.user_preferences.dashboard_theme IS 'Dashboard theme preference: note, glassmorphism, dark, or minimalist';



