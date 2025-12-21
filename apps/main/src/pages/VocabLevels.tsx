import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Book, ArrowLeft, Play, Sparkles, FileText, Star, BookOpen, Sprout, Feather, GraduationCap, Globe } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StudentLayout from "@/components/StudentLayout";
import SpotlightCard from "@/components/SpotlightCard";
import { CardContent } from "@/components/ui/card";
import { useThemeStyles } from "@/hooks/useThemeStyles";
import LottieLoadingAnimation from "@/components/animations/LottieLoadingAnimation";
import { fetchVocabCards, type D1VocabCard } from '@/lib/d1Client';

const WORDS_PER_TEST = 20;
const LEVELS = [1, 2, 3, 4] as const;
const MAX_LEVEL = 4;

const languageOptions = [
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
  { code: 'id', name: 'Bahasa Indonesia', flag: '🇮🇩' },
];

interface CardData {
  id: string;
  term: string;
  level: number;
}

interface TestInfo {
  id: string;
  name: string;
  wordCount: number;
  level: number;
  testNumber: number;
  totalTestsInLevel: number;
}

const levelStyles: Record<number, { name: string; band: string; Icon: any }> = {
  1: { name: 'Level 1', band: 'Foundation', Icon: Sprout },
  2: { name: 'Level 2', band: 'Elementary', Icon: Feather },
  3: { name: 'Level 3', band: 'Intermediate', Icon: BookOpen },
  4: { name: 'Level 4', band: 'Advanced', Icon: GraduationCap },
};

