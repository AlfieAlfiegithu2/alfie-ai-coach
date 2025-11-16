import { useState, useEffect, useRef } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Label } from '@/components/ui/label';
import { Info, ChevronDown, Check } from 'lucide-react';
import { getLanguagesWithFlags, codeToEnglishName, englishNameToCode } from '@/lib/languageUtils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useThemeStyles } from '@/hooks/useThemeStyles';

const TestTranslationLanguageSelector = () => {
  const { user } = useAuth();
  const themeStyles = useThemeStyles();
  const languages = getLanguagesWithFlags();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Initialize from localStorage cache first (instant), then load from DB
  const getCachedLanguage = () => {
    try {
      const cached = localStorage.getItem('preferred_feedback_language');
      if (cached && languages.find(l => l.code === cached)) {
        return cached;
      }
    } catch (e) {
      // Ignore localStorage errors
    }
    return 'en';
  };
  
  const [testTranslationLanguage, setTestTranslationLanguage] = useState(getCachedLanguage());
  const [isLoading, setIsLoading] = useState(true);

  // Listen for language updates from other components
  useEffect(() => {
    const handleLanguageUpdate = () => {
      if (user) {
        // Reload language when storage event fires
        const loadTestTranslationLanguage = async () => {
          try {
            const { data } = await supabase
              .from('user_preferences')
              .select('preferred_feedback_language, native_language')
              .eq('user_id', user.id)
              .maybeSingle();

            const dataWithFeedback = data as any;
            const languageCode = dataWithFeedback?.preferred_feedback_language || dataWithFeedback?.native_language;
            
            if (languageCode) {
              const lang = languages.find(l => l.code === languageCode);
              if (lang) {
                setTestTranslationLanguage(lang.code);
              }
            }
          } catch (error) {
            console.warn('Error reloading language:', error);
          }
        };
        loadTestTranslationLanguage();
      }
    };

    window.addEventListener('storage', handleLanguageUpdate);
    window.addEventListener('language-updated', handleLanguageUpdate);
    
    return () => {
      window.removeEventListener('storage', handleLanguageUpdate);
      window.removeEventListener('language-updated', handleLanguageUpdate);
    };
  }, [user, languages]);

  // Load test translation language from user preferences
  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const loadTestTranslationLanguage = async () => {
      try {
        // Set loading state
        setIsLoading(true);
        
        console.log('📥 Loading preferred feedback language for user:', user.id);
        const { data, error } = await supabase
          .from('user_preferences')
          .select('preferred_feedback_language, native_language')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          // If column doesn't exist yet (migration not applied), try native_language only
          // Check for various error codes that indicate missing column:
          // - PGRST204: PostgREST schema cache error
          // - 42703: PostgreSQL undefined column error
          const isColumnMissing = error.code === 'PGRST204' || 
                                 error.code === '42703' ||
                                 error.message?.includes('preferred_feedback_language') ||
                                 error.message?.includes('column') ||
                                 error.message?.includes('schema cache') ||
                                 error.message?.includes('does not exist');
          
          if (isColumnMissing) {
            console.log('📝 preferred_feedback_language column not found, trying native_language...');
            const { data: fallbackData, error: fallbackError } = await supabase
              .from('user_preferences')
              .select('native_language')
              .eq('user_id', user.id)
              .maybeSingle();
            
            if (!fallbackError && fallbackData) {
              const fallbackCode = (fallbackData as any)?.native_language;
              if (fallbackCode) {
                const lang = languages.find(l => l.code === fallbackCode);
                if (lang) {
                  setTestTranslationLanguage(lang.code);
                  localStorage.setItem('preferred_feedback_language', lang.code);
                  setIsLoading(false);
                  console.log('✅ Loaded from native_language (fallback):', lang.code, lang.nativeName);
                  return;
                }
              }
            }
            // If no native_language found either, default to English
            setTestTranslationLanguage('en');
            localStorage.setItem('preferred_feedback_language', 'en');
            setIsLoading(false);
            return;
          }
          
          // For other errors, log and default to English
          console.warn('⚠️ Error loading preferences:', error);
          setTestTranslationLanguage('en');
          localStorage.setItem('preferred_feedback_language', 'en');
          setIsLoading(false);
          return;
        }

        // Prefer preferred_feedback_language, fallback to native_language for backward compatibility
        // Use type assertion since TypeScript types may not be updated yet
        const dataWithFeedback = data as any;
        const languageCode = dataWithFeedback?.preferred_feedback_language || dataWithFeedback?.native_language;
        
        console.log('📋 Loaded preferences:', { 
          preferred_feedback_language: dataWithFeedback?.preferred_feedback_language,
          native_language: dataWithFeedback?.native_language,
          selected: languageCode 
        });
        
        if (languageCode) {
          const lang = languages.find(l => l.code === languageCode);
          if (lang) {
            setTestTranslationLanguage(lang.code);
            localStorage.setItem('preferred_feedback_language', lang.code);
            setIsLoading(false);
            console.log('✅ Loaded preferred feedback language:', lang.code, lang.nativeName);
          } else {
            // If language code not found, default to English
            console.warn('⚠️ Language code not found in languages array:', languageCode, 'defaulting to English');
            setTestTranslationLanguage('en');
            localStorage.setItem('preferred_feedback_language', 'en');
            setIsLoading(false);
          }
        } else {
          // If no preference found, default to English
          console.log('📝 No feedback language preference found, using default: English');
          setTestTranslationLanguage('en');
          localStorage.setItem('preferred_feedback_language', 'en');
          setIsLoading(false);
        }
      } catch (error) {
        console.warn('❌ Error loading test translation language:', error);
        // On error, default to English
        setTestTranslationLanguage('en');
        localStorage.setItem('preferred_feedback_language', 'en');
        setIsLoading(false);
      }
    };

    loadTestTranslationLanguage();
  }, [user]); // Remove languages from dependencies to prevent unnecessary re-runs

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLanguageChange = async (languageCode: string) => {
    setTestTranslationLanguage(languageCode);
    setIsOpen(false);
    
    if (!user) return;

    try {
      // First check if record exists
      const { data: existing } = await supabase
        .from('user_preferences')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();

      let error;
      
      if (existing) {
        // Try to update preferred_feedback_language first
        // Use type assertion since TypeScript types may not be updated yet
        const { error: updateError } = await supabase
          .from('user_preferences')
          .update({ preferred_feedback_language: languageCode } as any)
          .eq('user_id', user.id);
        error = updateError;
        
        // If column doesn't exist, fallback to native_language temporarily
        // Check for various error codes that indicate missing column:
        // - PGRST204: PostgREST schema cache error
        // - 42703: PostgreSQL undefined column error
        const isColumnMissing = error && (
          error.code === 'PGRST204' || 
          error.code === '42703' ||
          error.message?.includes('preferred_feedback_language') || 
          error.message?.includes('column') ||
          error.message?.includes('does not exist')
        );
        
        if (isColumnMissing) {
            console.log('⚠️ preferred_feedback_language column not found, using native_language as fallback...');
          const { error: fallbackError } = await supabase
            .from('user_preferences')
            .update({ native_language: languageCode })
            .eq('user_id', user.id);
          
          if (!fallbackError) {
            console.log('✅ Saved to native_language (fallback - migration not applied yet):', languageCode);
            error = null; // Clear error since fallback succeeded
            const lang = languages.find(l => l.code === languageCode);
            console.log('✅ Language saved successfully:', languageCode, lang?.nativeName || lang?.name);
            localStorage.setItem('preferred_feedback_language', languageCode);
            window.dispatchEvent(new CustomEvent('language-updated'));
            localStorage.setItem('feedback-language-updated', Date.now().toString());
            return; // Exit early since fallback succeeded
          }
        }
      } else {
        // Insert new record - try preferred_feedback_language first
        // Use type assertion since TypeScript types may not be updated yet
        const { error: insertError } = await supabase
          .from('user_preferences')
          .insert({ 
            user_id: user.id, 
            preferred_feedback_language: languageCode 
          } as any);
        error = insertError;
        
        // If column doesn't exist, fallback to native_language temporarily
        // Check for various error codes that indicate missing column:
        // - PGRST204: PostgREST schema cache error
        // - 42703: PostgreSQL undefined column error
        const isColumnMissingInsert = error && (
          error.code === 'PGRST204' || 
          error.code === '42703' ||
          error.message?.includes('preferred_feedback_language') || 
          error.message?.includes('column') ||
          error.message?.includes('does not exist')
        );
        
        if (isColumnMissingInsert) {
            console.log('⚠️ preferred_feedback_language column not found, using native_language as fallback...');
          const { error: fallbackError } = await supabase
            .from('user_preferences')
            .insert({ 
              user_id: user.id, 
              native_language: languageCode 
            });
          
          if (!fallbackError) {
            console.log('✅ Saved to native_language (fallback - migration not applied yet):', languageCode);
            error = null; // Clear error since fallback succeeded
            const lang = languages.find(l => l.code === languageCode);
            console.log('✅ Language saved successfully:', languageCode, lang?.nativeName || lang?.name);
            localStorage.setItem('preferred_feedback_language', languageCode);
            window.dispatchEvent(new CustomEvent('language-updated'));
            localStorage.setItem('feedback-language-updated', Date.now().toString());
            return; // Exit early since fallback succeeded
          }
        }
      }

      if (error) {
        console.error('❌ Error saving preferred feedback language:', error);
        // Revert the state change if save failed
        const { data } = await supabase
          .from('user_preferences')
          .select('preferred_feedback_language, native_language')
          .eq('user_id', user.id)
          .maybeSingle();
        
        // Use type assertion since TypeScript types may not be updated yet
        const dataWithFeedback = data as any;
        const savedCode = dataWithFeedback?.preferred_feedback_language || dataWithFeedback?.native_language;
        if (savedCode) {
          const lang = languages.find(l => l.code === savedCode);
          if (lang) {
            setTestTranslationLanguage(lang.code);
            console.log('🔄 Reverted to saved language:', lang.code);
          }
        }
      } else {
        const lang = languages.find(l => l.code === languageCode);
        console.log('✅ Preferred feedback language saved successfully:', languageCode, lang?.nativeName || lang?.name);
        
        // Update localStorage cache immediately
        localStorage.setItem('preferred_feedback_language', languageCode);
        
        // Dispatch event to notify other components
        window.dispatchEvent(new CustomEvent('language-updated'));
        localStorage.setItem('feedback-language-updated', Date.now().toString());
      }
    } catch (error) {
      console.error('❌ Error saving preferred feedback language:', error);
    }
  };

  // Find current language - ensure we always have a valid language object
  const currentLanguage = languages.find(lang => lang.code === testTranslationLanguage) || 
                          languages.find(lang => lang.code === 'en') || 
                          languages[0];
  
  // Debug log to verify current language (only in dev mode)
  if (import.meta.env.DEV && testTranslationLanguage) {
    console.log('🔍 Current feedback language display:', {
      testTranslationLanguage,
      currentLanguageCode: currentLanguage?.code,
      currentLanguageName: currentLanguage?.nativeName,
      currentLanguageFlag: currentLanguage?.flag
    });
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-sm font-medium focus:outline-none focus:ring-2"
        style={{
          backgroundColor: themeStyles.theme.name === 'glassmorphism' 
            ? 'rgba(255,255,255,0.1)' 
            : themeStyles.theme.name === 'dark' 
            ? 'rgba(255,255,255,0.1)' 
            : themeStyles.theme.name === 'minimalist' 
            ? '#ffffff' 
            : 'rgba(255,255,255,0.5)',
          borderColor: themeStyles.border,
          color: themeStyles.textPrimary,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = themeStyles.hoverBg;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = themeStyles.theme.name === 'glassmorphism' 
            ? 'rgba(255,255,255,0.1)' 
            : themeStyles.theme.name === 'dark' 
            ? 'rgba(255,255,255,0.1)' 
            : themeStyles.theme.name === 'minimalist' 
            ? '#ffffff' 
            : 'rgba(255,255,255,0.5)';
        }}
        aria-label="Select test translation language"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="text-lg">{currentLanguage.flag}</span>
        <span className="flex-1 text-center">{currentLanguage.nativeName}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          className="absolute left-0 mt-2 w-56 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto"
          style={{
            backgroundColor: themeStyles.cardBackground,
            borderColor: themeStyles.border,
            borderWidth: '1px',
            borderStyle: 'solid',
          }}
          role="listbox"
          aria-label="Test translation language options"
        >
          <div className="py-2">
            {languages.map((language) => (
              <button
                key={language.code}
                onClick={() => handleLanguageChange(language.code)}
                className="w-full flex items-center justify-between px-4 py-2 text-left transition-colors"
                style={{
                  backgroundColor: testTranslationLanguage === language.code 
                    ? themeStyles.hoverBg 
                    : 'transparent',
                }}
                onMouseEnter={(e) => {
                  if (testTranslationLanguage !== language.code) {
                    e.currentTarget.style.backgroundColor = themeStyles.hoverBg;
                  }
                }}
                onMouseLeave={(e) => {
                  if (testTranslationLanguage !== language.code) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
                role="option"
                aria-selected={testTranslationLanguage === language.code}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{language.flag}</span>
                  <div className="flex flex-col">
                    <span 
                      className="text-sm font-medium"
                      style={{ color: themeStyles.textPrimary }}
                    >
                      {language.nativeName}
                    </span>
                    <span 
                      className="text-xs"
                      style={{ color: themeStyles.textSecondary }}
                    >
                      {language.name}
                    </span>
                  </div>
                </div>
                {testTranslationLanguage === language.code && (
                  <Check 
                    className="w-4 h-4" 
                    style={{ color: themeStyles.buttonPrimary }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TestTranslationLanguageSelector;

