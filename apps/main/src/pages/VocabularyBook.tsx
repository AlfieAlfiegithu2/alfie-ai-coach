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

interface DeckInfo {
  id: string;
  name: string;
  cards: CardRow[];
}

// Language options with native names
const languageOptions = [
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'zh-TW', name: '繁體中文', flag: '🇹🇼' },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'th', name: 'ไทย', flag: '🇹🇭' },
  { code: 'id', name: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'ms', name: 'Bahasa Melayu', flag: '🇲🇾' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
  { code: 'bn', name: 'বাংলা', flag: '🇧🇩' },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
  { code: 'fa', name: 'فارسی', flag: '🇮🇷' },
  { code: 'ur', name: 'اردو', flag: '🇵🇰' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
];

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
          .single();
        if (profile?.native_language) {
          setPreferredLanguage(profile.native_language);
        }
      } catch (error) {
        console.error('Error loading user preferences:', error);
      }
    };
    loadUserPreferences();
  }, [user]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      // Fetch ALL cards with pagination (Supabase default limit is 1000)
      const allCards: any[] = [];
      const PAGE_SIZE = 1000;
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        const from = page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        let query = supabase
          .from("vocab_cards")
          .select("id, term, translation, pos, ipa, context_sentence, user_id, level, deck_id")
          .order("term", { ascending: true })
          .range(from, to);

        if (user) {
          query = query.or(`is_public.eq.true,user_id.eq.${user.id}`);
        } else {
          query = query.eq("is_public", true);
        }

        const { data, error } = await query;

        if (error) {
          console.error('VocabularyBook: Error loading cards page', page, ':', error);
          break;
        }

        if (data && data.length > 0) {
          allCards.push(...data);
          page++;
          hasMore = data.length === PAGE_SIZE;
        } else {
          hasMore = false;
        }
      }

      console.log('VocabularyBook: Total cards loaded:', allCards.length);

      // Load translations for all cards
      const { data: transData } = await supabase
        .from("vocab_translations")
        .select("card_id, lang, translations");

      const transMap: Record<string, TranslationData> = {};
      transData?.forEach(t => {
        if (!transMap[t.card_id]) transMap[t.card_id] = {};
        transMap[t.card_id][t.lang] = t.translations?.[0] || '';
      });
      setTranslations(transMap);

      // Distribute cards across 4 levels
      const WORDS_PER_LEVEL = Math.ceil(allCards.length / MAX_LEVEL);
      
      const rows: CardRow[] = allCards.map((card: any, index: number) => {
        let level = card.level;
        // If level is null, undefined, or > MAX_LEVEL, assign based on position
        if (level === null || level === undefined || level > MAX_LEVEL || level < 1) {
          level = Math.floor(index / WORDS_PER_LEVEL) + 1;
          if (level > MAX_LEVEL) level = MAX_LEVEL;
        }
        return { ...card, level };
      });
      
      // Filter by selected level if specified
      const filteredRows = selectedLevel !== null 
        ? rows.filter(card => card.level === selectedLevel)
        : rows;
      
      setCards(filteredRows);
      setLoading(false);
    };
    load();
  }, [user, selectedLevel]);

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
    return (
      <StudentLayout title="Loading...">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading vocabulary...</p>
          </div>
        </div>
      </StudentLayout>
    );
  }

  // Redirect if not logged in
  if (!authLoading && !user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen relative">
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
                      {selectedLang && `${selectedLang.flag} ${selectedLang.name}`}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {languageOptions.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.flag} {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Vocabulary Decks Grid */}
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading vocabulary...</p>
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
                      className="cursor-pointer group h-full bg-white/80 hover:bg-white/90 border-white/20"
                      onClick={() => setViewDeck(deck)}
                    >
                      <CardContent className="p-6 flex flex-col h-full">
                        <div className="flex items-start justify-between mb-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${levelColorClass.replace('text-', 'bg-').split(' ')[0]} bg-opacity-20`}>
                            <Book className={`w-6 h-6 ${levelColorClass.split(' ')[1]}`} />
                          </div>
                          <Badge variant="outline" className={`${levelColorClass}`}>
                            Level {levelNum}
                          </Badge>
                        </div>
                        
                        <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                          {deck.name}
                        </h3>
                        
                        <p className="text-muted-foreground text-sm mb-6 flex-1">
                          {deck.cards.length} words to master
                        </p>
                        
                        <div className="flex items-center gap-2 mt-auto pt-4 border-t border-gray-100">
                          <Button 
                            className="flex-1 bg-primary hover:bg-primary/90 text-white rounded-xl"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/vocabulary/test/${deck.id}`);
                            }}
                          >
                            <Play className="w-4 h-4 mr-2" />
                            Practice
                          </Button>
                          <Button
                            variant="outline"
                            className="flex-1 rounded-xl hover:bg-gray-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewDeck(deck);
                            }}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View
                          </Button>
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
              return (
                <div key={card.id} className="p-4 rounded-xl bg-gray-50 border border-gray-100 flex items-start justify-between hover:bg-gray-100 transition-colors">
                  <div className="flex-1">
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
                      <p className="text-sm text-muted-foreground italic">
                        "{card.context_sentence}"
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-primary"
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
