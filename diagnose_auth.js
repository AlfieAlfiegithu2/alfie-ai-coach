#!/usr/bin/env node

// Diagnostic script to check auth system status
// Run with: node diagnose_auth.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cuumxmfzhwljylbdlflj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTkxMjEsImV4cCI6MjA2OTA5NTEyMX0.8jqO_ciOttSxSLZnKY0i5oJmEn79ROF53TjUMYhNemI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnoseAuth() {
  console.log('🔍 Diagnosing authentication system...\n');

  try {
    // Test 1: Check if handle_new_user function exists
    console.log('1. Checking handle_new_user function...');
    const { data: functions, error: funcError } = await supabase
      .from('pg_proc')
      .select('proname')
      .eq('proname', 'handle_new_user');

    if (funcError) {
      console.log('❌ Error checking function:', funcError.message);
    } else if (functions.length > 0) {
      console.log('✅ handle_new_user function exists');
    } else {
      console.log('❌ handle_new_user function NOT found');
    }

    // Test 2: Check if trigger exists
    console.log('\n2. Checking on_auth_user_created trigger...');
    const { data: triggers, error: trigError } = await supabase
      .from('pg_trigger')
      .select('tgname')
      .eq('tgname', 'on_auth_user_created');

    if (trigError) {
      console.log('❌ Error checking trigger:', trigError.message);
    } else if (triggers.length > 0) {
      console.log('✅ on_auth_user_created trigger exists');
    } else {
      console.log('❌ on_auth_user_created trigger NOT found');
    }

    // Test 3: Check profiles table policies
    console.log('\n3. Checking profiles table policies...');
    const { data: policies, error: polError } = await supabase
      .from('pg_policies')
      .select('polname')
      .eq('tablename', 'profiles');

    if (polError) {
      console.log('❌ Error checking policies:', polError.message);
    } else {
      console.log('📋 Current policies on profiles table:');
      policies.forEach(p => console.log(`   - ${p.polname}`));
    }

    // Test 4: Try to insert a test profile (this should fail due to RLS)
    console.log('\n4. Testing profile insertion with anon key...');
    const { data: testInsert, error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: '00000000-0000-0000-0000-000000000000', // fake UUID
        full_name: 'Test User',
        role: 'user'
      });

    if (insertError) {
      console.log('✅ Insert blocked by RLS (expected):', insertError.message);
    } else {
      console.log('❌ Insert succeeded (unexpected) - RLS not working');
    }

    // Test 5: Check recent auth logs (if accessible)
    console.log('\n5. Checking recent user signups...');
    const { data: recentUsers, error: usersError } = await supabase
      .from('profiles')
      .select('id, full_name, created_at')
      .order('created_at', { ascending: false })
      .limit(3);

    if (usersError) {
      console.log('❌ Error checking recent users:', usersError.message);
    } else {
      console.log('📅 Recent user profiles:');
      recentUsers.forEach(u => console.log(`   - ${u.full_name} (${u.created_at})`));
    }

  } catch (err) {
    console.error('❌ Diagnostic error:', err);
  }

  console.log('\n🏁 Diagnosis complete.');
  console.log('\n📋 If issues persist, run this SQL in Supabase SQL Editor:');
  console.log(`
-- Complete auth system reset
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Recreate with service role access
CREATE POLICY "Service role can manage profiles"
ON public.profiles
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

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
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
  `);
}

diagnoseAuth();
