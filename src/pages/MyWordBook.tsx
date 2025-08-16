import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, ArrowLeft, Trash2, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import LoadingAnimation from '@/components/animations/LoadingAnimation';

interface SavedWord {
  id: string;
  word: string;
  translation: string;
  context: string;
  savedAt: string;
  languageCode: string;
}

const MyWordBook = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [words, setWords] = useState<SavedWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      fetchWordBook();
    }
  }, [user]);

  const fetchWordBook = async () => {
    try {
      setLoading(true);
      console.log('📖 Fetching word book from user_vocabulary table...');
      
      const { data, error } = await supabase
        .from('user_vocabulary')
        .select('id, word, part_of_speech, translations, created_at')
        .order('created_at', { ascending: false });

      console.log('📊 Word book response:', { data, error, count: data?.length });

      if (error) {
        console.error('Database error:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      // Transform data to match the expected format
      const transformedWords = data?.map(item => ({
        id: item.id,
        word: item.word,
        translation: item.translations?.[0] || 'No translation available',
        context: item.part_of_speech || '',
        savedAt: item.created_at,
        languageCode: 'en' // Default since we don't store this
      })) || [];

      console.log('✅ Successfully loaded', transformedWords.length, 'words');
      setWords(transformedWords);
    } catch (error) {
      console.error('❌ Error fetching word book:', error);
      toast({
        title: "Failed to Load Word Book",
        description: `Could not load your word book: ${error.message}`,
        variant: "destructive",
        duration: 4000,
      });
      setWords([]); // Set empty array on error so UI doesn't break
    } finally {
      setLoading(false);
    }
  };

  const removeWord = async (wordId: string) => {
    try {
      console.log('🗑️ Removing word:', wordId);
      
      const { error } = await supabase
        .from('user_vocabulary')
        .delete()
        .eq('id', wordId);

      if (error) {
        console.error('Database error removing word:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      // Remove the word from local state
      setWords(prev => prev.filter(w => w.id !== wordId));
      
      toast({
        title: "✅ Word Removed",
        description: "The word has been removed from your Word Book.",
        duration: 3000,
      });
      
      console.log('✅ Successfully removed word');
    } catch (error) {
      console.error('❌ Error removing word:', error);
      toast({
        title: "Failed to Remove Word",
        description: error.message || "Could not remove word. Please try again.",
        variant: "destructive",
        duration: 4000,
      });
    }
  };

  const handleCardClick = (wordId: string) => {
    setFlippedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(wordId)) {
        newSet.delete(wordId);
      } else {
        newSet.add(wordId);
      }
      return newSet;
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="p-8 text-center">
          <CardContent>
            <p className="text-text-secondary mb-4">Please sign in to access your Word Book.</p>
            <Button onClick={() => navigate('/auth')}>Sign In</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <LoadingAnimation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchWordBook}
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>

        {/* Title */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-text-primary mb-4 flex items-center justify-center gap-3">
            <BookOpen className="w-10 h-10 text-brand-blue" />
            My Word Book
          </h1>
          <p className="text-text-secondary text-lg">
            Review your saved vocabulary with interactive flashcards
          </p>
          <Badge variant="secondary" className="mt-4">
            {words.length} {words.length === 1 ? 'word' : 'words'} saved
          </Badge>
        </div>

        {/* Empty State */}
        {words.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="w-20 h-20 text-text-secondary/30 mx-auto mb-6" />
            <h3 className="text-2xl font-semibold text-text-primary mb-4">
              Your Word Book is empty
            </h3>
            <p className="text-text-secondary mb-8 max-w-md mx-auto">
              Start building your vocabulary by selecting words during reading tests and clicking "Add to Word Book" in the translation popup.
            </p>
            <Button onClick={() => navigate('/ielts-portal')} className="bg-brand-blue hover:bg-brand-blue/90">
              Start Learning
            </Button>
          </div>
        ) : (
          /* Word Cards Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {words.map((word) => {
              const isFlipped = flippedCards.has(word.id);
              return (
                <div
                  key={word.id}
                  className="relative group perspective-1000"
                >
                  {/* Flashcard Container */}
                  <div
                    className={`relative w-full h-48 cursor-pointer transition-transform duration-500 preserve-3d ${
                      isFlipped ? 'rotate-y-180' : ''
                    }`}
                    onClick={() => handleCardClick(word.id)}
                  >
                    {/* Front of Card */}
                    <Card className={`absolute inset-0 backface-hidden hover:shadow-lg transition-shadow border-2 ${
                      isFlipped ? 'border-green-200' : 'border-blue-200'
                    }`}>
                      <CardContent className="p-6 flex flex-col items-center justify-center h-full text-center">
                        <h3 className="text-2xl font-bold text-text-primary mb-2">
                          {word.word}
                        </h3>
                        <p className="text-sm text-text-secondary">
                          Click to see translation
                        </p>
                        <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Badge variant="outline" className="text-xs">
                            EN
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Back of Card */}
                    <Card className="absolute inset-0 backface-hidden rotate-y-180 hover:shadow-lg transition-shadow border-2 border-green-200 bg-green-50">
                      <CardContent className="p-6 flex flex-col items-center justify-center h-full text-center">
                        <h3 className="text-xl font-semibold text-green-800 mb-4">
                          {word.translation}
                        </h3>
                        {word.context && (
                          <p className="text-sm text-green-600 italic">
                            "{word.context}"
                          </p>
                        )}
                        <div className="absolute bottom-3 right-3">
                          <Badge variant="outline" className="text-xs bg-green-100 text-green-700">
                            Translation
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Delete Button */}
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute -top-2 -right-2 w-8 h-8 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeWord(word.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>

                  {/* Save Date */}
                  <div className="absolute -bottom-6 left-0 right-0 text-center">
                    <p className="text-xs text-text-secondary">
                      Saved {new Date(word.savedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Instructions */}
        {words.length > 0 && (
          <div className="mt-16 text-center">
            <Card className="max-w-2xl mx-auto">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-text-primary mb-3">
                  How to use your Word Book
                </h3>
                <ul className="text-sm text-text-secondary space-y-2 text-left">
                  <li>• Click on any card to flip it and see the translation</li>
                  <li>• Hover over cards to see the delete button</li>
                  <li>• Add new words by selecting text during reading tests</li>
                  <li>• Use this space to review and memorize your vocabulary</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
      
      <style dangerouslySetInnerHTML={{
        __html: `
          .perspective-1000 {
            perspective: 1000px;
          }
          .preserve-3d {
            transform-style: preserve-3d;
          }
          .backface-hidden {
            backface-visibility: hidden;
          }
          .rotate-y-180 {
            transform: rotateY(180deg);
          }
        `
      }} />
    </div>
  );
};

export default MyWordBook;