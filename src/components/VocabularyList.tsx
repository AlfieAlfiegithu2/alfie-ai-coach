import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookOpen, Search, Trash2, Calendar, Languages, Globe } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SavedWord {
  id: string;
  word: string;
  translation: string;
  context: string;
  savedAt: Date;
}

const VocabularyList = () => {
  const [savedWords, setSavedWords] = useState<SavedWord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredWords, setFilteredWords] = useState<SavedWord[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState('Spanish');
  const [translating, setTranslating] = useState<string | null>(null);

  const languages = [
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'zh', name: 'Chinese' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' },
    { code: 'ar', name: 'Arabic' },
    { code: 'hi', name: 'Hindi' },
    { code: 'ru', name: 'Russian' },
    { code: 'tr', name: 'Turkish' }
  ];

  useEffect(() => {
    loadSavedWords();
  }, []);

  useEffect(() => {
    if (searchTerm.trim()) {
      const filtered = savedWords.filter(word =>
        word.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
        word.translation.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredWords(filtered);
    } else {
      setFilteredWords(savedWords);
    }
  }, [searchTerm, savedWords]);

  const loadSavedWords = () => {
    const saved = localStorage.getItem('saved-vocabulary');
    if (saved) {
      try {
        const words = JSON.parse(saved).map((word: any) => ({
          ...word,
          savedAt: new Date(word.savedAt)
        }));
        setSavedWords(words);
      } catch (error) {
        console.error('Error loading saved words:', error);
      }
    }
  };

  const removeWord = (wordId: string) => {
    const updated = savedWords.filter(word => word.id !== wordId);
    setSavedWords(updated);
    localStorage.setItem('saved-vocabulary', JSON.stringify(updated));
  };

  const clearAll = () => {
    setSavedWords([]);
    localStorage.removeItem('saved-vocabulary');
  };

  const translateWord = async (wordId: string, word: string) => {
    setTranslating(wordId);
    try {
      const { data, error } = await supabase.functions.invoke('translation-service', {
        body: {
          text: word,
          targetLanguage: selectedLanguage.toLowerCase(),
          sourceLanguage: 'en'
        }
      });

      if (error) throw error;

      if (data?.translation) {
        // Update the word with translation
        const updatedWords = savedWords.map(w => 
          w.id === wordId 
            ? { ...w, translation: data.translation }
            : w
        );
        setSavedWords(updatedWords);
        localStorage.setItem('saved-vocabulary', JSON.stringify(updatedWords));
      }
    } catch (error) {
      console.error('Translation error:', error);
    } finally {
      setTranslating(null);
    }
  };

  return (
    <Card className="card-modern">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-brand-blue" />
            <CardTitle>My Vocabulary ({savedWords.length})</CardTitle>
          </div>
          {savedWords.length > 0 && (
            <Button variant="outline" size="sm" onClick={clearAll}>
              Clear All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {savedWords.length > 0 && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-tertiary" />
              <Input
                placeholder="Search your vocabulary..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 input-modern"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Languages className="w-4 h-4 text-text-tertiary" />
              <span className="text-sm text-text-secondary">Translate to:</span>
              <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {languages.map((lang) => (
                    <SelectItem key={lang.code} value={lang.name}>
                      {lang.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {filteredWords.length === 0 && savedWords.length === 0 ? (
          <div className="text-center py-8">
            <BookOpen className="w-12 h-12 text-text-tertiary mx-auto mb-3" />
            <p className="text-text-secondary">No vocabulary saved yet.</p>
            <p className="text-sm text-text-tertiary">
              Click on words during reading to start building your collection!
            </p>
          </div>
        ) : filteredWords.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-text-secondary">No words match your search.</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredWords.map((word) => (
              <div
                key={word.id}
                className="bg-surface-2 rounded-lg p-3 flex items-center justify-between"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-text-primary">
                      {word.word}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {word.context.replace('/', '')}
                    </Badge>
                  </div>
                  <p className="text-sm text-brand-blue">{word.translation}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Calendar className="w-3 h-3 text-text-tertiary" />
                    <span className="text-xs text-text-tertiary">
                      {word.savedAt.toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {word.translation.includes('Translation coming soon') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => translateWord(word.id, word.word)}
                      disabled={translating === word.id}
                      className="px-2 h-7 text-xs text-brand-blue hover:text-brand-blue"
                    >
                      {translating === word.id ? (
                        <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Globe className="w-3 h-3" />
                      )}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeWord(word.id)}
                    className="w-8 h-8 p-0 text-text-tertiary hover:text-brand-red"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VocabularyList;