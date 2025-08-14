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

interface SavedWord {
  id: string;
  word: string;
  translation: string;
  context: string;
  savedAt: Date;
}

const TranslationHelper = ({ selectedText, position, onClose, language }: TranslationHelperProps) => {
  const [translation, setTranslation] = useState<string>('');
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
      // Use translation service
      const { translatedText, error } = await import('@/components/TranslationService').then(
        module => module.translationService.translateText({
          text: text,
          targetLanguage: language
        })
      );

      if (error) {
        console.warn('Translation service error:', error);
        // Fallback to mock translations
        const mockTranslations: Record<string, Record<string, string>> = {
          'es': {
            'the': 'el/la', 'house': 'casa', 'water': 'agua', 'book': 'libro',
            'time': 'tiempo', 'people': 'gente', 'way': 'manera', 'day': 'día',
            'man': 'hombre', 'new': 'nuevo', 'first': 'primero', 'last': 'último',
            'long': 'largo', 'great': 'grande', 'little': 'pequeño', 'own': 'propio',
            'other': 'otro', 'old': 'viejo', 'right': 'correcto/derecho', 'big': 'grande'
          },
          'fr': {
            'the': 'le/la/les', 'house': 'maison', 'water': 'eau', 'book': 'livre',
            'time': 'temps', 'people': 'gens', 'way': 'façon', 'day': 'jour',
            'man': 'homme', 'new': 'nouveau', 'first': 'premier', 'last': 'dernier',
            'long': 'long', 'great': 'grand', 'little': 'petit', 'own': 'propre',
            'other': 'autre', 'old': 'vieux', 'right': 'droit/correct', 'big': 'grand'
          },
          'de': {
            'the': 'der/die/das', 'house': 'Haus', 'water': 'Wasser', 'book': 'Buch',
            'time': 'Zeit', 'people': 'Leute', 'way': 'Weg', 'day': 'Tag',
            'man': 'Mann', 'new': 'neu', 'first': 'erste', 'last': 'letzte',
            'long': 'lang', 'great': 'groß', 'little': 'klein', 'own': 'eigen',
            'other': 'andere', 'old': 'alt', 'right': 'richtig/rechts', 'big': 'groß'
          }
        };

        const lowerText = text.toLowerCase();
        setTranslation(mockTranslations[language]?.[lowerText] || `Translation for "${text}" (${language})`);
      } else {
        setTranslation(translatedText);
      }
    } catch (error) {
      console.error('Translation error:', error);
      setTranslation('Translation unavailable');
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

  const saveToVocabulary = async () => {
    try {
      // Import supabase client
      const { supabase } = await import('@/integrations/supabase/client');
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Please Sign In",
          description: "You need to be signed in to save vocabulary.",
        });
        return;
      }

      // Get user's native language for translation
      const { data: profile } = await supabase
        .from('profiles')
        .select('native_language')
        .eq('id', user.id)
        .single();

      const targetLanguage = profile?.native_language || 'Spanish';

      const { data, error } = await supabase.functions.invoke('smart-vocabulary', {
        body: {
          action: 'saveWord',
          word: selectedText.trim(),
          context: window.location.pathname,
          userId: user.id,
          nativeLanguage: targetLanguage
        }
      });

      if (error) {
        console.error('Vocabulary save error:', error);
        throw error;
      }

      // Success - update UI state
      setIsWordSaved(true);

      toast({
        title: "Word Saved",
        description: `"${selectedText}" added to your vocabulary collection.`,
      });
    } catch (error) {
      console.error('Error saving word:', error);
      toast({
        title: "Save Failed",
        description: "Could not save word to vocabulary. Please try again.",
      });
    }
  };

  return (
    <div 
      className="fixed z-50 max-w-sm"
      style={{
        left: Math.min(position.x, window.innerWidth - 400),
        top: Math.min(position.y, window.innerHeight - 200),
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
              ) : (
                <p className="text-sm text-brand-blue font-medium">
                  {translation}
                </p>
              )}
            </div>

            {!isWordSaved && translation && !isLoading && (
              <Button 
                onClick={saveToVocabulary}
                size="sm" 
                className="w-full btn-primary"
              >
                <Plus className="w-3 h-3 mr-2" />
                Save to Vocabulary
              </Button>
            )}

            {isWordSaved && (
              <div className="flex items-center justify-center gap-2 text-xs text-brand-green">
                <BookOpen className="w-3 h-3" />
                Already in vocabulary
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TranslationHelper;