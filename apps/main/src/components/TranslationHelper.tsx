import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import LottieLoadingAnimation from '@/components/animations/LottieLoadingAnimation';
import { useThemeStyles } from '@/hooks/useThemeStyles';

interface TranslationHelperProps {
  selectedText: string;
  position: { x: number; y: number };
  onClose: () => void;
  language: string;
  onSaveStart?: () => void; // Kept for compatibility but not used in simplified design
}

interface TranslationResult {
  translation: string;
  context?: string;
  alternatives?: Array<{meaning: string; pos: string} | string>;
  grammar_notes?: string;
  simple?: boolean;
}

const TranslationHelper = ({ selectedText, position, onClose, language }: TranslationHelperProps) => {
  const [translationResult, setTranslationResult] = useState<TranslationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const themeStyles = useThemeStyles();

  // Enhanced in-memory cache with larger capacity for instant lookups
  const translationCache = useRef<Map<string, TranslationResult>>(new Map());
  
  // Simple fallback translations for common words
  const getFallbackTranslation = (text: string, targetLang: string): TranslationResult | null => {
    const lowerText = text.toLowerCase().trim();

    // Basic English to Spanish translations
    if (targetLang === 'es') {
      const translations: Record<string, string> = {
        'hello': 'hola',
        'hi': 'hola',
        'goodbye': 'adiós',
        'bye': 'adiós',
        'thank you': 'gracias',
        'thanks': 'gracias',
        'please': 'por favor',
        'yes': 'sí',
        'no': 'no',
        'good': 'bueno',
        'bad': 'malo',
        'great': 'excelente',
        'big': 'grande',
        'small': 'pequeño',
        'hot': 'caliente',
        'cold': 'frío',
        'water': 'agua',
        'food': 'comida',
        'eat': 'comer',
        'drink': 'beber',
        'time': 'tiempo',
        'day': 'día',
        'night': 'noche',
        'morning': 'mañana',
        'evening': 'tarde',
        'home': 'casa',
        'house': 'casa',
        'school': 'escuela',
        'work': 'trabajo',
        'job': 'trabajo',
        'friend': 'amigo',
        'family': 'familia',
        'love': 'amor',
        'happy': 'feliz',
        'sad': 'triste',
        'beautiful': 'hermoso',
        'ugly': 'feo',
        'fast': 'rápido',
        'slow': 'lento',
        'new': 'nuevo',
        'old': 'viejo',
        'easy': 'fácil',
        'difficult': 'difícil',
        'help': 'ayuda',
        'help me': 'ayúdame',
        'how are you': '¿cómo estás?',
        'i am fine': 'estoy bien',
        'what is your name': '¿cómo te llamas?',
        'my name is': 'me llamo',
        'nice to meet you': 'mucho gusto',
        'see you later': 'hasta luego',
        'good morning': 'buenos días',
        'good afternoon': 'buenas tardes',
        'good evening': 'buenas noches'
      };

      if (translations[lowerText]) {
        return {
          translation: translations[lowerText],
          alternatives: [],
          simple: true
        };
      }
    }

    // Basic English to French translations
    if (targetLang === 'fr') {
      const translations: Record<string, string> = {
        'hello': 'bonjour',
        'hi': 'bonjour',
        'goodbye': 'au revoir',
        'bye': 'au revoir',
        'thank you': 'merci',
        'thanks': 'merci',
        'please': 's\'il vous plaît',
        'yes': 'oui',
        'no': 'non',
        'good': 'bon',
        'bad': 'mauvais',
        'great': 'excellent',
        'big': 'grand',
        'small': 'petit',
        'hot': 'chaud',
        'cold': 'froid',
        'water': 'eau',
        'food': 'nourriture',
        'eat': 'manger',
        'drink': 'boire',
        'time': 'temps',
        'day': 'jour',
        'night': 'nuit',
        'morning': 'matin',
        'evening': 'soir',
        'home': 'maison',
        'house': 'maison',
        'school': 'école',
        'work': 'travail',
        'job': 'travail',
        'friend': 'ami',
        'family': 'famille',
        'love': 'amour',
        'happy': 'heureux',
        'sad': 'triste',
        'beautiful': 'beau',
        'ugly': 'laid',
        'fast': 'rapide',
        'slow': 'lent',
        'new': 'nouveau',
        'old': 'vieux',
        'easy': 'facile',
        'difficult': 'difficile',
        'help': 'aide',
        'help me': 'aidez-moi',
        'how are you': 'comment allez-vous?',
        'i am fine': 'je vais bien',
        'what is your name': 'comment vous appelez-vous?',
        'my name is': 'je m\'appelle',
        'nice to meet you': 'enchanté',
        'see you later': 'à plus tard',
        'good morning': 'bonjour',
        'good afternoon': 'bonjour',
        'good evening': 'bonsoir'
      };

      if (translations[lowerText]) {
        return {
          translation: translations[lowerText],
          alternatives: [],
          simple: true
        };
      }
    }

    // Basic English to German translations
    if (targetLang === 'de') {
      const translations: Record<string, string> = {
        'hello': 'hallo',
        'hi': 'hallo',
        'goodbye': 'tschüss',
        'bye': 'tschüss',
        'thank you': 'danke',
        'thanks': 'danke',
        'please': 'bitte',
        'yes': 'ja',
        'no': 'nein',
        'good': 'gut',
        'bad': 'schlecht',
        'great': 'toll',
        'big': 'groß',
        'small': 'klein',
        'hot': 'heiß',
        'cold': 'kalt',
        'water': 'wasser',
        'food': 'essen',
        'eat': 'essen',
        'drink': 'trinken',
        'time': 'zeit',
        'day': 'tag',
        'night': 'nacht',
        'morning': 'morgen',
        'evening': 'abend',
        'home': 'zuhause',
        'house': 'haus',
        'school': 'schule',
        'work': 'arbeit',
        'job': 'arbeit',
        'friend': 'freund',
        'family': 'familie',
        'love': 'liebe',
        'happy': 'glücklich',
        'sad': 'traurig',
        'beautiful': 'schön',
        'fast': 'schnell',
        'slow': 'langsam',
        'new': 'neu',
        'old': 'alt',
        'easy': 'einfach',
        'difficult': 'schwierig',
        'help': 'hilfe',
        'help me': 'hilf mir',
        'how are you': 'wie geht es dir?',
        'i am fine': 'mir geht es gut',
        'good morning': 'guten morgen',
        'good evening': 'guten abend'
      };

      if (translations[lowerText]) {
        return {
          translation: translations[lowerText],
          alternatives: [],
          simple: true
        };
      }
    }

    return null;
  };

  // Session storage for persistent cache across component remounts
  const getFromSessionCache = (key: string): TranslationResult | null => {
    try {
      const cached = sessionStorage.getItem(`trans_${key}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        // Check if cache is still valid (within 1 hour)
        if (parsed.timestamp && Date.now() - parsed.timestamp < 3600000) {
          return parsed.data;
        }
        sessionStorage.removeItem(`trans_${key}`);
      }
    } catch (e) {
      // Ignore cache errors
    }
    return null;
  };
  
  const saveToSessionCache = (key: string, data: TranslationResult) => {
    try {
      sessionStorage.setItem(`trans_${key}`, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (e) {
      // Ignore if storage is full
    }
  };

  useEffect(() => {
    if (selectedText.trim()) {
      fetchTranslation(selectedText.trim());
    }
  }, [selectedText, language]);

  const fetchTranslation = async (text: string) => {
    const cacheKey = `${text.toLowerCase()}-${language}`;
    
    // Check in-memory cache first (instant)
    const memoryCached = translationCache.current.get(cacheKey);
    if (memoryCached) {
      setTranslationResult(memoryCached);
      return;
    }
    
    // Check session storage cache (near-instant)
    const sessionCached = getFromSessionCache(cacheKey);
    if (sessionCached) {
      setTranslationResult(sessionCached);
      translationCache.current.set(cacheKey, sessionCached);
      return;
    }

    setIsLoading(true);
    
    try {
      // Two-tier approach: For single words, prioritize speed
      const wordCount = text.trim().split(/\s+/).length;
      const isShortText = wordCount <= 3;
      
        // Use simple translation service with optimized settings
      const { supabase } = await import('@/integrations/supabase/client');
      console.log('🔄 Requesting translation for:', text, 'to language:', language);

      let data, error;
      try {
        const response = await supabase.functions.invoke('translation-service', {
          body: {
            text: text,
            targetLanguage: language,
            sourceLang: 'auto',
            // For short texts, request full context but API will use simplified prompt
            includeContext: true
          }
        });
        data = response.data;
        error = response.error;
      } catch (err) {
        console.error('Network error calling translation service:', err);
        error = err;
      }

      console.log('📥 Translation response:', { data, error });

      if (error || !data.success) {
        console.error('Translation service error:', { error, data });

        // Check if it's an API key issue
        const isApiKeyError = error?.message?.includes('API key') ||
                             error?.message?.includes('unauthorized') ||
                             error?.message?.includes('authentication') ||
                             error?.message?.includes('temporarily unavailable') ||
                             !data ||
                             (data && data.error === 'Translation service temporarily unavailable. Please try again in a moment.');

        if (isApiKeyError) {
          console.warn('🔑 Translation service unavailable: API key not configured');
          toast({
            title: "Translation Service Setup Required",
            description: "Full translation requires API configuration. Using basic translations for common words. Set up DEEPSEEK_API_KEY for advanced translations.",
            variant: "destructive",
            duration: 7000,
          });
        }

        // Fallback: Try to provide a basic translation for common words
        const fallbackTranslation = getFallbackTranslation(text, language);
        if (fallbackTranslation) {
          console.log('🔄 Using fallback translation:', fallbackTranslation);
          setTranslationResult(fallbackTranslation);
          // Cache the fallback result
          translationCache.current.set(cacheKey, fallbackTranslation);
          saveToSessionCache(cacheKey, fallbackTranslation);
        } else {
          const errorMessage = isApiKeyError
            ? "Translation service needs API key setup. Try basic words like 'hello', 'goodbye', 'thank you' for instant translations."
            : "Unable to translate at the moment. Please try again.";

          toast({
            title: "Translation Limited",
            description: errorMessage,
            variant: "destructive",
            duration: 5000,
          });
          setTranslationResult(null);
        }
      } else {
        // Handle both response formats (DeepSeek format and Google format)
        let translationResult;
        if (data.result) {
          // DeepSeek format
          translationResult = data.result;
          console.log('✅ DeepSeek translation successful:', translationResult);
        } else if (data.translated && data.original) {
          // Google Translate format
          translationResult = {
            translation: data.translated,
            alternatives: [],
            simple: false
          };
          console.log('✅ Google translation successful:', translationResult);
        } else {
          // Fallback
          translationResult = {
            translation: text,
            alternatives: [],
            simple: true
          };
          console.log('⚠️ Using fallback translation result format');
        }

        setTranslationResult(translationResult);

        // Cache the result in both memory and session storage
        translationCache.current.set(cacheKey, translationResult);
        saveToSessionCache(cacheKey, translationResult);
      }
    } catch (error) {
      console.error('Translation error:', error);
      toast({
        title: "Translation failed",
        description: "Unable to translate. Please try again later.",
        variant: "destructive",
      });
      setTranslationResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate dynamic positioning to keep popup on screen and next to word
  const getPopupPosition = () => {
    const popupWidth = 320; // Simplified smaller width
    const popupHeight = 150; // Smaller height for simplified design
    const margin = 10;
    const wordOffset = 8;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const scrollY = window.scrollY;

    let left = position.x - popupWidth / 2; // Center horizontally
    let top = position.y + wordOffset; // Below selection

    // Ensure it doesn't go off screen edges
    if (left < margin) {
      left = margin;
    }
    if (left + popupWidth > viewportWidth - margin) {
      left = viewportWidth - popupWidth - margin;
    }
    if (top + popupHeight > viewportHeight + scrollY - margin) {
      top = position.y - popupHeight - wordOffset;
    }
    if (top < scrollY + margin) {
      top = scrollY + margin;
    }

    return { left, top };
  };

  const dynamicPosition = getPopupPosition();

  console.log('🎨 Rendering translation helper at position:', dynamicPosition, 'with text:', selectedText);

  return (
    <div
      className="fixed z-[10000] max-w-sm overflow-hidden"
      data-translation-helper
      style={{
        left: `${dynamicPosition.left}px`,
        top: `${dynamicPosition.top}px`,
        maxWidth: '320px',
        pointerEvents: 'auto',
        backgroundColor: themeStyles.cardBackground,
        borderColor: themeStyles.border,
        borderWidth: '1px',
        borderStyle: 'solid',
        borderRadius: '0.5rem',
        boxShadow: themeStyles.theme.name === 'glassmorphism' 
          ? '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
          : themeStyles.theme.name === 'dark'
          ? '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2)'
          : '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        backdropFilter: themeStyles.theme.name === 'glassmorphism' ? 'blur(10px)' : 'none',
      }}
    >
      <Card 
        className="shadow-lg"
        style={{
          backgroundColor: 'transparent',
          border: 'none',
        }}
      >
        <CardContent className="p-3" style={{ backgroundColor: 'transparent' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium" style={{ color: themeStyles.textSecondary }}>
              Translation ({language.toUpperCase()})
            </span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose} 
              className="w-5 h-5 p-0"
              style={{
                color: themeStyles.textSecondary,
                backgroundColor: 'transparent',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = themeStyles.hoverBg;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>

          <div className="space-y-2">
            <p className="text-sm" style={{ color: themeStyles.textPrimary }}>
              "{selectedText}"
            </p>
            
            {isLoading ? (
              <div className="flex items-center gap-2 py-2">
                <div className="w-4 h-4 flex-shrink-0">
                  <LottieLoadingAnimation size="sm" message="" />
                </div>
                <span className="text-xs" style={{ color: themeStyles.textSecondary }}>
                  Translating...
                </span>
              </div>
            ) : translationResult ? (
              <div>
                <p className="text-sm font-medium" style={{ color: themeStyles.buttonPrimary }}>
                  {translationResult.translation}
                </p>
                {translationResult.alternatives && translationResult.alternatives.length > 0 && (
                  <div className="mt-2 pt-2 border-t" style={{ borderColor: themeStyles.border }}>
                    <p className="text-xs mb-1" style={{ color: themeStyles.textSecondary }}>
                      Alternatives:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {translationResult.alternatives.slice(0, 3).map((alt, index) => {
                        const meaning = typeof alt === 'object' && alt !== null && 'meaning' in alt 
                          ? alt.meaning 
                          : String(alt);
                        return (
                          <Badge 
                            key={index}
                            variant="outline" 
                            className="text-xs px-1.5 py-0.5"
                            style={{
                              backgroundColor: themeStyles.hoverBg,
                              color: themeStyles.textPrimary,
                              borderColor: themeStyles.border,
                            }}
                          >
                            {meaning}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs" style={{ color: '#ef4444' }}>
                Translation failed
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TranslationHelper;