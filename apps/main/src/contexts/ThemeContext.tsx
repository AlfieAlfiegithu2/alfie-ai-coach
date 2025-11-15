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
    
    // Save to Supabase if user is logged in
    if (user) {
      try {
        // First try to update existing record
        const { data: existing } = await supabase
          .from('user_preferences')
          .select('user_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (existing) {
          // Try to update dashboard_theme, but ignore errors if column doesn't exist
          // Use a try-catch to prevent errors from propagating to console
          try {
            const { error } = await supabase
              .from('user_preferences')
              .update({ dashboard_theme: newTheme } as any)
              .eq('user_id', user.id);
            
            if (error) {
              // Silently ignore column-not-found errors - theme is saved locally anyway
              // Check for various error codes and messages that indicate column doesn't exist
              const isColumnError = 
                error.code === 'PGRST204' || // Column not found
                error.code === '42703' ||    // Undefined column
                error.code === '42P01' ||    // Undefined table (shouldn't happen but just in case)
                error.message?.toLowerCase().includes('dashboard_theme') ||
                error.message?.toLowerCase().includes('column') ||
                error.message?.toLowerCase().includes('does not exist') ||
                error.message?.toLowerCase().includes('bad request');
              
              // Only log if it's NOT a column error (unexpected errors)
              if (!isColumnError) {
                console.warn('Error updating theme in Supabase:', error);
              }
              // Column errors are expected if migration hasn't been applied - ignore silently
            }
          } catch (err: any) {
            // Catch any unexpected errors and check if they're column-related
            const isColumnError = 
              err?.code === 'PGRST204' ||
              err?.code === '42703' ||
              err?.code === '42P01' ||
              err?.message?.toLowerCase().includes('dashboard_theme') ||
              err?.message?.toLowerCase().includes('column') ||
              err?.message?.toLowerCase().includes('does not exist') ||
              err?.message?.toLowerCase().includes('bad request');
            
            // Only log if it's NOT a column error
            if (!isColumnError) {
              console.warn('Error saving theme to Supabase:', err);
            }
            // Silently ignore column errors - theme is saved locally anyway
          }
        } else {
          // Try to insert with dashboard_theme, but fallback without it if column doesn't exist
          try {
            const { error: insertError } = await supabase
              .from('user_preferences')
              .insert({
                user_id: user.id,
                dashboard_theme: newTheme
              } as any);
            
            if (insertError) {
              // If it's a column error, try inserting without dashboard_theme
              const isColumnError = 
                insertError.code === 'PGRST204' ||
                insertError.code === '42703' ||
                insertError.code === '42P01' ||
                insertError.message?.toLowerCase().includes('dashboard_theme') ||
                insertError.message?.toLowerCase().includes('column') ||
                insertError.message?.toLowerCase().includes('does not exist') ||
                insertError.message?.toLowerCase().includes('bad request');
              
              if (isColumnError) {
                // Try inserting just user_id to create the record
                await supabase
                  .from('user_preferences')
                  .insert({ user_id: user.id } as any);
              } else {
                console.warn('Error inserting theme in Supabase:', insertError);
              }
            }
          } catch (err: any) {
            // Catch any unexpected errors and check if they're column-related
            const isColumnError = 
              err?.code === 'PGRST204' ||
              err?.code === '42703' ||
              err?.code === '42P01' ||
              err?.status === 400 ||
              err?.message?.toLowerCase().includes('dashboard_theme') ||
              err?.message?.toLowerCase().includes('column') ||
              err?.message?.toLowerCase().includes('does not exist') ||
              err?.message?.toLowerCase().includes('bad request');
            
            if (isColumnError) {
              // Try inserting just user_id to create the record
              try {
                await supabase
                  .from('user_preferences')
                  .insert({ user_id: user.id } as any);
              } catch {
                // Silently ignore - record might already exist
              }
            } else {
              console.warn('Error inserting theme in Supabase:', err);
            }
          }
        }
      } catch (error) {
        // Silently fail - theme is saved locally anyway
        console.warn('Error saving theme to Supabase:', error);
      }
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

