import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Admin {
  id: string;
  email: string;
  name: string;
  token?: string;
}

interface UseAdminAuthReturn {
  admin: Admin | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success?: boolean; error?: string }>;
  register: (email: string, password: string, name: string) => Promise<{ success?: boolean; error?: string }>;
  logout: () => Promise<void>;
  validateSession: () => Promise<boolean>;
}

const ADMIN_TOKEN_KEY = 'admin_session_token';
const ADMIN_DATA_KEY = 'admin_data';
const ADMIN_EXPIRES_KEY = 'admin_expires';

export function useAdminAuth(): UseAdminAuthReturn {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);

  const clearSession = () => {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_DATA_KEY);
    localStorage.removeItem(ADMIN_EXPIRES_KEY);
    setAdmin(null);
  };

  const validateSession = async (): Promise<boolean> => {
    const token = localStorage.getItem(ADMIN_TOKEN_KEY);
    if (!token) {
      clearSession();
      return false;
    }

    try {
      const { data, error } = await supabase.functions.invoke('admin-auth', {
        body: { action: 'validate', session_token: token }
      });

      if (error || !data?.valid) {
        clearSession();
        return false;
      }

      // Update admin data if validation successful
      if (data.admin) {
        localStorage.setItem(ADMIN_DATA_KEY, JSON.stringify(data.admin));
        setAdmin({ ...data.admin, token });
      }

      return true;
    } catch (error) {
      console.error('Session validation error:', error);
      clearSession();
      return false;
    }
  };

  useEffect(() => {
    const checkExistingSession = async () => {
      const token = localStorage.getItem(ADMIN_TOKEN_KEY);
      const adminData = localStorage.getItem(ADMIN_DATA_KEY);
      const expiresAt = localStorage.getItem(ADMIN_EXPIRES_KEY);

      if (token && adminData && expiresAt) {
        const expiration = new Date(expiresAt);
        if (expiration > new Date()) {
          try {
            const parsedAdmin = JSON.parse(adminData);
            // Validate session with server
            const isValid = await validateSession();
            if (isValid) {
              setAdmin({ ...parsedAdmin, token });
            }
          } catch (error) {
            console.error('Error parsing admin data:', error);
            clearSession();
          }
        } else {
          // Session expired
          clearSession();
        }
      }
      setLoading(false);
    };

    checkExistingSession();
  }, []);

  const login = async (email: string, password: string): Promise<{ success?: boolean; error?: string }> => {
    try {
      setLoading(true);
      
      // Input validation
      if (!email?.trim() || !password?.trim()) {
        return { error: 'Email and password are required' };
      }

      const { data, error } = await supabase.functions.invoke('admin-auth', {
        body: { action: 'login', email: email.trim(), password }
      });

      if (error) {
        return { error: error.message };
      }

      if (data.error) {
        return { error: data.error };
      }

      if (data.success && data.admin && data.token) {
        // Use server-provided expiration time for better security
        const expiresAt = data.expires_at || new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
        
        localStorage.setItem(ADMIN_TOKEN_KEY, data.token);
        localStorage.setItem(ADMIN_DATA_KEY, JSON.stringify(data.admin));
        localStorage.setItem(ADMIN_EXPIRES_KEY, expiresAt);
        
        setAdmin({ ...data.admin, token: data.token });
        return { success: true };
      }

      return { error: 'Login failed' };
    } catch (error) {
      console.error('Login error:', error);
      return { error: 'An error occurred during login' };
    } finally {
      setLoading(false);
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

      const { data, error } = await supabase.functions.invoke('admin-auth', {
        body: { action: 'register', email: email.trim(), password, name: name.trim() }
      });

      if (error) {
        return { error: error.message };
      }

      if (data.error) {
        return { error: data.error };
      }

      if (data.success) {
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
    const token = localStorage.getItem(ADMIN_TOKEN_KEY);
    
    // Clear local session first
    clearSession();
    
    // Then invalidate server session
    if (token) {
      try {
        await supabase.functions.invoke('admin-auth', {
          body: { action: 'logout', session_token: token }
        });
      } catch (error) {
        console.error('Logout error:', error);
        // Don't throw error since local session is already cleared
      }
    }
  };

  return {
    admin,
    loading,
    login,
    register,
    logout,
    validateSession
  };
}