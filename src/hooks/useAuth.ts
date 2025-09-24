import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';

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
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
        
        // Fetch profile when user signs in
        if (session?.user) {
          setTimeout(async () => {
            await fetchProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
        return;
      }

      setProfile(data);
      return data;
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const refreshProfile = async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        return { error: error.message };
      }

      toast({
        title: "Welcome back!",
        description: "You have successfully signed in."
      });

      return {};
    } catch (error: any) {
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
        return;
      }

      toast({
        title: "Signed out",
        description: "You have been signed out successfully."
      });

      // Redirect to home page after successful sign out
      window.location.href = '/';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      // First check if the email exists to avoid confusing success messages
      const { data: userByEmail, error: lookupError } = await supabase
        .from('profiles')
        .select('id')
        .ilike('id', '%')
        .eq('email', email)
        .maybeSingle();

      if (lookupError || !userByEmail) {
        return { error: 'No account found for this email.' };
      }

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