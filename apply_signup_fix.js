#!/usr/bin/env node

// Script to apply the signup trigger fix to Supabase
// Run with: node apply_signup_fix.js

import https from 'https';
import { URL } from 'url';

const supabaseUrl = 'https://cuumxmfzhwljylbdlflj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTkxMjEsImV4cCI6MjA2OTA5NTEyMX0.8jqO_ciOttSxSLZnKY0i5oJmEn79ROF53TjUMYhNemI';

async function executeSQL(sql) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${supabaseUrl}/rest/v1/rpc/exec_sql`);

    const postData = JSON.stringify({
      sql: sql
    });

    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(postData);
    req.end();
  });
}

async function applySignupFix() {
  console.log('🔧 Applying signup trigger fix...');

  const sql = `
    -- Add policy to allow service role to manage profiles (for trigger operations)
    DROP POLICY IF EXISTS "Service role can manage profiles" ON public.profiles;
    CREATE POLICY "Service role can manage profiles"
    ON public.profiles
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role')
    WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

    -- Ensure the handle_new_user function is properly configured
    CREATE OR REPLACE FUNCTION public.handle_new_user()
    RETURNS trigger
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = 'public'
    AS $function$
    BEGIN
      -- Insert profile for new user
      INSERT INTO public.profiles (id, full_name, role, subscription_status, native_language)
      VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        'user',
        'free',
        COALESCE(NEW.raw_user_meta_data->>'native_language', 'en')
      );

      -- Log successful profile creation
      RAISE LOG 'Created profile for user: %', NEW.id;

      RETURN NEW;
    EXCEPTION
      WHEN OTHERS THEN
        -- Log the error and re-raise
        RAISE LOG 'Error creating profile for user %: %', NEW.id, SQLERRM;
        RAISE;
    END;
    $function$;

    -- Ensure the trigger exists and is properly attached
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_new_user();
  `;

  try {
    // Try to execute the SQL
    await executeSQL(sql);
    console.log('✅ Signup trigger fix applied successfully!');
    return true;
  } catch (err) {
    console.error('❌ Error applying fix:', err.message);

    // Fallback: provide the SQL for manual execution
    console.log('\n📋 Please manually execute this SQL in Supabase SQL Editor:');
    console.log('https://supabase.com/dashboard/project/cuumxmfzhwljylbdlflj/sql/new\n');
    console.log(sql);
    return false;
  }
}

applySignupFix();
