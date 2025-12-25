import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Admin {
  id: string;
  email: string;
  name: string;
}

interface LoginResult {
  success?: boolean;
  error?: string;
  blocked?: boolean;
  remaining?: number;
}

interface UseAdminAuthReturn {
  admin: Admin | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  validateSession: () => Promise<boolean>;
}

const ADMIN_SESSION_KEY = 'admin_session_token';
const ADMIN_DATA_KEY = 'admin_data';

export function useAdminAuth(): UseAdminAuthReturn {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);

  // Validate session on mount
  const validateSession = useCallback(async (): Promise<boolean> => {
    const token = localStorage.getItem(ADMIN_SESSION_KEY);
    const storedAdmin = localStorage.getItem(ADMIN_DATA_KEY);

    if (!token) {
      console.log('❌ No admin session token found');
      setAdmin(null);
      setLoading(false);
      return false;
    }

    try {
      console.log('🔍 Validating admin session...');

      const { data, error } = await supabase.functions.invoke('admin-auth', {
        body: { action: 'validate', session_token: token }
      });

      if (error || !data?.valid) {
        console.log('❌ Session validation failed:', error || 'Invalid session');
        localStorage.removeItem(ADMIN_SESSION_KEY);
        localStorage.removeItem(ADMIN_DATA_KEY);
        setAdmin(null);
        setLoading(false);
        return false;
      }

      console.log('✅ Admin session valid');
      const adminData = data.admin || (storedAdmin ? JSON.parse(storedAdmin) : null);
      setAdmin(adminData);
      setLoading(false);
      return true;
    } catch (error) {
      console.error('❌ Session validation error:', error);
      localStorage.removeItem(ADMIN_SESSION_KEY);
      localStorage.removeItem(ADMIN_DATA_KEY);
      setAdmin(null);
      setLoading(false);
      return false;
    }
  }, []);

  useEffect(() => {
    validateSession();
  }, [validateSession]);

  const login = async (email: string, password: string): Promise<LoginResult> => {
    console.log('🔐 Attempting admin login...');

    try {
      const { data, error } = await supabase.functions.invoke('admin-auth', {
        body: { action: 'login', email, password }
      });

      if (error) {
        console.log('❌ Login request failed:', error);
        return { error: error.message || 'Login failed' };
      }

      if (data?.error) {
        console.log('❌ Login error:', data.error);
        return {
          error: data.error,
          blocked: data.blocked,
          remaining: data.remaining
        };
      }

      if (data?.success && data?.token) {
        console.log('✅ Login successful');

        // Store session token and admin data
        localStorage.setItem(ADMIN_SESSION_KEY, data.token);
        localStorage.setItem(ADMIN_DATA_KEY, JSON.stringify(data.admin));

        setAdmin(data.admin);
        return { success: true };
      }

      return { error: 'Invalid response from server' };
    } catch (error) {
      console.error('❌ Login error:', error);
      return { error: 'Failed to connect to server' };
    }
  };

  const logout = async (): Promise<void> => {
    console.log('🚪 Logging out admin...');

    const token = localStorage.getItem(ADMIN_SESSION_KEY);

    if (token) {
      try {
        await supabase.functions.invoke('admin-auth', {
          body: { action: 'logout', session_token: token }
        });
      } catch (error) {
        console.error('Logout request error:', error);
      }
    }

    localStorage.removeItem(ADMIN_SESSION_KEY);
    localStorage.removeItem(ADMIN_DATA_KEY);
    setAdmin(null);
  };

  return {
    admin,
    loading,
    login,
    logout,
    validateSession
  };
}

// Helper to get session token for API calls
export function getAdminSessionToken(): string | null {
  return localStorage.getItem(ADMIN_SESSION_KEY);
}