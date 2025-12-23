import { useEffect, useMemo, useState, useRef } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Volume2, VolumeX, Loader2, Check, Sparkles, Mic, MicOff, Play, CirclePlus, BookMarked, Feather } from "lucide-react";
import StudentLayout from "@/components/StudentLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import LottieLoadingAnimation from "@/components/animations/LottieLoadingAnimation";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { fetchVocabCards, fetchTranslationsForCards, fetchAllTranslationsForLanguage, type D1VocabCard } from '@/lib/d1Client';
import "./VocabTest.css";

// Robust Fisher-Yates shuffle
const shuffleArray = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

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
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();
  const { toast } = useToast();
  const { user } = useAuth();
  const [name, setName] = useState<string>("Deck Test");
  const [rows, setRows] = useState<Row[]>([]);
  const [index, setIndex] = useState(0);
  const [translations, setTranslations] = useState<Record<string, string>>({}); // Store fetched translations
  const [isSyntheticDeck, setIsSyntheticDeck] = useState(false); // Track if using D1 cards

  // Word book state
  const [addingToWordBook, setAddingToWordBook] = useState(false);
  const [addedToWordBook, setAddedToWordBook] = useState<Set<string>>(new Set());

  // Audio playback state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingCardId, setPlayingCardId] = useState<string | null>(null);
  const audioCache = useRef<Record<string, HTMLAudioElement>>({});

  // ... (rest of state)

  // Fetch translations when rows change if lang is set (using D1)
  useEffect(() => {
    if (!lang || rows.length === 0 || !isSyntheticDeck) return;

    const fetchTranslationsFromD1 = async () => {
      console.log(`VocabTest: Fetching all translations for ${lang} from D1 (Synthetic Deck)`);

      try {
        // Use the bulk translations API which is much safer and faster for large sets
        const { first: translationMap, all: allTranslationsMap } = await fetchAllTranslationsForLanguage(lang);

        if (Object.keys(translationMap).length === 0) {
          console.warn(`VocabTest: No translations found for language: ${lang}`);
          return;
        }

        setTranslations(translationMap);

        // Update rows with new translations
        setRows(prevRows => prevRows.map(row => ({
          ...row,
          translation: translationMap[row.id] || row.translation,
          translations: allTranslationsMap[row.id] || []
        })));

        console.log(`VocabTest: Applied translations for ${lang}`);
      } catch (error) {
        console.error('VocabTest: Error fetching translations from D1:', error);
      }
    };

    fetchTranslationsFromD1();
  }, [lang, rows.length, isSyntheticDeck]);

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
  const [testStage, setTestStage] = useState<0 | 1 | 2>(0); // 0=learning, 1=test word-only, 2=audio-only test
  const [finalTestResults, setFinalTestResults] = useState<{ [key: string]: boolean }>({});
  const [test1AudioPlayed, setTest1AudioPlayed] = useState(false); // Used in audio test
  const [finalTestIndex, setFinalTestIndex] = useState(0);
  const [finalTestFlipped, setFinalTestFlipped] = useState(false);
  const [finalTestQuizOptions, setFinalTestQuizOptions] = useState<string[]>([]);
  const [finalTestSelectedAnswer, setFinalTestSelectedAnswer] = useState<string | null>(null);
  const [finalTestQuizResult, setFinalTestQuizResult] = useState<'correct' | 'incorrect' | null>(null);
  // Second test (word-only)
  const [secondTestIndex, setSecondTestIndex] = useState(0);
  const [secondTestSelectedAnswer, setSecondTestSelectedAnswer] = useState<string | null>(null);
  const [secondTestQuizResult, setSecondTestQuizResult] = useState<'correct' | 'incorrect' | null>(null);
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

  // Sentence practice feature state
  const [sentenceInput, setSentenceInput] = useState<{ [key: string]: string }>({});
  const [sentenceEvaluating, setSentenceEvaluating] = useState(false);
  const [sentenceFeedback, setSentenceFeedback] = useState<{ [key: string]: any }>({});

  // Pronunciation practice state
  const [isRecording, setIsRecording] = useState(false);
  const [pronunciationEvaluating, setPronunciationEvaluating] = useState(false);
  const [pronunciationFeedback, setPronunciationFeedback] = useState<{ [key: string]: any }>({});
  const [recordedAudios, setRecordedAudios] = useState<{ [key: string]: string }>({});
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const sentenceTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Procedural audio feedback - subtle correct, original incorrect
  const playFeedbackSound = (isCorrect: boolean) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      if (isCorrect) {
        // Very soft, high-pitched "ping"
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(1200, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.04, audioCtx.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.3);
      } else {
        // Restored original: Lower-pitched gentle error sound (A4 to A3)
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(220, audioCtx.currentTime + 0.15);
        gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.5);
      }
    } catch (e) {
      console.warn("Feedback sound error:", e);
    }
  };

  const total = rows.length;
  const current = rows[index] || null;
  const finalTestCurrent = showFinalTest ? rows[finalTestIndex] : null;
  const secondTestCurrent = testStage === 2 ? rows[secondTestIndex] : null;
  const secondPoolCurrent = testStage === 2 ? (secondTestPool[secondTestIndex] || null) : null;

  // Handle adding a word to user's word book - refactored to take a card argument
  const handleAddToWordBook = async (cardToSave = current) => {
    if (!user) {
      if (!cardToSave) return; // Silent return for auto-adds
      toast({
        title: 'Login Required',
        description: 'Please log in to add words to your Word Book',
        variant: 'destructive'
      });
      return;
    }

    if (!cardToSave) return;

    // Use specific loading state if it's the current one being manually added
    const isManualClick = cardToSave.id === current?.id;
    if (isManualClick) setAddingToWordBook(true);

    try {
      const normalizedTerm = cardToSave.term.trim().toLowerCase();

      // Check if word already exists in user_vocabulary to avoid noise
      const { data: existing } = await supabase
        .from('user_vocabulary')
        .select('id, word')
        .eq('user_id', user.id);

      const isDuplicate = existing?.some(item =>
        item?.word?.trim().toLowerCase() === normalizedTerm
      );

      if (isDuplicate) {
        if (isManualClick) {
          toast({
            title: 'Already Saved',
            description: 'This word is already in your Word Book',
          });
        }
        setAddedToWordBook(prev => new Set(prev).add(cardToSave.id));
        return;
      }

      // Prepare translations array
      const translationsArray = cardToSave.translations?.length > 0
        ? cardToSave.translations
        : cardToSave.translation ? [cardToSave.translation] : [];

      // Add to user_vocabulary table
      const { error: insertError } = await supabase
        .from('user_vocabulary')
        .insert({
          user_id: user.id,
          word: cardToSave.term,
          translations: translationsArray,
          part_of_speech: cardToSave.pos || null,
        });

      if (insertError) throw insertError;

      setAddedToWordBook(prev => new Set(prev).add(cardToSave.id));

      if (isManualClick) {
        toast({
          title: 'Word Added',
          description: `"${cardToSave.term}" has been added to your Word Book`,
        });
      }
    } catch (error: any) {
      console.error('Save error:', error);
      if (isManualClick) {
        toast({
          title: 'Save Failed',
          description: error.message || 'Failed to save word to Word Book',
          variant: 'destructive'
        });
      }
    } finally {
      if (isManualClick) setAddingToWordBook(false);
    }
  };

  const isNoteTheme = theme.name === 'note';

  // Localized placeholders
  const placeholders = useMemo(() => {
    const defaultPlaceholders = {
      notes: "Personal notes...",
      sentence: `Use "${current?.term || 'word'}" in a sentence...`
    };

    if (!lang) return defaultPlaceholders;

    const mapping: Record<string, typeof defaultPlaceholders> = {
      'ko': { notes: "개인 메모...", sentence: `"${current?.term || '단어'}"를 사용하여 문장을 만드세요...` },
      'ja': { notes: "個人メモ...", sentence: `"${current?.term || '単語'}"を使って文章を作ってください...` },
      'zh': { notes: "个人笔记...", sentence: `使用 "${current?.term || '单词'}" 造句...` },
      'zh-TW': { notes: "個人筆記...", sentence: `使用 "${current?.term || '單詞'}" 造句...` },
      'es': { notes: "Notas personales...", sentence: `Usa "${current?.term || 'palabra'}" en una oración...` },
      'fr': { notes: "Notes personnelles...", sentence: `Utilisez "${current?.term || 'mot'}" dans une phrase...` },
      'de': { notes: "Persönliche Notizen...", sentence: `Verwenden Sie "${current?.term || 'Wort'}" in einem Satz...` },
      'vi': { notes: "Ghi chú cá nhân...", sentence: `Sử dụng từ "${current?.term || 'từ'}" trong một câu...` },
      'th': { notes: "บันทึกส่วนตัว...", sentence: `ใช้คำว่า "${current?.term || 'คำ'}" ในประโยค...` },
      'id': { notes: "Catatan pribadi...", sentence: `Gunakan "${current?.term || 'kata'}" dalam sebuah kalimat...` },
      'ru': { notes: "Личные заметки...", sentence: `Используйте "${current?.term || 'слово'}" в предложении...` },
      'ar': { notes: "ملاحظات شخصية...", sentence: `استخدم "${current?.term || 'كلمة'}" في جملة...` },
      'hi': { notes: "व्यक्तिगत नोट्स...", sentence: `वाक्य में "${current?.term || 'शब्द'}" का प्रयोग करें...` },
      'pt': { notes: "Notas pessoais...", sentence: `Use "${current?.term || 'palavra'}" em uma frase...` },
      'tr': { notes: "Kişisel notlar...", sentence: `"${current?.term || 'kelime'}" kelimesini bir cümlede kullanın...` },
    };

    return mapping[lang] || defaultPlaceholders;
  }, [lang, current?.term]);

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
      // Set background on html and body to ensure no sidebars
      const originalHtmlBg = document.documentElement.style.backgroundColor;
      const originalBodyBg = document.body.style.backgroundColor;

      document.documentElement.style.backgroundColor = '#FEF9E7';
      document.body.style.backgroundColor = '#FEF9E7';

      return () => {
        document.documentElement.style.backgroundColor = originalHtmlBg;
        document.body.style.backgroundColor = originalBodyBg;
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
        let d1Cards: D1VocabCard[] = [];
        try {
          d1Cards = await fetchVocabCards({
            limit: 5000
          });
          console.log(`VocabTest: Loaded ${d1Cards.length} cards from D1`);
        } catch (err) {
          console.warn('VocabTest: D1 fetch failed, falling back to Supabase', err);
        }

        // Fallback to Supabase if D1 fails
        if (d1Cards.length === 0) {
          console.log('VocabTest: D1 returned 0 cards, trying Supabase fallback...');
          const { data, error } = await supabase
            .from('vocab_cards')
            .select('id, term, pos, ipa, context_sentence, examples_json, audio_url, level')
            .order('created_at', { ascending: true })
            .limit(5000);
          if (!error && data) {
            d1Cards = data as any[];
            console.log(`VocabTest: Loaded ${d1Cards.length} cards from Supabase fallback`);
          } else if (error) {
            console.error('VocabTest: Supabase fallback failed:', error);
          }
        }

        // True random shuffle using Fisher-Yates to mix ALL letters together
        const shuffledCards = [...d1Cards];
        for (let i = shuffledCards.length - 1; i > 0; i--) {
          // Use a seeded random based on index to keep it stable per session
          const j = Math.floor(Math.abs(Math.sin(i * 9999) * 10000) % (i + 1));
          [shuffledCards[i], shuffledCards[j]] = [shuffledCards[j], shuffledCards[i]];
        }

        const WORDS_PER_LEVEL = Math.ceil(shuffledCards.length / MAX_LEVEL);

        // Process all cards with the same level assignment logic as VocabLevels.tsx
        const processedCards = shuffledCards.map((card: D1VocabCard, index: number) => {
          let level = card.level || 1;
          if (level > MAX_LEVEL || level < 1) {
            level = Math.floor(index / WORDS_PER_LEVEL) + 1;
            if (level > MAX_LEVEL) level = MAX_LEVEL;
          }
          return { ...card, level };
        });

        // Now filter for the level we want
        const filteredCards = processedCards.filter(c => c.level === targetLevel);

        // ... existing formatting logic ...
        const formattedCards = filteredCards.map((card) => ({
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
          rows = shuffleArray(rows);
        }

        setRows(rows);
        setIndex(0);
        setIsSyntheticDeck(true);
        setLoading(false);
        return;
      }

      // Final part of load function, set loading false for normal decks too
      setLoading(false);

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

      // Apply shuffle if enabled (defaulting to true if not set)
      const shouldShuffleRaw = localStorage.getItem('vocab-shuffle-enabled');
      const shouldShuffle = shouldShuffleRaw === null ? true : JSON.parse(shouldShuffleRaw);

      if (shouldShuffle) {
        rows = shuffleArray(rows);
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
      // Remove page turn animation for learning phase to prevent shaking
      // setPageTurnDirection('next');
      // setTimeout(() => setPageTurnDirection(null), 600);

      // Reset all card states immediately before/during index change to avoid flicker
      setIsFlipped(false);
      setQuizResult(null);
      setSelectedAnswer(null);

      setIndex((i) => Math.min(i + 1, Math.max(0, total - 1)));
    } else if (index === total - 1) {
      // At the last card, show intro before tests
      setShowTestIntro(true);
    }
  };

  const prev = () => {
    if (index > 0) {
      // Remove page turn animation for learning phase to prevent shaking
      // setPageTurnDirection('prev');
      // setTimeout(() => setPageTurnDirection(null), 600);

      // Reset all card states immediately
      setIsFlipped(false);
      setQuizResult(null);
      setSelectedAnswer(null);

      setIndex((i) => Math.max(i - 1, 0));
    }
  };

  const handleNotesChange = (cardId: string, value: string) => {
    setNotes(prev => ({
      ...prev,
      [cardId]: value
    }));
  };

  // Reset textarea height when changing cards
  useEffect(() => {
    if (sentenceTextareaRef.current) {
      sentenceTextareaRef.current.style.height = 'auto';
    }
  }, [index, testStage]);

  const toggleShuffle = () => {
    const newValue = !shuffleEnabled;
    setShuffleEnabled(newValue);
    localStorage.setItem('vocab-shuffle-enabled', JSON.stringify(newValue));

    // Re-shuffle or restore order
    if (newValue) {
      setRows(prev => shuffleArray(prev));
    } else {
      // Reload to restore original order
      window.location.reload();
    }
  };

  const currentNotes = current ? notes[current.id] || "" : "";
  const currentSentenceInput = current ? sentenceInput[current.id] || "" : "";
  const currentSentenceFeedback = current ? sentenceFeedback[current.id] : null;
  const currentPronunciationFeedback = current ? pronunciationFeedback[current.id] : null;
  const currentRecordedAudio = current ? recordedAudios[current.id] : null;

  const playStudentAudio = () => {
    if (currentRecordedAudio) {
      const audio = new Audio(currentRecordedAudio);
      audio.play().catch(e => console.error('Error playing student audio:', e));
    }
  };

  // Pronunciation recording and evaluation
  const togglePronunciationRecording = async () => {
    if (!current) return;

    if (isRecording) {
      // Stop recording
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
    } else {
      // Start recording
      try {
        // Clear previous feedback for this word when re-recording
        if (current) {
          setPronunciationFeedback(prev => {
            const updated = { ...prev };
            delete updated[current.id];
            return updated;
          });
        }

        // Play a gentle beep to indicate recording started
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.frequency.value = 880; // A5 note - gentle high pitch
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.15, audioContext.currentTime); // Low volume
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.15);

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
        });
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          // Stop all tracks
          stream.getTracks().forEach(track => track.stop());

          // Play a gentle lower-pitched beep to indicate recording stopped
          try {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            oscillator.frequency.value = 440; // A4 note - lower than start sound
            oscillator.type = 'sine';
            gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.15);
          } catch (e) { /* ignore audio errors */ }

          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

          // Store local URL for playback
          const audioUrl = URL.createObjectURL(audioBlob);
          if (current) {
            setRecordedAudios(prev => ({ ...prev, [current.id]: audioUrl }));
          }

          await evaluatePronunciation(audioBlob);
        };

        mediaRecorder.start();
        setIsRecording(true);

        // Auto-stop after 3 seconds (for single word, no need for 5s)
        setTimeout(() => {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
          }
        }, 3000);
      } catch (error) {
        console.error('Error accessing microphone:', error);
        showToastNotification('Could not access microphone. Please check permissions.');
      }
    }
  };

  const evaluatePronunciation = async (audioBlob: Blob) => {
    if (!current) return;

    setPronunciationEvaluating(true);
    try {
      // Convert blob to base64
      const reader = new FileReader();
      const base64Data = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      });

      const { data, error } = await supabase.functions.invoke('vocab-pronunciation-feedback', {
        body: {
          audioData: base64Data,
          targetWord: current.term,
          targetIPA: current.ipa || '',
          mimeType: 'audio/webm',
          feedbackLanguage: lang || 'en'
        }
      });

      if (error) {
        console.error('Pronunciation evaluation error:', error);
        showToastNotification('Failed to evaluate pronunciation. Please try again.');
        return;
      }

      console.log('🎯 Pronunciation API response:', data);

      if (data?.success) {
        const newFeedback = {
          ...data,
          timestamp: Date.now() // Add timestamp to ensure React detects the change
        };
        console.log('✅ Setting new feedback for word:', current.id, newFeedback);
        setPronunciationFeedback(prev => ({
          ...prev,
          [current.id]: newFeedback
        }));
      } else {
        console.error('❌ Evaluation failed:', data?.error);
        showToastNotification(data?.error || 'Failed to evaluate pronunciation');
      }
    } catch (error) {
      console.error('Error evaluating pronunciation:', error);
      showToastNotification('Failed to evaluate pronunciation. Please try again.');
    } finally {
      setPronunciationEvaluating(false);
    }
  };

  // Sentence practice evaluation function
  const evaluateSentence = async () => {
    if (!current || !currentSentenceInput.trim()) {
      showToastNotification('Please write a sentence first');
      return;
    }

    setSentenceEvaluating(true);
    try {
      const { data, error } = await supabase.functions.invoke('vocab-sentence-practice', {
        body: {
          sentence: currentSentenceInput.trim(),
          vocabularyWord: current.term,
          targetLanguage: lang || 'en'
        }
      });

      if (error) {
        console.error('Sentence evaluation error:', error);
        showToastNotification('Failed to evaluate sentence. Please try again.');
        return;
      }

      if (data?.success) {
        setSentenceFeedback(prev => ({
          ...prev,
          [current.id]: data
        }));
      } else {
        showToastNotification(data?.error || 'Failed to evaluate sentence');
      }
    } catch (error) {
      console.error('Error evaluating sentence:', error);
      showToastNotification('Failed to evaluate sentence. Please try again.');
    } finally {
      setSentenceEvaluating(false);
    }
  };

  const handleSentenceInputChange = (cardId: string, value: string) => {
    setSentenceInput(prev => ({
      ...prev,
      [cardId]: value
    }));

    // Clear previous feedback when user starts typing a new sentence
    if (sentenceFeedback[cardId]) {
      setSentenceFeedback(prev => {
        const updated = { ...prev };
        delete updated[cardId];
        return updated;
      });
    }

    // Auto-expand height
    if (sentenceTextareaRef.current) {
      sentenceTextareaRef.current.style.height = 'auto';
      sentenceTextareaRef.current.style.height = `${sentenceTextareaRef.current.scrollHeight}px`;
    }
  };

  const handleSentenceKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      evaluateSentence();
    }
  };

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

    // Pick a random translation from all available translations for the current word
    const correctTranslation = current.translations?.length > 0
      ? current.translations[Math.floor(Math.random() * current.translations.length)]
      : current.translation;

    // Get random translations from other cards, also picking randomly from their translations array
    const otherTranslations = rows
      .filter(card => card.id !== current.id)
      .map(card => {
        // Pick a random translation from this card's translations
        if (card.translations?.length > 0) {
          return card.translations[Math.floor(Math.random() * card.translations.length)];
        }
        return card.translation;
      })
      .filter(translation => translation && translation !== correctTranslation)
      .slice(0, 3);

    // Add the correct translation
    const options = [correctTranslation, ...otherTranslations];

    // Shuffle the options
    const shuffled = shuffleArray(options);
    setQuizOptions(shuffled);
    setSelectedAnswer(null);
    setQuizResult(null);
  };

  const generateFinalTestQuizOptions = () => {
    if (!finalTestCurrent) return;

    // Pick a random translation from all available translations for the correct answer
    const correct = finalTestCurrent.translations?.length > 0
      ? finalTestCurrent.translations[Math.floor(Math.random() * finalTestCurrent.translations.length)]
      : (finalTestCurrent.translation || '').toString();

    // Collect candidate translations from other cards (truthy, trimmed, unique)
    // Also pick randomly from each card's translations array
    const candidateSet = new Set<string>();
    rows.forEach((card) => {
      if (!card || card.id === finalTestCurrent.id) return;
      // Pick a random translation from this card
      let t = '';
      if (card.translations?.length > 0) {
        t = card.translations[Math.floor(Math.random() * card.translations.length)];
      } else {
        t = (card.translation || '').toString().trim();
      }
      if (!t) return;
      if (t.toLowerCase() === correct.toLowerCase()) return;
      if (!candidateSet.has(t.toLowerCase())) candidateSet.add(t);
    });
    let candidates = Array.from(candidateSet);
    // Shuffle candidates and pick up to 3
    candidates = shuffleArray(candidates).slice(0, 3);

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
    const shuffled = shuffleArray(options);
    setFinalTestQuizOptions(shuffled);
    setFinalTestSelectedAnswer(null);
    setFinalTestQuizResult(null);
    // audio played state only matters for audio test phase
  };

  const generateSecondTestQuizOptions = () => {
    const target = secondPoolCurrent || secondTestCurrent;
    if (!target) return;

    // Pick a random translation from all available translations for the correct answer
    const correctTranslation = target.translations?.length > 0
      ? target.translations[Math.floor(Math.random() * target.translations.length)]
      : target.translation;

    // Get random translations from other cards, picking randomly from their translations
    const otherTranslations = rows
      .filter(card => card.id !== target.id)
      .map(card => {
        if (card.translations?.length > 0) {
          return card.translations[Math.floor(Math.random() * card.translations.length)];
        }
        return card.translation;
      })
      .filter(translation => translation && translation !== correctTranslation)
      .slice(0, 3);

    const options = [correctTranslation, ...otherTranslations];
    const shuffled = shuffleArray(options);
    setSecondTestQuizOptions(shuffled);
    setSecondTestSelectedAnswer(null);
  };

  const finalTestNext = () => {
    if (finalTestIndex < total - 1) {
      // Keep page turn for tests to show progress
      setPageTurnDirection('next');
      setTimeout(() => setPageTurnDirection(null), 600);

      // Reset all states immediately to avoid flicker
      setFinalTestFlipped(false);
      setFinalTestSelectedAnswer(null);
      setFinalTestQuizResult(null);

      setFinalTestIndex(finalTestIndex + 1);
    } else {
      setShowFinalTest(false);
      setShowSecondTestIntro(true);
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
      // Prev only if not answered yet, or stay on same page
      // finalTestPrev(); 
      return;
    } else if (clickX > rightZone) {
      // ONLY advance if answer is selected
      if (finalTestSelectedAnswer) {
        finalTestNext();
      }
      return;
    }
  };

  const handleFinalTestAnswerSelect = (e: React.MouseEvent, answer: string) => {
    e.stopPropagation();
    if (finalTestSelectedAnswer) return;

    setFinalTestSelectedAnswer(answer);
    // Check against all translations, not just the first one
    const isCorrect = finalTestCurrent?.translations?.length
      ? finalTestCurrent.translations.some(t => t === answer)
      : answer === finalTestCurrent?.translation;
    setFinalTestQuizResult(isCorrect ? 'correct' : 'incorrect');
    playFeedbackSound(isCorrect);

    // Automatically add to wordbook if incorrect
    if (!isCorrect && finalTestCurrent) {
      handleAddToWordBook(finalTestCurrent);
    }

    // Save result for final summary
    if (finalTestCurrent) {
      setFinalTestResults({ ...finalTestResults, [finalTestCurrent.id]: isCorrect });
      saveSRSData(finalTestCurrent.id, isCorrect);
    }

    // NO auto-advance. Must click side of screen to proceed.
  };

  const nextSecondTest = () => {
    const poolLen = (secondTestPool.length || total);
    if (secondTestIndex < poolLen - 1) {
      setPageTurnDirection('next');
      setTimeout(() => setPageTurnDirection(null), 600);

      // Reset state for next card
      setSecondTestSelectedAnswer(null);
      setSecondTestQuizResult(null);

      setSecondTestIndex(prev => prev + 1);
    } else {
      setShowSecondResults(true);
    }
  };

  const handleSecondTestAnswerSelect = (e: React.MouseEvent, answer: string) => {
    e.stopPropagation();
    if (secondTestSelectedAnswer) return;

    setSecondTestSelectedAnswer(answer);
    const target = secondPoolCurrent || secondTestCurrent;
    // Check against all translations, not just the first one
    const isCorrect = target?.translations?.length
      ? target.translations.some(t => t === answer)
      : answer === target?.translation;
    setSecondTestQuizResult(isCorrect ? 'correct' : 'incorrect');
    playFeedbackSound(isCorrect);

    // Automatically add to wordbook if incorrect
    if (!isCorrect && target) {
      handleAddToWordBook(target);
    }

    if (target) {
      setSecondTestResults({ ...secondTestResults, [target.id]: !!isCorrect });
      saveSRSData(target.id, !!isCorrect);
    }

    // NO auto-advance. Must click side of screen to proceed.
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
        setTest1AudioPlayed(false); // Reset audio played for next listening card
      } else {
        setShowSecondResults(true);
        saveFinalTestResult();
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

  const handleAnswerSelect = (e: React.MouseEvent, answer: string) => {
    e.stopPropagation();
    if (selectedAnswer) return;

    setSelectedAnswer(answer);
    // Check against all translations, not just the first one
    const isCorrect = current?.translations?.length
      ? current.translations.some(t => t === answer)
      : answer === current?.translation;
    setQuizResult(isCorrect ? 'correct' : 'incorrect');
    playFeedbackSound(isCorrect);

    // Save SRS data
    if (current) {
      saveSRSData(current.id, isCorrect);
    }

    // Auto-advance removed - student must manually navigate by clicking the side of the screen
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

  const saveFinalTestResult = async () => {
    if (!user || !deckId) return;

    // Calculate final score
    const totalWords = rows.length;
    const correctCount = Object.values(secondTestResults).filter(r => r === true).length;
    const scorePercentage = Math.round((correctCount / totalWords) * 100);

    try {
      const { error } = await supabase.from('test_results').insert({
        user_id: user.id,
        test_type: 'vocabulary',
        score_percentage: scorePercentage,
        total_questions: totalWords,
        correct_answers: correctCount,
        test_data: { vocab_test_id: deckId }
      });

      if (error) throw error;
      console.log('VocabTest: Test result saved successfully');
    } catch (err) {
      console.error('VocabTest: Failed to save test result:', err);
    }
  };

  const [isAudioLoading, setIsAudioLoading] = useState(false);

  // Reset flip state when card changes
  useEffect(() => {
    setIsFlipped(false);
    setQuizResult(null);
    setSelectedAnswer(null);
  }, [index]);

  // Audio preloading effect
  useEffect(() => {
    if (!current?.audio_url) return;

    const preloadAudio = (url: string, id: string) => {
      if (audioCache.current[id]) return;

      const audio = new Audio(url);
      audio.preload = "auto";
      audioCache.current[id] = audio;

      // Handle audio ended for the cached object
      audio.onended = () => {
        setIsPlaying(false);
        setPlayingCardId(null);
      };

      // Handle errors
      audio.onerror = () => {
        console.warn('Audio unavailable for preloaded card:', id);
        delete audioCache.current[id];
      };
    };

    // Preload current card
    preloadAudio(current.audio_url, current.id);

    // Preload next 2 cards for smoother experience
    for (let i = 1; i <= 2; i++) {
      const nextCard = rows[index + i];
      if (nextCard?.audio_url) {
        preloadAudio(nextCard.audio_url, nextCard.id);
      }
    }
  }, [index, rows]);

  // Updated toggleAudio to use cache
  const toggleAudio = (audioUrl: string, cardId: string) => {
    // If clicking on the same card that's playing, stop it
    if (isPlaying && playingCardId === cardId) {
      const currentAudio = audioCache.current[cardId];
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }
      setIsPlaying(false);
      setPlayingCardId(null);
      setIsAudioLoading(false);
      return;
    }

    // Stop any currently playing audio
    Object.values(audioCache.current).forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });

    setIsAudioLoading(true);

    // Get from cache or create new
    let audio = audioCache.current[cardId];
    if (!audio) {
      audio = new Audio(audioUrl);
      audioCache.current[cardId] = audio;

      audio.onended = () => {
        setIsPlaying(false);
        setPlayingCardId(null);
      };

      audio.onerror = () => {
        console.warn('Audio unavailable:', audioUrl);
        showToastNotification('Audio unavailable');
        setIsPlaying(false);
        setPlayingCardId(null);
        setIsAudioLoading(false);
        delete audioCache.current[cardId];
      };
    }

    audio.play().then(() => {
      setIsPlaying(true);
      setPlayingCardId(cardId);
      setIsAudioLoading(false);
    }).catch((error) => {
      if (error.name === 'AbortError') {
        setIsAudioLoading(false);
        return;
      }
      console.error('Error playing audio:', error);
      showToastNotification('Could not play audio');
      setIsPlaying(false);
      setPlayingCardId(null);
      setIsAudioLoading(false);
    });
  };


  return (
    <StudentLayout title={name} transparentBackground={isNoteTheme} fullWidth={isNoteTheme} noPadding={isNoteTheme}>
      {/* Aggressive CSS injection to prevent black background flashing during loading */}
      {isNoteTheme && (
        <style>{`
          body, html, #root { background-color: #FEF9E7 !important; }
        `}</style>
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
          <div className="vocab-screen-container" data-theme={theme.name}>
            <Card className={isNoteTheme ? "bg-[#FFFDF5] border-[#E8D5A3] shadow-lg" : "bg-card"}>
              <CardContent className="p-8 space-y-6">
                <div className={`text-2xl font-bold text-center ${isNoteTheme ? 'text-[#5D4E37]' : ''}`}>Get ready for two quick tests</div>
                <div className="space-y-4">
                  <div className={`p-4 rounded-xl ${isNoteTheme ? 'bg-[#FEF9E7] border border-[#E8D5A3]' : 'bg-muted'}`}>
                    <p className={`font-semibold mb-2 ${isNoteTheme ? 'text-[#8B6914]' : ''}`}>Test 1: Reading Check</p>
                    <p className={`text-sm ${isNoteTheme ? 'text-[#5D4E37]' : 'text-muted-foreground'}`}>See the English word, then choose the correct meaning.</p>
                  </div>
                  <div className={`p-4 rounded-xl ${isNoteTheme ? 'bg-[#FEF9E7] border border-[#E8D5A3]' : 'bg-muted'}`}>
                    <p className={`font-semibold mb-2 ${isNoteTheme ? 'text-[#8B6914]' : ''}`}>Test 2: Listening Check</p>
                    <p className={`text-sm ${isNoteTheme ? 'text-[#5D4E37]' : 'text-muted-foreground'}`}>Listen to the audio pronunciation, then choose the correct meaning.</p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-4">
                  <Button
                    className={`w-full h-12 text-lg ${isNoteTheme ? 'bg-[#8B6914] hover:bg-[#5D4E37] text-white' : ''}`}
                    onClick={() => {
                      setShowTestIntro(false);
                      setShowFinalTest(true);
                      setTestStage(1);
                      setFinalTestIndex(0);
                      setFinalTestResults({});
                      setFinalTestFlipped(false);
                      // Randomize order for Test 1
                      setRows(prev => shuffleArray(prev));
                      setSecondTestPool(rows);
                    }}
                  >
                    Start Test 1
                  </Button>
                  <Button
                    variant="ghost"
                    className={`w-full ${isNoteTheme ? 'text-[#8B6914] hover:bg-[#FEF9E7]' : ''}`}
                    onClick={() => {
                      setShowTestIntro(false);
                      setIndex(0); // Return to first card
                    }}
                  >
                    Back to memorizing
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Intro modal between tests */}
        {showSecondTestIntro && (
          <div className="vocab-screen-container" data-theme={theme.name}>
            <Card className={isNoteTheme ? "bg-[#FFFDF5] border-[#E8D5A3] shadow-lg" : "bg-card"}>
              <CardContent className="p-8 space-y-6 text-center">
                <div className={`text-2xl font-bold ${isNoteTheme ? 'text-[#5D4E37]' : ''}`}>Next: Listening Check</div>
                <p className={`text-sm ${isNoteTheme ? 'text-[#5D4E37]' : 'text-muted-foreground'}`}>
                  Now you will only hear the audio. Choose the correct meaning.
                </p>
                <div className="pt-4">
                  <Button
                    className={`w-full h-12 text-lg ${isNoteTheme ? 'bg-[#8B6914] hover:bg-[#5D4E37] text-white' : ''}`}
                    onClick={() => {
                      setShowSecondTestIntro(false);
                      setTestStage(2);
                      setSecondTestIndex(0);
                      setSecondTestResults({});
                      setTest1AudioPlayed(false);
                      // Randomize order specifically for Test 2
                      setSecondTestPool(shuffleArray(rows));
                    }}
                  >
                    Start Test 2
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Test 1: READING Check - students see word and choose meaning */}
        {showFinalTest && finalTestCurrent && testStage === 1 ? (
          <div className="vocab-screen-container" data-theme={theme.name} onClick={handleFinalTestScreenClick}>
            {/* Progress indicator */}
            <div className="vocab-progress">
              <div className={`text-sm font-medium ${isNoteTheme ? 'text-[#5D4E37]' : 'text-white/80'}`}>
                {finalTestIndex + 1} / {total}
              </div>
            </div>

            <div className={`vocab-card-container ${pageTurnDirection ? `page-turn-${pageTurnDirection}` : ''}`}>
              <div
                className={`vocab-card-wrapper test1-mode`}
                style={cardGradientStyles}
              >
                <div className="vocab-card-inner">
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

                        <div className="vocab-quiz mt-4">
                          <div className="quiz-options">
                            {finalTestQuizOptions.map((option, idx) => {
                              const isThisCorrect = finalTestCurrent?.translations?.length
                                ? finalTestCurrent.translations.includes(option)
                                : option === finalTestCurrent?.translation;

                              let statusClass = "";
                              if (finalTestSelectedAnswer) {
                                if (isThisCorrect) statusClass = "correct";
                                else if (finalTestSelectedAnswer === option) statusClass = "incorrect";
                              }

                              return (
                                <button
                                  key={idx}
                                  className={`quiz-option ${statusClass}`}
                                  onClick={(e) => !finalTestSelectedAnswer && handleFinalTestAnswerSelect(e, option)}
                                  disabled={!!finalTestSelectedAnswer}
                                >
                                  {option}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            </div>

            {/* Test 1 Feedback - Bottom of screen */}
            {finalTestQuizResult && (
              <div className={`quiz-feedback-bottom ${finalTestQuizResult} ${isNoteTheme ? 'note-style' : ''}`}>
                {finalTestQuizResult === 'correct' ? '✓ Correct!' : `✗ Incorrect - The word was "${finalTestCurrent.term}"`}
              </div>
            )}

            {/* Exit/Continue button at bottom - only appears at the end */}
            {(finalTestIndex === total - 1 && finalTestSelectedAnswer) && (
              <div style={{ textAlign: 'center', marginTop: '20px' }}>
                <Button
                  className={`h-12 px-8 text-lg ${isNoteTheme ? "bg-[#8B6914] hover:bg-[#5D4E37] text-white shadow-md" : "bg-primary"}`}
                  onClick={() => {
                    setShowFinalTest(false);
                    setShowSecondTestIntro(true);
                  }}
                >
                  Continue to Test 2
                </Button>
              </div>
            )}
          </div>
        ) : testStage === 2 ? (
          // Test 2: LISTENING Check - audio only
          <div className="vocab-screen-container" data-theme={theme.name} onClick={handleSecondTestScreenClick}>
            <div className="vocab-progress">
              <div className={`text-sm font-medium ${isNoteTheme ? 'text-[#5D4E37]' : 'text-white/80'}`}>
                {Math.min(secondTestIndex + 1, (secondTestPool.length || total))} / {(secondTestPool.length || total)}
              </div>
            </div>
            <div className={`vocab-card-container ${pageTurnDirection ? `page-turn-${pageTurnDirection}` : ''}`}>
              <div className="vocab-card-wrapper test2-mode" style={test2GradientStyles}>
                <div className="vocab-card-inner">
                  <section className="vocab-card front">
                    <div className="vocab-inside">
                      <div className="vocab-shine" />
                      <div className="vocab-glare" />

                      <div className="vocab-image-content test2-image-content">
                        <div className="audio-test-center">
                          {(secondPoolCurrent || secondTestCurrent)?.audio_url ? (
                            <div className="relative group">
                              <button
                                className={`big-audio-btn ${isPlaying && playingCardId === (secondPoolCurrent || secondTestCurrent)?.id ? 'playing' : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const target = (secondPoolCurrent || secondTestCurrent);
                                  if (target?.audio_url) {
                                    toggleAudio(target.audio_url, target.id);
                                    setTest1AudioPlayed(true);
                                  }
                                }}
                              >
                                <Volume2 className={`w-16 h-16 ${isNoteTheme ? 'text-[#8B6914]' : ''}`} />
                              </button>
                            </div>
                          ) : (
                            <div className="text-white/50 text-sm italic">No audio available</div>
                          )}
                        </div>
                      </div>

                      <div className="vocab-content test2-content">
                        {/* Word reveal section - fixed height to prevent layout shift */}
                        <div className="test2-word-reveal">
                          {secondTestSelectedAnswer ? (
                            <>
                              <h3 className="vocab-term" style={{ fontSize: '32px' }}>{(secondPoolCurrent || secondTestCurrent)?.term}</h3>
                              <p className="vocab-pos" style={{ marginTop: '4px' }}>{(secondPoolCurrent || secondTestCurrent)?.pos || 'word'}</p>
                              <p className="vocab-translation-reveal" style={{ marginTop: '8px', fontSize: '18px' }}>
                                {(secondPoolCurrent || secondTestCurrent)?.translations?.length
                                  ? (secondPoolCurrent || secondTestCurrent).translations.join(', ')
                                  : (secondPoolCurrent || secondTestCurrent)?.translation}
                              </p>
                            </>
                          ) : null}
                        </div>

                        {/* Quiz options - always at fixed position at bottom */}
                        <div className="test2-quiz-fixed">
                          <div className="quiz-options">
                            {secondTestQuizOptions.map((option, idx) => {
                              const target = (secondPoolCurrent || secondTestCurrent);
                              const isThisCorrect = target?.translations?.length
                                ? target.translations.includes(option)
                                : option === target?.translation;

                              let statusClass = "";
                              if (secondTestSelectedAnswer) {
                                if (isThisCorrect) statusClass = "correct";
                                else if (secondTestSelectedAnswer === option) statusClass = "incorrect";
                              }

                              return (
                                <button
                                  key={idx}
                                  className={`quiz-option ${statusClass}`}
                                  onClick={(e) => !secondTestSelectedAnswer && handleSecondTestAnswerSelect(e, option)}
                                  disabled={!!secondTestSelectedAnswer}
                                >
                                  {option}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            </div>
            {showSecondResults && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#FEF9E7]">
                <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto space-y-8 animate-in fade-in zoom-in duration-300">
                  {/* Results Header */}
                  <div className="text-center space-y-4">
                    <h2 className="text-4xl font-bold text-[#5D4E37]">Test Complete!</h2>
                    <div className="flex flex-col items-center">
                      <div className="text-8xl font-black text-[#8B6914] mb-2">
                        {Object.values(secondTestResults).filter(r => r === true).length}
                        <span className="text-4xl text-[#A68B5B] font-medium ml-2">/ {rows.length}</span>
                      </div>
                      <Badge className="bg-[#799351] text-white px-4 py-1.5 text-lg rounded-full">
                        {Math.round((Object.values(secondTestResults).filter(r => r === true).length / rows.length) * 100) === 100
                          ? 'Perfectly Memorised! ✨'
                          : 'Well Done! 👍'}
                      </Badge>
                    </div>
                  </div>

                  {/* Words to Practice Table */}
                  {Object.values(secondTestResults).filter(r => r === false).length > 0 && (
                    <div className="bg-white/40 border border-[#E8D5A3] rounded-3xl p-6 shadow-sm backdrop-blur-sm">
                      <h3 className="text-xl font-bold text-[#5D4E37] mb-4 flex items-center gap-2">
                        <Feather className="w-5 h-5 text-[#8B6914]" />
                        Words to practice
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {rows.filter(r => !secondTestResults[r.id]).map(r => (
                          <div key={r.id} className="flex items-center justify-between p-4 bg-[#FEF9E7]/80 rounded-2xl border border-[#E8D5A3]/50">
                            <div>
                              <div className="font-bold text-[#5D4E37]">{r.term}</div>
                              <div className="text-sm text-[#8B6914]">{r.translation}</div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-[#8B6914] hover:bg-[#8B6914]/10 rounded-xl"
                              onClick={() => {
                                if (r.audio_url) {
                                  toggleAudio(r.audio_url, r.id);
                                }
                              }}
                            >
                              <Volume2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
                    <Button
                      className="h-14 px-10 text-xl font-bold bg-[#8B6914] text-white hover:bg-[#5D4E37] rounded-2xl shadow-lg transition-all hover:scale-105"
                      onClick={() => {
                        const wrong = rows.filter(r => !secondTestResults[r.id]);
                        if (wrong.length === 0) {
                          navigate('/vocabulary');
                          return;
                        }
                        setSecondTestPool(shuffleArray(wrong));
                        setSecondTestResults({});
                        setSecondTestIndex(0);
                        setSecondTestSelectedAnswer(null);
                        setShowSecondResults(false);
                      }}
                    >
                      {Object.values(secondTestResults).filter(r => r === false).length === 0
                        ? 'Finish Test'
                        : 'Retake Wrong Words'}
                    </Button>
                    <Button
                      variant="outline"
                      className="h-14 px-10 text-xl font-bold border-2 border-[#E8D5A3] text-[#5D4E37] hover:bg-[#FFFDF5] rounded-2xl transition-all"
                      onClick={() => navigate('/vocabulary')}
                    >
                      Back to Levels
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (current && !loading) ? (
          <div className="vocab-screen-container" data-theme={theme.name} onClick={handleScreenClick}>
            {/* Progress indicator on top */}
            <div className="vocab-progress">
              <div className="text-sm text-white/80 font-medium">
                {total ? `${index + 1} / ${total}` : '0 / 0'}
              </div>
            </div>

            <div className="vocab-main-layout">
              <div className="vocab-card-container">
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

                          {/* Action buttons - Play Audio, Record, Add to Word Book */}
                          <div className="vocab-action-buttons" onClick={(e) => e.stopPropagation()}>
                            <TooltipProvider>
                              {current.audio_url && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      className={`vocab-audio-btn ${isPlaying && playingCardId === current.id ? 'playing' : ''} ${isAudioLoading ? 'loading' : ''}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleAudio(current.audio_url!, current.id);
                                      }}
                                      disabled={isAudioLoading}
                                    >
                                      {isAudioLoading ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                      ) : isPlaying && playingCardId === current.id ? (
                                        <VolumeX className="w-5 h-5" />
                                      ) : (
                                        <Volume2 className="w-5 h-5" />
                                      )}
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{isAudioLoading ? 'Loading...' : 'Listen to pronunciation'}</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    className={`vocab-mic-btn ${isRecording ? 'recording' : ''} ${pronunciationEvaluating ? 'loading' : ''}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      togglePronunciationRecording();
                                    }}
                                    disabled={pronunciationEvaluating}
                                  >
                                    {pronunciationEvaluating ? (
                                      <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : isRecording ? (
                                      <MicOff className="w-5 h-5" />
                                    ) : (
                                      <Mic className="w-5 h-5" />
                                    )}
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{isRecording ? 'Stop recording' : 'Practice your pronunciation'}</p>
                                </TooltipContent>
                              </Tooltip>

                              {/* Add to Word Book button */}
                              {user && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      className={`vocab-add-btn ${addedToWordBook.has(current.id) ? 'added' : ''} ${addingToWordBook ? 'loading' : ''}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleAddToWordBook();
                                      }}
                                      disabled={addingToWordBook || addedToWordBook.has(current.id)}
                                    >
                                      {addingToWordBook ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                      ) : addedToWordBook.has(current.id) ? (
                                        <Check className="w-5 h-5" />
                                      ) : (
                                        <CirclePlus className="w-5 h-5" />
                                      )}
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{addedToWordBook.has(current.id) ? 'Already in Word Book' : 'Add to My Word Book'}</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </TooltipProvider>
                          </div>
                        </div>
                      </div>
                    </section>

                    {/* Back face - quiz */}
                    <section className="vocab-card back">
                      <div className="vocab-inside">
                        {/* Shine and glare effects */}
                        <div className="vocab-shine" />
                        <div className="vocab-glare" />

                        {/* Image section mirroring the front */}
                        <div className="vocab-image-content">
                          <div className="word-image-placeholder">
                            <div className="text-6xl font-bold text-white/80 select-none">
                              {current.term?.slice(0, 1)?.toUpperCase() || 'A'}
                            </div>
                          </div>
                        </div>

                        <div className="vocab-content">
                          <div className="vocab-details">
                            <div className="vocab-term-row">
                              <h3 className="vocab-term">{current.term}</h3>
                            </div>
                            <p className="vocab-pos" style={{ marginBottom: current.ipa ? '4px' : '12px' }}>{current.pos || 'word'}</p>
                            {current.ipa && (
                              <p className="vocab-ipa" style={{ marginBottom: '12px' }}>/{current.ipa}/</p>
                            )}
                          </div>

                          <div className="vocab-quiz" style={{ padding: '0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div className="quiz-options" style={{ marginBottom: '0' }}>
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
                                  style={{ height: '60px', padding: '8px' }}
                                  onClick={(e) => !selectedAnswer && handleAnswerSelect(e, option)}
                                  disabled={!!selectedAnswer}
                                >
                                  {option}
                                </button>
                              ))}
                            </div>

                            {/* Feedback badge removed per user request - status is shown by button color alone */}
                          </div>

                          {/* Placeholder to maintain same height as front action buttons */}
                          <div className="vocab-action-buttons" style={{ opacity: 0, pointerEvents: 'none' }}>
                            <Volume2 />
                          </div>
                        </div>
                      </div>
                    </section>
                  </div>
                </div>
              </div>

              {/* Integrated Workbook Area */}
              <div className={`vocab-workbook-area ${isNoteTheme ? 'note-theme' : ''}`} onClick={(e) => e.stopPropagation()}>

                {/* Pronunciation Feedback Display */}
                {currentPronunciationFeedback && (
                  <div className={`pronunciation-feedback-box ${currentPronunciationFeedback.isCorrect ? 'is-correct' : 'needs-work'}`}>
                    <span className="pronunciation-score">
                      {currentPronunciationFeedback.score || 0}%
                    </span>
                    <span className="pronunciation-label">
                      {currentPronunciationFeedback.isCorrect ? 'Great!' : 'Keep practicing'}
                    </span>

                    <div className="pronunciation-audio-buttons">
                      {current?.audio_url && (
                        <button
                          className="pronunciation-play-original-btn"
                          onClick={(e) => { e.stopPropagation(); toggleAudio(current.audio_url!, current.id); }}
                          title="Listen to correct pronunciation"
                        >
                          Original
                        </button>
                      )}
                      {currentRecordedAudio && (
                        <button
                          className="pronunciation-play-mine-btn"
                          onClick={(e) => { e.stopPropagation(); playStudentAudio(); }}
                          title="Listen to your recording"
                        >
                          My voice
                        </button>
                      )}
                    </div>

                    {/* Detailed feedback */}
                    {currentPronunciationFeedback.feedback && (
                      <p className="pronunciation-tip">{currentPronunciationFeedback.feedback}</p>
                    )}
                  </div>
                )}

                <div className="workbook-notes-wrapper">
                  <textarea
                    className="notes-textarea"
                    placeholder={placeholders.notes}
                    value={currentNotes}
                    onChange={(e) => current && handleNotesChange(current.id, e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="workbook-sentence-wrapper">
                  <div className="sentence-practice-split-layout">
                    <textarea
                      ref={sentenceTextareaRef}
                      className="sentence-practice-input"
                      placeholder={placeholders.sentence}
                      value={currentSentenceInput}
                      onChange={(e) => current && handleSentenceInputChange(current.id, e.target.value)}
                      onKeyDown={handleSentenceKeyDown}
                      rows={1}
                      disabled={sentenceEvaluating}
                    />
                    <div className="sentence-ai-sidebar">
                      <button
                        className={`sentence-ai-feedback-btn ${sentenceEvaluating ? 'loading' : ''} ${!currentSentenceInput.trim() ? 'hidden' : ''}`}
                        onClick={evaluateSentence}
                        disabled={sentenceEvaluating || !currentSentenceInput.trim()}
                        title="Get AI Feedback"
                      >
                        {sentenceEvaluating ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Sparkles className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Aesthetic AI Feedback */}
                  {currentSentenceFeedback && (
                    <div className={`sentence-feedback-box ${currentSentenceFeedback.isCorrect ? 'is-correct' : 'has-errors'}`}>
                      <div className="feedback-mini-header">
                        <span className="status-dot"></span>
                        <div className="feedback-summary">
                          <span className="feedback-status">
                            {currentSentenceFeedback.isCorrect ? 'Grammar: Perfect' : 'Grammar Advice'}
                          </span>
                          <p className="feedback-main-text">
                            {currentSentenceFeedback.isCorrect
                              ? (currentSentenceFeedback.encouragement || 'Perfect usage!')
                              : (currentSentenceFeedback.feedback || 'Review usage')}
                          </p>
                        </div>
                      </div>

                      {!currentSentenceFeedback.isCorrect && (
                        <div className="feedback-correction">
                          <p className="correction-text">
                            <span className="correction-label">Suggestion:</span> {currentSentenceFeedback.correctedSentence}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col justify-center items-center min-h-[60vh] space-y-4" style={isNoteTheme ? { backgroundColor: '#FEF9E7' } : {}}>
            <LottieLoadingAnimation />
            <p className="text-muted-foreground animate-pulse">Loading test...</p>
          </div>
        )}

        {/* Toast notification */}
        {showToast && (
          <div className="vocab-toast">
            {toastMessage}
          </div>
        )}
      </div>
    </StudentLayout >
  );
}
