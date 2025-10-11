import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, BookPlus, Check, Volume2, VolumeX } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import LottieLoadingAnimation from '@/components/animations/LottieLoadingAnimation';
import VocabAddDialog from './VocabAddDialog';
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
  const [vocabOpen, setVocabOpen] = useState(false);
  const { toast } = useToast();

  // Simple cache to avoid repeated API calls
  const translationCache = useRef<Map<string, TranslationResult>>(new Map());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (selectedText.trim()) {
      fetchTranslation(selectedText.trim());
    }
  }, [selectedText, language]);

  const fetchTranslation = async (text: string) => {
    const cacheKey = `${text.toLowerCase()}-${language}`;
    
    // Check cache first
    const cached = translationCache.current.get(cacheKey);
    if (cached) {
      setTranslationResult(cached);
      return;
    }

    setIsLoading(true);
    try {
      // Use simple translation service
      const { supabase } = await import('@/integrations/supabase/client');
      const { data, error } = await supabase.functions.invoke('translation-service', {
        body: {
          text: text,
          targetLang: language,
          sourceLang: 'auto',
          includeContext: true // Enable full context to get multiple translations and alternatives
        }
      });

      if (error || !data.success) {
        console.warn('Translation service error:', error);
        toast({
          title: "Translation failed",
          description: "Unable to translate at the moment. Please try again.",
          variant: "destructive",
        });
        setTranslationResult(null);
      } else {
        setTranslationResult(data.result);
        // Cache the result
        translationCache.current.set(cacheKey, data.result);
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
        const { data, error } = await supabase.functions.invoke('audio-cache', {
          body: {
            text: selectedText,
            voice_id: 'JBFqnCBsd6RMkjVDRZzb', // ElevenLabs Sarah (Rachel) voice ID
            question_id: `translation-${selectedText}-${Date.now()}`
          }
        });

      if (error) throw error;

      if (data.success && data.audio_url) {
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

  return (
    <div 
      className="fixed z-50 max-w-sm max-h-80 overflow-hidden"
      data-translation-helper
      style={{
        left: `${dynamicPosition.left}px`,
        top: `${dynamicPosition.top}px`,
        maxWidth: '400px',
        maxHeight: '320px',
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
                  <p className="text-sm text-brand-blue font-medium">
                    {translationResult.translation}
                  </p>
                  
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
              ) : null}
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

          {/* Add to Vocab (AI) */}
          {selectedText && (
            <Button
              onClick={() => setVocabOpen(true)}
              className="w-full mt-2 border"
              variant="outline"
              size="sm"
            >
              Add to Vocab (AI)
            </Button>
          )}
          </div>
        </CardContent>
      </Card>
    <VocabAddDialog
      open={vocabOpen}
      onOpenChange={setVocabOpen}
      selectedText={selectedText}
      targetLanguage={'en'}
      nativeLanguage={language || 'en'}
    />
    </div>
  );
};

export default TranslationHelper;