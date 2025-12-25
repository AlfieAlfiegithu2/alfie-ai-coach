import React, { useState, useEffect, useRef } from 'react';
import { getBandScore } from '@/lib/ielts-scoring';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, Headphones, Play, Pause, CheckCircle, XCircle, Eye, EyeOff, Volume2, FileText, Sparkles } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import StudentLayout from '@/components/StudentLayout';
import SpotlightCard from '@/components/SpotlightCard';
import { useThemeStyles } from '@/hooks/useThemeStyles';
import { ListeningTranscriptViewer } from "@/components/ListeningTranscriptViewer";
import { ListeningTableViewer } from "@/components/ListeningTableViewer";

interface ListeningSection {
  id: string;
  title: string;
  section_number: number;
  instructions: string;
  audio_url: string;
  transcript: string;
  transcript_json?: any;
  photo_url?: string;
  cambridge_book?: string;
  test_number?: number;
  part_number?: number;
}

interface ListeningQuestion {
  id: string;
  question_text: string;
  question_number: number;
  options?: string[];
  correct_answer: string;
  question_type: string;
  explanation: string;
  section_id: string;
  question_image_url?: string;
  structure_data?: any;
  section_header?: string;
  section_instruction?: string;
}

const ListeningTest = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { testId } = useParams();
  const themeStyles = useThemeStyles();
  const [timeLeft, setTimeLeft] = useState(30 * 60); // 30 minutes
  const [currentSection, setCurrentSection] = useState<ListeningSection | null>(null);
  const [questions, setQuestions] = useState<ListeningQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showExplanations, setShowExplanations] = useState(false);
  const [score, setScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [showExplanation, setShowExplanation] = useState<{ [key: string]: boolean }>({});

  const toggleExplanation = (questionId: string) => {
    setShowExplanation(prev => ({ ...prev, [questionId]: !prev[questionId] }));
  };
  const [currentPart, setCurrentPart] = useState(1);
  const [completedParts, setCompletedParts] = useState<number[]>([]);
  const [allPartsData, setAllPartsData] = useState<{ [key: number]: { section: ListeningSection, questions: ListeningQuestion[] } }>({});
  const [availableTests, setAvailableTests] = useState<any[]>([]);
  const [testData, setTestData] = useState<any>(null);

  useEffect(() => {
    if (!testId) {
      fetchAvailableTests();
    } else {
      // Extract actual test ID - keep full UUID even if it contains dashes
      const actualTestId = (() => {
        const uuidMatch = testId.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/);
        return uuidMatch ? uuidMatch[0] : testId;
      })();
      fetchListeningTest(actualTestId);
    }
  }, [testId]);

  useEffect(() => {
    if (!isSubmitted) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isSubmitted]);

  // Reset test data on component mount (start fresh)
  useEffect(() => {
    console.log('🔄 Fresh Start: Clearing any saved test data for fresh test experience');
    localStorage.removeItem(`listening_test_${testId}_answers`);
  }, [testId]);

  // Set up audio element when section changes
  useEffect(() => {
    if (!currentSection?.audio_url) {
      if (audio) {
        audio.pause();
      }
      setAudio(null);
      setAudioDuration(0);
      setAudioCurrentTime(0);
      setIsPlaying(false);
      return;
    }

    const newAudio = new Audio(currentSection.audio_url);

    const handleLoadedMetadata = () => {
      setAudioDuration(newAudio.duration || 0);
    };

    const handleTimeUpdate = () => {
      setAudioCurrentTime(newAudio.currentTime || 0);
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    newAudio.addEventListener('loadedmetadata', handleLoadedMetadata);
    newAudio.addEventListener('timeupdate', handleTimeUpdate);
    newAudio.addEventListener('ended', handleEnded);

    setAudio(newAudio);

    return () => {
      newAudio.pause();
      newAudio.currentTime = 0;
      newAudio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      newAudio.removeEventListener('timeupdate', handleTimeUpdate);
      newAudio.removeEventListener('ended', handleEnded);
    };
  }, [currentSection?.audio_url]);

  const fetchListeningTest = async (testId: string) => {
    try {
      setLoading(true);
      console.log(`🔍 Loading listening test for test ID: ${testId}`);

      // Load test details - match by ID only (we already selected from Listening list)
      const { data: testData, error: testError } = await supabase
        .from('tests')
        .select('*')
        .eq('id', testId)
        .maybeSingle();

      if (testError) throw testError;

      if (!testData) {
        toast({
          title: "Test Not Found",
          description: "This listening test doesn't exist. Please check the test ID.",
          variant: "destructive"
        });
        navigate(-1);
        return;
      }

      // Load questions for this test, grouped by part
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

      // Group questions by part number
      const partsByNumber: { [key: number]: any[] } = {};
      questions.forEach(q => {
        const partNum = q.part_number || 1;
        if (!partsByNumber[partNum]) {
          partsByNumber[partNum] = [];
        }
        partsByNumber[partNum].push(q);
      });

      // Load first part (Part 1)
      const firstPart = 1;
      const firstPartQuestions = partsByNumber[firstPart] || [];

      if (firstPartQuestions.length === 0) {
        toast({
          title: "No Questions Available",
          description: "This test doesn't have questions for Part 1.",
          variant: "destructive"
        });
        navigate(-1);
        return;
      }

      // Get audio URL from first question of the part (typically questions in a part share the same audio)
      const firstQuestion = firstPartQuestions[0];
      const audioUrl = firstQuestion.audio_url || null;
      const instructions = firstQuestion.passage_text || `Part ${firstPart} - Listen to the audio and answer the questions.`;

      // Create section object
      const section: ListeningSection = {
        id: `part-${firstPart}`,
        title: `Part ${firstPart}`,
        section_number: firstPart,
        instructions: instructions,
        audio_url: audioUrl,
        transcript: firstQuestion.transcription || '',
        transcript_json: firstQuestion.transcript_json || null,
        photo_url: firstQuestion.answer_image_url || null,
        part_number: firstPart,
        test_number: (testData as any).test_number || 1
      };

      setCurrentSection(section);

      // Format questions for display - map question_number_in_part to question_number
      const formattedQuestions: ListeningQuestion[] = firstPartQuestions.map((q, idx) => ({
        id: q.id,
        question_text: q.question_text,
        question_number: q.question_number_in_part || idx + 1,
        question_type: q.question_type || 'multiple_choice',
        options: q.choices ? (typeof q.choices === 'string' ? (q.choices.includes(';') ? q.choices.split(';') : [q.choices]) : Array.isArray(q.choices) ? q.choices.map(o => String(o)) : []) : [],
        correct_answer: q.correct_answer,
        explanation: q.explanation || '',
        section_id: section.id,
        question_image_url: q.question_image_url || q.answer_image_url,
        structure_data: q.structure_data,
        section_header: q.section_header,
        section_instruction: q.section_instruction
      }));

      setQuestions(formattedQuestions);

      // Store all parts data for navigation
      const allParts: { [key: number]: { section: ListeningSection; questions: ListeningQuestion[] } } = {};

      // Pre-load all parts
      Object.keys(partsByNumber).forEach(partNumStr => {
        const partNum = parseInt(partNumStr);
        const partQuestions = partsByNumber[partNum];
        const partFirstQuestion = partQuestions[0];

        const partSection: ListeningSection = {
          id: `part-${partNum}`,
          title: `Part ${partNum}`,
          section_number: partNum,
          instructions: partFirstQuestion.passage_text || `Part ${partNum} - Listen to the audio and answer the questions.`,
          audio_url: partFirstQuestion.audio_url || null,
          transcript: partFirstQuestion.transcription || '',
          transcript_json: partFirstQuestion.transcript_json || null,
          photo_url: partFirstQuestion.answer_image_url || null,
          part_number: partNum,
          test_number: (testData as any).test_number || 1
        };

        const partFormattedQuestions: ListeningQuestion[] = partQuestions.map((q, idx) => ({
          id: q.id,
          question_text: q.question_text,
          question_number: q.question_number_in_part || idx + 1,
          question_type: q.question_type || 'multiple_choice',
          options: q.choices ? (typeof q.choices === 'string' ? (q.choices.includes(';') ? q.choices.split(';') : [q.choices]) : Array.isArray(q.choices) ? q.choices.map(o => String(o)) : []) : [],
          correct_answer: q.correct_answer,
          explanation: q.explanation || '',
          section_id: partSection.id,
          question_image_url: q.question_image_url || q.answer_image_url,
          structure_data: q.structure_data,
          section_header: q.section_header,
          section_instruction: q.section_instruction
        }));

        allParts[partNum] = {
          section: partSection,
          questions: partFormattedQuestions
        };
      });

      setAllPartsData(allParts);
      setCurrentPart(firstPart);
      setTestData(testData);

      console.log(`✅ Listening test loaded: ${testData.test_name}, ${Object.keys(partsByNumber).length} parts`);
    } catch (error: any) {
      console.error('Error loading listening test:', error);
      toast({
        title: "Error",
        description: "Failed to load listening test: " + error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableTests = async () => {
    setLoading(true);
    try {
      console.log('🔍 Loading available listening tests...');

      // Match admin query exactly: filter for tests where module='Listening' only
      const { data: tests, error: testsError } = await supabase
        .from('tests')
        .select('*')
        .eq('test_type', 'IELTS')
        .eq('module', 'Listening')
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

      console.log(`✅ Found ${finalTests.length} available listening tests:`, finalTests.map(t => ({ id: t.id, name: t.test_name, module: t.module, skill_category: t.skill_category })));
      setAvailableTests(finalTests);
      setLoading(false);
    } catch (error: any) {
      console.error('Error fetching available tests:', error);
      toast({
        title: "Error",
        description: "Failed to fetch available listening tests: " + error.message,
        variant: "destructive",
      });
      setAvailableTests([]);
      setLoading(false);
    }
  };

  const toggleAudio = () => {
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch((err) => {
        console.error('Error playing audio:', err);
        setIsPlaying(false);
      });
    }
    setIsPlaying(!isPlaying);
  };

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const calculateScore = () => {
    return questions.reduce((score, question) => {
      return answers[question.id] === question.correct_answer ? score + 1 : score;
    }, 0);
  };

  const handleGoToNextPart = () => {
    // Mark current part as completed
    setCompletedParts(prev => [...prev, currentPart]);

    // Check if this is the final part (Part 4 for Listening)
    if (currentPart >= 4) {
      handleSubmit();
      return;
    }

    // Go to next part
    const nextPart = currentPart + 1;
    setCurrentPart(nextPart);

    // Load next part data or fetch if needed
    if (allPartsData[nextPart]) {
      setCurrentSection(allPartsData[nextPart].section);
      setQuestions(allPartsData[nextPart].questions);
    } else {
      // Fetch next part
      fetchPartData(nextPart);
    }

    console.log(`📝 Sequential Flow: Moving from Part ${currentPart} to Part ${nextPart}`);
  };

  const handleSubmit = async () => {
    if (!isSubmitted) {
      if (audio) {
        audio.pause();
      }

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
            if (answers[q.id] === q.correct_answer) {
              totalScore++;
            }
          });
        }
      });

      // Include current questions if not in allPartsData
      if (!allPartsData[currentPart]) {
        totalQuestions += questions.length;
        questions.forEach(q => {
          if (answers[q.id] === q.correct_answer) {
            totalScore++;
          }
        });
      }

      setScore(totalScore);
      setIsSubmitted(true);
      setShowConfirmDialog(false);
      localStorage.removeItem(`listening_test_${testId}_answers`);

      // Save detailed test results
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Save main test result
          const { data: testResult, error: testError } = await supabase
            .from('test_results')
            .insert({
              user_id: user.id,
              test_type: 'listening',
              total_questions: totalQuestions,
              correct_answers: totalScore,
              score_percentage: (totalScore / totalQuestions) * 100,
              time_taken: (30 * 60) - timeLeft,
              test_data: {
                answers,
                total_score: totalScore,
                completed_parts: allParts
              } as any
            })
            .select()
            .single();

          if (testError) throw testError;

          // Save detailed listening results for each section
          for (const partNum of allParts) {
            const sectionData = allPartsData[partNum] || { section: currentSection, questions };
            const sectionQuestions = sectionData.questions;
            const sectionScore = sectionQuestions.filter(q => answers[q.id] === q.correct_answer).length;

            const questionsData = sectionQuestions.map(q => ({
              id: q.id,
              question_text: q.question_text,
              user_answer: answers[q.id] || '',
              correct_answer: q.correct_answer,
              is_correct: answers[q.id] === q.correct_answer
            }));

            await supabase.from('listening_test_results').insert({
              user_id: user.id,
              test_result_id: testResult.id,
              section_number: partNum,
              section_title: sectionData.section?.title || `Section ${partNum}`,
              audio_url: sectionData.section?.audio_url,
              questions_data: questionsData,
              section_score: sectionScore,
              section_total: sectionQuestions.length,
              detailed_feedback: `Section ${partNum}: ${sectionScore}/${sectionQuestions.length} correct`
            });
          }

          console.log('✅ Listening test results saved successfully');
        }
      } catch (error) {
        console.error('Error saving test results:', error);
      }

      console.log('🎯 Sequential Flow: Listening test completed with all parts. Final score:', totalScore, 'out of', totalQuestions, 'questions');

      toast({
        title: "Test Submitted!",
        description: `You scored ${totalScore}/${totalQuestions} (${Math.round((totalScore / totalQuestions) * 100)}%)`,
      });
    }
  };

  const fetchPartData = async (partNumber: number) => {
    console.log(`🔍 Sequential Flow: Loading data for Part ${partNumber}`);

    // Check if we already have this part loaded
    if (allPartsData[partNumber]) {
      setCurrentSection(allPartsData[partNumber].section);
      setQuestions(allPartsData[partNumber].questions);
      setCurrentPart(partNumber);
      console.log(`✅ Part ${partNumber} loaded from cache`);
      return;
    }

    // If part not found, show error
    toast({
      title: "Part Not Found",
      description: `Part ${partNumber} is not available for this test.`,
      variant: "destructive"
    });
  };

  const getListeningBandScore = (score: number) => {
    return getBandScore(score, 'listening').toString();
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatAudioTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <StudentLayout title="Loading Test...">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-warm-gray">Loading listening test...</p>
          </div>
        </div>
      </StudentLayout>
    );
  }

  // Show test selection if no testId provided (regardless of whether tests are found)
  if (!testId) {
    return (
      <div className="min-h-screen relative">
        <div className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed"
          style={{
            backgroundImage: themeStyles.theme.name === 'note' || themeStyles.theme.name === 'minimalist' || themeStyles.theme.name === 'dark'
              ? 'none'
              : `url('/1000031207.png')`,
            backgroundColor: themeStyles.backgroundImageColor
          }} />
        <div className="relative z-10">
          <StudentLayout title="Available Listening Tests">
            <div className="min-h-screen py-12">
              <div className="container mx-auto px-4">
                <div className="max-w-4xl mx-auto">
                  <div className="mb-8">
                    <h1 className="text-4xl font-bold text-foreground mb-2">IELTS Listening Tests</h1>
                    <p className="text-lg text-muted-foreground">Choose a test to begin your listening practice</p>
                  </div>

                  {availableTests.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {availableTests.map((test) => (
                        <SpotlightCard key={test.id} className="cursor-pointer h-[140px] hover:scale-105 transition-all duration-300 hover:shadow-lg bg-white/80 flex items-center justify-center" onClick={() => navigate(`/listening/${test.id}`)}>
                          <CardContent className="p-3 md:p-4 text-center flex items-center justify-center h-full">
                            <h3 className="font-semibold text-sm">{test.test_name || `Listening Test ${test.test_number || ''}`}</h3>
                          </CardContent>
                        </SpotlightCard>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-lg text-muted-foreground mb-4">No listening tests available yet</p>
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

  // Simplify layout to match Speaking/Writing style
  return (
    <div
      className={`min-h-screen relative ${themeStyles.theme.name === 'note' ? 'font-serif' : ''}`}
      style={{
        backgroundColor: themeStyles.theme.name === 'dark' ? themeStyles.theme.colors.background : 'transparent'
      }}
    >
      <StudentLayout title={`IELTS Listening - ${currentSection?.title || 'Test'}`} showBackButton backPath="/tests">
        <div className="flex-1 flex justify-center py-6 sm:py-8 pb-20">
          <div className="w-full max-w-4xl mx-auto space-y-6 px-4">

            {/* Header / Timer / Score */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex gap-2">
                {currentSection?.cambridge_book && (
                  <Badge variant="outline" className="bg-background/50 backdrop-blur">{currentSection.cambridge_book}</Badge>
                )}
                {currentSection?.section_number && (
                  <Badge variant="outline" className="bg-background/50 backdrop-blur">Section {currentSection.section_number}</Badge>
                )}
              </div>

              <div className="flex items-center gap-4">
                {!isSubmitted ? (
                  <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-100/80 backdrop-blur border border-orange-200 text-orange-700 shadow-sm">
                    <Clock className="w-4 h-4" />
                    <span className="font-mono font-medium">
                      {formatTime(timeLeft)}
                    </span>
                  </div>
                ) : (
                  <div className="text-right">
                    <div className="text-xl font-bold text-primary">{score}/{questions.length}</div>
                    <div className="text-xs text-muted-foreground">Band {getListeningBandScore(score)}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Audio Player Card - Sticky or prominent */}
            <Card className="rounded-2xl border shadow-sm sticky top-4 z-30 transition-all duration-300"
              style={{
                backgroundColor: themeStyles.theme.name === 'dark' ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)',
                borderColor: themeStyles.border
              }}
            >
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                  <Headphones className="h-5 w-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-sm truncate pr-4">
                      {currentSection?.instructions || "Listen to the audio"}
                    </h3>
                    <span className="text-xs text-muted-foreground font-mono whitespace-nowrap">
                      {formatAudioTime(audioCurrentTime)} / {formatAudioTime(audioDuration)}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary shrink-0"
                      onClick={toggleAudio}
                      disabled={isSubmitted || !currentSection?.audio_url}
                    >
                      {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>

                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-100 ease-linear"
                        style={{ width: audioDuration ? `${(audioCurrentTime / audioDuration) * 100}%` : '0%' }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Content Area */}
            <div className="space-y-6">
              {/* Visual Reference if exists */}
              {currentSection?.photo_url && (
                <Card className="overflow-hidden border-none shadow-none bg-transparent">
                  <img
                    src={currentSection.photo_url}
                    alt="Visual Reference"
                    className="w-full max-w-xl mx-auto rounded-xl shadow-md border border-border/50"
                  />
                </Card>
              )}

              {/* Questions List */}
              <Card className="border shadow-md rounded-[2rem] overflow-hidden"
                style={{
                  backgroundColor: themeStyles.theme.name === 'dark' ? themeStyles.theme.colors.cardBackground : '#FEF9E7',
                  borderColor: '#E8D5A3'
                }}
              >
                <CardContent className="p-6 sm:p-8 space-y-8">
                  {(() => {
                    const renderItems: any[] = [];
                    let currentSectionGroup: { type: 'section', header?: string, instruction?: string, items: any[] } | null = null;
                    let currentTableItem: { type: 'table', config: any, questions: ListeningQuestion[] } | null = null;

                    questions.forEach((q) => {
                      const struct = q.structure_data ? (typeof q.structure_data === 'string' ? JSON.parse(q.structure_data) : q.structure_data) : null;
                      const tableConfig = struct?.listeningTableConfig;

                      // Check if we need to start a new section group
                      if (!currentSectionGroup || currentSectionGroup.header !== q.section_header) {
                        currentSectionGroup = {
                          type: 'section',
                          header: q.section_header,
                          instruction: q.section_instruction,
                          items: []
                        };
                        renderItems.push(currentSectionGroup);
                        currentTableItem = null; // Reset table item on new section
                      }

                      if (tableConfig) {
                        if (currentTableItem && JSON.stringify(currentTableItem.config) === JSON.stringify(tableConfig)) {
                          currentTableItem.questions.push(q);
                        } else {
                          currentTableItem = { type: 'table', config: tableConfig, questions: [q] };
                          currentSectionGroup.items.push(currentTableItem);
                        }
                      } else {
                        currentTableItem = null;
                        currentSectionGroup.items.push({ type: 'question', data: q });
                      }
                    });

                    return renderItems.map((section, sIdx) => (
                      <div key={`section-${sIdx}`} className="space-y-6 pb-4 last:pb-0">
                        {/* Section Header & Instruction */}
                        <div className="space-y-2 border-l-4 border-[#5d4e37] pl-4 py-1">
                          {section.header && (
                            <h3 className="text-xl font-bold font-serif text-[#5d4e37]">
                              {section.header}
                            </h3>
                          )}
                          {section.instruction && (
                            <p className="text-sm font-bold text-[#5d4e37] uppercase tracking-tight">
                              {section.instruction}
                            </p>
                          )}
                        </div>

                        <div className="space-y-8 pl-0 sm:pl-4">
                          {section.items.map((item: any, iIdx: number) => {
                            if (item.type === 'table') {
                              return (
                                <div key={`table-${sIdx}-${iIdx}`} className="mb-8">
                                  <ListeningTableViewer
                                    headers={item.config.headers}
                                    rows={item.config.rows}
                                    questionMap={item.questions.reduce((acc: any, q: any) => ({ ...acc, [q.question_number]: q.id }), {})}
                                    answers={answers}
                                    onAnswerChange={handleAnswerChange}
                                    isSubmitted={isSubmitted}
                                    correctAnswers={item.questions.reduce((acc: any, q: any) => ({ ...acc, [q.id]: q.correct_answer }), {})}
                                  />
                                </div>
                              );
                            } else {
                              const question = item.data;
                              const isMultipleChoice = question.question_type === 'multiple_choice';

                              return (
                                <div key={question.id} className="relative group">
                                  <div className="flex flex-col gap-3">
                                    {/* Question Image if any */}
                                    {question.question_image_url && (
                                      <div className="mb-2">
                                        <img
                                          src={question.question_image_url}
                                          alt={`Question ${question.question_number}`}
                                          className="rounded-lg max-h-[300px] object-contain border border-[#E8D5A3]"
                                        />
                                      </div>
                                    )}

                                    <div className="flex items-start gap-4">
                                      <span className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded bg-[#5d4e37] text-white text-sm font-bold shadow-sm">
                                        {question.question_number}
                                      </span>

                                      <div className="flex-1 space-y-4">
                                        {/* Question Text with embedded styling if possible */}
                                        <div className="text-base sm:text-lg font-medium leading-relaxed text-[#5d4e37] whitespace-pre-line">
                                          {question.question_text}
                                        </div>

                                        {/* Answer Area */}
                                        <div className="max-w-md">
                                          {isMultipleChoice && question.options && question.options.length > 0 ? (
                                            <div className="grid gap-2">
                                              {question.options.map((option: string, oIdx: number) => (
                                                <label
                                                  key={oIdx}
                                                  className={`
                                                    flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer
                                                    ${answers[question.id] === option
                                                      ? 'border-[#5d4e37] bg-white shadow-sm'
                                                      : 'border-[#E8D5A3] bg-white/50 hover:bg-white hover:border-[#5d4e37]'
                                                    }
                                                    ${isSubmitted && option === question.correct_answer ? '!border-green-500 !bg-green-50' : ''}
                                                    ${isSubmitted && answers[question.id] === option && option !== question.correct_answer ? '!border-red-500 !bg-red-50' : ''}
                                                  `}
                                                >
                                                  <div className={`
                                                    w-5 h-5 rounded-full border-2 flex items-center justify-center
                                                    ${answers[question.id] === option ? 'border-[#5d4e37] bg-[#5d4e37]' : 'border-[#E8D5A3]'}
                                                  `}>
                                                    {answers[question.id] === option && <div className="w-2 h-2 rounded-full bg-white" />}
                                                  </div>
                                                  <span className="text-sm sm:text-base font-medium text-[#5d4e37]">{option}</span>
                                                </label>
                                              ))}
                                            </div>
                                          ) : (
                                            <div className="relative">
                                              <input
                                                type="text"
                                                placeholder="Enter answer..."
                                                value={answers[question.id] || ''}
                                                onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                                                disabled={isSubmitted}
                                                className={`
                                                  w-full px-4 py-3 rounded-xl bg-white border-2 transition-all outline-none
                                                  text-[#5d4e37] font-serif text-lg
                                                  ${isSubmitted
                                                    ? answers[question.id] === question.correct_answer
                                                      ? 'border-green-500 bg-green-50'
                                                      : 'border-red-500 bg-red-50'
                                                    : 'border-[#E8D5A3] focus:border-[#5d4e37] focus:ring-4 focus:ring-[#5d4e37]/5 shadow-inner'
                                                  }
                                                `}
                                              />
                                              {isSubmitted && answers[question.id] !== question.correct_answer && (
                                                <div className="mt-2 text-sm text-green-700 flex items-center gap-2 font-bold px-3 py-1 bg-green-50 rounded-lg inline-flex">
                                                  <CheckCircle className="w-4 h-4" />
                                                  Answer: {question.correct_answer}
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </div>

                                        {/* Explanation */}
                                        {isSubmitted && question.explanation && (
                                          <div className="mt-4 p-4 rounded-2xl bg-[#5d4e37]/5 border border-[#5d4e37]/10">
                                            <div className="flex gap-3">
                                              <Sparkles className="w-5 h-5 text-[#5d4e37] shrink-0" />
                                              <div className="text-sm text-[#5d4e37] leading-relaxed">
                                                <span className="font-bold block mb-1">Explanation:</span>
                                                {question.explanation}
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                      </div>

                                      {isSubmitted && (
                                        <div className="flex-shrink-0 pt-1">
                                          {answers[question.id] === question.correct_answer ? (
                                            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center shadow-lg transform scale-110">
                                              <CheckCircle className="w-5 h-5 text-white" />
                                            </div>
                                          ) : (
                                            <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center shadow-lg transform scale-110">
                                              <XCircle className="w-5 h-5 text-white" />
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                          })}
                        </div>
                      </div>
                    ));
                  })()}
                </CardContent>
              </Card>
            </div>

            {/* Transcript Area (Post-submission) */}
            {isSubmitted && (currentSection?.transcript || currentSection?.transcript_json) && (
              <Card className="border shadow-sm rounded-3xl overflow-hidden bg-background/80 backdrop-blur">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="w-5 h-5 text-muted-foreground" />
                    Audio Transcript
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {currentSection?.transcript_json ? (
                    <ListeningTranscriptViewer
                      audioUrl={currentSection.audio_url}
                      transcriptJson={currentSection.transcript_json}
                    />
                  ) : (
                    <div className="prose dark:prose-invert max-w-none text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap font-serif">
                      {currentSection?.transcript}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Navigation / Actions */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-lg border-t z-40 sm:relative sm:bg-transparent sm:border-0 sm:p-0 sm:backdrop-blur-none">
              <div className="max-w-4xl mx-auto flex gap-3">
                <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground mr-auto">
                  <span>Part {currentPart} of 4</span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map(p => (
                      <div key={p} className={`w-2 h-2 rounded-full ${p === currentPart ? 'bg-primary' : completedParts.includes(p) ? 'bg-green-500' : 'bg-muted'}`} />
                    ))}
                  </div>
                </div>

                {!isSubmitted ? (
                  currentPart < 4 ? (
                    <Button onClick={handleGoToNextPart} className="w-full sm:w-auto rounded-xl min-w-[140px] shadow-lg hover:shadow-xl transition-all">
                      Next Part <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
                    </Button>
                  ) : (
                    <Button onClick={() => setShowConfirmDialog(true)} className="w-full sm:w-auto rounded-xl min-w-[140px] bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all">
                      Submit Test <CheckCircle className="w-4 h-4 ml-2" />
                    </Button>
                  )
                ) : (
                  <Button onClick={() => navigate('/tests')} variant="outline" className="w-full sm:w-auto rounded-xl">
                    Back to Tests
                  </Button>
                )}
              </div>
            </div>

          </div>
        </div>
      </StudentLayout>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="rounded-2xl border-light-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-georgia text-xl">Ready to submit?</DialogTitle>
            <DialogDescription className="pt-2">
              You have answered <span className="font-medium text-foreground">{Object.keys(answers).filter(key => answers[key]).length}</span> out of <span className="font-medium text-foreground">{questions.length}</span> questions in this part.
              <br />
              Proceeding will finalize your score for the whole test.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              className="rounded-xl border-light-border"
            >
              Keep Reviewing
            </Button>
            <Button
              onClick={handleSubmit}
              className="rounded-xl shadow-md"
            >
              Yes, Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ListeningTest;