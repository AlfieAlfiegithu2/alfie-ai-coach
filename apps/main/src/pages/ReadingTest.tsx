import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ArrowLeft, SendHorizontal, Highlighter } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import StudentLayout from '@/components/StudentLayout';
import TestResults from '@/components/TestResults';
import SpotlightCard from '@/components/SpotlightCard';
import AnnotationTools from '@/components/AnnotationTools';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useThemeStyles } from '@/hooks/useThemeStyles';
import { answersMatch } from '@/lib/ielts-answer-matching';

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
  structure_data?: {
    taskInstruction?: string;
    instructions?: string;
    sectionTitle?: string;
    sectionRange?: string;
  };
}

interface TestPart {
  passage: ReadingPassage;
  questions: ReadingQuestion[];
}

const ReadingTest = () => {
  // Add shortcut for toggling annotation mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key.toLowerCase() === 'a') {
        setIsDrawingMode(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { testId } = useParams();
  const themeStyles = useThemeStyles();
  const [timeLeft, setTimeLeft] = useState(60 * 60); // 60 minutes
  const [currentPart, setCurrentPart] = useState(1);
  const [testParts, setTestParts] = useState<{ [key: number]: TestPart }>({});
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [allQuestions, setAllQuestions] = useState<ReadingQuestion[]>([]);
  const [availableTests, setAvailableTests] = useState<any[]>([]);
  const [isDrawingMode, setIsDrawingMode] = useState(true); // Annotation ON by default
  const passageScrollRef = useRef<HTMLDivElement>(null);
  const questionsScrollRef = useRef<HTMLDivElement>(null);
  const [testData, setTestData] = useState<any>(null);

  useEffect(() => {
    if (!testId) {
      fetchAvailableTests();
    } else {
      // Use testId directly - UUIDs contain hyphens, so don't split
      fetchReadingTest(testId);
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

      // Fetch test by ID - no need for module filter since we already selected from Reading list
      const { data: test, error: testError } = await supabase
        .from('tests')
        .select('*')
        .eq('id', testId)
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
      const partsData: { [key: number]: TestPart } = {};
      const allQuestionsFormatted: ReadingQuestion[] = [];

      // Group questions by part
      const partsByNumber: { [key: number]: any[] } = {};
      const partTitles: { [key: number]: string } = {};

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

        // Try to get passage title from multiple sources:
        // 1. Special title question (question_number_in_part === 0)
        // 2. structure_data.passageTitle from the first question
        // 3. Fallback to "Reading Passage X"
        let partTitle = partTitles[partNumber];
        if (!partTitle && firstQuestion?.structure_data) {
          const structData = typeof firstQuestion.structure_data === 'string'
            ? JSON.parse(firstQuestion.structure_data)
            : firstQuestion.structure_data;
          partTitle = structData?.passageTitle;
        }
        if (!partTitle) {
          partTitle = `Reading Passage ${partNumber}`;
        }

        partsData[partNumber] = {
          passage: {
            id: `passage-${partNumber}`,
            title: partTitle,
            content: firstQuestion?.passage_text || 'Passage content not available',
            part_number: partNumber,
            test_number: (test as any).test_number || 1
          },
          questions: partQuestions.map((q, idx) => {
            // Parse structure_data for additional options
            const structData = q.structure_data
              ? (typeof q.structure_data === 'string' ? JSON.parse(q.structure_data) : q.structure_data)
              : null;

            // Get options from multiple sources: q.choices OR structure_data.options
            let questionOptions: string[] = [];
            if (q.choices) {
              if (typeof q.choices === 'string') {
                questionOptions = q.choices.includes(';') ? q.choices.split(';') : [q.choices];
              } else if (Array.isArray(q.choices)) {
                questionOptions = q.choices.map(o => String(o));
              }
            }
            // Fallback to structure_data.options if no choices found
            if (questionOptions.length === 0 && structData?.options && Array.isArray(structData.options)) {
              questionOptions = structData.options;
            }

            return {
              id: q.id,
              question_number: q.question_number_in_part || idx + 1,
              question_text: q.question_text,
              question_type: q.question_type,
              options: questionOptions,
              correct_answer: q.correct_answer,
              explanation: q.explanation || '',
              passage_id: `passage-${partNumber}`,
              part_number: q.part_number,
              structure_data: q.structure_data
            };
          })
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

      // Match admin query exactly: filter for tests where module='Reading' only
      const { data: tests, error: testsError } = await supabase
        .from('tests')
        .select('*')
        .eq('test_type', 'IELTS')
        .eq('module', 'Reading')
        .order('created_at', { ascending: false });

      if (testsError) {
        console.error('❌ Error loading tests:', testsError);
        throw testsError;
      }

      let finalTests = tests || [];

      // Filter out tests that don't have any questions yet
      if (finalTests.length > 0) {
        const testIds = finalTests.map(t => t.id);
        const { data: questionsData, error: questionsError } = await supabase
          .from('questions')
          .select('test_id')
          .in('test_id', testIds);

        if (!questionsError && questionsData) {
          const testsWithQuestions = new Set(questionsData.map(q => q.test_id));
          const testsBeforeFilter = finalTests.length;
          finalTests = finalTests.filter((test: any) => testsWithQuestions.has(test.id));
          console.log(`📊 Filtered from ${testsBeforeFilter} to ${finalTests.length} tests (only showing tests with questions)`);
        }
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
      if (answersMatch(answers[question.id], question.correct_answer)) {
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
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
      <StudentLayout title="Reading Test Results" transparentBackground fullWidth noPadding>
        <TestResults
          score={calculateScore()}
          totalQuestions={allQuestions.length}
          timeTaken={(60 * 60) - timeLeft}
          answers={answers}
          questions={allQuestions}
          onRetake={() => window.location.reload()}
          onContinue={() => navigate('/ielts-portal')}
          testTitle={`Reading Test ${testData?.test_name || testId}`}
          testParts={testParts}
        />
      </StudentLayout>
    );
  }

  if (!testId) {
    return (
      <div className="min-h-screen relative"
        style={{
          backgroundColor: themeStyles.theme.name === 'dark' ? themeStyles.theme.colors.background : 'transparent'
        }}
      >
        <div className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed"
          style={{
            backgroundImage: themeStyles.theme.name === 'note' || themeStyles.theme.name === 'minimalist' || themeStyles.theme.name === 'dark'
              ? 'none'
              : `url('/1000031207.png')`,
            backgroundColor: themeStyles.backgroundImageColor
          }} />
        <div className="relative z-10">
          <StudentLayout title="Available Reading Tests">
            <div className="min-h-screen py-12">
              <div className="container mx-auto px-4">
                <div className="max-w-4xl mx-auto">
                  <div className="mb-8 text-center">
                    <h1 className="text-4xl font-bold mb-2" style={{ color: themeStyles.textPrimary }}>IELTS Reading Tests</h1>
                  </div>

                  {availableTests.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {availableTests.map((test) => (
                        <SpotlightCard
                          key={test.id}
                          className="cursor-pointer h-[140px] hover:scale-105 transition-all duration-300 hover:shadow-lg flex items-center justify-center"
                          onClick={() => navigate(`/reading/${test.id}`)}
                          style={{
                            backgroundColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.8)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.1)' : themeStyles.theme.name === 'minimalist' ? '#ffffff' : themeStyles.theme.colors.cardBackground,
                            borderColor: themeStyles.border,
                            ...themeStyles.cardStyle
                          }}
                        >
                          <CardContent className="p-3 md:p-4 text-center flex items-center justify-center h-full">
                            <h3 className="font-semibold text-sm" style={{ color: themeStyles.textPrimary }}>{test.test_name || `Reading Test ${test.test_number || ''}`}</h3>
                          </CardContent>
                        </SpotlightCard>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-lg mb-4" style={{ color: themeStyles.textSecondary }}>No reading tests available yet</p>
                      <Button
                        onClick={() => navigate('/ielts-portal')}
                        variant="outline"
                        style={{
                          borderColor: themeStyles.border,
                          color: themeStyles.textPrimary,
                          backgroundColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.1)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.1)' : themeStyles.theme.name === 'minimalist' ? '#ffffff' : themeStyles.theme.colors.cardBackground
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = themeStyles.hoverBg}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.1)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.1)' : themeStyles.theme.name === 'minimalist' ? '#ffffff' : themeStyles.theme.colors.cardBackground}
                      >
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
    <StudentLayout title={`Reading Test - Part ${currentPart}`} transparentBackground fullWidth noPadding>
      <div className="h-screen flex flex-col bg-[#FEF9E7] overflow-hidden">
        {/* Minimal Header with Timer & Part Selection */}
        <div className="flex-shrink-0 bg-[#FEF9E7] border-b border-[#E8D5A3] shadow-sm">
          <div className="px-4 py-3 grid grid-cols-3 items-center">
            {/* Left Column: Back Button */}
            <div className="flex justify-start">
              <Button variant="ghost" onClick={() => navigate('/ielts-portal')} className="text-[#8B4513] hover:bg-[#E8D5A3]/30 rounded-full h-9 px-4 transition-all">
                <ArrowLeft className="w-4 h-4 mr-2" />
                <span className="font-medium">Back</span>
              </Button>
            </div>

            {/* Middle Column: Passage Part Selection (Centered) */}
            <div className="flex justify-center">
              <div className="flex items-center gap-1.5 bg-white/80 backdrop-blur-sm p-1 rounded-full border border-[#E8D5A3] shadow-inner">
                {Object.keys(testParts).map((partNum) => {
                  const partNumber = parseInt(partNum);
                  const isActive = currentPart === partNumber;
                  return (
                    <button
                      key={partNumber}
                      onClick={() => handlePartNavigation(partNumber)}
                      className={`w-8 h-8 rounded-full font-bold text-sm transition-all duration-500 ${isActive
                        ? 'bg-[#8B4513] text-white shadow-md scale-110 z-10'
                        : 'text-[#8B4513]/60 hover:text-[#8B4513] hover:bg-[#8B4513]/5'
                        }`}
                    >
                      {partNumber}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Tools, Timer & Submit */}
            <div className="flex justify-end items-center gap-4">
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsDrawingMode(!isDrawingMode)}
                      className={`w-9 h-9 rounded-full transition-all flex items-center justify-center ${isDrawingMode ? 'bg-[#8B4513] text-white' : 'text-[#8B4513] hover:bg-[#E8D5A3]/30'}`}
                    >
                      <Highlighter className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" sideOffset={8} className="bg-[#2f241f] text-white border-none text-xs px-2 py-1 z-[100]">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold">Annotation Tools (A)</span>
                      <span className="text-[10px] opacity-70">Draw, highlight and annotate the test content</span>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <span className="font-sans text-sm font-extrabold tabular-nums tracking-wider text-[#8B4513] bg-[#8B4513]/5 px-2.5 py-1 rounded-md">
                {formatTime(timeLeft)}
              </span>

              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={handleSubmit}
                      variant="ghost"
                      size="sm"
                      className="text-[#8B4513] hover:bg-[#8B4513]/10 w-9 h-9 flex items-center justify-center rounded-full transition-all active:scale-95"
                    >
                      <SendHorizontal className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" sideOffset={8} className="bg-[#2f241f] text-white border-none text-xs px-2 py-1 z-[100]">
                    Submit Test
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>

        {/* Full Page Main Content - Two Column Layout with Independent Scroll */}
        <div className="flex-1 grid lg:grid-cols-2 min-h-0">
          {/* Passage - Left Panel */}
          <div className="flex flex-col min-h-0 bg-[#FEF9E7] border-r border-[#E8D5A3]">
            <div className="flex-shrink-0 border-b border-[#E8D5A3] px-6 py-4">
              <h2 className="font-serif text-black text-xl font-semibold">
                {currentTestPart.passage.title}
              </h2>
            </div>
            <div id="passage-content" ref={passageScrollRef} className="flex-1 overflow-y-auto px-6 py-5 ielts-scrollbar relative">
              {/* Passage Canvas */}
              <AnnotationTools
                isOpen={isDrawingMode}
                onClose={() => setIsDrawingMode(false)}
                passageRef={passageScrollRef}
                questionsRef={questionsScrollRef}
              />
              <div className="prose prose-lg max-w-none font-serif text-black">
                <div className="whitespace-pre-wrap leading-loose text-justify">
                  {currentTestPart.passage.content}
                </div>
              </div>
            </div>
          </div>

          {/* Questions - Right Panel */}
          <div className="flex flex-col min-h-0 bg-[#FEF9E7]">
            <div className="flex-shrink-0 border-b border-[#E8D5A3] px-6 py-4">
              <h2 className="text-xl text-black font-serif font-semibold">
                Questions {currentTestPart.questions[0]?.question_number} - {currentTestPart.questions[currentTestPart.questions.length - 1]?.question_number}
              </h2>
            </div>
            <div id="questions-content" ref={questionsScrollRef} className="flex-1 overflow-y-auto px-6 py-5 ielts-scrollbar relative">
              {(() => {
                // Group questions by their question_type AND options to render sections
                // Questions with same type but different options should be separate sections
                const sections: {
                  type: string;
                  questions: typeof currentTestPart.questions;
                  options: string[];
                  taskInstruction?: string;
                  instructions?: string;
                  range?: string;
                }[] = [];
                let currentSection: typeof sections[0] | null = null;

                currentTestPart.questions.forEach((q) => {
                  const qType = q.question_type || 'Short Answer';
                  const optionsKey = (q.options || []).join('|');
                  const currentOptionsKey = currentSection ? currentSection.options.join('|') : '';

                  // Use section range as a primary grouping key if available
                  // This is CRITICAL for distinguishing between "Questions 33-38" and "Questions 39-40"
                  // even if they are both "Short Answer" types
                  // Cast structure_data to any to access dynamic properties safely
                  const structureData = q.structure_data as any;
                  const qRange = structureData?.sectionRange || structureData?.questionRange || '';
                  const currentRange = currentSection ? (currentSection.range || '') : '';

                  // Check if same type AND same options AND same range as current section
                  const isSameRange = qRange && currentRange ? qRange === currentRange : true; // If no explicit range, rely on type/options

                  if (currentSection && currentSection.type === qType && optionsKey === currentOptionsKey && isSameRange) {
                    currentSection.questions.push(q);

                    // Check if this subsequent question has better instruction data
                    // This fixes the issue where the first question might have empty structure_data
                    // but later questions (especially in pasted content) might have it
                    if (structureData?.taskInstruction && !currentSection.taskInstruction) {
                      currentSection.taskInstruction = structureData.taskInstruction;
                    }
                    if (structureData?.instructions && !currentSection.instructions) {
                      currentSection.instructions = structureData.instructions;
                    }
                  } else {
                    // Start new section - extract task instructions from structure_data
                    // Options can come from question.options OR structure_data.options (for List Selection, etc.)
                    const sectionOptions = q.options || structureData?.options || [];
                    currentSection = {
                      type: qType,
                      questions: [q],
                      options: sectionOptions,
                      taskInstruction: structureData?.taskInstruction || '',
                      instructions: structureData?.instructions || '',
                      range: qRange // Store the range to compare with next questions
                    };
                    sections.push(currentSection);
                  }
                });

                return sections.map((section, sIdx) => {
                  const isYesNo = section.type.toLowerCase().includes('yes') && section.type.toLowerCase().includes('no');
                  const isTrueFalse = section.type.toLowerCase().includes('true') && section.type.toLowerCase().includes('false');

                  // Check if this is a matching question:
                  // 1. Explicit matching type, OR
                  // 2. Options have format "A  Name" or "A  Sentence" (5+ chars after letter) 
                  //    with 5+ options (A-E or more), which indicates matching to people/books/etc
                  const hasMatchingOptions = section.options.length >= 5 &&
                    section.options.every(opt => /^[A-G]\s{1,2}[A-Z]/.test(opt));
                  const isMatching = section.type.toLowerCase().includes('matching') ||
                    section.type.toLowerCase().includes('paragraph') ||
                    hasMatchingOptions;

                  const isSummary = section.type.toLowerCase().includes('summary') ||
                    (section.type.toLowerCase().includes('completion') && !isMatching);

                  // List Selection: "Choose TWO/THREE correct letters" type
                  const isListSelection = section.type.toLowerCase().includes('list') ||
                    section.type.toLowerCase().includes('selection') ||
                    (section.taskInstruction && /choose\s+(two|three|2|3)/i.test(section.taskInstruction));

                  // Get first and last question numbers for section header
                  const firstQ = section.questions[0]?.question_number;
                  const lastQ = section.questions[section.questions.length - 1]?.question_number;
                  const questionRange = firstQ === lastQ ? `${firstQ}` : `${firstQ}-${lastQ}`;

                  return (
                    <div key={`section-${sIdx}`} className="py-6 border-b border-[#E8D5A3]/40 last:border-b-0">
                      {/* Section Header */}
                      <div className="mb-4">
                        <h5 className="font-bold text-lg text-black font-serif">
                          Questions {questionRange}
                        </h5>
                        {/* Task Instruction - from admin preview (skip for YNNG/TFNG as it shows in legend box) */}
                        {section.taskInstruction && !isYesNo && !isTrueFalse && (
                          <p className="text-sm text-black mt-2 leading-relaxed whitespace-pre-wrap">
                            {section.taskInstruction}
                          </p>
                        )}
                        {/* Full Instructions - HIDE for Summary Completion (rendered separately) */}
                        {!section.taskInstruction && section.instructions && !isYesNo && !isTrueFalse && !isSummary && (
                          <p className="text-sm text-black mt-2 italic leading-relaxed whitespace-pre-wrap">
                            {section.instructions}
                          </p>
                        )}
                      </div>

                      {/* Summary Completion Box - Match Admin Preview */}
                      {isSummary && section.instructions && (
                        <div className="mb-6">
                          <div className="p-5 bg-[#fdfaf3] rounded-xl border border-[#e0d6c7] text-black text-sm leading-7 shadow-sm">
                            {section.instructions.split('\n').map((line, i) => (
                              <p key={i} className={`mb-2 last:mb-0 ${line.trim() === '' ? 'h-4' : ''}`}>
                                {line}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Word Bank for Summary Completion - Show word bank AND answer boxes like admin preview */}
                      {isSummary && section.options.length > 0 && (
                        <div className="mb-4 space-y-4">
                          {/* Word Bank Grid */}
                          <div className="p-4 bg-[#fdfaf3] rounded-xl border border-[#e0d6c7] shadow-sm">
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-6 gap-y-2">
                              {section.options.map((opt, idx) => {
                                const match = opt.match(/^([A-Z])\s+(.+)$/i);
                                const letter = match ? match[1].toUpperCase() : String.fromCharCode(65 + idx);
                                const text = match ? match[2].trim() : opt;
                                return (
                                  <div key={idx} className="flex gap-2 text-sm text-black">
                                    <span className="font-bold text-[#8B4513] min-w-[16px]">{letter}</span>
                                    <span>{text}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Answer boxes in horizontal row - matching admin preview */}
                          <div className="flex flex-wrap gap-3">
                            {section.questions.map((q) => (
                              <div key={`summary-q-${q.question_number}`} className="flex items-center gap-2">
                                <span className="font-bold text-black text-sm">
                                  {q.question_number}
                                </span>
                                <select
                                  value={answers[q.id] || ''}
                                  onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                  className="w-44 h-9 bg-white border border-[#D3C4A5] rounded-lg px-2 focus:ring-1 focus:ring-[#8B4513] focus:border-[#8B4513] shadow-sm font-serif text-sm text-black"
                                >
                                  <option value="">Select...</option>
                                  {section.options.map((opt, idx) => {
                                    const match = opt.match(/^([A-Z])\s+(.+)$/i);
                                    const letter = match ? match[1].toUpperCase() : String.fromCharCode(65 + idx);
                                    const text = match ? match[2].trim() : opt;
                                    return (
                                      <option key={idx} value={letter}>{letter} - {text}</option>
                                    );
                                  })}
                                </select>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* YES/NO/NOT GIVEN or TRUE/FALSE/NOT GIVEN Legend */}
                      {(isYesNo || isTrueFalse) && (
                        <div className="mb-4 p-3 bg-[#fdfaf3] rounded-lg border border-[#e0d6c7]">
                          {/* Task instruction for YNNG/TFNG */}
                          {section.taskInstruction && (
                            <p className="text-sm text-black mb-3 leading-relaxed whitespace-pre-wrap">
                              {section.taskInstruction}
                            </p>
                          )}
                          {isYesNo ? (
                            <div className="space-y-1">
                              <div className="flex gap-4 text-sm">
                                <span className="font-bold text-black w-24">YES</span>
                                <span className="text-black">if the statement agrees with the claims of the writer</span>
                              </div>
                              <div className="flex gap-4 text-sm">
                                <span className="font-bold text-black w-24">NO</span>
                                <span className="text-black">if the statement contradicts the claims of the writer</span>
                              </div>
                              <div className="flex gap-4 text-sm">
                                <span className="font-bold text-black w-24">NOT GIVEN</span>
                                <span className="text-black">if it is impossible to say what the writer thinks about this</span>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <div className="flex gap-4 text-sm">
                                <span className="font-bold text-black w-24">TRUE</span>
                                <span className="text-black">if the statement agrees with the information</span>
                              </div>
                              <div className="flex gap-4 text-sm">
                                <span className="font-bold text-black w-24">FALSE</span>
                                <span className="text-black">if the statement contradicts the information</span>
                              </div>
                              <div className="flex gap-4 text-sm">
                                <span className="font-bold text-black w-24">NOT GIVEN</span>
                                <span className="text-black">if there is no information on this</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Options box for Matching types and List Selection - show once at top */}
                      {((isMatching && !isSummary) || isListSelection) && section.options.length > 0 && (
                        <div className="mb-4 p-3 bg-[#fdfaf3] rounded-lg border border-[#e0d6c7]">
                          <div className="space-y-1">
                            {section.options.map((opt, oIdx) => (
                              <div key={oIdx} className="text-sm text-black whitespace-pre-wrap">
                                {opt}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Questions */}
                      <div className="space-y-4">
                        {section.questions.map((question) => {
                          const renderAnswerInput = () => {
                            // YES/NO/NOT GIVEN
                            if (isYesNo) {
                              return (
                                <RadioGroup
                                  value={answers[question.id] || ''}
                                  onValueChange={(value) => handleAnswerChange(question.id, value)}
                                  className="flex flex-wrap gap-2 mt-2"
                                >
                                  {['YES', 'NO', 'NOT GIVEN'].map((option) => {
                                    const isSelected = answers[question.id] === option;
                                    return (
                                      <div key={option} className="relative">
                                        <RadioGroupItem value={option} id={`${question.id}-${option}`} className="peer sr-only" />
                                        <Label
                                          htmlFor={`${question.id}-${option}`}
                                          className={`flex items-center justify-center px-4 py-1.5 min-w-[80px] rounded-md border transition-all duration-200 cursor-pointer text-sm font-bold tracking-wide ${isSelected
                                            ? 'bg-[#8B4513] text-white border-[#8B4513] shadow-md'
                                            : 'bg-white border-[#E8D5A3] text-black hover:bg-[#FEF9E7] hover:border-[#8B4513]'
                                            }`}
                                        >
                                          {option}
                                        </Label>
                                      </div>
                                    );
                                  })}
                                </RadioGroup>
                              );
                            }

                            // TRUE/FALSE/NOT GIVEN
                            if (isTrueFalse) {
                              return (
                                <RadioGroup
                                  value={answers[question.id] || ''}
                                  onValueChange={(value) => handleAnswerChange(question.id, value)}
                                  className="flex flex-wrap gap-2 mt-2"
                                >
                                  {['TRUE', 'FALSE', 'NOT GIVEN'].map((option) => {
                                    const isSelected = answers[question.id] === option;
                                    return (
                                      <div key={option} className="relative">
                                        <RadioGroupItem value={option} id={`${question.id}-${option}`} className="peer sr-only" />
                                        <Label
                                          htmlFor={`${question.id}-${option}`}
                                          className={`flex items-center justify-center px-4 py-1.5 min-w-[80px] rounded-md border transition-all duration-200 cursor-pointer text-sm font-bold tracking-wide ${isSelected
                                            ? 'bg-[#8B4513] text-white border-[#8B4513] shadow-md'
                                            : 'bg-white border-[#E8D5A3] text-black hover:bg-[#FEF9E7] hover:border-[#8B4513]'
                                            }`}
                                        >
                                          {option}
                                        </Label>
                                      </div>
                                    );
                                  })}
                                </RadioGroup>
                              );
                            }

                            // Matching types - just letter input OR Roman numeral for Matching Headings
                            if (isMatching) {
                              // Check if this is Matching Headings (uses Roman numerals i-vii)
                              const isMatchingHeadings = section.type.toLowerCase().includes('heading');
                              // Also detect Roman numerals in options (i, ii, iii, iv, v, vi, vii, viii, ix, x)
                              const hasRomanNumeralOptions = section.options.some(opt =>
                                /^(i{1,3}|iv|vi{0,3}|ix|x)\s/i.test(opt.trim())
                              );
                              const usesRomanNumerals = isMatchingHeadings || hasRomanNumeralOptions;

                              // Determine placeholder and maxLength based on answer type
                              const hasOptions = section.options.length > 0;
                              let placeholder: string;
                              let inputMaxLength: number;

                              if (usesRomanNumerals) {
                                // Roman numerals: i-vii (max 4 chars for "viii") - no placeholder
                                placeholder = '';
                                inputMaxLength = 4;
                              } else {
                                // Letters: A-G - no placeholder
                                placeholder = '';
                                inputMaxLength = 1;
                              }

                              return (
                                <Input
                                  value={answers[question.id] || ''}
                                  onChange={(e) => handleAnswerChange(question.id, usesRomanNumerals ? e.target.value.toLowerCase() : e.target.value.toUpperCase())}
                                  placeholder={placeholder}
                                  maxLength={inputMaxLength}
                                  className={`${usesRomanNumerals ? 'w-20' : 'w-16'} h-10 text-center bg-white border border-[#E8D5A3] rounded-lg focus:ring-1 focus:ring-[#8B4513] focus:border-[#8B4513] shadow-sm font-serif text-lg font-bold text-black ${usesRomanNumerals ? 'lowercase' : 'uppercase'} mt-2`}
                                />
                              );
                            }

                            // Summary/Completion - text input or dropdown with options
                            if (isSummary) {
                              // Use section.options for the word bank (A-N options) instead of question.options
                              const wordBankOptions = section.options || [];
                              const hasWordBank = wordBankOptions.length > 0;

                              // Simplified rendering for summary completion to match admin preview
                              // Just the number and the input box side-by-side

                              const inputElement = hasWordBank ? (
                                <select
                                  value={answers[question.id] || ''}
                                  onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                                  className="w-full sm:w-56 h-10 bg-white border border-[#E8D5A3] rounded-lg px-3 focus:ring-1 focus:ring-[#8B4513] focus:border-[#8B4513] shadow-sm font-serif text-sm text-black"
                                >
                                  <option value="">Select...</option>
                                  {wordBankOptions.map((opt, idx) => {
                                    // Parse the option format: "A   pollution" or "B  internet energy"
                                    const match = opt.match(/^([A-Z])\s+(.+)$/i);
                                    const letter = match ? match[1].toUpperCase() : String.fromCharCode(65 + idx);
                                    const text = match ? match[2].trim() : opt;
                                    return (
                                      <option key={idx} value={letter}>{letter}   {text}</option>
                                    );
                                  })}
                                </select>
                              ) : (
                                <Input
                                  value={answers[question.id] || ''}
                                  onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                                  placeholder=""
                                  className="flex-1 sm:flex-none sm:w-48 h-10 bg-white border border-[#E8D5A3] rounded-lg px-3 focus:ring-1 focus:ring-[#8B4513] focus:border-[#8B4513] shadow-sm font-serif text-base text-black"
                                />
                              );

                              // For Sentence Completion, return just the input because the wrapper handles Number + Text
                              if (section.type.toLowerCase().includes('sentence')) {
                                return <div className="mt-2">{inputElement}</div>;
                              }

                              // For regular Summary Completion, show Number + Input side-by-side
                              return (
                                <div className="flex items-center gap-3 mt-1">
                                  <span className="font-bold text-black text-sm w-6 text-right pt-2.5 sm:pt-0">
                                    {question.question_number}
                                  </span>
                                  {inputElement}
                                </div>
                              );
                            }

                            // Multiple Choice / Sentence Completion with A-D options
                            // Check individual question options since section might not have them
                            const questionHasOptions = question.options && question.options.length >= 3 && question.options.length <= 4;
                            if (questionHasOptions && !isMatching) {
                              return (
                                <RadioGroup
                                  value={answers[question.id] || ''}
                                  onValueChange={(value) => handleAnswerChange(question.id, value)}
                                  className="grid gap-2 mt-3"
                                >
                                  {question.options.map((option, index) => {
                                    const letter = String.fromCharCode(65 + index);
                                    const isSelected = answers[question.id] === letter;
                                    return (
                                      <div key={index} className="relative">
                                        <RadioGroupItem value={letter} id={`${question.id}-${letter}`} className="peer sr-only" />
                                        <Label
                                          htmlFor={`${question.id}-${letter}`}
                                          className={`flex items-center p-3 rounded-lg border transition-all duration-200 cursor-pointer ${isSelected
                                            ? 'bg-[#8B4513] text-white border-[#8B4513] shadow-md'
                                            : 'border-[#E8D5A3] bg-white hover:bg-[#FEF9E7] hover:border-[#8B4513]'
                                            }`}
                                        >
                                          <span className={`flex-shrink-0 font-bold text-base mr-3 w-6 h-6 flex items-center justify-center rounded-sm ${isSelected ? 'text-[#8B4513] bg-white' : 'text-[#8B4513] bg-[#E8D5A3]/30'}`}>
                                            {letter}
                                          </span>
                                          <span className={`text-base leading-relaxed ${isSelected ? 'text-white' : 'text-black'}`}>
                                            {option.replace(/^[A-D]\s+/, '')}
                                          </span>
                                        </Label>
                                      </div>
                                    );
                                  })}
                                </RadioGroup>
                              );
                            }

                            // Default - text input
                            return (
                              <Input
                                value={answers[question.id] || ''}
                                onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                                className="max-w-md bg-white border border-[#E8D5A3] rounded-lg px-4 py-2 focus:ring-1 focus:ring-[#8B4513] focus:border-[#8B4513] shadow-sm font-serif h-10 text-base text-black mt-2"
                              />
                            );
                          };

                          return (
                            <div key={question.id} className="flex items-start gap-3">
                              {/* For non-summary questions OR Sentence Completion, show number and text normally */}
                              {(!isSummary || section.type.toLowerCase().includes('sentence')) && (
                                <>
                                  <div className="flex-shrink-0 text-base font-bold text-black font-serif w-6 text-right pt-0.5">
                                    {question.question_number}
                                  </div>
                                  <div className="flex-1">
                                    <p className="font-serif text-base text-black leading-relaxed">
                                      {question.question_text}
                                    </p>
                                    {renderAnswerInput()}
                                  </div>
                                </>
                              )}

                              {/* For summary questions WITH word bank - skip here, already rendered above */}
                              {/* For summary questions WITHOUT word bank - use renderAnswerInput */}
                              {isSummary && !section.type.toLowerCase().includes('sentence') && section.options.length === 0 && (
                                <div className="flex-1">
                                  {renderAnswerInput()}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      </div>
    </StudentLayout>
  );
};

export default ReadingTest;