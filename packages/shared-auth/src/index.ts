/**
 * Shared Authentication Package
 * 
 * Exports all authentication bridge functions and types
 * for use in both Main App and Earthworm systems.
 */

export {
  generateEarthwormToken,
  validateSupabaseToken,
  createEarthwormSession,
  storeAuthContext,
  retrieveAuthContext,
  clearAuthContext,
  type AuthToken,
  type EarthwormAuthContext,
} from './supabase-logto-bridge.js';

export {
  validateAuthToken,
  extractAuthToken,
  type AuthRequest,
  type AuthenticatedRequest,
} from './auth-middleware.js';

