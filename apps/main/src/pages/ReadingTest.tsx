import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Clock, BookOpen, Target, CheckCircle2, ArrowRight } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import StudentLayout from '@/components/StudentLayout';
import TestResults from '@/components/TestResults';
import SpotlightCard from '@/components/SpotlightCard';
import { useThemeStyles } from '@/hooks/useThemeStyles';

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

const ReadingTest = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { testId } = useParams();
  const themeStyles = useThemeStyles();
  const [timeLeft, setTimeLeft] = useState(60 * 60); // 60 minutes
  const [currentPart, setCurrentPart] = useState(1);
  const [testParts, setTestParts] = useState<{[key: number]: TestPart}>({});
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [allQuestions, setAllQuestions] = useState<ReadingQuestion[]>([]);
  const [availableTests, setAvailableTests] = useState<any[]>([]);
  const [testData, setTestData] = useState<any>(null);

  useEffect(() => {
    if (!testId) {
      fetchAvailableTests();
    } else {
      // Extract actual test ID in case it contains part number (format: testId-partNumber)
      const actualTestId = testId.includes('-') ? testId.split('-')[0] : testId;
      fetchReadingTest(actualTestId);
    }
  }, [testId]);

  useEffect(() => {
    if (timeLeft > 0 && !isSubmitted) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !isSubmitted) {
      handleSubmit();
    }
  }, [timeLeft, isSubmitted]);

  const fetchReadingTest = async (testId: string) => {
    try {
      setLoading(true);

      if (!testId || testId === 'random') {
        // Show placeholder for random tests
        const placeholderPart = {
          passage: {
            id: 'placeholder',
            title: 'Reading Test Coming Soon',
            content: 'Reading tests are being updated to the new universal system. Please check back soon!',
            part_number: 1
          },
          questions: []
        };
        
        setTestParts({ 1: placeholderPart });
        setAllQuestions([]);
        return;
      }

      // Use new universal schema - check both module and skill_category
      const { data: test, error: testError } = await supabase
        .from('tests')
        .select('*')
        .eq('id', testId)
        .eq('test_type', 'IELTS')
        .or('module.eq.Reading,skill_category.eq.Reading')
        .maybeSingle();

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

      setTestData(test);

      // Fetch questions for this test
      const { data: questions, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('test_id', testId)
        .order('part_number', { ascending: true })
        .order('question_number_in_part', { ascending: true });

      if (questionsError) throw questionsError;

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
        if (question.question_number_in_part === 0) {
          // This is a title question
          partTitles[question.part_number] = question.question_text;
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
        const partTitle = partTitles[partNumber] || `Reading Passage ${partNumber}`;
        
        partsData[partNumber] = {
          passage: {
            id: `passage-${partNumber}`,
            title: partTitle,
            content: firstQuestion?.passage_text || 'Passage content not available',
            part_number: partNumber,
            test_number: test.test_number || 1
          },
          questions: partQuestions.map((q, idx) => ({
            id: q.id,
            question_number: q.question_number_in_part || idx + 1,
            question_text: q.question_text,
            question_type: q.question_type,
            options: q.choices ? (typeof q.choices === 'string' ? (q.choices.includes(';') ? q.choices.split(';') : [q.choices]) : Array.isArray(q.choices) ? q.choices.map(o => String(o)) : []) : [],
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

      console.log(`✅ Loaded ${Object.keys(partsData).length} parts with ${allQuestionsFormatted.length} total questions`);
      
    } catch (error) {
      console.error('Error fetching test:', error);
      toast({
        title: "Error",
        description: "Failed to load reading test",
        variant: "destructive"
      });
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableTests = async () => {
    setLoading(true);
    try {
      console.log('🔍 Loading available reading tests...');
      
      // Match admin query exactly: filter for tests where module='Reading' OR skill_category='Reading'
      const { data: tests, error: testsError } = await supabase
        .from('tests')
        .select('*')
        .eq('test_type', 'IELTS')
        .or('module.eq.Reading,skill_category.eq.Reading')
        .order('created_at', { ascending: false });

      if (testsError) {
        console.error('❌ Error loading tests:', testsError);
        throw testsError;
      }

      // Fallback: if no tests found with exact match, try case-insensitive filter
      let finalTests = tests || [];
      if (finalTests.length === 0) {
        console.log('🔄 No exact matches, trying case-insensitive search...');
        const { data: allIeltsTests } = await supabase
          .from('tests')
          .select('*')
          .eq('test_type', 'IELTS')
          .order('created_at', { ascending: false });
        
        // Filter client-side exactly like admin does
        finalTests = (allIeltsTests || []).filter((test: any) => 
          test.module === 'Reading' || test.skill_category === 'Reading'
        );
      }

      console.log(`✅ Found ${finalTests.length} available reading tests:`, finalTests.map(t => ({ id: t.id, name: t.test_name, module: t.module, skill_category: t.skill_category })));
      setAvailableTests(finalTests);
    } catch (error) {
      console.error('Error fetching available tests:', error);
      toast({
        title: "Error",
        description: "Failed to load available reading tests.",
        variant: "destructive"
      });
      setAvailableTests([]);
    } finally {
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
    const score = calculateScore();
    const totalQuestions = allQuestions.length;
    
    setIsSubmitted(true);
    setShowResults(true);
    
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

  if (showResults) {
    return (
      <StudentLayout title="Reading Test Results">
        <TestResults 
          score={calculateScore()}
          totalQuestions={allQuestions.length}
          timeTaken={(60 * 60) - timeLeft}
          answers={answers}
          questions={allQuestions}
          onRetake={() => window.location.reload()}
          onContinue={() => navigate('/ielts-portal')}
          testTitle={`Reading Test ${testData?.test_name || testId}`}
        />
      </StudentLayout>
    );
  }

  if (!testId) {
    return (
      <div className="min-h-screen relative">
        <div className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed"
             style={{
               backgroundImage: themeStyles.theme.name === 'note' || themeStyles.theme.name === 'minimalist' || themeStyles.theme.name === 'dark'
                 ? 'none'
                 : `url('https://raw.githubusercontent.com/AlfieAlfiegithu2/alfie-ai-coach/main/public/1000031207.png')`,
               backgroundColor: themeStyles.backgroundImageColor
             }} />
        <div className="relative z-10">
          <StudentLayout title="Available Reading Tests">
            <div className="min-h-screen py-12">
              <div className="container mx-auto px-4">
                <div className="max-w-4xl mx-auto">
                  <div className="mb-8">
                    <h1 className="text-4xl font-bold text-foreground mb-2">IELTS Reading Tests</h1>
                    <p className="text-lg text-muted-foreground">Choose a test to begin your reading practice</p>
                  </div>

                  {availableTests.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {availableTests.map((test) => (
                        <SpotlightCard key={test.id} className="cursor-pointer h-[140px] hover:scale-105 transition-all duration-300 hover:shadow-lg bg-white/80 flex items-center justify-center" onClick={() => navigate(`/reading/${test.id}`)}>
                          <CardContent className="p-3 md:p-4 text-center flex items-center justify-center h-full">
                            <h3 className="font-semibold text-sm">{test.test_name || `Reading Test ${test.test_number || ''}`}</h3>
                          </CardContent>
                        </SpotlightCard>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-lg text-muted-foreground mb-4">No reading tests available yet</p>
                      <Button onClick={() => navigate('/ielts-portal')} variant="outline">
                        Back to Portal
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </StudentLayout>
        </div>
      </div>
    );
  }

  const currentTestPart = testParts[currentPart];
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
                  <span className="font-semibold">Reading Test {Object.keys(testParts).length > 0 ? Object.keys(testParts).length : '1'}</span>
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
          <div className="grid lg:grid-cols-2 gap-6 h-[calc(100vh-280px)]">
            {/* Passage */}
            <Card className="flex flex-col h-full">
              <CardHeader className="flex-shrink-0">
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  {currentTestPart.passage.title}
                </CardTitle>
                <Badge variant="outline" className="w-fit">
                  Part {currentPart} of {Object.keys(testParts).length}
                </Badge>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto">
                <div className="prose prose-sm max-w-none">
                  <div className="whitespace-pre-wrap leading-relaxed">
                    {currentTestPart.passage.content}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Questions */}
            <Card className="flex flex-col h-full">
              <CardHeader className="flex-shrink-0">
                <CardTitle>Questions {currentTestPart.questions[0]?.question_number} - {currentTestPart.questions[currentTestPart.questions.length - 1]?.question_number}</CardTitle>
                <Badge variant="secondary">
                  {currentTestPart.questions.filter(q => answers[q.id]).length}/{currentTestPart.questions.length} answered
                </Badge>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto">
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
                            {question.options.map((option, index) => {
                              // Extract just the Roman numeral or letter from the beginning of the option
                              const optionValue = option.match(/^([ivxlcdm]+|[a-z])\./i)?.[1] || option;
                              return (
                                <div key={index} className="flex items-center space-x-2">
                                  <RadioGroupItem value={optionValue} id={`${question.id}-${index}`} />
                                  <Label htmlFor={`${question.id}-${index}`} className="cursor-pointer">
                                    {option}
                                  </Label>
                                </div>
                              );
                            })}
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
                    <Button onClick={handleSubmit} className="bg-white text-black border-2 border-black hover:bg-black hover:text-white">
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

export default ReadingTest;