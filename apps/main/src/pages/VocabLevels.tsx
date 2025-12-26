import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Book, ArrowLeft, Play, Sparkles, FileText, Star, BookOpen, Sprout, Feather, GraduationCap, Globe, Check, Lock } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StudentLayout from "@/components/StudentLayout";
import SpotlightCard from "@/components/SpotlightCard";
import { CardContent } from "@/components/ui/card";
import { useThemeStyles } from "@/hooks/useThemeStyles";
import PageLoadingScreen from '@/components/PageLoadingScreen';
import DotLottieLoadingAnimation from '@/components/animations/DotLottieLoadingAnimation';
import { fetchVocabCards, getDeterministicShuffle, type D1VocabCard } from '@/lib/d1Client';
import { useSubscription } from "@/hooks/useSubscription";
import { ProLockOverlay, LockBadge, useProLockOverlay } from "@/components/ProLockOverlay";

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
  const { isItemLocked, isPro } = useSubscription();
  const { isOpen: lockOverlayOpen, showLockOverlay, hideLockOverlay, totalLockedCount } = useProLockOverlay();

  const [activeLevel, setActiveLevel] = useState<number>(1);
  const [cards, setCards] = useState<CardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalWordsByLevel, setTotalWordsByLevel] = useState<Record<number, number>>({});
  const [selectedLanguage, setSelectedLanguage] = useState<string>('ko');
  const [completedTests, setCompletedTests] = useState<Set<string>>(new Set());

  // Load user language preference
  useEffect(() => {
    let isMounted = true;

    const loadUserPreferences = async () => {
      if (!user) return;
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('native_language')
          .eq('id', user.id)
          .maybeSingle();
        if (isMounted && profile?.native_language) {
          setSelectedLanguage(profile.native_language);
        }
      } catch (error) {
        if (isMounted) console.error('Error loading user preferences:', error);
      }
    };
    loadUserPreferences();

    return () => { isMounted = false; };
  }, [user]);

  // Load completed tests status
  useEffect(() => {
    let isMounted = true;

    const fetchCompletionStatus = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('test_results')
          .select('test_data')
          .eq('user_id', user.id)
          .eq('test_type', 'vocabulary');

        if (error) throw error;

        if (isMounted) {
          const completedSet = new Set<string>();
          data?.forEach((res: any) => {
            if (res.test_data?.vocab_test_id) {
              completedSet.add(res.test_data.vocab_test_id);
            }
          });
          setCompletedTests(completedSet);
        }
      } catch (error) {
        if (isMounted) console.error('Error fetching completion status:', error);
      }
    };
    fetchCompletionStatus();

    return () => { isMounted = false; };
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
    let isMounted = true;

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

        if (!isMounted) return;

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

        if (!isMounted) return;

        // True random shuffle using Fisher-Yates to mix ALL letters together (matches VocabTest.tsx)
        const shuffledCards = getDeterministicShuffle(vocabCards);

        const WORDS_PER_LEVEL = Math.ceil(shuffledCards.length / MAX_LEVEL);

        const processedCards = shuffledCards.map((card, index: number) => {
          let level = card.level || 1;
          if (level > MAX_LEVEL || level < 1) {
            level = Math.floor(index / WORDS_PER_LEVEL) + 1;
            if (level > MAX_LEVEL) level = MAX_LEVEL;
          }
          return { id: card.id, term: card.term, level };
        });

        if (isMounted) {
          setCards(processedCards as CardData[]);

          const totals: Record<number, number> = {};
          processedCards.forEach((card) => {
            const level = card.level;
            totals[level] = (totals[level] || 0) + 1;
          });
          setTotalWordsByLevel(totals);
        }
      } catch (error) {
        if (isMounted) console.error('VocabLevels: Error loading cards:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadCards();

    return () => { isMounted = false; };
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
        name: `Day ${testNumber}`,
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
      document.documentElement.style.backgroundColor = '#FFFAF0';
      document.body.style.backgroundColor = '#FFFAF0';
      return () => {
        document.documentElement.style.backgroundColor = originalHtmlBg;
        document.body.style.backgroundColor = originalBodyBg;
      };
    }
  }, [themeStyles.theme.name]);

  if (authLoading) {
    return <PageLoadingScreen />;
  }

  return (
    <div
      className="min-h-screen relative"
      style={{
        backgroundColor: themeStyles.theme.name === 'dark' ? themeStyles.theme.colors.background : 'transparent'
      }}
    >
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed"
        style={{
          backgroundImage: themeStyles.theme.name === 'note' || themeStyles.theme.name === 'minimalist' || themeStyles.theme.name === 'dark'
            ? 'none'
            : `url('/1000031207.png')`,
          backgroundColor: themeStyles.backgroundImageColor
        }} />
      {themeStyles.theme.name === 'note' && (
        <style>{`
          body, html, #root { background-color: #FFFAF0 !important; }
          
          /* Custom Select styles for Note theme */
          .note-select-content {
            background-color: #FFFDF5 !important;
            border: 1px solid #E8D5A3 !important;
            box-shadow: 0 10px 25px -5px rgba(139, 105, 20, 0.1), 0 8px 10px -6px rgba(139, 105, 20, 0.1) !important;
            color: #5D4E37 !important;
            border-radius: 16px !important;
            padding: 6px !important;
            min-width: 200px !important;
          }
          .note-select-item {
            color: #5D4E37 !important;
            border-radius: 10px !important;
            padding: 8px 12px !important;
            margin-bottom: 2px !important;
            transition: all 0.2s ease !important;
            cursor: pointer !important;
          }
          .note-select-item:hover, 
          .note-select-item[data-highlighted] {
            background-color: #A68B5B !important;
            color: #FFFFFF !important;
            outline: none !important;
          }
          .note-select-item[data-state="checked"] {
            background-color: rgba(166, 139, 91, 0.1) !important;
            font-weight: 600 !important;
          }
          .select-flag {
            font-size: 1.25rem !important;
            line-height: 1 !important;
          }
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
                    onClick={() => navigate('/dashboard')}
                    className="hover:bg-[#A68B5B] hover:text-white transition-colors rounded-full px-4"
                    style={{ color: '#5D4E37' }}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Dashboard
                  </Button>
                </div>

                {/* Controls: Level Tabs and Language Selector */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-white/40 backdrop-blur-xl p-2 rounded-2xl border border-white/20 shadow-lg">
                  <div className="flex bg-black/5 p-1 rounded-xl">
                    {LEVELS.map((level) => {
                      const isActive = activeLevel === level;
                      const style = levelStyles[level];
                      return (
                        <button
                          key={level}
                          onClick={() => setActiveLevel(level)}
                          className={`
                            px-6 py-2 rounded-lg text-sm font-semibold transition-all duration-300
                            ${isActive
                              ? 'bg-white shadow-sm text-[#8B6914] scale-100'
                              : 'text-[#5D4E37]/60 hover:text-[#5D4E37] hover:bg-white/50'
                            }
                          `}
                          style={isActive ? {
                            color: themeStyles.textPrimary,
                            backgroundColor: themeStyles.theme.name === 'note' ? '#FFFDF5' : 'white',
                            ...themeStyles.cardStyle
                          } : {}}
                        >
                          {style.name}
                        </button>
                      );
                    })}
                  </div>

                  <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
                    <SelectTrigger className="w-[200px] h-11 px-4 rounded-xl border transition-all hover:bg-[#A68B5B]/10 focus:ring-0 focus:ring-offset-0" style={{
                      backgroundColor: themeStyles.theme.name === 'note' ? '#FFFDF5' : 'transparent',
                      color: themeStyles.textPrimary,
                      borderColor: themeStyles.border
                    }}>
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-[#8B6914] opacity-80" />
                        <SelectValue />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="note-select-content">
                      {languageOptions.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code} className="note-select-item">
                          <div className="flex items-center gap-3">
                            <span className="select-flag">{getFlagEmoji(lang.flag)}</span>
                            <span className="font-medium">{lang.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Tests Grid */}
                {loading ? (
                  <div className="flex justify-center py-12">
                    <DotLottieLoadingAnimation />
                  </div>
                ) : (
                  <>
                    <div className="text-center mb-6">
                      <h2 className="text-2xl font-semibold mb-2" style={{ color: themeStyles.textPrimary }}>
                        {levelStyles[activeLevel].name} - {levelStyles[activeLevel].band}
                      </h2>
                      <p className="text-[#8B6914]/80">
                        {totalWordsByLevel[activeLevel] || 0} words available
                      </p>
                    </div>

                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                      {tests.map((test, index) => {
                        const isLocked = false;
                        const lockedTestsCount = 0;

                        return (
                          <SpotlightCard
                            key={test.id}
                            className={`cursor-pointer h-[140px] hover:scale-105 transition-all duration-300 hover:shadow-lg flex items-center justify-center`}
                            onClick={() => {
                              if (isLocked) {
                                showLockOverlay('This vocabulary test', lockedTestsCount);
                              } else {
                                navigate(`/vocabulary/test/${test.id}?lang=${selectedLanguage}`);
                              }
                            }}
                            style={{
                              backgroundColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.8)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.1)' : themeStyles.theme.name === 'minimalist' ? '#ffffff' : themeStyles.theme.colors.cardBackground,
                              borderColor: themeStyles.border,
                              ...themeStyles.cardStyle
                            }}
                          >
                            <CardContent className="p-3 md:p-4 text-center flex items-center justify-center h-full">
                              {completedTests.has(test.id) ? (
                                <div className="absolute top-3 right-3">
                                  <Check className="w-5 h-5 text-[#799351]" />
                                </div>
                              ) : null}
                              <h3
                                className="font-semibold text-sm"
                                style={{ color: themeStyles.textPrimary }}
                              >
                                {test.name}
                              </h3>
                            </CardContent>
                          </SpotlightCard>
                        );
                      })}
                    </div>
                    {/* Pro Lock Overlay */}
                    <ProLockOverlay
                      isOpen={lockOverlayOpen}
                      onClose={hideLockOverlay}
                      featureName="This vocabulary test"
                      totalLockedCount={totalLockedCount}
                    />
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
