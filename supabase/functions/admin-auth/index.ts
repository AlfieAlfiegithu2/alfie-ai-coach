import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Restrict CORS to allowed origins only
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:3009',
  'http://localhost:8080',
  'https://alfie-ai-coach.vercel.app',
  'https://alfie.app',
  'https://www.alfie.app'
];

function getCorsHeaders(origin: string | null) {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Credentials': 'true',
  };
}

// Rate limiting configuration
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 30;

// Secure password hashing using Web Crypto API
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const salt = crypto.getRandomValues(new Uint8Array(16));

  const key = await crypto.subtle.importKey(
    'raw',
    data,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    key,
    256
  );

  const hashArray = new Uint8Array(derivedBits);
  const saltArray = Array.from(salt);
  const hashArrayConverted = Array.from(hashArray);

  // Combine salt and hash
  const combined = saltArray.concat(hashArrayConverted);
  return btoa(String.fromCharCode(...combined));
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const combined = atob(storedHash);
    const combinedArray = new Uint8Array(combined.length);
    for (let i = 0; i < combined.length; i++) {
      combinedArray[i] = combined.charCodeAt(i);
    }

    // Extract salt (first 16 bytes) and hash (remaining bytes)
    const salt = combinedArray.slice(0, 16);
    const originalHash = combinedArray.slice(16);

    const encoder = new TextEncoder();
    const data = encoder.encode(password);

    const key = await crypto.subtle.importKey(
      'raw',
      data,
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );

    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      key,
      256
    );

    const newHash = new Uint8Array(derivedBits);

    // Compare hashes
    if (newHash.length !== originalHash.length) {
      return false;
    }

    for (let i = 0; i < newHash.length; i++) {
      if (newHash[i] !== originalHash[i]) {
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
}

// Generate cryptographically secure session token
function generateSecureToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Validate input data
function validateInput(data: any) {
  if (!data.email || !data.password) {
    throw new Error('Email and password are required');
  }

  if (data.email.length > 255 || data.password.length > 128) {
    throw new Error('Input data too long');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.email)) {
    throw new Error('Invalid email format');
  }

  if (data.password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }
}

// Check rate limiting for login attempts
async function checkRateLimit(supabaseClient: any, email: string, clientIP: string): Promise<{ blocked: boolean; remaining: number }> {
  const cutoffTime = new Date(Date.now() - LOCKOUT_DURATION_MINUTES * 60 * 1000).toISOString();

  // Check failed attempts in the lockout window
  const { data: attempts, error } = await supabaseClient
    .from('admin_login_attempts')
    .select('id')
    .eq('email', email.toLowerCase().trim())
    .eq('success', false)
    .gte('created_at', cutoffTime);

  if (error) {
    console.error('Rate limit check error:', error);
    // Default to allowing on error to not block legitimate users
    return { blocked: false, remaining: MAX_LOGIN_ATTEMPTS };
  }

  const failedAttempts = attempts?.length || 0;
  const remaining = Math.max(0, MAX_LOGIN_ATTEMPTS - failedAttempts);

  return {
    blocked: failedAttempts >= MAX_LOGIN_ATTEMPTS,
    remaining
  };
}

// Record login attempt
async function recordLoginAttempt(supabaseClient: any, email: string, clientIP: string, success: boolean) {
  try {
    await supabaseClient.from('admin_login_attempts').insert({
      email: email.toLowerCase().trim(),
      ip_address: clientIP,
      success,
      created_at: new Date().toISOString()
    });
  } catch (e) {
    console.error('Failed to record login attempt:', e);
  }
}

