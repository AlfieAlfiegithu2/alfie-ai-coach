import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
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
  const [name, setName] = useState<string>("Deck Test");
  const [rows, setRows] = useState<Row[]>([]);
  const [index, setIndex] = useState(0);
  const [notes, setNotes] = useState<{[key: string]: string}>({});
  const [saveStatus, setSaveStatus] = useState<string>("");
  const [isFlipped, setIsFlipped] = useState(false);
  const [quizOptions, setQuizOptions] = useState<string[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [quizResult, setQuizResult] = useState<'correct' | 'incorrect' | null>(null);
  const total = rows.length;
  const current = rows[index] || null;

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

  // Function to highlight the vocabulary word in the example sentence
  const highlightWordInSentence = (text: string, word: string) => {
    if (!text || !word) return text;
    
    // Create a regex that matches the word (case-insensitive) but preserves the original case
    const regex = new RegExp(`\\b(${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\b`, 'gi');
    
    return text.replace(regex, (match) => {
      return `<mark class="highlighted-word">${match}</mark>`;
    });
  };

  const next = () => setIndex((i) => Math.min(i + 1, Math.max(0, total - 1)));
  const prev = () => setIndex((i) => Math.max(i - 1, 0));

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

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't flip if clicking on navigation or notes
    if ((e.target as HTMLElement).closest('.vocab-navigation, .vocab-notes-section')) {
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
    
    // If clicking on the card itself, flip it
    if ((e.target as HTMLElement).closest('.vocab-card')) {
      setIsFlipped(!isFlipped);
    }
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
        
        {current ? (
          <div className="vocab-screen-container" onClick={handleCardClick}>
            {/* Progress indicator on top of card */}
            <div className="vocab-progress">
              <div className="text-sm text-white/80 font-medium">
                {total ? `${index + 1} / ${total}` : '0 / 0'}
              </div>
            </div>
            
            <div 
              className={`vocab-card-wrapper ${isFlipped ? 'flipped' : ''}`}
              style={{
                '--behind-gradient': 'radial-gradient(farthest-side circle at 50% 50%, hsla(220,15%,70%,0.1) 4%, hsla(220,10%,60%,0.05) 10%, hsla(220,5%,50%,0.02) 50%, hsla(220,0%,40%,0) 100%), radial-gradient(35% 52% at 55% 20%, hsla(210,20%,60%,0.1) 0%, hsla(210,15%,50%,0) 100%), radial-gradient(100% 100% at 50% 50%, hsla(200,25%,55%,0.05) 1%, hsla(200,20%,45%,0) 76%), conic-gradient(from 124deg at 50% 50%, hsla(215,20%,65%,0.1) 0%, hsla(215,15%,55%,0.08) 40%, hsla(215,15%,55%,0.08) 60%, hsla(215,20%,65%,0.1) 100%)',
                '--inner-gradient': 'linear-gradient(145deg, hsla(220,10%,15%,0.6) 0%, hsla(210,15%,20%,0.4) 100%)'
              }}
            >
              <section className="vocab-card">
                <div className="vocab-inside">
                  {/* Shine and glare effects */}
                  <div className="vocab-shine" />
                  <div className="vocab-glare" />
                  
                  {!isFlipped ? (
                    // Front of card - word information
                    <>
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
                    </>
                  ) : (
                    // Back of card - quiz
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
                      
                      {quizResult && (
                        <div className={`quiz-feedback ${quizResult}`}>
                          {quizResult === 'correct' ? '✓ Correct!' : '✗ Incorrect'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </section>
              
              {/* Navigation buttons outside the card */}
              <div className="vocab-navigation" onClick={(e) => e.stopPropagation()}>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={prev} 
                  disabled={index === 0}
                  className="nav-btn"
                >
                  Previous
                </Button>
                <div className="nav-center">
                  <Button 
                    onClick={next} 
                    disabled={index + 1 >= total}
                    size="sm"
                    className="nav-btn nav-btn-primary"
                  >
                    Next
                  </Button>
                </div>
              </div>

              {/* Notes section */}
              <div className="vocab-notes-section" onClick={(e) => e.stopPropagation()}>
                <div className="notes-label">Personal Notes</div>
                <textarea
                  className="notes-textarea"
                  placeholder="Write your own notes, mnemonics, or examples for this word..."
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
      </div>
    </StudentLayout>
  );
}


