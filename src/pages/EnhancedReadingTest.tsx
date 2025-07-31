import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, Clock, BookOpen, Target, CheckCircle2, ArrowRight, Plus, Languages } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import StudentLayout from '@/components/StudentLayout';
import TestResults from '@/components/TestResults';

interface ReadingPassage {
  id: string;
  title: string;
  content: string;
  part_number: number;
  cambridge_book?: string;
  test_number?: number;
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
  part_number: number;
}

interface TestPart {
  passage: ReadingPassage;
  questions: ReadingQuestion[];
}

const EnhancedReadingTest = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { testId } = useParams();
  const [timeLeft, setTimeLeft] = useState(60 * 60); // 60 minutes
  const [currentPart, setCurrentPart] = useState(1);
  const [testParts, setTestParts] = useState<{[key: number]: TestPart}>({});
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [allQuestions, setAllQuestions] = useState<ReadingQuestion[]>([]);
  const [selectedWord, setSelectedWord] = useState<string>('');
  const [showDictionary, setShowDictionary] = useState(false);

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

  const fetchReadingTest = async () => {
    try {
      if (!testId || testId === 'random') {
        toast({
          title: "Invalid Test",
          description: "Please select a specific test from the portal.",
          variant: "destructive"
        });
        navigate(-1);
        return;
      }

      // Fetch the test first
      const { data: test, error: testError } = await supabase
        .from('tests')
        .select('*')
        .eq('id', testId)
        .single();

      if (testError) throw testError;

      if (!test) {
        toast({
          title: "Test Not Found",
          description: "This test doesn't exist. Please check the test ID.",
          variant: "destructive"
        });
        navigate(-1);
        return;
      }

      // Fetch all questions for this test
      const { data: questions, error: questionError } = await supabase
        .from('questions')
        .select('*')
        .eq('test_id', testId)
        .order('part_number', { ascending: true })
        .order('question_number_in_part', { ascending: true });

      if (questionError) throw questionError;

      if (!questions || questions.length === 0) {
        toast({
          title: "No Questions Available",
          description: "This test doesn't have questions yet. Please contact your instructor.",
          variant: "destructive"
        });
        navigate(-1);
        return;
      }

      // Organize data by parts
      const partsData: {[key: number]: TestPart} = {};
      const allQuestionsFormatted: ReadingQuestion[] = [];

      // Group questions by part
      const partsByNumber: {[key: number]: any[]} = {};
      const partTitles: {[key: number]: string} = {};
      
      questions.forEach(question => {
        // Skip questions with question_number_in_part = 0 as they are title placeholders
        if (question.question_number_in_part === 0) {
          return;
        }
        
        if (!partsByNumber[question.part_number]) {
          partsByNumber[question.part_number] = [];
        }
        partsByNumber[question.part_number].push(question);
      });

      // Create test parts from questions
      Object.entries(partsByNumber).forEach(([partNum, partQuestions]) => {
        const partNumber = parseInt(partNum);
        const firstQuestion = partQuestions[0];
        
        // Extract title from passage text if available - look for first line as title
        let passageTitle = `Reading Passage ${partNumber}`;
        if (firstQuestion?.passage_text) {
          const lines = firstQuestion.passage_text.split('\n');
          const firstLine = lines[0]?.trim();
          if (firstLine && firstLine.length < 200 && !firstLine.includes('.')) {
            passageTitle = firstLine;
          }
        }
        
        partsData[partNumber] = {
          passage: {
            id: `passage-${partNumber}`,
            title: passageTitle,
            content: firstQuestion?.passage_text || 'Passage content not available',
            part_number: partNumber,
            test_number: parseInt(testId)
          },
          questions: partQuestions.map(q => ({
            id: q.id,
            question_number: q.question_number_in_part,
            question_text: q.question_text,
            question_type: q.question_type,
            options: q.choices ? (Array.isArray(q.choices) ? q.choices.map(o => String(o)) : q.choices.split(';')) : [],
            correct_answer: q.correct_answer,
            explanation: q.explanation || '',
            passage_id: `passage-${partNumber}`,
            part_number: q.part_number
          }))
        };

        allQuestionsFormatted.push(...partsData[partNumber].questions);
      });

      setTestParts(partsData);
      setAllQuestions(allQuestionsFormatted);
      setLoading(false);

      console.log(`✅ Loaded ${Object.keys(partsData).length} parts with ${allQuestionsFormatted.length} total questions`);
      
    } catch (error) {
      console.error('Error fetching test:', error);
      toast({
        title: "Error",
        description: "Failed to load reading test",
        variant: "destructive"
      });
      setLoading(false);
      navigate(-1);
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
    allQuestions.forEach(question => {
      const userAnswer = answers[question.id]?.toLowerCase().trim();
      const correctAnswer = question.correct_answer.toLowerCase().trim();
      
      if (userAnswer === correctAnswer) {
        correct++;
      }
    });
    return correct;
  };

  const handlePartNavigation = (partNumber: number) => {
    if (testParts[partNumber]) {
      setCurrentPart(partNumber);
    }
  };

  const handleSubmit = async () => {
    // Show completion animation first
    setIsSubmitted(true);
    
    // Show test completion modal/toast
    toast({
      title: "🎉 Test Completed!",
      description: "Processing your results...",
      duration: 2000,
    });
    
    const score = calculateScore();
    const totalQuestions = allQuestions.length;
    
    // Save test result to database
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && testParts[1]?.passage) {
        const testResult = {
          user_id: user.id,
          test_type: 'reading',
          section_number: 1,
          total_questions: totalQuestions,
          correct_answers: score,
          score_percentage: (score / totalQuestions) * 100,
          time_taken: (60 * 60) - timeLeft,
          test_data: {
            answers,
            all_questions: allQuestions.map(q => ({
              id: q.id,
              question_number: q.question_number,
              question_type: q.question_type,
              question_text: q.question_text,
              correct_answer: q.correct_answer,
              explanation: q.explanation
            })),
            completed_parts: Object.keys(testParts).map(p => parseInt(p))
          }
        };

        const { error } = await supabase
          .from('test_results')
          .insert(testResult);

        if (error) {
          console.error('Error saving test result:', error);
        } else {
          console.log('✅ Test result saved successfully');
        }
      }
    } catch (error) {
      console.error('Error saving test result:', error);
    }
    
    // Delay showing results to show completion animation
    setTimeout(() => {
      setShowResults(true);
    }, 2000);
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getAnsweredQuestionsInPart = (partNumber: number) => {
    if (!testParts[partNumber]) return 0;
    return testParts[partNumber].questions.filter(q => answers[q.id]).length;
  };

  const getTotalAnswered = () => {
    return Object.keys(answers).length;
  };

  const getQuestionRange = () => {
    if (!currentTestPart?.questions || currentTestPart.questions.length === 0) return "";
    const questionNumbers = currentTestPart.questions
      .map(q => q.question_number)
      .filter(num => num > 0)
      .sort((a, b) => a - b);
    
    if (questionNumbers.length === 0) return "";
    if (questionNumbers.length === 1) return questionNumbers[0].toString();
    return `${questionNumbers[0]} - ${questionNumbers[questionNumbers.length - 1]}`;
  };

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      const selectedText = selection.toString().trim();
      if (selectedText.length > 0 && selectedText.split(' ').length <= 3) {
        setSelectedWord(selectedText);
        setShowDictionary(true);
      }
    }
  };

  const saveWordToDictionary = async (word: string, translation?: string) => {
    // For now, just show a toast. Table will be created later.
    toast({
      title: "Word Selected",
      description: `"${word}" selected for dictionary. Feature coming soon!`,
    });
    setShowDictionary(false);
  };

  if (loading) {
    return (
    <StudentLayout title="Loading Reading Test">
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading Reading Test...</p>
        </div>
      </div>
    </StudentLayout>
  );
  }

  const currentTestPart = testParts[currentPart];

  if (showResults) {
    const score = calculateScore();
    const totalQuestions = allQuestions.length;
    const percentage = Math.round((score / totalQuestions) * 100);
    
    return (
      <StudentLayout title="Reading Test Results">
        <div className="min-h-screen bg-background">
          {/* Results Header */}
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
            <div className="container mx-auto px-4 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button variant="ghost" onClick={() => navigate('/ielts-portal')}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Portal
                  </Button>
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-primary" />
                    <span className="font-semibold">Reading Test 1 - Results</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  <Badge variant={percentage >= 70 ? "default" : percentage >= 50 ? "secondary" : "destructive"}>
                    {score}/{totalQuestions} ({percentage}%)
                  </Badge>
                  <Button onClick={() => window.location.reload()} variant="outline">
                    Retake Test
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="container mx-auto px-4 py-6">
            <div className="grid lg:grid-cols-2 gap-6" style={{ height: 'calc(100vh - 280px)' }}>
              {/* Passage */}
              <Card className="flex flex-col" style={{ height: 'calc(100vh - 280px)' }}>
                <CardHeader className="flex-shrink-0">
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    {currentTestPart?.passage?.title || "Reading Passage"}
                  </CardTitle>
                  <Badge variant="outline" className="w-fit">
                    Part {currentPart} of {Object.keys(testParts).length}
                  </Badge>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto">
                  <div className="prose prose-sm max-w-none">
                    <div className="whitespace-pre-wrap leading-relaxed passage-content">
                      {currentTestPart?.passage?.content || "Passage content not available"}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Questions with Explanations */}
              <Card className="flex flex-col" style={{ height: 'calc(100vh - 280px)' }}>
                <CardHeader className="flex-shrink-0">
                  <CardTitle>Questions with Explanations</CardTitle>
                  <Badge variant="secondary">
                    Test Completed
                  </Badge>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto">
                  <div className="space-y-6 pb-6">
                    {currentTestPart?.questions?.map((question) => {
                      const userAnswer = answers[question.id] || 'No answer';
                      const isCorrect = userAnswer.toLowerCase().trim() === question.correct_answer.toLowerCase().trim();
                      
                      return (
                        <div key={question.id} className="border-b pb-4 last:border-b-0">
                          <div className="flex items-start gap-3">
                            <Badge variant={isCorrect ? "default" : "destructive"} className="mt-1">
                              {question.question_number}
                            </Badge>
                            <div className="flex-1 space-y-3">
                              <p className="font-medium leading-relaxed">
                                {question.question_text}
                              </p>
                              
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">Your answer:</span>
                                  <Badge variant={isCorrect ? "default" : "destructive"}>
                                    {userAnswer}
                                  </Badge>
                                </div>
                                
                                {!isCorrect && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">Correct answer:</span>
                                    <Badge variant="default">
                                      {question.correct_answer}
                                    </Badge>
                                  </div>
                                )}
                                
                                {question.explanation && (
                                  <div 
                                    className="bg-muted p-3 rounded-md cursor-pointer hover:bg-muted/80 transition-colors"
                                    onMouseEnter={() => {
                                      // Highlight text in passage when hovering over explanation
                                      const passageElement = document.querySelector('.passage-content');
                                      if (passageElement && question.explanation) {
                                        // This is a placeholder for highlighting functionality
                                        // In a real implementation, you'd search for relevant text in the passage
                                        console.log('Hovering over explanation for question:', question.question_number);
                                      }
                                    }}
                                  >
                                    <p className="text-sm font-medium mb-1">Explanation:</p>
                                    <p className="text-sm text-muted-foreground">
                                      {question.explanation}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }) || []}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </StudentLayout>
    );
  }
  if (!currentTestPart) {
    return (
      <StudentLayout title="Reading Test - Part Not Available">
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg text-muted-foreground">Part {currentPart} not available</p>
            <Button onClick={() => setCurrentPart(1)} className="mt-4">
              Go to Part 1
            </Button>
          </div>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout title={`Reading Test ${testId} - Part ${currentPart}`}>
      <div className="min-h-screen bg-background">
        {/* Header with Timer and Progress */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => navigate('/ielts-portal')}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Portal
                </Button>
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" />
                  <span className="font-semibold">IELTS Reading Test</span>
                </div>
              </div>
              
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="font-mono text-lg">{formatTime(timeLeft)}</span>
                </div>
                <Badge variant="outline">
                  {getTotalAnswered()}/{allQuestions.length} answered
                </Badge>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-2">
                <span>Overall Progress</span>
                <span>{Math.round((getTotalAnswered() / allQuestions.length) * 100)}%</span>
              </div>
              <Progress value={(getTotalAnswered() / allQuestions.length) * 100} className="h-2" />
            </div>

            {/* Part Navigation */}
            <div className="flex items-center justify-center gap-4 mt-4">
              {Object.keys(testParts).map(partNum => {
                const partNumber = parseInt(partNum);
                return (
                  <Button
                    key={partNumber}
                    variant={currentPart === partNumber ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePartNavigation(partNumber)}
                    className="relative"
                  >
                    Part {partNumber}
                    <Badge 
                      variant="secondary" 
                      className="ml-2 text-xs"
                    >
                      {getAnsweredQuestionsInPart(partNumber)}/{testParts[partNumber].questions.length}
                    </Badge>
                    {getAnsweredQuestionsInPart(partNumber) === testParts[partNumber]?.questions.length && (
                      <CheckCircle2 className="w-4 h-4 text-green-500 absolute -top-1 -right-1" />
                    )}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Passage */}
            <Card className="flex flex-col h-[calc(100vh-280px)]">
              <CardHeader className="flex-shrink-0">
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  {currentTestPart.passage.title}
                </CardTitle>
                <Badge variant="outline" className="w-fit">
                  Part {currentPart} of {Object.keys(testParts).length}
                </Badge>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto min-h-0">
                <div className="prose prose-sm max-w-none relative">
                  <div className="whitespace-pre-wrap leading-relaxed select-text" onMouseUp={handleTextSelection}>
                    {currentTestPart.passage.content}
                  </div>
                  
                  {/* Dictionary Popup */}
                  {showDictionary && selectedWord && (
                    <Popover open={showDictionary} onOpenChange={setShowDictionary}>
                      <PopoverTrigger asChild>
                        <div className="absolute top-0 left-0 invisible" />
                      </PopoverTrigger>
                      <PopoverContent className="w-80" align="start">
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <Languages className="w-4 h-4" />
                            <h4 className="font-semibold">Selected Word</h4>
                          </div>
                          <div className="space-y-2">
                            <p className="text-sm">
                              <strong>Word:</strong> "{selectedWord}"
                            </p>
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                onClick={() => saveWordToDictionary(selectedWord)}
                                className="flex items-center gap-1"
                              >
                                <Plus className="w-3 h-3" />
                                Save to Dictionary
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => setShowDictionary(false)}
                              >
                                Close
                              </Button>
                            </div>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Questions */}
            <Card className="flex flex-col h-[calc(100vh-280px)]">
              <CardHeader className="flex-shrink-0">
                <CardTitle>Questions {getQuestionRange()}</CardTitle>
                <Badge variant="secondary">
                  {currentTestPart.questions.filter(q => answers[q.id]).length}/{currentTestPart.questions.length} answered
                </Badge>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto min-h-0">
                <div className="space-y-6 pb-6">
                  {currentTestPart.questions.map((question) => {
                    const renderAnswerInput = () => {
                      // Check if it's a True/False/Not Given question
                      if (question.question_type?.toLowerCase().includes('true') || 
                          question.question_text?.toLowerCase().includes('true') ||
                          question.question_text?.toLowerCase().includes('false') ||
                          question.question_text?.toLowerCase().includes('not given')) {
                        return (
                          <RadioGroup
                            value={answers[question.id] || ''}
                            onValueChange={(value) => handleAnswerChange(question.id, value)}
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="True" id={`${question.id}-true`} />
                              <Label htmlFor={`${question.id}-true`} className="cursor-pointer">True</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="False" id={`${question.id}-false`} />
                              <Label htmlFor={`${question.id}-false`} className="cursor-pointer">False</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="Not Given" id={`${question.id}-notgiven`} />
                              <Label htmlFor={`${question.id}-notgiven`} className="cursor-pointer">Not Given</Label>
                            </div>
                          </RadioGroup>
                        );
                      }
                      
                      // Check if it has predefined options
                      if (question.options && question.options.length > 0) {
                        return (
                          <RadioGroup
                            value={answers[question.id] || ''}
                            onValueChange={(value) => handleAnswerChange(question.id, value)}
                          >
                            {question.options.map((option, index) => (
                              <div key={index} className="flex items-center space-x-2">
                                <RadioGroupItem value={option} id={`${question.id}-${index}`} />
                                <Label htmlFor={`${question.id}-${index}`} className="cursor-pointer">
                                  {option}
                                </Label>
                              </div>
                            ))}
                          </RadioGroup>
                        );
                      }
                      
                      // Default to text input
                      return (
                        <Input
                          value={answers[question.id] || ''}
                          onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                          placeholder="Type your answer here..."
                          className="max-w-md"
                        />
                      );
                    };

                    return (
                      <div key={question.id} className="border-b pb-4 last:border-b-0">
                        <div className="flex items-start gap-3">
                          <Badge variant="outline" className="mt-1">
                            {question.question_number}
                          </Badge>
                          <div className="flex-1 space-y-3">
                            <p className="font-medium leading-relaxed">
                              {question.question_text}
                            </p>
                            {renderAnswerInput()}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
              
              {/* Part Navigation - Fixed at bottom */}
              <div className="flex-shrink-0 border-t p-4">
                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => handlePartNavigation(currentPart - 1)}
                    disabled={currentPart === 1}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Previous Part
                  </Button>
                  
                  {currentPart === Object.keys(testParts).length ? (
                    <Button onClick={handleSubmit} className="bg-primary hover:bg-primary/90">
                      Submit Test
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handlePartNavigation(currentPart + 1)}
                      disabled={!testParts[currentPart + 1]}
                    >
                      Next Part
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </StudentLayout>
  );
};

export default EnhancedReadingTest;