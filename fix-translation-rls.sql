-- Fix RLS policies for translation tables
-- Run this in Supabase SQL Editor to resolve 403 Forbidden errors

-- Drop any existing restrictive policies
DROP POLICY IF EXISTS "Only service role can manage content versions" ON public.page_content_versions;
DROP POLICY IF EXISTS "Only service role can manage page translations" ON public.page_translations;
DROP POLICY IF EXISTS "Content versions are viewable by everyone" ON public.page_content_versions;
DROP POLICY IF EXISTS "Authenticated users can manage content versions" ON public.page_content_versions;
DROP POLICY IF EXISTS "Authenticated users can manage page translations" ON public.page_translations;
DROP POLICY IF EXISTS "Service role can manage content versions" ON public.page_content_versions;
DROP POLICY IF EXISTS "Service role can manage page translations" ON public.page_translations;

-- Enable RLS on the tables (in case it's disabled)
ALTER TABLE public.page_content_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_translations ENABLE ROW LEVEL SECURITY;

-- Allow public read access for content versions
CREATE POLICY "Content versions are viewable by everyone"
  ON public.page_content_versions
  FOR SELECT
  USING (true);

-- Allow authenticated users to manage content versions (INSERT, UPDATE, DELETE)
CREATE POLICY "Authenticated users can manage content versions"
  ON public.page_content_versions
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to manage page translations
CREATE POLICY "Authenticated users can manage page translations"
  ON public.page_translations
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Allow service role for backward compatibility
CREATE POLICY "Service role can manage content versions"
  ON public.page_content_versions
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage page translations"
  ON public.page_translations
  FOR ALL
  USING (auth.role() = 'service_role');
