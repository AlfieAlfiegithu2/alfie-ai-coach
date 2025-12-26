import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Book, Search, Play, Globe, Sparkles, GraduationCap, Volume2, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import StudentLayout from '@/components/StudentLayout';
import SpotlightCard from '@/components/SpotlightCard';
import { useThemeStyles } from '@/hooks/useThemeStyles';
import PageLoadingScreen from '@/components/PageLoadingScreen';
import DotLottieLoadingAnimation from '@/components/animations/DotLottieLoadingAnimation';
import { fetchVocabCards, fetchAllTranslationsForLanguage, type D1VocabCard } from '@/lib/d1Client';

interface CardRow {
  id: string;
  term: string;
  translation: string;
  pos?: string | null;
  ipa?: string | null;
  context_sentence?: string | null;
  user_id?: string;
  level?: number;
  deck_id?: string;
}

interface TranslationData {
  [lang: string]: string;
}

interface ImageData {
  [cardId: string]: string; // card_id -> url
}

interface DeckInfo {
  id: string;
  name: string;
  cards: CardRow[];
}

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

const WORDS_PER_DECK = 20;
const MAX_LEVEL = 4;

const levelColors = [
  'bg-emerald-100 text-emerald-800 border-emerald-200', // Level 1
  'bg-sky-100 text-sky-800 border-sky-200',         // Level 2
  'bg-violet-100 text-violet-800 border-violet-200',   // Level 3
  'bg-orange-100 text-orange-800 border-orange-200',   // Level 4
];

const levelNames = ['Level 1', 'Level 2', 'Level 3', 'Level 4'];

