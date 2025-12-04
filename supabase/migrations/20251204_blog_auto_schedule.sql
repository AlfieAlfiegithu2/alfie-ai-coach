-- Blog Auto-Schedule Settings
-- Stores configuration for automatic blog posting

CREATE TABLE IF NOT EXISTS public.blog_auto_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled boolean DEFAULT false,
  posts_per_day integer DEFAULT 3,
  subjects text[] DEFAULT ARRAY['IELTS', 'TOEIC', 'TOEFL', 'PTE', 'Business English', 'NCLEX'],
  auto_publish boolean DEFAULT true,
  last_run_at timestamp with time zone,
  posts_generated_today integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Only allow one row (singleton pattern)
CREATE UNIQUE INDEX IF NOT EXISTS blog_auto_schedule_singleton ON public.blog_auto_schedule ((true));

-- Insert default settings
INSERT INTO public.blog_auto_schedule (enabled, posts_per_day, subjects, auto_publish)
VALUES (false, 3, ARRAY['IELTS', 'TOEIC', 'TOEFL', 'PTE', 'Business English', 'NCLEX'], true)
ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE public.blog_auto_schedule ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read
CREATE POLICY "blog_auto_schedule_select" ON public.blog_auto_schedule
  FOR SELECT USING (true);

-- Allow service role to update
CREATE POLICY "blog_auto_schedule_update" ON public.blog_auto_schedule
  FOR UPDATE USING (true);

-- Blog generation log to track what was generated
CREATE TABLE IF NOT EXISTS public.blog_generation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  subject text NOT NULL,
  source text DEFAULT 'auto',
  post_id uuid REFERENCES public.blog_posts(id) ON DELETE SET NULL,
  status text DEFAULT 'pending', -- pending, success, failed
  error_message text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.blog_generation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "blog_generation_log_select" ON public.blog_generation_log
  FOR SELECT USING (true);

CREATE POLICY "blog_generation_log_insert" ON public.blog_generation_log
  FOR INSERT WITH CHECK (true);

CREATE POLICY "blog_generation_log_update" ON public.blog_generation_log
  FOR UPDATE USING (true);

