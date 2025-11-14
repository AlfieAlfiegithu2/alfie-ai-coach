-- Fix RLS policies for translation tables to allow authenticated users
-- This resolves the 403 errors when users try to access translation features

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Only service role can manage content versions" ON public.page_content_versions;
DROP POLICY IF EXISTS "Only service role can manage page translations" ON public.page_translations;

-- Create new policies allowing authenticated users to manage translations
CREATE POLICY "Authenticated users can manage content versions"
  ON public.page_content_versions
  FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage page translations"
  ON public.page_translations
  FOR ALL
  USING (auth.role() = 'authenticated');

-- Also allow service role for backward compatibility
CREATE POLICY "Service role can manage content versions"
  ON public.page_content_versions
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage page translations"
  ON public.page_translations
  FOR ALL
  USING (auth.role() = 'service_role');


