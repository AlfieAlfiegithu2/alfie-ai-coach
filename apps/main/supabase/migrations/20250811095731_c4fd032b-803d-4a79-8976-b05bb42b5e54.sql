-- Add audio_url column to skill_practice_questions table for listening tests
ALTER TABLE public.skill_practice_questions
ADD COLUMN IF NOT EXISTS audio_url TEXT;