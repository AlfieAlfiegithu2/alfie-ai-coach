import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Plus, Check, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface ComparisonSpan {
  text: string;
  status: "error" | "improvement" | "neutral";
}

interface VocabularyWord {
  word: string;
  translation: string;
  partOfSpeech?: string;
  context?: string;
}

interface WritingVocabularyDisplayProps {
  improvementSpans: ComparisonSpan[];
  title?: string;
  currentTheme?: any;
}

const WritingVocabularyDisplay: React.FC<WritingVocabularyDisplayProps> = ({
  improvementSpans,
  title = "Useful Vocabulary",
  currentTheme
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [addingWords, setAddingWords] = useState<Set<string>>(new Set());
  const [userLanguage, setUserLanguage] = useState<string>('en');

  // Get user's preferred language for translations
  useEffect(() => {
    const loadUserLanguage = async () => {
      if (!user) return;

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('native_language')
          .eq('id', user.id)
          .single();

        if (profile?.native_language) {
          // Normalize language code (e.g., "ko" instead of "Korean")
          const normalizedLang = profile.native_language.length > 2 ?
            profile.native_language.substring(0, 2).toLowerCase() :
            profile.native_language.toLowerCase();
          setUserLanguage(normalizedLang);
        }

        // Also check user_preferences for preferred_feedback_language
        const { data: preferences } = await supabase
          .from('user_preferences')
          .select('preferred_feedback_language')
          .eq('user_id', user.id)
          .maybeSingle();

        if (preferences?.preferred_feedback_language) {
          // Normalize language code
          const normalizedLang = preferences.preferred_feedback_language.length > 2 ?
            preferences.preferred_feedback_language.substring(0, 2).toLowerCase() :
            preferences.preferred_feedback_language.toLowerCase();
          setUserLanguage(normalizedLang);
        }
      } catch (error) {
        console.warn('Error loading user language:', error);
      }
    };

    loadUserLanguage();
  }, [user]);

  // Extract vocabulary words from improvement spans
  const vocabularyWords = useMemo(() => {
    const words = new Set<string>();

    improvementSpans.forEach(span => {
      if (span.status === 'improvement') {
        // Split the improved text into words and filter for meaningful vocabulary
        const textWords = span.text.toLowerCase()
          .replace(/[^\w\s'-]/g, ' ') // Remove punctuation except apostrophes and hyphens
          .split(/\s+/)
          .filter(word => {
            const cleanWord = word.trim();
            return cleanWord.length >= 3 && // At least 3 characters
                   !/^\d+$/.test(cleanWord) && // Not just numbers
                   !/^[^a-z]*$/.test(cleanWord) && // Contains at least one letter
                   !['the', 'and', 'but', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'has', 'let', 'put', 'say', 'she', 'too', 'use'].includes(cleanWord.toLowerCase()); // Filter out common words
          });

        textWords.forEach(word => words.add(word.trim()));
      }
    });

    return Array.from(words).slice(0, 10); // Limit to 10 words max
  }, [improvementSpans]);

  // Get translations for vocabulary words
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [translationCache, setTranslationCache] = useState<Record<string, string>>({});

  useEffect(() => {
    const getTranslations = async () => {
      if (vocabularyWords.length === 0 || !userLanguage || userLanguage === 'en') {
        // No translation needed for English
        const englishTranslations: Record<string, string> = {};
        vocabularyWords.forEach(word => {
          englishTranslations[word] = word; // Same word for English
        });
        setTranslations(englishTranslations);
        return;
      }

      // Check cache first for already translated words
      const cachedTranslations: Record<string, string> = {};
      const wordsToTranslate: string[] = [];

      vocabularyWords.forEach(word => {
        const cacheKey = `${word}_${userLanguage}`;
        if (translationCache[cacheKey]) {
          cachedTranslations[word] = translationCache[cacheKey];
        } else {
          wordsToTranslate.push(word);
        }
      });

      // If all words are cached, use cached translations
      if (wordsToTranslate.length === 0) {
        setTranslations({ ...cachedTranslations });
        return;
      }

      setLoading(true);
      try {
        // Try to get translations from vocab_translations table first
        const { data: translationData } = await supabase
          .from('vocab_translations')
          .select('card_id, lang, translations')
          .in('lang', [userLanguage]);

        const translationMap: Record<string, string> = {};

        // Also try to get translations from vocab_cards directly
        const { data: cardData } = await supabase
          .from('vocab_cards')
          .select('term, translation')
          .in('term', vocabularyWords);

        // Build translation map
        cardData?.forEach(card => {
          if (card.term && card.translation) {
            translationMap[card.term.toLowerCase()] = card.translation;
          }
        });

        // For words not found in database, call translation service automatically
        const untranslatedWords = wordsToTranslate.filter(word =>
          !translationMap[word.toLowerCase()]
        );

        if (untranslatedWords.length > 0 && userLanguage && userLanguage !== 'en') {
          console.log('🌐 Translating', untranslatedWords.length, 'words to', userLanguage);

          try {
            // Call translation service for untranslated words
            const { data: translationData, error } = await supabase.functions.invoke('translation-service', {
              body: {
                texts: untranslatedWords,
                sourceLang: 'en',
                targetLang: userLanguage,
                bypassCache: false
              }
            });

            if (!error && translationData?.success && translationData?.results) {
              // Apply translations from API response and update cache
              translationData.results.forEach((result: any, index: number) => {
                const word = untranslatedWords[index];
                if (result && result.translation) {
                  const translation = result.translation;
                  translationMap[word.toLowerCase()] = translation;

                  // Update component cache
                  const cacheKey = `${word}_${userLanguage}`;
                  setTranslationCache(prev => ({
                    ...prev,
                    [cacheKey]: translation
                  }));

                  console.log(`✅ Translated "${word}" → "${translation}"`);
                }
              });
            } else {
              console.warn('⚠️ Translation service failed, using fallback');
              // Fallback to original words if translation fails
              untranslatedWords.forEach(word => {
                translationMap[word.toLowerCase()] = word;
              });
            }
          } catch (translationError) {
            console.error('❌ Translation service error:', translationError);
            // Fallback to original words
            untranslatedWords.forEach(word => {
              translationMap[word.toLowerCase()] = word;
            });
          }
        } else if (untranslatedWords.length > 0) {
          // For English or if no language set, use original words
          untranslatedWords.forEach(word => {
            translationMap[word.toLowerCase()] = word;
          });
        }

        // Apply translations (combine cached + newly translated)
        const finalTranslations: Record<string, string> = {};
        vocabularyWords.forEach(word => {
          finalTranslations[word] = translationMap[word.toLowerCase()] || cachedTranslations[word] || word;
        });

        setTranslations(finalTranslations);
      } catch (error) {
        console.error('Error getting translations:', error);
        // Fallback to original words
        const fallbackTranslations: Record<string, string> = {};
        vocabularyWords.forEach(word => {
          fallbackTranslations[word] = word;
        });
        setTranslations(fallbackTranslations);
      } finally {
        setLoading(false);
      }
    };

    getTranslations();
  }, [vocabularyWords, userLanguage]);

  const addToWordBook = async (word: string) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to add words to your vocabulary book.",
        variant: "destructive"
      });
      return;
    }

    setAddingWords(prev => new Set(prev).add(word));

    try {
      const translation = translations[word] || word;

      // Call the add-to-word-book edge function
      const { data, error } = await supabase.functions.invoke('add-to-word-book', {
        body: {
          word: word,
          translation: translation,
          part_of_speech: 'noun', // Default, could be improved with POS detection
        }
      });

      if (error) {
        if (error.message?.includes('already_exists')) {
          toast({
            title: "Word already added",
            description: `"${word}" is already in your vocabulary book.`,
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: "Word added!",
          description: `"${word}" has been added to your vocabulary book.`,
        });
      }
    } catch (error) {
      console.error('Error adding word to book:', error);
      toast({
        title: "Error",
        description: "Failed to add word to your vocabulary book. Please try again.",
        variant: "destructive"
      });
    } finally {
      setAddingWords(prev => {
        const newSet = new Set(prev);
        newSet.delete(word);
        return newSet;
      });
    }
  };

  if (vocabularyWords.length === 0) {
    return null;
  }

  return (
    <Card className="rounded-3xl shadow-sm" style={{
      backgroundColor: currentTheme?.colors?.cardBackground || '#ffffff',
      borderColor: currentTheme?.colors?.cardBorder || '#e5e7eb',
      ...currentTheme?.styles?.cardStyle
    }}>
      <CardContent className="p-0">
        {loading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading translations…</div>
        ) : vocabularyWords.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">No vocabulary found.</div>
        ) : (
          <div className="divide-y">
            {vocabularyWords.map((word) => {
              const translation = translations[word] || word;
              const isAdding = addingWords.has(word);

              return (
                <div key={word} className="p-4 flex items-center justify-between transition-colors cursor-pointer group" style={{
                  backgroundColor: 'transparent'
                }} onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = currentTheme?.colors?.hoverBackground || 'rgba(0,0,0,0.05)';
                }} onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}>
                  <div className="flex-1">
                    <div className="font-medium transition-colors" style={{
                      color: currentTheme?.colors?.textPrimary || '#111827'
                    }} onMouseEnter={(e) => {
                      e.currentTarget.style.color = currentTheme?.colors?.buttonPrimary || '#3b82f6';
                    }} onMouseLeave={(e) => {
                      e.currentTarget.style.color = currentTheme?.colors?.textPrimary || '#111827';
                    }}>{word}</div>
                    <div className="text-sm font-medium" style={{
                      color: currentTheme?.colors?.textSecondary || '#6b7280'
                    }}>{translation}</div>
                    {/* Additional context like vocabulary book */}
                    <div className="text-xs text-muted-foreground mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      Click to add to your vocabulary book
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => addToWordBook(word)}
                    disabled={isAdding}
                    style={{
                      borderColor: currentTheme?.colors?.border || '#e5e7eb',
                      color: currentTheme?.colors?.textPrimary || '#111827'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = currentTheme?.colors?.hoverBackground || 'rgba(0,0,0,0.05)';
                      e.currentTarget.style.borderColor = currentTheme?.colors?.buttonPrimary || '#3b82f6';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.borderColor = currentTheme?.colors?.border || '#e5e7eb';
                    }}
                  >
                    {isAdding ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Plus className="w-3 h-3" />
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WritingVocabularyDisplay;
