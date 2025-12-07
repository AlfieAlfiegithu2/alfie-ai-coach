import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  BookOpen, 
  Clock, 
  ChevronLeft, 
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Send,
  FileText
} from "lucide-react";
import Header from "@/components/Header";
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

const PART_INFO = {
  5: { name: "Incomplete Sentences", questions: 40, description: "Choose the word or phrase that best completes the sentence" },
  6: { name: "Text Completion", questions: 12, description: "Complete the passage with the correct word or phrase" },
  7: { name: "Reading Comprehension", questions: 48, description: "Read the passage and answer questions" }
};

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
        .from('questions')
        .select('*')
        .eq('test_id', testId)
        .order('toeic_part', { ascending: true })
        .order('question_number_in_part', { ascending: true });

      if (questionsError) throw questionsError;

      // Load passages
      const { data: passages, error: passagesError } = await supabase
        .from('toeic_passages')
        .select('*')
        .eq('test_id', testId)
        .order('question_range_start', { ascending: true });

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
  const answeredCount = Object.keys(answers).length;

  // Find relevant passage for current question
  const currentPassage = currentPart?.passages.find(
    p => currentQuestion && 
    currentQuestion.question_number >= p.questionStart && 
    currentQuestion.question_number <= p.questionEnd
  );

  const handleAnswer = (questionNumber: number, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionNumber]: answer }));
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
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

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
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8 text-center">
          <AlertCircle className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">No Questions Found</h2>
          <p className="text-muted-foreground mb-4">This test doesn't have any questions yet.</p>
          <Button onClick={() => navigate('/toeic')}>Back to TOEIC Portal</Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isNoteTheme ? 'bg-[#FEF9E7]' : 'bg-gradient-to-br from-green-50 via-white to-emerald-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950'}`}>
      <Header />

      <div className="container mx-auto px-4 py-4 max-w-6xl">
        {/* Test Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold" style={{ color: isNoteTheme ? '#5D4E37' : undefined }}>{testName}</h1>
            <p className="text-sm" style={{ color: isNoteTheme ? '#8B6914' : undefined }}>TOEIC Reading Test</p>
          </div>
          <div className="flex items-center gap-4">
            <Badge 
              variant={timeLeft < 300 ? "destructive" : "secondary"} 
              className={`text-lg px-3 py-1 ${isNoteTheme ? 'bg-[#FEF9E7] text-[#8B6914] border-[#E8D5A3] border' : ''}`}
            >
              <Clock className="w-4 h-4 mr-1" />
              {formatTime(timeLeft)}
            </Badge>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-1" style={{ color: isNoteTheme ? '#8B6914' : undefined }}>
            <span>Progress: {answeredCount}/{totalQuestions} answered</span>
            <span>{Math.round((answeredCount / totalQuestions) * 100)}%</span>
          </div>
          <Progress 
            value={(answeredCount / totalQuestions) * 100} 
            className={`h-2 ${isNoteTheme ? 'bg-[#E8D5A3]' : ''}`} 
          />
        </div>

        {/* Part Navigation */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {groupedParts.map((part, index) => (
            <Button
              key={part.partNumber}
              variant={index === currentPartIndex ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setCurrentPartIndex(index);
                setCurrentQuestionIndex(0);
              }}
              className={`whitespace-nowrap ${
                isNoteTheme 
                  ? index === currentPartIndex 
                    ? 'bg-[#A68B5B] hover:bg-[#8B6914] text-white' 
                    : 'border-[#E8D5A3] text-[#5D4E37] hover:bg-[#E8D5A3]/20 bg-transparent'
                  : ''
              }`}
            >
              Part {part.partNumber}
              <Badge 
                variant="secondary" 
                className={`ml-1 text-xs ${
                  isNoteTheme 
                    ? index === currentPartIndex 
                      ? 'bg-white/20 text-white' 
                      : 'bg-[#FEF9E7] text-[#8B6914] border border-[#E8D5A3]'
                    : ''
                }`}
              >
                {part.questions.filter(q => answers[q.question_number]).length}/{part.questions.length}
              </Badge>
            </Button>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Passage Panel (for Part 6 & 7) */}
          {(currentPart?.partNumber === 6 || currentPart?.partNumber === 7) && (currentPassage || currentQuestion?.passage_context) && (
            <Card className={`md:h-[600px] ${isNoteTheme ? 'bg-[#FEF9E7] border-[#E8D5A3]' : ''}`}>
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
          <Card className={`${(currentPart?.partNumber === 6 || currentPart?.partNumber === 7) && (currentPassage || currentQuestion?.passage_context) ? '' : 'md:col-span-2'} ${isNoteTheme ? 'bg-[#FEF9E7] border-[#E8D5A3]' : ''}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg" style={{ color: isNoteTheme ? '#5D4E37' : undefined }}>
                  Question {currentQuestion?.question_number}
                </CardTitle>
                <Badge variant="outline" className={isNoteTheme ? 'border-[#E8D5A3] text-[#8B6914] bg-transparent' : ''}>
                  Part {currentPart?.partNumber}: {PART_INFO[currentPart?.partNumber as keyof typeof PART_INFO]?.name}
                </Badge>
              </div>
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
                          const isCorrect = showResults && letter === currentQuestion.correct_answer;
                          const isWrong = showResults && isSelected && letter !== currentQuestion.correct_answer;

                          return (
                            <Label
                              key={index}
                              className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
                                isCorrect 
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
                              <RadioGroupItem value={letter} disabled={isSubmitted} className={isNoteTheme ? 'text-[#A68B5B] border-[#A68B5B]' : ''} />
                              <span className={`font-medium mr-2 ${isNoteTheme ? 'text-[#5D4E37]' : ''}`}>({letter})</span>
                              <span className={`flex-1 ${isNoteTheme ? 'text-[#5D4E37]' : ''}`}>{option}</span>
                              {showResults && isCorrect && <CheckCircle className="w-5 h-5 text-green-500" />}
                              {showResults && isWrong && <AlertCircle className="w-5 h-5 text-red-500" />}
                            </Label>
                          );
                        })}
                      </div>
                    </RadioGroup>
                  )}

                  {/* AI Explanation (shown after submission) */}
                  {showResults && currentQuestion.ai_explanation && (
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
        <div className="flex items-center justify-between mt-4">
          <Button
            variant="outline"
            onClick={goToPrev}
            disabled={currentPartIndex === 0 && currentQuestionIndex === 0}
            className={isNoteTheme ? 'border-[#E8D5A3] text-[#5D4E37] hover:bg-[#E8D5A3]/20' : ''}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>

          {!isSubmitted ? (
            <Button
              onClick={handleSubmit}
              className={isNoteTheme ? 'bg-[#A68B5B] hover:bg-[#8B6914] text-white' : 'bg-orange-600 hover:bg-orange-700'}
            >
              <Send className="w-4 h-4 mr-1" />
              Submit Test
            </Button>
          ) : (
            <Button
              onClick={() => navigate('/toeic')}
              className={isNoteTheme ? 'bg-[#A68B5B] hover:bg-[#8B6914] text-white' : ''}
            >
              Back to Portal
            </Button>
          )}

          <Button
            variant="outline"
            onClick={goToNext}
            disabled={currentPartIndex === groupedParts.length - 1 && currentQuestionIndex === currentPart.questions.length - 1}
            className={isNoteTheme ? 'border-[#E8D5A3] text-[#5D4E37] hover:bg-[#E8D5A3]/20' : ''}
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        {/* Question Navigator */}
        <Card className={`mt-4 ${isNoteTheme ? 'bg-[#FEF9E7] border-[#E8D5A3]' : ''}`}>
          <CardHeader className="py-3">
            <CardTitle className="text-sm" style={{ color: isNoteTheme ? '#5D4E37' : undefined }}>Question Navigator</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="flex flex-wrap gap-2">
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
                    className={`w-10 h-10 p-0 ${
                      isCorrect ? 'bg-green-100 border-green-300 text-green-700' :
                      isWrong ? 'bg-red-100 border-red-300 text-red-700' :
                      isCurrent 
                        ? isNoteTheme 
                          ? 'bg-[#A68B5B] text-white border-[#A68B5B]' 
                          : 'bg-green-100 border-green-300' 
                        : isAnswered 
                          ? isNoteTheme 
                            ? 'bg-[#E8D5A3] text-[#5D4E37] border-[#E8D5A3]' 
                            : 'bg-gray-100' 
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TOEICReadingTest;