// Log admin action for audit trail
async function logAdminAction(supabaseClient: any, action: string, details: any) {
  try {
    await supabaseClient.from('admin_audit_log').insert({
      action,
      details: JSON.stringify(details),
      created_at: new Date().toISOString()
    });
  } catch (e) {
    console.error('Failed to log admin action:', e);
  }
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const requestData = await req.json();
    const { action, email, password, name, session_token } = requestData;

    // Get client IP for rate limiting and logging
    const clientIP = req.headers.get('cf-connecting-ip') ||
      req.headers.get('x-forwarded-for') ||
      'unknown';

    console.log(`Admin auth action: ${action}`);

    // Validate input for login and register
    if (action === 'login' || action === 'register') {
      validateInput({ email, password });
    }

    if (action === 'login') {
      // Check rate limiting
      const rateLimit = await checkRateLimit(supabaseClient, email, clientIP);

      if (rateLimit.blocked) {
        console.log('Login blocked due to rate limiting:', email);
        await logAdminAction(supabaseClient, 'login_blocked', { email, ip: clientIP, reason: 'rate_limit' });
        return new Response(
          JSON.stringify({
            error: 'Too many failed attempts. Please try again in 30 minutes.',
            blocked: true,
            remaining: 0
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Login admin user
      const { data: admin, error } = await supabaseClient
        .from('admin_users')
        .select('*')
        .eq('email', email.toLowerCase().trim())
        .single();

      if (error || !admin) {
        console.log('Admin not found or error:', error);
        await recordLoginAttempt(supabaseClient, email, clientIP, false);
        await logAdminAction(supabaseClient, 'login_failed', { email, ip: clientIP, reason: 'not_found' });
        return new Response(
          JSON.stringify({
            error: 'Invalid credentials',
            remaining: rateLimit.remaining - 1
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const isValidPassword = await verifyPassword(password, admin.password_hash);

      if (!isValidPassword) {
        console.log('Invalid password for admin:', email);
        await recordLoginAttempt(supabaseClient, email, clientIP, false);
        await logAdminAction(supabaseClient, 'login_failed', { email, ip: clientIP, reason: 'invalid_password' });
        return new Response(
          JSON.stringify({
            error: 'Invalid credentials',
            remaining: rateLimit.remaining - 1
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Success - record attempt and generate session
      await recordLoginAttempt(supabaseClient, email, clientIP, true);

      // Generate secure session token
      const sessionToken = generateSecureToken();
      const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 hours

      const userAgent = req.headers.get('user-agent') || 'unknown';

      // Store session in database with expiration
      const { error: sessionError } = await supabaseClient
        .from('admin_sessions')
        .insert({
          admin_id: admin.id,
          session_token: sessionToken,
          expires_at: expiresAt.toISOString(),
          ip_address: clientIP,
          user_agent: userAgent.substring(0, 255),
        });

      if (sessionError) {
        console.error('Session creation error:', sessionError);
        return new Response(
          JSON.stringify({ error: 'Session creation failed' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await logAdminAction(supabaseClient, 'login_success', { email, ip: clientIP, admin_id: admin.id });

      console.log('Admin login successful:', email);
      return new Response(
        JSON.stringify({
          success: true,
          admin: { id: admin.id, email: admin.email, name: admin.name },
          token: sessionToken,
          expires_at: expiresAt.toISOString(),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'register') {
      if (!name || name.length > 100) {
        return new Response(
          JSON.stringify({ error: 'Valid name is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if admin already exists
      const { data: existingAdmin } = await supabaseClient
        .from('admin_users')
        .select('id')
        .eq('email', email.toLowerCase().trim())
        .single();

      if (existingAdmin) {
        return new Response(
          JSON.stringify({ error: 'Admin already exists' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Register new admin user
      const passwordHash = await hashPassword(password);

      const { data, error } = await supabaseClient
        .from('admin_users')
        .insert([
          { email: email.toLowerCase().trim(), password_hash: passwordHash, name: name.trim() }
        ])
        .select()
        .single();

      if (error) {
        console.error('Admin creation error:', error);
        return new Response(
          JSON.stringify({ error: 'Registration failed' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await logAdminAction(supabaseClient, 'admin_registered', { email, name, admin_id: data.id });

      console.log('Admin registered successfully:', email);
      return new Response(
        JSON.stringify({
          success: true,
          admin: { id: data.id, email: data.email, name: data.name }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'logout') {
      if (!session_token) {
        return new Response(
          JSON.stringify({ error: 'Session token required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Delete session from database
      await supabaseClient
        .from('admin_sessions')
        .delete()
        .eq('session_token', session_token);

      await logAdminAction(supabaseClient, 'logout', { ip: clientIP });

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'validate') {
      if (!session_token) {
        return new Response(
          JSON.stringify({ error: 'Session token required', valid: false }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Use the validation function
      const { data: adminData, error: validationError } = await supabaseClient
        .rpc('validate_admin_session', { session_token });

      if (validationError || !adminData || adminData.length === 0) {
        return new Response(
          JSON.stringify({ valid: false }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const admin = adminData[0];
      return new Response(
        JSON.stringify({
          valid: true,
          admin: {
            id: admin.admin_id,
            email: admin.email,
            name: admin.name,
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Error in admin-auth function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...getCorsHeaders(null), 'Content-Type': 'application/json' } }
    );
  }
});