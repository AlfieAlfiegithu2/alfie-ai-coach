import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, ArrowLeft, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import DotLottieLoadingAnimation from '@/components/animations/DotLottieLoadingAnimation';
import WordCard from '@/components/WordCard';
import { useThemeStyles } from '@/hooks/useThemeStyles';

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
  const { user, profile, refreshProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const themeStyles = useThemeStyles();

  // State management for word book functionality
  const [words, setWords] = useState<SavedWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);
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
        context: '', // Don't show POS in wordbook
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

  // Wait for auth to finish loading before checking user
  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden" style={{ backgroundColor: '#FFFAF0' }}>
        <div
          className="absolute inset-0 pointer-events-none opacity-30 z-0"
          style={{
            backgroundImage: `url("https://www.transparenttextures.com/patterns/rice-paper-2.png")`,
            mixBlendMode: 'multiply'
          }}
        />
        <div className="relative z-10">
          <DotLottieLoadingAnimation />
        </div>
      </div>
    );
  }

  // Show sign-in prompt if user is not logged in after auth loading completes
  if (!authLoading && !user) {
    return (
      <div
        className="min-h-screen relative"
        style={{
          backgroundColor: themeStyles.theme.name === 'dark' ? themeStyles.theme.colors.background : 'transparent'
        }}
      >
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-contain bg-center bg-no-repeat bg-fixed"
          style={{
            backgroundImage: themeStyles.theme.name === 'note' || themeStyles.theme.name === 'minimalist' || themeStyles.theme.name === 'dark'
              ? 'none'
              : `url('/lovable-uploads/5d9b151b-eb54-41c3-a578-e70139faa878.png')`,
            backgroundColor: themeStyles.backgroundImageColor
          }}
        />

        <div className="relative z-10 min-h-full flex items-center justify-center">
          <Card
            className="p-8 text-center backdrop-blur-xl shadow-xl border rounded-xl"
            style={{
              backgroundColor: themeStyles.backgroundOverlay,
              borderColor: themeStyles.border
            }}
          >
            <CardContent>
              <div className="mb-4">
                <User className="w-16 h-16 mx-auto mb-4" style={{ color: themeStyles.textSecondary }} />
                <h2 className="text-xl font-semibold mb-2" style={{ fontFamily: 'Bricolage Grotesque, sans-serif', color: themeStyles.textPrimary }}>
                  Sign in Required
                </h2>
                <p className="mb-6" style={{ fontFamily: 'Inter, sans-serif', color: themeStyles.textSecondary }}>
                  Please sign in to access your Word Book and save your progress.
                </p>
              </div>
              <div className="flex gap-3 justify-center">
                <Button
                  onClick={() => navigate('/auth')}
                  className="px-6 py-2 text-white"
                  style={{
                    backgroundColor: themeStyles.buttonPrimary,
                    fontFamily: 'Inter, sans-serif'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = themeStyles.buttonPrimaryHover}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = themeStyles.buttonPrimary}
                >
                  Sign In
                </Button>
                <Button
                  onClick={() => navigate('/dashboard')}
                  variant="outline"
                  className="px-6 py-2"
                  style={{
                    backgroundColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.1)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.1)' : themeStyles.theme.name === 'minimalist' ? '#ffffff' : 'rgba(255,255,255,0.5)',
                    borderColor: themeStyles.border,
                    color: themeStyles.textPrimary,
                    fontFamily: 'Inter, sans-serif'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = themeStyles.hoverBg}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.1)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.1)' : themeStyles.theme.name === 'minimalist' ? '#ffffff' : 'rgba(255,255,255,0.5)'}
                >
                  Go to Dashboard
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
      <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden" style={{ backgroundColor: '#FFFAF0' }}>
        <div
          className="absolute inset-0 pointer-events-none opacity-30 z-0"
          style={{
            backgroundImage: `url("https://www.transparenttextures.com/patterns/rice-paper-2.png")`,
            mixBlendMode: 'multiply'
          }}
        />
        <div className="relative z-10">
          <DotLottieLoadingAnimation />
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen relative"
      style={{
        backgroundColor: themeStyles.theme.name === 'dark' ? themeStyles.theme.colors.background : 'transparent'
      }}
    >
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-contain bg-center bg-no-repeat bg-fixed"
        style={{
          backgroundImage: themeStyles.theme.name === 'note' || themeStyles.theme.name === 'minimalist' || themeStyles.theme.name === 'dark'
            ? 'none'
            : `url('/lovable-uploads/5d9b151b-eb54-41c3-a578-e70139faa878.png')`,
          backgroundColor: themeStyles.backgroundImageColor
        }}
      />

      <div className="relative z-10 min-h-full lg:py-10 lg:px-6 pt-6 pr-4 pb-6 pl-4">
        {/* Header */}
        <header
          className="flex sm:px-6 lg:px-12 lg:py-5 pt-4 pr-4 pb-4 pl-4 items-center border-b relative"
          style={{ borderColor: themeStyles.border + '60' }}
        >
          <div className="absolute left-4 sm:left-6 lg:left-12">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="flex items-center p-2"
              style={{
                fontFamily: 'Inter, sans-serif',
                color: themeStyles.textSecondary
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = themeStyles.buttonPrimary}
              onMouseLeave={(e) => e.currentTarget.style.color = themeStyles.textSecondary}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex-1 flex justify-center items-center">
            <h1
              className="text-xl lg:text-2xl tracking-tight font-semibold text-center"
              style={{
                fontFamily: 'Bricolage Grotesque, sans-serif',
                color: themeStyles.textPrimary
              }}
            >
              My Word Book
            </h1>
          </div>

          <div className="w-10 sm:w-12 lg:w-16">
            {/* Spacer to balance the back button */}
          </div>
        </header>

        {/* Main Content */}
        <main className="relative sm:px-6 lg:px-12 pr-4 pb-12 pl-4 pt-10 lg:pt-12">

          {/* Empty State */}
          {words.length === 0 ? (
            <div className="text-center py-16">
              <BookOpen className="w-20 h-20 mx-auto mb-6" style={{ color: themeStyles.textSecondary + '80' }} />
              <h3
                className="text-2xl font-semibold mb-4"
                style={{
                  fontFamily: 'Bricolage Grotesque, sans-serif',
                  color: themeStyles.textPrimary
                }}
              >
                Your Word Book is empty
              </h3>
              <p
                className="mb-8 max-w-md mx-auto"
                style={{
                  fontFamily: 'Inter, sans-serif',
                  color: themeStyles.textSecondary
                }}
              >
                Start building your vocabulary by selecting words during reading tests and clicking "Add to Word Book" in the translation popup.
              </p>
              <Button
                onClick={() => navigate('/ielts-portal')}
                className="px-6 py-3 rounded-xl backdrop-blur-sm border text-white"
                style={{
                  backgroundColor: themeStyles.buttonPrimary,
                  borderColor: themeStyles.border,
                  fontFamily: 'Inter, sans-serif'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = themeStyles.buttonPrimaryHover}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = themeStyles.buttonPrimary}
              >
                Start Learning
              </Button>
            </div>
          ) : (
            <>
              {/* Word Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 word-card-grid">
                {words.map((word) => (
                  <WordCard
                    key={word.id}
                    word={word}
                    onRemove={removeWord}
                    isEditMode={false}
                    isSelected={false}
                    onToggleSelect={undefined}
                  />
                ))}
              </div>
            </>
          )}
        </main>
      </div>

    </div>
  );
};

export default MyWordBook;