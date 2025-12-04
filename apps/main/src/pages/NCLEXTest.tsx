import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import StudentLayout from '@/components/StudentLayout';
import NCLEXCatieAssistant from '@/components/NCLEXCatieAssistant';
import { supabase } from '@/integrations/supabase/client';
import LoadingAnimation from '@/components/animations/LoadingAnimation';
import SEO from '@/components/SEO';
import { useAuth } from '@/hooks/useAuth';
import { 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  CheckCircle2, 
  XCircle,
  AlertCircle,
  Flag,
  RotateCcw,
  Trophy,
  BookOpen,
  Info,
  Sparkles
} from 'lucide-react';
import { useThemeStyles } from '@/hooks/useThemeStyles';
import { useToast } from '@/hooks/use-toast';

interface NCLEXQuestion {
  id: string;
  question_number: number;
  question_text: string;
  question_type: 'SATA' | 'MCQ';
  options: string[];
  correct_answers: number[];
  rationale: string | null;
}

interface NCLEXTestData {
  id: string;
  title: string;
  description: string | null;
  category: string;
  time_limit_minutes: number;
  question_count: number;
}

interface UserAnswer {
  question_id: string;
  selected_answers: number[];
  is_correct: boolean;
  time_spent: number;
}

const NCLEXTest = () => {
  const navigate = useNavigate();
  const { testId } = useParams<{ testId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const themeStyles = useThemeStyles();
  
  const [isLoading, setIsLoading] = useState(true);
  const [test, setTest] = useState<NCLEXTestData | null>(null);
  const [questions, setQuestions] = useState<NCLEXQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number[]>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set());
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  
  // Review mode states
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<{ score: number; correct: number; total: number; answers: UserAnswer[] } | null>(null);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  
  // Catie Assistant state
  const [showCatieAssistant, setShowCatieAssistant] = useState(false);

  useEffect(() => {
    if (!user) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to take NCLEX practice tests',
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }
    
    if (testId) {
      loadTest();
    }
  }, [testId, user]);

  // Timer effect
  useEffect(() => {
    if (!timeRemaining || isReviewMode || showResults) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev && prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev ? prev - 1 : null;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, isReviewMode, showResults]);

  const loadTest = async () => {
    try {
      // Load test details
      const { data: testData, error: testError } = await supabase
        .from('nclex_tests')
        .select('id, title, description, category, time_limit_minutes, question_count')
        .eq('id', testId)
        .single();

      if (testError || !testData) {
        toast({
          title: 'Test not found',
          description: 'The requested test could not be found',
          variant: 'destructive',
        });
        navigate('/nclex');
        return;
      }

      setTest(testData as NCLEXTestData);
      setTimeRemaining((testData as NCLEXTestData).time_limit_minutes * 60);

      // Load questions
      const { data: questionsData, error: questionsError } = await supabase
        .from('nclex_questions')
        .select('id, question_number, question_text, question_type, options, correct_answers, rationale')
        .eq('test_id', testId)
        .order('question_number', { ascending: true });

      if (questionsError) {
        console.error('Error loading questions:', questionsError);
        return;
      }

      setQuestions((questionsData as NCLEXQuestion[]) || []);
      setStartTime(Date.now());
      setQuestionStartTime(Date.now());
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const currentQuestion = questions[currentIndex];

  const handleAnswerSelect = (optionIndex: number) => {
    if (isReviewMode || showResults) return;
    
    const questionId = currentQuestion.id;
    const currentSelections = selectedAnswers[questionId] || [];

    if (currentQuestion.question_type === 'SATA') {
      // Toggle selection for SATA
      if (currentSelections.includes(optionIndex)) {
        setSelectedAnswers({
          ...selectedAnswers,
          [questionId]: currentSelections.filter(i => i !== optionIndex)
        });
      } else {
        setSelectedAnswers({
          ...selectedAnswers,
          [questionId]: [...currentSelections, optionIndex]
        });
      }
    } else {
      // Single selection for MCQ
      setSelectedAnswers({
        ...selectedAnswers,
        [questionId]: [optionIndex]
      });
    }
  };

  const handleFlagQuestion = () => {
    const questionId = currentQuestion.id;
    const newFlagged = new Set(flaggedQuestions);
    if (newFlagged.has(questionId)) {
      newFlagged.delete(questionId);
    } else {
      newFlagged.add(questionId);
    }
    setFlaggedQuestions(newFlagged);
  };

  const goToQuestion = (index: number) => {
    // Track time spent on current question
    const timeSpent = Math.round((Date.now() - questionStartTime) / 1000);
    setCurrentIndex(index);
    setQuestionStartTime(Date.now());
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      goToQuestion(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      goToQuestion(currentIndex - 1);
    }
  };

  const calculateResults = useCallback(() => {
    const answers: UserAnswer[] = questions.map(q => {
      const selected = selectedAnswers[q.id] || [];
      const correct = q.correct_answers;
      
      // For SATA: all correct must be selected AND no incorrect
      // For MCQ: selected must match correct
      const isCorrect = q.question_type === 'SATA'
        ? correct.length === selected.length && correct.every(c => selected.includes(c))
        : selected.length === 1 && correct.includes(selected[0]);

      return {
        question_id: q.id,
        selected_answers: selected,
        is_correct: isCorrect,
        time_spent: 0 // We could track this per question
      };
    });

    const correctCount = answers.filter(a => a.is_correct).length;
    const score = (correctCount / questions.length) * 100;

    return {
      score,
      correct: correctCount,
      total: questions.length,
      answers
    };
  }, [questions, selectedAnswers]);

  const handleSubmit = async () => {
    setShowSubmitDialog(false);
    
    const results = calculateResults();
    setResults(results);
    setShowResults(true);

    // Save results to database
    if (user && test) {
      try {
        await supabase.from('nclex_test_results').insert({
          user_id: user.id,
          test_id: test.id,
          score: results.score,
          correct_count: results.correct,
          total_questions: results.total,
          answers_data: results.answers,
          time_taken_seconds: Math.round((Date.now() - startTime) / 1000)
        });
      } catch (error) {
        console.error('Error saving results:', error);
      }
    }
  };

  const handleReview = () => {
    setShowResults(false);
    setIsReviewMode(true);
    setCurrentIndex(0);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getAnsweredCount = () => {
    return Object.keys(selectedAnswers).filter(qId => selectedAnswers[qId].length > 0).length;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: themeStyles.theme.colors.background }}>
        <LoadingAnimation />
      </div>
    );
  }

  if (!test || questions.length === 0) {
    return (
      <StudentLayout title="NCLEX Test" showBackButton>
        <div className="flex flex-col items-center justify-center min-h-[50vh]">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No questions available for this test</p>
          <Button onClick={() => navigate('/nclex')} className="mt-4">
            Back to NCLEX Portal
          </Button>
        </div>
      </StudentLayout>
    );
  }

  // Results View
  if (showResults && results) {
    const isPassing = results.score >= 75;
    
    return (
      <div 
        className="min-h-screen relative"
        style={{ backgroundColor: themeStyles.theme.colors.background }}
      >
        <SEO title={`Results - ${test.title}`} />
        
        <StudentLayout title="Test Results" showBackButton>
          <div className="max-w-3xl mx-auto px-4 py-8">
            <Card 
              className="border-2"
              style={{ 
                backgroundColor: themeStyles.theme.colors.cardBackground,
                borderColor: isPassing ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'
              }}
            >
              <CardHeader className="text-center pb-2">
                <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-4 ${
                  isPassing 
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
                    : 'bg-gradient-to-r from-red-500 to-orange-500'
                }`}>
                  {isPassing ? (
                    <Trophy className="h-10 w-10 text-white" />
                  ) : (
                    <RotateCcw className="h-10 w-10 text-white" />
                  )}
                </div>
                <CardTitle className="text-3xl" style={{ color: themeStyles.textPrimary }}>
                  {isPassing ? 'Congratulations!' : 'Keep Practicing!'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center">
                  <p className={`text-6xl font-bold mb-2 ${
                    isPassing ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {Math.round(results.score)}%
                  </p>
                  <p className="text-muted-foreground">
                    {results.correct} out of {results.total} correct
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-4 text-center py-4 border-y border-border">
                  <div>
                    <p className="text-2xl font-bold text-green-500">{results.correct}</p>
                    <p className="text-xs text-muted-foreground">Correct</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-500">{results.total - results.correct}</p>
                    <p className="text-xs text-muted-foreground">Incorrect</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold" style={{ color: themeStyles.textPrimary }}>
                      {formatTime(Math.round((Date.now() - startTime) / 1000))}
                    </p>
                    <p className="text-xs text-muted-foreground">Time Taken</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button 
                    onClick={handleReview}
                    variant="outline"
                    className="flex-1"
                  >
                    <BookOpen className="h-4 w-4 mr-2" />
                    Review Answers
                  </Button>
                  <Button 
                    onClick={() => navigate('/nclex')}
                    className="flex-1 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white"
                  >
                    Back to NCLEX Portal
                  </Button>
                </div>

                {/* Catie suggestion */}
                <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 border border-teal-200 dark:border-teal-800">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img
                        src="/1000031289.png"
                        alt="Catie"
                        className="w-12 h-12 rounded-full object-cover ring-2 ring-white shadow-md"
                      />
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-teal-500 rounded-full flex items-center justify-center border-2 border-white">
                        <Sparkles className="w-2.5 h-2.5 text-white" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-teal-700 dark:text-teal-400">
                        Need help understanding your answers?
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Click "Review Answers" and I'll help explain each question!
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </StudentLayout>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen relative"
      style={{ backgroundColor: themeStyles.theme.colors.background }}
    >
      <SEO title={`${test.title} - NCLEX Practice`} />
      
      <StudentLayout title={test.title} showBackButton>
        <div className="max-w-4xl mx-auto px-4">
          {/* Header with Timer and Progress */}
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur py-4 mb-6 border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="text-sm">
                  {test.category}
                </Badge>
                {isReviewMode && (
                  <Badge className="bg-blue-500 text-white">Review Mode</Badge>
                )}
              </div>
              {!isReviewMode && timeRemaining !== null && (
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
                  timeRemaining < 300 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-muted'
                }`}>
                  <Clock className="h-4 w-4" />
                  <span className="font-mono font-semibold">{formatTime(timeRemaining)}</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-4">
              <Progress 
                value={(currentIndex + 1) / questions.length * 100} 
                className="flex-1 h-2"
              />
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {currentIndex + 1} / {questions.length}
              </span>
            </div>
          </div>

          {/* Question Card */}
          <Card 
            className="mb-6"
            style={{ 
              backgroundColor: themeStyles.theme.colors.cardBackground,
              borderColor: themeStyles.border 
            }}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Question {currentQuestion.question_number}</span>
                  <Badge 
                    variant={currentQuestion.question_type === 'SATA' ? 'default' : 'secondary'}
                    className={currentQuestion.question_type === 'SATA' ? 'bg-purple-500' : ''}
                  >
                    {currentQuestion.question_type === 'SATA' ? 'Select All That Apply' : 'Multiple Choice'}
                  </Badge>
                </div>
                {!isReviewMode && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleFlagQuestion}
                    className={flaggedQuestions.has(currentQuestion.id) ? 'text-amber-500' : ''}
                  >
                    <Flag className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-lg mb-6 leading-relaxed" style={{ color: themeStyles.textPrimary }}>
                {currentQuestion.question_text}
              </p>

              {/* Options */}
              <div className="space-y-3">
                {currentQuestion.options.map((option, index) => {
                  const isSelected = (selectedAnswers[currentQuestion.id] || []).includes(index);
                  const isCorrect = currentQuestion.correct_answers.includes(index);
                  
                  // In review mode, show correct/incorrect styling
                  let optionStyle = '';
                  if (isReviewMode) {
                    if (isCorrect) {
                      optionStyle = 'border-green-500 bg-green-50 dark:bg-green-900/20';
                    } else if (isSelected && !isCorrect) {
                      optionStyle = 'border-red-500 bg-red-50 dark:bg-red-900/20';
                    }
                  } else if (isSelected) {
                    optionStyle = 'border-teal-500 bg-teal-50 dark:bg-teal-900/20';
                  }

                  return (
                    <div
                      key={index}
                      onClick={() => handleAnswerSelect(index)}
                      className={`flex items-start gap-3 p-4 rounded-lg border-2 transition-all cursor-pointer hover:border-teal-400 ${optionStyle || 'border-border'}`}
                    >
                      {currentQuestion.question_type === 'SATA' ? (
                        <Checkbox
                          checked={isSelected}
                          disabled={isReviewMode}
                          className="mt-0.5"
                        />
                      ) : (
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                          isSelected ? 'border-teal-500 bg-teal-500' : 'border-muted-foreground'
                        }`}>
                          {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                      )}
                      <span className="flex-1" style={{ color: themeStyles.textPrimary }}>
                        {option}
                      </span>
                      {isReviewMode && isCorrect && (
                        <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                      )}
                      {isReviewMode && isSelected && !isCorrect && (
                        <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Rationale in Review Mode */}
              {isReviewMode && (
                <div className="mt-6 space-y-4">
                  {currentQuestion.rationale && (
                    <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20">
                      <Info className="h-4 w-4 text-blue-500" />
                      <AlertDescription className="text-sm">
                        <strong className="block mb-1">Rationale:</strong>
                        {currentQuestion.rationale}
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {/* Ask Catie Button */}
                  <div 
                    onClick={() => setShowCatieAssistant(true)}
                    className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 border border-teal-200 dark:border-teal-800 cursor-pointer hover:shadow-md transition-all group"
                  >
                    <div className="relative">
                      <img
                        src="/1000031289.png"
                        alt="Catie"
                        className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow-sm group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-teal-500 rounded-full flex items-center justify-center border-2 border-white">
                        <Sparkles className="w-2 h-2 text-white" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-teal-700 dark:text-teal-400 text-sm">
                        Still confused? Ask Catie! 🩺
                      </p>
                      <p className="text-xs text-muted-foreground">
                        I can explain the nursing concepts behind this question
                      </p>
                    </div>
                    <Button
                      size="sm"
                      className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white"
                    >
                      Ask Catie
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>

            {isReviewMode ? (
              <Button 
                onClick={() => navigate('/nclex')}
                className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white"
              >
                Finish Review
              </Button>
            ) : currentIndex === questions.length - 1 ? (
              <Button 
                onClick={() => setShowSubmitDialog(true)}
                className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white"
              >
                Submit Test
              </Button>
            ) : (
              <Button onClick={handleNext}>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>

          {/* Question Navigator */}
          <Card 
            className="mb-6"
            style={{ 
              backgroundColor: themeStyles.theme.colors.cardBackground,
              borderColor: themeStyles.border 
            }}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Question Navigator</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {questions.map((q, index) => {
                  const isAnswered = (selectedAnswers[q.id] || []).length > 0;
                  const isCurrent = index === currentIndex;
                  const isFlagged = flaggedQuestions.has(q.id);
                  
                  // In review mode, show correct/incorrect
                  let bgColor = '';
                  if (isReviewMode && results) {
                    const answer = results.answers.find(a => a.question_id === q.id);
                    if (answer?.is_correct) {
                      bgColor = 'bg-green-500 text-white';
                    } else {
                      bgColor = 'bg-red-500 text-white';
                    }
                  } else if (isCurrent) {
                    bgColor = 'bg-teal-500 text-white';
                  } else if (isAnswered) {
                    bgColor = 'bg-teal-100 dark:bg-teal-900/50';
                  }

                  return (
                    <button
                      key={q.id}
                      onClick={() => goToQuestion(index)}
                      className={`w-10 h-10 rounded-lg text-sm font-medium transition-all relative ${
                        bgColor || 'bg-muted hover:bg-muted/80'
                      } ${isCurrent ? 'ring-2 ring-teal-500 ring-offset-2' : ''}`}
                    >
                      {index + 1}
                      {isFlagged && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full" />
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-teal-100 dark:bg-teal-900/50" /> Answered
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-muted" /> Not answered
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-amber-500" /> Flagged
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Progress Summary */}
          {!isReviewMode && (
            <div className="text-center text-sm text-muted-foreground mb-8">
              {getAnsweredCount()} of {questions.length} questions answered
              {flaggedQuestions.size > 0 && ` • ${flaggedQuestions.size} flagged`}
            </div>
          )}
        </div>

        {/* Submit Confirmation Dialog */}
        <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Submit Test?</DialogTitle>
              <DialogDescription>
                You have answered {getAnsweredCount()} out of {questions.length} questions.
                {questions.length - getAnsweredCount() > 0 && (
                  <span className="text-amber-500 block mt-2">
                    Warning: {questions.length - getAnsweredCount()} questions are unanswered.
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={() => setShowSubmitDialog(false)}>
                Continue Test
              </Button>
              <Button 
                onClick={handleSubmit}
                className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white"
              >
                Submit Test
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Exit Confirmation Dialog */}
        <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Exit Test?</DialogTitle>
              <DialogDescription>
                Are you sure you want to exit? Your progress will not be saved.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={() => setShowExitDialog(false)}>
                Continue Test
              </Button>
              <Button 
                variant="destructive"
                onClick={() => navigate('/nclex')}
              >
                Exit Test
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Catie AI Assistant */}
        <NCLEXCatieAssistant
          isOpen={showCatieAssistant}
          onClose={() => setShowCatieAssistant(false)}
          questionText={currentQuestion?.question_text || ''}
          questionType={currentQuestion?.question_type || 'MCQ'}
          options={currentQuestion?.options || []}
          rationale={currentQuestion?.rationale}
          isReviewMode={isReviewMode}
        />

        {/* Catie Dock Icon */}
        {!showCatieAssistant && (
          <div className="fixed bottom-6 right-6 z-40">
            <div
              className="relative cursor-pointer group"
              onClick={() => setShowCatieAssistant(true)}
            >
              {/* Pulsing ring effect */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 animate-ping opacity-20" />
              
              {/* Main avatar */}
              <div
                className="relative w-16 h-16 rounded-full overflow-hidden shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:shadow-xl ring-4 ring-white dark:ring-gray-800"
                style={{
                  boxShadow: '0 8px 25px rgba(20, 184, 166, 0.4)',
                }}
              >
                <img
                  src="/1000031289.png"
                  alt="Ask Catie"
                  className="w-full h-full object-cover"
                />
              </div>
              
              {/* Sparkle badge */}
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full flex items-center justify-center shadow-md border-2 border-white dark:border-gray-800">
                <Sparkles className="w-3 h-3 text-white" />
              </div>
              
              {/* Tooltip */}
              <div className="absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                Ask Catie for help! 🩺
                <div className="absolute top-full right-4 w-2 h-2 bg-gray-900 rotate-45 -mt-1" />
              </div>
            </div>
          </div>
        )}
      </StudentLayout>
    </div>
  );
};

export default NCLEXTest;

