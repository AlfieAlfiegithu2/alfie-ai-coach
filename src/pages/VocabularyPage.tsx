import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Search, Trash2, BookOpen, Calendar, Languages } from 'lucide-react';
import StudentLayout from '@/components/StudentLayout';

interface SavedWord {
  id: string;
  word: string;
  translation: string;
  context: string;
  savedAt: string;
}

const VocabularyPage = () => {
  const [savedWords, setSavedWords] = useState<SavedWord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredWords, setFilteredWords] = useState<SavedWord[]>([]);

  useEffect(() => {
    loadSavedWords();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = savedWords.filter(word =>
        word.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
        word.translation.toLowerCase().includes(searchTerm.toLowerCase()) ||
        word.context.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredWords(filtered);
    } else {
      setFilteredWords(savedWords);
    }
  }, [searchTerm, savedWords]);

  const loadSavedWords = () => {
    const saved = localStorage.getItem('alfie-saved-vocabulary');
    if (saved) {
      try {
        const words = JSON.parse(saved);
        setSavedWords(words);
      } catch (error) {
        console.error('Error loading saved vocabulary:', error);
      }
    }
  };

  const removeWord = (wordId: string) => {
    const updatedWords = savedWords.filter(word => word.id !== wordId);
    setSavedWords(updatedWords);
    localStorage.setItem('alfie-saved-vocabulary', JSON.stringify(updatedWords));
  };

  const clearAll = () => {
    if (confirm('Are you sure you want to clear all saved vocabulary?')) {
      setSavedWords([]);
      localStorage.removeItem('alfie-saved-vocabulary');
    }
  };

  return (
    <StudentLayout title="My Vocabulary" showBackButton={true}>
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <Card className="card-modern">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10">
                  <BookOpen className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-2xl">My Saved Vocabulary</CardTitle>
                  <p className="text-text-secondary">
                    {savedWords.length} words saved
                  </p>
                </div>
              </div>
              {savedWords.length > 0 && (
                <Button 
                  variant="outline" 
                  onClick={clearAll}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear All
                </Button>
              )}
            </div>
          </CardHeader>
          
          {savedWords.length > 0 && (
            <CardContent>
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-text-secondary" />
                <Input
                  placeholder="Search your vocabulary..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          )}
        </Card>

        {/* Vocabulary List */}
        {savedWords.length === 0 ? (
          <Card className="card-modern">
            <CardContent className="text-center py-12">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Languages className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No vocabulary saved yet</h3>
              <p className="text-text-secondary mb-6">
                Start reading passages and click on words to save them to your vocabulary list
              </p>
              <Button onClick={() => window.history.back()}>
                Start Reading Practice
              </Button>
            </CardContent>
          </Card>
        ) : filteredWords.length === 0 ? (
          <Card className="card-modern">
            <CardContent className="text-center py-8">
              <p className="text-text-secondary">No words match your search</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredWords.map((word) => (
              <Card key={word.id} className="card-modern hover-lift">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-primary">
                          {word.word}
                        </h3>
                        <Badge variant="secondary" className="text-xs">
                          <Languages className="w-3 h-3 mr-1" />
                          Translation
                        </Badge>
                      </div>
                      
                      <p className="text-text-primary mb-3 font-medium">
                        {word.translation}
                      </p>
                      
                      <div className="space-y-2">
                        <div>
                          <p className="text-sm font-medium text-text-secondary mb-1">Context:</p>
                          <p className="text-sm text-text-secondary italic bg-surface-3 p-2 rounded-lg">
                            "{word.context}"
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2 text-xs text-text-tertiary">
                          <Calendar className="w-3 h-3" />
                          <span>Saved on {new Date(word.savedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeWord(word.id)}
                      className="text-text-secondary hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Quick Stats */}
        {savedWords.length > 0 && (
          <Card className="card-modern">
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-primary">{savedWords.length}</div>
                  <div className="text-sm text-text-secondary">Total Words</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-brand-green">
                    {new Set(savedWords.map(w => w.word.charAt(0).toUpperCase())).size}
                  </div>
                  <div className="text-sm text-text-secondary">Starting Letters</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-brand-orange">
                    {Math.round(savedWords.reduce((acc, word) => acc + word.word.length, 0) / savedWords.length) || 0}
                  </div>
                  <div className="text-sm text-text-secondary">Avg. Length</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-brand-purple">
                    {savedWords.filter(w => new Date(w.savedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length}
                  </div>
                  <div className="text-sm text-text-secondary">This Week</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </StudentLayout>
  );
};

export default VocabularyPage;