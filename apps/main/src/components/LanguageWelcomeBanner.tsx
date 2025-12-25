import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Globe } from 'lucide-react';
import { getLanguagesWithFlags } from '@/lib/languageUtils';

interface LanguageWelcomeBannerProps {
  onLanguageSelected?: (language: string) => void;
}

// Welcome messages in each language for a native experience
const WELCOME_MESSAGES: Record<string, { continue: string; detected: string; yes: string; keepEnglish: string }> = {
  en: { continue: 'Continue in English?', detected: 'We detected you speak English', yes: 'Yes', keepEnglish: 'Keep English' },
  zh: { continue: '继续使用中文？', detected: '我们检测到您使用中文', yes: '是的', keepEnglish: '保持英文' },
  ja: { continue: '日本語で続けますか？', detected: '日本語を使用していることが検出されました', yes: 'はい', keepEnglish: '英語のまま' },
  ko: { continue: '한국어로 계속하시겠습니까?', detected: '한국어 사용자로 감지되었습니다', yes: '네', keepEnglish: '영어 유지' },
  es: { continue: '¿Continuar en español?', detected: 'Detectamos que hablas español', yes: 'Sí', keepEnglish: 'Mantener inglés' },
  fr: { continue: 'Continuer en français ?', detected: 'Nous avons détecté que vous parlez français', yes: 'Oui', keepEnglish: 'Garder l\'anglais' },
  de: { continue: 'Auf Deutsch fortfahren?', detected: 'Wir haben erkannt, dass Sie Deutsch sprechen', yes: 'Ja', keepEnglish: 'Englisch behalten' },
  pt: { continue: 'Continuar em português?', detected: 'Detectamos que você fala português', yes: 'Sim', keepEnglish: 'Manter inglês' },
  ru: { continue: 'Продолжить на русском?', detected: 'Мы обнаружили, что вы говорите по-русски', yes: 'Да', keepEnglish: 'Оставить английский' },
  ar: { continue: 'هل تريد المتابعة بالعربية؟', detected: 'اكتشفنا أنك تتحدث العربية', yes: 'نعم', keepEnglish: 'إبقاء الإنجليزية' },
  hi: { continue: 'हिंदी में जारी रखें?', detected: 'हमने पता लगाया कि आप हिंदी बोलते हैं', yes: 'हाँ', keepEnglish: 'अंग्रेजी रखें' },
  vi: { continue: 'Tiếp tục bằng tiếng Việt?', detected: 'Chúng tôi phát hiện bạn nói tiếng Việt', yes: 'Có', keepEnglish: 'Giữ tiếng Anh' },
  th: { continue: 'ดำเนินการต่อเป็นภาษาไทย?', detected: 'เราตรวจพบว่าคุณพูดภาษาไทย', yes: 'ใช่', keepEnglish: 'ใช้ภาษาอังกฤษต่อ' },
  id: { continue: 'Lanjutkan dalam Bahasa Indonesia?', detected: 'Kami mendeteksi Anda berbahasa Indonesia', yes: 'Ya', keepEnglish: 'Tetap Inggris' },
  tr: { continue: 'Türkçe devam edilsin mi?', detected: 'Türkçe konuştuğunuzu tespit ettik', yes: 'Evet', keepEnglish: 'İngilizce kalsın' },
  ms: { continue: 'Teruskan dalam Bahasa Melayu?', detected: 'Kami mengesan anda berbahasa Melayu', yes: 'Ya', keepEnglish: 'Kekalkan Inggeris' },
  tl: { continue: 'Magpatuloy sa Filipino?', detected: 'Nakita naming nagsasalita ka ng Filipino', yes: 'Oo', keepEnglish: 'Panatilihin ang Ingles' },
};

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

    // Only show banner if detected language is supported AND different from English
    if (supportedCodes.includes(browserLang) && browserLang !== 'en') {
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
    localStorage.setItem('ui_language', 'en');
    setShowBanner(false);
  };

  const getLanguageInfo = (code: string) => {
    return supportedLanguages.find(lang => lang.code === code);
  };

  if (!showBanner) {
    return null;
  }

  const languageInfo = getLanguageInfo(detectedLanguage);
  const messages = WELCOME_MESSAGES[detectedLanguage] || WELCOME_MESSAGES.en;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Globe className="w-5 h-5 text-white/80" />
            <div className="flex items-center gap-2">
              <span className="text-2xl">{languageInfo?.flag}</span>
              <div>
                <p className="text-sm font-semibold">
                  {messages.continue}
                </p>
                <p className="text-xs text-white/70">
                  {messages.detected}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleLanguageSelect(detectedLanguage)}
              className="px-4 py-2 bg-white text-blue-600 text-sm font-semibold rounded-lg hover:bg-blue-50 transition-colors"
            >
              {messages.yes} ✓
            </button>
            <button
              onClick={handleDismiss}
              className="px-3 py-2 text-white/80 text-sm hover:text-white transition-colors"
            >
              {messages.keepEnglish}
            </button>
            <button
              onClick={handleDismiss}
              className="p-1 text-white/60 hover:text-white transition-colors"
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

