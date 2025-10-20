/**
 * Supabase-Logto Authentication Bridge
 * 
 * This module provides a bridge between Supabase authentication (main app)
 * and Logto authentication (Earthworm app), allowing users to authenticate
 * once and access both systems seamlessly.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface AuthToken {
  supabaseToken: string;
  userId: string;
  email: string;
  expiresAt: number;
}

export interface EarthwormAuthContext {
  userId: string;
  email: string;
  token: string;
}

/**
 * Generate an Earthworm-compatible auth token from Supabase session
 */
export async function generateEarthwormToken(
  supabaseClient: SupabaseClient
): Promise<AuthToken | null> {
  const { data: { session } } = await supabaseClient.auth.getSession();
  
  if (!session) {
    return null;
  }

  return {
    supabaseToken: session.access_token,
    userId: session.user.id,
    email: session.user.email || '',
    expiresAt: Date.now() + 3600000, // 1 hour from now
  };
}

/**
 * Validate a Supabase token and extract user information
 */
export async function validateSupabaseToken(
  token: string,
  supabaseUrl: string,
  supabaseKey: string
): Promise<{ userId: string; email: string } | null> {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return null;
    }

    return {
      userId: user.id,
      email: user.email || '',
    };
  } catch (error) {
    console.error('Token validation error:', error);
    return null;
  }
}

/**
 * Create Earthworm session from Supabase user
 */
export function createEarthwormSession(authToken: AuthToken): EarthwormAuthContext {
  return {
    userId: authToken.userId,
    email: authToken.email,
    token: authToken.supabaseToken,
  };
}

/**
 * Store auth context in session storage for cross-app access
 */
export function storeAuthContext(context: EarthwormAuthContext): void {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('earthworm_auth', JSON.stringify(context));
  }
}

/**
 * Retrieve auth context from session storage
 */
export function retrieveAuthContext(): EarthwormAuthContext | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const stored = sessionStorage.getItem('earthworm_auth');
  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

/**
 * Clear auth context from session storage
 */
export function clearAuthContext(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('earthworm_auth');
  }
}

