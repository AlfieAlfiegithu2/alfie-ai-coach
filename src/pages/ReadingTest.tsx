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
      
      // Enhanced part fetching using generalized sync method (same as successful C19 fix)
      const { data: passages, error: passageError } = await supabase
        .from('reading_passages')
        .select('*')
        .eq('cambridge_book', currentPassage.cambridge_book)
        .eq('section_number', currentPassage.test_number)
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
        
        if (passage.cambridge_book && passage.section_number !== undefined && partNumber !== undefined) {
          const bookNum = passage.cambridge_book.replace(/[^0-9]/g, '');
          const bookFormats = [
            passage.cambridge_book,
            `C${bookNum}`,
            bookNum,
            `c${bookNum}`,
            `Cambridge ${bookNum}`
          ];
          
          for (const bookFormat of bookFormats) {
            console.log(`🔄 Sequential Flow: Trying book format "${bookFormat}" for section ${passage.section_number}, part ${partNumber}`);
            const { data: formatQuestions, error: formatError } = await supabase
              .from('reading_questions')
              .select('*')
              .eq('cambridge_book', bookFormat)
              .eq('section_number', passage.section_number)
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
      <div key={question.id} className="border-b border-light-border pb-4 last:border-b-0">
        <div className="flex items-start gap-3 mb-3">
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
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
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

            {(question.question_type === 'True/False/Not Given' || question.question_type === 'true_false_not_given') && (
              <div className="space-y-2">
                {(question.options || ['TRUE', 'FALSE', 'NOT GIVEN']).map((option, index) => (
                  <label 
                    key={index} 
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
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

            {(question.question_type === 'fill_in_blank' || question.question_type === 'short_answer' || question.question_type === 'Summary Completion' || question.question_type === 'Sentence Completion') && (
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
              <div className="mt-2 flex items-center gap-2">
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
              <div className="mt-2 p-3 bg-blue-50 rounded-lg">
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

  // Show post-practice feedback when test is completed
  if (showResults) {
    return (
      <StudentLayout title="Test Results" showBackButton backPath="/content-selection/reading">
        <TestResults
          score={score}
          totalQuestions={questions.length}
          answers={answers}
          questions={questions}
          onRetake={handleRetake}
          onContinue={handleContinuePractice}
          testTitle={`${currentPassage?.cambridge_book} - ${currentPassage?.title}`}
        />
      </StudentLayout>
    );
  }

  return (
    <StudentLayout title="Reading Test" showBackButton backPath="/content-selection/reading">
      <div className="max-w-7xl mx-auto p-4">
        {/* Test Header */}
        <div className="mb-4 p-4 rounded-xl border-light-border" style={{ background: 'var(--gradient-card)' }}>
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
                  <Badge variant="outline">Part {currentPart}</Badge>
                  <Badge variant="outline">Reading</Badge>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {!isSubmitted && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-100">
                  <Clock className="w-4 h-4 text-orange-600" />
                  <span className="font-mono text-orange-600 font-medium">
                    {formatTime(timeLeft)}
                  </span>
                </div>
              )}
              
              {isSubmitted && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{score}/{questions.length}</div>
                  <div className="text-sm text-warm-gray">Band {getBandScore((score/questions.length)*100)}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[calc(100vh-220px)]">
          {/* Reading Passage - Fixed Height with Scroll */}
          <Card className="rounded-2xl border-light-border shadow-soft flex flex-col h-full" style={{ background: 'var(--gradient-card)' }}>
            <CardHeader className="pb-3">
              <CardTitle className="font-georgia text-foreground">Reading Passage</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden">
              <div className="h-full overflow-y-auto pr-2">
                <div className="prose prose-slate max-w-none text-foreground leading-relaxed">
                  <div 
                    className="text-sm whitespace-pre-wrap" 
                    dangerouslySetInnerHTML={{ __html: currentPassage?.content || '' }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Questions - Fixed Height with Scroll */}
          <Card className="rounded-2xl border-light-border shadow-soft flex flex-col h-full" style={{ background: 'var(--gradient-card)' }}>
            <CardHeader className="pb-3">
              <CardTitle className="font-georgia text-foreground">Questions</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden flex flex-col">
              <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                {questions.map((question) => renderQuestion(question))}
              </div>
              
              {/* Progress and Submit Button */}
              {!isSubmitted && (
                <div className="pt-4 border-t border-light-border mt-4">
                  {/* Progress Indicator */}
                  <div className="flex justify-center mb-4">
                    <div className="flex gap-2">
                      {[1, 2, 3].map(partNum => (
                        <div 
                          key={partNum}
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                            completedParts.includes(partNum) 
                              ? 'bg-green-100 text-green-700 border border-green-200' 
                              : partNum === currentPart 
                                ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                                : 'bg-gray-100 text-gray-500 border border-gray-200'
                          }`}
                        >
                          {completedParts.includes(partNum) ? '✓' : partNum}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex justify-center">
                    {currentPart < 3 ? (
                      <Button 
                        onClick={handleGoToNextPart}
                        className="rounded-xl px-8 py-3 font-medium"
                        style={{ background: 'var(--gradient-button)' }}
                        disabled={Object.keys(answers).filter(key => questions.some(q => q.id === key)).length === 0}
                      >
                        Go to Part {currentPart + 1}
                        <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
                      </Button>
                    ) : (
                      <Button 
                        onClick={() => setShowConfirmDialog(true)}
                        className="rounded-xl px-8 py-3 font-medium"
                        style={{ background: 'var(--gradient-button)' }}
                        disabled={Object.keys(answers).filter(key => questions.some(q => q.id === key)).length === 0}
                      >
                        <Target className="w-4 h-4 mr-2" />
                        Submit Test
                      </Button>
                    )}
                  </div>
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