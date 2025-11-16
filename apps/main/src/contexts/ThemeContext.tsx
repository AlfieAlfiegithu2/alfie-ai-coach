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
      const loadUserTheme = async (retryCount = 0) => {
        const maxRetries = 1; // Only retry once
        const retryDelay = 2000; // 2 second delay
        
        try {
          // Select all columns to avoid issues if dashboard_theme doesn't exist yet
          const { data, error } = await supabase
            .from('user_preferences')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();
          
          // Silently handle all errors - use stored theme as fallback
          if (error) {
            // Check if it's a network error that we should retry
            const isNetworkError = error.message?.includes('ERR_CONNECTION_CLOSED') ||
                                  error.message?.includes('Failed to fetch') ||
                                  error.message?.includes('NetworkError');
            
            // Check if it's a column error or 400 Bad Request (column doesn't exist)
            const isColumnError = 
              error.code === 'PGRST204' ||
              error.code === '42703' ||
              error.code === '42P01' ||
              error.message?.toLowerCase().includes('column') ||
              error.message?.toLowerCase().includes('does not exist') ||
              error.message?.toLowerCase().includes('bad request');
            
            // Retry network errors once
            if (isNetworkError && retryCount < maxRetries) {
              if (import.meta.env.DEV) {
                console.warn(`Network error loading theme (attempt ${retryCount + 1}/${maxRetries + 1}), retrying in ${retryDelay}ms...`);
              }
              await new Promise(resolve => setTimeout(resolve, retryDelay));
              return loadUserTheme(retryCount + 1);
            }
            
            // Silently ignore column errors - use stored theme
            if (!isColumnError && !isNetworkError && import.meta.env.DEV) {
              console.warn('Error loading user theme:', error);
            }
            return; // Use the stored theme from localStorage
          }
          
          if (data && (data as any).dashboard_theme) {
            const userTheme = (data as any).dashboard_theme as ThemeName;
            setThemeNameState(userTheme);
            setThemeState(getTheme(userTheme));
            saveTheme(userTheme);
          }
        } catch (error: any) {
          // Check if it's a network error
          const isNetworkError = error?.message?.includes('ERR_CONNECTION_CLOSED') ||
                                error?.message?.includes('Failed to fetch') ||
                                error?.message?.includes('NetworkError');
          
          // Check if it's a column error
          const isColumnError = 
            error?.code === 'PGRST204' ||
            error?.code === '42703' ||
            error?.code === '42P01' ||
            error?.message?.toLowerCase().includes('column') ||
            error?.message?.toLowerCase().includes('does not exist') ||
            error?.message?.toLowerCase().includes('bad request');
          
          // Retry network errors once
          if (isNetworkError && retryCount < 1) {
            if (import.meta.env.DEV) {
              console.warn(`Network error loading theme (attempt ${retryCount + 1}/2), retrying in 2000ms...`);
            }
            await new Promise(resolve => setTimeout(resolve, 2000));
            return loadUserTheme(retryCount + 1);
          }
          
          // Silently fail - use stored theme from localStorage instead
          if (!isColumnError && !isNetworkError && import.meta.env.DEV) {
            console.warn('Error loading user theme:', error);
          }
          // Silently ignore column errors and network errors after retry
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

  const setTheme = async (newTheme: ThemeName) => {
    setThemeNameState(newTheme);
    saveTheme(newTheme);
    
    // Save to Supabase if user is logged in (fire and forget - don't block UI)
    if (user) {
      // Use IIFE to run async code without blocking
      (async () => {
        try {
          // First check if dashboard_theme column exists by trying a simple select
          const { error: checkError } = await supabase
            .from('user_preferences')
            .select('dashboard_theme')
            .eq('user_id', user.id)
            .limit(1);
          
          // If check fails with column error, the column doesn't exist - skip update
          const isColumnMissing = 
            checkError?.code === 'PGRST204' ||
            checkError?.code === '42703' ||
            checkError?.code === '42P01' ||
            checkError?.status === 400 ||
            checkError?.message?.toLowerCase().includes('dashboard_theme') ||
            checkError?.message?.toLowerCase().includes('column') ||
            checkError?.message?.toLowerCase().includes('does not exist') ||
            checkError?.message?.toLowerCase().includes('bad request');
          
          if (isColumnMissing) {
            // Column doesn't exist - skip update silently (theme is saved locally)
            return;
          }
          
          // Column exists, proceed with upsert
          const { error } = await supabase
            .from('user_preferences')
            .upsert({
              user_id: user.id,
              dashboard_theme: newTheme
            } as any, {
              onConflict: 'user_id'
            });
          
          // Silently ignore any errors - theme is saved locally anyway
          if (error && import.meta.env.DEV) {
            const isColumnError = 
              error.code === 'PGRST204' ||
              error.code === '42703' ||
              error.code === '42P01' ||
              error.status === 400;
            
            // Only log non-column errors in dev mode
            if (!isColumnError) {
              console.warn('Error saving theme to Supabase:', error);
            }
          }
        } catch (error: any) {
          // Silently ignore all errors - theme is saved locally
          // Don't log to prevent console noise
        }
      })();
    }
    
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

