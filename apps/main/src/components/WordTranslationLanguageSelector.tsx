import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { getLanguagesWithFlags } from '@/lib/languageUtils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useThemeStyles } from '@/hooks/useThemeStyles';

const WordTranslationLanguageSelector = () => {
  const { user } = useAuth();
  const themeStyles = useThemeStyles();
  const languages = getLanguagesWithFlags();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Initialize from localStorage cache first (instant), then load from DB
  const getCachedLanguage = () => {
    try {
      const cached = localStorage.getItem('word_translation_language');
      if (cached && languages.find(l => l.code === cached)) {
        return cached;
      }
    } catch (e) {
      // Ignore localStorage errors
    }
    return 'en';
  };
  
  const [wordTranslationLanguage, setWordTranslationLanguage] = useState(getCachedLanguage());
  const [isLoading, setIsLoading] = useState(true);

  // Listen for language updates from other components
  useEffect(() => {
    const handleLanguageUpdate = () => {
      if (user) {
        const loadWordTranslationLanguage = async () => {
          try {
            const { data } = await supabase
              .from('user_preferences')
              .select('word_translation_language, native_language')
              .eq('user_id', user.id)
              .maybeSingle();

            const dataWithWordTrans = data as any;
            const languageCode = dataWithWordTrans?.word_translation_language || dataWithWordTrans?.native_language;
            
            if (languageCode) {
              const lang = languages.find(l => l.code === languageCode);
              if (lang) {
                setWordTranslationLanguage(lang.code);
              }
            }
          } catch (error) {
            console.warn('Error reloading word translation language:', error);
          }
        };
        loadWordTranslationLanguage();
      }
    };

    window.addEventListener('storage', handleLanguageUpdate);
    window.addEventListener('word-translation-language-updated', handleLanguageUpdate);
    
    return () => {
      window.removeEventListener('storage', handleLanguageUpdate);
      window.removeEventListener('word-translation-language-updated', handleLanguageUpdate);
    };
  }, [user, languages]);

  // Load word translation language from user preferences
  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const loadWordTranslationLanguage = async () => {
      try {
        setIsLoading(true);
        
        console.log('📥 Loading word translation language for user:', user.id);
        const { data, error } = await supabase
          .from('user_preferences')
          .select('word_translation_language, native_language')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          // If column doesn't exist yet (migration not applied), try native_language only
          const isColumnMissing = error.code === 'PGRST204' || 
                                 error.code === '42703' ||
                                 error.message?.includes('word_translation_language') ||
                                 error.message?.includes('column') ||
                                 error.message?.includes('schema cache') ||
                                 error.message?.includes('does not exist');
          
          if (isColumnMissing) {
            console.log('📝 word_translation_language column not found, trying native_language...');
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
                  setWordTranslationLanguage(lang.code);
                  localStorage.setItem('word_translation_language', lang.code);
                  setIsLoading(false);
                  console.log('✅ Loaded from native_language (fallback):', lang.code, lang.nativeName);
                  return;
                }
              }
            }
            setWordTranslationLanguage('en');
            localStorage.setItem('word_translation_language', 'en');
            setIsLoading(false);
            return;
          }
          
          console.warn('⚠️ Error loading preferences:', error);
          setWordTranslationLanguage('en');
          localStorage.setItem('word_translation_language', 'en');
          setIsLoading(false);
          return;
        }

        // Prefer word_translation_language, fallback to native_language for backward compatibility
        const dataWithWordTrans = data as any;
        const languageCode = dataWithWordTrans?.word_translation_language || dataWithWordTrans?.native_language;
        
        console.log('📋 Loaded preferences:', { 
          word_translation_language: dataWithWordTrans?.word_translation_language,
          native_language: dataWithWordTrans?.native_language,
          selected: languageCode 
        });
        
        if (languageCode) {
          const lang = languages.find(l => l.code === languageCode);
          if (lang) {
            setWordTranslationLanguage(lang.code);
            localStorage.setItem('word_translation_language', lang.code);
            setIsLoading(false);
            console.log('✅ Loaded word translation language:', lang.code, lang.nativeName);
          } else {
            console.warn('⚠️ Language code not found in languages array:', languageCode, 'defaulting to English');
            setWordTranslationLanguage('en');
            localStorage.setItem('word_translation_language', 'en');
            setIsLoading(false);
          }
        } else {
          console.log('📝 No word translation language preference found, using default: English');
          setWordTranslationLanguage('en');
          localStorage.setItem('word_translation_language', 'en');
          setIsLoading(false);
        }
      } catch (error) {
        console.warn('❌ Error loading word translation language:', error);
        setWordTranslationLanguage('en');
        localStorage.setItem('word_translation_language', 'en');
        setIsLoading(false);
      }
    };

    loadWordTranslationLanguage();
  }, [user]);

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
    setWordTranslationLanguage(languageCode);
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
        // Try to update word_translation_language first
        const { error: updateError } = await supabase
          .from('user_preferences')
          .update({ word_translation_language: languageCode } as any)
          .eq('user_id', user.id);
        error = updateError;
        
        // If column doesn't exist, fallback to native_language temporarily
        const isColumnMissing = error && (
          error.code === 'PGRST204' || 
          error.code === '42703' ||
          error.message?.includes('word_translation_language') || 
          error.message?.includes('column') ||
          error.message?.includes('does not exist')
        );
        
        if (isColumnMissing) {
          console.log('⚠️ word_translation_language column not found, using native_language as fallback...');
          const { error: fallbackError } = await supabase
            .from('user_preferences')
            .update({ native_language: languageCode })
            .eq('user_id', user.id);
          
          if (!fallbackError) {
            console.log('✅ Saved to native_language (fallback - migration not applied yet):', languageCode);
            error = null;
            const lang = languages.find(l => l.code === languageCode);
            console.log('✅ Language saved successfully:', languageCode, lang?.nativeName || lang?.name);
            localStorage.setItem('word_translation_language', languageCode);
            window.dispatchEvent(new CustomEvent('word-translation-language-updated'));
            localStorage.setItem('word-translation-language-updated', Date.now().toString());
            return;
          }
        }
      } else {
        // Insert new record
        const { error: insertError } = await supabase
          .from('user_preferences')
          .insert({ 
            user_id: user.id, 
            word_translation_language: languageCode 
          } as any);
        error = insertError;
        
        const isColumnMissingInsert = error && (
          error.code === 'PGRST204' || 
          error.code === '42703' ||
          error.message?.includes('word_translation_language') || 
          error.message?.includes('column') ||
          error.message?.includes('does not exist')
        );
        
        if (isColumnMissingInsert) {
          console.log('⚠️ word_translation_language column not found, using native_language as fallback...');
          const { error: fallbackError } = await supabase
            .from('user_preferences')
            .insert({ 
              user_id: user.id, 
              native_language: languageCode 
            });
          
          if (!fallbackError) {
            console.log('✅ Saved to native_language (fallback - migration not applied yet):', languageCode);
            error = null;
            const lang = languages.find(l => l.code === languageCode);
            console.log('✅ Language saved successfully:', languageCode, lang?.nativeName || lang?.name);
            localStorage.setItem('word_translation_language', languageCode);
            window.dispatchEvent(new CustomEvent('word-translation-language-updated'));
            localStorage.setItem('word-translation-language-updated', Date.now().toString());
            return;
          }
        }
      }

      if (error) {
        console.error('❌ Error saving word translation language:', error);
        // Revert the state change if save failed
        const { data } = await supabase
          .from('user_preferences')
          .select('word_translation_language, native_language')
          .eq('user_id', user.id)
          .maybeSingle();
        
        const dataWithWordTrans = data as any;
        const savedCode = dataWithWordTrans?.word_translation_language || dataWithWordTrans?.native_language;
        if (savedCode) {
          const lang = languages.find(l => l.code === savedCode);
          if (lang) {
            setWordTranslationLanguage(lang.code);
            console.log('🔄 Reverted to saved language:', lang.code);
          }
        }
      } else {
        const lang = languages.find(l => l.code === languageCode);
        console.log('✅ Word translation language saved successfully:', languageCode, lang?.nativeName || lang?.name);
        
        // Update localStorage cache immediately
        localStorage.setItem('word_translation_language', languageCode);
        
        // Dispatch event to notify other components (like GlobalTextSelection)
        window.dispatchEvent(new CustomEvent('word-translation-language-updated'));
        localStorage.setItem('word-translation-language-updated', Date.now().toString());
      }
    } catch (error) {
      console.error('❌ Error saving word translation language:', error);
    }
  };

  // Find current language
  const currentLanguage = languages.find(lang => lang.code === wordTranslationLanguage) || 
                          languages.find(lang => lang.code === 'en') || 
                          languages[0];

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
        aria-label="Select word translation language"
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
          aria-label="Word translation language options"
        >
          <div className="py-2">
            {languages.map((language) => (
              <button
                key={language.code}
                onClick={() => handleLanguageChange(language.code)}
                className="w-full flex items-center justify-between px-4 py-2 text-left transition-colors"
                style={{
                  backgroundColor: wordTranslationLanguage === language.code 
                    ? themeStyles.hoverBg 
                    : 'transparent',
                }}
                onMouseEnter={(e) => {
                  if (wordTranslationLanguage !== language.code) {
                    e.currentTarget.style.backgroundColor = themeStyles.hoverBg;
                  }
                }}
                onMouseLeave={(e) => {
                  if (wordTranslationLanguage !== language.code) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
                role="option"
                aria-selected={wordTranslationLanguage === language.code}
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
                {wordTranslationLanguage === language.code && (
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

export default WordTranslationLanguageSelector;
