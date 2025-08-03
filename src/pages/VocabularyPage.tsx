import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Trash2, BookOpen, Calendar, Languages, Globe } from 'lucide-react';
import StudentLayout from '@/components/StudentLayout';
import VocabularyFlipCard from '@/components/VocabularyFlipCard';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface SavedWord {
  id: string;
  word: string;
  translation?: string;
  context?: string;
  savedAt: string;
  languageCode?: string;
}

const VocabularyPage = () => {
  const { user } = useAuth();
  const [savedWords, setSavedWords] = useState<SavedWord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredWords, setFilteredWords] = useState<SavedWord[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [translating, setTranslating] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState('Spanish');

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
    if (user) {
      loadUserProfile();
      loadSavedWords();
    }
  }, [user]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = savedWords.filter(word =>
        word.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (word.translation && word.translation.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (word.context && word.context.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredWords(filtered);
    } else {
      setFilteredWords(savedWords);
    }
  }, [searchTerm, savedWords]);

  const loadUserProfile = async () => {
    if (!user) return;
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('native_language')
      .eq('id', user.id)
      .single();
    
    setUserProfile(profile);
  };

  const loadSavedWords = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('smart-vocabulary', {
        body: {
          action: 'getUserVocabulary',
          userId: user.id
        }
      });

      if (error) throw error;
      
      if (data.vocabulary) {
        setSavedWords(data.vocabulary);
      }
    } catch (error) {
      console.error('Error loading vocabulary:', error);
      toast.error('Failed to load vocabulary');
    } finally {
      setLoading(false);
    }
  };

  const removeWord = async (wordId: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase.functions.invoke('smart-vocabulary', {
        body: {
          action: 'removeWord',
          wordId: wordId,
          userId: user.id
        }
      });

      if (error) throw error;

      const updatedWords = savedWords.filter(word => word.id !== wordId);
      setSavedWords(updatedWords);
      toast.success('Word removed from vocabulary');
    } catch (error) {
      console.error('Error removing word:', error);
      toast.error('Failed to remove word');
    }
  };

  const clearAll = async () => {
    if (!window.confirm('Are you sure you want to clear all saved vocabulary?')) return;
    
    try {
      // Remove all words one by one (could be optimized with batch delete)
      for (const word of savedWords) {
        await removeWord(word.id);
      }
      setSavedWords([]);
      toast.success('All vocabulary cleared');
    } catch (error) {
      console.error('Error clearing vocabulary:', error);
      toast.error('Failed to clear vocabulary');
    }
  };

  const translateWord = async (wordId: string, word: string) => {
    setTranslating(wordId);
    try {
      // Get the language code from the selected language name
      const selectedLang = languages.find(lang => lang.name === selectedLanguage);
      const targetLangCode = selectedLang?.code || 'es';

      const { data, error } = await supabase.functions.invoke('translation-service', {
        body: {
          text: word,
          targetLang: targetLangCode,
          sourceLang: 'en'
        }
      });

      if (error) throw error;

      // Fix response parsing - the translation is nested in data.result.translation
      if (data?.success && data?.result?.translation) {
        const updatedWords = savedWords.map(w => 
          w.id === wordId 
            ? { ...w, translation: data.result.translation }
            : w
        );
        setSavedWords(updatedWords);
        localStorage.setItem('alfie-saved-vocabulary', JSON.stringify(updatedWords));
      }
    } catch (error) {
      console.error('Translation error:', error);
    } finally {
      setTranslating(null);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center">
          <CardTitle className="text-2xl mb-4">Please Sign In</CardTitle>
          <p className="text-gray-600">You need to be signed in to access your vocabulary.</p>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center">
          <CardTitle className="text-2xl mb-4">Loading Vocabulary...</CardTitle>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-full flex items-center justify-center lg:py-10 lg:px-6 pt-6 pr-4 pb-6 pl-4">
      {/* Background Image - Same as Dashboard */}
      <div className="fixed top-0 w-full h-screen bg-cover bg-center -z-10" style={{
        backgroundImage: "url('https://hoirqrkdgbmvpwutwuwj.supabase.co/storage/v1/object/public/assets/assets/44dea03b-7cbb-41b6-934f-6482f1fdf2e3_3840w.jpg')"
      }} />
      
      <div className="relative w-full max-w-[1440px] lg:rounded-3xl overflow-hidden lg:mx-8 shadow-black/10 bg-white/20 border-white/30 border rounded-2xl mr-4 ml-4 shadow-[0_2.8px_2.2px_rgba(0,_0,_0,_0.034),_0_6.7px_5.3px_rgba(0,_0,_0,_0.048),_0_12.5px_10px_rgba(0,_0,_0,_0.06),_0_22.3px_17.9px_rgba(0,_0,_0,_0.072),_0_41.8px_33.4px_rgba(0,_0,_0,_0.086),_0_100px_80px_rgba(0,_0,_0,_0.12)] backdrop-blur-xl">
        
        <div className="max-w-4xl mx-auto space-y-6 p-6">
        
        {/* Header with Language Selector */}
        <Card className="bg-white/10 border-white/20 backdrop-blur-xl">
          <CardHeader>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-white/20">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl text-black">My Saved Vocabulary</CardTitle>
                  <p className="text-black/70">
                    {savedWords.length} words saved
                  </p>
                </div>
              </div>
              {savedWords.length > 0 && (
                <Button 
                  variant="outline" 
                  onClick={clearAll}
                  className="text-white border-white/30 hover:bg-white/20"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear All
                 </Button>
               )}
             </div>
             
             {/* User's Native Language Display */}
             {userProfile?.native_language && (
               <div className="flex items-center gap-3">
                 <Languages className="w-5 h-5 text-black/70" />
                 <span className="text-sm text-black/70">
                   Your vocabulary in: {userProfile.native_language}
                 </span>
               </div>
             )}
          </CardHeader>
          
          {savedWords.length > 0 && (
            <CardContent>
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-white/50" />
                <Input
                  placeholder="Search your vocabulary..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white/10 border-white/30 text-white placeholder:text-white/50"
                />
              </div>
            </CardContent>
          )}
        </Card>

        {/* Vocabulary List */}
        {savedWords.length === 0 ? (
          <Card className="bg-white/10 border-white/20 backdrop-blur-xl">
            <CardContent className="text-center py-12">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Languages className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-white">No vocabulary saved yet</h3>
              <p className="text-white/70 mb-6">
                Start reading passages and click on words to save them to your vocabulary list
              </p>
              <Button onClick={() => window.history.back()} className="bg-white/20 hover:bg-white/30 text-white border-white/30">
                Start Reading Practice
              </Button>
            </CardContent>
          </Card>
        ) : filteredWords.length === 0 ? (
          <Card className="bg-white/10 border-white/20 backdrop-blur-xl">
            <CardContent className="text-center py-8">
              <p className="text-white/70">No words match your search</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredWords.map((word) => (
               <VocabularyFlipCard
                 key={word.id}
                 word={word}
                 onRemove={() => removeWord(word.id)}
                 translating={translating === word.id}
               />
            ))}
          </div>
        )}

        {/* Quick Stats */}
        {savedWords.length > 0 && (
          <Card className="bg-white/10 border-white/20 backdrop-blur-xl">
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-white">{savedWords.length}</div>
                  <div className="text-sm text-white/70">Total Words</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-400">
                    {new Set(savedWords.map(w => w.word.charAt(0).toUpperCase())).size}
                  </div>
                  <div className="text-sm text-white/70">Starting Letters</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-400">
                    {Math.round(savedWords.reduce((acc, word) => acc + word.word.length, 0) / savedWords.length) || 0}
                  </div>
                  <div className="text-sm text-white/70">Avg. Length</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-400">
                    {savedWords.filter(w => new Date(w.savedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length}
                  </div>
                  <div className="text-sm text-white/70">This Week</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        </div>
      </div>
    </div>
  );
};

export default VocabularyPage;