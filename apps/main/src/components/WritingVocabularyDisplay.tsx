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
          console.log('👤 User language from profile:', profile.native_language, '→ normalized:', normalizedLang);
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
          console.log('👤 User language from preferences:', preferences.preferred_feedback_language, '→ normalized:', normalizedLang);
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
        const translationMap: Record<string, string> = {};

        // Try to get translations by joining vocab_translations with vocab_cards
        console.log('🔍 Checking vocab_translations + vocab_cards join for language:', userLanguage);
        const { data: joinedTranslationData, error: joinedError } = await supabase
          .from('vocab_translations')
          .select(`
            translations,
            lang,
            vocab_cards!inner(term)
          `)
          .eq('lang', userLanguage)
          .in('vocab_cards.term', vocabularyWords);

        if (joinedError) {
          console.error('❌ Error querying joined vocab tables:', joinedError);
        } else {
          console.log('📖 Found', joinedTranslationData?.length || 0, 'joined translation entries');
          joinedTranslationData?.forEach(entry => {
            if (entry.vocab_cards?.term && entry.translations && Array.isArray(entry.translations) && entry.translations.length > 0) {
              const term = entry.vocab_cards.term;
              const translation = entry.translations[0]; // Take first translation
              translationMap[term.toLowerCase()] = translation;
              console.log(`📖 vocab_translations join: "${term}" → "${translation}"`);
            }
          });
        }

        // Also try to get translations from vocab_cards directly (for cases where translation is stored directly)
        console.log('🔍 Checking vocab_cards for', vocabularyWords.length, 'words:', vocabularyWords);
        const { data: cardData, error: cardError } = await supabase
          .from('vocab_cards')
          .select('term, translation')
          .in('term', vocabularyWords);

        if (cardError) {
          console.error('❌ Error querying vocab_cards:', cardError);
        } else {
          console.log('📚 Found', cardData?.length || 0, 'translations in vocab_cards');
          console.log('📚 Card data sample:', cardData?.slice(0, 3));
        }

        // Build translation map from direct vocab_cards query
        cardData?.forEach(card => {
          if (card.term && card.translation) {
            // Only use if we don't already have a translation from vocab_translations
            if (!translationMap[card.term.toLowerCase()]) {
              translationMap[card.term.toLowerCase()] = card.translation;
              console.log(`📚 vocab_cards: "${card.term}" → "${card.translation}"`);
            }
          }
        });

        // If join failed, try a simpler approach - get all vocab_translations for the language and manually match
        if (joinedError || !joinedTranslationData || joinedTranslationData.length === 0) {
          console.log('🔄 Fallback: querying vocab_translations separately');
          const { data: fallbackTransData, error: fallbackError } = await supabase
            .from('vocab_translations')
            .select('card_id, translations')
            .eq('lang', userLanguage);

          if (!fallbackError && fallbackTransData && fallbackTransData.length > 0) {
            // Get the card IDs and terms
            const cardIds = fallbackTransData.map(t => t.card_id).filter(Boolean);
            const { data: cardsData } = await supabase
              .from('vocab_cards')
              .select('id, term')
              .in('id', cardIds)
              .in('term', vocabularyWords); // Only get cards that match our vocabulary words

            // Create term -> card_id map
            const termToCardId: Record<string, string> = {};
            cardsData?.forEach(card => {
              termToCardId[card.term.toLowerCase()] = card.id;
            });

            // Now map translations using the term -> card_id -> translation lookup
            fallbackTransData.forEach(transEntry => {
              const term = Object.keys(termToCardId).find(t => termToCardId[t] === transEntry.card_id);
              if (term && transEntry.translations && Array.isArray(transEntry.translations) && transEntry.translations.length > 0) {
                if (!translationMap[term]) { // Don't overwrite existing translations
                  translationMap[term] = transEntry.translations[0];
                  console.log(`📖 vocab_translations fallback: "${term}" → "${transEntry.translations[0]}"`);
                }
              }
            });
          }
        }

        // For words not found in database, call translation service automatically
        const untranslatedWords = wordsToTranslate.filter(word =>
          !translationMap[word.toLowerCase()]
        );

        if (untranslatedWords.length > 0 && userLanguage && userLanguage !== 'en') {
          console.log('🌐 Translating', untranslatedWords.length, 'words to', userLanguage, '- Words:', untranslatedWords);

          try {
            // First try batch translation
            console.log('🌐 Attempting batch translation...');
            const { data: translationData, error } = await supabase.functions.invoke('translation-service', {
              body: {
                texts: untranslatedWords,
                sourceLang: 'en',
                targetLang: userLanguage,
                bypassCache: false
              }
            });

            console.log('🌐 Batch translation response:', {
              success: translationData?.success,
              error,
              resultsCount: translationData?.results?.length
            });

            let batchSuccess = false;
            if (!error && translationData?.success && translationData?.results) {
              // Validate that we got translations for all words
              const validTranslations = translationData.results.filter((result: any, index: number) => {
                const word = untranslatedWords[index];
                return result && result.translation && result.translation !== word;
              });

              if (validTranslations.length > 0) {
                console.log('✅ Batch translation successful for', validTranslations.length, 'words');
                batchSuccess = true;

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

                    console.log(`✅ Batch: "${word}" → "${translation}"`);
                  } else {
                    // Fallback to original word for failed translations
                    translationMap[word.toLowerCase()] = word;
                    console.log(`⚠️ Batch fallback: "${word}" → "${word}"`);
                  }
                });
              } else {
                console.warn('⚠️ Batch translation returned no valid translations');
              }
            }

            // If batch failed or returned no valid translations, try individual translations
            if (!batchSuccess) {
              console.log('🔄 Falling back to individual translations...');

              for (const word of untranslatedWords) {
                try {
                  console.log(`🌐 Translating individual word: "${word}"`);
                  const { data: singleData, error: singleError } = await supabase.functions.invoke('translation-service', {
                    body: {
                      text: word,
                      sourceLang: 'en',
                      targetLang: userLanguage,
                      bypassCache: false
                    }
                  });

                  if (!singleError && singleData?.success && singleData?.result?.translation) {
                    const translation = singleData.result.translation;
                    translationMap[word.toLowerCase()] = translation;

                    // Update component cache
                    const cacheKey = `${word}_${userLanguage}`;
                    setTranslationCache(prev => ({
                      ...prev,
                      [cacheKey]: translation
                    }));

                    console.log(`✅ Individual: "${word}" → "${translation}"`);
                  } else {
                    console.warn(`⚠️ Individual translation failed for "${word}":`, singleError, singleData);
                    translationMap[word.toLowerCase()] = word;
                  }
                } catch (singleTranslationError) {
                  console.error(`❌ Individual translation error for "${word}":`, singleTranslationError);
                  translationMap[word.toLowerCase()] = word;
                }

                // Small delay between requests to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 100));
              }
            }
          } catch (translationError) {
            console.error('❌ Translation service error:', translationError);
            // Fallback to original words
            untranslatedWords.forEach(word => {
              translationMap[word.toLowerCase()] = word;
            });
          }
        } else if (untranslatedWords.length > 0) {
          console.log('🌐 Using English fallback for', untranslatedWords.length, 'words');
          // For English or if no language set, use original words
          untranslatedWords.forEach(word => {
            translationMap[word.toLowerCase()] = word;
          });
        }

        // Apply translations (combine cached + newly translated)
        const finalTranslations: Record<string, string> = {};
        vocabularyWords.forEach(word => {
          const translation = translationMap[word.toLowerCase()] || cachedTranslations[word] || word;
          finalTranslations[word] = translation;
          console.log(`🎯 Final: "${word}" → "${translation}"`);
        });

        console.log('🎯 Final translations summary:', {
          totalWords: vocabularyWords.length,
          translatedFromDB: Object.keys(translationMap).length,
          cached: Object.keys(cachedTranslations).length,
          finalTranslations: finalTranslations
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
