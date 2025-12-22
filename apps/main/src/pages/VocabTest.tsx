import { useEffect, useMemo, useState, useRef } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Volume2, VolumeX, Loader2 } from "lucide-react";
import StudentLayout from "@/components/StudentLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/contexts/ThemeContext";
import LottieLoadingAnimation from "@/components/animations/LottieLoadingAnimation";
import { fetchVocabCards, fetchTranslationsForCards, type D1VocabCard } from '@/lib/d1Client';
import "./VocabTest.css";

type Row = {
  id: string;
  term: string;
  translation: string | null;
  translations: string[]; // All translations for this word
  pos: string | null;
  ipa: string | null;
  context_sentence: string | null;
  examples_json: string[] | null;
  audio_url?: string | null;
};

export default function VocabTest() {
  const { deckId } = useParams();
  const [searchParams] = useSearchParams();
  const lang = searchParams.get('lang'); // Get language from URL
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [name, setName] = useState<string>("Deck Test");
  const [rows, setRows] = useState<Row[]>([]);
  const [index, setIndex] = useState(0);
  const [translations, setTranslations] = useState<Record<string, string>>({}); // Store fetched translations
  const [isSyntheticDeck, setIsSyntheticDeck] = useState(false); // Track if using D1 cards

  // Audio playback state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingCardId, setPlayingCardId] = useState<string | null>(null);

  // ... (rest of state)

  // Fetch translations when rows change if lang is set (using D1)
  useEffect(() => {
    if (!lang || rows.length === 0) return;

    const fetchTranslationsFromD1 = async () => {
      console.log(`VocabTest: Fetching translations for ${lang} from D1`);
      const cardIds = rows.map(r => r.id);

      try {
        const d1Translations = await fetchTranslationsForCards(cardIds, lang);

        const newTranslations: Record<string, string> = {};
        const allTranslationsMap: Record<string, string[]> = {};
        d1Translations.forEach((item) => {
          if (item.translations && item.translations.length > 0) {
            newTranslations[item.card_id] = item.translations[0];
            allTranslationsMap[item.card_id] = item.translations;
          }
        });
        setTranslations(newTranslations);

        // Update rows with new translations (both first and all)
        setRows(prevRows => prevRows.map(row => ({
          ...row,
          translation: newTranslations[row.id] || row.translation,
          translations: allTranslationsMap[row.id] || []
        })));
      } catch (error) {
        console.error('VocabTest: Error fetching translations from D1:', error);
      }
    };

    fetchTranslationsFromD1();
  }, [lang, rows.length === 0 ? 0 : rows[0].id]); // Dependency on first row ID to trigger when rows are loaded

  // ... (rest of load useEffect)
  const [notes, setNotes] = useState<{ [key: string]: string }>({});
  const [saveStatus, setSaveStatus] = useState<string>("");
  const [isFlipped, setIsFlipped] = useState(false);
  const [quizOptions, setQuizOptions] = useState<string[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [quizResult, setQuizResult] = useState<'correct' | 'incorrect' | null>(null);
  const [pageTurnDirection, setPageTurnDirection] = useState<'next' | 'prev' | null>(null);
  const [showFinalTest, setShowFinalTest] = useState(false);
  const [showTestIntro, setShowTestIntro] = useState(false);
  const [showSecondTestIntro, setShowSecondTestIntro] = useState(false);
  const [testStage, setTestStage] = useState<0 | 1 | 2>(0); // 0=learning, 1=test with image, 2=test word-only
  const [finalTestResults, setFinalTestResults] = useState<{ [key: string]: boolean }>({});
  const [finalTestIndex, setFinalTestIndex] = useState(0);
  const [finalTestFlipped, setFinalTestFlipped] = useState(false);
  const [finalTestQuizOptions, setFinalTestQuizOptions] = useState<string[]>([]);
  const [finalTestSelectedAnswer, setFinalTestSelectedAnswer] = useState<string | null>(null);
  const [finalTestQuizResult, setFinalTestQuizResult] = useState<'correct' | 'incorrect' | null>(null);
  // Second test (word-only)
  const [secondTestIndex, setSecondTestIndex] = useState(0);
  const [secondTestSelectedAnswer, setSecondTestSelectedAnswer] = useState<string | null>(null);
  const [secondTestQuizOptions, setSecondTestQuizOptions] = useState<string[]>([]);
  const [secondTestResults, setSecondTestResults] = useState<{ [key: string]: boolean }>({});
  const [secondTestPool, setSecondTestPool] = useState<Row[]>([]);
  const [showSecondResults, setShowSecondResults] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [shuffleEnabled, setShuffleEnabled] = useState(() => {
    const saved = localStorage.getItem('vocab-shuffle-enabled');
    return saved ? JSON.parse(saved) : true;
  });
  const total = rows.length;
  const current = rows[index] || null;
  const finalTestCurrent = showFinalTest ? rows[finalTestIndex] : null;
  const secondTestCurrent = testStage === 2 ? rows[secondTestIndex] : null;
  const secondPoolCurrent = testStage === 2 ? (secondTestPool[secondTestIndex] || null) : null;

  const isNoteTheme = theme.name === 'note';

  const cardGradientStyles = useMemo(() => {
    if (isNoteTheme) {
      return {
        '--behind-gradient': 'linear-gradient(to bottom, #E6D29D 0%, #D4C08B 100%)',
        '--inner-gradient': 'linear-gradient(145deg, #FEF9E7 0%, #FFFDF5 100%)',
      } as React.CSSProperties;
    }
    return {
      '--behind-gradient': 'radial-gradient(farthest-side circle at 50% 50%, hsla(220,15%,70%,0.1) 4%, hsla(220,10%,60%,0.05) 10%, hsla(220,5%,50%,0.02) 50%, hsla(220,0%,40%,0) 100%), radial-gradient(35% 52% at 55% 20%, hsla(210,20%,60%,0.1) 0%, hsla(210,15%,50%,0) 100%), radial-gradient(100% 100% at 50% 50%, hsla(200,25%,55%,0.05) 1%, hsla(200,20%,45%,0) 76%), conic-gradient(from 124deg at 50% 50%, hsla(215,20%,65%,0.1) 0%, hsla(215,15%,55%,0.08) 40%, hsla(215,15%,55%,0.08) 60%, hsla(215,20%,65%,0.1) 100%)',
      '--inner-gradient': 'linear-gradient(145deg, hsla(220,10%,15%,0.6) 0%, hsla(210,15%,20%,0.4) 100%)'
    } as React.CSSProperties;
  }, [isNoteTheme]);

  // Ensure background covers whole body for note theme
  useEffect(() => {
    if (isNoteTheme) {
      document.body.style.backgroundColor = '#FEF9E7';
      return () => {
        document.body.style.backgroundColor = '';
      };
    }
  }, [isNoteTheme]);

  const test2GradientStyles = useMemo(() => {
    if (isNoteTheme) {
      return cardGradientStyles;
    }
    return {
      '--behind-gradient': 'radial-gradient(farthest-side circle at 50% 50%, hsla(220,15%,70%,0.1) 4%, hsla(220,10%,60%,0.05) 10%, hsla(220,5%,50%,0.02) 50%, hsla(220,0%,40%,0) 100%), radial-gradient(35% 52% at 55% 20%, hsla(210,20%,60%,0.1) 0%, hsla(210,15%,50%,0) 100%), radial-gradient(100% 100% at 50% 50%, hsla(200,25%,55%,0.05) 1%, hsla(200,20%,45%,0) 76%), conic-gradient(from 124deg at 50% 50%, hsla(215,20%,65%,0.1) 0%, hsla(215,15%,55%,0.08) 40%, hsla(215,15%,55%,0.08) 60%, hsla(215,20%,65%,0.1) 100%)',
      '--inner-gradient': 'linear-gradient(145deg, hsla(220,10%,15%,0.6) 0%, hsla(210,15%,20%,0.4) 100%)'
    } as React.CSSProperties;
  }, [isNoteTheme, cardGradientStyles]);

  useEffect(() => {
    const load = async () => {
      if (!deckId) {
        console.log('VocabTest: No deckId provided');
        return;
      }
      console.log('VocabTest: Loading deckId:', deckId);
      // Ensure auth is resolved before RLS-sensitive queries
      await (supabase as any).auth.getSession();
      const safeDeckId = decodeURIComponent(String(deckId)).trim();
      console.log('VocabTest: Safe deckId:', safeDeckId);

      // Check if this is a synthetic deck ID (format: "level-setNumber", e.g., "1-1", "2-3")
      // These are created by VocabLevels.tsx to group cards by level
      const syntheticMatch = safeDeckId.match(/^(\d+)-(\d+)$/);

      if (syntheticMatch) {
        // This is a synthetic deck ID - fetch from D1 (Cloudflare edge)
        const targetLevel = parseInt(syntheticMatch[1]);
        const setNumber = parseInt(syntheticMatch[2]);
        const WORDS_PER_DECK = 20;
        const MAX_LEVEL = 4;

        const levelNames = ['Level 1', 'Level 2', 'Level 3', 'Level 4'];
        const levelName = levelNames[targetLevel - 1] || `Level ${targetLevel}`;

        console.log(`VocabTest: Synthetic deck detected - Level ${targetLevel}, Set ${setNumber}`);

        // OPTIMIZED: Calculate offset and fetch only what we need
        // Each level has ~500-600 words, we only need 20 words for this set
        // Calculate the approximate offset based on level and set
        console.log(`VocabTest: Fetching all cards to generate consistent sets for Level ${targetLevel}`);
        const d1Cards = await fetchVocabCards({
          limit: 10000
        });

        // Helper to generate a stable pseudo-random value [0, 1) from a string ID (must match VocabLevels.tsx)
        const getDeterministicRandom = (id: string) => {
          let hash = 0;
          for (let i = 0; i < id.length; i++) {
            hash = ((hash << 5) - hash) + id.charCodeAt(i);
            hash |= 0;
          }
          // Mulberry32-like seeded generator
          let t = hash + 0x6D2B79F5;
          t = Math.imul(t ^ (t >>> 15), t | 1);
          t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
          return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };

        // Filter for this level and sort deterministically but non-alphabetically
        const levelCards = d1Cards
          .filter(c => c.level === targetLevel)
          .sort((a, b) => {
            // Stable non-alphabetical sort using ID hash
            return getDeterministicRandom(a.id) - getDeterministicRandom(b.id) || a.id.localeCompare(b.id);
          });

        // Convert to Row format
        const formattedCards = levelCards.map((card: D1VocabCard) => ({
          id: card.id,
          term: card.term,
          translation: card.term,
          translations: [],
          pos: card.pos,
          ipa: card.ipa,
          context_sentence: card.context_sentence,
          examples_json: card.examples_json || [],
          audio_url: card.audio_url,
          level: targetLevel
        }));

        // Take the 20 cards for this specific set
        let rows = formattedCards.slice((setNumber - 1) * WORDS_PER_DECK, setNumber * WORDS_PER_DECK);

        // If we didn't get enough (maybe edge case), just take what we have
        if (rows.length === 0 && formattedCards.length > 0) {
          rows = formattedCards.slice(0, WORDS_PER_DECK);
        }

        console.log(`VocabTest: Set ${setNumber} loaded with ${rows.length} mixed words`);

        // Set the deck name
        setName(`${levelName} - Test ${setNumber}`);

        // Apply additional shuffle if enabled (true by default now)
        if (shuffleEnabled) {
          rows = [...rows].sort(() => Math.random() - 0.5);
        }

        setRows(rows);
        setIndex(0);
        setIsSyntheticDeck(true);
        return;
      }

      // Original logic for real deck IDs (UUIDs)
      // Get user ID first
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes?.user?.id;

      // First try to get cards with explicit OR condition for user-owned OR public cards
      const [cardsRes, deckNameViaJoin] = await Promise.all([
        (supabase as any)
          .from('vocab_cards')
          .select('id, term, translation, pos, ipa, context_sentence, examples_json')
          .eq('deck_id', safeDeckId)
          .or(`user_id.eq.${userId || 'null'},is_public.eq.true`)
          .order('created_at', { ascending: true })
          .limit(1000),
        (supabase as any)
          .from('vocab_cards')
          .select('vocab_decks!inner(name)')
          .eq('deck_id', safeDeckId)
          .limit(1)
      ]);
      console.log('VocabTest: Cards query result:', cardsRes);
      console.log('VocabTest: Deck name query result:', deckNameViaJoin);
      const deckJoinRows = ((deckNameViaJoin as any)?.data as any[]) || [];
      const joinedName = deckJoinRows[0]?.vocab_decks?.name;
      setName(joinedName || 'Deck Test');
      let rows: any[] = ((cardsRes as any)?.data as any[]) || [];
      console.log('VocabTest: Initial rows count:', rows.length);
      // Fallback 1: explicitly restrict to public if first query returned none
      if (rows.length === 0) {
        const { data: pubRows } = await (supabase as any)
          .from('vocab_cards')
          .select('id, term, translation, pos, ipa, context_sentence, examples_json')
          .eq('deck_id', safeDeckId)
          .eq('is_public', true)
          .order('created_at', { ascending: true })
          .limit(1000);
        rows = (pubRows as any) || [];
        console.log('VocabTest: Public fallback rows count:', rows.length);
      }
      // Fallback 2: inner join decks and filter by deck id via join
      if (rows.length === 0) {
        const { data: viaJoin } = await (supabase as any)
          .from('vocab_cards')
          .select('id, term, translation, pos, ipa, context_sentence, examples_json, vocab_decks!inner(id)')
          .eq('vocab_decks.id', safeDeckId)
          .order('created_at', { ascending: true })
          .limit(1000);
        rows = ((viaJoin as any) || []).map((r: any) => ({
          id: r.id,
          term: r.term,
          translation: r.translation,
          translations: [],
          pos: r.pos,
          ipa: r.ipa,
          context_sentence: r.context_sentence,
          examples_json: r.examples_json
        }));
        console.log('VocabTest: Join fallback rows count:', rows.length);
      }
      console.log('VocabTest: Final rows count:', rows.length);

      // Apply shuffle if enabled
      const shouldShuffle = localStorage.getItem('vocab-shuffle-enabled');
      if (shouldShuffle && JSON.parse(shouldShuffle)) {
        rows = rows.sort(() => Math.random() - 0.5);
      }

      setRows(rows);
      setIndex(0);
    };
    load();
  }, [deckId]);

  const sentence = useMemo(() => {
    if (!current) return '';
    if (Array.isArray(current.examples_json) && current.examples_json[0]) return current.examples_json[0];
    return current.context_sentence || '';
  }, [current]);

  const finalTestSentence = useMemo(() => {
    if (!finalTestCurrent) return '';
    if (Array.isArray(finalTestCurrent.examples_json) && finalTestCurrent.examples_json[0]) return finalTestCurrent.examples_json[0];
    return finalTestCurrent.context_sentence || '';
  }, [finalTestCurrent]);

  // Function to highlight the vocabulary word in the example sentence
  const highlightWordInSentence = (text: string, word: string) => {
    if (!text || !word) return text;

    // Create a regex that matches the word (case-insensitive) but preserves the original case
    const regex = new RegExp(`\\b(${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\b`, 'gi');

    return text.replace(regex, (match) => {
      return `<mark class="highlighted-word">${match}</mark>`;
    });
  };

  const next = () => {
    if (index < total - 1) {
      setPageTurnDirection('next');
      setTimeout(() => setPageTurnDirection(null), 600);
      setIndex((i) => Math.min(i + 1, Math.max(0, total - 1)));
    } else if (index === total - 1) {
      // At the last card, show intro before tests
      setShowTestIntro(true);
    }
  };

  const prev = () => {
    if (index > 0) {
      setPageTurnDirection('prev');
      setTimeout(() => setPageTurnDirection(null), 600);
      setIndex((i) => Math.max(i - 1, 0));
    }
  };

  // Load notes from localStorage on component mount
  useEffect(() => {
    const savedNotes = localStorage.getItem('vocab-notes');
    if (savedNotes) {
      try {
        setNotes(JSON.parse(savedNotes));
      } catch (error) {
        console.error('Error loading notes:', error);
      }
    }
  }, []);

  // Save notes to localStorage whenever notes change
  useEffect(() => {
    if (Object.keys(notes).length > 0) {
      localStorage.setItem('vocab-notes', JSON.stringify(notes));
      setSaveStatus("Saved");
      setTimeout(() => setSaveStatus(""), 2000);
    }
  }, [notes]);

  const handleNotesChange = (cardId: string, value: string) => {
    setNotes(prev => ({
      ...prev,
      [cardId]: value
    }));
  };

  const toggleShuffle = () => {
    const newValue = !shuffleEnabled;
    setShuffleEnabled(newValue);
    localStorage.setItem('vocab-shuffle-enabled', JSON.stringify(newValue));

    // Re-shuffle or restore order
    if (newValue) {
      setRows(prev => [...prev].sort(() => Math.random() - 0.5));
    } else {
      // Reload to restore original order
      window.location.reload();
    }
  };

  const currentNotes = current ? notes[current.id] || "" : "";

  // Generate quiz options when card flips
  useEffect(() => {
    if (isFlipped && current) {
      generateQuizOptions();
    }
  }, [isFlipped, current]);

  // Generate quiz options for final test when card flips
  useEffect(() => {
    if (finalTestFlipped && finalTestCurrent) {
      generateFinalTestQuizOptions();
    }
  }, [finalTestFlipped, finalTestCurrent]);

  // Generate quiz options for second test when current changes
  useEffect(() => {
    if (testStage === 2 && (secondPoolCurrent || secondTestCurrent)) {
      generateSecondTestQuizOptions();
    }
  }, [testStage, secondPoolCurrent, secondTestCurrent]);

  // Ensure Test 1 options are generated when entering Test 1 or card changes
  useEffect(() => {
    if (testStage === 1 && finalTestCurrent) {
      generateFinalTestQuizOptions();
    }
  }, [testStage, finalTestCurrent, finalTestIndex]);

  const generateQuizOptions = () => {
    if (!current) return;

    // Get random translations from other cards
    const otherTranslations = rows
      .filter(card => card.id !== current.id && card.translation)
      .map(card => card.translation)
      .filter(translation => translation !== current.translation)
      .slice(0, 3);

    // Add the correct translation
    const options = [current.translation, ...otherTranslations];

    // Shuffle the options
    const shuffled = options.sort(() => Math.random() - 0.5);
    setQuizOptions(shuffled);
    setSelectedAnswer(null);
    setQuizResult(null);
  };

  const generateFinalTestQuizOptions = () => {
    if (!finalTestCurrent) return;

    // Collect candidate translations from other cards (truthy, trimmed, unique)
    const correct = (finalTestCurrent.translation || '').toString();
    const candidateSet = new Set<string>();
    rows.forEach((card) => {
      if (!card || card.id === finalTestCurrent.id) return;
      const t = (card.translation || '').toString().trim();
      if (!t) return;
      if (t.toLowerCase() === correct.toLowerCase()) return;
      if (!candidateSet.has(t.toLowerCase())) candidateSet.add(t.toLowerCase());
    });
    let candidates = Array.from(candidateSet).map((t) => {
      // Recover original casing by finding first match in rows
      const found = rows.find(r => (r.translation || '').toString().trim().toLowerCase() === t);
      return (found?.translation || '').toString();
    });
    // Shuffle candidates and pick up to 3
    candidates = candidates.sort(() => Math.random() - 0.5).slice(0, 3);

    // Fallback distractors to ensure 4 options total
    const FALLBACKS = [
      'A temporary or short-lived occurrence',
      'An idea that lacks practical application',
      'Something rare or infrequently encountered',
      'A minor detail with little significance',
      'A device used to measure performance',
    ];
    const lowerSeen = new Set<string>([correct.toLowerCase(), ...candidates.map(c => c.toLowerCase())]);
    for (const f of FALLBACKS) {
      if (candidates.length >= 3) break;
      if (!lowerSeen.has(f.toLowerCase())) {
        candidates.push(f);
        lowerSeen.add(f.toLowerCase());
      }
    }
    while (candidates.length < 3) {
      const filler = `Option ${candidates.length + 1}`;
      if (!lowerSeen.has(filler.toLowerCase())) {
        candidates.push(filler);
        lowerSeen.add(filler.toLowerCase());
      } else {
        break;
      }
    }
    const options = [correct, ...candidates].filter((x) => typeof x === 'string' && x.trim().length > 0);
    const shuffled = options.sort(() => Math.random() - 0.5);
    setFinalTestQuizOptions(shuffled);
    setFinalTestSelectedAnswer(null);
    setFinalTestQuizResult(null);
  };

  const generateSecondTestQuizOptions = () => {
    const target = secondPoolCurrent || secondTestCurrent;
    if (!target) return;
    const otherTranslations = rows
      .filter(card => card.id !== target.id && card.translation)
      .map(card => card.translation)
      .filter(translation => translation !== target.translation)
      .slice(0, 3);
    const options = [target.translation, ...otherTranslations];
    const shuffled = options.sort(() => Math.random() - 0.5);
    setSecondTestQuizOptions(shuffled);
    setSecondTestSelectedAnswer(null);
  };

  const finalTestNext = () => {
    if (finalTestIndex < total - 1) {
      setPageTurnDirection('next');
      setTimeout(() => setPageTurnDirection(null), 600);
      setFinalTestIndex(finalTestIndex + 1);
      setFinalTestFlipped(false);
    }
  };

  const finalTestPrev = () => {
    if (finalTestIndex > 0) {
      setPageTurnDirection('prev');
      setTimeout(() => setPageTurnDirection(null), 600);
      setFinalTestIndex(finalTestIndex - 1);
      setFinalTestFlipped(false);
    }
  };

  const handleFinalTestCardClick = (e: React.MouseEvent) => {
    // Don't flip if clicking on quiz buttons
    if ((e.target as HTMLElement).closest('.quiz-option')) {
      return;
    }

    e.stopPropagation();
    setFinalTestFlipped(!finalTestFlipped);
  };

  const handleFinalTestScreenClick = (e: React.MouseEvent) => {
    // Don't handle clicks on progress indicator
    if ((e.target as HTMLElement).closest('.vocab-progress, .vocab-back-button')) {
      return;
    }

    // Check if we're in a click navigation zone
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const screenWidth = rect.width;
    const leftZone = screenWidth * 0.4;
    const rightZone = screenWidth * 0.6;

    if (clickX < leftZone) {
      finalTestPrev();
      return;
    } else if (clickX > rightZone) {
      finalTestNext();
      return;
    }
  };

  const handleFinalTestAnswerSelect = (answer: string) => {
    setFinalTestSelectedAnswer(answer);
    const isCorrect = answer === finalTestCurrent?.translation;
    setFinalTestQuizResult(isCorrect ? 'correct' : 'incorrect');

    // Save result
    if (finalTestCurrent) {
      setFinalTestResults({ ...finalTestResults, [finalTestCurrent.id]: isCorrect });
      saveSRSData(finalTestCurrent.id, isCorrect);
    }
  };

  const handleSecondTestAnswerSelect = (answer: string) => {
    setSecondTestSelectedAnswer(answer);
    const target = secondPoolCurrent || secondTestCurrent;
    const isCorrect = answer === target?.translation;
    if (target) {
      setSecondTestResults({ ...secondTestResults, [target.id]: !!isCorrect });
      saveSRSData(target.id, !!isCorrect);
    }
  };

  const handleSecondTestScreenClick = (e: React.MouseEvent) => {
    // Don't handle clicks on progress indicator or quiz buttons
    if ((e.target as HTMLElement).closest('.vocab-progress, .vocab-back-button, .vocab-add-button, .quiz-option')) {
      return;
    }

    // Only allow navigation after answering
    if (!secondTestSelectedAnswer) return;

    // Check if we're in a click navigation zone
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const screenWidth = rect.width;
    const rightZone = screenWidth * 0.6;

    if (clickX > rightZone) {
      const poolLen = (secondTestPool.length || total);
      if (secondTestIndex < poolLen - 1) {
        setPageTurnDirection('next');
        setTimeout(() => setPageTurnDirection(null), 600);
        setSecondTestIndex(secondTestIndex + 1);
        setSecondTestSelectedAnswer(null);
      } else {
        setShowSecondResults(true);
      }
    }
  };

  const handleScreenClick = (e: React.MouseEvent) => {
    // Don't handle clicks on navigation, notes, or progress indicator
    if ((e.target as HTMLElement).closest('.vocab-navigation, .vocab-notes-section, .vocab-progress, .vocab-back-button')) {
      return;
    }

    // Check if we're in a click navigation zone
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const screenWidth = rect.width;
    const leftZone = screenWidth * 0.4;
    const rightZone = screenWidth * 0.6;

    if (clickX < leftZone) {
      prev();
      return;
    } else if (clickX > rightZone) {
      next();
      return;
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't flip if clicking on quiz buttons
    if ((e.target as HTMLElement).closest('.quiz-option')) {
      return;
    }

    e.stopPropagation(); // Prevent screen click handler from firing
    setIsFlipped(!isFlipped);
  };

  const handleAnswerSelect = (answer: string) => {
    setSelectedAnswer(answer);
    const isCorrect = answer === current?.translation;
    setQuizResult(isCorrect ? 'correct' : 'incorrect');

    // Save SRS data
    if (current) {
      saveSRSData(current.id, isCorrect);
    }
  };

  const showToastNotification = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const saveSRSData = async (cardId: string, isCorrect: boolean) => {
    // Skip saving SRS data for synthetic decks (D1 cards don't exist in Supabase vocab_cards)
    if (isSyntheticDeck) {
      console.log('VocabTest: Skipping SRS save for D1 card (not in Supabase)');
      return;
    }

    try {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes?.user) return;

      const { error } = await supabase
        .from('vocab_reviews')
        .insert({
          user_id: userRes.user.id,
          card_id: cardId,
          rating: isCorrect ? 3 : 1, // 3 = correct, 1 = incorrect
          // created_at will be set by default or we can send it
        });

      if (error) {
        console.error('Error saving SRS data:', error);
      }
    } catch (error) {
      console.error('Error saving SRS data:', error);
    }
  };

  // Audio playback toggle function
  const [isAudioLoading, setIsAudioLoading] = useState(false);

  const toggleAudio = (audioUrl: string, cardId: string) => {
    // If clicking on the same card that's playing, stop it
    if (isPlaying && playingCardId === cardId) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setIsPlaying(false);
      setPlayingCardId(null);
      setIsAudioLoading(false);
      return;
    }

    // Prevent rapid double-clicks while loading
    if (isAudioLoading) {
      return;
    }

    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    setIsAudioLoading(true);

    // Create new audio and play
    audioRef.current = new Audio(audioUrl);

    // Handle audio error (e.g., network issues, file not found)
    audioRef.current.onerror = () => {
      console.warn('Audio unavailable:', audioUrl);
      showToastNotification('Audio unavailable');
      setIsPlaying(false);
      setPlayingCardId(null);
      setIsAudioLoading(false);
    };

    audioRef.current.play().then(() => {
      setIsPlaying(true);
      setPlayingCardId(cardId);
      setIsAudioLoading(false);
    }).catch((error) => {
      // AbortError is normal when quickly toggling audio - ignore it silently
      if (error.name === 'AbortError') {
        console.log('Audio play aborted (normal when toggling quickly)');
        setIsAudioLoading(false);
        return;
      }
      // NotSupportedError means the audio file couldn't be loaded (network issue)
      if (error.name === 'NotSupportedError') {
        console.warn('Audio file not available:', audioUrl);
        // Toast already shown by onerror handler
        setIsAudioLoading(false);
        return;
      }
      console.error('Error playing audio:', error);
      showToastNotification('Could not play audio');
      setIsPlaying(false);
      setPlayingCardId(null);
      setIsAudioLoading(false);
    });

    // Handle audio ended
    audioRef.current.onended = () => {
      setIsPlaying(false);
      setPlayingCardId(null);
    };
  };

  // Reset flip state when card changes
  useEffect(() => {
    setIsFlipped(false);
    setQuizResult(null);
    setSelectedAnswer(null);
  }, [index]);


  return (
    <StudentLayout title={name} transparentBackground={isNoteTheme} fullWidth={isNoteTheme} noPadding={isNoteTheme}>
      {/* Fixed background for note theme to cover entire viewport */}
      {isNoteTheme && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: '#FEF9E7',
            zIndex: -1,
          }}
        />
      )}
      <div
        className={`space-y-4 ${isNoteTheme ? 'min-h-screen px-4 py-8' : ''}`}
        style={isNoteTheme ? {
          background: '#FEF9E7',
          minHeight: '100vh',
        } : {}}
      >
        {/* Custom back button in top left */}
        <Button
          asChild
          variant={isNoteTheme ? "ghost" : "secondary"}
          size="sm"
          className={`vocab-back-button mb-4 ${isNoteTheme ? 'hover:bg-[#A68B5B] hover:text-white transition-colors' : ''}`}
          style={isNoteTheme ? { color: '#5D4E37' } : {}}
          onClick={(e) => e.stopPropagation()}
        >
          <Link to={`/vocabulary`} className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
        </Button>

        {/* Intro modal before tests */}
        {showTestIntro && (
          <div className="vocab-screen-container">
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="text-lg font-semibold">Get ready for two quick tests</div>
                <ul className="text-sm text-muted-foreground list-disc pl-6 space-y-1">
                  <li>Test 1: See the English word with the same image from learning, choose the correct meaning.</li>
                  <li>Test 2: See only the English word, choose the correct meaning.</li>
                </ul>
                <div className="flex gap-2 justify-center pt-2">
                  <Button onClick={() => { setShowTestIntro(false); setShowFinalTest(true); setTestStage(1); setFinalTestIndex(0); setFinalTestResults({}); setFinalTestFlipped(false); setSecondTestPool(rows); }}>Start Test 1</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Intro modal between tests */}
        {showSecondTestIntro && (
          <div className="vocab-screen-container">
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="text-lg font-semibold">Next: Word-only test</div>
                <div className="text-sm text-muted-foreground">Now you will only see the English word. Choose the correct meaning.</div>
                <div className="flex gap-2 justify-center pt-2">
                  <Button onClick={() => { setShowSecondTestIntro(false); setTestStage(2); setSecondTestIndex(0); setSecondTestResults({}); }}>Start Test 2</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Test 1: word + image (choices shown under word, no flip) */}
        {showFinalTest && finalTestCurrent && testStage === 1 ? (
          <div className="vocab-screen-container" data-theme={theme.name} onClick={handleFinalTestScreenClick}>
            {/* Progress indicator */}
            <div className="vocab-progress">
              <div className="text-sm text-white/80 font-medium">
                Test 1: {finalTestIndex + 1} / {total}
              </div>
              <div className="text-xs text-white/60 mt-1">
                Score: {Object.values(finalTestResults).filter(r => r === true).length} correct
              </div>
            </div>

            <div className={`vocab-card-container ${pageTurnDirection ? `page-turn-${pageTurnDirection}` : ''}`}>
              <div
                className={`vocab-card-wrapper test1-mode`}
                style={cardGradientStyles}
              >
                <div className="vocab-card-inner">
                  {/* Front face with choices underneath */}
                  <section className="vocab-card front">
                    <div className="vocab-inside">
                      <div className="vocab-shine" />
                      <div className="vocab-glare" />

                      <div className="vocab-image-content">
                        <div className="word-image-placeholder">
                          <div className="text-6xl font-bold text-white/80 select-none">
                            {finalTestCurrent.term?.slice(0, 1)?.toUpperCase() || 'A'}
                          </div>
                        </div>
                      </div>

                      <div className="vocab-content">
                        <div className="vocab-details">
                          <h3 className="vocab-term">{finalTestCurrent.term}</h3>
                          <p className="vocab-pos">{finalTestCurrent.pos || 'word'}</p>
                          {finalTestCurrent.ipa && (
                            <p className="vocab-ipa">/{finalTestCurrent.ipa}/</p>
                          )}
                        </div>
                        {/* Hide translation/example during Test 1 to avoid giving answers */}

                        <div className="vocab-quiz mt-4">
                          {/* Removed header text per request */}
                          <div className="quiz-options">
                            {finalTestQuizOptions.map((option, idx) => (
                              <button
                                key={idx}
                                className={`quiz-option ${finalTestSelectedAnswer === option
                                  ? finalTestQuizResult === 'correct'
                                    ? 'correct'
                                    : finalTestQuizResult === 'incorrect'
                                      ? 'incorrect'
                                      : 'selected'
                                  : ''
                                  }`}
                                onClick={() => !finalTestSelectedAnswer && handleFinalTestAnswerSelect(option)}
                                disabled={!!finalTestSelectedAnswer}
                              >
                                {option}
                              </button>
                            ))}
                          </div>
                          {finalTestQuizResult && finalTestQuizResult === 'incorrect' && (
                            <div className={`quiz-feedback ${finalTestQuizResult}`}>
                              ✗ Incorrect
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            </div>

            {/* Exit/Continue button at bottom */}
            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <Button variant="outline" onClick={() => {
                const correct = Object.values(finalTestResults).filter(r => r === true).length;
                if (testStage === 1) {
                  setShowFinalTest(false);
                  setShowSecondTestIntro(true);
                } else {
                  const message = `Test Results:\n${correct} out of ${total} correct (${Math.round(correct / total * 100)}%)`;
                  alert(message);
                  setShowFinalTest(false);
                }
              }}>
                {testStage === 1 ? 'Continue to Test 2' : 'Finish Test'}
              </Button>
            </div>
          </div>
        ) : testStage === 2 ? (
          // Test 2: word-only UI (no image) with click navigation
          <div className="vocab-screen-container" data-theme={theme.name} onClick={handleSecondTestScreenClick}>
            <div className="vocab-progress">
              <div className="text-sm text-white/80 font-medium">Test 2: {Math.min(secondTestIndex + 1, (secondTestPool.length || total))} / {(secondTestPool.length || total)}</div>
              <div className="text-xs text-white/60 mt-1">Score: {Object.values(secondTestResults).filter(r => r === true).length} correct</div>
            </div>
            <div className={`vocab-card-container ${pageTurnDirection ? `page-turn-${pageTurnDirection}` : ''}`}>
              <div className="vocab-card-wrapper test2-mode" style={test2GradientStyles}>
                <div className="vocab-card-inner">
                  <section className="vocab-card front">
                    <div className="vocab-inside">
                      <div className="vocab-shine" />
                      <div className="vocab-glare" />
                      <div className="vocab-content">
                        <div className="vocab-details">
                          <h3 className="vocab-term">{(secondPoolCurrent || secondTestCurrent)?.term}</h3>
                          <p className="vocab-pos">{(secondPoolCurrent || secondTestCurrent)?.pos || 'word'}</p>
                          {(secondPoolCurrent || secondTestCurrent)?.ipa && <p className="vocab-ipa">/{(secondPoolCurrent || secondTestCurrent)?.ipa}/</p>}
                        </div>
                        <div className="vocab-quiz">
                          {/* Removed header text per request */}
                          <div className="quiz-options">
                            {secondTestQuizOptions.map((option, idx) => (
                              <button
                                key={idx}
                                className={`quiz-option ${secondTestSelectedAnswer === option ? (option === (secondPoolCurrent || secondTestCurrent)?.translation ? 'correct' : 'incorrect') : ''}`}
                                onClick={() => !secondTestSelectedAnswer && handleSecondTestAnswerSelect(option)}
                                disabled={!!secondTestSelectedAnswer}
                              >
                                {option}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            </div>
            {showSecondResults && (
              <div className="mt-4">
                <Card className="w-full max-w-2xl mx-auto">
                  <CardContent className="p-6 space-y-4">
                    <div className="text-lg font-semibold text-center">Results</div>
                    <div className="text-center text-muted-foreground">
                      Correct: {Object.values(secondTestResults).filter(r => r === true).length} / {(secondTestPool.length || total)}
                    </div>
                    <div>
                      <div className="text-sm font-medium mb-2">Need more practice</div>
                      <div className="grid gap-2">
                        {(secondTestPool.length ? secondTestPool : rows).filter(r => !secondTestResults[r.id]).map(r => (
                          <div key={r.id} className="rounded-md border p-3 flex items-center justify-between">
                            <div className="text-sm font-medium">{r.term}</div>
                            <div className="text-xs text-muted-foreground">{r.translation}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-center gap-2">
                      <Button onClick={() => {
                        const pool = (secondTestPool.length ? secondTestPool : rows);
                        const wrong = pool.filter(r => !secondTestResults[r.id]);
                        if (wrong.length === 0) {
                          setShowSecondResults(false);
                          // Mark completion state and go back to vocabulary interface
                          navigate('/vocabulary');
                          return;
                        }
                        setSecondTestPool(wrong);
                        setSecondTestResults({});
                        setSecondTestIndex(0);
                        setSecondTestSelectedAnswer(null);
                        setShowSecondResults(false);
                      }}>
                        {(((secondTestPool.length ? secondTestPool : rows).filter(r => !secondTestResults[r.id]).length) === 0) ? 'Done' : 'Retake wrong only'}
                      </Button>
                      <Button variant="secondary" onClick={() => navigate('/vocabulary')}>Back to Vocabulary</Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        ) : current ? (
          <div className="vocab-screen-container" data-theme={theme.name} onClick={handleScreenClick}>
            {/* Progress indicator on top of card */}
            <div className="vocab-progress">
              <div className="text-sm text-white/80 font-medium">
                {total ? `${index + 1} / ${total}` : '0 / 0'}
              </div>
            </div>

            <div className={`vocab-card-container ${pageTurnDirection ? `page-turn-${pageTurnDirection}` : ''}`}>
              <div
                className={`vocab-card-wrapper ${isFlipped ? 'flipped' : ''}`}
                onClick={handleCardClick}
                style={cardGradientStyles}
              >
                <div className="vocab-card-inner">
                  {/* Front face - word information */}
                  <section className="vocab-card front">
                    <div className="vocab-inside">
                      {/* Shine and glare effects */}
                      <div className="vocab-shine" />
                      <div className="vocab-glare" />

                      {/* Image section - placeholder for word-related image */}
                      <div className="vocab-image-content">
                        <div className="word-image-placeholder">
                          <div className="text-6xl font-bold text-white/80 select-none">
                            {current.term?.slice(0, 1)?.toUpperCase() || 'A'}
                          </div>
                        </div>
                      </div>

                      {/* Main content */}
                      <div className="vocab-content">
                        <div className="vocab-details">
                          <div className="vocab-term-row">
                            <h3 className="vocab-term">{current.term}</h3>
                            {current.audio_url && (
                              <button
                                className={`vocab-audio-btn ${isPlaying && playingCardId === current.id ? 'playing' : ''} ${isAudioLoading ? 'loading' : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleAudio(current.audio_url!, current.id);
                                }}
                                disabled={isAudioLoading}
                                title={isAudioLoading ? 'Loading...' : isPlaying && playingCardId === current.id ? 'Stop' : 'Play pronunciation'}
                              >
                                {isAudioLoading ? (
                                  <Loader2 className="w-5 h-5 animate-spin" />
                                ) : isPlaying && playingCardId === current.id ? (
                                  <VolumeX className="w-5 h-5" />
                                ) : (
                                  <Volume2 className="w-5 h-5" />
                                )}
                              </button>
                            )}
                          </div>
                          <p className="vocab-pos">{current.pos || 'word'}</p>
                          {current.ipa && (
                            <p className="vocab-ipa">/{current.ipa}/</p>
                          )}
                        </div>

                        {/* Translation - show all translations */}
                        {(current.translations?.length > 0 || current.translation) && (
                          <div className="vocab-translation">
                            {current.translations?.length > 1 ? (
                              <div className="translation-text">
                                {current.translations.map((t, i) => (
                                  <span key={i}>
                                    {t}{i < current.translations.length - 1 ? ', ' : ''}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <div className="translation-text">{current.translation}</div>
                            )}
                          </div>
                        )}

                        {/* Example sentence */}
                        {sentence && (
                          <div className="vocab-example">
                            <div
                              className="example-text"
                              dangerouslySetInnerHTML={{
                                __html: highlightWordInSentence(sentence, current?.term || '')
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </section>

                  {/* Back face - quiz */}
                  <section className="vocab-card back">
                    <div className="vocab-inside">
                      {/* Shine and glare effects */}
                      <div className="vocab-shine" />
                      <div className="vocab-glare" />

                      <div className="vocab-quiz">
                        <div className="quiz-header">
                          <h3 className="quiz-question">What is the translation of:</h3>
                          <div className="quiz-word">{current.term}</div>
                        </div>

                        <div className="quiz-options">
                          {quizOptions.map((option, idx) => (
                            <button
                              key={idx}
                              className={`quiz-option ${selectedAnswer === option
                                ? quizResult === 'correct'
                                  ? 'correct'
                                  : quizResult === 'incorrect'
                                    ? 'incorrect'
                                    : 'selected'
                                : ''
                                }`}
                              onClick={() => !selectedAnswer && handleAnswerSelect(option)}
                              disabled={!!selectedAnswer}
                            >
                              {option}
                            </button>
                          ))}
                        </div>

                        {quizResult && quizResult === 'incorrect' && (
                          <div className={`quiz-feedback ${quizResult}`}>
                            ✗ Incorrect
                          </div>
                        )}
                      </div>
                    </div>
                  </section>
                </div>
              </div>

              {/* Notes section - outside the flip wrapper */}
              <div className="vocab-notes-section" onClick={(e) => e.stopPropagation()}>
                <textarea
                  className="notes-textarea"
                  placeholder=""
                  value={currentNotes}
                  onChange={(e) => current && handleNotesChange(current.id, e.target.value)}
                  rows={3}
                />
                {saveStatus && (
                  <div className={`notes-save-indicator ${saveStatus === "Saved" ? "notes-saved" : ""}`}>
                    {saveStatus}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center items-center min-h-[400px]">
            <LottieLoadingAnimation />
          </div>
        )}

        {/* Toast notification */}
        {showToast && (
          <div className="vocab-toast">
            {toastMessage}
          </div>
        )}
      </div>
    </StudentLayout>
  );
}


