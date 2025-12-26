import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Clock,
  SkipForward,
  Send,
  CheckCircle,
  XCircle,
  Play,
  Pause,
  Volume2,
  Headphones,
  FileText,
  Type,
  Highlighter
} from 'lucide-react';
import StudentLayout from '@/components/StudentLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import LoadingAnimation from '@/components/animations/LoadingAnimation';
import { useThemeStyles } from '@/hooks/useThemeStyles';

// Listening question type configurations
const LISTENING_TYPES = [
  { id: 'summarize_spoken_text', name: 'Summarize Spoken Text', icon: FileText, isWriting: true },
  { id: 'listening_mcq_multiple', name: 'MCQ Multiple', icon: CheckCircle, isMultiple: true },
  { id: 'fill_blanks_type_in', name: 'Fill in Blanks', icon: Type, isTypeIn: true },
  { id: 'highlight_correct_summary', name: 'Highlight Summary', icon: Highlighter, isSingle: true },
  { id: 'listening_mcq_single', name: 'MCQ Single', icon: CheckCircle, isSingle: true },
  { id: 'select_missing_word', name: 'Missing Word', icon: Volume2, isSingle: true },
  { id: 'highlight_incorrect_words', name: 'Highlight Incorrect', icon: Highlighter, isHighlight: true },
  { id: 'write_from_dictation', name: 'Write Dictation', icon: Type, isDictation: true }
];

interface ListeningTest {
  id: string;
  test_name: string;
  audio_url: string | null;
  transcript: string | null;
}

interface ListeningItem {
  id: string;
  pte_section_type: string;
  question_number: number;
  prompt_text: string | null;
  passage_text: string | null;
  options: string[] | null;
  correct_answer: string | null;
  highlight_words: string[] | null;
  audio_start_time: number | null;
  audio_end_time: number | null;
  explanation: string | null;
}

