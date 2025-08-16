import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, ArrowLeft, Trash2, RefreshCw, User, LogOut, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import LoadingAnimation from '@/components/animations/LoadingAnimation';
import SettingsModal from '@/components/SettingsModal';

interface SavedWord {
  id: string;
  word: string;
  translations: string[];
  context: string;
  savedAt: string;
  languageCode: string;
}

const MyWordBook = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [words, setWords] = useState<SavedWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Preload the background image
    const img = new Image();
    img.onload = () => setImageLoaded(true);
    img.src = '/lovable-uploads/5d9b151b-eb54-41c3-a578-e70139faa878.png';
    
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
        translations: item.translations || ['No translation available'],
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
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Card className="p-8 text-center glass-card">
          <CardContent>
            <p className="text-text-secondary mb-4">Please sign in to access your Word Book.</p>
            <Button onClick={() => navigate('/auth')} className="btn-primary">Sign In</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading || !imageLoaded) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <LoadingAnimation />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-contain bg-center bg-no-repeat bg-fixed"
        style={{
          backgroundImage: `url('/lovable-uploads/5d9b151b-eb54-41c3-a578-e70139faa878.png')`,
          backgroundColor: '#a2d2ff'
        }}
      />
      
      <div className="relative z-10 min-h-full flex items-center justify-center lg:py-10 lg:px-6 pt-6 pr-4 pb-6 pl-4">
        <div className="relative w-full max-w-[1440px] lg:rounded-3xl overflow-hidden lg:mx-8 shadow-black/10 bg-white/20 border-white/30 border rounded-2xl mr-4 ml-4 shadow-[0_2.8px_2.2px_rgba(0,_0,_0,_0.034),_0_6.7px_5.3px_rgba(0,_0,_0,_0.048),_0_12.5px_10px_rgba(0,_0,_0,_0.06),_0_22.3px_17.9px_rgba(0,_0,_0,_0.072),_0_41.8px_33.4px_rgba(0,_0,_0,_0.086),_0_100px_80px_rgba(0,_0,_0,_0.12)] backdrop-blur-xl">
          {/* Header */}
          <header className="flex sm:px-6 lg:px-12 lg:py-5 pt-4 pr-4 pb-4 pl-4 items-center justify-between border-b border-white/20">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2 text-slate-800 hover:text-blue-600"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </Button>
            </div>
            
            <div className="flex items-center gap-3 lg:gap-4">
              {/* User Avatar */}
              <div className="w-8 h-8 lg:w-9 lg:h-9 rounded-full bg-slate-800/80 backdrop-blur-sm flex items-center justify-center border border-white/20">
                <User className="w-4 h-4 text-white" />
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="relative sm:px-6 lg:px-12 pr-4 pb-12 pl-4">
            {/* Title */}
            <div className="text-center mb-12 pt-8">
              <h1 className="text-4xl lg:text-5xl text-slate-800 tracking-tight font-semibold mb-4 flex items-center justify-center gap-3" style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}>
                <BookOpen className="w-10 h-10 text-slate-800" />
                My Word Book
              </h1>
              <p className="text-slate-600 text-lg mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>
                Review your saved vocabulary
              </p>
              <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 px-4 py-2 rounded-full backdrop-blur-sm">
                <Badge variant="secondary" className="bg-white/20 text-slate-700 border-white/30">
                  {words.length} {words.length === 1 ? 'word' : 'words'} saved
                </Badge>
              </div>
            </div>

            {/* Empty State */}
            {words.length === 0 ? (
              <div className="text-center py-16">
                <BookOpen className="w-20 h-20 text-slate-400/50 mx-auto mb-6" />
                <h3 className="text-2xl font-semibold text-slate-800 mb-4" style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}>
                  Your Word Book is empty
                </h3>
                <p className="text-slate-600 mb-8 max-w-md mx-auto" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Start building your vocabulary by selecting words during reading tests and clicking "Add to Word Book" in the translation popup.
                </p>
                <Button 
                  onClick={() => navigate('/ielts-portal')} 
                  className="bg-slate-800/80 hover:bg-slate-800 text-white px-6 py-3 rounded-xl backdrop-blur-sm border border-white/20"
                >
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
                        <Card className="absolute inset-0 backface-hidden bg-white/10 border-white/20 backdrop-blur-xl hover:bg-white/15 transition-all">
                          <CardContent className="p-6 flex flex-col items-center justify-center h-full text-center">
                            <h3 className="text-2xl font-bold text-slate-800 mb-2" style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}>
                              {word.word}
                            </h3>
                            {word.context && (
                              <Badge variant="outline" className="bg-white/20 text-slate-600 border-white/30 text-xs mb-2">
                                {word.context}
                              </Badge>
                            )}
                            <p className="text-sm text-slate-500" style={{ fontFamily: 'Inter, sans-serif' }}>
                              Click to see translation
                            </p>
                          </CardContent>
                        </Card>

                        {/* Back of Card */}
                        <Card className="absolute inset-0 backface-hidden rotate-y-180 bg-emerald-500/10 border-emerald-500/20 backdrop-blur-xl hover:bg-emerald-500/15 transition-all">
                          <CardContent className="p-6 flex flex-col items-center justify-center h-full text-center">
                            <div className="space-y-3 w-full">
                              <h4 className="text-sm font-medium text-emerald-800 mb-3" style={{ fontFamily: 'Inter, sans-serif' }}>
                                Translations:
                              </h4>
                              {word.translations.slice(0, 3).map((translation, index) => (
                                <div key={index} className="bg-emerald-500/10 rounded-lg p-2 border border-emerald-500/20">
                                  <p className="text-sm text-emerald-800 font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>
                                    {translation}
                                  </p>
                                </div>
                              ))}
                              {word.translations.length > 3 && (
                                <p className="text-xs text-emerald-600" style={{ fontFamily: 'Inter, sans-serif' }}>
                                  +{word.translations.length - 3} more
                                </p>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Delete Button */}
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute -top-2 -right-2 w-8 h-8 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-red-500/80 hover:bg-red-500 border border-white/20"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeWord(word.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>

                      {/* Save Date */}
                      <div className="absolute -bottom-6 left-0 right-0 text-center">
                        <p className="text-xs text-slate-500" style={{ fontFamily: 'Inter, sans-serif' }}>
                          Saved {new Date(word.savedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </main>
        </div>
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