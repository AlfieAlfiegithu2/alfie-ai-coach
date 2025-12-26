import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronLeft, ChevronRight, CheckCircle, AlertCircle, Send, FileText, Eye, EyeOff, Grid } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useThemeStyles } from "@/hooks/useThemeStyles";

interface Question {
  id: string;
  question_number: number;
  question_text: string;
  question_type: string;
  options: string[] | null;
  correct_answer: string;
  toeic_part: number;
  passage_context?: string;
  ai_explanation?: string;
}

interface Passage {
  id: string;
  title?: string;
  content: string;
  type: string;
  questionStart: number;
  questionEnd: number;
}

interface GroupedPart {
  partNumber: number;
  questions: Question[];
  passages: Passage[];
}

const TOEICReadingTest = () => {
  const navigate = useNavigate();
  const { testId } = useParams<{ testId: string }>();
  const themeStyles = useThemeStyles();
  const isNoteTheme = themeStyles.theme.name === 'note';

  const [loading, setLoading] = useState(true);
  const [testName, setTestName] = useState("");
  const [groupedParts, setGroupedParts] = useState<GroupedPart[]>([]);
  const [currentPartIndex, setCurrentPartIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [key: number]: string }>({});
  const [revealedAnswers, setRevealedAnswers] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState(75 * 60); // 75 minutes
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (testId) {
      loadTest();
    }
  }, [testId]);

  useEffect(() => {
    if (!isSubmitted && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0 && !isSubmitted) {
      handleSubmit();
    }
  }, [timeLeft, isSubmitted]);

  const loadTest = async () => {
    if (!testId) return;

    try {
      // Load test info
      const { data: test, error: testError } = await supabase
        .from('tests')
        .select('*')
        .eq('id', testId)
        .single();

      if (testError) throw testError;
      setTestName(test.test_name);

      // Load questions
      const { data: questions, error: questionsError } = await supabase
        .from('questions' as any)
        .select('*')
        .eq('test_id', testId)
        .order('toeic_part', { ascending: true })
        .order('question_number_in_part', { ascending: true });

      if (questionsError) throw questionsError;

      // Load passages
      const { data: passages, error: passagesError } = await supabase
        .from('toeic_passages' as any)
        .select('*')
        .eq('test_id', testId)
        .order('question_range_start', { ascending: true });

      if (passagesError) throw passagesError;

      // Group by part
      const grouped: { [key: number]: { questions: Question[], passages: Passage[] } } = {
        5: { questions: [], passages: [] },
        6: { questions: [], passages: [] },
        7: { questions: [], passages: [] }
      };

      questions?.forEach((q: any) => {
        const part = q.toeic_part || 5;
        if (grouped[part]) {
          grouped[part].questions.push({
            id: q.id,
            question_number: q.question_number_in_part,
            question_text: q.question_text,
            question_type: q.question_type,
            options: q.choices ? JSON.parse(q.choices) : null,
            correct_answer: q.correct_answer,
            toeic_part: part,
            passage_context: q.passage_context,
            ai_explanation: q.ai_explanation
          });
        }
      });

      passages?.forEach((p: any) => {
        const part = p.part_number;
        if (grouped[part]) {
          grouped[part].passages.push({
            id: p.id,
            title: p.passage_title,
            content: p.passage_content,
            type: p.passage_type,
            questionStart: p.question_range_start,
            questionEnd: p.question_range_end
          });
        }
      });

      const parts: GroupedPart[] = Object.entries(grouped)
        .filter(([_, data]) => data.questions.length > 0)
        .map(([partNum, data]) => ({
          partNumber: parseInt(partNum),
          questions: data.questions,
          passages: data.passages
        }))
        .sort((a, b) => a.partNumber - b.partNumber);

      setGroupedParts(parts);
    } catch (error) {
      console.error('Error loading test:', error);
      toast.error('Failed to load test');
    } finally {
      setLoading(false);
    }
  };

  const currentPart = groupedParts[currentPartIndex];
  const currentQuestion = currentPart?.questions[currentQuestionIndex];
  const totalQuestions = groupedParts.reduce((sum, p) => sum + p.questions.length, 0);

  // Find relevant passage for current question
  const currentPassage = currentPart?.passages.find(
    p => currentQuestion &&
      currentQuestion.question_number >= p.questionStart &&
      currentQuestion.question_number <= p.questionEnd
  );

  const handleAnswer = (questionNumber: number, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionNumber]: answer }));
  };

  const handleReveal = (questionNumber: number) => {
    if (revealedAnswers.includes(questionNumber)) {
      setRevealedAnswers(prev => prev.filter(q => q !== questionNumber));
    } else {
      setRevealedAnswers(prev => [...prev, questionNumber]);
    }
  };

  const goToNext = () => {
    if (currentQuestionIndex < currentPart.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else if (currentPartIndex < groupedParts.length - 1) {
      setCurrentPartIndex(prev => prev + 1);
      setCurrentQuestionIndex(0);
    }
  };

  const goToPrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    } else if (currentPartIndex > 0) {
      setCurrentPartIndex(prev => prev - 1);
      setCurrentQuestionIndex(groupedParts[currentPartIndex - 1].questions.length - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitted(true);
    setShowResults(true);

    // Calculate score
    let correct = 0;
    groupedParts.forEach(part => {
      part.questions.forEach(q => {
        if (answers[q.question_number] === q.correct_answer) {
          correct++;
        }
      });
    });

    toast.success(`Test submitted! Score: ${correct}/${totalQuestions}`);

    navigate('/toeic/reading/result', {
      state: {
        score: correct,
        totalQuestions,
        answers,
        groupedParts,
        testName
      }
    });
  };

  const isLastQuestion = currentPart && currentPartIndex === groupedParts.length - 1 && currentQuestionIndex === currentPart.questions.length - 1;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="mt-2 text-muted-foreground">Loading test...</p>
        </div>
      </div>
    );
  }

  if (groupedParts.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="container mx-auto px-4 py-8 text-center max-w-2xl">
          <AlertCircle className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">No Questions Found</h2>
          <p className="text-muted-foreground mb-4">This test doesn't have any questions yet.</p>
          <Button onClick={() => navigate('/toeic')}>Back to TOEIC Portal</Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-center py-8 relative ${isNoteTheme ? 'font-serif' : 'bg-gradient-to-br from-green-50 via-white to-emerald-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950'}`}
      style={isNoteTheme ? { backgroundColor: themeStyles.theme.colors.background } : {}}
    >
      {/* Background Texture for Note Theme - ENHANCED NOTEBOOK EFFECT */}
      {isNoteTheme && (
        <>
          <div
            className="absolute inset-0 pointer-events-none opacity-50 z-0"
            style={{
              backgroundColor: '#FFFAF0',
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

      <div className="container px-4 max-w-6xl w-full relative z-10">
        <div className="grid md:grid-cols-2 gap-4">
          {/* Passage Panel (for Part 6 & 7) */}
          {(currentPart?.partNumber === 6 || currentPart?.partNumber === 7) && (currentPassage || currentQuestion?.passage_context) && (
            <Card className={`md:h-[600px] ${isNoteTheme ? 'bg-[#FFFAF0] border-[#E8D5A3]' : ''}`}>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2" style={{ color: isNoteTheme ? '#5D4E37' : undefined }}>
                  <FileText className={`w-4 h-4 ${isNoteTheme ? 'text-[#8B6914]' : ''}`} />
                  {currentPassage?.title || 'Reading Passage'}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[520px] px-4">
                  <div className="prose prose-sm dark:prose-invert max-w-none pb-4">
                    <div className="whitespace-pre-wrap text-sm leading-relaxed" style={{ color: isNoteTheme ? '#5D4E37' : undefined }}>
                      {currentPassage?.content || currentQuestion?.passage_context}
                    </div>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Question Panel */}
          <Card className={`${(currentPart?.partNumber === 6 || currentPart?.partNumber === 7) && (currentPassage || currentQuestion?.passage_context) ? '' : 'md:col-span-2'} ${isNoteTheme ? 'bg-[#FFFAF0] border-[#E8D5A3]' : ''}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg" style={{ color: isNoteTheme ? '#5D4E37' : undefined }}>
                Question {currentQuestion?.question_number}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {currentQuestion && (
                <>
                  {/* Question text - for Part 5, this includes the sentence with blank */}
                  <p className="mb-4 text-lg leading-relaxed" style={{ color: isNoteTheme ? '#5D4E37' : undefined }}>
                    {currentQuestion.question_text}
                  </p>

                  {currentQuestion.options && (
                    <RadioGroup
                      value={answers[currentQuestion.question_number] || ''}
                      onValueChange={(value) => handleAnswer(currentQuestion.question_number, value)}
                    >
                      <div className="space-y-3">
                        {currentQuestion.options.map((option, index) => {
                          const letter = String.fromCharCode(65 + index);
                          const isSelected = answers[currentQuestion.question_number] === letter;
                          const isRevealed = revealedAnswers.includes(currentQuestion.question_number);
                          const isCorrect = (showResults || isRevealed) && letter === currentQuestion.correct_answer;
                          const isWrong = (showResults || isRevealed) && isSelected && letter !== currentQuestion.correct_answer;

                          return (
                            <Label
                              key={index}
                              className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all ${isCorrect
                                ? 'bg-green-50 border-green-300 dark:bg-green-950/20'
                                : isWrong
                                  ? 'bg-red-50 border-red-300 dark:bg-red-950/20'
                                  : isSelected
                                    ? isNoteTheme
                                      ? 'bg-[#E8D5A3]/30 border-[#A68B5B]'
                                      : 'bg-green-50 border-green-300 dark:bg-green-950/20'
                                    : isNoteTheme
                                      ? 'bg-white/50 border-[#E8D5A3] hover:border-[#A68B5B]/50'
                                      : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                                }`}
                            >
                              <RadioGroupItem value={letter} disabled={isSubmitted} className="sr-only" />
                              <span className={`font-medium mr-2 ${isNoteTheme ? 'text-[#5D4E37]' : ''}`}>({letter})</span>
                              <span className={`flex-1 ${isNoteTheme ? 'text-[#5D4E37]' : ''}`}>{option}</span>
                              {(showResults || isRevealed) && isCorrect && <CheckCircle className="w-5 h-5 text-green-500" />}
                              {(showResults || isRevealed) && isWrong && <AlertCircle className="w-5 h-5 text-red-500" />}
                            </Label>
                          );
                        })}
                      </div>
                    </RadioGroup>
                  )}

                  {/* AI Explanation (shown after submission) */}
                  {(showResults || revealedAnswers.includes(currentQuestion.question_number)) && currentQuestion.ai_explanation && (
                    <div className={`mt-4 p-4 rounded-lg ${isNoteTheme ? 'bg-[#E8D5A3]/20 border border-[#E8D5A3]' : 'bg-blue-50 dark:bg-blue-950/20'}`}>
                      <h4 className={`font-semibold mb-2 ${isNoteTheme ? 'text-[#8B6914]' : 'text-blue-700 dark:text-blue-400'}`}>Explanation</h4>
                      <p className={`text-sm ${isNoteTheme ? 'text-[#5D4E37]' : ''}`}>{currentQuestion.ai_explanation}</p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 px-4 relative">
          <Button
            variant="ghost"
            onClick={goToPrev}
            disabled={currentPartIndex === 0 && currentQuestionIndex === 0}
            className={`w-12 h-12 rounded-full p-0 transition-all duration-200 ${isNoteTheme
              ? 'bg-[#E8D5A3]/20 text-[#5D4E37] hover:bg-[#E8D5A3]/40 disabled:opacity-30'
              : 'bg-white shadow-md text-slate-600 hover:text-emerald-600 hover:bg-white hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-30 disabled:shadow-none dark:bg-gray-800 dark:text-gray-300 dark:hover:text-emerald-400'
              }`}
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>

          {/* Central Question Navigator Trigger */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-sm transition-all border ${isNoteTheme
                    ? 'bg-[#FFFAF0] border-[#E8D5A3] text-[#5D4E37] hover:bg-[#E8D5A3]/20'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-emerald-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300'
                    }`}
                >
                  <Grid className="w-4 h-4" />
                  <span className="font-medium">
                    {currentQuestionIndex + 1} / {currentPart?.questions.length}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className={`w-80 p-4 ${isNoteTheme ? 'bg-[#FFFAF0] border-[#E8D5A3]' : ''}`} align="center" side="top">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className={`font-medium ${isNoteTheme ? 'text-[#5D4E37]' : ''}`}>Question Navigator</h4>
                    <span className={`text-xs ${isNoteTheme ? 'text-[#8B6914]' : 'text-muted-foreground'}`}>
                      Part {currentPart?.partNumber}
                    </span>
                  </div>
                  <ScrollArea className="h-[200px]">
                    <div className="grid grid-cols-5 gap-2">
                      {currentPart?.questions.map((q, index) => {
                        const isAnswered = !!answers[q.question_number];
                        const isCurrent = index === currentQuestionIndex;
                        const isCorrect = showResults && answers[q.question_number] === q.correct_answer;
                        const isWrong = showResults && answers[q.question_number] && answers[q.question_number] !== q.correct_answer;

                        return (
                          <Button
                            key={q.question_number}
                            variant="outline"
                            size="sm"
                            className={`h-9 w-full p-0 text-xs ${isCorrect ? 'bg-green-100 border-green-300 text-green-700' :
                              isWrong ? 'bg-red-100 border-red-300 text-red-700' :
                                isCurrent
                                  ? isNoteTheme
                                    ? 'bg-[#A68B5B] text-white border-[#A68B5B]'
                                    : 'bg-emerald-600 text-white border-emerald-600'
                                  : isAnswered
                                    ? isNoteTheme
                                      ? 'bg-[#E8D5A3] text-[#5D4E37] border-[#E8D5A3]'
                                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : isNoteTheme
                                      ? 'bg-transparent border-[#E8D5A3] text-[#5D4E37] hover:bg-[#E8D5A3]/20'
                                      : ''
                              }`}
                            onClick={() => setCurrentQuestionIndex(index)}
                          >
                            {q.question_number}
                          </Button>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {!isSubmitted ? (
            <div className="flex items-center gap-4">
              {currentQuestion && !showResults && (
                <Button
                  variant="ghost"
                  onClick={() => handleReveal(currentQuestion.question_number)}
                  className={`rounded-full px-4 py-2 transition-all duration-200 gap-2 ${isNoteTheme
                    ? 'text-[#A68B5B] hover:bg-[#E8D5A3]/20'
                    : 'text-slate-500 hover:text-emerald-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-emerald-400 dark:hover:bg-slate-800'
                    }`}
                  title={revealedAnswers.includes(currentQuestion.question_number) ? "Hide Answer" : "Show Answer"}
                >
                  {revealedAnswers.includes(currentQuestion.question_number) ? (
                    <>
                      <EyeOff className="w-5 h-5" />
                      <span className="text-sm font-medium">Hide Answer</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-5 h-5" />
                      <span className="text-sm font-medium">Show Answer</span>
                    </>
                  )}
                </Button>
              )}
              {isLastQuestion ? (
                <Button
                  onClick={handleSubmit}
                  className={`px-8 py-6 rounded-full shadow-md text-base font-medium transition-all duration-200 ${isNoteTheme
                    ? 'bg-[#A68B5B] hover:bg-[#8B6914] text-white hover:shadow-lg hover:-translate-y-0.5'
                    : 'bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:shadow-lg hover:shadow-green-500/20 hover:-translate-y-0.5'
                    }`}
                >
                  Submit Test
                  <Send className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={goToNext}
                  variant="ghost"
                  className={`w-12 h-12 rounded-full p-0 transition-all duration-200 ${isNoteTheme
                    ? 'bg-[#A68B5B] text-white hover:bg-[#8B6914] shadow-sm hover:shadow-md'
                    : 'bg-white shadow-md text-emerald-600 hover:bg-white hover:shadow-lg hover:-translate-y-0.5 dark:bg-gray-800 dark:text-emerald-400'
                    }`}
                >
                  <ChevronRight className="w-6 h-6" />
                </Button>
              )}
            </div>
          ) : (
            <Button
              onClick={() => navigate('/toeic')}
              className={`px-6 rounded-full shadow-md transition-all ${isNoteTheme
                ? 'bg-[#A68B5B] hover:bg-[#8B6914] text-white'
                : 'bg-slate-800 text-white hover:bg-slate-700'
                }`}
            >
              Back to Portal
            </Button>
          )}
        </div>

        {/* Question Navigator - Removed standalone card, now in popover */}
      </div>
    </div>
  );
};

export default TOEICReadingTest;