export default function VocabLevels() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const themeStyles = useThemeStyles();

  const [activeLevel, setActiveLevel] = useState<number>(1);
  const [cards, setCards] = useState<CardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalWordsByLevel, setTotalWordsByLevel] = useState<Record<number, number>>({});
  const [selectedLanguage, setSelectedLanguage] = useState<string>('ko');

  // Load user language preference
  useEffect(() => {
    const loadUserPreferences = async () => {
      if (!user) return;
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('native_language')
          .eq('id', user.id)
          .single();
        if (profile?.native_language) {
          setSelectedLanguage(profile.native_language);
        }
      } catch (error) {
        console.error('Error loading user preferences:', error);
      }
    };
    loadUserPreferences();
  }, [user]);

  const handleLanguageChange = async (newLanguage: string) => {
    setSelectedLanguage(newLanguage);
    if (user) {
      try {
        await supabase
          .from('profiles')
          .update({ native_language: newLanguage })
          .eq('id', user.id);
      } catch (error) {
        console.error('Error saving language preference:', error);
      }
    }
  };

  // Load all cards from D1 (Cloudflare edge - faster!) with Supabase fallback
  useEffect(() => {
    const loadCards = async () => {
      setLoading(true);

      try {
        // Try D1 first
        let vocabCards: { id: string; term: string; level?: number }[] = [];

        try {
          const d1Cards = await fetchVocabCards({ limit: 10000 });
          console.log('VocabLevels: Loaded', d1Cards.length, 'cards from D1');
          vocabCards = d1Cards.map((card: D1VocabCard) => ({
            id: card.id,
            term: card.term,
            level: card.level
          }));
        } catch (d1Error) {
          console.warn('VocabLevels: D1 fetch failed, falling back to Supabase:', d1Error);
        }

        // Fallback to Supabase if D1 returned no cards
        if (vocabCards.length === 0) {
          console.log('VocabLevels: Falling back to Supabase...');
          const { data: supabaseCards, error } = await supabase
            .from('vocab_cards')
            .select('id, term, level')
            .order('created_at', { ascending: true })
            .limit(10000);

          if (!error && supabaseCards) {
            vocabCards = supabaseCards.map((card: any) => ({
              id: card.id,
              term: card.term,
              level: card.level || 1
            }));
            console.log('VocabLevels: Loaded', vocabCards.length, 'cards from Supabase fallback');
          } else {
            console.error('VocabLevels: Supabase fallback also failed:', error);
          }
        }

        // Shuffle all cards from D1 so sets are varied and not just alphabetical
        // We use a deterministic shuffle by ID so sets are stable across refreshes
        const shuffledCards = [...vocabCards].sort((a, b) => {
          const hashA = a.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
          const hashB = b.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
          return (hashA % 97) - (hashB % 97) || a.id.localeCompare(b.id);
        });

        const WORDS_PER_LEVEL = Math.ceil(shuffledCards.length / MAX_LEVEL);

        const processedCards = shuffledCards.map((card, index: number) => {
          let level = card.level || 1;
          if (level > MAX_LEVEL || level < 1) {
            level = Math.floor(index / WORDS_PER_LEVEL) + 1;
            if (level > MAX_LEVEL) level = MAX_LEVEL;
          }
          return { id: card.id, term: card.term, level };
        });

        setCards(processedCards as CardData[]);

        const totals: Record<number, number> = {};
        processedCards.forEach((card) => {
          const level = card.level;
          totals[level] = (totals[level] || 0) + 1;
        });
        setTotalWordsByLevel(totals);
      } catch (error) {
        console.error('VocabLevels: Error loading cards:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCards();
  }, [user]);

  const tests = useMemo(() => {
    const levelCards = cards.filter(c => c.level === activeLevel);
    const testList: TestInfo[] = [];
    const totalTestsInLevel = Math.ceil(levelCards.length / WORDS_PER_TEST);

    for (let i = 0; i < levelCards.length; i += WORDS_PER_TEST) {
      const chunk = levelCards.slice(i, i + WORDS_PER_TEST);
      const testNumber = Math.floor(i / WORDS_PER_TEST) + 1;

      testList.push({
        id: `${activeLevel}-${testNumber}`,
        name: `Test ${testNumber}`,
        wordCount: chunk.length,
        level: activeLevel,
        testNumber: testNumber,
        totalTestsInLevel,
      });
    }

    return testList;
  }, [cards, activeLevel]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FEF9E7]">
        <LottieLoadingAnimation />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative bg-[#FEF9E7]">
      <div className="relative z-10">
        <StudentLayout title="Vocabulary Tests" showBackButton={false} transparentBackground={true}>
          <div className="min-h-screen py-8">
            <div className="container mx-auto px-4">
              <div className="max-w-6xl mx-auto space-y-8">

                {/* Custom Back Button */}
                <div className="flex items-center mb-4">
                  <Button
                    variant="ghost"
                    onClick={() => navigate('/vocabulary-book')}
                    className="hover:bg-[#A68B5B] hover:text-white transition-colors rounded-full px-4"
                    style={{ color: '#5D4E37' }}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Vocabulary
                  </Button>
                </div>

                {/* Controls: Level Tabs and Language Selector */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-white/50 backdrop-blur-sm p-4 rounded-xl border border-[#E8D5A3] shadow-sm">
                  <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                    {LEVELS.map((level) => {
                      const isActive = activeLevel === level;
                      const style = levelStyles[level];
                      return (
                        <Button
                          key={level}
                          variant={isActive ? "default" : "outline"}
                          onClick={() => setActiveLevel(level)}
                          className={`flex items-center gap-2 ${isActive ? '' : 'hover:bg-[#A68B5B]/10'}`}
                          style={isActive ? {
                            backgroundColor: '#A68B5B',
                            color: '#fff'
                          } : {
                            color: '#5D4E37',
                            borderColor: '#E8D5A3',
                            backgroundColor: 'transparent'
                          }}
                        >
                          <style.Icon className="w-4 h-4" />
                          <span>{style.name}</span>
                        </Button>
                      );
                    })}
                  </div>

                  <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
                    <SelectTrigger className="w-[180px]" style={{
                      backgroundColor: 'rgba(255,255,255,0.8)',
                      color: '#5D4E37',
                      borderColor: '#E8D5A3'
                    }}>
                      <Globe className="w-4 h-4 mr-2 opacity-70" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {languageOptions.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code}>
                          <span className="flex items-center gap-2">
                            <span className="text-lg">{lang.flag}</span>
                            <span>{lang.name}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Tests Grid */}
                {loading ? (
                  <div className="flex justify-center py-12">
                    <LottieLoadingAnimation />
                  </div>
                ) : (
                  <>
                    <div className="text-center mb-6">
                      <h2 className="text-2xl font-bold mb-2" style={{ color: '#5D4E37' }}>
                        {levelStyles[activeLevel].name} - {levelStyles[activeLevel].band}
                      </h2>
                      <p className="text-[#8B6914]/80">
                        {totalWordsByLevel[activeLevel] || 0} words available
                      </p>
                    </div>

                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                      {tests.map((test) => (
                        <SpotlightCard
                          key={test.id}
                          className="cursor-pointer h-[120px] hover:scale-105 transition-all duration-300 hover:shadow-lg flex items-center justify-center group"
                          onClick={() => navigate(`/vocabulary/test/${test.id}?lang=${selectedLanguage}`)}
                          style={{
                            backgroundColor: 'rgba(255,255,255,0.8)',
                            borderColor: '#E8D5A3'
                          }}
                        >
                          <CardContent className="p-3 text-center flex flex-col items-center justify-center h-full w-full">
                            <h3 className="font-semibold text-base group-hover:text-[#A68B5B] transition-colors" style={{ color: '#5D4E37' }}>
                              {test.name}
                            </h3>
                          </CardContent>
                        </SpotlightCard>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </StudentLayout>
      </div>
    </div>
  );
}
