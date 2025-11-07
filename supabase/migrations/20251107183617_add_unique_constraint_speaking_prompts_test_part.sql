-- Add unique constraint on (test_id, part_number) for speaking_prompts table
-- This ensures only one prompt per test per part (Part 1, 2, or 3)

-- First, handle any duplicates that might exist (keep the most recent one)
DELETE FROM public.speaking_prompts a USING (
  SELECT MIN(ctid) as ctid, test_id, part_number
  FROM public.speaking_prompts
  WHERE test_id IS NOT NULL
  GROUP BY test_id, part_number HAVING COUNT(*) > 1
) b
WHERE a.test_id = b.test_id
  AND a.part_number = b.part_number
  AND a.ctid <> b.ctid;

-- Add the unique constraint
ALTER TABLE public.speaking_prompts
ADD CONSTRAINT speaking_prompts_test_id_part_number_unique
UNIQUE (test_id, part_number);
