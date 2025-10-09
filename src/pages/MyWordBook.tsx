import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, ArrowLeft, User, Edit3, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import LoadingAnimation from '@/components/animations/LoadingAnimation';
import WordCard from '@/components/WordCard';
import ProfilePhotoSelector from '@/components/ProfilePhotoSelector';

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
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  
  // State management for word book functionality
  const [words, setWords] = useState<SavedWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedWords, setSelectedWords] = useState<Set<string>>(new Set());

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

  const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
    setSelectedWords(new Set());
  };

  const toggleWordSelection = (wordId: string) => {
    setSelectedWords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(wordId)) {
        newSet.delete(wordId);
      } else {
        newSet.add(wordId);
      }
      return newSet;
    });
  };

  const deleteSelectedWords = async () => {
    if (selectedWords.size === 0) return;

    try {
      console.log('🗑️ Removing selected words:', Array.from(selectedWords));
      
      const { error } = await supabase
        .from('user_vocabulary')
        .delete()
        .in('id', Array.from(selectedWords));

      if (error) {
        console.error('Database error removing words:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      // Remove the words from local state
      setWords(prev => prev.filter(w => !selectedWords.has(w.id)));
      setSelectedWords(new Set());
      setIsEditMode(false);
      
      toast({
        title: "✅ Words Removed",
        description: `${selectedWords.size} word${selectedWords.size > 1 ? 's' : ''} removed from your Word Book.`,
        duration: 3000,
      });
      
      console.log('✅ Successfully removed selected words');
    } catch (error) {
      console.error('❌ Error removing words:', error);
      toast({
        title: "Failed to Remove Words",
        description: error.message || "Could not remove words. Please try again.",
        variant: "destructive",
        duration: 4000,
      });
    }
  };



  if (!user) {
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
        
        <div className="relative z-10 min-h-full flex items-center justify-center">
          <Card className="p-8 text-center bg-white/20 border-white/30 backdrop-blur-xl shadow-xl">
            <CardContent>
              <div className="mb-4">
                <User className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-slate-800 mb-2">Sign in Required</h2>
                <p className="text-slate-600 mb-6">Please sign in to access your Word Book and save your progress.</p>
              </div>
              <div className="flex gap-3 justify-center">
                <Button onClick={() => navigate('/auth')} className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-2">
                  Sign In
                </Button>
                <Button onClick={() => navigate('/')} variant="outline" className="bg-white/50 border-white/30 text-slate-800 hover:bg-white/70">
                  Go Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
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
                onClick={() => navigate('/')}
                className="flex items-center gap-2 text-slate-800 hover:text-blue-600"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                <ArrowLeft className="w-4 h-4" />
                Home
              </Button>
            </div>
            
            <div className="flex items-center gap-3 lg:gap-4">
              {/* Edit Mode Controls */}
              {words.length > 0 && (
                <div className="flex items-center gap-2">
                  {isEditMode && selectedWords.size > 0 && (
                    <Button
                      onClick={deleteSelectedWords}
                      variant="destructive"
                      size="sm"
                      className="bg-red-500/80 hover:bg-red-600 text-white px-3 py-1 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete ({selectedWords.size})
                    </Button>
                  )}
                  <Button
                    onClick={toggleEditMode}
                    variant={isEditMode ? "secondary" : "outline"}
                    size="sm"
                    className={isEditMode 
                      ? "bg-white/20 text-slate-800 border-white/30" 
                      : "bg-white/10 text-slate-800 border-white/30 hover:bg-white/20"
                    }
                  >
                    <Edit3 className="w-4 h-4 mr-1" />
                    {isEditMode ? 'Done' : 'Modify'}
                  </Button>
                </div>
              )}
              
              {/* Clickable User Avatar for Photo Upload */}
              <ProfilePhotoSelector onPhotoUpdate={() => refreshProfile()}>
                <button
                  className="group w-8 h-8 lg:w-9 lg:h-9 rounded-full bg-slate-800/80 backdrop-blur-sm flex items-center justify-center border border-white/20 overflow-hidden hover:border-blue-400/50 transition-all duration-200 hover:scale-105"
                  title="Click to change profile photo"
                >
                  {profile?.avatar_url ? (
                    <img 
                      src={profile.avatar_url} 
                      alt="Profile" 
                      className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
                    />
                  ) : (
                    <User className="w-4 h-4 text-white group-hover:text-blue-300 transition-colors" />
                  )}
                  
                  {/* Upload overlay on hover */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex items-center justify-center">
                    <User className="w-3 h-3 text-white" />
                  </div>
                </button>
              </ProfilePhotoSelector>
            </div>
          </header>

          {/* Main Content */}
          <main className="relative sm:px-6 lg:px-12 pr-4 pb-12 pl-4">
            {/* Title */}
            <div className="text-center mb-8 pt-6">
              <h1 className="text-2xl lg:text-3xl text-slate-800 tracking-tight font-semibold mb-4" style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}>
                My Word Book
              </h1>
              <Badge variant="secondary" className="bg-white/20 text-slate-700 border-white/30">
                {words.length} {words.length === 1 ? 'word' : 'words'} saved
              </Badge>
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
              <>
                {/* Notification Suggestion */}
                <div className="mb-6 text-center">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
                    <span className="text-blue-500">💡</span>
                    <span>Click any word to hear pronunciation with different accents!</span>
                  </div>
                </div>

                {/* Word Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 word-card-grid">
                  {words.map((word) => (
                    <WordCard
                      key={word.id}
                      word={word}
                      onRemove={removeWord}
                      isEditMode={isEditMode}
                      isSelected={selectedWords.has(word.id)}
                      onToggleSelect={toggleWordSelection}
                    />
                  ))}
                </div>
              </>
            )}
          </main>
        </div>
      </div>
      
    </div>
  );
};

export default MyWordBook;