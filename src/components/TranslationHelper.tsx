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
      // Mock translation for now - in production, use a real translation API
      const mockTranslations: Record<string, Record<string, string>> = {
        'es': {
          'the': 'el/la',
          'house': 'casa',
          'water': 'agua',
          'book': 'libro',
          'time': 'tiempo',
          'people': 'gente',
          'way': 'manera',
          'day': 'día',
          'man': 'hombre',
          'new': 'nuevo',
          'first': 'primero',
          'last': 'último',
          'long': 'largo',
          'great': 'grande',
          'little': 'pequeño',
          'own': 'propio',
          'other': 'otro',
          'old': 'viejo',
          'right': 'correcto/derecho',
          'big': 'grande'
        },
        'fr': {
          'the': 'le/la/les',
          'house': 'maison',
          'water': 'eau',
          'book': 'livre',
          'time': 'temps',
          'people': 'gens',
          'way': 'façon',
          'day': 'jour',
          'man': 'homme',
          'new': 'nouveau',
          'first': 'premier',
          'last': 'dernier',
          'long': 'long',
          'great': 'grand',
          'little': 'petit',
          'own': 'propre',
          'other': 'autre',
          'old': 'vieux',
          'right': 'droit/correct',
          'big': 'grand'
        },
        'de': {
          'the': 'der/die/das',
          'house': 'Haus',
          'water': 'Wasser',
          'book': 'Buch',
          'time': 'Zeit',
          'people': 'Leute',
          'way': 'Weg',
          'day': 'Tag',
          'man': 'Mann',
          'new': 'neu',
          'first': 'erste',
          'last': 'letzte',
          'long': 'lang',
          'great': 'groß',
          'little': 'klein',
          'own': 'eigen',
          'other': 'andere',
          'old': 'alt',
          'right': 'richtig/rechts',
          'big': 'groß'
        }
      };

      const lowerText = text.toLowerCase();
      const translation = mockTranslations[language]?.[lowerText] || 
                         `Translation for "${text}" (${language})`;
      
      setTranslation(translation);
    } catch (error) {
      console.error('Translation error:', error);
      setTranslation('Translation unavailable');
    } finally {
      setIsLoading(false);
    }
  };

  const saveToVocabulary = () => {
    const newWord: SavedWord = {
      id: Date.now().toString(),
      word: selectedText.trim(),
      translation: translation,
      context: window.location.pathname,
      savedAt: new Date()
    };

    const updated = [newWord, ...savedWords.slice(0, 99)]; // Keep last 100 words
    setSavedWords(updated);
    localStorage.setItem('saved-vocabulary', JSON.stringify(updated));

    toast({
      title: "Word Saved",
      description: `"${selectedText}" added to your vocabulary collection.`,
    });
  };

  const isWordSaved = savedWords.some(word => 
    word.word.toLowerCase() === selectedText.toLowerCase().trim()
  );

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