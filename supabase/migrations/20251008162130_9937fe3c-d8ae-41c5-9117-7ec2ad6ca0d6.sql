-- Clean up duplicate and overly permissive policies on profiles table
-- Keep only the secure policies that restrict access to own profile

-- Drop all potentially problematic policies
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Only admins can update user roles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile (except role)" ON public.profiles;

-- The correct policies should already exist from previous migration:
-- 1. "Users can view own profile" - FOR SELECT USING (auth.uid() = id)
-- 2. "Users can update their own profile" - FOR UPDATE USING (auth.uid() = id)  
-- 3. "Users can insert their own profile" - FOR INSERT WITH CHECK (auth.uid() = id)