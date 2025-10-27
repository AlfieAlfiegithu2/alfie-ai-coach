import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, BookPlus, Check, Volume2, VolumeX } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import LottieLoadingAnimation from '@/components/animations/LottieLoadingAnimation';
import FallbackTTS from './FallbackTTS';
import MultiAccentTTS from './MultiAccentTTS';

interface TranslationHelperProps {
  selectedText: string;
  position: { x: number; y: number };
  onClose: () => void;
  language: string;
  onSaveStart?: () => void;
}

interface TranslationResult {
  translation: string;
  context?: string;
  alternatives?: Array<{meaning: string; pos: string} | string>;
  grammar_notes?: string;
  simple?: boolean;
}

const TranslationHelper = ({ selectedText, position, onClose, language, onSaveStart }: TranslationHelperProps) => {
  const [translationResult, setTranslationResult] = useState<TranslationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const { toast } = useToast();

  // Enhanced in-memory cache with larger capacity for instant lookups
  const translationCache = useRef<Map<string, TranslationResult>>(new Map());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
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
            action: {
              label: "Setup Guide",
              onClick: () => {
                // Could open a setup guide or redirect to settings
                console.log('User wants to set up translation API');
              }
            }
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

  const playPronunciation = async () => {
    if (isPlayingAudio) {
      // Stop current audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setIsPlayingAudio(false);
      return;
    }

    setIsPlayingAudio(true);
    try {
      // Check if we already have the audio URL
      if (audioUrl) {
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        audio.onended = () => setIsPlayingAudio(false);
        audio.onerror = () => {
          setIsPlayingAudio(false);
          toast({
            title: "Audio playback failed",
            description: "Could not play pronunciation",
            variant: "destructive",
          });
        };
        await audio.play();
        return;
      }

      // Generate audio using ElevenLabs TTS
      console.log('🔊 Requesting pronunciation for:', selectedText);

      let data, error;
      try {
        const response = await supabase.functions.invoke('audio-cache', {
          body: {
            text: selectedText,
            voice_id: 'JBFqnCBsd6RMkjVDRZzb', // ElevenLabs Sarah (Rachel) voice ID
            question_id: `translation-${selectedText}-${Date.now()}`
          }
        });
        data = response.data;
        error = response.error;
      } catch (err) {
        console.error('Audio service error:', err);
        error = err;
      }

      if (error) throw error;

      if (data.success && data.audio_url) {
        console.log('🔊 Audio generated successfully:', data.audio_url);
        setAudioUrl(data.audio_url);
        const audio = new Audio(data.audio_url);
        audioRef.current = audio;
        audio.onended = () => setIsPlayingAudio(false);
        audio.onerror = () => {
          setIsPlayingAudio(false);
          toast({
            title: "Audio playback failed",
            description: "Could not play pronunciation",
            variant: "destructive",
          });
        };
        await audio.play();
      } else {
        console.warn('Audio service response:', { data, error });
        throw new Error('No audio URL received');
      }
    } catch (error: any) {
      console.error('Pronunciation error:', error);
      setIsPlayingAudio(false);
      
      // Provide more specific error message
      let errorMessage = "Could not generate pronunciation";
      if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      toast({
        title: "Pronunciation failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // Calculate dynamic positioning to keep popup on screen and next to word
  const getPopupPosition = () => {
    const popupWidth = 400; // max-w-sm is about 400px
    const popupHeight = 300; // increased for better estimation
    const margin = 20; // increased margin from screen edges
    const wordOffset = 15; // offset from the selected word

    // Get viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const scrollY = window.scrollY;

    let left = position.x;
    let top = position.y;

    // Try to position to the right of the word first
    left = position.x + wordOffset;

    // Check if there's enough space on the right
    if (left + popupWidth > viewportWidth - margin) {
      // Try to position to the left of the word
      left = position.x - popupWidth - wordOffset;
      
      // If still doesn't fit on the left, center it horizontally
      if (left < margin) {
        left = Math.max(margin, (viewportWidth - popupWidth) / 2);
      }
    }

    // Ensure it doesn't go off the left edge
    if (left < margin) {
      left = margin;
    }

    // Ensure it doesn't go off the right edge
    if (left + popupWidth > viewportWidth - margin) {
      left = viewportWidth - popupWidth - margin;
    }

    // Position below the word by default
    top = position.y + wordOffset;

    // Check if there's enough space below
    if (top + popupHeight > viewportHeight + scrollY - margin) {
      // Position above the word instead
      top = position.y - popupHeight - wordOffset;
      
      // If still doesn't fit above, try to center it vertically
      if (top < scrollY + margin) {
        top = Math.max(scrollY + margin, (viewportHeight - popupHeight) / 2 + scrollY);
      }
    }

    // Final bounds check to ensure it's always visible
    left = Math.max(margin, Math.min(left, viewportWidth - popupWidth - margin));
    top = Math.max(scrollY + margin, Math.min(top, viewportHeight + scrollY - popupHeight - margin));

    return { left, top };
  };

  const saveToWordBook = async (event?: React.MouseEvent) => {
    if (!translationResult || isSaving || isSaved) return;
    
    // Prevent event bubbling and default behavior
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    
    // Clear text selection immediately to prevent re-triggering
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
    }
    
    // Notify parent that save is starting
    onSaveStart?.();
    
    setIsSaving(true);
    console.log('🔄 Saving word to book:', { 
      word: selectedText.trim(), 
      translation: translationResult.translation,
      hasContext: !!translationResult.context 
    });
    
    try {
      // Prepare all translations (main + alternatives)
      const allTranslations = [translationResult.translation];
      if (translationResult.alternatives && translationResult.alternatives.length > 0) {
        const meanings = translationResult.alternatives.map(alt => 
          typeof alt === 'object' && alt.meaning ? alt.meaning : String(alt)
        );
        allTranslations.push(...meanings);
      }
      
      const { data, error } = await supabase.functions.invoke('add-to-word-book', {
        body: {
          word: selectedText.trim(),
          part_of_speech: null, // We don't have part of speech from translation
          translations: allTranslations // Send all translations including alternatives
        }
      });

      console.log('💾 Save word response:', { data, error });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(error.message || 'Network error occurred');
      }

      if (data?.success) {
        setIsSaved(true);
        toast({
          title: "✅ Word Saved!",
          description: `"${selectedText}" has been added to your Word Book.`,
          duration: 3000,
        });
        
        // Close popup after showing success
        setTimeout(() => {
          onClose();
        }, 1500);
      } else if (data?.error === 'already_exists') {
        toast({
          title: "Already in Word Book",
          description: `"${selectedText}" is already saved in your Word Book.`,
          duration: 3000,
        });
        // Don't set as saved since it wasn't actually saved now
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        throw new Error(data?.error || 'Failed to save word');
      }
    } catch (error) {
      console.error('❌ Error saving word:', error);
      toast({
        title: "Failed to Save Word",
        description: error.message || `Could not save "${selectedText}". Please try again.`,
        variant: "destructive",
        duration: 4000,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const dynamicPosition = getPopupPosition();

  console.log('🎨 Rendering translation helper at position:', dynamicPosition, 'with text:', selectedText);

  return (
    <div
      className="fixed z-50 max-w-sm max-h-80 overflow-hidden"
      data-translation-helper
      style={{
        left: `${dynamicPosition.left}px`,
        top: `${dynamicPosition.top}px`,
        maxWidth: '400px',
        maxHeight: '320px',
        pointerEvents: 'auto',
        backgroundColor: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '0.5rem',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      }}
    >
      <Card className="glass-effect shadow-lg border-border/20">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-text-primary">Translation</span>
              <Badge variant="secondary" className="text-xs">
                {language.toUpperCase()}
              </Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="w-6 h-6 p-0">
              <X className="w-3 h-3" />
            </Button>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            <div className="bg-surface-2 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium text-text-primary">
                  "{selectedText}"
                </p>
                <FallbackTTS 
                  text={selectedText}
                  onPlay={() => setIsPlayingAudio(true)}
                  onStop={() => setIsPlayingAudio(false)}
                  className="mr-2"
                />
                <MultiAccentTTS
                  text={selectedText}
                  onPlay={() => setIsPlayingAudio(true)}
                  onStop={() => setIsPlayingAudio(false)}
                />
              </div>
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 mr-2">
                    <LottieLoadingAnimation size="sm" message="" />
                  </div>
                  <span className="text-xs text-text-secondary">Translating...</span>
                </div>
              ) : translationResult ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-brand-blue font-medium">
                      {translationResult.translation}
                    </p>
                    {translationResult.simple && (
                      <Badge variant="outline" className="text-xs px-1.5 py-0.5 bg-yellow-50 text-yellow-700 border-yellow-200">
                        Basic
                      </Badge>
                    )}
                  </div>

                  {translationResult.alternatives && translationResult.alternatives.length > 0 && (
                    <div className="text-xs space-y-2">
                      <p className="text-text-secondary font-medium">Alternative meanings:</p>
                      <div className="space-y-1">
                        {translationResult.alternatives.map((alt, index) => {
                          const isObjectAlt = typeof alt === 'object' && alt !== null && 'meaning' in alt;
                          const meaning = isObjectAlt ? alt.meaning : String(alt);
                          const pos = isObjectAlt ? alt.pos : null;

                          return (
                            <div key={index} className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="text-xs px-2 py-0.5 bg-surface-1">
                                {meaning}
                              </Badge>
                              {pos && (
                                <Badge variant="secondary" className="text-xs px-1.5 py-0 text-text-tertiary bg-surface-3">
                                  {pos}
                                </Badge>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-500">Translation failed</span>
                </div>
              )}
            </div>
            
            {/* Add to Word Book Button */}
            {translationResult && (
              <Button
                onClick={(e) => saveToWordBook(e)}
                disabled={isSaving || isSaved}
                className={`w-full mt-3 transition-all ${
                  isSaved 
                    ? 'bg-green-600 hover:bg-green-600 text-white' 
                    : 'bg-brand-blue hover:bg-brand-blue/90 text-white'
                }`}
                size="sm"
              >
                {isSaving ? (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 mr-2">
                      <LottieLoadingAnimation size="sm" message="" />
                    </div>
                    <span>Saving...</span>
                  </div>
                ) : isSaved ? (
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    <span>Added to Word Book</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <BookPlus className="w-4 h-4" />
                    <span>Add to Word Book</span>
                  </div>
                )}
              </Button>
            )}

          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TranslationHelper;