const PTEListeningTest = () => {
  const navigate = useNavigate();
  const { testId } = useParams<{ testId: string }>();
  const { user } = useAuth();
  const audioRef = useRef<HTMLAudioElement>(null);

  const themeStyles = useThemeStyles();
  const isNoteTheme = themeStyles.theme.name === 'note';

  const [test, setTest] = useState<ListeningTest | null>(null);
  const [items, setItems] = useState<ListeningItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeType, setActiveType] = useState('summarize_spoken_text');
  const [currentTypeIndex, setCurrentTypeIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hasPlayed, setHasPlayed] = useState(false);

  // Timer
  const [timeLeft, setTimeLeft] = useState(600);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Answers
  const [writtenAnswer, setWrittenAnswer] = useState('');
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [singleAnswer, setSingleAnswer] = useState('');
  const [typeInAnswers, setTypeInAnswers] = useState<Record<number, string>>({});
  const [highlightedWords, setHighlightedWords] = useState<string[]>([]);
  const [dictationAnswer, setDictationAnswer] = useState('');

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [completedTypes, setCompletedTypes] = useState<string[]>([]);

  const currentItems = items.filter(i => i.pte_section_type === activeType);
  const currentItem = currentItems[currentTypeIndex];
  const typeConfig = LISTENING_TYPES.find(t => t.id === activeType);

  useEffect(() => {
    if (testId) {
      loadTest();
      loadItems();
    }
  }, [testId]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      setHasPlayed(true);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [test?.audio_url]);

  useEffect(() => {
    // Reset answers when changing questions
    resetAnswers();
    setShowFeedback(false);
    setHasPlayed(false);
    if (typeConfig?.isWriting) {
      setTimeLeft(600); // 10 min for summary
    } else if (typeConfig?.isDictation) {
      setTimeLeft(30); // 30 sec for dictation
    } else {
      setTimeLeft(60); // 1 min for other types
    }
  }, [activeType, currentTypeIndex]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timeLeft]);

  const loadTest = async () => {
    if (!testId) return;

    try {
      const { data, error } = await supabase
        .from('pte_listening_tests')
        .select('*')
        .eq('id', testId)
        .single();

      if (error) throw error;
      setTest(data);
    } catch (error) {
      console.error('Error loading test:', error);
      toast.error('Failed to load test');
    }
  };

  const loadItems = async () => {
    if (!testId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('pte_listening_items')
        .select('*')
        .eq('listening_test_id', testId)
        .order('question_number', { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        toast.error('No questions in this test');
        navigate('/pte-portal');
        return;
      }

      setItems(data as unknown as ListeningItem[]);

      // Set initial active type to first type that has items
      const firstType = LISTENING_TYPES.find(t => data.some(i => i.pte_section_type === t.id));
      if (firstType) {
        setActiveType(firstType.id);
      }
    } catch (error) {
      console.error('Error loading items:', error);
      toast.error('Failed to load questions');
    } finally {
      setIsLoading(false);
    }
  };

  const resetAnswers = () => {
    setWrittenAnswer('');
    setSelectedAnswers([]);
    setSingleAnswer('');
    setTypeInAnswers({});
    setHighlightedWords([]);
    setDictationAnswer('');
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        // If we have segment times, seek to start
        if (currentItem?.audio_start_time && audioRef.current) {
          audioRef.current.currentTime = currentItem.audio_start_time;
        }
        audioRef.current.play();
        if (!isTimerRunning) {
          setIsTimerRunning(true);
        }
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleMultipleToggle = (option: string) => {
    setSelectedAnswers(prev => {
      if (prev.includes(option)) {
        return prev.filter(a => a !== option);
      }
      return [...prev, option];
    });
  };

  const handleWordClick = (word: string) => {
    setHighlightedWords(prev => {
      if (prev.includes(word)) {
        return prev.filter(w => w !== word);
      }
      return [...prev, word];
    });
  };

  const checkAnswer = (): boolean => {
    if (!currentItem?.correct_answer) return false;

    const correct = currentItem.correct_answer.toLowerCase().split(',').map(a => a.trim());

    if (typeConfig?.isWriting) {
      // For writing, just mark as submitted (manual grading needed)
      return writtenAnswer.split(/\s+/).filter(w => w).length >= 50;
    }

    if (typeConfig?.isDictation) {
      const typed = dictationAnswer.toLowerCase().trim();
      const expected = currentItem.correct_answer.toLowerCase().trim();
      return typed === expected;
    }

    if (typeConfig?.isSingle) {
      return correct.includes(singleAnswer.toLowerCase());
    }

    if (typeConfig?.isMultiple) {
      const selected = selectedAnswers.map(a => a.toLowerCase()).sort();
      return JSON.stringify(selected) === JSON.stringify(correct.sort());
    }

    if (typeConfig?.isTypeIn) {
      const answers = Object.values(typeInAnswers).map(a => a.toLowerCase().trim());
      return JSON.stringify(answers) === JSON.stringify(correct);
    }

    if (typeConfig?.isHighlight) {
      const highlighted = highlightedWords.map(w => w.toLowerCase()).sort();
      return JSON.stringify(highlighted) === JSON.stringify(correct.sort());
    }

    return false;
  };

  const submitResponse = async () => {
    if (!user || !currentItem) return;

    setIsSubmitting(true);
    try {
      const correct = checkAnswer();
      setIsCorrect(correct);

      // Build response text
      let responseText = '';
      if (typeConfig?.isWriting) responseText = writtenAnswer;
      else if (typeConfig?.isDictation) responseText = dictationAnswer;
      else if (typeConfig?.isSingle) responseText = singleAnswer;
      else if (typeConfig?.isMultiple) responseText = selectedAnswers.join(', ');
      else if (typeConfig?.isTypeIn) responseText = Object.values(typeInAnswers).join(', ');
      else if (typeConfig?.isHighlight) responseText = highlightedWords.join(', ');

      // Save progress
      const { error: progressError } = await supabase
        .from('pte_user_progress')
        .insert({
          user_id: user.id,
          pte_skill: 'listening',
          pte_section_type: activeType,
          listening_test_id: testId,
          completed: true,
          score: correct ? 100 : 0,
          response_text: responseText
        });

      if (progressError) throw progressError;

      setIsTimerRunning(false);
      setShowFeedback(true);
      toast.success(correct ? 'Correct!' : 'Submitted');
    } catch (error) {
      console.error('Error submitting:', error);
      toast.error('Failed to submit');
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextQuestion = () => {
    if (currentTypeIndex < currentItems.length - 1) {
      setCurrentTypeIndex(prev => prev + 1);
    } else {
      // Mark this type as completed
      setCompletedTypes(prev => [...prev, activeType]);

      // Find next type with items
      const currentTypeIdx = LISTENING_TYPES.findIndex(t => t.id === activeType);
      const nextType = LISTENING_TYPES.slice(currentTypeIdx + 1).find(t =>
        items.some(i => i.pte_section_type === t.id) && !completedTypes.includes(t.id)
      );

      if (nextType) {
        setActiveType(nextType.id);
        setCurrentTypeIndex(0);
      } else {
        toast.success('You have completed all questions!');
        navigate('/pte-portal');
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Parse passage with blanks for type-in
  const renderPassageWithBlanks = () => {
    if (!currentItem?.passage_text) return null;

    const parts = currentItem.passage_text.split(/\[BLANK\]/g);

    return (
      <div className="prose dark:prose-invert max-w-none">
        {parts.map((part, index) => (
          <span key={index}>
            {part}
            {index < parts.length - 1 && (
              <Input
                value={typeInAnswers[index] || ''}
                onChange={(e) => setTypeInAnswers(prev => ({ ...prev, [index]: e.target.value }))}
                className="w-32 inline-block mx-1"
                placeholder={`(${index + 1})`}
              />
            )}
          </span>
        ))}
      </div>
    );
  };

  // Render transcript with clickable words for highlight incorrect
  const renderHighlightableText = () => {
    if (!currentItem?.passage_text) return null;

    const words = currentItem.passage_text.split(/\s+/);

    return (
      <div className="leading-relaxed text-lg">
        {words.map((word, index) => (
          <span
            key={index}
            className={`cursor-pointer px-0.5 rounded transition-colors ${highlightedWords.includes(word)
              ? 'bg-yellow-300 dark:bg-yellow-600'
              : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            onClick={() => handleWordClick(word)}
          >
            {word}{' '}
          </span>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingAnimation />
      </div>
    );
  }

  if (!test) {
    return (
      <StudentLayout title="PTE Listening" showBackButton>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Test not found</p>
          <Button onClick={() => navigate('/pte-portal')} className="mt-4">
            Back to PTE Portal
          </Button>
        </div>
      </StudentLayout>
    );
  }

  const wordCount = (typeConfig?.isWriting ? writtenAnswer : dictationAnswer).trim().split(/\s+/).filter(w => w).length;

  return (
    <div
      className={`min-h-screen relative ${isNoteTheme ? 'font-serif' : ''}`}
      style={isNoteTheme ? { backgroundColor: themeStyles.theme.colors.background } : {}}
    >
      {/* Background Texture for Note Theme - ENHANCED NOTEBOOK EFFECT */}
      {isNoteTheme && (
        <>
          <div
            className="absolute inset-0 pointer-events-none opacity-50 z-0"
            style={{
              backgroundColor: '#FEF9E7',
              backgroundImage: `url("https://www.transparenttextures.com/patterns/cream-paper.png")`,
              mixBlendMode: 'multiply'
            }}
          />
          <div
            className="absolute inset-0 pointer-events-none opacity-30 z-0"
            style={{
              backgroundImage: `url("https://www.transparenttextures.com/patterns/notebook.png")`,
              mixBlendMode: 'multiply',
              filter: 'contrast(1.2)'
            }}
          />
        </>
      )}

      <StudentLayout title={test.test_name} showBackButton transparentBackground={true}>
        {test.audio_url && <audio ref={audioRef} src={test.audio_url} className="hidden" />}

        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="text-green-600 border-green-600">
                <Headphones className="w-3 h-3 mr-1" />
                Listening
              </Badge>
              <Badge variant="secondary">
                {completedTypes.length}/{LISTENING_TYPES.filter(t => items.some(i => i.pte_section_type === t.id)).length} sections
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className={`font-mono text-lg ${timeLeft < 30 ? 'text-red-500' : ''}`}>
                {formatTime(timeLeft)}
              </span>
            </div>
          </div>

          {/* Audio Player */}
          {test.audio_url && (
            <Card className="bg-green-50 dark:bg-green-950/20 border-green-200">
              <CardContent className="pt-4">
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={togglePlay}
                    className="w-12 h-12"
                  >
                    {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                  </Button>
                  <div className="flex-1 space-y-1">
                    <Progress value={(currentTime / duration) * 100} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Question Type Tabs */}
          <Tabs value={activeType} onValueChange={(v) => { setActiveType(v); setCurrentTypeIndex(0); }}>
            <TabsList className="flex flex-wrap h-auto gap-1 bg-transparent">
              {LISTENING_TYPES.filter(t => items.some(i => i.pte_section_type === t.id)).map((type) => {
                const Icon = type.icon;
                const typeItems = items.filter(i => i.pte_section_type === type.id);
                const isCompleted = completedTypes.includes(type.id);

                return (
                  <TabsTrigger
                    key={type.id}
                    value={type.id}
                    className={`flex items-center gap-1 text-xs border ${isCompleted ? 'border-green-300 bg-green-50' : 'border-gray-200'
                      }`}
                    disabled={isCompleted}
                  >
                    <Icon className="w-3 h-3" />
                    <span className="hidden md:inline">{type.name}</span>
                    <Badge variant="secondary" className="text-xs ml-1">
                      {typeItems.length}
                    </Badge>
                    {isCompleted && <CheckCircle className="w-3 h-3 text-green-500" />}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {LISTENING_TYPES.map((type) => {
              const typeItems = items.filter(i => i.pte_section_type === type.id);

              return (
                <TabsContent key={type.id} value={type.id} className="space-y-4 mt-4">
                  {typeItems.length > 0 && currentItem && (
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="flex items-center gap-2">
                            <type.icon className="w-5 h-5" />
                            {type.name}
                          </CardTitle>
                          <Badge variant="outline">
                            {currentTypeIndex + 1} / {typeItems.length}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {/* Question Prompt */}
                        {currentItem.prompt_text && (
                          <div className="text-lg">{currentItem.prompt_text}</div>
                        )}

                        {/* Writing Response (Summarize Spoken Text) */}
                        {typeConfig?.isWriting && !showFeedback && (
                          <div className="space-y-4">
                            <Textarea
                              value={writtenAnswer}
                              onChange={(e) => setWrittenAnswer(e.target.value)}
                              placeholder="Write your summary here (50-70 words)..."
                              rows={8}
                              disabled={!hasPlayed}
                            />
                            <p className={`text-sm ${wordCount < 50 ? 'text-yellow-500' : wordCount > 70 ? 'text-red-500' : 'text-green-500'}`}>
                              Words: {wordCount} / 50-70
                            </p>
                          </div>
                        )}

                        {/* Dictation */}
                        {typeConfig?.isDictation && !showFeedback && (
                          <div className="space-y-4">
                            <Input
                              value={dictationAnswer}
                              onChange={(e) => setDictationAnswer(e.target.value)}
                              placeholder="Type exactly what you hear..."
                              disabled={!hasPlayed}
                              className="text-lg"
                            />
                          </div>
                        )}

                        {/* Single Answer MCQ */}
                        {typeConfig?.isSingle && currentItem.options && !showFeedback && (
                          <RadioGroup value={singleAnswer} onValueChange={setSingleAnswer}>
                            <div className="space-y-3">
                              {currentItem.options.map((option, index) => (
                                <div key={index} className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-gray-50">
                                  <RadioGroupItem value={String.fromCharCode(65 + index)} id={`opt-${index}`} />
                                  <Label htmlFor={`opt-${index}`} className="flex-1 cursor-pointer">
                                    <span className="font-medium mr-2">{String.fromCharCode(65 + index)}.</span>
                                    {option}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </RadioGroup>
                        )}

                        {/* Multiple Answer MCQ */}
                        {typeConfig?.isMultiple && currentItem.options && !showFeedback && (
                          <div className="space-y-3">
                            {currentItem.options.map((option, index) => {
                              const letter = String.fromCharCode(65 + index);
                              return (
                                <div
                                  key={index}
                                  className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer ${selectedAnswers.includes(letter) ? 'bg-green-50 border-green-300' : 'hover:bg-gray-50'
                                    }`}
                                  onClick={() => handleMultipleToggle(letter)}
                                >
                                  <Checkbox checked={selectedAnswers.includes(letter)} />
                                  <Label className="flex-1 cursor-pointer">
                                    <span className="font-medium mr-2">{letter}.</span>
                                    {option}
                                  </Label>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Fill in Blanks (Type In) */}
                        {typeConfig?.isTypeIn && currentItem.passage_text && !showFeedback && (
                          <Card className="bg-gray-50">
                            <CardContent className="pt-4">
                              {renderPassageWithBlanks()}
                            </CardContent>
                          </Card>
                        )}

                        {/* Highlight Incorrect Words */}
                        {typeConfig?.isHighlight && currentItem.passage_text && !showFeedback && (
                          <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">Click on words that differ from what you hear:</p>
                            <Card className="bg-gray-50">
                              <CardContent className="pt-4">
                                {renderHighlightableText()}
                              </CardContent>
                            </Card>
                          </div>
                        )}

                        {/* Submit Button */}
                        {!showFeedback && (
                          <div className="flex justify-end">
                            <Button
                              onClick={submitResponse}
                              disabled={isSubmitting || (!hasPlayed && !typeConfig?.isHighlight)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Send className="w-4 h-4 mr-2" />
                              {isSubmitting ? 'Submitting...' : 'Submit'}
                            </Button>
                          </div>
                        )}

                        {/* Feedback */}
                        {showFeedback && (
                          <div className="space-y-4">
                            <Card className={`${isCorrect ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                              <CardHeader>
                                <CardTitle className={`flex items-center gap-2 ${isCorrect ? 'text-green-700' : 'text-amber-700'}`}>
                                  {isCorrect ? (
                                    <><CheckCircle className="w-5 h-5" /> Correct!</>
                                  ) : (
                                    <><CheckCircle className="w-5 h-5" /> Submitted</>
                                  )}
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-2">
                                {currentItem.correct_answer && (
                                  <p>
                                    <span className="font-medium">Correct answer: </span>
                                    {currentItem.correct_answer}
                                  </p>
                                )}
                                {currentItem.explanation && (
                                  <p className="text-sm text-muted-foreground">
                                    {currentItem.explanation}
                                  </p>
                                )}
                              </CardContent>
                            </Card>

                            <div className="flex justify-end">
                              <Button onClick={nextQuestion} className="bg-green-600 hover:bg-green-700">
                                <SkipForward className="w-4 h-4 mr-2" />
                                Next Question
                              </Button>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              );
            })}
          </Tabs>
        </div>
      </StudentLayout>
    </div>
  );
};

export default PTEListeningTest;

