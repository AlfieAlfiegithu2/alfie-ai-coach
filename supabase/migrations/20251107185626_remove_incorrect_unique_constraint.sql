-- Remove the incorrect unique constraint that prevents multiple questions per part
-- The constraint speaking_prompts_test_id_part_number_unique was incorrectly added
-- Parts 1 and 3 can have multiple questions, so we need to allow multiple prompts per (test_id, part_number)

ALTER TABLE public.speaking_prompts
DROP CONSTRAINT IF EXISTS speaking_prompts_test_id_part_number_unique;
