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
  const [testTranslationLanguage, setTestTranslationLanguage] = useState('en');

  // Load test translation language from user preferences
  useEffect(() => {
    if (!user) return;

    const loadTestTranslationLanguage = async () => {
      try {
        const { data } = await supabase
          .from('user_preferences')
          .select('native_language')
          .eq('user_id', user.id)
          .maybeSingle();

        if (data?.native_language) {
          const lang = languages.find(l => l.code === data.native_language);
          if (lang) {
            setTestTranslationLanguage(lang.code);
          }
        }
      } catch (error) {
        console.warn('Error loading test translation language:', error);
      }
    };

    loadTestTranslationLanguage();
  }, [user, languages]);

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
      // Update user preferences
      const { data: existing } = await supabase
        .from('user_preferences')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('user_preferences')
          .update({ native_language: languageCode })
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('user_preferences')
          .insert({ user_id: user.id, native_language: languageCode });
      }
    } catch (error) {
      console.error('Error saving test translation language:', error);
    }
  };

  const currentLanguage = languages.find(lang => lang.code === testTranslationLanguage) || languages.find(lang => lang.code === 'en') || languages[0];

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

