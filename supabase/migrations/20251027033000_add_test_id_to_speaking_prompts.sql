-- Add test_id foreign key to speaking_prompts table to link with tests
ALTER TABLE public.speaking_prompts
ADD COLUMN IF NOT EXISTS test_id UUID REFERENCES public.tests(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_speaking_prompts_test_id ON public.speaking_prompts(test_id);
