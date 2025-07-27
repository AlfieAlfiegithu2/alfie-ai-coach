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
import TestResults from '@/components/TestResults';

interface ReadingPassage {
  id: string;
  title: string;
  content: string;
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
  const [showResults, setShowResults] = useState(false);
  const [currentPart, setCurrentPart] = useState(1);
  const [completedParts, setCompletedParts] = useState<number[]>([]);
  const [allPartsData, setAllPartsData] = useState<{[key: number]: {passage: ReadingPassage, questions: ReadingQuestion[]}}>({});

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

  // Reset test data on component mount (start fresh)
  useEffect(() => {
    console.log('🔄 Fresh Start: Clearing any saved test data for fresh test experience');
    localStorage.removeItem(`reading-test-${testId}`);
  }, [testId]);

  const fetchReadingTest = async () => {
    try {
      let passage = null;
      
      if (testId && testId !== 'random') {
        // Load specific passage by ID
        const { data: passages, error: passageError } = await supabase
          .from('reading_passages')
          .select('*')
          .eq('id', testId);
        
        if (passageError) throw passageError;
        passage = passages?.[0] || null;
      } else {
        // For random selection, only get passages that have questions
        console.log('🔍 DEBUG: Fetching passages with questions...');
        
        const { data: passagesWithQuestions, error: passageError } = await supabase
          .from('reading_passages')
          .select(`
            *,
            reading_questions!inner(id)
          `)
          .order('cambridge_book', { ascending: false })
          .order('section_number', { ascending: true })
          .order('part_number', { ascending: true })
          .limit(10);
        
        if (passageError) throw passageError;
        
        if (passagesWithQuestions && passagesWithQuestions.length > 0) {
          // Select the first passage that has questions
          passage = passagesWithQuestions[0];
          console.log('✓ Found passage with questions:', passage.cambridge_book, 'Section', passage.section_number, 'Part', passage.part_number);
        }
      }

      if (passage) {
        console.log('✓ Found passage:', passage.id, passage.title, 'Book:', passage.cambridge_book, 'Section:', passage.section_number, 'Part:', passage.part_number);
        setCurrentPassage({
          id: passage.id,
          title: passage.title,
          content: passage.content,
          passage_type: passage.passage_type || 'academic',
          cambridge_book: passage.cambridge_book,
          test_number: passage.test_number,
          part_number: passage.part_number || 1
        });

        // Store in allPartsData for sequential flow
        setAllPartsData(prev => ({
          ...prev,
          [passage.part_number || 1]: {
            passage: {
              id: passage.id,
              title: passage.title,
              content: passage.content,
              passage_type: passage.passage_type || 'academic',
              cambridge_book: passage.cambridge_book,
              test_number: passage.test_number,
              part_number: passage.part_number || 1
            },
            questions: []
          }
        }));

        // Generalized enhanced question fetching (based on successful C19 fix)
        console.log('🔍 GENERALIZED SYNC: Fetching questions for passage:', passage.id, 'Book:', passage.cambridge_book, 'Section:', passage.section_number, 'Part:', passage.part_number);
        
        let finalQuestionsData = null;
        
        // Strategy 1: Try passage_id first (primary method)
        const { data: passageQuestions, error: passageError } = await supabase
          .from('reading_questions')
          .select('*')
          .eq('passage_id', passage.id)
          .order('question_number');

        if (!passageError && passageQuestions && passageQuestions.length > 0) {
          finalQuestionsData = passageQuestions;
          console.log(`✓ GENERALIZED SYNC: Found ${passageQuestions.length} questions by passage_id for ${passage.cambridge_book}`);
        } else {
          console.log('🔄 GENERALIZED SYNC: No questions by passage_id, trying enhanced book/section/part lookup...');
          
          // Strategy 2: Enhanced book/section/part matching with multiple format attempts
          if (passage.cambridge_book && passage.section_number !== undefined && passage.part_number !== undefined) {
            // Extract book number and try multiple formats (generalized C19 approach)
            const bookNum = passage.cambridge_book.replace(/[^0-9]/g, '');
            const bookFormats = [
              passage.cambridge_book, // Original format (e.g., "C19")
              `C${bookNum}`, // Standard format
              bookNum, // Just number
              `c${bookNum}`, // Lowercase
              `Cambridge ${bookNum}` // Full format
            ];
            
            for (const bookFormat of bookFormats) {
              console.log(`🔄 GENERALIZED SYNC: Trying book format "${bookFormat}" for section ${passage.section_number}, part ${passage.part_number}`);
              const { data: formatQuestions, error: formatError } = await supabase
                .from('reading_questions')
                .select('*')
                .eq('cambridge_book', bookFormat)
                .eq('section_number', passage.section_number)
                .eq('part_number', passage.part_number)
                .order('question_number');
              
              if (!formatError && formatQuestions && formatQuestions.length > 0) {
                finalQuestionsData = formatQuestions;
                console.log(`✅ GENERALIZED SYNC: Found ${formatQuestions.length} questions with book format "${bookFormat}" - SYNC SUCCESS!`);
                break;
              }
            }
            
            // Strategy 3: Fallback - try without section/part constraints
            if (!finalQuestionsData) {
              console.log('🔄 GENERALIZED SYNC: Trying fallback without section/part constraints...');
              for (const bookFormat of bookFormats) {
                const { data: fallbackQuestions, error: fallbackError } = await supabase
                  .from('reading_questions')
                  .select('*')
                  .eq('cambridge_book', bookFormat)
                  .order('question_number');
                
                if (!fallbackError && fallbackQuestions && fallbackQuestions.length > 0) {
                  finalQuestionsData = fallbackQuestions;
                  console.log(`🆘 GENERALIZED SYNC: Found ${fallbackQuestions.length} questions with fallback for "${bookFormat}"`);
                  break;
                }
              }
            }
          }
        }

        console.log('🔍 GENERALIZED SYNC: Final result -', finalQuestionsData?.length || 0, 'questions found');

        if (finalQuestionsData && finalQuestionsData.length > 0) {
          const formattedQuestions: ReadingQuestion[] = finalQuestionsData.map(q => {
            console.log('✓ GENERALIZED SYNC: Processing question', q.question_number, q.question_type, q.options);
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
          console.log('🎉 GENERALIZED SYNC: Successfully formatted', formattedQuestions.length, 'questions for', passage.cambridge_book);
          setQuestions(formattedQuestions);

          // Store questions in allPartsData
          setAllPartsData(prev => ({
            ...prev,
            [passage.part_number || 1]: {
              ...prev[passage.part_number || 1],
              questions: formattedQuestions
            }
          }));
        } else {
          console.error('❌ GENERALIZED SYNC: No questions found for passage:', passage.id, 'Book:', passage.cambridge_book);
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

      // Start fresh - no saved answers loaded
      console.log('🔄 Fresh Start: Starting test with no saved answers for clean experience');

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

  const handleGoToNextPart = () => {
    // Mark current part as completed
    setCompletedParts(prev => [...prev, currentPart]);
    
    // Check if this is the final part (Part 3 for Reading)
    if (currentPart >= 3) {
      handleSubmit();
      return;
    }

    // Go to next part
    const nextPart = currentPart + 1;
    setCurrentPart(nextPart);
    
    // Load next part data or fetch if needed
    if (allPartsData[nextPart]) {
      setCurrentPassage(allPartsData[nextPart].passage);
      setQuestions(allPartsData[nextPart].questions);
    } else {
      // Fetch next part
      fetchPartData(nextPart);
    }
    
    console.log(`📝 Sequential Flow: Moving from Part ${currentPart} to Part ${nextPart}`);
  };

  const handleSubmit = () => {
    // Calculate score from all completed parts
    let totalScore = 0;
    let totalQuestions = 0;
    
    // Add current part to completed parts for final calculation
    const allParts = [...completedParts, currentPart];
    allParts.forEach(partNum => {
      if (allPartsData[partNum]) {
        const partQuestions = allPartsData[partNum].questions;
        totalQuestions += partQuestions.length;
        partQuestions.forEach(q => {
          if (answers[q.id]?.toLowerCase().trim() === q.correct_answer?.toLowerCase().trim()) {
            totalScore++;
          }
        });
      }
    });
    
    // Include current questions if not in allPartsData
    if (!allPartsData[currentPart]) {
      totalQuestions += questions.length;
      questions.forEach(q => {
        if (answers[q.id]?.toLowerCase().trim() === q.correct_answer?.toLowerCase().trim()) {
          totalScore++;
        }
      });
    }

    setScore(totalScore);
    setIsSubmitted(true);
    setShowConfirmDialog(false);
    setShowResults(true);
    
    // Clear saved answers
    localStorage.removeItem(`reading-test-${testId}`);
    
    console.log('🎯 Sequential Flow: Test completed with all parts. Final score:', totalScore, 'out of', totalQuestions, 'questions');
  };

  const fetchPartData = async (partNumber: number) => {
    try {
      console.log(`🔍 Sequential Flow: Fetching data for Part ${partNumber}`);
      
      if (!currentPassage) return;
      
      // Fixed part fetching - use test_number instead of section_number for consistency
      const { data: passages, error: passageError } = await supabase
        .from('reading_passages')
        .select('*')
        .eq('cambridge_book', currentPassage.cambridge_book)
        .eq('test_number', currentPassage.test_number)
        .eq('part_number', partNumber);
      
      if (passageError) throw passageError;
      
      const passage = passages?.[0];
      if (!passage) {
        toast({
          title: "Part Not Available",
          description: `Part ${partNumber} is not available for this test.`,
          variant: "destructive"
        });
        return;
      }
      
      // Enhanced question fetching using the same generalized method that fixed C19
      console.log(`🔍 Sequential Flow: Fetching questions for Part ${partNumber} using generalized sync method`);
      
      let finalQuestionsData = null;
      
      // Strategy 1: Try passage_id first
      const { data: passageQuestions, error: questionsError } = await supabase
        .from('reading_questions')
        .select('*')
        .eq('passage_id', passage.id)
        .order('question_number');
      
      if (!questionsError && passageQuestions && passageQuestions.length > 0) {
        finalQuestionsData = passageQuestions;
        console.log(`✅ Sequential Flow: Found ${passageQuestions.length} questions by passage_id for Part ${partNumber}`);
      } else {
        // Strategy 2: Enhanced book/section/part matching (generalized C19 approach)
        console.log(`🔄 Sequential Flow: No questions by passage_id, trying enhanced lookup for Part ${partNumber}...`);
        
        if (passage.cambridge_book && passage.test_number !== undefined && partNumber !== undefined) {
          const bookNum = passage.cambridge_book.replace(/[^0-9]/g, '');
          const bookFormats = [
            passage.cambridge_book,
            `C${bookNum}`,
            bookNum,
            `c${bookNum}`,
            `Cambridge ${bookNum}`
          ];
          
          for (const bookFormat of bookFormats) {
            console.log(`🔄 Sequential Flow: Trying book format "${bookFormat}" for test ${passage.test_number}, part ${partNumber}`);
            const { data: formatQuestions, error: formatError } = await supabase
              .from('reading_questions')
              .select('*')
              .eq('cambridge_book', bookFormat)
              .eq('section_number', passage.test_number)
              .eq('part_number', partNumber)
              .order('question_number');
            
            if (!formatError && formatQuestions && formatQuestions.length > 0) {
              finalQuestionsData = formatQuestions;
              console.log(`✅ Sequential Flow: Found ${formatQuestions.length} questions with book format "${bookFormat}" for Part ${partNumber}`);
              break;
            }
          }
        }
      }
      
      if (finalQuestionsData && finalQuestionsData.length > 0) {
        const formattedPassage = {
          id: passage.id,
          title: passage.title,
          content: passage.content,
          passage_type: passage.passage_type || 'academic',
          cambridge_book: passage.cambridge_book,
          test_number: passage.test_number,
          part_number: passage.part_number || partNumber
        };
        
        const formattedQuestions = finalQuestionsData.map(q => ({
          id: q.id,
          question_number: q.question_number,
          question_text: q.question_text,
          question_type: q.question_type,
          options: q.options ? (Array.isArray(q.options) ? q.options.map(o => String(o)) : typeof q.options === 'string' ? q.options.split(';') : undefined) : undefined,
          correct_answer: q.correct_answer,
          explanation: q.explanation,
          passage_id: q.passage_id
        }));
        
        // Store in allPartsData
        setAllPartsData(prev => ({
          ...prev,
          [partNumber]: {
            passage: formattedPassage,
            questions: formattedQuestions
          }
        }));
        
        // Set current data
        setCurrentPassage(formattedPassage);
        setQuestions(formattedQuestions);
        
        console.log(`✅ Sequential Flow: Successfully loaded Part ${partNumber} with ${formattedQuestions.length} questions`);
      } else {
        toast({
          title: "No Questions Found",
          description: `No questions found for Part ${partNumber}`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error(`❌ Sequential Flow: Error fetching Part ${partNumber}:`, error);
      toast({
        title: "Error",
        description: `Failed to load Part ${partNumber}`,
        variant: "destructive"
      });
    }
  };

  const handleRetake = () => {
    setAnswers({});
    setScore(0);
    setIsSubmitted(false);
    setShowResults(false);
    setTimeLeft(60 * 60);
    setCurrentPart(1);
    setCompletedParts([]);
    localStorage.removeItem(`reading-test-${testId}`);
  };

  const handleContinuePractice = () => {
    navigate('/content-selection/reading');
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
    if (percentage >= 10) return "4.5";
    return "4.0";
  };

  if (loading) {
    return (
      <StudentLayout title="Reading Test">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gentle-blue mx-auto mb-4"></div>
            <p className="text-warm-gray">Loading reading test...</p>
          </div>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout title="Reading Test">
      {showResults ? (
        <TestResults 
          score={score}
          totalQuestions={questions.length}
          answers={answers}
          questions={questions}
          onRetake={handleRetake}
          onContinue={handleContinuePractice}
        />
      ) : (
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-6">
                <Button variant="ghost" onClick={() => navigate("/content-selection/reading")}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Reading
                </Button>
                <div className="flex items-center gap-3">
                  <BookOpen className="w-6 h-6 text-gentle-blue" />
                  <h1 className="text-3xl font-georgia font-bold">Reading Test</h1>
                  {currentPassage && (
                    <Badge variant="outline" className="ml-2">
                      {currentPassage.cambridge_book} - Section {currentPassage.test_number}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4" />
                  <span className={`font-mono ${timeLeft < 600 ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                  </span>
                </div>
                <Button 
                  variant="destructive" 
                  onClick={() => setShowConfirmDialog(true)}
                  disabled={loading}
                >
                  Submit Test
                </Button>
              </div>
            </div>

            {/* Part Navigation Tabs - Jumpable Parts */}
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center justify-center gap-4">
                  {[1, 2, 3].map((partNum) => (
                    <Button
                      key={partNum}
                      variant={currentPart === partNum ? "default" : "outline"}
                      onClick={() => {
                        if (allPartsData[partNum]) {
                          setCurrentPart(partNum);
                          setCurrentPassage(allPartsData[partNum].passage);
                          setQuestions(allPartsData[partNum].questions);
                          console.log(`🎯 Jumpable Parts: Jumped to Part ${partNum}`);
                        } else {
                          fetchPartData(partNum);
                          setCurrentPart(partNum);
                        }
                      }}
                      disabled={loading}
                      className="flex flex-col h-auto p-4 min-w-[120px]"
                    >
                      <span className="font-semibold">Part {partNum}</span>
                      <span className="text-xs opacity-75">
                        {allPartsData[partNum] ? '✅ Loaded' : '⏳ Available'}
                      </span>
                    </Button>
                  ))}
                </div>
              </CardHeader>
            </Card>

            {/* Reading Passage and Questions UI */}
            
            {currentPassage && questions.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Reading Passage */}
                <Card className="h-fit">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 font-georgia">
                      <FileText className="w-5 h-5 text-gentle-blue" />
                      {currentPassage.title}
                    </CardTitle>
                    <div className="flex gap-2">
                      <Badge variant="outline">Part {currentPassage.part_number}</Badge>
                      <Badge variant="outline">{currentPassage.passage_type}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm max-w-none">
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">
                        {currentPassage.content}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Questions */}
                <Card className="h-fit">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between font-georgia">
                      <span className="flex items-center gap-2">
                        <Target className="w-5 h-5 text-warm-coral" />
                        Questions {questions[0]?.question_number} - {questions[questions.length - 1]?.question_number}
                      </span>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setShowExplanations(!showExplanations)}
                      >
                        {showExplanations ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        {showExplanations ? 'Hide' : 'Show'} Help
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {questions.map((question, index) => (
                      <div key={question.id} className="border-b border-light-border pb-6 last:border-b-0">
                        <div className="mb-3">
                          <div className="flex items-start gap-3 mb-2">
                            <Badge variant="outline" className="mt-1">
                              {question.question_number}
                            </Badge>
                            <p className="text-sm font-medium leading-relaxed flex-1">
                              {question.question_text}
                            </p>
                          </div>
                          <div className="ml-12">
                            <Badge variant="outline" className="text-xs">
                              {question.question_type}
                            </Badge>
                          </div>
                        </div>

                        <div className="ml-12">
                          {question.options && question.options.length > 0 ? (
                            <div className="space-y-2">
                              {question.options.map((option, optIndex) => (
                                <label key={optIndex} className="flex items-center gap-3 cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`question-${question.id}`}
                                    value={option}
                                    checked={answers[question.id] === option}
                                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                                    className="w-4 h-4 text-gentle-blue"
                                  />
                                  <span className="text-sm">{option}</span>
                                </label>
                              ))}
                            </div>
                          ) : (
                            <Input
                              placeholder="Type your answer..."
                              value={answers[question.id] || ''}
                              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                              className="rounded-xl border-light-border"
                            />
                          )}

                          {showExplanations && (
                            <div className="mt-3 p-3 bg-warm-coral/10 border border-warm-coral/20 rounded-lg">
                              <p className="text-sm">
                                <span className="font-medium text-warm-coral">Hint:</span> {question.explanation}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    <div className="flex justify-between pt-6">
                      <div className="text-sm text-warm-gray">
                        Answered: {Object.keys(answers).length} / {questions.length}
                      </div>
                      
                      {currentPart < 3 ? (
                        <Button 
                          onClick={handleGoToNextPart}
                          disabled={Object.keys(answers).length < questions.length}
                          className="rounded-xl"
                          style={{ background: 'var(--gradient-button)', border: 'none' }}
                        >
                          Complete Part {currentPart} & Continue
                        </Button>
                      ) : (
                        <Button 
                          onClick={() => setShowConfirmDialog(true)}
                          disabled={Object.keys(answers).length < questions.length}
                          variant="destructive"
                          className="rounded-xl"
                        >
                          Submit Final Test
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Submit Confirmation Dialog */}
            <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Submit Reading Test</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to submit your test? You have answered {Object.keys(answers).length} out of {questions.length} questions.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
                    Continue Test
                  </Button>
                  <Button variant="destructive" onClick={handleSubmit}>
                    Submit Test
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      )}
    </StudentLayout>
  );
};

export default ReadingTest;
