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
import CelebrationTestResults from '@/components/CelebrationTestResults';

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
      const allPassageTexts: {[key: number]: string} = {};
      
      // First pass: collect all passage texts and titles
      questions.forEach(question => {
        // Collect passage text from any question that has it
        if (question.passage_text && question.passage_text.trim()) {
          allPassageTexts[question.part_number] = question.passage_text;
        }
        
        // Handle title extraction - check for question_number_in_part = 0 OR if question text looks like a title
        if (question.question_number_in_part === 0) {
          if (!partTitles[question.part_number] && question.question_text) {
            partTitles[question.part_number] = question.question_text;
            console.log(`📋 Found title for Part ${question.part_number}: "${question.question_text}"`);
          }
          return; // Don't include title questions in the actual questions
        }
        
        // Check if this looks like a title question (short text, no question marks, etc.)
        const isLikelyTitle = question.question_text && 
                             question.question_text.length < 100 && 
                             !question.question_text.includes('?') && 
                             !question.question_text.includes('___') &&
                             question.question_number_in_part === 1;
        
        if (isLikelyTitle && !partTitles[question.part_number]) {
          partTitles[question.part_number] = question.question_text;
          console.log(`📋 Found title-like question for Part ${question.part_number}: "${question.question_text}"`);
          return; // Don't include this as a regular question
        }
        
        // Only include actual questions (not titles)
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
    
    // Auto-save incorrect/skipped words to vocabulary
    const savedWordsCount = saveIncorrectWords(results);
    if (savedWordsCount > 0) {
      toast({
        title: "Vocabulary Updated",
        description: `${savedWordsCount} words from incorrect answers added to your vocabulary.`,
      });
    }
    
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
    const savedWords = JSON.parse(localStorage.getItem('alfie-saved-vocabulary') || '[]');
    const wordExists = savedWords.find((w: any) => w.word.toLowerCase() === word.toLowerCase());
    
    if (!wordExists) {
      const newWord = {
        id: Date.now().toString(),
        word,
        translation: translation || 'Translation coming soon...',
        context: `Reading Test - Part ${currentPart}`,
        savedAt: new Date().toISOString()
      };
      
      savedWords.push(newWord);
      localStorage.setItem('alfie-saved-vocabulary', JSON.stringify(savedWords));
      
      toast({
        title: "Word Saved!",
        description: `"${word}" has been added to your vocabulary.`,
      });
    } else {
      toast({
        title: "Already Saved",
        description: `"${word}" is already in your vocabulary.`,
      });
    }
    
    setSelectedWord('');
    setShowDictionary(false);
  };

  // Auto-save incorrect/skipped words to vocabulary
  const saveIncorrectWords = (results: any[]) => {
    const savedWords = JSON.parse(localStorage.getItem('alfie-saved-vocabulary') || '[]');
    const newWords: any[] = [];
    
    results.forEach((result) => {
      if (!result.isCorrect || result.isSkipped) {
        // Extract key words from question text
        const questionWords = result.question.question_text
          .toLowerCase()
          .match(/\b[a-z]{4,}\b/g) || []; // Extract words with 4+ letters
        
        questionWords.forEach((word: string) => {
          const wordExists = savedWords.find((w: any) => w.word.toLowerCase() === word);
          const newWordExists = newWords.find((w: any) => w.word.toLowerCase() === word);
          
          if (!wordExists && !newWordExists) {
            newWords.push({
              id: Date.now().toString() + Math.random(),
              word,
              translation: 'Auto-saved from incorrect answer - translation coming soon...',
              context: `Question ${result.question.question_number} - Auto-saved`,
              savedAt: new Date().toISOString()
            });
          }
        });
      }
    });
    
    if (newWords.length > 0) {
      const updatedWords = [...savedWords, ...newWords];
      localStorage.setItem('alfie-saved-vocabulary', JSON.stringify(updatedWords));
    }
    
    return newWords.length;
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
        totalQuestions={totalQuestions}
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

        {/* Main Content - Optimized Layout */}
        <div className="container mx-auto px-4 py-6">
          <div className="flex gap-4 h-[calc(100vh-280px)]">
            {/* Passage - 45% width */}
            <Card className="flex flex-col w-[45%]">
              <CardHeader className="flex-shrink-0 pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Target className="w-5 h-5" />
                  {currentTestPart.passage.title}
                </CardTitle>
                <Badge variant="outline" className="w-fit text-xs">
                  Part {currentPart} of {Object.keys(testParts).length}
                </Badge>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto min-h-0 p-4">
                <div className="prose prose-sm max-w-none relative">
                  <div className="whitespace-pre-wrap leading-relaxed select-text text-sm" onMouseUp={handleTextSelection}>
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

            {/* Questions - 55% width */}
            <Card className="flex flex-col w-[55%]">
              <CardHeader className="flex-shrink-0 pb-3">
                <CardTitle className="text-lg">Questions {getQuestionRange()}</CardTitle>
                <Badge variant="secondary" className="text-xs">
                  {currentTestPart.questions.filter(q => answers[q.id]).length}/{currentTestPart.questions.length} answered
                </Badge>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto min-h-0 p-4">
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
                               >
                                 <div className="flex items-center space-x-2">
                                   <RadioGroupItem value="Yes" id={`${question.id}-yes`} />
                                   <Label htmlFor={`${question.id}-yes`} className="cursor-pointer">Yes</Label>
                                 </div>
                                 <div className="flex items-center space-x-2">
                                   <RadioGroupItem value="No" id={`${question.id}-no`} />
                                   <Label htmlFor={`${question.id}-no`} className="cursor-pointer">No</Label>
                                 </div>
                                 <div className="flex items-center space-x-2">
                                   <RadioGroupItem value="Not Given" id={`${question.id}-notgiven`} />
                                   <Label htmlFor={`${question.id}-notgiven`} className="cursor-pointer">Not Given</Label>
                                 </div>
                               </RadioGroup>
                             );
                           }
                           
                           // TRUE/FALSE/NOT GIVEN questions
                           if (detectedType.includes('true_false_not_given')) {
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
                           
                           // Multiple choice questions
                           if (detectedType.includes('multiple_choice') && question.options && question.options.length > 0) {
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
                           
                            // Matching questions (headings, features, sentence endings)
                            if (detectedType.includes('matching') && question.options && question.options.length > 0) {
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
                           
                           // Default to text input for completion types, short answer, etc.
                           return (
                             <div className="space-y-2">
                               <Input
                                 value={answers[question.id] || ''}
                                 onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                                 placeholder="Type your answer here..."
                                 className="max-w-md"
                               />
                               {(detectedType.includes('completion') || detectedType.includes('short')) && (
                                 <p className="text-xs text-muted-foreground">
                                   💡 Remember to check the word limit specified in the question
                                 </p>
                               )}
                             </div>
                           );
                         };

                        return (
                          <div key={question.id} className="border-b pb-4 last:border-b-0">
                            <div className="flex items-start gap-3">
                              <Badge variant="outline" className="mt-1 flex-shrink-0">
                                {question.question_number}
                              </Badge>
                              <div className="flex-1 space-y-3">
                                {/* Always display the question text clearly */}
                                 <div className="space-y-2">
                                   <p className="font-medium leading-relaxed text-sm">
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