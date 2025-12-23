import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Book, ArrowLeft, Play, Sparkles, FileText, Star, BookOpen, Sprout, Feather, GraduationCap, Globe, Check } from "lucide-react";
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

// All 69 supported languages, ordered by popularity/usage
const languageOptions = [
  // Top tier - Most spoken languages globally
  { code: 'zh', name: '中文 (简体)', flag: 'CN' },
  { code: 'zh-TW', name: '繁體中文', flag: 'TW' },
  { code: 'es', name: 'Español', flag: 'ES' },
  { code: 'hi', name: 'हिन्दी', flag: 'IN' },
  { code: 'ar', name: 'العربية', flag: 'SA' },
  { code: 'bn', name: 'বাংলা', flag: 'BD' },
  { code: 'pt', name: 'Português', flag: 'BR' },
  { code: 'ru', name: 'Русский', flag: 'RU' },
  { code: 'ja', name: '日本語', flag: 'JP' },
  { code: 'ko', name: '한국어', flag: 'KR' },
  { code: 'vi', name: 'Tiếng Việt', flag: 'VN' },
  { code: 'fr', name: 'Français', flag: 'FR' },
  { code: 'de', name: 'Deutsch', flag: 'DE' },
  { code: 'it', name: 'Italiano', flag: 'IT' },
  { code: 'tr', name: 'Türkçe', flag: 'TR' },
  // Southeast Asian
  { code: 'th', name: 'ไทย', flag: 'TH' },
  { code: 'id', name: 'Bahasa Indonesia', flag: 'ID' },
  { code: 'ms', name: 'Bahasa Melayu', flag: 'MY' },
  { code: 'tl', name: 'Filipino', flag: 'PH' },
  { code: 'my', name: 'မြန်မာ', flag: 'MM' },
  { code: 'km', name: 'ភាសាខ្មែរ', flag: 'KH' },
  // South Asian
  { code: 'ur', name: 'اردو', flag: 'PK' },
  { code: 'ta', name: 'தமிழ்', flag: 'IN' },
  { code: 'te', name: 'తెలుగు', flag: 'IN' },
  { code: 'mr', name: 'मराठी', flag: 'IN' },
  { code: 'gu', name: 'ગુજરાતી', flag: 'IN' },
  { code: 'kn', name: 'ಕನ್ನಡ', flag: 'IN' },
  { code: 'ml', name: 'മലയാളം', flag: 'IN' },
  { code: 'pa', name: 'ਪੰਜਾਬੀ', flag: 'IN' },
  { code: 'or', name: 'ଓଡ଼ିଆ', flag: 'IN' },
  { code: 'as', name: 'অসমীয়া', flag: 'IN' },
  { code: 'ne', name: 'नेपाली', flag: 'NP' },
  { code: 'si', name: 'සිංහල', flag: 'LK' },
  // Middle Eastern
  { code: 'fa', name: 'فارسی', flag: 'IR' },
  { code: 'he', name: 'עברית', flag: 'IL' },
  { code: 'ps', name: 'پښتو', flag: 'AF' },
  // European - Western
  { code: 'nl', name: 'Nederlands', flag: 'NL' },
  { code: 'pl', name: 'Polski', flag: 'PL' },
  { code: 'uk', name: 'Українська', flag: 'UA' },
  { code: 'ro', name: 'Română', flag: 'RO' },
  { code: 'el', name: 'Ελληνικά', flag: 'GR' },
  { code: 'cs', name: 'Čeština', flag: 'CZ' },
  { code: 'hu', name: 'Magyar', flag: 'HU' },
  { code: 'sv', name: 'Svenska', flag: 'SE' },
  { code: 'bg', name: 'Български', flag: 'BG' },
  { code: 'sr', name: 'Српски', flag: 'RS' },
  { code: 'hr', name: 'Hrvatski', flag: 'HR' },
  { code: 'sk', name: 'Slovenčina', flag: 'SK' },
  { code: 'no', name: 'Norsk', flag: 'NO' },
  { code: 'da', name: 'Dansk', flag: 'DK' },
  { code: 'fi', name: 'Suomi', flag: 'FI' },
  { code: 'sq', name: 'Shqip', flag: 'AL' },
  { code: 'sl', name: 'Slovenščina', flag: 'SI' },
  { code: 'et', name: 'Eesti', flag: 'EE' },
  { code: 'lv', name: 'Latviešu', flag: 'LV' },
  { code: 'lt', name: 'Lietuvių', flag: 'LT' },
  // Central Asian
  { code: 'uz', name: "O'zbek", flag: 'UZ' },
  { code: 'kk', name: 'Қазақ', flag: 'KZ' },
  { code: 'az', name: 'Azərbaycan', flag: 'AZ' },
  { code: 'mn', name: 'Монгол', flag: 'MN' },
  { code: 'ka', name: 'ქართული', flag: 'GE' },
  { code: 'hy', name: 'Հայերեն', flag: 'AM' },
  // African
  { code: 'sw', name: 'Kiswahili', flag: 'KE' },
  { code: 'ha', name: 'Hausa', flag: 'NG' },
  { code: 'yo', name: 'Yorùbá', flag: 'NG' },
  { code: 'ig', name: 'Igbo', flag: 'NG' },
  { code: 'am', name: 'አማርኛ', flag: 'ET' },
  { code: 'zu', name: 'isiZulu', flag: 'ZA' },
  { code: 'af', name: 'Afrikaans', flag: 'ZA' },
  // Chinese dialects
  { code: 'yue', name: '粵語', flag: 'HK' },
  // English (for reference)
  { code: 'en', name: 'English', flag: 'GB' },
];

