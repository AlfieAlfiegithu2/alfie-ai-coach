-- Security Fix: Restrict profiles table access to own profile only
-- This prevents competitors and malicious users from scraping user data

-- Drop the overly permissive policy that allows viewing all profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Ensure the restrictive policy exists (users can only view their own profile)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles 
  FOR SELECT 
  USING (auth.uid() = id);

-- Keep the existing update and insert policies
-- These should already exist but we'll recreate them to be safe
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles 
  FOR UPDATE 
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles 
  FOR INSERT 
  WITH CHECK (auth.uid() = id);