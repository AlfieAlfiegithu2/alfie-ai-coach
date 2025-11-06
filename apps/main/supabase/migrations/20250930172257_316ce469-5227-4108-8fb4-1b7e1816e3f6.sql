-- Create content version tracking table
CREATE TABLE IF NOT EXISTS public.page_content_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_key TEXT NOT NULL UNIQUE,
  content_hash TEXT NOT NULL,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.page_content_versions ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Content versions are viewable by everyone"
  ON public.page_content_versions
  FOR SELECT
  USING (true);

-- Allow authenticated users to manage content versions
CREATE POLICY "Authenticated users can manage content versions"
  ON public.page_content_versions
  FOR ALL
  USING (auth.role() = 'authenticated');

-- Function to invalidate translations when content changes
CREATE OR REPLACE FUNCTION public.invalidate_translations_on_content_change()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- This function will be called when content changes
  -- It deletes all cached translations for pages that need updating
  DELETE FROM public.page_translations
  WHERE page_key IN (
    SELECT DISTINCT page_key 
    FROM public.page_content_versions
    WHERE last_updated > NOW() - INTERVAL '1 hour'
  );
END;
$$;