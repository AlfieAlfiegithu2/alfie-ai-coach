import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ThemeName, getTheme, getStoredTheme, saveTheme, Theme } from '@/lib/themes';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface ThemeContextType {
  theme: Theme;
  themeName: ThemeName;
  setTheme: (themeName: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [themeName, setThemeNameState] = useState<ThemeName>(getStoredTheme());
  const [theme, setThemeState] = useState<Theme>(getTheme(themeName));

  // Load theme from user preferences when user logs in
  useEffect(() => {
    if (user) {
      const loadUserTheme = async () => {
        try {
          const { data } = await supabase
            .from('user_preferences')
            .select('dashboard_theme')
            .eq('user_id', user.id)
            .maybeSingle();
          
          if (data?.dashboard_theme) {
            const userTheme = data.dashboard_theme as ThemeName;
            setThemeNameState(userTheme);
            setThemeState(getTheme(userTheme));
            saveTheme(userTheme);
          }
        } catch (error) {
          console.warn('Error loading user theme:', error);
        }
      };
      loadUserTheme();
    }
  }, [user]);

  useEffect(() => {
    setThemeState(getTheme(themeName));
    saveTheme(themeName);
    // Trigger a custom event so components can react to theme changes
    window.dispatchEvent(new CustomEvent('theme-changed', { detail: themeName }));
  }, [themeName]);

  const setTheme = (newTheme: ThemeName) => {
    setThemeNameState(newTheme);
    saveTheme(newTheme);
    // Trigger a custom event so components can react to theme changes
    window.dispatchEvent(new CustomEvent('theme-changed', { detail: newTheme }));
  };

  return (
    <ThemeContext.Provider value={{ theme, themeName, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

