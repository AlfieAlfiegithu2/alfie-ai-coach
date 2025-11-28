import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';
import i18n from '@/lib/i18n';
import { normalizeLanguageCode } from '@/lib/languageUtils';
import config from '@/config/runtime';

interface Profile {
  id: string;
  full_name: string;
  role: string;
  subscription_status: string;
  native_language: string;
  avatar_url?: string;
  created_at?: string;
}

interface UseAuthReturn {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error?: string }>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  signOut: () => Promise<{ success?: boolean; error?: any }>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  refreshProfile: () => Promise<void>;
  updateProfileAvatar: (avatarUrl: string) => void;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    let isMounted = true;
    let retryTimeoutId: ReturnType<typeof setTimeout> | null = null;
    let authStateReceived = false;
    let sessionAttempts = 0;
    const MAX_SESSION_ATTEMPTS = 3;

    // Single auth state listener - this is the single source of truth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        authStateReceived = true;
        
        // Clear any pending retry timeout
        if (retryTimeoutId) {
          clearTimeout(retryTimeoutId);
          retryTimeoutId = null;
        }

        console.log('🔄 Auth state change:', event, session?.user?.email || 'no user');

        setSession(session);
        setUser(session?.user ?? null);

        // Set loading to false immediately - don't wait for profile fetch
        setLoading(false);

        // Fetch profile asynchronously (don't block auth completion)
        if (session?.user) {
          fetchProfile(session.user.id).catch(error => {
            console.error('Error fetching profile:', error);
          });
        } else {
          setProfile(null);
        }
      }
    );

    // Initial session check with automatic retry on failure/timeout
    const getSessionWithRetry = async (retryCount = 0): Promise<void> => {
      const maxRetries = 3;
      const retryDelay = Math.min(Math.pow(2, retryCount) * 1000, 4000); // 1s, 2s, 4s

      try {
        // Create a timeout promise that will reject after 5 seconds
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Session fetch timeout')), 5000);
        });

        // Race between the actual session fetch and the timeout
        const { data: { session }, error } = await Promise.race([
          supabase.auth.getSession(),
          timeoutPromise
        ]) as Awaited<ReturnType<typeof supabase.auth.getSession>>;

        if (!isMounted) return;

        if (error) {
          throw error;
        }

        // Success! Set the state
        if (!authStateReceived) {
          console.log('✅ Session retrieved successfully');
          authStateReceived = true;
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
          
          if (session?.user) {
            fetchProfile(session.user.id).catch(error => {
              console.error('Error fetching profile:', error);
            });
          }
        }
      } catch (error: any) {
        if (!isMounted) return;

        sessionAttempts++;
        const isRetryable = sessionAttempts < MAX_SESSION_ATTEMPTS;
        
        if (import.meta.env.DEV) {
          console.warn(`Auth session attempt ${sessionAttempts}/${MAX_SESSION_ATTEMPTS} failed:`, error.message || error);
        }

        if (isRetryable && !authStateReceived) {
          // Schedule a retry
          console.log(`🔄 Retrying auth session in ${retryDelay}ms...`);
          retryTimeoutId = setTimeout(() => {
            if (isMounted && !authStateReceived) {
              getSessionWithRetry(retryCount + 1);
            }
          }, retryDelay);
        } else if (!authStateReceived) {
          // All retries exhausted, but we should still allow the app to function
          // User will be treated as logged out, they can try refreshing
          console.warn('⚠️ Auth session fetch failed after retries, proceeding without session');
          setSession(null);
          setUser(null);
          setLoading(false);
        }
      }
    };

    // Start the session check immediately
    getSessionWithRetry();

    return () => {
      isMounted = false;
      if (retryTimeoutId) {
        clearTimeout(retryTimeoutId);
      }
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string, retryCount = 0) => {
    const maxRetries = 2; // Reduced from 3 to 2 to prevent too many retries
    const retryDelay = Math.min(Math.pow(2, retryCount) * 1000, 3000); // Cap at 3s: 1s, 2s, 3s

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle(); // Use maybeSingle instead of single to avoid errors when no profile exists

      if (error) {
        // Check if it's a network error that we should retry
        const isNetworkError = error.message?.includes('Failed to fetch') ||
          error.message?.includes('ERR_CONNECTION_CLOSED') ||
          error.message?.includes('NetworkError');

        if (isNetworkError && retryCount < maxRetries) {
          // Only log in dev mode to reduce console noise
          if (import.meta.env.DEV) {
            console.warn(`Network error fetching profile (attempt ${retryCount + 1}/${maxRetries + 1}), retrying in ${retryDelay}ms...`);
          }
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          return fetchProfile(userId, retryCount + 1);
        }

        // Suppress non-critical errors in production
        if (import.meta.env.DEV) {
          console.warn('Profile fetch error (non-retryable):', error.message);
        }
        // Don't return early on profile fetch errors - still allow auth to complete
      }

      if (data) {
        const profileData: Profile = {
          id: data.id,
          full_name: data.full_name || '',
          role: (data as any).role || 'user',
          subscription_status: data.subscription_status || 'free',
          native_language: data.native_language || 'en',
          avatar_url: data.avatar_url,
          created_at: data.created_at,
        };
        setProfile(profileData);

        try {
          const alreadyChosen = localStorage.getItem('ui_language');
          if (!alreadyChosen && data?.native_language) {
            const code = normalizeLanguageCode(data.native_language);
            if (code) {
              await i18n.changeLanguage(code);
              localStorage.setItem('ui_language', code);
            }
          }
        } catch (e) {
          console.warn('Language sync skipped:', e);
        }
      } else {
        console.log('No profile found for user:', userId);
        setProfile(null);
      }

      return data;
    } catch (error: any) {
      // Check if it's a network error that we should retry
      const isNetworkError = error.message?.includes('Failed to fetch') ||
        error.message?.includes('ERR_CONNECTION_CLOSED') ||
        error.message?.includes('NetworkError');

      if (isNetworkError && retryCount < maxRetries) {
        // Only log in dev mode
        if (import.meta.env.DEV) {
          console.warn(`Network error fetching profile (attempt ${retryCount + 1}/${maxRetries + 1}), retrying in ${retryDelay}ms...`);
        }
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return fetchProfile(userId, retryCount + 1);
      }

      // Suppress errors in production, only log in dev
      if (import.meta.env.DEV) {
        console.warn('Profile fetch failed after retries:', error.message || error);
      }
      // Don't clear profile on error - keep existing profile data if available
      // setProfile(null); // Removed to prevent clearing profile on transient errors
    }
  };

  const refreshProfile = async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  };

  // Optimistically update profile avatar URL for instant UI feedback
  const updateProfileAvatar = (avatarUrl: string) => {
    if (user?.id) {
      // Update profile state immediately, even if profile is null (create minimal profile)
      if (profile) {
        setProfile({
          ...profile,
          avatar_url: avatarUrl
        });
      } else {
        // If profile doesn't exist yet, create a minimal one with just the avatar
        setProfile({
          id: user.id,
          full_name: user.email?.split('@')[0] || '',
          role: 'user',
          subscription_status: 'free',
          native_language: 'en',
          avatar_url: avatarUrl
        });
      }
    }
  };

  const signIn = async (email: string, password: string) => {
    if (import.meta.env.DEV) {
      console.log('🔐 Attempting sign in for:', email);
    }
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('❌ Sign in error:', error);
        return { error: error.message };
      }

      // Immediately update state with the session from sign-in response
      if (data.session) {
        console.log('✅ Sign in successful, session received:', data.session.user.email);
        setSession(data.session);
        setUser(data.session.user);

        // Fetch profile
        try {
          await fetchProfile(data.session.user.id);
        } catch (error) {
          console.error('Error fetching profile:', error);
        }

        setLoading(false);
      }

      if (import.meta.env.DEV) {
        console.log('✅ Sign in successful, session persisted');
      }
      toast({
        title: "Welcome back!",
        description: "You have successfully signed in."
      });

      return {};
    } catch (error: any) {
      console.error('❌ Sign in exception:', error);
      return { error: error.message || 'An error occurred during sign in' };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const siteUrl = (import.meta as any)?.env?.VITE_PUBLIC_SITE_URL || window.location.origin;
      const redirectUrl = `${siteUrl}/auth/callback`;

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName
          }
        }
      });

      if (error) {
        return { error: error.message };
      }

      toast({
        title: "Account created!",
        description: "Please check your email to verify your account."
      });

      return {};
    } catch (error: any) {
      return { error: error.message || 'An error occurred during sign up' };
    }
  };

  const signInWithGoogle = async () => {
    try {
      const siteUrl = (import.meta as any)?.env?.VITE_PUBLIC_SITE_URL || window.location.origin;
      const redirectTo = `${siteUrl}/auth/callback`;

      console.log('🔐 Initiating Google OAuth sign-in, redirectTo:', redirectTo);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            prompt: 'select_account',
            access_type: 'online'
          }
        }
      });

      if (error) {
        console.error('❌ Google OAuth error:', error);
        return { error: error.message };
      }

      // OAuth will redirect the user, so we don't need to do anything here
      // The callback route will handle the rest
      console.log('✅ Google OAuth redirect initiated');
      return {};
    } catch (error: any) {
      console.error('❌ Google OAuth exception:', error);
      return { error: error.message || 'An error occurred during Google sign in' };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('Error signing out:', error);
        throw error;
      }

      toast({
        title: "Signed out",
        description: "You have been signed out successfully."
      });

      // Clear local storage and session data
      localStorage.clear();
      sessionStorage.clear();

      // Return success to let calling component handle navigation
      return { success: true };
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      // Check if user exists by looking up auth users via edge function
      // Since profiles table doesn't have email, we'll send reset anyway
      const { data: userByEmail } = await supabase.auth.getUser();

      // Continue with password reset - Supabase will handle email validation

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${config.siteUrl}/reset-password`
      });

      if (error) {
        return { error: error.message };
      }

      toast({
        title: "If the account exists, check your email",
        description: "We've sent password reset instructions to the address provided if it's associated with an account."
      });

      return {};
    } catch (error: any) {
      return { error: error.message || 'An error occurred during password reset' };
    }
  };

  return {
    user,
    session,
    profile,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    resetPassword,
    refreshProfile,
    updateProfileAvatar
  };
}