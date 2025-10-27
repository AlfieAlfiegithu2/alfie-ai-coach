import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';
import i18n from '@/lib/i18n';
import { normalizeLanguageCode } from '@/lib/languageUtils';

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
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  refreshProfile: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    let isMounted = true;

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        setSession(session);
        setUser(session?.user ?? null);

        // Fetch profile when user signs in
        if (session?.user) {
          try {
            await fetchProfile(session.user.id);
          } catch (error) {
            console.error('Error fetching profile:', error);
          }
        } else {
          setProfile(null);
        }

        setLoading(false);
      }
    );

    // Check session quickly
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        fetchProfile(session.user.id).catch(error => {
          console.error('Error fetching profile:', error);
        });
      }

      setLoading(false);
    }).catch(error => {
      console.error('Error getting session:', error);
      if (isMounted) {
        setLoading(false);
      }
    });

    // Very aggressive timeout - just move on
    const timeout = setTimeout(() => {
      if (isMounted) {
        setLoading(false);
      }
    }, 2000); // Just 2 seconds, then show app

    return () => {
      isMounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle(); // Use maybeSingle instead of single to avoid errors when no profile exists

      if (error) {
        console.error('Error fetching profile:', error);
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
    } catch (error) {
      console.error('Error fetching profile:', error);
      // Ensure profile is cleared on error
      setProfile(null);
    }
  };

  const refreshProfile = async () => {
    if (user?.id) {
      await fetchProfile(user.id);
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

      if (import.meta.env.DEV) {
        console.log('✅ Sign in successful, waiting for auth state change');
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
      const redirectUrl = `${siteUrl}/`;
      
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
      const redirectTo = (import.meta as any)?.env?.VITE_PUBLIC_SITE_URL || `${window.location.origin}`; // prefer configured site URL
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
      return { error: error.message };
      }

      return {};
    } catch (error: any) {
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

      const siteUrl = (import.meta as any)?.env?.VITE_PUBLIC_SITE_URL || window.location.origin;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${siteUrl}/reset-password`
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
    refreshProfile
  };
}