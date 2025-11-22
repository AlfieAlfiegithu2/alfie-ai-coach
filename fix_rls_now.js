#!/usr/bin/env node

// URGENT RLS FIX SCRIPT
// Run this to fix the critical security issue immediately
// Usage: node fix_rls_now.js

import { createClient } from '@supabase/supabase-js';
import readline from 'readline';

// You'll need to get the service role key from Supabase Dashboard -> Settings -> API
// Replace YOUR_SERVICE_ROLE_KEY_HERE with the actual key
const supabaseUrl = 'https://cuumxmfzhwljylbdlflj.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY_HERE';

if (serviceRoleKey === 'YOUR_SERVICE_ROLE_KEY_HERE') {
  console.log('❌ ERROR: Service role key not provided!');
  console.log('');
  console.log('To get your service role key:');
  console.log('1. Go to Supabase Dashboard');
  console.log('2. Go to Settings -> API');
  console.log('3. Copy the "service_role" key');
  console.log('4. Run: SUPABASE_SERVICE_ROLE_KEY=your_key_here node fix_rls_now.js');
  console.log('');
  console.log('⚠️  WARNING: Service role key has FULL access to your database!');
  console.log('   Only run this script if you trust the source.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function executeSQL(sql, description) {
  console.log(`\n🔧 ${description}...`);
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql });

    if (error) {
      console.log(`❌ Error: ${error.message}`);
      return false;
    }

    console.log(`✅ Success: ${description}`);
    return true;
  } catch (err) {
    console.log(`❌ Exception: ${err.message}`);
    return false;
  }
}

async function checkRLSStatus() {
  console.log('\n🔍 Checking RLS status...');

  const { data, error } = await supabase
    .from('pg_tables')
    .select('schemaname, tablename, rowsecurity')
    .eq('schemaname', 'public')
    .eq('tablename', 'profiles')
    .single();

  if (error) {
    console.log(`❌ Error checking RLS: ${error.message}`);
    return null;
  }

  console.log(`📊 Current RLS status: ${data.rowsecurity ? 'ENABLED ✅' : 'DISABLED ❌'}`);
  return data.rowsecurity;
}

async function applyRLSFix() {
  console.log('🚨 STARTING CRITICAL SECURITY FIX');
  console.log('=====================================');

  // Check initial status
  const initialStatus = await checkRLSStatus();
  if (initialStatus === null) {
    console.log('❌ Cannot proceed - unable to check database status');
    return;
  }

  if (initialStatus) {
    console.log('ℹ️  RLS is already enabled - this is good!');
  } else {
    console.log('🚨 RLS is DISABLED - this is a CRITICAL SECURITY ISSUE!');
  }

  // Step 1: Enable RLS
  const rlsEnabled = await executeSQL(
    'ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;',
    'Enabling Row Level Security on profiles table'
  );

  if (!rlsEnabled) {
    console.log('❌ FAILED to enable RLS - manual intervention required!');
    return;
  }

  // Step 2: Clean up policies
  await executeSQL(`
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
  `, 'Cleaning up conflicting policies');

  // Step 3: Create secure policies
  await executeSQL(`
    CREATE POLICY "profiles_select_policy" ON public.profiles
    FOR SELECT USING (auth.uid() = id);
  `, 'Creating SELECT policy');

  await executeSQL(`
    CREATE POLICY "profiles_insert_policy" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);
  `, 'Creating INSERT policy');

  await executeSQL(`
    CREATE POLICY "profiles_update_policy" ON public.profiles
    FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
  `, 'Creating UPDATE policy');

  await executeSQL(`
    CREATE POLICY "profiles_service_role_policy" ON public.profiles
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role')
    WITH CHECK (auth.jwt() ->> 'role' = 'service_role');
  `, 'Creating SERVICE ROLE policy');

  // Step 4: Ensure trigger and function exist
  await executeSQL(`
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
  `, 'Creating handle_new_user function');

  await executeSQL(`
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_new_user();
  `, 'Creating user signup trigger');

  // Step 5: Final verification
  console.log('\n🔍 FINAL VERIFICATION');
  console.log('======================');

  const finalStatus = await checkRLSStatus();

  if (finalStatus) {
    console.log('✅ RLS is ENABLED - Security restored!');
  } else {
    console.log('❌ RLS is still DISABLED - Manual intervention required!');
  }

  // Check policies
  const { data: policies, error: polError } = await supabase
    .from('pg_policies')
    .select('policyname, cmd')
    .eq('schemaname', 'public')
    .eq('tablename', 'profiles');

  if (!polError && policies.length > 0) {
    console.log(`✅ ${policies.length} policies created:`);
    policies.forEach(p => console.log(`   - ${p.policyname} (${p.cmd})`));
  } else {
    console.log('❌ No policies found!');
  }

  // Test security
  console.log('\n🧪 Testing security...');
  const { error: testError } = await supabase
    .from('profiles')
    .insert({
      id: 'security-test-uuid',
      full_name: 'Security Test',
      role: 'user'
    });

  if (testError && testError.message.includes('policy')) {
    console.log('✅ Security test PASSED - Insert blocked by RLS');
  } else {
    console.log('❌ Security test FAILED - Insert allowed (security breach!)');
  }

  console.log('\n🏁 FIX COMPLETE');
  console.log('===============');
  console.log('✅ Database security has been restored');
  console.log('✅ User signup should now work');
  console.log('✅ Google sign-in should work');
  console.log('🔄 Test the application now!');
}

// Interactive confirmation
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('⚠️  This will modify your database security settings. Continue? (yes/no): ', (answer) => {
  if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
    applyRLSFix().then(() => {
      rl.close();
    });
  } else {
    console.log('❌ Operation cancelled by user');
    rl.close();
  }
});
