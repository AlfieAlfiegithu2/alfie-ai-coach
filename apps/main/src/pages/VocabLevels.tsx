import { useEffect, useState, useMemo, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import LoadingOverlay from '@/components/transitions/LoadingOverlay';
import LoadingAnimation from "@/components/animations/LoadingAnimation";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { Book, ArrowLeft, Play, Sparkles, FileText, Star, BookOpen, Sprout, Feather, GraduationCap, Globe, Check, Lock } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StudentLayout from "@/components/StudentLayout";
import SpotlightCard from "@/components/SpotlightCard";
import { CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useThemeStyles } from "@/hooks/useThemeStyles";
import PageLoadingScreen from '@/components/PageLoadingScreen';
import DotLottieLoadingAnimation from '@/components/animations/DotLottieLoadingAnimation';
import { fetchVocabCards, getDeterministicShuffle, type D1VocabCard } from '@/lib/d1Client';
import { useSubscription } from "@/hooks/useSubscription";
import { ProLockOverlay, LockBadge, useProLockOverlay } from "@/components/ProLockOverlay";
import LanguageSelector from "@/components/LanguageSelector";
import { useDashboardFont } from '@/hooks/useDashboardFont';

const WORDS_PER_TEST = 20;
const LEVELS = [1, 2, 3, 4] as const;
const MAX_LEVEL = 4;



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
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const themeStyles = useThemeStyles();
  const { isItemLocked, isPro } = useSubscription();
  const { isOpen: lockOverlayOpen, showLockOverlay, hideLockOverlay, totalLockedCount } = useProLockOverlay();
  const dashboardFont = useDashboardFont();

  const [activeLevel, setActiveLevel] = useState<number>(1);
  const [cards, setCards] = useState<CardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalWordsByLevel, setTotalWordsByLevel] = useState<Record<number, number>>({});
  const [completedTests, setCompletedTests] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const isNoteTheme = themeStyles.theme.name === 'note';

  const handleTestClick = (deckId: string) => {
    startTransition(() => {
      navigate(`/vocabulary/test/${deckId}?lang=${i18n.language}`);
    });
  };

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
        backgroundColor: themeStyles.theme.name === 'dark' ? themeStyles.theme.colors.background : themeStyles.theme.name === 'note' ? '#FFFAF0' : 'transparent',
        fontFamily: dashboardFont
      }}
    >
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed"
        style={{
          backgroundImage: themeStyles.theme.name === 'note' || themeStyles.theme.name === 'minimalist' || themeStyles.theme.name === 'dark'
            ? 'none'
            : `url('/1000031207.png')`,
          backgroundColor: themeStyles.theme.name === 'note' ? '#FFFAF0' : themeStyles.backgroundImageColor
        }} />

      {/* Paper texture overlays for Note theme */}
      {themeStyles.theme.name === 'note' && (
        <>
          {/* Background texture layer */}
          <div
            className="absolute inset-0 pointer-events-none opacity-30 z-0"
            style={{
              backgroundImage: `url("https://www.transparenttextures.com/patterns/rice-paper-2.png")`,
              mixBlendMode: 'multiply'
            }}
          />
          <div
            className="absolute inset-0 pointer-events-none opacity-10 z-0"
            style={{
              backgroundImage: `url("https://www.transparenttextures.com/patterns/natural-paper.png")`,
              mixBlendMode: 'multiply',
              filter: 'contrast(1.2)'
            }}
          />
          {/* Top texture overlay - affects all content */}
          <div
            className="fixed inset-0 pointer-events-none z-50"
            style={{
              backgroundImage: `url("https://www.transparenttextures.com/patterns/rice-paper-2.png")`,
              mixBlendMode: 'multiply',
              opacity: 0.35,
              filter: 'contrast(1.2)'
            }}
          />
        </>
      )}

      <div className="relative z-10">
        <StudentLayout title="Vocabulary Tests" showBackButton={true} backPath="/exam-selection" transparentBackground={true}>
          <div className="py-8">
            <div className="container mx-auto px-4">
              <div className="max-w-6xl mx-auto space-y-8">



                {/* Hero Header */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-2 relative z-50">
                  <h1 className={cn(
                    "text-4xl md:text-5xl font-bold tracking-tight text-center md:text-left",
                    isNoteTheme && "font-handwriting text-6xl"
                  )} style={{ color: themeStyles.textPrimary }}>
                    Vocabulary
                  </h1>

                  {/* Controls: Level Tabs and Language Selector */}
                  <div className={cn(
                    "flex flex-col sm:flex-row items-center justify-center gap-2 p-1.5 w-full sm:w-auto",
                    isNoteTheme ? "bg-white/40 backdrop-blur-md border border-[#e8d5a3]/60 rounded-2xl shadow-sm" : "bg-muted/50 rounded-2xl"
                  )}>
                    {/* Level Filter Tabs */}
                    <Tabs value={String(activeLevel)} onValueChange={(v) => setActiveLevel(Number(v) as typeof activeLevel)} className="w-full sm:w-auto">
                      <TabsList className="grid w-full sm:w-auto grid-cols-4 sm:flex items-center justify-center h-10 p-0 gap-1 bg-transparent border-none shadow-none">
                        {LEVELS.map((level) => (
                          <TabsTrigger
                            key={level}
                            value={String(level)}
                            className={cn(
                              "rounded-xl transition-all duration-300 px-4 sm:px-8 h-9 text-sm font-medium",
                              isNoteTheme ? "data-[state=active]:bg-[#8b6914] data-[state=active]:text-white data-[state=active]:shadow-md text-[#5d4e37] hover:bg-[#8b6914]/10" : "data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow",
                              isNoteTheme && "font-handwriting text-lg font-bold"
                            )}
                          >
                            {levelStyles[level].name}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                    </Tabs>

                    <div className="hidden sm:block w-px h-6 bg-[#e8d5a3]/40 mx-1" />

                    {/* Language Selector */}
                    <div className="flex-shrink-0">
                      <LanguageSelector minimal />
                    </div>
                  </div>
                </div>

                {/* Tests Grid */}
                {loading ? (
                  <div className="flex justify-center py-12">
                    <DotLottieLoadingAnimation />
                  </div>
                ) : (
                  <>
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
                                navigate(`/vocabulary/test/${test.id}?lang=${i18n.language}`);
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
                                className={cn(
                                  "font-semibold text-sm",
                                  isNoteTheme && "font-handwriting text-xl font-bold"
                                )}
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
        </StudentLayout >
        <AnimatePresence>
          {isPending && <LoadingOverlay />}
        </AnimatePresence>
      </div >
    </div >
  );
}
