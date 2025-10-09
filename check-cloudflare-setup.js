#!/usr/bin/env node

/**
 * Quick Cloudflare R2 Setup Checker
 * Run this to verify your R2 configuration
 */

const { createClient } = require('@supabase/supabase-js');

// You'll need to replace these with your actual values
const SUPABASE_URL = 'https://cuumxmfzhwljylbdlflj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE3MTU5NzAsImV4cCI6MjA0NzI5MTk3MH0.bx2xwQ8nQ8nQ8nQ8nQ8nQ8nQ8nQ8nQ8nQ8nQ8nQ8nQ';

async function checkR2Setup() {
  console.log('🔍 Checking Cloudflare R2 Setup...\n');

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Call the health check function
    const { data, error } = await supabase.functions.invoke('r2-health-check');

    if (error) {
      console.error('❌ Error calling health check:', error);
      return;
    }

    console.log('📊 R2 Health Check Results:');
    console.log('============================');

    // Check environment variables
    console.log('\n🔧 Environment Variables:');
    Object.entries(data.results.env_vars).forEach(([key, exists]) => {
      console.log(`  ${exists ? '✅' : '❌'} ${key}`);
    });

    // Show actual values (masked)
    console.log('\n📋 Configuration Values:');
    Object.entries(data.results.values).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });

    // Show test results
    console.log('\n🧪 Connection Tests:');
    Object.entries(data.results.tests).forEach(([test, passed]) => {
      console.log(`  ${passed ? '✅' : '❌'} ${test.replace(/_/g, ' ')}`);
    });

    if (data.success) {
      console.log('\n🎉 SUCCESS: Your R2 setup is working correctly!');
      console.log('\n💡 If TTS is still not working, the issue might be:');
      console.log('   - Missing question_id in the audio request');
      console.log('   - R2 public URL not properly configured');
      console.log('   - Browser CORS issues with R2 URLs');
    } else {
      console.log('\n❌ FAILED: R2 setup has issues');
      console.log(`   Error: ${data.error}`);
      
      if (data.error.includes('Missing environment variables')) {
        console.log('\n🔧 To fix:');
        console.log('   1. Go to your Supabase project dashboard');
        console.log('   2. Navigate to Settings > Edge Functions');
        console.log('   3. Add the missing environment variables');
        console.log('   4. Redeploy your functions');
      }
    }

  } catch (err) {
    console.error('❌ Failed to check R2 setup:', err.message);
    console.log('\n💡 Make sure you:');
    console.log('   1. Have deployed the r2-health-check function');
    console.log('   2. Updated the SUPABASE_URL and SUPABASE_ANON_KEY in this script');
  }
}

// Run the check
checkR2Setup().catch(console.error);
