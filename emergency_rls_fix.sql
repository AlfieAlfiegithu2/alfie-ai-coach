-- EMERGENCY RLS FIX FOR PROFILES TABLE
-- Run this in Supabase SQL Editor - ONE COMMAND AT A TIME

-- Step 1: Check current status
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled,
  CASE WHEN rowsecurity THEN 'SECURE' ELSE 'INSECURE - FIX REQUIRED' END as status
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'profiles';

-- Step 2: FORCE enable RLS (this should work)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Step 3: Verify RLS is now enabled
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled,
  CASE WHEN rowsecurity THEN 'SECURE ✅' ELSE 'STILL INSECURE ❌' END as status
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'profiles';

-- Step 4: Clean up ALL existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile (except role)" ON public.profiles;
DROP POLICY IF EXISTS "Only admins can update user roles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Service role can manage profiles" ON public.profiles;

-- Step 5: Create SECURE policies
CREATE POLICY "profiles_select_policy" ON public.profiles
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_insert_policy" ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_policy" ON public.profiles
FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Step 6: Allow service role for trigger operations
CREATE POLICY "profiles_service_role_policy" ON public.profiles
FOR ALL USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Step 7: Verify policies were created
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'profiles'
ORDER BY policyname;

-- Step 8: Test RLS is working (this should fail)
-- This insert should be blocked by RLS
INSERT INTO public.profiles (id, full_name, role)
VALUES ('test-uuid-123', 'Test User', 'user');

-- Step 9: Clean up test data (if it somehow got inserted)
DELETE FROM public.profiles WHERE id = 'test-uuid-123';
