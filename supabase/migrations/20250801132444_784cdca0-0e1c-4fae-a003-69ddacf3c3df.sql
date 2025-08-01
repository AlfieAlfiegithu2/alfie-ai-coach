-- Add missing audio_url column to speaking_prompts table
ALTER TABLE public.speaking_prompts 
ADD COLUMN IF NOT EXISTS audio_url text;