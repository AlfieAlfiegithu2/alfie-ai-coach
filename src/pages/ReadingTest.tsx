import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import TranslationHelper from '@/components/TranslationHelper';
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
  section_number?: number;
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
  part_number?: number;
}

const ReadingTest = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { testId } = useParams();
  const [timeLeft, setTimeLeft] = useState(60 * 60); // 60 minutes
  const [currentPassage, setCurrentPassage] = useState<ReadingPassage | null>(null);
  const [questions, setQuestions] = useState<ReadingQuestion[]>([]);
  const [allSectionQuestions, setAllSectionQuestions] = useState<ReadingQuestion[]>([]);
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
  
  // Translation helper state
  const [showTranslation, setShowTranslation] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [translationPosition, setTranslationPosition] = useState({ x: 0, y: 0 });
  const [translationLanguage, setTranslationLanguage] = useState('es'); // Default to Spanish

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
          part_number: passage.part_number || 1,
          section_number: passage.section_number
        });

        // Fetch ALL questions for the entire section to enable full 40-question counting
        console.log('📊 Full Section Sync: Fetching ALL questions for section to count 40 total...');
        const { data: allSectionQuestionsData, error: allQuestionsError } = await supabase
          .from('reading_questions')
          .select('*')
          .eq('cambridge_book', passage.cambridge_book)
          .eq('section_number', passage.section_number)
          .order('part_number')
          .order('question_number');

        if (!allQuestionsError && allSectionQuestionsData && allSectionQuestionsData.length > 0) {
          const formattedAllQuestions: ReadingQuestion[] = allSectionQuestionsData.map(q => ({
            id: q.id,
            question_number: q.question_number,
            question_text: q.question_text,
            question_type: q.question_type,
            options: q.options ? (Array.isArray(q.options) ? q.options.map(o => String(o)) : typeof q.options === 'string' ? q.options.split(';') : undefined) : undefined,
            correct_answer: q.correct_answer,
            explanation: q.explanation,
            passage_id: q.passage_id,
            part_number: q.part_number
          }));
          setAllSectionQuestions(formattedAllQuestions);
          console.log(`✅ Full Section Sync: Loaded ${formattedAllQuestions.length} questions across all parts for complete counting`);
        }

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
              part_number: passage.part_number || 1,
              section_number: passage.section_number
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
              passage_id: q.passage_id,
              part_number: q.part_number
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

  const calculateFullSectionScore = () => {
    // Calculate score across all 40 questions in the section
    let totalCorrect = 0;
    let totalQuestions = 0;
    
    if (allSectionQuestions.length > 0) {
      totalQuestions = allSectionQuestions.length;
      allSectionQuestions.forEach(question => {
        const userAnswer = answers[question.id]?.toLowerCase().trim();
        const correctAnswer = question.correct_answer?.toLowerCase().trim();
        
        if (userAnswer === correctAnswer) {
          totalCorrect++;
        }
      });
    } else {
      // Fallback to all parts data if section questions not loaded
      Object.values(allPartsData).forEach(partData => {
        totalQuestions += partData.questions.length;
        partData.questions.forEach(q => {
          const userAnswer = answers[q.id]?.toLowerCase().trim();
          const correctAnswer = q.correct_answer?.toLowerCase().trim();
          
          if (userAnswer === correctAnswer) {
            totalCorrect++;
          }
        });
      });
    }

    console.log(`📊 Full Section Score: ${totalCorrect}/${totalQuestions} questions correct`);
    return { totalCorrect, totalQuestions };
  };

  const jumpToPart = (partNumber: number) => {
    setCurrentPart(partNumber);
    
    // Load part data or fetch if needed
    if (allPartsData[partNumber]) {
      setCurrentPassage(allPartsData[partNumber].passage);
      setQuestions(allPartsData[partNumber].questions);
      console.log(`🔄 Part Jump: Jumped to Part ${partNumber}`);
    } else {
      // Fetch part data
      fetchPartData(partNumber);
    }
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
    jumpToPart(nextPart);
    
    console.log(`📝 Sequential Flow: Moving from Part ${currentPart} to Part ${nextPart}`);
  };

  const handleSubmit = async () => {
    // Calculate full section score (all 40 questions)
    const { totalCorrect, totalQuestions } = calculateFullSectionScore();
    
    setScore(totalCorrect);
    setIsSubmitted(true);
    setShowConfirmDialog(false);
    setShowResults(true);
    
    // Save test result to database
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && currentPassage) {
        const testResult = {
          user_id: user.id,
          test_type: 'reading',
          cambridge_book: currentPassage.cambridge_book,
          section_number: currentPassage.section_number,
          total_questions: totalQuestions,
          correct_answers: totalCorrect,
          score_percentage: (totalCorrect / totalQuestions) * 100,
          time_taken: (60 * 60) - timeLeft, // Time taken in seconds
          test_data: JSON.parse(JSON.stringify({
            answers: answers,
            all_questions: (allSectionQuestions.length > 0 ? allSectionQuestions : Object.values(allPartsData).flatMap(p => p.questions)).map(q => ({
              id: q.id,
              question_number: q.question_number,
              question_type: q.question_type,
              question_text: q.question_text,
              correct_answer: q.correct_answer,
              explanation: q.explanation
            })),
            completed_parts: [...completedParts, currentPart]
          }))
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
    
    // Clear saved answers
    localStorage.removeItem(`reading-test-${testId}`);
    
    console.log('🎯 Full Section: Test completed across all parts. Final score:', totalCorrect, 'out of', totalQuestions, 'questions (40 total expected)');
  };

  const fetchPartData = async (partNumber: number) => {
    try {
      console.log(`🔍 Sequential Flow: Fetching data for Part ${partNumber}`);
      
      if (!currentPassage) return;
      
      console.log(`🔍 Part Fetch: Looking for Part ${partNumber} in book ${currentPassage.cambridge_book}, section ${currentPassage.section_number}`);
      const { data: passages, error: passageError } = await supabase
        .from('reading_passages')
        .select('*')
        .eq('cambridge_book', currentPassage.cambridge_book)
        .eq('section_number', currentPassage.section_number)
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
          part_number: passage.part_number || partNumber,
          section_number: passage.section_number
        };
        
        const formattedQuestions = finalQuestionsData.map(q => ({
          id: q.id,
          question_number: q.question_number,
          question_text: q.question_text,
          question_type: q.question_type,
          options: q.options ? (Array.isArray(q.options) ? q.options.map(o => String(o)) : typeof q.options === 'string' ? q.options.split(';') : undefined) : undefined,
          correct_answer: q.correct_answer,
          explanation: q.explanation,
          passage_id: q.passage_id,
          part_number: q.part_number
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
      console.error(`Error fetching Part ${partNumber}:`, error);
      toast({
        title: "Error",
        description: `Failed to load Part ${partNumber}`,
        variant: "destructive"
      });
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const renderQuestionInput = (question: ReadingQuestion) => {
    const value = answers[question.id] || '';
    const questionType = question.question_type?.toLowerCase() || '';
    
    // True/False/Not Given questions
    if (questionType.includes('true') && questionType.includes('false') && questionType.includes('not given')) {
      const options = ['True', 'False', 'Not Given'];
      return (
        <RadioGroup value={value} onValueChange={(val) => handleAnswerChange(question.id, val)}>
          <div className="grid grid-cols-3 gap-2">
            {options.map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`${question.id}-${option}`} />
                <Label htmlFor={`${question.id}-${option}`} className="cursor-pointer">
                  {option}
                </Label>
              </div>
            ))}
          </div>
        </RadioGroup>
      );
    }
    
    // Yes/No/Not Given questions
    if (questionType.includes('yes') && questionType.includes('no') && questionType.includes('not given')) {
      const options = ['Yes', 'No', 'Not Given'];
      return (
        <RadioGroup value={value} onValueChange={(val) => handleAnswerChange(question.id, val)}>
          <div className="grid grid-cols-3 gap-2">
            {options.map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`${question.id}-${option}`} />
                <Label htmlFor={`${question.id}-${option}`} className="cursor-pointer">
                  {option}
                </Label>
              </div>
            ))}
          </div>
        </RadioGroup>
      );
    }
    
    // Multiple Choice questions with predefined options
    if (question.question_type === 'Multiple Choice' && question.options) {
      return (
        <RadioGroup value={value} onValueChange={(val) => handleAnswerChange(question.id, val)}>
          <div className="space-y-2">
            {question.options.map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`${question.id}-${index}`} />
                <Label htmlFor={`${question.id}-${index}`} className="cursor-pointer">
                  {option}
                </Label>
              </div>
            ))}
          </div>
        </RadioGroup>
      );
    }
    
    // Fill in the blank or short answer questions
    return (
      <Input
        value={value}
        onChange={(e) => handleAnswerChange(question.id, e.target.value)}
        placeholder="Type your answer..."
        disabled={isSubmitted}
        className="w-full input-modern"
      />
    );
  };

  const handleTextSelection = (event: React.MouseEvent) => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      const selectedText = selection.toString().trim();
      if (selectedText.split(' ').length <= 3) { // Only show for 1-3 words
        setSelectedText(selectedText);
        setTranslationPosition({ x: event.clientX, y: event.clientY });
        setShowTranslation(true);
      }
    }
  };

  const getAnsweredQuestionsCount = () => {
    if (allSectionQuestions.length > 0) {
      // Count answered questions across all section questions (40 total)
      return allSectionQuestions.filter(q => answers[q.id] && answers[q.id].trim() !== '').length;
    } else {
      // Fallback to counting across all parts data
      let totalAnswered = 0;
      Object.values(allPartsData).forEach(partData => {
        totalAnswered += partData.questions.filter(q => answers[q.id] && answers[q.id].trim() !== '').length;
      });
      return totalAnswered;
    }
  };

  const getTotalQuestionsCount = () => {
    if (allSectionQuestions.length > 0) {
      return allSectionQuestions.length; // Should be 40 for complete section
    } else {
      // Fallback to counting across all parts data
      let total = 0;
      Object.values(allPartsData).forEach(partData => {
        total += partData.questions.length;
      });
      return total;
    }
  };

  if (loading) {
    return (
      <StudentLayout title="Reading Test">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Loading reading test...</p>
          </div>
        </div>
      </StudentLayout>
    );
  }

  if (showResults) {
    const totalQuestions = getTotalQuestionsCount();
    return (
      <StudentLayout title="Reading Test Results">
        <TestResults
          score={score}
          totalQuestions={totalQuestions}
          timeTaken={60 * 60 - timeLeft}
          onRetake={() => window.location.reload()}
          onContinue={() => navigate('/tests')}
          testTitle={`${currentPassage?.cambridge_book} Section ${currentPassage?.section_number} Reading Test`}
          answers={answers}
          questions={allSectionQuestions.length > 0 ? allSectionQuestions : Object.values(allPartsData).flatMap(p => p.questions)}
        />
      </StudentLayout>
    );
  }

  const answeredCount = getAnsweredQuestionsCount();
  const totalQuestionsCount = getTotalQuestionsCount();

  return (
    <StudentLayout title="Reading Test">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header with Timer and Progress */}
        <div className="flex items-center justify-between bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/tests')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <span className="font-medium">Reading Test</span>
              {currentPassage?.cambridge_book && (
                <Badge variant="outline">
                  {currentPassage.cambridge_book} - Section {currentPassage.section_number}
                </Badge>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium">
                {answeredCount}/{totalQuestionsCount} answered
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-500" />
              <span className="font-mono text-lg font-bold">
                {formatTime(timeLeft)}
              </span>
            </div>
          </div>
        </div>

        {/* Part Navigation Tabs */}
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600" />
              <span className="font-medium">Parts:</span>
              <div className="flex gap-2">
                {[1, 2, 3].map(partNum => (
                  <Button
                    key={partNum}
                    variant={currentPart === partNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => jumpToPart(partNum)}
                    className="min-w-[80px]"
                  >
                    Part {partNum}
                    {completedParts.includes(partNum) && (
                      <CheckCircle className="w-3 h-3 ml-1 text-green-500" />
                    )}
                  </Button>
                ))}
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowExplanations(!showExplanations)}
              >
                {showExplanations ? (
                  <>
                    <EyeOff className="w-4 h-4 mr-2" />
                    Hide Explanations
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 mr-2" />
                    Show Explanations
                  </>
                )}
              </Button>
              
              {currentPart < 3 ? (
                <Button onClick={handleGoToNextPart}>
                  Next Part
                </Button>
              ) : (
                <Button onClick={() => setShowConfirmDialog(true)}>
                  Submit Test
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Passage Section */}
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Part {currentPart}: {currentPassage?.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none">
                <div 
                  className="whitespace-pre-wrap text-sm leading-relaxed glass-effect p-4 rounded-lg max-h-[70vh] overflow-y-auto cursor-text"
                  onMouseUp={handleTextSelection}
                >
                  {currentPassage?.content}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Questions Section */}
          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Questions ({questions.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6 max-h-[70vh] overflow-y-auto">
                {questions
                  .sort((a, b) => a.question_number - b.question_number)
                  .map((question) => (
                  <div key={question.id} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-start gap-3">
                      <Badge variant="outline" className="mt-1">
                        {question.question_number}
                      </Badge>
                      <div className="flex-1">
                        <p className="font-medium mb-3">{question.question_text}</p>
                        {renderQuestionInput(question)}
                        
                        {showExplanations && (
                          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                            <p className="text-sm font-medium text-blue-800 mb-1">
                              Correct Answer: {question.correct_answer}
                            </p>
                            <p className="text-sm text-blue-700">
                              {question.explanation}
                            </p>
                          </div>
                        )}
                        
                        {isSubmitted && (
                          <div className="mt-2 flex items-center gap-2">
                            {answers[question.id]?.toLowerCase().trim() === question.correct_answer.toLowerCase().trim() ? (
                              <div className="flex items-center gap-1 text-green-600">
                                <CheckCircle className="w-4 h-4" />
                                <span className="text-sm font-medium">Correct</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-red-600">
                                <XCircle className="w-4 h-4" />
                                <span className="text-sm font-medium">
                                  Incorrect (Correct: {question.correct_answer})
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Submit Confirmation Dialog */}
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Submit Reading Test</DialogTitle>
              <DialogDescription>
                Are you sure you want to submit your test? You have answered {answeredCount} out of {totalQuestionsCount} questions.
                {answeredCount < totalQuestionsCount && (
                  <span className="text-orange-600 font-medium block mt-2">
                    Warning: You have {totalQuestionsCount - answeredCount} unanswered questions.
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
                Continue Test
              </Button>
              <Button onClick={handleSubmit}>
                Submit Test
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Translation Helper */}
        {showTranslation && (
          <TranslationHelper
            selectedText={selectedText}
            position={translationPosition}
            onClose={() => setShowTranslation(false)}
            language={translationLanguage}
          />
        )}
      </div>
    </StudentLayout>
  );
};

export default ReadingTest;