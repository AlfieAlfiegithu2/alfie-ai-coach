/**
 * Authentication Middleware
 * 
 * Provides middleware functions for validating authentication
 * across both Main App and Earthworm systems.
 */

import { validateSupabaseToken } from './supabase-logto-bridge.js';

export interface AuthRequest {
  headers: {
    authorization?: string;
  };
}

export interface AuthenticatedRequest extends AuthRequest {
  user: {
    userId: string;
    email: string;
  };
}

/**
 * Middleware to validate Supabase JWT token
 */
export async function validateAuthToken(
  request: AuthRequest,
  supabaseUrl: string,
  supabaseKey: string
): Promise<{ userId: string; email: string } | null> {
  const authHeader = request.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  
  return validateSupabaseToken(token, supabaseUrl, supabaseKey);
}

/**
 * Extract auth token from request
 */
export function extractAuthToken(request: AuthRequest): string | null {
  const authHeader = request.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.substring(7);
}

