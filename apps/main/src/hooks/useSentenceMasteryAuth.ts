/**
 * Hook for managing Sentence Mastery authentication
 * Generates and manages tokens for seamless cross-app access
 */

import { useAuth } from './useAuth';
import { useCallback } from 'react';

export const useSentenceMasteryAuth = () => {
  const { user } = useAuth();
  
  /**
   * Navigate to Sentence Mastery with auth token
   */
  const navigateToSentenceMastery = useCallback(async () => {
    if (!user) {
      // If not logged in, just redirect to Sentence Mastery
      // Sentence Mastery will show login screen
      window.location.href = '/sentence-mastery';
      return;
    }

    try {
      // Get Supabase client
      const { supabase } = await import('@/integrations/supabase/client');
      
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session && session.access_token) {
        // Store token in sessionStorage for cross-app access
        sessionStorage.setItem('sentence_mastery_auth', JSON.stringify({
          userId: user.id,
          email: user.email,
          token: session.access_token,
          expiresAt: Date.now() + 3600000, // 1 hour from now
        }));
        
        // Redirect to Sentence Mastery
        window.location.href = '/sentence-mastery';
      } else {
        console.error('Failed to get authentication session');
        window.location.href = '/sentence-mastery';
      }
    } catch (error) {
      console.error('Error navigating to Sentence Mastery:', error);
      // Fallback: redirect anyway, let Sentence Mastery handle auth
      window.location.href = '/sentence-mastery';
    }
  }, [user]);

  /**
   * Check if user has valid Sentence Mastery session
   */
  const hasSentenceMasterySession = useCallback(() => {
    if (typeof window === 'undefined') return false;
    const stored = sessionStorage.getItem('sentence_mastery_auth');
    if (!stored) return false;
    
    try {
      const context = JSON.parse(stored);
      return !!context?.token && !!context?.userId;
    } catch {
      return false;
    }
  }, []);

  /**
   * Clear Sentence Mastery session
   */
  const clearSentenceMasterySession = useCallback(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('sentence_mastery_auth');
    }
  }, []);

  return {
    navigateToSentenceMastery,
    hasSentenceMasterySession: hasSentenceMasterySession(),
    clearSentenceMasterySession,
    user,
  };
};
