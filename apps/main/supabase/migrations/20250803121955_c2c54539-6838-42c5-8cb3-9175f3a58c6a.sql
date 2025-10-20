-- Add section-specific target scores to user_preferences
ALTER TABLE public.user_preferences 
ADD COLUMN target_scores jsonb DEFAULT '{"reading": 7.0, "listening": 7.0, "writing": 7.0, "speaking": 7.0, "overall": 7.0}'::jsonb;