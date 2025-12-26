import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Headphones,
  Clock,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Volume2,
  CheckCircle,
  AlertCircle,
  Send
} from "lucide-react";
import Header from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useThemeStyles } from '@/hooks/useThemeStyles';

interface Question {
  id: string;
  question_number: number;
  question_text: string;
  question_type: string;
  options: string[] | null;
  correct_answer: string;
  toeic_part: number;
  audio_url?: string;
  image_url?: string;
  ai_explanation?: string;
}

interface GroupedPart {
  partNumber: number;
  questions: Question[];
  audioUrl?: string;
}

const PART_INFO = {
  1: { name: "Photos", questions: 6, description: "Look at the photo and choose the statement that best describes it" },
  2: { name: "Question-Response", questions: 25, description: "Listen and choose the best response" },
  3: { name: "Conversations", questions: 39, description: "Listen to conversations and answer questions" },
  4: { name: "Talks", questions: 30, description: "Listen to talks and answer questions" }
};

const TOEICListeningTest = () => {
  const navigate = useNavigate();
  const { testId } = useParams<{ testId: string }>();
  const audioRef = useRef<HTMLAudioElement>(null);

  const themeStyles = useThemeStyles();
  const isNoteTheme = themeStyles.theme.name === 'note';

  const [loading, setLoading] = useState(true);
  const [testName, setTestName] = useState("");
  const [groupedParts, setGroupedParts] = useState<GroupedPart[]>([]);
  const [currentPartIndex, setCurrentPartIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [key: number]: string }>({});
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(45 * 60); // 45 minutes
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

      // Group by part
      const grouped: { [key: number]: Question[] } = {};
      questions?.forEach((q: any) => {
        const part = q.toeic_part || 1;
        if (!grouped[part]) grouped[part] = [];
        grouped[part].push({
          id: q.id,
          question_number: q.question_number_in_part,
          question_text: q.question_text,
          question_type: q.question_type,
          options: q.choices ? JSON.parse(q.choices) : null,
          correct_answer: q.correct_answer,
          toeic_part: part,
          audio_url: q.audio_url,
          image_url: q.image_url,
          ai_explanation: q.ai_explanation
        });
      });

      const parts: GroupedPart[] = Object.entries(grouped).map(([partNum, qs]) => ({
        partNumber: parseInt(partNum),
        questions: qs,
        audioUrl: qs[0]?.audio_url
      })).sort((a, b) => a.partNumber - b.partNumber);

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

  const toggleAudio = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
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
    <div
      className={`min-h-screen relative ${isNoteTheme ? 'font-serif' : 'bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950'}`}
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

      <div className="relative z-10">
        <Header />

        <div className="container mx-auto px-4 py-4 max-w-4xl">
          {/* Test Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold">{testName}</h1>
              <p className="text-sm text-muted-foreground">TOEIC Listening Test</p>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant={timeLeft < 300 ? "destructive" : "secondary"} className="text-lg px-3 py-1">
                <Clock className="w-4 h-4 mr-1" />
                {formatTime(timeLeft)}
              </Badge>
            </div>
          </div>

          {/* Progress */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm mb-1">
              <span>Progress: {answeredCount}/{totalQuestions} answered</span>
              <span>{Math.round((answeredCount / totalQuestions) * 100)}%</span>
            </div>
            <Progress value={(answeredCount / totalQuestions) * 100} className="h-2" />
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
                className="whitespace-nowrap"
              >
                Part {part.partNumber}
                <Badge variant="secondary" className="ml-1 text-xs">
                  {part.questions.filter(q => answers[q.question_number]).length}/{part.questions.length}
                </Badge>
              </Button>
            ))}
          </div>

          {/* Audio Player */}
          {currentPart?.audioUrl && (
            <Card className="mb-4 bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={toggleAudio}
                    className="bg-white/20 hover:bg-white/30"
                  >
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  </Button>
                  <div className="flex-1">
                    <audio
                      ref={audioRef}
                      src={currentPart.audioUrl}
                      onEnded={() => setIsPlaying(false)}
                    />
                    <p className="text-sm font-medium">Part {currentPart.partNumber} Audio</p>
                    <p className="text-xs opacity-80">{PART_INFO[currentPart.partNumber as keyof typeof PART_INFO]?.name}</p>
                  </div>
                  <Volume2 className="w-5 h-5 opacity-80" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Question Card */}
          {currentQuestion && (
            <Card className="mb-4">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    Question {currentQuestion.question_number}
                  </CardTitle>
                  <Badge variant="outline">
                    Part {currentPart.partNumber}: {PART_INFO[currentPart.partNumber as keyof typeof PART_INFO]?.name}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {/* Photo for Part 1 */}
                {currentQuestion.image_url && (
                  <div className="mb-4">
                    <img
                      src={currentQuestion.image_url}
                      alt="Question image"
                      className="max-w-full h-auto rounded-lg border"
                    />
                  </div>
                )}

                <p className="mb-4 text-lg">{currentQuestion.question_text}</p>

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
                            className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all ${isCorrect ? 'bg-green-50 border-green-300 dark:bg-green-950/20' :
                              isWrong ? 'bg-red-50 border-red-300 dark:bg-red-950/20' :
                                isSelected ? 'bg-blue-50 border-blue-300 dark:bg-blue-950/20' :
                                  'hover:bg-gray-50 dark:hover:bg-gray-800'
                              }`}
                          >
                            <RadioGroupItem value={letter} disabled={isSubmitted} />
                            <span className="font-medium mr-2">({letter})</span>
                            <span className="flex-1">{option}</span>
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
                  <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <h4 className="font-semibold text-blue-700 dark:text-blue-400 mb-2">Explanation</h4>
                    <p className="text-sm">{currentQuestion.ai_explanation}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={goToPrev}
              disabled={currentPartIndex === 0 && currentQuestionIndex === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>

            {!isSubmitted ? (
              <Button
                onClick={handleSubmit}
                className="bg-orange-600 hover:bg-orange-700"
              >
                <Send className="w-4 h-4 mr-1" />
                Submit Test
              </Button>
            ) : (
              <Button
                onClick={() => navigate('/toeic')}
              >
                Back to Portal
              </Button>
            )}

            <Button
              variant="outline"
              onClick={goToNext}
              disabled={currentPartIndex === groupedParts.length - 1 && currentQuestionIndex === currentPart.questions.length - 1}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          {/* Question Navigator */}
          <Card className="mt-4">
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Question Navigator</CardTitle>
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
                      className={`w-10 h-10 p-0 ${isCorrect ? 'bg-green-100 border-green-300 text-green-700' :
                        isWrong ? 'bg-red-100 border-red-300 text-red-700' :
                          isCurrent ? 'bg-blue-100 border-blue-300' :
                            isAnswered ? 'bg-gray-100' : ''
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
    </div>
  );
};

export default TOEICListeningTest;
