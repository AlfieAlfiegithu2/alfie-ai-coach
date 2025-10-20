/**
 * Hook for managing Earthworm authentication
 * Generates and manages tokens for seamless cross-app access
 */

import { useAuth } from './useAuth';
import { useCallback } from 'react';
import { generateEarthwormToken, storeAuthContext, createEarthwormSession } from 'shared-auth';

export const useEarthwormAuth = () => {
  const { user } = useAuth();
  
  /**
   * Navigate to Earthworm with auth token
   */
  const navigateToEarthworm = useCallback(async () => {
    if (!user) {
      // If not logged in, just redirect to Earthworm
      // Earthworm will show login screen
      window.location.href = '/earthworm';
      return;
    }

    try {
      // Generate token from current session
      const { supabase } = await import('@/integrations/supabase/client');
      const authToken = await generateEarthwormToken(supabase);
      
      if (authToken) {
        // Create session context
        const context = createEarthwormSession(authToken);
        
        // Store in sessionStorage for cross-app access
        storeAuthContext(context);
        
        // Redirect to Earthworm
        window.location.href = '/earthworm';
      } else {
        console.error('Failed to generate Earthworm token');
        window.location.href = '/earthworm';
      }
    } catch (error) {
      console.error('Error navigating to Earthworm:', error);
      // Fallback: redirect anyway, let Earthworm handle auth
      window.location.href = '/earthworm';
    }
  }, [user]);

  /**
   * Check if user has valid Earthworm session
   */
  const hasEarthwormSession = useCallback(() => {
    if (typeof window === 'undefined') return false;
    const stored = sessionStorage.getItem('earthworm_auth');
    if (!stored) return false;
    
    try {
      const context = JSON.parse(stored);
      return !!context?.token && !!context?.userId;
    } catch {
      return false;
    }
  }, []);

  /**
   * Clear Earthworm session
   */
  const clearEarthwormSession = useCallback(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('earthworm_auth');
    }
  }, []);

  return {
    navigateToEarthworm,
    hasEarthwormSession: hasEarthwormSession(),
    clearEarthwormSession,
    user,
  };
};
