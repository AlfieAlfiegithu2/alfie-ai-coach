// Run this script to create the OTP tables in Supabase
// Usage: node apply_otp_tables.js

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables manually
function loadEnv(filePath) {
  try {
    const content = readFileSync(filePath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').replace(/^["']|["']$/g, '');
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  } catch (e) {
    // File doesn't exist, that's fine
  }
}

// Try multiple env file locations
loadEnv(join(__dirname, '.env.local'));
loadEnv(join(__dirname, '.env'));
loadEnv(join(__dirname, 'apps/main/.env.local'));
loadEnv(join(__dirname, 'apps/main/.env'));

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables:');
  console.error('  - SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗');
  console.error('\nPlease ensure your .env file has these variables set.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log('🚀 Checking OTP tables...\n');

  // Try to verify tables exist by selecting from them
  console.log('1️⃣ Checking signup_otps table...');
  
  const { error: signupCheck } = await supabase
    .from('signup_otps')
    .select('id')
    .limit(1);
  
  if (signupCheck && signupCheck.code === '42P01') {
    console.log('   ⚠️ signup_otps table does NOT exist');
  } else if (signupCheck) {
    console.log('   ⚠️ Error:', signupCheck.message);
  } else {
    console.log('   ✓ signup_otps table exists');
  }

  console.log('\n2️⃣ Checking password_reset_otps table...');
  const { error: resetCheck } = await supabase
    .from('password_reset_otps')
    .select('id')
    .limit(1);
  
  if (resetCheck && resetCheck.code === '42P01') {
    console.log('   ⚠️ password_reset_otps table does NOT exist');
  } else if (resetCheck) {
    console.log('   ⚠️ Error:', resetCheck.message);
  } else {
    console.log('   ✓ password_reset_otps table exists');
  }

  // Determine if migration is needed
  const needsMigration = 
    (signupCheck && signupCheck.code === '42P01') || 
    (resetCheck && resetCheck.code === '42P01');

  if (needsMigration) {
    console.log('\n❌ Some tables are missing!');
    console.log('\n📋 Please run this SQL in Supabase Dashboard SQL Editor:');
    console.log('   Go to: https://supabase.com/dashboard/project/_/sql/new');
    console.log('   Copy and run the contents of: apply_auth_otp_migration.sql\n');
  } else {
    console.log('\n✅ All OTP tables exist and are ready!');
  }
}

applyMigration().catch(console.error);
