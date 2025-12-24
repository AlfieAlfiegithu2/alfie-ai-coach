import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Check } from 'lucide-react';
import { getLanguagesWithFlags, type LanguageWithFlag } from '@/lib/languageUtils';
import { useThemeStyles } from '@/hooks/useThemeStyles';
import { cn } from '@/lib/utils';

const languages = getLanguagesWithFlags();

interface LanguageSelectorProps {
  minimal?: boolean;
}

const LanguageSelector = ({ minimal }: LanguageSelectorProps) => {
  const { i18n } = useTranslation();
  const themeStyles = useThemeStyles();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  const handleLanguageChange = async (languageCode: string) => {
    try {
      await i18n.changeLanguage(languageCode);
      try {
        localStorage.setItem('alfie-language', languageCode);
      } catch (e) {
        console.warn('Unable to persist language preference', e);
      }
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to change language:', error);
    }
  };

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

  // Restore persisted language on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('alfie-language');
      if (stored && stored !== i18n.language) {
        i18n.changeLanguage(stored).catch(err =>
          console.error('Failed to restore language from storage', err)
        );
      }
    } catch (e) {
      console.warn('Unable to read persisted language', e);
    }
  }, [i18n]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm font-medium focus:outline-none focus:ring-2",
          !minimal && "border"
        )}
        style={{
          backgroundColor: minimal
            ? 'transparent'
            : themeStyles.theme.name === 'glassmorphism'
              ? 'rgba(255,255,255,0.1)'
              : themeStyles.theme.name === 'dark'
                ? 'rgba(255,255,255,0.1)'
                : themeStyles.theme.name === 'minimalist'
                  ? '#ffffff'
                  : 'rgba(255,255,255,0.5)',
          borderColor: minimal ? 'transparent' : themeStyles.border,
          color: themeStyles.textPrimary,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = themeStyles.hoverBg;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = minimal
            ? 'transparent'
            : themeStyles.theme.name === 'glassmorphism'
              ? 'rgba(255,255,255,0.1)'
              : themeStyles.theme.name === 'dark'
                ? 'rgba(255,255,255,0.1)'
                : themeStyles.theme.name === 'minimalist'
                  ? '#ffffff'
                  : 'rgba(255,255,255,0.5)';
        }}
        aria-label="Select language"
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
          aria-label="Language options"
        >
          <div className="py-2">
            {languages.map((language) => (
              <button
                key={language.code}
                onClick={() => handleLanguageChange(language.code)}
                className="w-full flex items-center justify-between px-4 py-2 text-left transition-colors"
                style={{
                  backgroundColor: i18n.language === language.code
                    ? themeStyles.hoverBg
                    : 'transparent',
                }}
                onMouseEnter={(e) => {
                  if (i18n.language !== language.code) {
                    e.currentTarget.style.backgroundColor = themeStyles.hoverBg;
                  }
                }}
                onMouseLeave={(e) => {
                  if (i18n.language !== language.code) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
                role="option"
                aria-selected={i18n.language === language.code}
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
                {i18n.language === language.code && (
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

export default LanguageSelector;
