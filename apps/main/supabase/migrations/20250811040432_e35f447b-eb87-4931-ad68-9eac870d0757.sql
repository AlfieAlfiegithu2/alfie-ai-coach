-- Paraphrasing Challenge: add original_sentence column to skill_practice_questions
ALTER TABLE public.skill_practice_questions
ADD COLUMN IF NOT EXISTS original_sentence TEXT;