// Test script to diagnose auth issues
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cuumxmfzhwljylbdlflj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTkxMjEsImV4cCI6MjA2OTA5NTEyMX0.8jqO_ciOttSxSLZnKY0i5oJmEn79ROF53TjUMYhNemI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAuth() {
  console.log('🔍 Testing Supabase Auth Configuration...\n');

  try {
    // Test 1: Check if email auth is enabled
    console.log('1. Testing email signup...');
    const testEmail = `test-${Date.now()}@gmail.com`; // Use gmail.com to avoid domain restrictions
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: 'testpassword123'
    });

    if (error) {
      console.log('❌ Email signup error:', error.message);
      if (error.message.includes('Email not confirmed')) {
        console.log('✅ Email auth is enabled but email sending might be the issue');
      } else if (error.message.includes('invalid')) {
        console.log('❌ Email domain restrictions might be configured in Supabase');
      }
    } else {
      console.log('✅ Email signup successful (but user needs to confirm email)');
      console.log('📧 Check if confirmation email was sent to:', testEmail);
    }

    // Test 2: Check auth settings (limited by anon key)
    console.log('\n2. Testing auth session...');
    const { data: sessionData } = await supabase.auth.getSession();
    console.log('📋 Current session:', sessionData.session ? 'Active' : 'None');

    // Test 3: Check if we can access basic auth info
    console.log('\n3. Testing database access...');
    const { data: testData, error: dbError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);

    if (dbError) {
      console.log('❌ Database access error:', dbError.message);
    } else {
      console.log('✅ Database access works');
    }

  } catch (err) {
    console.error('❌ Test error:', err);
  }

  console.log('\n🏁 Auth test complete.');
  console.log('\n📋 RECOMMENDATIONS:');
  console.log('1. Check Supabase Dashboard → Authentication → Email Templates');
  console.log('2. Ensure SMTP settings are configured');
  console.log('3. Test email delivery from Supabase dashboard');
}

testAuth();
