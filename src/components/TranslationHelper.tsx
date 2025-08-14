import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Globe, BookOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TranslationHelperProps {
  selectedText: string;
  position: { x: number; y: number };
  onClose: () => void;
  language: string;
}

interface TranslationResult {
  translation: string;
  context?: string;
  alternatives?: string[];
  grammar_notes?: string;
  simple?: boolean;
}

interface SavedWord {
  id: string;
  word: string;
  translation: string;
  context: string;
  savedAt: Date;
}

const TranslationHelper = ({ selectedText, position, onClose, language }: TranslationHelperProps) => {
  const [translationResult, setTranslationResult] = useState<TranslationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [savedWords, setSavedWords] = useState<SavedWord[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (selectedText.trim()) {
      fetchTranslation(selectedText.trim());
    }
    loadSavedWords();
  }, [selectedText, language]);

  const loadSavedWords = () => {
    const saved = localStorage.getItem('saved-vocabulary');
    if (saved) {
      try {
        setSavedWords(JSON.parse(saved));
      } catch (error) {
        console.error('Error loading saved words:', error);
      }
    }
  };

  const fetchTranslation = async (text: string) => {
    setIsLoading(true);
    try {
      // Use translation service with context for multiple meanings
      const { supabase } = await import('@/integrations/supabase/client');
      const { data, error } = await supabase.functions.invoke('translation-service', {
        body: {
          text: text,
          targetLang: language,
          sourceLang: 'auto',
          includeContext: true // Request multiple meanings and context
        }
      });

      if (error || !data.success) {
        console.warn('Translation service error:', error);
        // Fallback to simple translation
        setTranslationResult({
          translation: `Translation for "${text}" (${language})`,
          simple: true
        });
      } else {
        setTranslationResult(data.result);
      }
    } catch (error) {
      console.error('Translation error:', error);
      setTranslationResult({
        translation: 'Translation unavailable',
        simple: true
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Check if word is already saved by checking backend data instead of localStorage
  const isWordSavedBackend = async (word: string): Promise<boolean> => {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return false;

      const { data } = await supabase.functions.invoke('smart-vocabulary', {
        body: {
          action: 'getUserVocabulary',
          userId: user.id
        }
      });

      if (data?.vocabulary) {
        return data.vocabulary.some((savedWord: any) => 
          savedWord.word.toLowerCase() === word.toLowerCase().trim()
        );
      }
      return false;
    } catch (error) {
      console.error('Error checking saved words:', error);
      return false;
    }
  };

  // Update the local check to use backend data
  const [isWordSaved, setIsWordSaved] = useState(false);
  
  useEffect(() => {
    const checkWordSaved = async () => {
      const saved = await isWordSavedBackend(selectedText);
      setIsWordSaved(saved);
    };
    
    if (selectedText) {
      checkWordSaved();
    }
  }, [selectedText]);

  const saveToVocabulary = async (retryCount = 0) => {
    console.log(`🔄 Attempting to save word: "${selectedText}" (attempt ${retryCount + 1})`);
    
    try {
      // Import supabase client
      const { supabase } = await import('@/integrations/supabase/client');
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('❌ No authenticated user found');
        toast({
          title: "Please Sign In",
          description: "You need to be signed in to save vocabulary.",
        });
        return;
      }

      console.log('✅ User authenticated:', user.id.substring(0, 8) + '...');

      // Get user's native language for translation
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('native_language')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.log('⚠️  Profile error:', profileError);
      }

      const targetLanguage = profile?.native_language || 'Spanish';
      console.log('🌐 Target language:', targetLanguage);

      const requestPayload = {
        action: 'saveWord',
        word: selectedText.trim(),
        context: window.location.pathname,
        userId: user.id,
        nativeLanguage: targetLanguage
      };

      console.log('📤 Sending request to smart-vocabulary function:', requestPayload);

      const { data, error } = await supabase.functions.invoke('smart-vocabulary', {
        body: requestPayload
      });

      console.log('📥 Response from smart-vocabulary function:', { data, error });

      if (error) {
        console.error('❌ Vocabulary save error:', error);
        throw error;
      }

      if (data?.success) {
        console.log('✅ Word saved successfully');
        
        // Success - update UI state
        setIsWordSaved(true);

        if (data.alreadySaved) {
          toast({
            title: "Already Saved",
            description: `"${selectedText}" is already in your vocabulary.`,
          });
        } else {
          toast({
            title: "Word Saved!",
            description: `"${selectedText}" added to your vocabulary collection.`,
          });
        }

        // Dispatch event ONLY after successful save
        console.log('📡 Dispatching vocabulary-updated event');
        window.dispatchEvent(new CustomEvent('vocabulary-updated', {
          detail: { word: selectedText, translation: data.translation }
        }));
      } else {
        throw new Error(data?.error || 'Failed to save word');
      }
    } catch (error) {
      console.error('❌ Error saving word:', error);
      
      // Retry logic - retry up to 2 times for network/server errors
      if (retryCount < 2 && (error as any)?.status >= 500) {
        console.log(`🔄 Retrying save operation (attempt ${retryCount + 2})`);
        setTimeout(() => saveToVocabulary(retryCount + 1), 1000 * (retryCount + 1));
        return;
      }

      toast({
        title: "Save Failed",
        description: `Could not save "${selectedText}" to vocabulary. ${error instanceof Error ? error.message : 'Please try again.'}`,
        variant: "destructive"
      });
    }
  };

  // Calculate dynamic positioning to keep popup on screen
  const getPopupPosition = () => {
    const popupWidth = 400; // max-w-sm is about 400px
    const popupHeight = 250; // estimated popup height
    const margin = 20; // margin from screen edges

    let left = position.x;
    let top = position.y;

    // Check right edge
    if (left + popupWidth > window.innerWidth - margin) {
      left = window.innerWidth - popupWidth - margin;
    }

    // Check left edge
    if (left < margin) {
      left = margin;
    }

    // Check bottom edge - if popup would go off-screen, position above the selection
    if (top + popupHeight > window.innerHeight - margin) {
      top = position.y - popupHeight - 20; // Position above with some spacing
    }

    // Check top edge - if still off-screen, position below
    if (top < margin) {
      top = position.y + 20; // Position below the selection
    }

    // Final check - if still off-screen, center it
    if (top + popupHeight > window.innerHeight - margin) {
      top = Math.max(margin, (window.innerHeight - popupHeight) / 2);
    }

    return { left, top };
  };

  const dynamicPosition = getPopupPosition();

  return (
    <div 
      className="fixed z-50 max-w-sm"
      style={{
        left: dynamicPosition.left,
        top: dynamicPosition.top,
      }}
    >
      <Card className="glass-effect shadow-lg border-border/20">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-brand-blue" />
              <span className="text-sm font-semibold text-text-primary">Translation</span>
              <Badge variant="secondary" className="text-xs">
                {language.toUpperCase()}
              </Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="w-6 h-6 p-0">
              <X className="w-3 h-3" />
            </Button>
          </div>

          <div className="space-y-2">
            <div className="bg-surface-2 rounded-lg p-3">
              <p className="text-sm font-medium text-text-primary mb-1">
                "{selectedText}"
              </p>
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 border border-brand-blue border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs text-text-secondary">Translating...</span>
                </div>
              ) : translationResult ? (
                <div className="space-y-2">
                  <p className="text-sm text-brand-blue font-medium">
                    {translationResult.translation}
                  </p>
                  
                  {translationResult.alternatives && translationResult.alternatives.length > 0 && (
                    <div className="text-xs space-y-1">
                      <p className="text-text-secondary font-medium">Alternative meanings:</p>
                      <div className="flex flex-wrap gap-1">
                        {translationResult.alternatives.map((alt, index) => (
                          <Badge key={index} variant="outline" className="text-xs px-2 py-0.5">
                            {alt}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {translationResult.context && (
                    <div className="text-xs">
                      <p className="text-text-secondary font-medium mb-1">Context:</p>
                      <p className="text-text-secondary">{translationResult.context}</p>
                    </div>
                  )}
                  
                  {translationResult.grammar_notes && (
                    <div className="text-xs">
                      <p className="text-text-secondary font-medium mb-1">Grammar notes:</p>
                      <p className="text-text-secondary">{translationResult.grammar_notes}</p>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {!isWordSaved && translationResult && !isLoading && (
              <Button 
                onClick={() => saveToVocabulary()}
                size="sm" 
                className="w-full btn-primary relative"
              >
                <Plus className="w-3 h-3 mr-2" />
                Save to Vocabulary
              </Button>
            )}

            {isWordSaved && (
              <div className="flex items-center justify-center gap-2 p-2 bg-green-500/10 rounded-lg border border-green-500/20">
                <div className="flex items-center gap-2 text-green-600">
                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center animate-pulse">
                    <BookOpen className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-xs font-medium">Added to vocabulary!</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TranslationHelper;