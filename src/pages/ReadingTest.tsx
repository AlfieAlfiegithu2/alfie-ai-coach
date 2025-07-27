import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Clock, BookOpen, CheckCircle, XCircle, Eye, EyeOff, FileText, Target } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import StudentLayout from '@/components/StudentLayout';

interface ReadingPassage {
  id: string;
  title: string;
  content: string;
  difficulty_level: string;
  passage_type: string;
  cambridge_book?: string;
  test_number?: number;
  part_number?: number;
}

interface ReadingQuestion {
  id: string;
  question_text: string;
  question_number: number;
  options?: string[];
  correct_answer: string;
  question_type: string;
  explanation: string;
  passage_id: string;
}

const ReadingTest = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { testId } = useParams();
  const [timeLeft, setTimeLeft] = useState(60 * 60); // 60 minutes
  const [currentPassage, setCurrentPassage] = useState<ReadingPassage | null>(null);
  const [questions, setQuestions] = useState<ReadingQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showExplanations, setShowExplanations] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    fetchReadingTest();
  }, [testId]);

  useEffect(() => {
    if (timeLeft > 0 && !isSubmitted) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !isSubmitted) {
      handleSubmit();
    }
  }, [timeLeft, isSubmitted]);

  // Auto-save answers
  useEffect(() => {
    const saveAnswers = () => {
      localStorage.setItem(`reading-test-${testId}`, JSON.stringify(answers));
    };
    const timer = setTimeout(saveAnswers, 1000);
    return () => clearTimeout(timer);
  }, [answers, testId]);

  const fetchReadingTest = async () => {
    try {
      // Fetch reading passage from database
      let passageQuery = supabase.from('reading_passages').select('*');
      
      if (testId && testId !== 'random') {
        passageQuery = passageQuery.eq('id', testId);
      } else {
        // Get a random passage, prioritizing newer Cambridge books
        passageQuery = passageQuery.order('cambridge_book', { ascending: false }).order('created_at', { ascending: false });
      }
      
      const { data: passages, error: passageError } = await passageQuery.limit(1);

      if (passageError) throw passageError;

      if (passages && passages.length > 0) {
        const passage = passages[0];
        console.log('Loading passage:', passage.id, passage.title);
        setCurrentPassage({
          id: passage.id,
          title: passage.title,
          content: passage.content,
          difficulty_level: passage.difficulty_level || 'Academic',
          passage_type: passage.passage_type || 'academic',
          cambridge_book: passage.cambridge_book,
          test_number: passage.test_number,
          part_number: passage.part_number || 1
        });

        // Fetch questions for this passage with improved query
        console.log('Fetching questions for passage:', passage.id);
        let questionsQuery = supabase.from('reading_questions').select('*');
        
        // First try to find questions by passage_id
        const { data: questionsData, error: questionsError } = await questionsQuery
          .eq('passage_id', passage.id)
          .order('question_number');

        if (questionsError) {
          console.error('Error fetching questions:', questionsError);
          throw questionsError;
        }

        let finalQuestionsData = questionsData;

        // If no questions found by passage_id, try comprehensive fallback queries
        if (!questionsData || questionsData.length === 0) {
          console.log('No questions found by passage_id, trying book/section/part lookup...');
          
          let altQuestionsData = null;
          
          // Approach 1: Direct book/section/part match
          if (passage.cambridge_book && passage.section_number && passage.part_number) {
            const { data, error } = await supabase
              .from('reading_questions')
              .select('*')
              .eq('cambridge_book', passage.cambridge_book)
              .eq('section_number', passage.section_number)
              .eq('part_number', passage.part_number)
              .order('question_number');
            
            if (!error && data && data.length > 0) {
              altQuestionsData = data;
              console.log('Found questions by exact book/section/part match:', altQuestionsData.length);
            }
          }
          
          // Approach 2: Try all possible book format variations
          if (!altQuestionsData && passage.cambridge_book) {
            const bookNum = passage.cambridge_book.replace(/[^0-9]/g, '');
            const bookVariants = [
              passage.cambridge_book,
              bookNum,
              `C${bookNum}`,
              `c${bookNum}`,
              passage.cambridge_book.toLowerCase(),
              passage.cambridge_book.toUpperCase()
            ];
            
            for (const bookVariant of bookVariants) {
              console.log(`Trying book variant: ${bookVariant} with section ${passage.section_number || 1}, part ${passage.part_number || 1}`);
              const { data, error } = await supabase
                .from('reading_questions')
                .select('*')
                .eq('cambridge_book', bookVariant)
                .eq('section_number', passage.section_number || 1)
                .eq('part_number', passage.part_number || 1)
                .order('question_number');
              
              if (!error && data && data.length > 0) {
                altQuestionsData = data;
                console.log(`SUCCESS: Found ${data.length} questions with book variant "${bookVariant}"`);
                break;
              }
            }
          }
          
          // Approach 3: Find questions in same book/section, any part
          if (!altQuestionsData && passage.cambridge_book && passage.section_number) {
            const bookNum = passage.cambridge_book.replace(/[^0-9]/g, '');
            const bookVariants = [passage.cambridge_book, bookNum, `C${bookNum}`];
            
            for (const bookVariant of bookVariants) {
              const { data, error } = await supabase
                .from('reading_questions')
                .select('*')
                .eq('cambridge_book', bookVariant)
                .eq('section_number', passage.section_number)
                .order('question_number');
              
              if (!error && data && data.length > 0) {
                altQuestionsData = data;
                console.log(`Found ${data.length} questions by book/section (any part) with "${bookVariant}"`);
                break;
              }
            }
          }
          
          // Approach 4: Final fallback - find ANY questions for this book
          if (!altQuestionsData && passage.cambridge_book) {
            const bookNum = passage.cambridge_book.replace(/[^0-9]/g, '');
            const { data, error } = await supabase
              .from('reading_questions')
              .select('*')
              .eq('cambridge_book', `C${bookNum}`)
              .order('question_number');
            
            if (!error && data && data.length > 0) {
              altQuestionsData = data;
              console.log(`Final fallback: Found ${data.length} questions for book C${bookNum}`);
            }
          }
          
          finalQuestionsData = altQuestionsData;
        }

        console.log('Questions fetched:', finalQuestionsData?.length || 0, 'questions');

        if (finalQuestionsData && finalQuestionsData.length > 0) {
          const formattedQuestions: ReadingQuestion[] = finalQuestionsData.map(q => {
            console.log('Processing question:', q.question_number, q.question_type, q.options);
            return {
              id: q.id,
              question_number: q.question_number,
              question_text: q.question_text,
              question_type: q.question_type,
              options: q.options ? (Array.isArray(q.options) ? q.options.map(o => String(o)) : typeof q.options === 'string' ? q.options.split(';') : undefined) : undefined,
              correct_answer: q.correct_answer,
              explanation: q.explanation,
              passage_id: q.passage_id
            };
          });
          console.log('Formatted questions:', formattedQuestions.length);
          setQuestions(formattedQuestions);
        } else {
          console.warn('No questions found for passage:', passage.id);
          toast({
            title: "No Questions Found",
            description: "This passage doesn't have any questions yet. Please select another test.",
            variant: "destructive"
          });
        }
      } else {
        toast({
          title: "No Content Available",
          description: "No reading passages are available yet. Please check back soon or contact your instructor.",
          variant: "destructive"
        });
      }

      // Load saved answers
      const savedAnswers = localStorage.getItem(`reading-test-${testId}`);
      if (savedAnswers) {
        setAnswers(JSON.parse(savedAnswers));
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching test:', error);
      toast({
        title: "Error",
        description: "Failed to load reading test",
        variant: "destructive"
      });
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const calculateScore = () => {
    let correct = 0;
    questions.forEach(question => {
      const userAnswer = answers[question.id]?.toLowerCase().trim();
      const correctAnswer = question.correct_answer.toLowerCase().trim();
      
      if (userAnswer === correctAnswer) {
        correct++;
      }
    });
    return correct;
  };

  const handleSubmit = () => {
    const finalScore = calculateScore();
    setScore(finalScore);
    setIsSubmitted(true);
    setShowConfirmDialog(false);
    
    // Clear saved answers
    localStorage.removeItem(`reading-test-${testId}`);
    
    toast({
      title: "Test Submitted!",
      description: `You scored ${finalScore}/${questions.length} (${Math.round((finalScore / questions.length) * 100)}%)`,
    });
  };

  const getBandScore = (percentage: number): string => {
    if (percentage >= 95) return "9.0";
    if (percentage >= 90) return "8.5";
    if (percentage >= 80) return "8.0";
    if (percentage >= 70) return "7.5";
    if (percentage >= 60) return "7.0";
    if (percentage >= 50) return "6.5";
    if (percentage >= 40) return "6.0";
    if (percentage >= 30) return "5.5";
    if (percentage >= 20) return "5.0";
    return "Below 5.0";
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const renderQuestion = (question: ReadingQuestion) => {
    const userAnswer = answers[question.id] || '';
    const isCorrect = isSubmitted && userAnswer.toLowerCase().trim() === question.correct_answer.toLowerCase().trim();
    const isIncorrect = isSubmitted && userAnswer && !isCorrect;

    return (
      <div key={question.id} className="border-b border-light-border pb-6 last:border-b-0">
        <div className="flex items-start gap-3 mb-4">
          <Badge variant="outline" className="mt-1 shrink-0">
            {question.question_number}
          </Badge>
          <div className="flex-1">
            <p className="font-medium text-foreground mb-3">{question.question_text}</p>
            
            {question.question_type === 'multiple_choice' && question.options && (
              <div className="space-y-2">
                {question.options.map((option, index) => (
                  <label 
                    key={index} 
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      isSubmitted 
                        ? option === question.correct_answer 
                          ? 'bg-green-50 border border-green-200' 
                          : userAnswer === option 
                            ? 'bg-red-50 border border-red-200' 
                            : 'bg-background/50'
                        : userAnswer === option 
                          ? 'bg-blue-50 border border-blue-200' 
                          : 'bg-background/50 hover:bg-blue-50/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`question-${question.id}`}
                      value={option}
                      checked={userAnswer === option}
                      onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                      disabled={isSubmitted}
                      className="text-blue-600"
                    />
                    <span className={`${
                      isSubmitted && option === question.correct_answer ? 'font-medium text-green-800' :
                      isSubmitted && userAnswer === option && option !== question.correct_answer ? 'font-medium text-red-800' :
                      'text-foreground'
                    }`}>
                      {option}
                    </span>
                    {isSubmitted && option === question.correct_answer && (
                      <CheckCircle className="w-4 h-4 text-green-600 ml-auto" />
                    )}
                    {isSubmitted && userAnswer === option && option !== question.correct_answer && (
                      <XCircle className="w-4 h-4 text-red-600 ml-auto" />
                    )}
                  </label>
                ))}
              </div>
            )}

            {question.question_type === 'true_false_not_given' && question.options && (
              <div className="space-y-2">
                {question.options.map((option, index) => (
                  <label 
                    key={index} 
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      isSubmitted 
                        ? option === question.correct_answer 
                          ? 'bg-green-50 border border-green-200' 
                          : userAnswer === option 
                            ? 'bg-red-50 border border-red-200' 
                            : 'bg-background/50'
                        : userAnswer === option 
                          ? 'bg-blue-50 border border-blue-200' 
                          : 'bg-background/50 hover:bg-blue-50/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`question-${question.id}`}
                      value={option}
                      checked={userAnswer === option}
                      onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                      disabled={isSubmitted}
                      className="text-blue-600"
                    />
                    <span className={`${
                      isSubmitted && option === question.correct_answer ? 'font-medium text-green-800' :
                      isSubmitted && userAnswer === option && option !== question.correct_answer ? 'font-medium text-red-800' :
                      'text-foreground'
                    }`}>
                      {option}
                    </span>
                    {isSubmitted && option === question.correct_answer && (
                      <CheckCircle className="w-4 h-4 text-green-600 ml-auto" />
                    )}
                  </label>
                ))}
              </div>
            )}

            {(question.question_type === 'fill_in_blank' || question.question_type === 'short_answer') && (
              <Input
                value={userAnswer}
                onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                placeholder="Type your answer here..."
                disabled={isSubmitted}
                className={`rounded-xl border-light-border ${
                  isSubmitted 
                    ? isCorrect 
                      ? 'border-green-500 bg-green-50' 
                      : 'border-red-500 bg-red-50'
                    : ''
                }`}
              />
            )}

            {isSubmitted && (
              <div className="mt-3 flex items-center gap-2">
                {isCorrect ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-600" />
                )}
                <span className={`text-sm font-medium ${isCorrect ? 'text-green-800' : 'text-red-800'}`}>
                  {isCorrect ? 'Correct' : `Incorrect - Answer: ${question.correct_answer}`}
                </span>
              </div>
            )}

            {isSubmitted && showExplanations && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Explanation:</strong> {question.explanation}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <StudentLayout title="Loading Test...">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-warm-gray">Loading reading test...</p>
          </div>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout title="Reading Test" showBackButton backPath="/tests">
      <div className="max-w-7xl mx-auto p-4">
        {/* Test Header */}
        <div className="mb-6 p-4 rounded-xl border-light-border" style={{ background: 'var(--gradient-card)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <BookOpen className="w-6 h-6 text-primary" />
              <div>
                <h1 className="text-2xl font-georgia font-bold text-foreground">
                  {currentPassage?.title}
                </h1>
                <div className="flex gap-3 mt-1">
                  {currentPassage?.cambridge_book && (
                    <Badge variant="outline">{currentPassage.cambridge_book}</Badge>
                  )}
                  {currentPassage?.test_number && (
                    <Badge variant="outline">Test {currentPassage.test_number}</Badge>
                  )}
                  <Badge variant="outline">{currentPassage?.difficulty_level}</Badge>
                  <Badge variant="outline">{currentPassage?.passage_type}</Badge>
                </div>
              </div>
            </div>
            
            {!isSubmitted && (
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-sm text-warm-gray">Time Remaining</div>
                  <div className={`text-xl font-mono font-bold ${timeLeft < 300 ? 'text-red-600' : 'text-foreground'}`}>
                    {formatTime(timeLeft)}
                  </div>
                </div>
                <Clock className={`w-6 h-6 ${timeLeft < 300 ? 'text-red-600' : 'text-primary'}`} />
              </div>
            )}

            {isSubmitted && (
              <div className="text-right">
                <div className="text-sm text-warm-gray">Your Score</div>
                <div className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <Target className="w-6 h-6 text-green-600" />
                  {score}/{questions.length}
                </div>
                <div className="text-sm font-medium text-blue-600">
                  Band {getBandScore((score / questions.length) * 100)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Content - Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Passage - Takes 2 columns */}
          <Card className="lg:col-span-2 rounded-2xl border-light-border" style={{ background: 'var(--gradient-card)' }}>
            <CardHeader className="bg-white/90 backdrop-blur-sm border-b border-light-border sticky top-0 z-10">
              <CardTitle className="text-xl font-georgia text-foreground flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Reading Passage
                <Badge variant="outline" className="ml-auto bg-blue-50 text-blue-700">
                  Questions 1-{questions.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="prose max-w-none text-foreground leading-relaxed space-y-4">
                {currentPassage?.content.split('\n\n').map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Right: Answer Sheet */}
          <Card className="rounded-2xl border-light-border" style={{ background: 'var(--gradient-card)' }}>
            <CardHeader className="bg-white/90 backdrop-blur-sm border-b border-light-border sticky top-0 z-10">
              <CardTitle className="text-lg font-georgia text-foreground flex items-center gap-2">
                <Target className="w-5 h-5" />
                Answer Sheet
                <Badge variant="outline" className="ml-auto">
                  {Object.keys(answers).filter(key => answers[key]).length}/{questions.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6 max-h-[70vh] overflow-y-auto">
                {questions.map(renderQuestion)}
              </div>
              
              {!isSubmitted ? (
                <Button 
                  onClick={() => setShowConfirmDialog(true)}
                  className="w-full mt-6 rounded-xl"
                  style={{ background: 'var(--gradient-button)', border: 'none' }}
                >
                  Submit Test
                </Button>
              ) : (
                <div className="mt-6 space-y-3">
                  <div className="p-4 rounded-xl text-center" style={{ background: 'var(--gradient-success)' }}>
                    <div className="text-2xl font-bold text-white mb-1">
                      {Math.round((score / questions.length) * 100)}%
                    </div>
                    <div className="text-white/90">
                      Band Score: {getBandScore((score / questions.length) * 100)}
                    </div>
                  </div>
                  
                  <Button 
                    onClick={() => setShowExplanations(!showExplanations)}
                    variant="outline"
                    className="w-full rounded-xl border-light-border"
                  >
                    {showExplanations ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                    {showExplanations ? 'Hide' : 'Show'} Explanations
                  </Button>
                  
                  <Button 
                    onClick={() => navigate('/tests')}
                    className="w-full rounded-xl"
                    style={{ background: 'var(--gradient-button)', border: 'none' }}
                  >
                    Take Another Test
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="rounded-2xl border-light-border">
          <DialogHeader>
            <DialogTitle className="font-georgia">Submit Test?</DialogTitle>
            <DialogDescription>
              Are you sure you want to submit your test? You won't be able to change your answers after submission.
              <br /><br />
              <strong>Questions answered:</strong> {Object.keys(answers).filter(key => answers[key]).length} / {questions.length}
              <br />
              <strong>Time remaining:</strong> {formatTime(timeLeft)}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowConfirmDialog(false)}
              className="rounded-xl border-light-border"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              className="rounded-xl"
              style={{ background: 'var(--gradient-button)', border: 'none' }}
            >
              Submit Test
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </StudentLayout>
  );
};

export default ReadingTest;