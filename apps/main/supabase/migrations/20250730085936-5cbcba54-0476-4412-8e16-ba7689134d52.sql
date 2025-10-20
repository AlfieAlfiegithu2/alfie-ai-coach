-- Create dedicated table for IELTS reading tests
CREATE TABLE IF NOT EXISTS public.ielts_reading_tests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  test_name TEXT NOT NULL,
  test_number INTEGER UNIQUE NOT NULL,
  status TEXT DEFAULT 'incomplete',
  parts_completed INTEGER DEFAULT 0,
  total_questions INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ielts_reading_tests ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "IELTS reading tests are viewable by everyone" ON public.ielts_reading_tests FOR SELECT USING (true);
CREATE POLICY "Only admins can manage IELTS reading tests" ON public.ielts_reading_tests FOR ALL USING (false) WITH CHECK (false);

-- Create function to update timestamps
CREATE TRIGGER update_ielts_reading_tests_updated_at
  BEFORE UPDATE ON public.ielts_reading_tests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();