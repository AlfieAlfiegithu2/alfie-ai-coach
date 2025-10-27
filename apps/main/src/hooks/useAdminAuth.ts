import { useState, useEffect } from 'react';

interface Admin {
  id: string;
  email: string;
  name: string;
}

interface UseAdminAuthReturn {
  admin: Admin | null;
  loading: boolean;
  login: (password: string) => Promise<{ success?: boolean; error?: string }>;
  logout: () => void;
  validateSession: () => boolean;
}

const ADMIN_SESSION_KEY = 'admin_session';
const ADMIN_PASSWORD = 'myye65402086'; // Your password

export function useAdminAuth(): UseAdminAuthReturn {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);

  const validateSession = (): boolean => {
    const session = localStorage.getItem(ADMIN_SESSION_KEY);
    return session === 'true';
  };

  useEffect(() => {
    console.log('🔍 Checking admin session...');
    const session = localStorage.getItem(ADMIN_SESSION_KEY);

    if (session === 'true') {
      console.log('✅ Valid admin session found');
      setAdmin({
        id: 'admin',
        email: 'admin@system.local',
        name: 'Admin'
      });
    } else {
      console.log('❌ No valid admin session - redirecting to login');
      setAdmin(null);
    }

    setLoading(false);
  }, []);

  const login = async (password: string): Promise<{ success?: boolean; error?: string }> => {
    console.log('🔐 Attempting admin login...');

    try {
      // Validate password
      if (password !== ADMIN_PASSWORD) {
        console.log('❌ Invalid password');
        return { error: 'Invalid password' };
      }

      console.log('✅ Password validated');

      // Only set admin session after password is validated
      localStorage.setItem(ADMIN_SESSION_KEY, 'true');
      setAdmin({
        id: 'admin',
        email: 'admin@system.local',
        name: 'Admin'
      });

      return { success: true };
    } catch (error) {
      console.error('❌ Error during admin login:', error);
      return { error: 'Failed to login' };
    }
  };

  const logout = (): void => {
    console.log('🚪 Logging out admin...');
    localStorage.removeItem(ADMIN_SESSION_KEY);
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