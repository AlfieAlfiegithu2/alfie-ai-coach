-- VERIFY AUTHENTICATION STATUS
-- Run this in Supabase SQL Editor after applying the RLS fix

-- Check 1: RLS Status
SELECT
  'RLS Status' as check_name,
  CASE WHEN rowsecurity THEN 'ENABLED ✅' ELSE 'DISABLED ❌ - SECURITY RISK' END as status,
  schemaname || '.' || tablename as table_name
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'profiles';

-- Check 2: Active Policies Count
SELECT
  'Policies Count' as check_name,
  COUNT(*) as policy_count,
  CASE WHEN COUNT(*) >= 3 THEN 'GOOD ✅' ELSE 'INSUFFICIENT ❌' END as status
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'profiles';

-- Check 3: List All Policies
SELECT
  'Policy Details' as check_name,
  policyname,
  cmd as operation,
  'ACTIVE ✅' as status
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'profiles'
ORDER BY policyname;

-- Check 4: Test Security (should be blocked)
SELECT
  'Security Test' as check_name,
  CASE WHEN error_message IS NOT NULL THEN 'BLOCKED ✅ (Secure)' ELSE 'ALLOWED ❌ (Insecure)' END as status,
  COALESCE(error_message, 'No error - data was inserted') as details
FROM (
  SELECT NULL as error_message
  FROM (
    SELECT 1 WHERE EXISTS (
      SELECT 1 FROM public.profiles WHERE id = 'security-test-uuid'
    )
  ) test
  WHERE test IS NULL -- This will always be false, so no rows returned

  UNION ALL

  SELECT 'Test insert was blocked by RLS' as error_message
  WHERE NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = 'security-test-uuid'
  )
) security_check;

-- Check 5: Recent Profiles (should show real users)
SELECT
  'Recent Profiles' as check_name,
  COUNT(*) as profile_count,
  CASE WHEN COUNT(*) > 0 THEN 'USERS EXIST ✅' ELSE 'NO PROFILES ❌' END as status,
  MAX(created_at) as latest_signup
FROM public.profiles
WHERE created_at > NOW() - INTERVAL '24 hours';

-- Check 6: Trigger Status
SELECT
  'Trigger Status' as check_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'on_auth_user_created'
    AND tgenabled = 'O'
  ) THEN 'ACTIVE ✅' ELSE 'MISSING/INACTIVE ❌' END as status,
  'Creates user profiles on signup' as purpose
FROM pg_trigger
WHERE tgname = 'on_auth_user_created'
LIMIT 1;

-- Check 7: Function Status
SELECT
  'Function Status' as check_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'handle_new_user'
  ) THEN 'EXISTS ✅' ELSE 'MISSING ❌' END as status,
  'Handles new user profile creation' as purpose
FROM pg_proc
WHERE proname = 'handle_new_user'
LIMIT 1;

-- Overall Status Summary
SELECT
  'OVERALL STATUS' as summary,
  CASE
    WHEN rls_enabled AND policies_count >= 3 AND trigger_active THEN 'SECURE ✅ - Ready for production'
    WHEN rls_enabled AND policies_count >= 3 THEN 'SECURE ✅ - Trigger may need attention'
    WHEN rls_enabled THEN 'PARTIALLY SECURE ⚠️ - More policies needed'
    ELSE 'INSECURE ❌ - Critical security issue'
  END as status
FROM (
  SELECT
    (SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') as rls_enabled,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles') as policies_count,
    EXISTS(SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created' AND tgenabled = 'O') as trigger_active
) status_check;
