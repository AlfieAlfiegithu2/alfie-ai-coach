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
  logout: () => void;
}

const ADMIN_TOKEN_KEY = 'admin_session_token';
const ADMIN_DATA_KEY = 'admin_data';
const ADMIN_EXPIRES_KEY = 'admin_expires';

export function useAdminAuth(): UseAdminAuthReturn {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing admin session on mount
    const checkExistingSession = () => {
      const token = localStorage.getItem(ADMIN_TOKEN_KEY);
      const adminData = localStorage.getItem(ADMIN_DATA_KEY);
      const expiresAt = localStorage.getItem(ADMIN_EXPIRES_KEY);

      if (token && adminData && expiresAt) {
        const expiration = new Date(expiresAt);
        if (expiration > new Date()) {
          try {
            const parsedAdmin = JSON.parse(adminData);
            setAdmin({ ...parsedAdmin, token });
          } catch (error) {
            console.error('Error parsing admin data:', error);
            logout();
          }
        } else {
          // Session expired
          logout();
        }
      }
      setLoading(false);
    };

    checkExistingSession();
  }, []);

  const login = async (email: string, password: string): Promise<{ success?: boolean; error?: string }> => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('admin-auth', {
        body: { action: 'login', email, password }
      });

      if (error) {
        return { error: error.message };
      }

      if (data.error) {
        return { error: data.error };
      }

      if (data.success && data.admin && data.token) {
        // Store admin data and token with 24-hour expiration
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        
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
      
      const { data, error } = await supabase.functions.invoke('admin-auth', {
        body: { action: 'register', email, password, name }
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

  const logout = () => {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_DATA_KEY);
    localStorage.removeItem(ADMIN_EXPIRES_KEY);
    setAdmin(null);
  };

  return {
    admin,
    loading,
    login,
    register,
    logout
  };
}