import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { X, CirclePlus, Check, Loader2 } from 'lucide-react';
import DotLottieLoadingAnimation from '@/components/animations/DotLottieLoadingAnimation';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface TranslationPopupProps {
  selectedText: string;
  position: { x: number; y: number };
  onClose: () => void;
  targetLanguage: string;
}

interface TranslationResult {
  translation: string;
  alternatives?: Array<{ meaning: string; pos?: string } | string>;
  pos?: string;
  ipa?: string;
  englishIpa?: string; // English IPA pronunciation
  context?: string;
}

export default function TranslationPopup({ 
  selectedText, 
  position, 
  onClose, 
  targetLanguage 
}: TranslationPopupProps) {
  const [translation, setTranslation] = useState<TranslationResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [viewportSize, setViewportSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const { toast } = useToast();
  const { user } = useAuth();


  // Update viewport size on resize
  useEffect(() => {
    const handleResize = () => {
      setViewportSize({ width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch English IPA pronunciation with timeout (silent - IPA is optional)
  const fetchEnglishIPA = async (word: string): Promise<string | null> => {
    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('IPA fetch timeout')), 3000)
      );

      const fetchPromise = supabase.functions.invoke('translation-service', {
        body: {
          text: word,
          sourceLang: 'en',
          targetLang: 'en',
          includeContext: true
        }
      });

      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any;

      if (error || !data?.success) return null;
      
      return data?.result?.ipa || null;
    } catch (error) {
      // Silently fail - IPA is optional and not critical
      // Don't log errors for timeouts or network issues
      return null;
    }
  };

  // Fetch translation on mount
  useEffect(() => {
    const fetchTranslation = async () => {
      if (!selectedText) return;
      
      // If target language is English, show definition instead
      if (targetLanguage === 'en') {
        try {
          setIsLoading(true);
          console.log('📖 Fetching definition for:', selectedText);
          
          const { data, error } = await supabase.functions.invoke('translation-service', {
            body: {
              text: selectedText,
              sourceLang: 'en',
              targetLang: 'en',
              includeContext: true
            }
          });

          console.log('📥 Definition response:', { data, error });

          if (error) throw error;

          if (data?.success && data?.result) {
            setTranslation(data.result);
          } else {
            // Fallback: show simple message
            setTranslation({
              translation: selectedText,
              alternatives: [],
              context: 'Definition not available'
            });
          }
        } catch (error: any) {
          console.error('❌ Definition error:', error);
          // Fallback: show the word itself
          setTranslation({
            translation: selectedText,
            alternatives: []
          });
        } finally {
          setIsLoading(false);
        }
        return;
      }
      
      try {
        setIsLoading(true);
        console.log('🌐 Fetching translation for:', selectedText, 'to', targetLanguage);
        
        // Increased timeout to handle slower API responses
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Translation request timeout')), 15000)
        );

        // Fetch translation with timeout
        const translationPromise = supabase.functions.invoke('translation-service', {
          body: {
            text: selectedText,
            sourceLang: 'auto',
            targetLang: targetLanguage,
            includeContext: true
          }
        }).catch((err) => {
          // Handle connection errors gracefully
          console.error('❌ Translation service connection error:', err);
          throw new Error(`Connection error: ${err.message || 'Network error'}`);
        });

        const translationData = await Promise.race([translationPromise, timeoutPromise]) as any;
        const { data, error } = translationData;
        console.log('📥 Translation response:', { data, error });

        if (error) {
          console.error('❌ Translation service error:', error);
          throw error;
        }

        if (data?.success && data?.result) {
          console.log('✅ Translation received:', data.result);
          
          // Handle simple translation response (from cache)
          if (data.result.simple && typeof data.result.translation === 'string') {
            console.log('⚠️ Got cached simple translation, fetching full details...');
            
            // Immediately fetch full details (don't show incomplete cached version)
            // This ensures we always show POS, IPA, and alternatives when available
            const fetchFullDetails = async () => {
              try {
                console.log('🔄 Fetching full translation details with bypassCache...');
                const fullDetailsPromise = supabase.functions.invoke('translation-service', {
                  body: {
                    text: selectedText,
                    sourceLang: 'auto',
                    targetLang: targetLanguage,
                    includeContext: true,
                    bypassCache: true // Bypass cache to get full details with alternatives
                  }
                }).catch((err) => {
                  // Handle connection errors gracefully
                  console.error('❌ Full details connection error:', err);
                  throw new Error(`Connection error: ${err.message || 'Network error'}`);
                });
                
                const timeoutPromise = new Promise((_, reject) => 
                  setTimeout(() => reject(new Error('Full details timeout')), 15000)
                );
                
                const fullDetailsData = await Promise.race([fullDetailsPromise, timeoutPromise]) as any;
                
                console.log('📥 Full details response:', fullDetailsData);
                
                // Check if we got full details
                if (fullDetailsData?.data?.success && fullDetailsData.data.result) {
                  const result = fullDetailsData.data.result;
                  
                  console.log('📊 Full details result structure:', {
                    hasTranslation: !!result.translation,
                    hasAlternatives: !!result.alternatives,
                    alternativesType: Array.isArray(result.alternatives) ? 'array' : typeof result.alternatives,
                    alternativesLength: Array.isArray(result.alternatives) ? result.alternatives.length : 0,
                    hasPos: !!result.pos,
                    hasIpa: !!result.ipa,
                    isSimple: result.simple
                  });
                  
                  // Process alternatives - handle both string arrays and object arrays
                  let processedAlternatives: Array<{ meaning: string; pos?: string } | string> = [];
                  if (result.alternatives && Array.isArray(result.alternatives)) {
                    processedAlternatives = result.alternatives.map((alt: any) => {
                      if (typeof alt === 'string') {
                        return alt;
                      } else if (alt && typeof alt === 'object' && alt.meaning) {
                        return { meaning: alt.meaning, pos: alt.pos };
                      } else if (alt && typeof alt === 'object' && alt.translation) {
                        return alt.translation;
                      }
                      return null;
                    }).filter((alt: any) => alt !== null);
                  }
                  
                  console.log('✅ Processed alternatives:', processedAlternatives);
                  
                  // If it's still simple but has some data, use what we have
                  if (result.simple) {
                    console.log('⚠️ Response still marked as simple, but using available data...');
                    setTranslation({
                      translation: result.translation || data.result.translation,
                      alternatives: processedAlternatives,
                      pos: result.pos || undefined,
                      ipa: result.ipa || undefined,
                      context: result.context || undefined,
                      englishIpa: undefined
                    });
                  } else {
                    // Full details received
                    console.log('✅ Full translation details received:', {
                      translation: result.translation,
                      alternativesCount: processedAlternatives.length,
                      pos: result.pos,
                      ipa: result.ipa
                    });
                    const fullTranslation = {
                      translation: result.translation || data.result.translation,
                      alternatives: processedAlternatives,
                      pos: result.pos || undefined,
                      ipa: result.ipa || undefined,
                      context: result.context || undefined,
                      englishIpa: undefined
                    };
                    setTranslation(fullTranslation);
                    
                    // Cache the translation in sessionStorage for fallback
                    try {
                      const cacheKey = `${selectedText.toLowerCase()}-${targetLanguage}`;
                      sessionStorage.setItem(`translation_${cacheKey}`, JSON.stringify(fullTranslation));
                    } catch (e) {
                      // Ignore storage errors
                    }
                  }
                  
                  // Fetch English IPA in background
                  fetchEnglishIPA(selectedText).then(ipa => {
                    if (ipa) {
                      setTranslation(prev => prev ? { ...prev, englishIpa: ipa } : null);
                    }
                  }).catch(() => {});
                } else {
                  // Fallback: use cached translation but try to get IPA
                  console.log('⚠️ Full details fetch failed, using cached translation');
                  setTranslation({
                    translation: data.result.translation,
                    alternatives: [],
                    englishIpa: undefined
                  });
                  
                  fetchEnglishIPA(selectedText).then(ipa => {
                    if (ipa) {
                      setTranslation(prev => prev ? { ...prev, englishIpa: ipa } : null);
                    }
                  }).catch(() => {});
                }
              } catch (error: any) {
                console.error('❌ Error fetching full details:', error);
                
                const errorMessage = error?.message || String(error) || 'Unknown error';
                const isTimeout = errorMessage.includes('timeout') || errorMessage.includes('Timeout');
                const isConnectionError = errorMessage.includes('ERR_CONNECTION_RESET') || 
                                          errorMessage.includes('Connection error') ||
                                          errorMessage.includes('NetworkError') ||
                                          errorMessage.includes('Failed to fetch');
                
                // Try to use sessionStorage cache as fallback
                if (isTimeout || isConnectionError) {
                  try {
                    const cacheKey = `${selectedText.toLowerCase()}-${targetLanguage}`;
                    const cached = sessionStorage.getItem(`translation_${cacheKey}`);
                    if (cached) {
                      const cachedData = JSON.parse(cached);
                      console.log('✅ Using cached translation for full details fallback:', cachedData);
                      setTranslation({
                        translation: cachedData.translation || data.result.translation,
                        alternatives: cachedData.alternatives || [],
                        pos: cachedData.pos,
                        ipa: cachedData.ipa,
                        englishIpa: undefined
                      });
                      setIsLoading(false);
                      return;
                    }
                  } catch (cacheError) {
                    console.log('⚠️ Could not read cache:', cacheError);
                  }
                }
                
                // Fallback: use cached simple translation
                setTranslation({
                  translation: data.result.translation,
                  alternatives: [],
                  englishIpa: undefined
                });
                
                // Try IPA as last resort
                fetchEnglishIPA(selectedText).then(ipa => {
                  if (ipa) {
                    setTranslation(prev => prev ? { ...prev, englishIpa: ipa } : null);
                  }
                }).catch(() => {});
              } finally {
                setIsLoading(false);
              }
            };
            
            // Fetch full details immediately (keep loading state until we get full details)
            fetchFullDetails();
            return; // Don't set loading to false here, let fetchFullDetails handle it
          } else {
            // Full translation response - show immediately, fetch IPA in background
            const result = data.result;
            
            // Process alternatives - handle both string arrays and object arrays
            let processedAlternatives: Array<{ meaning: string; pos?: string } | string> = [];
            if (result.alternatives && Array.isArray(result.alternatives)) {
              processedAlternatives = result.alternatives.map((alt: any) => {
                if (typeof alt === 'string') {
                  return alt;
                } else if (alt && typeof alt === 'object' && alt.meaning) {
                  return { meaning: alt.meaning, pos: alt.pos };
                } else if (alt && typeof alt === 'object' && alt.translation) {
                  return alt.translation;
                }
                return null;
              }).filter((alt: any) => alt !== null);
            }
            
            console.log('✅ Non-cached translation received:', {
              translation: result.translation,
              alternativesCount: processedAlternatives.length,
              alternatives: processedAlternatives,
              pos: result.pos,
              ipa: result.ipa
            });
            
            const fullTranslation = {
              translation: result.translation,
              alternatives: processedAlternatives,
              pos: result.pos || undefined,
              ipa: result.ipa || undefined,
              context: result.context || undefined,
              englishIpa: undefined
            };
            setTranslation(fullTranslation);
            
            // Cache the translation in sessionStorage for fallback
            try {
              const cacheKey = `${selectedText.toLowerCase()}-${targetLanguage}`;
              sessionStorage.setItem(`translation_${cacheKey}`, JSON.stringify(fullTranslation));
            } catch (e) {
              // Ignore storage errors
            }
            
            // Fetch English IPA in background (non-blocking, optional)
            fetchEnglishIPA(selectedText).then(ipa => {
              if (ipa) {
                setTranslation(prev => prev ? { ...prev, englishIpa: ipa } : null);
              }
            }).catch(() => {
              // Silently fail - IPA is optional
            });
          }
        } else {
          console.error('❌ Translation failed:', data);
          throw new Error(data?.error || 'Translation failed');
        }
      } catch (error: any) {
        console.error('❌ Translation error:', error);
        
        const errorMessage = error?.message || String(error) || 'Unknown error';
        const isTimeout = errorMessage.includes('timeout') || errorMessage.includes('Timeout');
        const isConnectionError = errorMessage.includes('ERR_CONNECTION_RESET') || 
                                  errorMessage.includes('Connection error') ||
                                  errorMessage.includes('NetworkError') ||
                                  errorMessage.includes('Failed to fetch');
        
        // For timeouts or connection errors, try to use cached translation if available
        if (isTimeout || isConnectionError) {
          console.warn('⚠️ Translation timeout/connection error, checking cache...');
          
          // Try to get cached translation from sessionStorage as fallback
          try {
            const cacheKey = `${selectedText.toLowerCase()}-${targetLanguage}`;
            const cached = sessionStorage.getItem(`translation_${cacheKey}`);
            if (cached) {
              const cachedData = JSON.parse(cached);
              console.log('✅ Using cached translation:', cachedData);
              setTranslation({
                translation: cachedData.translation || selectedText,
                alternatives: cachedData.alternatives || [],
                pos: cachedData.pos,
                ipa: cachedData.ipa,
                englishIpa: undefined
              });
              setIsLoading(false);
              return;
            }
          } catch (cacheError) {
            console.log('⚠️ Could not read cache:', cacheError);
          }
          
          // If no cache, show the word itself as fallback
          console.warn('Translation timeout/connection error, showing fallback');
          setTranslation({
            translation: selectedText,
            alternatives: [],
            englishIpa: undefined
          });
        } else {
          // For other errors, show error toast
          toast({
            title: 'Translation Error',
            description: errorMessage,
            variant: 'destructive'
          });
          setTranslation(null);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchTranslation();
  }, [selectedText, targetLanguage, toast]);

  const handleAddToWordbook = async () => {
    if (!user) {
      toast({
        title: 'Login Required',
        description: 'Please log in to add words to your wordbook',
        variant: 'destructive'
      });
      return;
    }

    if (!translation) return;

    setIsSaving(true);
    try {
      // Prepare alternatives array
      const alternatives = translation.alternatives?.map(alt => {
        if (typeof alt === 'string') {
          return alt;
        }
        return alt.meaning || '';
      }).filter(Boolean) || [];

      // Check if word already exists in user_vocabulary (normalized comparison)
      // Normalize the term for comparison (trim + lowercase)
      const normalizedTerm = selectedText.trim().toLowerCase();
      
      // Check if word already exists in user_vocabulary
      const { data: existing } = await supabase
        .from('user_vocabulary')
        .select('id, word')
        .eq('user_id', user.id);
      
      // Check if any existing word matches the normalized term
      const isDuplicate = existing?.some(item => {
          if (!item?.word) return false;
          return item.word.trim().toLowerCase() === normalizedTerm;
        });
      
      if (isDuplicate) {
        toast({
          title: 'Already Saved',
          description: 'This word is already in your wordbook',
        });
        setIsSaved(true);
        return;
      }

      // Prepare translations array
      const translationsArray = [
        translation.translation,
        ...alternatives.map(alt => typeof alt === 'string' ? alt : (alt as any)?.meaning).filter(Boolean)
      ].filter((t, idx, arr) => arr.indexOf(t) === idx); // Remove duplicates

      // Add to user_vocabulary table (matches MyWordBook.tsx structure)
      const { error: insertError } = await supabase
        .from('user_vocabulary')
        .insert({
          user_id: user.id,
          word: normalizedTerm,
          translations: translationsArray,
          part_of_speech: translation.pos || null,
        });

      if (insertError) {
        console.error('Insert error details:', insertError);
        throw insertError;
      }

      setIsSaved(true);
      toast({
        title: 'Word Added',
        description: `"${selectedText}" has been added to your wordbook`,
      });
    } catch (error: any) {
      console.error('Save error:', error);
      toast({
        title: 'Save Failed',
        description: error.message || 'Failed to save word to wordbook',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Language-specific styling (container width and font sizes)
  const getLanguageStyles = (lang: string) => {
    // Languages with complex scripts that need slightly larger fonts
    const complexScripts = ['ar', 'he', 'fa', 'ur', 'ps', 'hi', 'bn', 'ta', 'te', 'mr', 'gu', 'kn', 'ml', 'pa', 'or', 'as', 'th', 'my', 'km', 'si', 'ne'];
    
    const isComplex = complexScripts.includes(lang);
    
    return {
      width: 280, // Compact size
      fontSize: {
        original: 'text-base', // Bigger font for original word
        translation: isComplex ? 'text-sm' : 'text-sm', // Same size for all translations
        ipa: 'text-xs'
      },
      lineHeight: isComplex ? 'leading-relaxed' : 'leading-normal'
    };
  };

  const langStyles = getLanguageStyles(targetLanguage);
  const popupWidth = langStyles.width;
  const popupHeight = 300; // Compact max height
  const padding = 16; // Padding from viewport edges
  
  const left = Math.max(
    padding,
    Math.min(position.x - popupWidth / 2, viewportSize.width - popupWidth - padding)
  );
  
  const top = Math.max(
    padding,
    Math.min(position.y, viewportSize.height - popupHeight - padding)
  );

  const popupStyle: React.CSSProperties = {
    position: 'fixed',
    left: `${left}px`,
    top: `${top}px`,
    zIndex: 9999,
    width: `${popupWidth}px`,
    maxHeight: isLoading ? 'none' : `${viewportSize.height - padding * 2}px`,
    overflowY: isLoading ? 'visible' : 'auto',
    overflowX: 'visible'
  };

  // Check if selected text is a sentence (multiple words) or single word
  const isSentence = selectedText.trim().split(/\s+/).length > 1;
  
  // Collect all translations grouped by POS
  const primaryTranslation = translation?.translation || '';
  const primaryPOS = translation?.pos || '';
  
  // Group all translations by POS (normalize POS to lowercase for consistent grouping)
  const translationsByPOS: Record<string, string[]> = {};
  
  // Normalize POS key for consistent grouping
  const normalizePOS = (pos: string | undefined): string => {
    if (!pos) return '';
    return pos.toLowerCase().trim();
  };
  
  const normalizedPrimaryPOS = normalizePOS(primaryPOS);
  
  // Add primary translation to its POS group (for both words and sentences)
  if (primaryTranslation) {
    const posKey = normalizedPrimaryPOS;
    if (!translationsByPOS[posKey]) {
      translationsByPOS[posKey] = [];
    }
    if (!translationsByPOS[posKey].includes(primaryTranslation)) {
      translationsByPOS[posKey].push(primaryTranslation);
    }
  }
  
  // Group alternatives by POS (for both words and sentences if alternatives exist)
  console.log('🔍 Processing alternatives:', {
    hasAlternatives: !!translation?.alternatives,
    alternativesLength: translation?.alternatives?.length || 0,
    alternatives: translation?.alternatives
  });
  
  if (translation?.alternatives && translation.alternatives.length > 0) {
    translation.alternatives.forEach((alt, idx) => {
      const meaning = typeof alt === 'string' ? alt : (alt as any)?.meaning;
      const altPOS = typeof alt === 'object' && (alt as any)?.pos ? normalizePOS((alt as any).pos) : normalizedPrimaryPOS;
      
      console.log(`  Alternative ${idx}:`, { meaning, altPOS, alt });
      
      if (meaning && meaning !== primaryTranslation) { // Don't duplicate primary translation
        const posKey = altPOS || normalizedPrimaryPOS;
        if (!translationsByPOS[posKey]) {
          translationsByPOS[posKey] = [];
        }
        if (!translationsByPOS[posKey].includes(meaning)) {
          translationsByPOS[posKey].push(meaning);
          console.log(`  ✅ Added "${meaning}" to POS group "${posKey}"`);
        } else {
          console.log(`  ⏭️ Skipped duplicate "${meaning}"`);
        }
      }
    });
  }
  
  console.log('📊 Final translationsByPOS:', translationsByPOS);
  
  // Clean up empty POS groups
  Object.keys(translationsByPOS).forEach(pos => {
    if (translationsByPOS[pos].length === 0) {
      delete translationsByPOS[pos];
    }
  });
  
  // Get all POS in order: primary first, then others alphabetically
  // Use original POS format (not normalized) for display
  const allPOS = normalizedPrimaryPOS && translationsByPOS[normalizedPrimaryPOS]
    ? [primaryPOS || normalizedPrimaryPOS, ...Object.keys(translationsByPOS).filter(pos => normalizePOS(pos) !== normalizedPrimaryPOS).sort()]
    : Object.keys(translationsByPOS).sort();

  return (
    <div className="fixed inset-0 z-[9998]" onClick={onClose}>
      <Card 
        style={popupStyle} 
        onClick={(e) => e.stopPropagation()} 
        className={`bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-2xl border border-white/60 dark:border-slate-700/60 shadow-lg animate-fade-in animate-slide-up ${isLoading ? 'overflow-visible' : ''}`}
      >
        <CardHeader className="pb-2 px-3 pt-3 relative">
          {/* Close button - absolute positioned */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="absolute top-3 right-3 h-6 w-6 p-0 hover:bg-white/60 dark:hover:bg-slate-800/60 rounded-lg text-slate-400 dark:text-slate-500"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
          {/* Original word - centered */}
          <div className="text-center animate-fade-in">
            <p className={`text-slate-900 dark:text-slate-100 ${langStyles.fontSize.original} font-semibold ${langStyles.lineHeight}`}>
              {selectedText}
            </p>
            {/* POS and IPA underneath original word - only show if available */}
            <div className="space-y-0.5 mt-0.5">
              {/* Show POS only if it exists and is not empty */}
              {primaryPOS && primaryPOS.trim() !== '' && (
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {primaryPOS}
                </p>
              )}
              {/* Show IPA only if English IPA is available (don't show source language IPA) */}
              {translation?.englishIpa && (
                <p className={`text-xs text-slate-500 dark:text-slate-500 font-mono`}>
                  /{translation.englishIpa}/
                </p>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-3 pb-3 pt-4 overflow-visible">
          {isLoading ? (
            <div className="flex items-center justify-center py-4 overflow-visible relative" style={{ minHeight: '120px' }}>
              <div className="absolute inset-0 flex items-center justify-center overflow-visible">
                <DotLottieLoadingAnimation 
                  message="Translating..."
                  subMessage=""
                  size={120}
                />
              </div>
            </div>
          ) : translation ? (
            <>
              {/* Translations section with better spacing - centered */}
              <div className="space-y-3 min-h-[60px] flex flex-col justify-center text-center relative">
                {/* Show translations grouped by POS */}
                {Object.keys(translationsByPOS).length > 0 ? (
                  allPOS.map((pos, posIdx) => {
                    // Use normalized POS key for lookup since translationsByPOS uses normalized keys
                    const normalizedPosKey = normalizePOS(pos);
                    const meanings = translationsByPOS[normalizedPosKey] || [];
                    if (meanings.length === 0) return null;
                    
                    // Show POS label for all POS groups (except the first one which is shown in header)
                    // All POS labels use the same default text styling (no pill)
                    const showPOSLabel = allPOS.length > 1 && pos && pos.trim() !== '' && posIdx > 0;
                    const isLastPOS = posIdx === allPOS.length - 1;
                    const lastMeaningIdx = meanings.length - 1;
                    
                    return (
                      <div 
                        key={pos} 
                        className="space-y-1.5 animate-fade-in"
                        style={{ 
                          animationDelay: `${posIdx * 0.1}s`,
                          animationFillMode: 'both'
                        }}
                      >
                        {showPOSLabel && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium animate-slide-up">
                            {pos}
                          </p>
                        )}
                        {meanings.map((meaning, idx) => {
                          const isLastMeaning = isLastPOS && idx === lastMeaningIdx;
                          return (
                            <div 
                              key={`${pos}-${idx}`}
                              className="relative w-full flex items-center justify-center animate-slide-up"
                              style={{ 
                                animationDelay: `${(posIdx * 0.1) + (idx * 0.05)}s`,
                                animationFillMode: 'both'
                              }}
                            >
                              <p className={`text-slate-700 dark:text-slate-300 ${langStyles.fontSize.translation} font-normal ${langStyles.lineHeight} text-center`}>
                                {meaning}
                              </p>
                              {/* Add to Wordbook button - right corner, same row as last translation */}
                              {user && !isSentence && isLastMeaning && (
                                <div className="absolute right-0 top-1/2 -translate-y-1/2">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <button
                                          onClick={handleAddToWordbook}
                                          disabled={isSaving || isSaved}
                                          className="h-5 w-5 text-slate-400 dark:text-slate-500 hover:text-primary dark:hover:text-primary transition-all hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center flex-shrink-0"
                                        >
                                          {isSaved ? (
                                            <Check className="h-4 w-4" />
                                          ) : isSaving ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                          ) : (
                                            <CirclePlus className="h-4 w-4" />
                                          )}
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="text-xs z-[10000]">
                                        {isSaved ? 'Added to Wordbook' : isSaving ? 'Adding...' : 'Add to Wordbook'}
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })
                ) : (
                  /* Fallback: show primary translation if no POS grouping */
                  <div 
                    className="relative w-full flex items-center justify-center animate-fade-in animate-slide-up"
                    style={{ 
                      animationDelay: '0.1s',
                      animationFillMode: 'both'
                    }}
                  >
                    <p className={`text-slate-700 dark:text-slate-300 ${langStyles.fontSize.translation} font-normal ${langStyles.lineHeight} text-center`}>
                      {primaryTranslation}
                    </p>
                    {/* Add to Wordbook button - right corner, same row as translation */}
                    {user && !isSentence && (
                      <div className="absolute right-0 top-1/2 -translate-y-1/2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={handleAddToWordbook}
                                disabled={isSaving || isSaved}
                                className="h-5 w-5 text-slate-400 dark:text-slate-500 hover:text-primary dark:hover:text-primary transition-all hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center flex-shrink-0"
                              >
                                {isSaved ? (
                                  <Check className="h-4 w-4" />
                                ) : isSaving ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <CirclePlus className="h-4 w-4" />
                                )}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs z-[10000]">
                              {isSaved ? 'Added to Wordbook' : isSaving ? 'Adding...' : 'Add to Wordbook'}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="py-6 text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400">Translation not available</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

