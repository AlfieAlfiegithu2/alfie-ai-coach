import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import DotLottieLoadingAnimation from '@/components/animations/DotLottieLoadingAnimation';
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
  const isNoteTheme = themeStyles.theme.name === 'note' || themeStyles.theme.name === 'glassmorphism';
  const isGlassmorphism = false;
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
  const [showSlowLoading, setShowSlowLoading] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (loading) {
      timer = setTimeout(() => setShowSlowLoading(true), 8000);
    } else {
      setShowSlowLoading(false);
    }
    return () => clearTimeout(timer);
  }, [loading]);

  const handleClearCacheAndReload = () => {
    if (testId) localStorage.removeItem(`reading_test_${testId}`);
    window.location.reload();
  };

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
    const cacheKey = `reading_test_${testId}`;
    const cachedData = localStorage.getItem(cacheKey);

    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        setTestData(parsed.testData);
        setTestParts(parsed.partsData);
        setAllQuestions(parsed.allQuestions);
        setLoading(false);
        console.log('⚡ Reading test loaded instantly from cache');

        // Preload passage images from cache
        Object.values(parsed.partsData).forEach((part: any) => {
          if (part.passage?.image_url) {
            const img = new Image();
            img.src = part.passage.image_url;
          }
        });
        return; // Exit if data loaded from cache
      } catch (e) {
        console.error('Failed to parse reading test cache, fetching from network', e);
        localStorage.removeItem(cacheKey); // Clear corrupted cache
      }
    }

    setLoading(true); // Set loading true if no cache or cache failed

    try {
      if (!testId || testId === 'random') {
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
        setLoading(false);
        return;
      }

      // OPTIMIZATION: Use join to fetch test and questions in one request, limiting columns
      const { data: testData, error: testError } = await supabase
        .from('tests')
        .select(`
          id, 
          test_name, 
          test_type, 
          module, 
          skill_category,
          questions(
            id, 
            part_number, 
            question_number_in_part, 
            question_text, 
            passage_text, 
            image_url, 
            explanation, 
            transcription, 
            choices, 
            correct_answer,
            question_type,
            structure_data
          )
        `)
        .eq('id', testId)
        .maybeSingle();

      if (testError) throw testError;
      if (!testData) {
        if (!cachedData) { // Only show toast/navigate if no cached data was available
          toast({
            title: "Test Not Found",
            description: "This test doesn't exist. Please check the test ID.",
            variant: "destructive"
          });
          navigate(-1);
        }
        return;
      }

      setTestData(testData);
      const questions = testData.questions || [];

      if (!questions || questions.length === 0) {
        if (!cachedData) { // Only show toast/navigate if no cached data was available
          toast({
            title: "No Questions Available",
            description: "This test doesn't have questions yet. Please contact your instructor.",
            variant: "destructive"
          });
          navigate(-1);
        }
        return;
      }

      // Organize questions by part
      const partsData: { [key: number]: TestPart } = {};
      const allQuestionsFormatted: ReadingQuestion[] = [];

      // OPTIMIZATION: Preload images for questions
      questions.forEach(q => {
        if (q.image_url) {
          const img = new Image();
          img.src = q.image_url;
        }
      });

      // Group questions by part and extract part titles
      const partsByNumber: { [key: number]: any[] } = {};
      const partTitles: { [key: number]: string } = {};
      const passageContents: { [key: number]: string } = {};
      const passageImageUrls: { [key: number]: string | undefined } = {};


      questions.forEach((question: any) => {
        if (question.question_number_in_part === 0) {
          // This is a title question
          partTitles[question.part_number] = question.question_text;
          if (question.passage_text) passageContents[question.part_number] = question.passage_text;
          if (question.image_url) passageImageUrls[question.part_number] = question.image_url;
          return;
        }

        if (!partsByNumber[question.part_number]) {
          partsByNumber[question.part_number] = [];
        }
        partsByNumber[question.part_number].push(question);
        // Capture passage content and image from the first question of a part if not already set by a title question
        if (!passageContents[question.part_number] && question.passage_text) {
          passageContents[question.part_number] = question.passage_text;
        }
        if (!passageImageUrls[question.part_number] && question.image_url) {
          passageImageUrls[question.part_number] = question.image_url;
        }
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
            test_number: (testData as any).test_number || 1
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
              questionOptions = structData.options.map((o: any) => String(o));
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

      // Save to cache
      localStorage.setItem(cacheKey, JSON.stringify({
        testData,
        partsData,
        allQuestions: allQuestionsFormatted
      }));

      console.log(`✅ Loaded ${Object.keys(partsData).length} parts with ${allQuestionsFormatted.length} total questions and cached`);

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
    // ⚡ SILENT CACHE: Available Tests
    const cacheKey = 'available_reading_tests';
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        setAvailableTests(JSON.parse(cached));
        setLoading(false);
        console.log('⚡ Reading lists loaded from cache');
      } catch (e) { }
    }

    if (!cached) setLoading(true);
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

      // ⚡ Save to cache
      localStorage.setItem('available_reading_tests', JSON.stringify(finalTests));
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
      <div
        className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
        style={{
          background: isGlassmorphism ? themeStyles.backgroundGradient : undefined,
          backgroundColor: isGlassmorphism ? undefined : (isNoteTheme ? '#FFFAF0' : themeStyles.theme.colors.background)
        }}
      >
        {isNoteTheme && (
          <>
            <div
              className="absolute inset-0 pointer-events-none opacity-30 z-0"
              style={{
                backgroundImage: `url("https://www.transparenttextures.com/patterns/rice-paper-2.png")`,
                mixBlendMode: 'multiply'
              }}
            />
            <div
              className="absolute inset-0 pointer-events-none opacity-10 z-0"
              style={{
                backgroundImage: `url("https://www.transparenttextures.com/patterns/natural-paper.png")`,
                mixBlendMode: 'multiply',
                filter: 'contrast(1.2)'
              }}
            />
          </>
        )}
        <div className="relative z-10 flex flex-col items-center gap-4">
          <DotLottieLoadingAnimation />
          {showSlowLoading && (
            <div className="flex flex-col items-center gap-2 animate-in fade-in zoom-in duration-500 mt-4">
              <p className="text-sm font-medium font-serif" style={{ color: themeStyles.textSecondary }}>Taking longer than expected?</p>
              <Button
                onClick={handleClearCacheAndReload}
                variant="outline"
                size="sm"
                className="bg-white transition-colors"
                style={{ borderColor: themeStyles.buttonPrimary, color: themeStyles.buttonPrimary }}
              >
                Resolve from Cache
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (showResults) {
    return (
      <div
        className="min-h-screen relative"
        style={{
          background: isGlassmorphism ? themeStyles.backgroundGradient : undefined,
          backgroundColor: isNoteTheme ? '#FFFAF0' : (isGlassmorphism ? undefined : themeStyles.theme.colors.background)
        }}
      >
        <StudentLayout title="Reading Test Results" transparentBackground fullWidth noPadding>
          {/* Paper texture overlays for Note theme */}
          {isNoteTheme && (
            <div
              className="fixed inset-0 pointer-events-none z-50"
              style={{
                backgroundImage: `url("https://www.transparenttextures.com/patterns/rice-paper-2.png")`,
                mixBlendMode: 'multiply',
                opacity: 0.35,
                filter: 'contrast(1.2)'
              }}
            />
          )}
          <TestResults
            score={calculateScore()}
            totalQuestions={allQuestions.length}
            timeTaken={(60 * 60) - timeLeft}
            answers={answers}
            questions={allQuestions}
            onRetake={() => window.location.reload()}
            onContinue={() => navigate('/exam-selection')}
            testTitle={`Reading Test ${testData?.test_name || testId}`}
            testParts={testParts}
          />
        </StudentLayout>
      </div>
    );
  }

  if (!testId) {
    return (
      <div className="min-h-screen relative"
        style={{
          background: isGlassmorphism ? themeStyles.backgroundGradient : undefined,
          backgroundColor: isGlassmorphism ? undefined : (themeStyles.theme.name === 'dark' ? themeStyles.theme.colors.background : (isNoteTheme ? '#FFFAF0' : 'transparent'))
        }}
      >
        <div className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed"
          style={{
            backgroundImage: isNoteTheme || themeStyles.theme.name === 'minimalist' || themeStyles.theme.name === 'dark' || isGlassmorphism
              ? 'none'
              : `url('/1000031207.png')`,
            backgroundColor: isNoteTheme ? '#FFFAF0' : themeStyles.backgroundImageColor
          }} />

        {/* Paper texture overlays for Note theme */}
        {isNoteTheme && (
          <>
            {/* Background texture layer */}
            <div
              className="absolute inset-0 pointer-events-none opacity-30 z-0"
              style={{
                backgroundImage: `url("https://www.transparenttextures.com/patterns/rice-paper-2.png")`,
                mixBlendMode: 'multiply'
              }}
            />
            <div
              className="absolute inset-0 pointer-events-none opacity-10 z-0"
              style={{
                backgroundImage: `url("https://www.transparenttextures.com/patterns/natural-paper.png")`,
                mixBlendMode: 'multiply',
                filter: 'contrast(1.2)'
              }}
            />
            {/* Top texture overlay - affects all content */}
            <div
              className="fixed inset-0 pointer-events-none z-50"
              style={{
                backgroundImage: `url("https://www.transparenttextures.com/patterns/rice-paper-2.png")`,
                mixBlendMode: 'multiply',
                opacity: 0.35,
                filter: 'contrast(1.2)'
              }}
            />
          </>
        )}

        <div className="relative z-10">
          <StudentLayout title="Available Reading Tests" showBackButton={true} backPath="/exam-selection">
            <div className="min-h-screen py-12">
              <div className="container mx-auto px-4">
                <div className="max-w-4xl mx-auto">
                  <div className="mb-8 text-center">
                    <h1 className={`text-4xl font-bold mb-2 ${isNoteTheme ? "font-handwriting text-5xl" : ""}`} style={{ color: themeStyles.textPrimary }}>IELTS Reading Tests</h1>
                  </div>

                  {availableTests.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {availableTests.map((test) => (
                        <SpotlightCard
                          key={test.id}
                          className="cursor-pointer h-[140px] hover:scale-105 transition-all duration-300 hover:shadow-lg flex items-center justify-center"
                          onClick={() => navigate(`/reading/${test.id}`)}
                          style={{
                            backgroundColor: isGlassmorphism ? 'rgba(255,255,255,0.6)' : (themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.1)' : (themeStyles.theme.name === 'minimalist' ? '#ffffff' : themeStyles.theme.colors.cardBackground)),
                            borderColor: themeStyles.border,
                            backdropFilter: isGlassmorphism ? 'blur(12px)' : undefined,
                            ...themeStyles.cardStyle
                          }}
                        >
                          <CardContent className="p-3 md:p-4 text-center flex items-center justify-center h-full">
                            <h3 className={`font-semibold text-sm ${isNoteTheme ? "font-handwriting text-xl font-bold" : ""}`} style={{ color: themeStyles.textPrimary }}>{test.test_name || `Reading Test ${test.test_number || ''}`}</h3>
                          </CardContent>
                        </SpotlightCard>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-lg mb-4" style={{ color: themeStyles.textSecondary }}>No reading tests available yet</p>
                      <Button
                        onClick={() => navigate('/exam-selection')}
                        variant="outline"
                        style={{
                          borderColor: themeStyles.border,
                          color: themeStyles.textPrimary,
                          backgroundColor: isGlassmorphism ? 'rgba(255,255,255,0.2)' : (themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.1)' : (themeStyles.theme.name === 'minimalist' ? '#ffffff' : themeStyles.theme.colors.cardBackground))
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = themeStyles.hoverBg}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isGlassmorphism ? 'rgba(255,255,255,0.2)' : (themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.1)' : (themeStyles.theme.name === 'minimalist' ? '#ffffff' : themeStyles.theme.colors.cardBackground))}
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
      <div
        className="h-screen flex flex-col overflow-hidden relative"
        style={{
          background: isGlassmorphism ? themeStyles.backgroundGradient : undefined,
          backgroundColor: isNoteTheme ? '#FFFAF0' : (isGlassmorphism ? undefined : themeStyles.theme.colors.background)
        }}
      >
        {/* Paper texture overlays for Note theme */}
        {themeStyles.theme.name === 'note' && (
          <>
            {/* Background texture layer */}
            <div
              className="absolute inset-0 pointer-events-none opacity-30 z-0"
              style={{
                backgroundImage: `url("https://www.transparenttextures.com/patterns/rice-paper-2.png")`,
                mixBlendMode: 'multiply'
              }}
            />
            <div
              className="absolute inset-0 pointer-events-none opacity-10 z-0"
              style={{
                backgroundImage: `url("https://www.transparenttextures.com/patterns/natural-paper.png")`,
                mixBlendMode: 'multiply',
                filter: 'contrast(1.2)'
              }}
            />
            {/* Top texture overlay - affects all content including text */}
            <div
              className="fixed inset-0 pointer-events-none z-50"
              style={{
                backgroundImage: `url("https://www.transparenttextures.com/patterns/rice-paper-2.png")`,
                mixBlendMode: 'multiply',
                opacity: 0.35,
                filter: 'contrast(1.2)'
              }}
            />
          </>
        )}
        {/* Minimal Header with Timer & Part Selection */}
        <div className="flex-shrink-0 border-b shadow-sm" style={{
          backgroundColor: isGlassmorphism ? 'rgba(255,255,255,0.4)' : (isNoteTheme ? '#FFFAF0' : themeStyles.cardBackground),
          borderColor: isNoteTheme ? '#E8D5A3' : themeStyles.border,
          backdropFilter: isGlassmorphism ? 'blur(12px)' : undefined
        }}>
          <div className="px-4 py-3 grid grid-cols-3 items-center">
            {/* Left Column: Back Button */}
            <div className="flex justify-start">
              <Button
                variant="ghost"
                onClick={() => navigate('/exam-selection')}
                className="hover:bg-primary/10 rounded-full h-9 px-4 transition-all"
                style={{ color: isNoteTheme ? '#5d4e37' : themeStyles.textPrimary }}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                <span className="font-medium">Back</span>
              </Button>
            </div>

            {/* Middle Column: Passage Part Selection (Centered) */}
            <div className="flex justify-center">
              <div
                className="flex items-center gap-1.5 p-1 rounded-full shadow-inner"
                style={{
                  backgroundColor: isNoteTheme ? 'rgba(255,255,255,0.8)' : (isGlassmorphism ? 'rgba(255,255,255,0.2)' : themeStyles.hoverBg),
                  borderColor: isNoteTheme ? '#E8D5A3' : themeStyles.border,
                  borderWidth: '1px'
                }}
              >
                {Object.keys(testParts).map((partNum) => {
                  const partNumber = parseInt(partNum);
                  const isActive = currentPart === partNumber;
                  return (
                    <button
                      key={partNumber}
                      onClick={() => handlePartNavigation(partNumber)}
                      className={`w-8 h-8 rounded-full font-bold text-sm transition-all duration-500 ${isActive
                        ? 'shadow-sm scale-105'
                        : 'border border-transparent'
                        }`}
                      style={{
                        backgroundColor: isActive ? (isNoteTheme ? '#5d4e37' : themeStyles.buttonPrimary) : 'transparent',
                        color: isActive ? '#fff' : (isNoteTheme ? 'rgba(93, 78, 55, 0.6)' : themeStyles.textSecondary),
                        borderColor: isNoteTheme ? '#5d4e37' : themeStyles.buttonPrimary
                      }}
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
                      className="w-9 h-9 rounded-full transition-all flex items-center justify-center border-2"
                      style={{
                        backgroundColor: isDrawingMode ? (isNoteTheme ? '#fff' : themeStyles.buttonPrimary) : 'transparent',
                        borderColor: isDrawingMode ? (isNoteTheme ? '#5d4e37' : themeStyles.buttonPrimary) : 'transparent',
                        color: isDrawingMode ? (isNoteTheme ? '#5d4e37' : '#fff') : (isNoteTheme ? '#5d4e37' : themeStyles.textPrimary)
                      }}
                    >
                      <Highlighter className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" sideOffset={8} className="bg-primary text-primary-foreground border-none text-xs px-2 py-1 z-[100]">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold">Annotation Tools (A)</span>
                      <span className="text-[10px] opacity-70">Draw, highlight and annotate the test content</span>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <span
                className="font-sans text-sm font-extrabold tabular-nums tracking-wider px-2.5 py-1 rounded-md"
                style={{
                  color: isNoteTheme ? '#5d4e37' : themeStyles.textPrimary,
                  backgroundColor: isNoteTheme ? 'rgba(93, 78, 55, 0.05)' : themeStyles.hoverBg
                }}
              >
                {formatTime(timeLeft)}
              </span>

              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={handleSubmit}
                      variant="ghost"
                      size="sm"
                      className="w-9 h-9 flex items-center justify-center rounded-full transition-all active:scale-95"
                      style={{
                        color: isNoteTheme ? '#5d4e37' : themeStyles.textPrimary,
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = themeStyles.hoverBg}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <SendHorizontal className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" sideOffset={8} className="bg-primary text-primary-foreground border-none text-xs px-2 py-1 z-[100]">
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
          <div className="flex flex-col min-h-0 bg-[#FFFAF0] border-r border-[#E8D5A3]">
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
          <div className="flex flex-col min-h-0 bg-[#FFFAF0]">
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
                                    <span className="font-bold text-[#5d4e37] min-w-[16px]">{letter}</span>
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
                                  className="w-44 h-9 bg-white border border-[#D3C4A5] rounded-lg px-2 focus:ring-1 focus:ring-[#5d4e37] focus:border-[#5d4e37] shadow-sm font-serif text-sm text-black"
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
                                            ? 'bg-white text-[#5d4e37] border-2 border-[#5d4e37] shadow-sm'
                                            : 'bg-white border-[#E8D5A3] text-black hover:bg-[#FFFAF0] hover:border-[#5d4e37]'
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
                                            ? 'bg-white text-[#5d4e37] border-2 border-[#5d4e37] shadow-sm'
                                            : 'bg-white border-[#E8D5A3] text-black hover:bg-[#FFFAF0] hover:border-[#5d4e37]'
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
                                  className={`${usesRomanNumerals ? 'w-20' : 'w-16'} h-10 text-center bg-white border border-[#E8D5A3] rounded-lg focus:ring-1 focus:ring-[#5d4e37] focus:border-[#5d4e37] shadow-sm font-serif text-lg font-bold text-black ${usesRomanNumerals ? 'lowercase' : 'uppercase'} mt-2`}
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
                                  className="w-full sm:w-56 h-10 bg-white border border-[#E8D5A3] rounded-lg px-3 focus:ring-1 focus:ring-[#5d4e37] focus:border-[#5d4e37] shadow-sm font-serif text-sm text-black"
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
                                  className="flex-1 sm:flex-none sm:w-48 h-10 bg-white border border-[#E8D5A3] rounded-lg px-3 focus:ring-1 focus:ring-[#5d4e37] focus:border-[#5d4e37] shadow-sm font-serif text-base text-black"
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
                                            ? 'bg-white text-[#5d4e37] border-2 border-[#5d4e37] shadow-sm'
                                            : 'border-[#E8D5A3] bg-white hover:bg-[#FFFAF0] hover:border-[#5d4e37]'
                                            }`}
                                        >
                                          <span className={`flex-shrink-0 font-bold text-base mr-3 w-6 h-6 flex items-center justify-center rounded-sm ${isSelected ? 'text-[#5d4e37] bg-white' : 'text-[#5d4e37] bg-[#E8D5A3]/30'}`}>
                                            {letter}
                                          </span>
                                          <span className={`text-base leading-relaxed ${isSelected ? 'text-[#5d4e37]' : 'text-black'}`}>
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
                                className="max-w-md bg-white border border-[#E8D5A3] rounded-lg px-4 py-2 focus:ring-1 focus:ring-[#5d4e37] focus:border-[#5d4e37] shadow-sm font-serif h-10 text-base text-black mt-2"
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