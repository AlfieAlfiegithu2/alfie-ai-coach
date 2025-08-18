import { useState, useEffect } from 'react';

interface Admin {
  id: string;
  email: string;
  name: string;
}

interface UseAdminAuthReturn {
  admin: Admin | null;
  loading: boolean;
  login: (keypass: string) => Promise<{ success?: boolean; error?: string }>;
  logout: () => void;
  validateSession: () => boolean;
}

const ADMIN_KEYPASS = 'myye65402086';
const ADMIN_SESSION_KEY = 'admin_keypass_session';

export function useAdminAuth(): UseAdminAuthReturn {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);

  const validateSession = (): boolean => {
    const session = localStorage.getItem(ADMIN_SESSION_KEY);
    return session === 'true';
  };

  useEffect(() => {
    console.log('🔍 Checking admin keypass session...');
    const session = localStorage.getItem(ADMIN_SESSION_KEY);
    
    if (session === 'true') {
      console.log('✅ Valid keypass session found');
      setAdmin({
        id: 'admin',
        email: 'admin@system.local',
        name: 'Admin'
      });
    } else {
      console.log('❌ No valid keypass session');
      setAdmin(null);
    }
    
    setLoading(false);
  }, []);

  const login = async (keypass: string): Promise<{ success?: boolean; error?: string }> => {
    console.log('🔐 Attempting admin login with keypass...');
    
    if (keypass === ADMIN_KEYPASS) {
      console.log('✅ Keypass correct, granting admin access');
      localStorage.setItem(ADMIN_SESSION_KEY, 'true');
      setAdmin({
        id: 'admin',
        email: 'admin@system.local',
        name: 'Admin'
      });
      return { success: true };
    } else {
      console.log('❌ Invalid keypass provided');
      return { error: 'Invalid keypass' };
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