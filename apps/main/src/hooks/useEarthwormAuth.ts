/**
 * Hook for managing Sentence Mastery authentication
 * Generates and manages tokens for seamless cross-app access
 */

import { useAuth } from './useAuth';
import { useCallback } from 'react';
import { generateSentenceMasteryToken, storeAuthContext, createSentenceMasterySession } from 'shared-auth';

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
      // Generate token from current session
      const { supabase } = await import('@/integrations/supabase/client');
      const authToken = await generateSentenceMasteryToken(supabase);
      
      if (authToken) {
        // Create session context
        const context = createSentenceMasterySession(authToken);
        
        // Store in sessionStorage for cross-app access
        storeAuthContext(context);
        
        // Redirect to Sentence Mastery
        window.location.href = '/sentence-mastery';
      } else {
        console.error('Failed to generate Sentence Mastery token');
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