export default function VocabularyBook() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const themeStyles = useThemeStyles();
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<CardRow[]>([]);
  const [translations, setTranslations] = useState<Record<string, TranslationData>>({});
  const [images, setImages] = useState<ImageData>({});
  const [preferredLanguage, setPreferredLanguage] = useState<string>('ko');
  const [filter, setFilter] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [viewDeck, setViewDeck] = useState<DeckInfo | null>(null);

  // Load user's preferred language
  useEffect(() => {
    const loadUserPreferences = async () => {
      if (!user) return;
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('native_language')
          .eq('id', user.id)
          .maybeSingle();
        if (profile?.native_language) {
          setPreferredLanguage(profile.native_language);
        }
      } catch (error) {
        console.error('Error loading user preferences:', error);
      }
    };
    loadUserPreferences();
  }, [user]);

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

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      try {
        // Fetch ALL cards from D1 (Cloudflare edge - faster!)
        const d1Cards = await fetchVocabCards({ limit: 2000 });
        console.log('VocabularyBook: Loaded', d1Cards.length, 'cards from D1');

        // Load translations for preferred language from D1
        const transMap: Record<string, TranslationData> = {};
        if (preferredLanguage && preferredLanguage !== 'en') {
          const langTranslations = await fetchAllTranslationsForLanguage(preferredLanguage);
          // langTranslations has 'first' and 'all' properties
          Object.entries(langTranslations.first).forEach(([cardId, translation]) => {
            if (!transMap[cardId]) transMap[cardId] = {};
            transMap[cardId][preferredLanguage] = translation;
          });
        }
        setTranslations(transMap);

        // Load images from Supabase (still needed - D1 doesn't have images table)
        const { data: imgData } = await supabase
          .from("vocab_images")
          .select("card_id, url");

        const imgMap: ImageData = {};
        imgData?.forEach(img => {
          imgMap[img.card_id] = img.url;
        });
        setImages(imgMap);

        // Improved robust deterministic hash for shuffling (must match VocabTest.tsx)
        const getDeterministicHash = (id: string) => {
          let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
          for (let i = 0, ch; i < id.length; i++) {
            ch = id.charCodeAt(i);
            h1 = Math.imul(h1 ^ ch, 2654435761);
            h2 = Math.imul(h2 ^ ch, 1597334677);
          }
          h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
          h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
          return 4294967296 * (2097151 & h2) + (h1 >>> 0);
        };

        // Shuffle all cards from D1 using the stable hash
        const shuffledCards = [...d1Cards].sort((a, b) => {
          return getDeterministicHash(a.id) - getDeterministicHash(b.id) || a.id.localeCompare(b.id);
        });

        const WORDS_PER_LEVEL = Math.ceil(shuffledCards.length / MAX_LEVEL);

        const rows: CardRow[] = shuffledCards.map((card: D1VocabCard, index: number) => {
          let level = card.level || 1;
          // If level is null, undefined, or > MAX_LEVEL, assign based on position
          if (level > MAX_LEVEL || level < 1) {
            level = Math.floor(index / WORDS_PER_LEVEL) + 1;
            if (level > MAX_LEVEL) level = MAX_LEVEL;
          }
          return {
            id: card.id,
            term: card.term,
            translation: card.term, // Will be overwritten by preferred language translation
            pos: card.pos,
            ipa: card.ipa,
            context_sentence: card.context_sentence,
            level
          };
        });

        // Filter by selected level if specified
        const filteredRows = selectedLevel !== null
          ? rows.filter(card => card.level === selectedLevel)
          : rows;

        setCards(filteredRows);
      } catch (error) {
        console.error('VocabularyBook: Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, selectedLevel, preferredLanguage]);

  const handleLanguageChange = async (newLanguage: string) => {
    setPreferredLanguage(newLanguage);
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

  // Filter and group cards into decks of 20
  const groupedDecks = useMemo(() => {
    const q = filter.toLowerCase();
    let filtered = !q ? cards : cards.filter((c) =>
      c.term.toLowerCase().includes(q) ||
      (c.translation || '').toLowerCase().includes(q) ||
      (translations[c.id]?.[preferredLanguage] || '').toLowerCase().includes(q)
    );

    // Group by level first
    const levelGroups: Record<number, CardRow[]> = {};
    filtered.forEach(card => {
      const level = card.level || 1;
      if (!levelGroups[level]) levelGroups[level] = [];
      levelGroups[level].push(card);
    });

    // Create decks of 20 words each within each level
    const decks: DeckInfo[] = [];
    Object.entries(levelGroups)
      .sort(([a], [b]) => Number(a) - Number(b))
      .forEach(([level, levelCards]) => {
        const levelNum = Number(level);
        const levelName = levelNames[levelNum - 1] || `Level ${level}`;

        for (let i = 0; i < levelCards.length; i += WORDS_PER_DECK) {
          const chunk = levelCards.slice(i, i + WORDS_PER_DECK);
          const deckIndex = Math.floor(i / WORDS_PER_DECK) + 1;
          const totalDecksInLevel = Math.ceil(levelCards.length / WORDS_PER_DECK);

          decks.push({
            id: `${level}-${deckIndex}`,
            name: totalDecksInLevel === 1
              ? `${levelName} Vocabulary`
              : `${levelName} - Set ${deckIndex}`,
            cards: chunk,
          });
        }
      });

    return decks;
  }, [cards, filter, translations, preferredLanguage]);

  const selectedLang = languageOptions.find(l => l.code === preferredLanguage);

  // Wait for auth to finish loading
  if (authLoading) {
    return <PageLoadingScreen />;
  }

  // Redirect if not logged in
  if (!authLoading && !user) {
    return <Navigate to="/auth" replace />;
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
      <div className="relative z-10">
        <StudentLayout title="Vocabulary Book" showBackButton backPath="/dashboard">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

            {/* Search and Filters */}
            <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 mb-8 border border-white/20 shadow-lg">
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    placeholder="Search words or translations..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="pl-10 h-11 bg-white/50 border-gray-200 focus:ring-primary/20 rounded-xl"
                  />
                </div>

                {/* Level Filter */}
                <Select
                  value={selectedLevel?.toString() || 'all'}
                  onValueChange={(v) => setSelectedLevel(v === 'all' ? null : Number(v))}
                >
                  <SelectTrigger className="w-[180px] h-11 bg-white/50 border-gray-200 focus:ring-primary/20 rounded-xl">
                    <GraduationCap className="w-4 h-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="All Levels" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    {levelNames.map((name, i) => (
                      <SelectItem key={i + 1} value={(i + 1).toString()}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Language Selector */}
                <Select value={preferredLanguage} onValueChange={handleLanguageChange}>
                  <SelectTrigger className="w-[180px] h-11 bg-white/50 border-gray-200 focus:ring-primary/20 rounded-xl">
                    <Globe className="w-4 h-4 mr-2 text-muted-foreground" />
                    <SelectValue>
                      {selectedLang && `${getFlagEmoji(selectedLang.flag)} ${selectedLang.name}`}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {languageOptions.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {getFlagEmoji(lang.flag)} {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {/* Aggressive CSS injection to prevent black background flashing during loading */}
            {themeStyles.theme.name === 'note' && (
              <style>{`
                body, html, #root { background-color: #FEF9E7 !important; }
              `}</style>
            )}

            {/* Vocabulary Decks Grid */}
            {loading ? (
              <div className="flex flex-col justify-center items-center py-20 space-y-4" style={themeStyles.theme.name === 'note' ? { backgroundColor: '#FEF9E7' } : {}}>
                <DotLottieLoadingAnimation />
              </div>
            ) : groupedDecks.length === 0 ? (
              <div className="text-center py-12 bg-white/50 rounded-2xl border border-white/20">
                <Book className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-xl font-semibold mb-2">No words found</h3>
                <p className="text-muted-foreground">
                  {filter ? 'Try a different search term' : 'Start learning to build your vocabulary!'}
                </p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {groupedDecks.map((deck) => {
                  const levelNum = parseInt(deck.id.split('-')[0]) || 1;
                  const levelColorClass = levelColors[levelNum - 1] || levelColors[0];

                  return (
                    <SpotlightCard
                      key={deck.id}
                      className="cursor-pointer h-[140px] hover:scale-105 transition-all duration-300 hover:shadow-lg flex items-center justify-center"
                      onClick={() => setViewDeck(deck)}
                      style={{
                        backgroundColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.8)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.1)' : themeStyles.theme.name === 'minimalist' ? '#ffffff' : themeStyles.theme.colors.cardBackground,
                        borderColor: themeStyles.border,
                        ...themeStyles.cardStyle
                      }}
                    >
                      <CardContent className="p-3 md:p-4 text-center flex items-center justify-center h-full">
                        <div className="flex flex-col items-center">
                          <h3 className="font-semibold text-sm" style={{ color: themeStyles.textPrimary }}>
                            {deck.name}
                          </h3>

                          <p className="text-muted-foreground text-xs mt-1">
                            {deck.cards.length} words to master
                          </p>
                        </div>
                      </CardContent>
                    </SpotlightCard>
                  );
                })}
              </div>
            )}
          </div>
        </StudentLayout>
      </div>

      {/* View Deck Dialog */}
      <Dialog open={!!viewDeck} onOpenChange={(open) => !open && setViewDeck(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-3">
              <Book className="w-6 h-6 text-primary" />
              {viewDeck?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="mt-6 space-y-4">
            {viewDeck?.cards.map((card) => {
              const preferredTranslation = translations[card.id]?.[preferredLanguage] || card.translation || '';
              const cardImage = images[card.id];
              return (
                <div key={card.id} className="p-4 rounded-xl bg-gray-50 border border-gray-100 flex items-start gap-4 hover:bg-gray-100 transition-colors">
                  {/* Image thumbnail */}
                  {cardImage ? (
                    <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-white border border-gray-200 shadow-sm">
                      <img
                        src={cardImage}
                        alt={card.term}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <div className="w-16 h-16 flex-shrink-0 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center border border-gray-200">
                      <span className="text-2xl">{card.term.charAt(0).toUpperCase()}</span>
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-bold text-lg">{card.term}</span>
                      {card.pos && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-700 font-medium">
                          {card.pos}
                        </span>
                      )}
                      {card.ipa && (
                        <span className="text-sm text-muted-foreground font-mono">
                          /{card.ipa}/
                        </span>
                      )}
                    </div>
                    <div className="text-primary font-medium mb-1">
                      {preferredTranslation}
                    </div>
                    {card.context_sentence && (
                      <p className="text-sm text-muted-foreground italic truncate">
                        "{card.context_sentence}"
                      </p>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-primary flex-shrink-0"
                    onClick={() => {
                      const utterance = new SpeechSynthesisUtterance(card.term);
                      utterance.lang = 'en-US';
                      speechSynthesis.speak(utterance);
                    }}
                  >
                    <Volume2 className="w-5 h-5" />
                  </Button>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <Button variant="outline" onClick={() => setViewDeck(null)}>
              Close
            </Button>
            <Button
              onClick={() => {
                if (viewDeck) navigate(`/vocabulary/test/${viewDeck.id}`);
              }}
            >
              <Play className="w-4 h-4 mr-2" />
              Start Practice
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
