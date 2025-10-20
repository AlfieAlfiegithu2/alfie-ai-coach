-- Fix critical security issue in writing_analysis_cache table
-- Add user_id column to associate cache entries with users
ALTER TABLE public.writing_analysis_cache 
ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Create index for better performance on user queries
CREATE INDEX idx_writing_analysis_cache_user_id ON public.writing_analysis_cache(user_id);

-- Drop the insecure public read policy
DROP POLICY IF EXISTS "Users can view writing analysis cache" ON public.writing_analysis_cache;

-- Drop existing system policies to recreate them properly
DROP POLICY IF EXISTS "System can insert into writing analysis cache" ON public.writing_analysis_cache;
DROP POLICY IF EXISTS "System can update writing analysis cache" ON public.writing_analysis_cache;

-- Create secure RLS policies
-- 1. Service role can manage all cache entries (for system operations)
CREATE POLICY "Service role can manage writing analysis cache" 
ON public.writing_analysis_cache 
FOR ALL 
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- 2. Users can only view their own cached analysis
CREATE POLICY "Users can view own writing analysis cache" 
ON public.writing_analysis_cache 
FOR SELECT 
USING (auth.uid() = user_id);

-- 3. Admins can view all cache entries for moderation
CREATE POLICY "Admins can view all writing analysis cache" 
ON public.writing_analysis_cache 
FOR SELECT 
USING (is_admin());

-- 4. No direct user INSERT/UPDATE - only service role should manage cache
-- (This prevents users from creating fake cache entries)