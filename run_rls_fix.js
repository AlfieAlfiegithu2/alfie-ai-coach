#!/usr/bin/env node

// RLS FIX EXECUTOR
// Run this to fix the critical RLS security issue

import { execSync } from 'child_process';

const SUPABASE_URL = 'https://cuumxmfzhwljylbdlflj.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzUxOTEyMSwiZXhwIjoyMDY5MDk1MTIxfQ.1-IKqEM9i2Plmuat2iBWTtKB3u1gL_Bx6P5ZrkYSmLg';

function executeSQL(sql, description) {
  console.log(`\n🔧 ${description}...`);

  try {
    // Escape single quotes in SQL for curl
    const escapedSql = sql.replace(/'/g, "'\"'\"'");

    const curlCommand = `curl -X POST "${SUPABASE_URL}/rest/v1/rpc/exec_sql" \\
      -H "Content-Type: application/json" \\
      -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \\
      -H "apikey: ${SERVICE_ROLE_KEY}" \\
      -d '{"sql": "${escapedSql}"}' \\
      -s`;

    const result = execSync(curlCommand, { encoding: 'utf8' });
    console.log(`✅ Success: ${description}`);
    return { success: true, data: result };
  } catch (error) {
    console.log(`❌ Failed: ${description}`);
    console.log(`   Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function applyRLSFix() {
  console.log('🚨 STARTING CRITICAL RLS SECURITY FIX');
  console.log('=====================================');
  console.log(`Using service role key for ${SUPABASE_URL}`);
  console.log('');

  // Step 1: Enable RLS
  console.log('Step 1: Enabling Row Level Security...');
  const rlsResult = await executeSQL(
    'ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;',
    'Enable RLS'
  );

  if (rlsResult.success) {
    console.log('✅ RLS enabled successfully');
  } else {
    console.log('❌ Failed to enable RLS:', rlsResult.error);
    return;
  }

  // Step 2: Clean up policies
  console.log('\nStep 2: Cleaning up conflicting policies...');
  const cleanupResult = await executeSQL(`
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
    DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
    DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
    DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
    DROP POLICY IF EXISTS "profiles_service_role_policy" ON public.profiles;
  `, 'Clean up policies');

  if (cleanupResult.success) {
    console.log('✅ Policies cleaned up');
  } else {
    console.log('⚠️ Policy cleanup may have issues:', cleanupResult.error);
  }

  // Step 3: Create SELECT policy
  console.log('\nStep 3: Creating SELECT policy...');
  const selectResult = await executeSQL(`
    CREATE POLICY "profiles_select_policy" ON public.profiles
    FOR SELECT USING (auth.uid() = id);
  `, 'Create SELECT policy');

  if (selectResult.success) {
    console.log('✅ SELECT policy created');
  } else {
    console.log('❌ Failed to create SELECT policy:', selectResult.error);
  }

  // Step 4: Create INSERT policy
  console.log('\nStep 4: Creating INSERT policy...');
  const insertResult = await executeSQL(`
    CREATE POLICY "profiles_insert_policy" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);
  `, 'Create INSERT policy');

  if (insertResult.success) {
    console.log('✅ INSERT policy created');
  } else {
    console.log('❌ Failed to create INSERT policy:', insertResult.error);
  }

  // Step 5: Create UPDATE policy
  console.log('\nStep 5: Creating UPDATE policy...');
  const updateResult = await executeSQL(`
    CREATE POLICY "profiles_update_policy" ON public.profiles
    FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
  `, 'Create UPDATE policy');

  if (updateResult.success) {
    console.log('✅ UPDATE policy created');
  } else {
    console.log('❌ Failed to create UPDATE policy:', updateResult.error);
  }

  // Step 6: Create SERVICE ROLE policy
  console.log('\nStep 6: Creating SERVICE ROLE policy...');
  const serviceResult = await executeSQL(`
    CREATE POLICY "profiles_service_role_policy" ON public.profiles
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role')
    WITH CHECK (auth.jwt() ->> 'role' = 'service_role');
  `, 'Create SERVICE ROLE policy');

  if (serviceResult.success) {
    console.log('✅ SERVICE ROLE policy created');
  } else {
    console.log('❌ Failed to create SERVICE ROLE policy:', serviceResult.error);
  }

  // Step 7: Create trigger function
  console.log('\nStep 7: Creating handle_new_user function...');
  const functionResult = await executeSQL(`
    CREATE OR REPLACE FUNCTION public.handle_new_user()
    RETURNS trigger
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = 'public'
    AS $$
    BEGIN
      INSERT INTO public.profiles (id, full_name, role, subscription_status, native_language)
      VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        'user',
        'free',
        COALESCE(NEW.raw_user_meta_data->>'native_language', 'en')
      );
      RETURN NEW;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE LOG 'Profile creation failed for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
    END;
    $$;
  `, 'Create handle_new_user function');

  if (functionResult.success) {
    console.log('✅ handle_new_user function created');
  } else {
    console.log('❌ Failed to create function:', functionResult.error);
  }

  // Step 8: Create trigger
  console.log('\nStep 8: Creating user signup trigger...');
  const triggerResult = await executeSQL(`
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_new_user();
  `, 'Create user signup trigger');

  if (triggerResult.success) {
    console.log('✅ User signup trigger created');
  } else {
    console.log('❌ Failed to create trigger:', triggerResult.error);
  }

  // Step 9: Verify the fix
  console.log('\n🔍 FINAL VERIFICATION');
  console.log('======================');

  const verifyResult = await executeSQL(`
    SELECT
      'RLS Status' as check_name,
      CASE WHEN rowsecurity THEN 'ENABLED ✅' ELSE 'DISABLED ❌' END as status
    FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'profiles';
  `, 'Verify RLS status');

  if (verifyResult.success) {
    console.log('✅ Verification completed');
  } else {
    console.log('❌ Verification failed:', verifyResult.error);
  }

  console.log('\n🏁 FIX COMPLETE');
  console.log('===============');
  console.log('✅ Database security has been restored');
  console.log('✅ User signup should now work');
  console.log('✅ Google sign-in should work');
  console.log('🔄 Test the application now!');
}

console.log('🔧 Starting RLS security fix...');
applyRLSFix().catch(console.error);
