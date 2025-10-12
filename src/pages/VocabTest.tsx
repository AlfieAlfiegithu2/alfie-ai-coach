import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import StudentLayout from "@/components/StudentLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import "./VocabTest.css";

type Row = {
  id: string;
  term: string;
  translation: string | null;
  pos: string | null;
  ipa: string | null;
  context_sentence: string | null;
  examples_json: string[] | null;
};

export default function VocabTest() {
  const { deckId } = useParams();
  const navigate = useNavigate();
  const [name, setName] = useState<string>("Deck Test");
  const [rows, setRows] = useState<Row[]>([]);
  const [index, setIndex] = useState(0);
  const [notes, setNotes] = useState<{[key: string]: string}>({});
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
  const [finalTestResults, setFinalTestResults] = useState<{[key: string]: boolean}>({});
  const [finalTestIndex, setFinalTestIndex] = useState(0);
  const [finalTestFlipped, setFinalTestFlipped] = useState(false);
  const [finalTestQuizOptions, setFinalTestQuizOptions] = useState<string[]>([]);
  const [finalTestSelectedAnswer, setFinalTestSelectedAnswer] = useState<string | null>(null);
  const [finalTestQuizResult, setFinalTestQuizResult] = useState<'correct' | 'incorrect' | null>(null);
  // Second test (word-only)
  const [secondTestIndex, setSecondTestIndex] = useState(0);
  const [secondTestSelectedAnswer, setSecondTestSelectedAnswer] = useState<string | null>(null);
  const [secondTestQuizOptions, setSecondTestQuizOptions] = useState<string[]>([]);
  const [secondTestResults, setSecondTestResults] = useState<{[key: string]: boolean}>({});
  const [secondTestPool, setSecondTestPool] = useState<Row[]>([]);
  const [showSecondResults, setShowSecondResults] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const total = rows.length;
  const current = rows[index] || null;
  const finalTestCurrent = showFinalTest ? rows[finalTestIndex] : null;
  const secondTestCurrent = testStage === 2 ? rows[secondTestIndex] : null;
  const secondPoolCurrent = testStage === 2 ? (secondTestPool[secondTestIndex] || null) : null;

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
          pos: r.pos,
          ipa: r.ipa,
          context_sentence: r.context_sentence,
          examples_json: r.examples_json
        }));
        console.log('VocabTest: Join fallback rows count:', rows.length);
      }
      console.log('VocabTest: Final rows count:', rows.length);
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
      setFinalTestResults({...finalTestResults, [finalTestCurrent.id]: isCorrect});
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
    try {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes?.user) return;

      const { error } = await supabase
        .from('vocab_reviews')
        .insert({
          user_id: userRes.user.id,
          card_id: cardId,
          rating: isCorrect ? 3 : 1, // 3 = correct, 1 = incorrect
          reviewed_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error saving SRS data:', error);
      }
    } catch (error) {
      console.error('Error saving SRS data:', error);
    }
  };

  // Reset flip state when card changes
  useEffect(() => {
    setIsFlipped(false);
    setQuizResult(null);
    setSelectedAnswer(null);
  }, [index]);


  return (
    <StudentLayout title={name}>
      <div className="space-y-4">
        {/* Custom back button in top left */}
        <Button 
          asChild 
          variant="secondary" 
          size="sm"
          className="vocab-back-button"
          onClick={(e) => e.stopPropagation()}
        >
          <Link to={`/vocabulary`}>← Back</Link>
        </Button>
        {/* Add button */}
        <Button 
          variant="outline"
          size="sm"
          className="vocab-add-button"
          onClick={async (e) => {
            e.stopPropagation();
            try {
              const { data: userRes } = await supabase.auth.getUser();
              const uid = userRes?.user?.id;
              if (!uid) {
                alert('Please log in to add words to your word book.');
                return;
              }
              
              // Check if words already exist in user's collection
              const existingTerms = rows.map(r => r.term);
              const { data: existingCards } = await (supabase as any)
                .from('vocab_cards')
                .select('term')
                .eq('user_id', uid)
                .in('term', existingTerms);
              
              const existingTermsSet = new Set(existingCards?.map(c => c.term) || []);
              const newWords = rows.filter(r => !existingTermsSet.has(r.term));
              
              if (newWords.length === 0) {
                showToastNotification('All words already in your word book!');
                return;
              }
              
              // Create personal deck if it doesn't exist
              let { data: personalDeck } = await (supabase as any)
                .from('vocab_decks')
                .select('id')
                .eq('user_id', uid)
                .eq('name', 'My Word Book')
                .maybeSingle();
              
              if (!personalDeck) {
                const { data: newDeck, error: createError } = await (supabase as any)
                  .from('vocab_decks')
                  .insert({
                    user_id: uid,
                    name: 'My Word Book',
                    is_public: false
                  })
                  .select('id')
                  .single();
                
                if (createError) {
                  console.error('Failed to create personal deck:', createError);
                  showToastNotification('Failed to create word book. Please try again.');
                  return;
                }
                personalDeck = newDeck;
              }
              
              // Insert only new words
              const items = newWords.map((r) => ({
                user_id: uid,
                deck_id: personalDeck.id,
                language: 'en',
                term: r.term,
                translation: r.translation,
                pos: r.pos,
                ipa: r.ipa,
                context_sentence: r.context_sentence,
                is_public: false
              }));
              
              const { error } = await (supabase as any)
                .from('vocab_cards')
                .insert(items);
              
              if (error) {
                console.error('Add to word book failed:', error);
                showToastNotification(`Failed to add words: ${error.message}`);
              } else {
                showToastNotification(`${newWords.length} words added to My Word Book!`);
              }
            } catch (err) {
              console.error('Add to word book failed', err);
              showToastNotification('Failed to add words. Please try again.');
            }
          }}
        >
          Add
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
          <div className="vocab-screen-container" onClick={handleFinalTestScreenClick}>
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
                style={{
                  ['--behind-gradient' as any]: 'radial-gradient(farthest-side circle at 50% 50%, hsla(220,15%,70%,0.1) 4%, hsla(220,10%,60%,0.05) 10%, hsla(220,5%,50%,0.02) 50%, hsla(220,0%,40%,0) 100%), radial-gradient(35% 52% at 55% 20%, hsla(210,20%,60%,0.1) 0%, hsla(210,15%,50%,0) 100%), radial-gradient(100% 100% at 50% 50%, hsla(200,25%,55%,0.05) 1%, hsla(200,20%,45%,0) 76%), conic-gradient(from 124deg at 50% 50%, hsla(215,20%,65%,0.1) 0%, hsla(215,15%,55%,0.08) 40%, hsla(215,15%,55%,0.08) 60%, hsla(215,20%,65%,0.1) 100%)',
                  ['--inner-gradient' as any]: 'linear-gradient(145deg, hsla(220,10%,15%,0.6) 0%, hsla(210,15%,20%,0.4) 100%)'
                } as React.CSSProperties}
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
                            {finalTestCurrent.term?.slice(0,1)?.toUpperCase() || 'A'}
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
                                className={`quiz-option ${
                                  finalTestSelectedAnswer === option 
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
            <div style={{textAlign: 'center', marginTop: '20px'}}>
              <Button variant="outline" onClick={() => {
                const correct = Object.values(finalTestResults).filter(r => r === true).length;
                if (testStage === 1) {
                  setShowFinalTest(false);
                  setShowSecondTestIntro(true);
                } else {
                  const message = `Test Results:\n${correct} out of ${total} correct (${Math.round(correct/total*100)}%)`;
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
          <div className="vocab-screen-container" onClick={handleSecondTestScreenClick}>
            <div className="vocab-progress">
              <div className="text-sm text-white/80 font-medium">Test 2: {Math.min(secondTestIndex + 1, (secondTestPool.length || total))} / {(secondTestPool.length || total)}</div>
              <div className="text-xs text-white/60 mt-1">Score: {Object.values(secondTestResults).filter(r => r === true).length} correct</div>
            </div>
            <div className={`vocab-card-container ${pageTurnDirection ? `page-turn-${pageTurnDirection}` : ''}`}>
              <div className="vocab-card-wrapper test2-mode" style={{
                ['--behind-gradient' as any]: 'radial-gradient(farthest-side circle at 50% 50%, hsla(220,15%,70%,0.1) 4%, hsla(220,10%,60%,0.05) 10%, hsla(220,5%,50%,0.02) 50%, hsla(220,0%,40%,0) 100%), radial-gradient(35% 52% at 55% 20%, hsla(210,20%,60%,0.1) 0%, hsla(210,15%,50%,0) 100%), radial-gradient(100% 100% at 50% 50%, hsla(200,25%,55%,0.05) 1%, hsla(200,20%,45%,0) 76%), conic-gradient(from 124deg at 50% 50%, hsla(215,20%,65%,0.1) 0%, hsla(215,15%,55%,0.08) 40%, hsla(215,15%,55%,0.08) 60%, hsla(215,20%,65%,0.1) 100%)',
                ['--inner-gradient' as any]: 'linear-gradient(145deg, hsla(220,10%,15%,0.6) 0%, hsla(210,15%,20%,0.4) 100%)'
              } as React.CSSProperties}>
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
          <div className="vocab-screen-container" onClick={handleScreenClick}>
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
                style={{
                  ['--behind-gradient' as any]: 'radial-gradient(farthest-side circle at 50% 50%, hsla(220,15%,70%,0.1) 4%, hsla(220,10%,60%,0.05) 10%, hsla(220,5%,50%,0.02) 50%, hsla(220,0%,40%,0) 100%), radial-gradient(35% 52% at 55% 20%, hsla(210,20%,60%,0.1) 0%, hsla(210,15%,50%,0) 100%), radial-gradient(100% 100% at 50% 50%, hsla(200,25%,55%,0.05) 1%, hsla(200,20%,45%,0) 76%), conic-gradient(from 124deg at 50% 50%, hsla(215,20%,65%,0.1) 0%, hsla(215,15%,55%,0.08) 40%, hsla(215,15%,55%,0.08) 60%, hsla(215,20%,65%,0.1) 100%)',
                  ['--inner-gradient' as any]: 'linear-gradient(145deg, hsla(220,10%,15%,0.6) 0%, hsla(210,15%,20%,0.4) 100%)'
                } as React.CSSProperties}
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
                            {current.term?.slice(0,1)?.toUpperCase() || 'A'}
                          </div>
                        </div>
                      </div>
                      
                      {/* Main content */}
                      <div className="vocab-content">
                        <div className="vocab-details">
                          <h3 className="vocab-term">{current.term}</h3>
                          <p className="vocab-pos">{current.pos || 'word'}</p>
                          {current.ipa && (
                            <p className="vocab-ipa">/{current.ipa}/</p>
                          )}
                        </div>
                        
                        {/* Translation */}
                        {current.translation && (
                          <div className="vocab-translation">
                            <div className="translation-text">{current.translation}</div>
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
                              className={`quiz-option ${
                                selectedAnswer === option 
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
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              Loading… {total === 0 ? 'No cards found for this deck.' : ''}
            </CardContent>
          </Card>
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


