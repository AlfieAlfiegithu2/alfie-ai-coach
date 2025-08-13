-- Add test_order column to skill_tests table
ALTER TABLE public.skill_tests
ADD COLUMN IF NOT EXISTS test_order INT;

-- Create user_test_progress table for tracking user progress
CREATE TABLE IF NOT EXISTS public.user_test_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  test_id UUID NOT NULL REFERENCES public.skill_tests(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'locked' CHECK (status IN ('locked', 'unlocked', 'completed')),
  completed_score INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, test_id)
);

-- Enable RLS on user_test_progress table
ALTER TABLE public.user_test_progress ENABLE ROW LEVEL SECURITY;

-- Create policies for user_test_progress
CREATE POLICY "Users can view their own test progress" 
ON public.user_test_progress 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own test progress" 
ON public.user_test_progress 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own test progress" 
ON public.user_test_progress 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_test_progress_updated_at
BEFORE UPDATE ON public.user_test_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to initialize user progress for first test
CREATE OR REPLACE FUNCTION public.initialize_user_vocabulary_progress()
RETURNS TRIGGER AS $$
BEGIN
  -- When a new user is created, unlock the first vocabulary test
  INSERT INTO public.user_test_progress (user_id, test_id, status)
  SELECT 
    NEW.id,
    st.id,
    'unlocked'
  FROM public.skill_tests st
  WHERE st.skill_slug = 'vocabulary-builder'
    AND st.test_order = 1
  ON CONFLICT (user_id, test_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to initialize progress for new users
CREATE TRIGGER initialize_vocabulary_progress_on_signup
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.initialize_user_vocabulary_progress();