// Helper function to convert country code to flag emoji
const getFlagEmoji = (countryCode: string) => {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

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
  const [completedTests, setCompletedTests] = useState<Set<string>>(new Set());

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

  // Load completed tests status
  useEffect(() => {
    const fetchCompletionStatus = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('test_results')
          .select('test_data')
          .eq('user_id', user.id)
          .eq('test_type', 'vocabulary');

        if (error) throw error;

        const completedSet = new Set<string>();
        data?.forEach((res: any) => {
          if (res.test_data?.vocab_test_id) {
            completedSet.add(res.test_data.vocab_test_id);
          }
        });
        setCompletedTests(completedSet);
      } catch (error) {
        console.error('Error fetching completion status:', error);
      }
    };
    fetchCompletionStatus();
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
          const d1Cards = await fetchVocabCards({ limit: 5000 });
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

        // True random shuffle using Fisher-Yates to mix ALL letters together (matches VocabTest.tsx)
        const shuffledCards = [...vocabCards];
        for (let i = shuffledCards.length - 1; i > 0; i--) {
          // Use a seeded random based on index to keep it stable per session
          const j = Math.floor(Math.abs(Math.sin(i * 9999) * 10000) % (i + 1));
          [shuffledCards[i], shuffledCards[j]] = [shuffledCards[j], shuffledCards[i]];
        }

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

  // Ensure background covers whole body for note theme
  useEffect(() => {
    if (themeStyles.theme.name === 'note') {
      const originalHtmlBg = document.documentElement.style.backgroundColor;
      const originalBodyBg = document.body.style.backgroundColor;
      document.documentElement.style.backgroundColor = '#FEF9E7';
      document.body.style.backgroundColor = '#FEF9E7';
      return () => {
        document.documentElement.style.backgroundColor = originalHtmlBg;
        document.body.style.backgroundColor = originalBodyBg;
      };
    }
  }, [themeStyles.theme.name]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FEF9E7]" style={{ backgroundColor: '#FEF9E7' }}>
        <style>{`body, html, #root { background-color: #FEF9E7 !important; }`}</style>
        <LottieLoadingAnimation />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative bg-[#FEF9E7]">
      {themeStyles.theme.name === 'note' && (
        <style>{`
          body, html, #root { background-color: #FEF9E7 !important; }
        `}</style>
      )}
      <div className="relative z-10">
        <StudentLayout title="Vocabulary Tests" showBackButton={false} transparentBackground={true}>
          <div className="min-h-screen py-8">
            <div className="container mx-auto px-4">
              <div className="max-w-6xl mx-auto space-y-8">

                {/* Custom Back Button */}
                <div className="flex items-center mb-4">
                  <Button
                    variant="ghost"
                    onClick={() => navigate('/vocabulary/book')}
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
                            <span className="text-lg">{getFlagEmoji(lang.flag)}</span>
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
                          <CardContent className="p-3 text-center flex flex-col items-center justify-center h-full w-full relative">
                            <h3 className="font-semibold text-base group-hover:text-[#A68B5B] transition-colors" style={{ color: '#5D4E37' }}>
                              {test.name}
                            </h3>
                            {completedTests.has(test.id) && (
                              <div className="flex items-center gap-1 mt-1 text-[#799351]">
                                <Check className="w-4 h-4" />
                                <span className="text-xs font-black uppercase tracking-wider">Memorised</span>
                              </div>
                            )}
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
