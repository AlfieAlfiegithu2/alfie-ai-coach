import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Admin {
  id: string;
  email: string;
  name: string;
}

interface UseAdminAuthReturn {
  admin: Admin | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success?: boolean; error?: string }>;
  register: (email: string, password: string, name: string) => Promise<{ success?: boolean; error?: string }>;
  logout: () => void;
}

export function useAdminAuth(): UseAdminAuthReturn {
  // Temporarily bypassing authentication - admin access is open
  const [admin, setAdmin] = useState<Admin | null>({ id: 'temp', email: 'admin@temp.com', name: 'Admin' });
  const [loading, setLoading] = useState(false);

  const login = async (email: string, password: string) => {
    // Temporarily bypassing authentication
    setAdmin({ id: 'temp', email: email, name: 'Admin' });
    return { success: true };
  };

  const register = async (email: string, password: string, name: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-auth', {
        body: { action: 'register', email, password, name }
      });

      if (error) throw error;

      if (data.success) {
        return { success: true };
      } else {
        return { error: data.error || 'Registration failed' };
      }
    } catch (error: any) {
      return { error: error.message || 'Registration failed' };
    }
  };

  const logout = () => {
    setAdmin(null);
    localStorage.removeItem('admin_user');
    localStorage.removeItem('admin_token');
  };

  return { admin, loading, login, register, logout };
}