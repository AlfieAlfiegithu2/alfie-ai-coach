import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Admin {
  id: string;
  email: string;
  name: string;
  token?: string;
}

interface UseAdminAuthReturn {
  admin: Admin | null;
  loading: boolean;
  adminCheckComplete: boolean;
  login: (email: string, password: string) => Promise<{ success?: boolean; error?: string }>;
  register: (email: string, password: string, name: string) => Promise<{ success?: boolean; error?: string }>;
  logout: () => Promise<void>;
  validateSession: () => Promise<boolean>;
}

const ADMIN_TOKEN_KEY = 'admin_session_token';
const ADMIN_DATA_KEY = 'admin_data';
const ADMIN_EXPIRES_KEY = 'admin_expires';

export function useAdminAuth(): UseAdminAuthReturn {
  const { user, profile, signIn, signOut } = useAuth();
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminCheckComplete, setAdminCheckComplete] = useState(false);

  const clearSession = () => {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_DATA_KEY);
    localStorage.removeItem(ADMIN_EXPIRES_KEY);
    setAdmin(null);
  };

  const validateSession = async (): Promise<boolean> => {
    return user && profile?.role === 'admin' ? true : false;
  };

  useEffect(() => {
    const checkAdminStatus = () => {
      console.log('🔍 Admin check - User:', user?.email, 'Profile role:', profile?.role);
      
      if (user && profile) {
        // Check if user has admin role
        if (profile.role === 'admin') {
          console.log('✅ Admin status confirmed for:', user.email);
          setAdmin({
            id: user.id,
            email: user.email || '',
            name: profile.full_name || user.email || ''
          });
        } else {
          console.log('❌ User is not admin. Role:', profile.role);
          setAdmin(null);
        }
        setAdminCheckComplete(true);
      } else if (user && !profile) {
        console.log('⏳ User exists but profile still loading...');
        // Profile is still loading, don't set admin check as complete yet
        setAdminCheckComplete(false);
      } else {
        console.log('🚫 No user or profile found');
        setAdmin(null);
        setAdminCheckComplete(true);
      }
      
      // Only set loading to false when we have both user and profile, or confirmed no user
      if ((user && profile) || !user) {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, [user, profile]);

  const login = async (email: string, password: string): Promise<{ success?: boolean; error?: string }> => {
    try {
      setLoading(true);
      
      // Use regular Supabase authentication
      const result = await signIn(email, password);
      
      if (result.error) {
        return { error: result.error };
      }

      // Wait a moment for profile to load
      setTimeout(() => {
        setLoading(false);
      }, 1000);

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { error: 'An error occurred during login' };
    }
  };

  const register = async (email: string, password: string, name: string): Promise<{ success?: boolean; error?: string }> => {
    try {
      setLoading(true);
      
      // Input validation
      if (!email?.trim() || !password?.trim() || !name?.trim()) {
        return { error: 'All fields are required' };
      }

      if (password.length < 8) {
        return { error: 'Password must be at least 8 characters' };
      }

      // Use regular Supabase auth for registration
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: name.trim()
          }
        }
      });

      if (error) {
        return { error: error.message };
      }

      if (data.user) {
        // Update the user's profile to set admin role
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ role: 'admin', full_name: name.trim() })
          .eq('id', data.user.id);

        if (profileError) {
          console.error('Error updating profile:', profileError);
        }

        return { success: true };
      }

      return { error: 'Registration failed' };
    } catch (error) {
      console.error('Registration error:', error);
      return { error: 'An error occurred during registration' };
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    clearSession();
    await signOut();
  };

  return {
    admin,
    loading,
    adminCheckComplete,
    login,
    register,
    logout,
    validateSession
  };
}