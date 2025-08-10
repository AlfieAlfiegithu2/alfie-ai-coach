-- Part 1: Add explanation column to skill_practice_questions
ALTER TABLE public.skill_practice_questions
ADD COLUMN IF NOT EXISTS explanation TEXT;