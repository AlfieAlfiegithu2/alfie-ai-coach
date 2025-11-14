import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Globe } from 'lucide-react';
import { getLanguagesWithFlags } from '@/lib/languageUtils';

interface LanguageWelcomeBannerProps {
  onLanguageSelected?: (language: string) => void;
}

const LanguageWelcomeBanner: React.FC<LanguageWelcomeBannerProps> = ({ onLanguageSelected }) => {
  const { i18n } = useTranslation();
  const [showBanner, setShowBanner] = useState(false);
  const [detectedLanguage, setDetectedLanguage] = useState<string>('');

  const supportedLanguages = getLanguagesWithFlags();

  useEffect(() => {
    // Check if user has already made a language choice
    const languageChoiceMade = localStorage.getItem('language_choice_made');
    const currentUILanguage = localStorage.getItem('ui_language');
    
    if (languageChoiceMade || currentUILanguage) {
      return; // Don't show banner if choice already made
    }

    // Detect browser language
    const browserLang = navigator.language.split('-')[0]; // 'ko-KR' -> 'ko'
    const supportedCodes = supportedLanguages.map(lang => lang.code);
    
    if (supportedCodes.includes(browserLang)) {
      setDetectedLanguage(browserLang);
      setShowBanner(true);
    }
  }, []);

  const handleLanguageSelect = async (languageCode: string) => {
    try {
      await i18n.changeLanguage(languageCode);
      localStorage.setItem('ui_language', languageCode);
      localStorage.setItem('language_choice_made', 'true');
      setShowBanner(false);
      onLanguageSelected?.(languageCode);
    } catch (error) {
      console.error('Failed to change language:', error);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('language_choice_made', 'true');
    setShowBanner(false);
  };

  const getLanguageInfo = (code: string) => {
    return supportedLanguages.find(lang => lang.code === code);
  };

  if (!showBanner) {
    return null;
  }

  const languageInfo = getLanguageInfo(detectedLanguage);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Globe className="w-5 h-5 text-blue-600" />
            <div className="flex items-center gap-2">
              <span className="text-lg">{languageInfo?.flag}</span>
              <div>
                <p className="text-sm font-medium text-slate-900">
                  Continue in {languageInfo?.name}?
                </p>
                <p className="text-xs text-slate-600">
                  We detected you speak {languageInfo?.name}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleLanguageSelect(detectedLanguage)}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Yes
            </button>
            <button
              onClick={handleDismiss}
              className="px-3 py-2 text-slate-600 text-sm hover:text-slate-800 transition-colors"
            >
              Keep English
            </button>
            <button
              onClick={handleDismiss}
              className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LanguageWelcomeBanner;
