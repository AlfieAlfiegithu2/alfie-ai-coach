import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Secure password hashing using bcrypt
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return await bcrypt.hash(password, salt);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
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

serve(async (req) => {
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

    // Validate input for all actions
    if (action === 'login' || action === 'register') {
      validateInput({ email, password });
    }

    if (action === 'login') {
      // Login admin user
      const { data: admin, error } = await supabaseClient
        .from('admin_users')
        .select('*')
        .eq('email', email.toLowerCase().trim())
        .single();

      if (error || !admin) {
        return new Response(
          JSON.stringify({ error: 'Invalid credentials' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const isValidPassword = await verifyPassword(password, admin.password_hash);
      
      if (!isValidPassword) {
        return new Response(
          JSON.stringify({ error: 'Invalid credentials' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Generate secure session token
      const sessionToken = generateSecureToken();
      const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 hours for better security

      // Get client IP and user agent for session tracking
      const clientIP = req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || 'unknown';
      const userAgent = req.headers.get('user-agent') || 'unknown';
      
      // Store session in database with expiration
      const { error: sessionError } = await supabaseClient
        .from('admin_sessions')
        .insert({
          admin_id: admin.id,
          session_token: sessionToken,
          expires_at: expiresAt.toISOString(),
          ip_address: clientIP,
          user_agent: userAgent.substring(0, 255), // Truncate if too long
        });

      if (sessionError) {
        console.error('Session creation error:', sessionError);
        return new Response(
          JSON.stringify({ error: 'Session creation failed' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
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

      // Use the new validation function
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
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});