-- Create table for caching page translations
CREATE TABLE IF NOT EXISTS public.page_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_key TEXT NOT NULL,
  language_code TEXT NOT NULL,
  content JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(page_key, language_code)
);

-- Enable RLS
ALTER TABLE public.page_translations ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Page translations are viewable by everyone"
  ON public.page_translations
  FOR SELECT
  USING (true);

-- Allow authenticated users to manage translations
CREATE POLICY "Authenticated users can manage page translations"
  ON public.page_translations
  FOR ALL
  USING (auth.role() = 'authenticated');

-- Create index for faster lookups
CREATE INDEX idx_page_translations_lookup ON public.page_translations(page_key, language_code);

-- Add updated_at trigger
CREATE TRIGGER set_page_translations_updated_at
  BEFORE UPDATE ON public.page_translations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();