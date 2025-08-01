-- Add transcription column to speaking_prompts table for storing question transcriptions
ALTER TABLE public.speaking_prompts 
ADD COLUMN IF NOT EXISTS transcription text;