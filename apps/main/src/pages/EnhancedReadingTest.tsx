import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Clock, BookOpen, Target, CheckCircle2, ArrowRight, ZoomIn, ZoomOut, Check } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import StudentLayout from '@/components/StudentLayout';
import CelebrationTestResults from '@/components/CelebrationTestResults';
import GlobalTextSelection from '@/components/GlobalTextSelection';

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
  const [passageFontSize, setPassageFontSize] = useState(14); // in pixels

  console.log('🚀 EnhancedReadingTest component initialized, passageFontSize:', passageFontSize);

  // Add useEffect to track font size changes
  useEffect(() => {
    console.log('📝 Font size changed to:', passageFontSize);
  }, [passageFontSize]);

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

      // Fetch all questions for this test - exclude writing tasks and standalone titles
      const { data: questions, error: questionError } = await supabase
        .from('questions')
        .select('*')
        .eq('test_id', testId)
        .not('question_type', 'in', '("Task 1","Task 2","title")')
        .order('part_number', { ascending: true })
        .order('question_number_in_part', { ascending: true });

      if (questionError) throw questionError;

      // Separately fetch title questions and question_number_in_part = 0 questions for passage titles
      const { data: titleQuestions, error: titleError } = await supabase
        .from('questions')
        .select('*')
        .eq('test_id', testId)
        .or('question_type.eq.title,question_number_in_part.eq.0')
        .order('part_number', { ascending: true });

      if (titleError) throw titleError;

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
      
      // First pass: collect all passage texts and titles from title questions
      const partTitles: {[key: number]: string} = {};
      const allPassageTexts: {[key: number]: string} = {};
      
      // Process title questions first
      titleQuestions?.forEach(titleQuestion => {
        if (titleQuestion.question_type === 'title' || titleQuestion.question_number_in_part === 0) {
          partTitles[titleQuestion.part_number] = titleQuestion.question_text;
          console.log(`📋 Found title for Part ${titleQuestion.part_number}: "${titleQuestion.question_text}"`);
        }
        // Also collect passage text from title questions if available
        if (titleQuestion.passage_text && titleQuestion.passage_text.trim()) {
          allPassageTexts[titleQuestion.part_number] = titleQuestion.passage_text;
        }
      });
      
      // Process regular questions for passage text
      questions.forEach(question => {
        // Collect passage text from any question that has it
        if (question.passage_text && question.passage_text.trim()) {
          allPassageTexts[question.part_number] = question.passage_text;
        }
        
        // Only include actual questions (not titles) - all questions here should be valid
        if (!partsByNumber[question.part_number]) {
          partsByNumber[question.part_number] = [];
        }
        partsByNumber[question.part_number].push(question);
      });

      console.log('🗂️ Passage texts found:', Object.keys(allPassageTexts).map(p => `Part ${p}: ${allPassageTexts[parseInt(p)]?.length || 0} chars`));
      console.log('📚 Part titles:', partTitles);

      console.log('Parts organized:', Object.keys(partsByNumber).map(p => `Part ${p}: ${partsByNumber[parseInt(p)].length} questions`));

      // Create test parts from questions
      Object.entries(partsByNumber).forEach(([partNum, partQuestions]) => {
        const partNumber = parseInt(partNum);
        const firstQuestion = partQuestions[0];
        
        console.log(`Processing Part ${partNumber}:`, {
          questionCount: partQuestions.length,
          firstQuestionId: firstQuestion?.id,
          hasPassageText: !!firstQuestion?.passage_text,
          passageTextLength: firstQuestion?.passage_text?.length || 0
        });
        
        // Use title from part titles if available, otherwise extract from passage
        let passageTitle = partTitles[partNumber] || `Reading Passage ${partNumber}`;
        if (!partTitles[partNumber] && firstQuestion?.passage_text) {
          const lines = firstQuestion.passage_text.split('\n');
          const firstLine = lines[0]?.trim();
          if (firstLine && firstLine.length < 200 && !firstLine.includes('.')) {
            passageTitle = firstLine;
          }
        }
        
        // Use collected passage text for this part
        let passageContent = allPassageTexts[partNumber];
        
        // If not found in collected texts, try to find from questions in this part
        if (!passageContent) {
          passageContent = firstQuestion?.passage_text;
          if (!passageContent) {
            // Look for passage_text in other questions of this part
            for (const question of partQuestions) {
              if (question.passage_text) {
                passageContent = question.passage_text;
                console.log(`📖 Found passage content in question ${question.id} for part ${partNumber}`);
                break;
              }
            }
          }
        }
        
        if (!passageContent) {
          console.error(`❌ No passage content found for Part ${partNumber}`);
          passageContent = 'Passage content not available - please contact administrator';
        } else {
          console.log(`✅ Using passage content for Part ${partNumber} (${passageContent.length} chars)`);
        }
        
        partsData[partNumber] = {
          passage: {
            id: `passage-${partNumber}`,
            title: passageTitle,
            content: passageContent,
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
    
    const results = allQuestions.map(question => {
      const userAnswer = answers[question.id] || '';
      const isCorrect = userAnswer.toLowerCase().trim() === question.correct_answer.toLowerCase().trim();
      const isSkipped = !answers[question.id];
      
      return {
        question,
        userAnswer,
        isCorrect,
        isSkipped
      };
    });

    const score = calculateScore();
    const totalQuestions = allQuestions.length;
    
    // Save test result to database
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && testParts[1]?.passage) {
        // Save main test result
        const { data: testResult, error: testError } = await supabase
          .from('test_results')
          .insert({
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
          })
          .select()
          .single();

        if (testError) throw testError;

        // Save detailed reading results for each passage
        for (const [partNum, testPart] of Object.entries(testParts)) {
          const partNumber = parseInt(partNum);
          const partQuestions = testPart.questions;
          const partAnswers = partQuestions.map(q => ({
            id: q.id,
            question_text: q.question_text,
            question_type: q.question_type,
            user_answer: answers[q.id] || '',
            correct_answer: q.correct_answer,
            is_correct: answers[q.id]?.toLowerCase().trim() === q.correct_answer.toLowerCase().trim(),
            explanation: q.explanation,
            options: q.options || [] // Include the options array
          }));

          // Calculate question type performance
          const questionTypePerformance: Record<string, {correct: number, total: number}> = {};
          partQuestions.forEach(q => {
            const type = q.question_type || 'unknown';
            if (!questionTypePerformance[type]) {
              questionTypePerformance[type] = { correct: 0, total: 0 };
            }
            questionTypePerformance[type].total++;
            if (answers[q.id]?.toLowerCase().trim() === q.correct_answer.toLowerCase().trim()) {
              questionTypePerformance[type].correct++;
            }
          });

          const comprehensionScore = partAnswers.filter(a => a.is_correct).length / partAnswers.length;

          await supabase.from('reading_test_results').insert({
            user_id: user.id,
            test_result_id: testResult.id,
            passage_title: testPart.passage.title,
            passage_text: testPart.passage.content,
            questions_data: partAnswers,
            reading_time_seconds: Math.floor(((60 * 60) - timeLeft) / Object.keys(testParts).length),
            comprehension_score: comprehensionScore,
            question_type_performance: questionTypePerformance,
            detailed_feedback: `Passage ${partNumber}: ${partAnswers.filter(a => a.is_correct).length}/${partAnswers.length} correct (${Math.round(comprehensionScore * 100)}%)`
          });
        }

        console.log('✅ Reading test results saved successfully');
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

  // Detect actual question type from question content
  const detectQuestionType = (question: ReadingQuestion): string => {
    const questionText = question.question_text?.toLowerCase() || '';
    const correctAnswer = question.correct_answer?.toLowerCase() || '';
    
    // YES/NO/NOT GIVEN detection
    if (questionText.includes('statement') && 
        (correctAnswer.includes('yes') || correctAnswer.includes('no') || correctAnswer.includes('not given'))) {
      return 'yes_no_not_given';
    }
    
    // TRUE/FALSE/NOT GIVEN detection
    if (questionText.includes('statement') && 
        (correctAnswer.includes('true') || correctAnswer.includes('false') || correctAnswer.includes('not given'))) {
      return 'true_false_not_given';
    }
    
    // Completion questions - look for "Complete the summary" or similar
    if (questionText.includes('complete the summary') || 
        questionText.includes('complete the text') ||
        questionText.includes('choose from the list') ||
        questionText.includes('write the correct letter')) {
      return 'completion';
    }
    
    // Matching questions - look for "Match each statement"
    if (questionText.includes('match each statement') || 
        questionText.includes('match each') ||
        questionText.includes('correct theorist') ||
        questionText.includes('correct letter, a, b, or c')) {
      return 'matching_features';
    }
    
    // Multiple choice detection
    if (question.options && question.options.length > 0 && 
        (questionText.includes('choose the correct') || questionText.includes('which of the following'))) {
      return 'multiple_choice';
    }
    
    // Default to the original type
    return question.question_type || 'short_answer';
  };

  // Get authentic IELTS instruction for question type
  const getQuestionTypeInstruction = (questionType: string, questionRange: string) => {
    const type = questionType?.toLowerCase() || '';
    console.log(`🎯 Getting instruction for type: "${type}", range: "${questionRange}"`);
    
    if (type.includes('true') || type.includes('false') || type.includes('not given')) {
      if (type.includes('yes') || type.includes('no')) {
        return `Do the following statements agree with the views of the writer in the reading passage? In boxes ${questionRange} on your answer sheet, write YES if the statement agrees with the views of the writer, NO if the statement contradicts the views of the writer, or NOT GIVEN if it is impossible to say what the writer thinks about this.`;
      }
      return `Do the following statements agree with the information given in the reading passage? In boxes ${questionRange} on your answer sheet, write TRUE if the statement agrees with the information, FALSE if the statement contradicts the information, or NOT GIVEN if there is no information on this.`;
    }
    
    if (type.includes('matching') && type.includes('heading')) {
      return `The reading passage has several paragraphs. Choose the correct heading for each paragraph from the list of headings below. Write the correct number in boxes ${questionRange} on your answer sheet.`;
    }
    
    if (type.includes('matching') && type.includes('paragraph')) {
      return `Which paragraph contains the following information? Write the correct letter in boxes ${questionRange} on your answer sheet. NB You may use any letter more than once.`;
    }
    
    if (type.includes('matching') && (type.includes('feature') || type.includes('theorist'))) {
      return `Look at the following statements and match each statement with the correct option from the list below. Write the correct letter in boxes ${questionRange} on your answer sheet.`;
    }
    
    if (type.includes('matching') && type.includes('sentence')) {
      return `Complete each sentence with the correct ending below. Write the correct letter in boxes ${questionRange} on your answer sheet.`;
    }
    
    if (type.includes('multiple') && type.includes('choice')) {
      return `Choose the correct letter, A, B, C, or D. Write the correct letter in boxes ${questionRange} on your answer sheet.`;
    }
    
    // Completion questions - these should have instructions
    if (type.includes('completion') || type.includes('summary')) {
      return `Complete the summary below using the list of words provided. Write the correct letter in boxes ${questionRange} on your answer sheet.`;
    }
    
    if (type.includes('flow') || type.includes('diagram')) {
      return `Complete the flow chart/diagram below. Choose NO MORE THAN TWO WORDS AND/OR A NUMBER from the passage for each answer. Write your answers in boxes ${questionRange} on your answer sheet.`;
    }
    
    if (type.includes('table')) {
      return `Complete the table below. Choose NO MORE THAN TWO WORDS AND/OR A NUMBER from the passage for each answer. Write your answers in boxes ${questionRange} on your answer sheet.`;
    }
    
    if (type.includes('short') && type.includes('answer')) {
      return `Answer the questions below. Choose NO MORE THAN TWO WORDS AND/OR A NUMBER from the passage for each answer. Write your answers in boxes ${questionRange} on your answer sheet.`;
    }
    
    // If we don't have a specific instruction, provide a generic one
    console.log(`⚠️ No specific instruction found for type: "${type}"`);
    return `Read the questions below and answer according to the passage. Write your answers in boxes ${questionRange} on your answer sheet.`;
  };

  // Group questions by type to show instructions
  const getQuestionGroups = () => {
    if (!currentTestPart?.questions) return [];
    
    const groups: { type: string; questions: ReadingQuestion[]; instruction: string | null }[] = [];
    let currentGroup: { type: string; questions: ReadingQuestion[]; instruction: string | null } | null = null;
    
    console.log('🔍 Grouping questions for Part', currentPart, '- Total questions:', currentTestPart.questions.length);
    
    currentTestPart.questions.forEach((question, index) => {
      // Use intelligent detection instead of database type
      const detectedType = detectQuestionType(question);
      const originalType = question.question_type?.toLowerCase() || '';
      
      console.log(`Question ${question.question_number}: Original="${originalType}" → Detected="${detectedType}"`);
      
      if (!currentGroup || currentGroup.type !== detectedType) {
        // Calculate range for this group - find all questions of this detected type in the current part
        const groupQuestions = currentTestPart.questions.filter(q => 
          detectQuestionType(q) === detectedType
        );
        const groupNumbers = groupQuestions.map(q => q.question_number).sort((a, b) => a - b);
        const groupRange = groupNumbers.length === 1 ? 
          groupNumbers[0].toString() : 
          `${groupNumbers[0]}-${groupNumbers[groupNumbers.length - 1]}`;
        
        const instruction = getQuestionTypeInstruction(detectedType, groupRange);
        console.log(`📋 New group for type "${detectedType}": Range ${groupRange}, Instruction: ${instruction ? 'YES' : 'NO'}`);
        
        currentGroup = {
          type: detectedType,
          questions: [question],
          instruction: instruction
        };
        groups.push(currentGroup);
      } else {
        currentGroup.questions.push(question);
        console.log(`➕ Added question ${question.question_number} to existing group "${detectedType}"`);
      }
    });
    
    console.log('📊 Final groups:', groups.map(g => `${g.type} (${g.questions.length} questions) - ${g.instruction ? 'HAS' : 'NO'} instruction`));
    return groups;
  };

  const handleTextSelection = () => {
    // Word selection functionality removed
  };

  const saveWordToDictionary = async (word: string, translation?: string) => {
    // Dictionary functionality removed
  };


  const increaseFontSize = () => {
    console.log('Increasing font size from:', passageFontSize);
    setPassageFontSize(prev => Math.min(prev + 2, 20));
  };

  const decreaseFontSize = () => {
    console.log('Decreasing font size from:', passageFontSize);
    setPassageFontSize(prev => Math.max(prev - 2, 10));
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
    
    return (
      <CelebrationTestResults
        score={score}
        timeTaken={(60 * 60) - timeLeft}
        answers={answers}
        questions={allQuestions}
        onRetake={() => window.location.reload()}
        testParts={testParts}
      />
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
    <GlobalTextSelection>
      <StudentLayout title={`Reading Test ${testId} - Part ${currentPart}`}>
        <div className="min-h-screen bg-background">
        {/* Compact Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
          <div className="container mx-auto px-3 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={() => navigate('/ielts-portal')}>
                  <ArrowLeft className="w-3 h-3 mr-1" />
                  Back
                </Button>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="font-mono text-sm">{formatTime(timeLeft)}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  Questions: {getTotalAnswered()}/{allQuestions.length}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Compact Part Navigation */}
                {Object.keys(testParts).map(partNum => {
                  const partNumber = parseInt(partNum);
                  const answeredInPart = getAnsweredQuestionsInPart(partNumber);
                  const totalInPart = testParts[partNumber].questions.length;
                  
                  return (
                    <Button
                      key={partNumber}
                      variant={currentPart === partNumber ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePartNavigation(partNumber)}
                      className="px-2 h-7 text-xs"
                    >
                      P{partNumber} {answeredInPart}/{totalInPart}
                    </Button>
                  );
                })}
                
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitted}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white px-3 h-7 text-xs"
                >
                  {isSubmitted ? 'Submitting...' : 'Submit'}
                </Button>
              </div>
            </div>

            {/* Minimal Progress bar */}
            <Progress value={(getTotalAnswered() / allQuestions.length) * 100} className="h-1" />
          </div>
        </div>

        {/* Main Content - Fixed Height Layout */}
          <div className="flex gap-2 h-[calc(100vh-120px)] px-2">
            {/* Passage - Fixed 45% width */}
          <Card className="flex flex-col w-[45%] h-full border border-[#E8D5A3] shadow-sm bg-[#FFFAF0]">
            <CardHeader className="flex-shrink-0 pb-2 px-3 py-2 border-b border-[#E8D5A3]">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-1 text-sm font-medium text-black">
                    <Target className="w-4 h-4 text-[#8B4513]" />
                    {currentTestPart.passage.title}
                  </CardTitle>
                  <div className="flex gap-1 mt-1">
                  {Object.keys(testParts).map(partNum => {
                    const partNumber = parseInt(partNum);
                    return (
                      <button
                        key={partNumber}
                        onClick={() => handlePartNavigation(partNumber)}
                        className={`text-xs px-2 py-0.5 rounded transition-colors ${
                          currentPart === partNumber 
                            ? 'bg-[#E8D5A3] text-[#5c4b37] font-medium' 
                            : 'bg-white/50 text-[#8B4513]/70 hover:bg-[#E8D5A3]/50'
                        }`}
                      >
                        Part {partNumber}
                      </button>
                    );
                  })}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost" 
                    size="sm"
                    onClick={decreaseFontSize}
                    className="h-6 w-6 p-0 text-[#8B4513] hover:bg-[#E8D5A3]/20"
                    disabled={passageFontSize <= 10}
                  >
                    <ZoomOut className="w-3 h-3" />
                  </Button>
                  <span className="text-xs text-[#8B4513] px-1">
                    {passageFontSize}px
                  </span>
                  <Button
                    variant="ghost"
                    size="sm" 
                    onClick={increaseFontSize}
                    className="h-6 w-6 p-0 text-[#8B4513] hover:bg-[#E8D5A3]/20"
                    disabled={passageFontSize >= 20}
                  >
                    <ZoomIn className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto min-h-0 p-3 scrollbar-thin scrollbar-thumb-[#D3C4A5] scrollbar-track-transparent hover:scrollbar-thumb-[#8B4513]/50">
              <div className="prose prose-sm max-w-none relative font-serif text-black">
                <div 
                  className="whitespace-pre-wrap leading-relaxed select-text" 
                  style={{ fontSize: `${passageFontSize}px`, lineHeight: '1.6' }}
                >
                  {currentTestPart.passage.content}
                </div>
                </div>
              </CardContent>
            </Card>

            {/* Questions - Fixed 55% width with scrollable content */}
            <Card className="flex flex-col w-[55%] h-full border border-[#E8D5A3] shadow-sm bg-[#FFFAF0]">
              <CardHeader className="flex-shrink-0 pb-2 px-3 py-2 border-b border-[#E8D5A3]">
                <CardTitle className="text-sm font-medium text-black">Questions {getQuestionRange()}</CardTitle>
                <Badge variant="secondary" className="text-xs h-5 bg-white/50 text-[#8B4513] border border-[#E8D5A3]">
                  {currentTestPart.questions.filter(q => answers[q.id]).length}/{currentTestPart.questions.length} answered
                </Badge>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto min-h-0 p-3 scroll-smooth scrollbar-thin scrollbar-thumb-[#D3C4A5] scrollbar-track-transparent hover:scrollbar-thumb-[#8B4513]/50">
                <div className="space-y-4 pb-4">
                  {getQuestionGroups().map((group, groupIndex) => (
                    <div key={groupIndex} className="space-y-3">
                      {/* Authentic IELTS Instruction */}
                      {group.instruction && (
                        <div className="bg-muted/30 p-3 rounded-lg border-l-4 border-primary">
                          <p className="text-sm font-medium text-foreground leading-relaxed">
                            {group.instruction}
                          </p>
                        </div>
                      )}
                      
                       {/* Questions in this group */}
                       {group.questions.map((question) => {
                         const renderAnswerInput = () => {
                           // Use detected type instead of database type
                           const detectedType = detectQuestionType(question);
                           
                          // YES/NO/NOT GIVEN questions
                          if (detectedType.includes('yes_no_not_given')) {
                            return (
                              <RadioGroup
                                value={answers[question.id] || ''}
                                onValueChange={(value) => handleAnswerChange(question.id, value)}
                                className="flex flex-wrap gap-3 mt-1.5"
                              >
                                {['Yes', 'No', 'Not Given'].map((option) => {
                                  const isSelected = answers[question.id] === option;
                                  return (
                                    <div key={option} className="relative">
                                      <RadioGroupItem value={option} id={`${question.id}-${option.toLowerCase().replace(/\s/g, '')}`} className="peer sr-only" />
                                      <Label 
                                        htmlFor={`${question.id}-${option.toLowerCase().replace(/\s/g, '')}`} 
                                        className={`flex items-center justify-center gap-1.5 px-4 py-1.5 min-w-[80px] rounded-md border cursor-pointer text-sm font-bold transition-all duration-200 ${
                                          isSelected 
                                            ? 'bg-[#d97757] border-2 border-[#8B4513] text-black shadow-lg ring-2 ring-[#d97757]/50' 
                                            : 'bg-[#FAF9F6] border-[#D3C4A5] text-[#5c4b37]'
                                        }`}
                                      >
                                        {isSelected && <Check className="w-4 h-4" />}
                                        {option.toUpperCase()}
                                      </Label>
                                    </div>
                                  );
                                })}
                              </RadioGroup>
                            );
                          }
                          
                          // TRUE/FALSE/NOT GIVEN questions
                          if (detectedType.includes('true_false_not_given')) {
                            return (
                              <RadioGroup
                                value={answers[question.id] || ''}
                                onValueChange={(value) => handleAnswerChange(question.id, value)}
                                className="flex flex-wrap gap-3 mt-1.5"
                              >
                                {['True', 'False', 'Not Given'].map((option) => {
                                  const isSelected = answers[question.id] === option;
                                  return (
                                    <div key={option} className="relative">
                                      <RadioGroupItem value={option} id={`${question.id}-${option.toLowerCase().replace(/\s/g, '')}`} className="peer sr-only" />
                                      <Label 
                                        htmlFor={`${question.id}-${option.toLowerCase().replace(/\s/g, '')}`} 
                                        className={`flex items-center justify-center gap-1.5 px-4 py-1.5 min-w-[80px] rounded-md border cursor-pointer text-sm font-bold transition-all duration-200 ${
                                          isSelected 
                                            ? 'bg-[#d97757] border-2 border-[#8B4513] text-black shadow-lg ring-2 ring-[#d97757]/50' 
                                            : 'bg-[#FAF9F6] border-[#D3C4A5] text-[#5c4b37]'
                                        }`}
                                      >
                                        {isSelected && <Check className="w-4 h-4" />}
                                        {option.toUpperCase()}
                                      </Label>
                                    </div>
                                  );
                                })}
                              </RadioGroup>
                            );
                          }
                           
                           // Multiple choice questions
                           if (detectedType.includes('multiple_choice') && question.options && question.options.length > 0) {
                             return (
                               <RadioGroup
                                 value={answers[question.id] || ''}
                                 onValueChange={(value) => handleAnswerChange(question.id, value)}
                                 className="grid gap-3 mt-3"
                               >
                                 {question.options.map((option, index) => {
                                   const isSelected = answers[question.id] === option;
                                   return (
                                     <div key={index} className="relative group/option">
                                       <RadioGroupItem value={option} id={`${question.id}-${index}`} className="peer sr-only" />
                                      <Label 
                                        htmlFor={`${question.id}-${index}`} 
                                        className={`flex items-start p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
                                          isSelected 
                                            ? 'border-2 border-[#8B4513] bg-[#d97757] shadow-lg ring-2 ring-[#d97757]/50' 
                                            : 'border-[#E8D5A3] bg-white hover:bg-[#FFFAF0] hover:border-[#d97757]/50'
                                        }`}
                                      >
                                        <div className={`flex-shrink-0 w-6 h-6 flex items-center justify-center font-bold text-lg mr-3 transition-colors ${
                                          isSelected ? 'text-black' : 'text-[#8B4513]/70'
                                        }`}>
                                          {String.fromCharCode(65 + index)}
                                        </div>
                                        <span className={`text-base leading-relaxed ${isSelected ? 'text-black font-medium' : 'text-[#2f241f]'}`}>
                                          {option}
                                        </span>
                                      </Label>
                                     </div>
                                   );
                                 })}
                               </RadioGroup>
                             );
                           }
                           
                            // Matching questions
                            if (detectedType.includes('matching') && question.options && question.options.length > 0) {
                              return (
                                <RadioGroup
                                  value={answers[question.id] || ''}
                                  onValueChange={(value) => handleAnswerChange(question.id, value)}
                                  className="grid gap-3 mt-3"
                                >
                                  {question.options.map((option, index) => {
                                    // Extract just the Roman numeral or letter from the beginning of the option
                                    const optionValue = option.match(/^([ivxlcdm]+|[a-z])\./i)?.[1] || option;
                                    const isSelected = answers[question.id] === optionValue;
                                    return (
                                      <div key={index} className="relative group/option">
                                        <RadioGroupItem value={optionValue} id={`${question.id}-${index}`} className="peer sr-only" />
                                        <Label 
                                          htmlFor={`${question.id}-${index}`} 
                                          className={`flex items-start p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                                            isSelected 
                                              ? 'border-[#8B4513] bg-[#d97757] shadow-lg ring-2 ring-[#d97757]/50' 
                                              : 'border-[#E8D5A3] bg-white hover:bg-[#FFFAF0] hover:border-[#d97757]/50'
                                          }`}
                                        >
                                          <span className={`text-base leading-relaxed ${isSelected ? 'text-black font-medium' : 'text-[#2f241f]'}`}>
                                            {option}
                                          </span>
                                        </Label>
                                      </div>
                                    );
                                  })}
                                </RadioGroup>
                              );
                            }
                           
                          // Default to text input
                          return (
                            <div className="mt-2">
                              <Input
                                value={answers[question.id] || ''}
                                onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                                placeholder=""
                                className="max-w-[400px] bg-[#FAF9F6] border border-[#D3C4A5] rounded-md px-3 py-2 focus-visible:ring-1 focus-visible:ring-[#8B4513] focus-visible:border-[#8B4513] focus-visible:ring-offset-0 shadow-sm text-lg text-black h-10 placeholder:text-transparent"
                              />
                            </div>
                          );
                        };

                       return (
                         <div key={question.id} className="pb-6 mb-2 border-b border-[#E8D5A3]/30 last:border-b-0 last:pb-0">
                           <div className="flex flex-row items-baseline gap-3">
                             <div className="flex-shrink-0 text-sm font-medium text-black min-w-[1.5rem] leading-relaxed">
                               {question.question_number}
                             </div>
                             <div className="flex-1 space-y-4">
                               <div className="space-y-2">
                                 <p className="text-lg leading-relaxed text-black">
                                   {question.question_text}
                                 </p>
                               </div>
                               {renderAnswerInput()}
                             </div>
                           </div>
                         </div>
                       );
                      })}
                    </div>
                  ))}
                </div>
              </CardContent>
              
              {/* Part Navigation - Fixed at bottom */}
              <div className="flex-shrink-0 border-t border-[#E8D5A3] bg-[#FFFAF0] p-4">
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
      </StudentLayout>
    </GlobalTextSelection>
  );
};

export default EnhancedReadingTest;