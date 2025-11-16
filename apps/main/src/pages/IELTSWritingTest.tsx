import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import StudentLayout from "@/components/StudentLayout";
import { Bot, ListTree, Clock, FileText, PenTool, Palette, Send } from "lucide-react";
import { DraggableChatbot } from "@/components/DraggableChatbot";
import DotLottieLoadingAnimation from "@/components/animations/DotLottieLoadingAnimation";
import SpotlightCard from "@/components/SpotlightCard";
import { useThemeStyles } from '@/hooks/useThemeStyles';
import { useTheme } from '@/contexts/ThemeContext';
import { themes, ThemeName } from '@/lib/themes';
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
} from "@/components/ui/conversation";
import { Message, MessageContent } from "@/components/ui/message";
import { Response } from "@/components/ui/response";
import { Orb } from "@/components/ui/orb";
import { ShimmeringText } from "@/components/ui/shimmering-text";

interface Task {
  id: string;
  title: string;
  instructions: string;
  imageUrl?: string;
  imageContext?: string;
  modelAnswer?: string;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
}

const IELTSWritingTestInterface = () => {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const themeStyles = useThemeStyles();
  const { themeName, setTheme } = useTheme();

  const [test, setTest] = useState<any>(null);
  const [task1, setTask1] = useState<Task | null>(null);
  const [task2, setTask2] = useState<Task | null>(null);
  const [currentTask, setCurrentTask] = useState<1 | 2>(1);
  const [task1Answer, setTask1Answer] = useState("");
  const [task2Answer, setTask2Answer] = useState("");
  const [availableTests, setAvailableTests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingTest, setIsLoadingTest] = useState(false);

  // Separate chat messages for each task to prevent context bleeding
  const [task1ChatMessages, setTask1ChatMessages] = useState<ChatMessage[]>([{
    id: '1',
    type: 'bot',
    content: "Hello! I'm Catie, your expert IELTS Writing tutor. I'm here to help you with General Training Task 1 - Letter Writing. I'll guide you through writing formal, semi-formal, or informal letters with proper structure and tone. What would you like help with?",
    timestamp: new Date()
  }]);
  
  const [task2ChatMessages, setTask2ChatMessages] = useState<ChatMessage[]>([{
    id: '1',
    type: 'bot',
    content: "Hello! I'm Catie, your expert IELTS Writing tutor. I'm here to help you with Task 2 - Essay Writing. I'll guide you through structuring arguments, developing ideas, and presenting your opinion clearly. What would you like help with?",
    timestamp: new Date()
  }]);

  const [newMessage, setNewMessage] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCatbotOpen, setIsCatbotOpen] = useState(false);
  const [isDraggableChatOpen, setIsDraggableChatOpen] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [showAIAssistantVisible, setShowAIAssistantVisible] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [feedbackLanguage, setFeedbackLanguage] = useState<string>("en");
  const [searchParams] = useSearchParams();
  const selectedTrainingType = searchParams.get('training') as 'Academic' | 'General' | null;
  const [filteredTests, setFilteredTests] = useState<any[]>([]);

  // Timer states
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [timerStarted, setTimerStarted] = useState(false);
  const [totalTimeSpent, setTotalTimeSpent] = useState<number>(0);

  // Autosave drafts to localStorage and restore on load
  useEffect(() => {
    if (!testId) return;
    const key1 = `ielts-writing-draft-${testId}-task1`;
    const key2 = `ielts-writing-draft-${testId}-task2`;
    const saved1 = localStorage.getItem(key1);
    const saved2 = localStorage.getItem(key2);
    if (saved1 && !task1Answer) setTask1Answer(saved1);
    if (saved2 && !task2Answer) setTask2Answer(saved2);
  }, [testId]);

  useEffect(() => {
    if (!testId) return;
    localStorage.setItem(`ielts-writing-draft-${testId}-task1`, task1Answer);
  }, [task1Answer, testId]);

  useEffect(() => {
    if (!testId) return;
    localStorage.setItem(`ielts-writing-draft-${testId}-task2`, task2Answer);
  }, [task2Answer, testId]);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerStarted && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            setTimerStarted(false);
            return 0;
          }
          return prev - 1;
        });
        setTotalTimeSpent(prev => prev + 1000); // Track total time spent
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerStarted, timeRemaining]);

  // Filter tests based on selected training type
  useEffect(() => {
    if (selectedTrainingType && availableTests.length > 0) {
      const filtered = availableTests.filter(test =>
        test.test_subtype === selectedTrainingType ||
        (!test.test_subtype && selectedTrainingType === 'Academic') // Default to Academic if not set
      );
      setFilteredTests(filtered);
    } else {
      setFilteredTests(availableTests);
    }
  }, [selectedTrainingType, availableTests]);

  useEffect(() => {
    if (testId) {
      loadTestData();
    } else {
      loadAvailableTests();
    }
  }, [testId]);

  const loadTestData = async () => {
    setIsLoadingTest(true);
    try {
      if (!testId) {
        console.error('❌ No testId provided');
        throw new Error('Test ID is required');
      }

      console.log('🔍 Loading test data for testId:', testId);

      // Load test and questions in parallel for faster loading
      const [testResult, questionsResult] = await Promise.all([
        supabase
          .from('tests')
          .select('*')
          .eq('id', testId)
          .maybeSingle(),
        supabase
          .from('questions')
          .select('*')
          .eq('test_id', testId)
          .in('part_number', [1, 2])
          .order('part_number')
      ]);

      console.log('📊 Test query result:', { 
        hasData: !!testResult.data, 
        error: testResult.error,
        testName: testResult.data?.test_name 
      });
      console.log('📊 Questions query result:', { 
        count: questionsResult.data?.length || 0, 
        error: questionsResult.error 
      });

      if (testResult.error) {
        console.error('❌ Test query error:', testResult.error);
        throw testResult.error;
      }
      if (questionsResult.error) {
        console.error('❌ Questions query error:', questionsResult.error);
        throw questionsResult.error;
      }

      const testData = testResult.data;
      if (!testData) {
        console.error('❌ Test not found in database for testId:', testId);
        // Try to find any writing tests to help debug
        const { data: allWritingTests } = await supabase
          .from('tests')
          .select('id, test_name, module, skill_category')
          .or('module.eq.Writing,skill_category.eq.Writing')
          .limit(5);
        console.log('📋 Available writing tests:', allWritingTests);
        throw new Error(`Test not found. Available test IDs: ${allWritingTests?.map(t => t.id).join(', ') || 'none'}`);
      }
      
      console.log('✅ Test loaded successfully:', testData.test_name);
      setTest(testData);

      const questions = questionsResult.data || [];
      
      // Find Task 1 and Task 2 questions
      const task1Question = questions.find(q => q.part_number === 1);
      const task2Question = questions.find(q => q.part_number === 2);

      // Always set tasks, even if questions aren't found (to prevent infinite loading)
      if (task1Question) {
        setTask1({
          id: task1Question.id,
          title: task1Question.question_text || "Task 1 - Data Description",
          instructions: task1Question.passage_text || "",
          imageUrl: task1Question.image_url || "",
          imageContext: task1Question.explanation || "",
          modelAnswer: task1Question.transcription || ""
        });
      } else {
        // Set default task1 if not found
        setTask1({
          id: 'default-task1',
          title: "Task 1 - Data Description",
          instructions: "Task 1 question not found. Please contact support.",
          imageUrl: "",
          imageContext: "",
          modelAnswer: ""
        });
      }

      if (task2Question) {
        setTask2({
          id: task2Question.id,
          title: task2Question.question_text || "Task 2 - Essay Writing",
          instructions: task2Question.passage_text || "",
          modelAnswer: task2Question.transcription || ""
        });
      } else {
        // Set default task2 if not found
        setTask2({
          id: 'default-task2',
          title: "Task 2 - Essay Writing",
          instructions: "Task 2 question not found. Please contact support.",
          modelAnswer: ""
        });
      }
    } catch (error: any) {
      console.error('❌ Error loading test data:', error);
      const errorMessage = error?.message || 'Failed to load test data. Please try again.';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
      // Reset state on error so error UI shows
      setTest(null);
      setTask1(null);
      setTask2(null);
    } finally {
      setIsLoadingTest(false);
    }
  };

  const loadAvailableTests = async () => {
    setIsLoading(true);
    try {
      console.log('🔍 Loading available writing tests...');
      
      // Match admin query exactly: filter for tests where module='Writing' OR skill_category='Writing'
      const { data: tests, error: testsError } = await supabase
        .from('tests')
        .select('id, test_name, test_type, module, skill_category, test_subtype, created_at')
        .eq('test_type', 'IELTS')
        .or('module.eq.Writing,skill_category.eq.Writing')
        .order('created_at', { ascending: false });

      if (testsError) {
        console.error('❌ Error loading tests:', testsError);
        throw testsError;
      }

      console.log('📊 Raw tests data:', tests);

      // Filter out any null or invalid tests
      let finalTests = (tests || []).filter((test: any) => {
        const isValid = test && test.id && (test.test_name || test.module || test.skill_category);
        if (!isValid) {
          console.warn('⚠️ Filtered out invalid test:', test);
        }
        return isValid;
      });

      // Fallback: if no tests found with exact match, try case-insensitive filter
      if (finalTests.length === 0) {
        console.log('🔄 No exact matches, trying broader search...');
        const { data: allIeltsTests, error: allTestsError } = await supabase
          .from('tests')
          .select('id, test_name, test_type, module, skill_category, test_subtype, created_at')
          .eq('test_type', 'IELTS')
          .order('created_at', { ascending: false });
        
        if (allTestsError) {
          console.error('❌ Error loading all IELTS tests:', allTestsError);
        } else {
          console.log('📊 All IELTS tests:', allIeltsTests);
          // Filter client-side exactly like admin does
          finalTests = (allIeltsTests || []).filter((test: any) => {
            const matches = test && test.id && (
              test.module === 'Writing' || 
              test.skill_category === 'Writing' || 
              test.test_name?.toLowerCase().includes('writing')
            );
            if (!matches && test) {
              console.log('⚠️ Test does not match Writing filter:', { 
                id: test.id, 
                name: test.test_name, 
                module: test.module, 
                skill_category: test.skill_category 
              });
            }
            return matches;
          });
        }
      }

      console.log(`✅ Found ${finalTests.length} available writing tests`);
      if (finalTests.length > 0) {
        console.log('📋 Test details:', finalTests.map(t => ({ 
          id: t.id, 
          name: t.test_name, 
          module: t.module, 
          skill_category: t.skill_category,
          test_subtype: t.test_subtype
        })));
      }
      
      setAvailableTests(finalTests);
    } catch (error) {
      console.error('❌ Error loading tests:', error);
      toast({
        title: "Error",
        description: "Failed to load available writing tests. Please try again.",
        variant: "destructive"
      });
      setAvailableTests([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentTask = () => currentTask === 1 ? task1 : task2;
  const getCurrentAnswer = () => currentTask === 1 ? task1Answer : task2Answer;
  const setCurrentAnswer = (value: string) => {
    if (currentTask === 1) {
      setTask1Answer(value);
    } else {
      setTask2Answer(value);
    }
  };

  const getWordCount = (text: string) => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  const closeAIAssistant = () => {
    // Mac-style "suck into dock" animation:
    // 1) Animate card down + shrink (showAIAssistantVisible -> false).
    // 2) After animation completes, unmount card and show avatar.
    // Note: Chat memory persists - only closes the UI, doesn't reset conversation
    setShowAIAssistantVisible(false);
    setTimeout(() => setShowAIAssistant(false), 260);
  };

  // Get current chat messages based on active task
  const getCurrentChatMessages = () => currentTask === 1 ? task1ChatMessages : task2ChatMessages;
  const setCurrentChatMessages = (messages: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
    if (currentTask === 1) {
      setTask1ChatMessages(messages);
    } else {
      setTask2ChatMessages(messages);
    }
  };

  const sendChatMessage = async (messageText?: string) => {
    const message = messageText || newMessage.trim();
    if (!message || isChatLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: message,
      timestamp: new Date()
    };

    setCurrentChatMessages(prev => [...prev, userMessage]);
    if (!messageText) setNewMessage("");
    setIsChatLoading(true);

    try {
      const currentTaskData = getCurrentTask();
      if (!currentTaskData) throw new Error('No task data available');

      // Create context-aware prompt for Catie
      let contextPrompt = `CONTEXT: The student is working on IELTS Writing Task ${currentTask}.

**Task ${currentTask} Details:**
- Prompt: "${currentTaskData.title}"
- Instructions: "${currentTaskData.instructions.substring(0, 300)}${currentTaskData.instructions.length > 300 ? '...' : ''}"`;
      
      // Add task type context
      if (currentTask === 1) {
        contextPrompt += `\n- Task Type: Data Description (charts, graphs, tables, diagrams)`;
      } else {
        contextPrompt += `\n- Task Type: Essay Writing (present arguments, opinions with examples)`;
      }

      contextPrompt += `\n\n**Student's Question:** "${message}"

Please provide context-aware guidance. If they ask "How do I start?", guide them with leading questions about the specific task. Never write content for them - help them think it through.`;

      const { data, error } = await supabase.functions.invoke('openai-chat', {
        body: {
          message: contextPrompt,
          context: 'catbot',
          imageContext: currentTaskData.imageContext,
          taskType: currentTask === 1 ? 'Task 1 - Data Description (charts, graphs, tables, diagrams)' : 'Task 2 - Essay Writing (arguments, opinions, examples)',
          taskInstructions: currentTaskData.instructions
        }
      });

      if (error) throw error;

      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: data.response,
        timestamp: new Date()
      };

      setCurrentChatMessages(prev => [...prev, botMessage]);
    } catch (error: any) {
      console.error('Error sending chat message:', error);
      
      // Handle different error types with better user messaging
      let errorTitle = "Connection Issue";
      let errorDescription = "Failed to get response from Catie. Please try again.";
      
      if (error?.message?.includes('service temporarily unavailable') || error?.statusCode === 503) {
        errorTitle = "Service Update";
        errorDescription = "Catie is being updated! Please try again in a moment.";
      } else if (error?.statusCode === 429) {
        errorTitle = "High Traffic";
        errorDescription = "Lots of students are getting help! Please wait a moment and try again.";
      }
      
      toast({
        title: errorTitle,
        description: errorDescription,
        variant: "destructive"
      });
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    sendChatMessage(suggestion);
  };

  const proceedToTask2 = () => {
    if (!task1Answer.trim()) {
      toast({
        title: "Please complete Task 1",
        description: "Write your answer for Task 1 before proceeding to Task 2",
        variant: "destructive"
      });
      return;
    }
    setCurrentTask(2);
  };

  // Handle task switching with proper context isolation
  const switchToTask = (taskNumber: 1 | 2) => {
    setCurrentTask(taskNumber);
    // Don't reset timer - it's shared between tasks
  };

  const submitTest = async () => {
    if (!task1Answer.trim() || !task2Answer.trim()) {
      toast({
        title: "Please complete both tasks",
        description: "Both Task 1 and Task 2 answers are required",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Run AI examiner assessment only (corrections will be generated on-demand in results page)
      const [examinerResponse] = await Promise.all([
        // AI Examiner for comprehensive assessment
        supabase.functions.invoke('ielts-writing-examiner', {
          body: {
            task1Answer,
            task2Answer,
            task1Data: task1,
            task2Data: task2,
            targetLanguage: feedbackLanguage !== "en" ? feedbackLanguage : undefined
          }
        })
      ]);

      if (examinerResponse.error) throw examinerResponse.error;

      const { structured, feedback, task1WordCount, task2WordCount } = examinerResponse.data;

      // Save main test result
      const { data: testResult, error: testError } = await supabase
        .from('test_results')
        .insert({
          user_id: user?.id,
          // Use canonical key so dashboards pick it up consistently
          test_type: 'writing',
          // Persist a percentage for charts (band × 10)
          score_percentage: Math.round(
            (
              (structured?.overall?.band ?? (
                ((structured?.task1?.overall_band ?? 7.0) + 2 * (structured?.task2?.overall_band ?? 7.0)) / 3
              )) * 10
            )
          ),
          time_taken: Math.floor(totalTimeSpent / 1000),
          completed_at: new Date().toISOString(),
          test_data: {
            task1Data: task1 ? {
              id: task1.id,
              title: task1.title,
              instructions: task1.instructions,
              imageUrl: task1.imageUrl,
              imageContext: task1.imageContext,
              modelAnswer: task1.modelAnswer
            } : null,
            task2Data: task2 ? {
              id: task2.id,
              title: task2.title,
              instructions: task2.instructions,
              modelAnswer: task2.modelAnswer
            } : null,
            task1Answer,
            task2Answer,
            overall_band: structured?.overall?.band || 7.0
          }
        })
        .select()
        .single();

      if (testError) throw testError;

      // Save Task 1 results
      const { error: task1Error } = await supabase
        .from('writing_test_results')
        .insert({
          user_id: user?.id,
          test_result_id: testResult.id,
          task_number: 1,
          prompt_text: task1?.instructions || task1?.title || '',
          user_response: task1Answer,
          word_count: task1WordCount,
          // Store numeric bands for dashboard/history aggregation
          band_scores: {
            task_achievement: structured?.task1?.criteria?.task_achievement?.band ?? null,
            coherence_and_cohesion: structured?.task1?.criteria?.coherence_and_cohesion?.band ?? null,
            lexical_resource: structured?.task1?.criteria?.lexical_resource?.band ?? null,
            grammatical_range_and_accuracy: structured?.task1?.criteria?.grammatical_range_and_accuracy?.band ?? null,
          },
          detailed_feedback: structured?.task1?.feedback_markdown || '',
          improvement_suggestions: structured?.task1?.feedback?.improvements || []
        });

      if (task1Error) throw task1Error;

      // Save Task 2 results
      const { error: task2Error } = await supabase
        .from('writing_test_results')
        .insert({
          user_id: user?.id,
          test_result_id: testResult.id,
          task_number: 2,
          prompt_text: task2?.instructions || task2?.title || '',
          user_response: task2Answer,
          word_count: task2WordCount,
          band_scores: {
            task_response: structured?.task2?.criteria?.task_response?.band ?? null,
            coherence_and_cohesion: structured?.task2?.criteria?.coherence_and_cohesion?.band ?? null,
            lexical_resource: structured?.task2?.criteria?.lexical_resource?.band ?? null,
            grammatical_range_and_accuracy: structured?.task2?.criteria?.grammatical_range_and_accuracy?.band ?? null,
          },
          detailed_feedback: structured?.task2?.feedback_markdown || '',
          improvement_suggestions: structured?.task2?.feedback?.improvements || []
        });

      if (task2Error) throw task2Error;

      // Navigate to the enhanced results page with both state and DB persistence
      navigate('/ielts-writing-results-pro', {
        state: {
          testName: test?.test_name,
          testId: testId,
          submissionId: testResult.id,
          task1Answer,
          task2Answer,
          feedback,
          structured,
          task1Data: task1,
          task2Data: task2,
          task1WordCount,
          task2WordCount
        }
      });
    } catch (error: any) {
      console.error('Error submitting test:', error);
      toast({
        title: "Error",
        description: "Failed to submit test for evaluation",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper functions
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Initialize timer on component mount - 60 minutes total
  useEffect(() => {
    if (!timerStarted) {
      setTimeRemaining(60 * 60); // 1 hour total
      setTimerStarted(true);
    }
  }, [timerStarted]);

  // Show test selection if no testId provided
  if (!testId) {
    // Show loading while fetching available tests
    if (isLoading) {
      return (
        <StudentLayout title="Writing Tests">
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <DotLottieLoadingAnimation 
                message="Loading available writing tests..."
                subMessage="Please wait"
                size={150}
              />
            </div>
          </div>
        </StudentLayout>
      );
    }

    // Show test selection if tests are available
    if (filteredTests.length > 0 || availableTests.length > 0) {
      const testsToShow = filteredTests.length > 0 ? filteredTests : availableTests;
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
            <StudentLayout title="Available Writing Tests">
              <div className="min-h-screen py-12">
                <div className="container mx-auto px-4">
                  <div className="max-w-4xl mx-auto">
                    <div className="mb-8">
                      <Button
                        variant="outline"
                        onClick={() => navigate('/ielts-portal')}
                        className="mb-4"
                      >
                        ← Back to IELTS Portal
                      </Button>
                      <h1 className="text-4xl font-bold text-foreground mb-2">
                        IELTS {selectedTrainingType || 'Writing'} Tests
                      </h1>
                      <p className="text-lg text-muted-foreground">
                        {selectedTrainingType 
                          ? `Choose a ${selectedTrainingType.toLowerCase()} writing test to begin your practice`
                          : 'Choose a writing test to begin your practice'}
                      </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {testsToShow.map((test) => {
                        if (!test || !test.id) {
                          console.warn('Invalid test object:', test);
                          return null;
                        }
                        return (
                          <SpotlightCard key={test.id} className="cursor-pointer h-[140px] hover:scale-105 transition-all duration-300 hover:shadow-lg bg-white/80 flex items-center justify-center" onClick={() => navigate(`/ielts-writing-test/${test.id}`)}>
                             <CardContent className="p-3 md:p-4 text-center flex items-center justify-center h-full">
                               <h3 className="font-semibold text-sm">{test.test_name || 'Untitled Test'}</h3>
                               {test.test_subtype && (
                                 <p className="text-xs text-muted-foreground mt-1">{test.test_subtype}</p>
                               )}
                             </CardContent>
                          </SpotlightCard>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </StudentLayout>
          </div>
        </div>
      );
    }

    // Show no tests available message
    return (
      <StudentLayout title="Writing Tests">
        <div className="min-h-screen bg-gradient-to-br from-background to-primary/5 py-12">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl font-bold text-foreground mb-4">IELTS Writing Tests</h1>
            <p className="text-lg text-muted-foreground mb-8">No writing tests available yet</p>
            <Button onClick={() => navigate('/ielts-portal')} variant="outline">
              Back to Portal
            </Button>
          </div>
        </div>
      </StudentLayout>
    );
  }

  // Show loading only while actively loading a specific test
  if (isLoadingTest) {
    return (
      <StudentLayout title="IELTS Writing Test" showBackButton>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <DotLottieLoadingAnimation 
              message="Loading IELTS Writing test..."
              subMessage="Please wait while we fetch your test"
              size={150}
            />
          </div>
        </div>
      </StudentLayout>
    );
  }

  // Show error if test failed to load (only when testId exists)
  if (testId && (!test || !task1 || !task2)) {
    return (
      <StudentLayout title="IELTS Writing Test" showBackButton>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <p className="text-lg text-foreground mb-4">Unable to load test</p>
            <p className="text-sm text-muted-foreground mb-4">
              {!test ? "Test not found" : !task1 || !task2 ? "Test data is incomplete" : "Unknown error"}
            </p>
            <Button onClick={() => navigate('/ielts-portal')} variant="outline">
              Back to Portal
            </Button>
          </div>
        </div>
      </StudentLayout>
    );
  }

  const currentTaskData = getCurrentTask();
  const currentAnswer = getCurrentAnswer();

  if (!currentTaskData) {
    return (
      <StudentLayout title="IELTS Writing Test" showBackButton>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <p className="text-lg text-foreground mb-4">Task data not available</p>
            <Button onClick={() => navigate('/ielts-portal')} variant="outline">
              Back to Portal
            </Button>
          </div>
        </div>
      </StudentLayout>
    );
  }

  return (
    <div 
      className="min-h-screen relative"
      style={{
        backgroundColor: themeStyles.theme.name === 'dark' ? themeStyles.theme.colors.background : 'transparent'
      }}
    >
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed"
           style={{
             backgroundImage: themeStyles.theme.name === 'note' || themeStyles.theme.name === 'minimalist' || themeStyles.theme.name === 'dark'
               ? 'none'
               : `url('https://raw.githubusercontent.com/AlfieAlfiegithu2/alfie-ai-coach/main/public/1000031207.png')`,
             backgroundColor: themeStyles.backgroundImageColor
           }} />
      <div 
        className="relative z-10 min-h-screen flex flex-col"
        style={{
          backgroundColor: themeStyles.theme.name === 'dark' ? themeStyles.theme.colors.background : 'transparent'
        }}
      >
        <StudentLayout title="IELTS Writing Test" showBackButton>
          <div className="flex-1 flex justify-center min-h-[calc(100vh-120px)] py-8 sm:items-center sm:py-8">
            <div className="w-full max-w-6xl mx-auto space-y-6 px-4 flex flex-col">
        {/* Task Description Section */}
        <Card className="rounded-3xl relative" style={{
          backgroundColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.9)' : themeStyles.theme.name === 'dark' ? 'rgba(30, 41, 59, 0.95)' : themeStyles.theme.name === 'minimalist' ? '#ffffff' : themeStyles.theme.colors.cardBackground,
          borderColor: themeStyles.border,
          backdropFilter: themeStyles.theme.name === 'glassmorphism' ? 'blur(12px)' : themeStyles.theme.name === 'dark' ? 'blur(8px)' : 'none',
          boxShadow: themeStyles.theme.name === 'dark' 
            ? '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)'
            : themeStyles.theme.name === 'note'
            ? themeStyles.theme.styles.cardStyle?.boxShadow
            : '0 8px 32px rgba(15, 23, 42, 0.16), 0 0 0 1px rgba(148, 163, 253, 0.06)',
          ...themeStyles.cardStyle
        }}>
          {/* Floating Controls - Timer, Theme, Task Selection - Positioned at top-right of this card */}
          <div className="absolute -top-12 right-0 z-40 flex items-center gap-3">
          {/* Timer */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{
            backgroundColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.9)' : themeStyles.theme.name === 'dark' ? 'rgba(30, 41, 59, 0.95)' : themeStyles.theme.name === 'minimalist' ? '#ffffff' : themeStyles.theme.colors.cardBackground,
            borderColor: themeStyles.border,
            borderWidth: '1px',
            borderStyle: 'solid',
            backdropFilter: themeStyles.theme.name === 'glassmorphism' ? 'blur(12px)' : 'none',
            boxShadow: themeStyles.theme.name === 'dark' 
              ? '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)'
              : themeStyles.theme.name === 'note'
              ? themeStyles.theme.styles.cardStyle?.boxShadow
              : '0 8px 32px rgba(15, 23, 42, 0.16), 0 0 0 1px rgba(148, 163, 253, 0.06)'
          }}>
            <Clock className="w-4 h-4" style={{ color: themeStyles.buttonPrimary }} />
            <span className="text-sm font-medium" style={{ color: themeStyles.textPrimary }}>
              {formatTime(timeRemaining)}
            </span>
          </div>
          
          {/* Theme Selector */}
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4" style={{ color: themeStyles.textSecondary }} />
            <Select value={themeName} onValueChange={(value) => setTheme(value as ThemeName)}>
              <SelectTrigger 
                className="w-[140px] h-8 text-sm border transition-colors rounded-xl"
                style={{
                  backgroundColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.9)' : themeStyles.theme.name === 'dark' ? 'rgba(30, 41, 59, 0.95)' : themeStyles.theme.name === 'minimalist' ? '#ffffff' : themeStyles.theme.colors.cardBackground,
                  borderColor: themeStyles.border,
                  color: themeStyles.textPrimary,
                  backdropFilter: themeStyles.theme.name === 'glassmorphism' ? 'blur(12px)' : 'none'
                }}
              >
                <SelectValue placeholder="Theme" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(themes).map((theme) => (
                  <SelectItem key={theme.name} value={theme.name}>
                    {theme.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Task Selection Buttons */}
          <div className="flex items-center gap-2">
            <Button 
              size="sm" 
              onClick={() => switchToTask(1)} 
              className="rounded-xl"
              style={{
                backgroundColor: currentTask === 1 ? themeStyles.buttonPrimary : 'transparent',
                color: currentTask === 1 ? '#ffffff' : themeStyles.textPrimary,
                borderColor: themeStyles.border,
                borderWidth: '1px',
                borderStyle: 'solid'
              }}
            >
              Task 1
            </Button>
            <Button 
              size="sm" 
              onClick={() => switchToTask(2)} 
              className="rounded-xl"
              style={{
                backgroundColor: currentTask === 2 ? themeStyles.buttonPrimary : 'transparent',
                color: currentTask === 2 ? '#ffffff' : themeStyles.textPrimary,
                borderColor: themeStyles.border,
                borderWidth: '1px',
                borderStyle: 'solid'
              }}
            >
              Task 2
            </Button>
          </div>
          </div>
          <CardHeader>
            <CardTitle style={{ color: themeStyles.textPrimary }}>
              {currentTaskData?.title || (currentTask === 1 ? 'Letter Writing' : 'Essay Writing')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {currentTaskData?.instructions && (
                <div>
                  <h4 className="font-medium mb-2" style={{ color: themeStyles.textPrimary }}>Task Instructions</h4>
                  <div className="whitespace-pre-wrap leading-relaxed p-4 rounded-lg" style={{
                    backgroundColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.1)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.05)' : themeStyles.theme.name === 'minimalist' ? '#f9fafb' : 'rgba(255,255,255,0.6)',
                    borderColor: themeStyles.border,
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    color: themeStyles.textPrimary
                  }}>
                    {currentTaskData.instructions}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Main Content Layout */}
        {currentTask === 1 ? (
          currentTaskData?.imageUrl ? (
            <ResizablePanelGroup direction="horizontal" className="gap-6" style={{
              minHeight: `${themeStyles.theme.name === 'dark' ? 500 : themeStyles.theme.name === 'minimalist' ? 550 : themeStyles.theme.name === 'note' ? 580 : 600}px`
            }}>
              <ResizablePanel defaultSize={55} minSize={40}>
                <Card className="rounded-3xl h-full" style={{
                  backgroundColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.9)' : themeStyles.theme.name === 'dark' ? 'rgba(30, 41, 59, 0.95)' : themeStyles.theme.name === 'minimalist' ? '#ffffff' : themeStyles.theme.colors.cardBackground,
                  borderColor: themeStyles.border,
                  backdropFilter: themeStyles.theme.name === 'glassmorphism' ? 'blur(12px)' : themeStyles.theme.name === 'dark' ? 'blur(8px)' : 'none',
                  boxShadow: themeStyles.theme.name === 'dark' 
                    ? '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)'
                    : themeStyles.theme.name === 'note'
                    ? themeStyles.theme.styles.cardStyle?.boxShadow
                    : '0 8px 32px rgba(15, 23, 42, 0.16), 0 0 0 1px rgba(148, 163, 253, 0.06)',
                  ...themeStyles.cardStyle
                }}>
                  <CardContent className="p-4 h-full flex flex-col">
                    {/* Zoom Controls */}
                    <div className="flex items-center justify-end gap-2 mb-3">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setZoomScale(s => Math.max(0.5, Number((s - 0.25).toFixed(2))))}
                        className="w-8 h-8 p-0"
                        style={{
                          borderColor: themeStyles.border,
                          color: themeStyles.textPrimary
                        }}
                      >
                        -
                      </Button>
                      <span className="text-sm min-w-12 text-center" style={{ color: themeStyles.textSecondary }}>{Math.round(zoomScale * 100)}%</span>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setZoomScale(s => Math.min(3, Number((s + 0.25).toFixed(2))))}
                        className="w-8 h-8 p-0"
                        style={{
                          borderColor: themeStyles.border,
                          color: themeStyles.textPrimary
                        }}
                      >
                        +
                      </Button>
                    </div>
                    
                    {/* Image Container - Minimal padding, tight fit */}
                    <div className="flex-1 overflow-auto rounded-xl p-2" style={{
                      backgroundColor: themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.05)' : themeStyles.theme.name === 'minimalist' ? '#ffffff' : '#ffffff',
                      borderColor: themeStyles.border,
                      borderWidth: '1px',
                      borderStyle: 'solid'
                    }}>
                      <div className="flex items-center justify-center min-h-full">
                        <img 
                          src={currentTaskData.imageUrl} 
                          alt="Task 1 visual data" 
                          className="max-w-full h-auto object-contain"
                          style={{
                            transform: `scale(${zoomScale})`,
                            transformOrigin: 'center',
                            transition: 'transform 0.2s ease-out'
                          }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </ResizablePanel>

              <ResizableHandle withHandle />

              <ResizablePanel defaultSize={45} minSize={35}>
                <Card className="rounded-3xl h-full" style={{
                  backgroundColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.9)' : themeStyles.theme.name === 'dark' ? 'rgba(30, 41, 59, 0.95)' : themeStyles.theme.name === 'minimalist' ? '#ffffff' : themeStyles.theme.colors.cardBackground,
                  borderColor: themeStyles.border,
                  backdropFilter: themeStyles.theme.name === 'glassmorphism' ? 'blur(12px)' : themeStyles.theme.name === 'dark' ? 'blur(8px)' : 'none',
                  boxShadow: themeStyles.theme.name === 'dark' 
                    ? '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)'
                    : themeStyles.theme.name === 'note'
                    ? themeStyles.theme.styles.cardStyle?.boxShadow
                    : '0 8px 32px rgba(15, 23, 42, 0.16), 0 0 0 1px rgba(148, 163, 253, 0.06)',
                  ...themeStyles.cardStyle
                }}>
                  <CardHeader>
                    <div className="text-xs" style={{ color: themeStyles.textSecondary }}>
                      Words: {getWordCount(task1Answer)} • Min: 150
                    </div>
                  </CardHeader>
                  <CardContent className="h-full">
                    <Textarea 
                      value={task1Answer} 
                      onChange={e => setTask1Answer(e.target.value)} 
                      placeholder="Write your description here..." 
                      className="h-[450px] text-base leading-relaxed resize-none rounded-2xl focus:outline-none focus:ring-0"
                      style={{
                        backgroundColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.1)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.05)' : themeStyles.theme.name === 'minimalist' ? '#f9fafb' : 'rgba(255,255,255,0.6)',
                        borderColor: themeStyles.border,
                        color: themeStyles.textPrimary,
                        outline: 'none',
                        boxShadow: 'none'
                      }} 
                    />
                    <div className="flex justify-between items-center mt-4">
                      <div></div>
                      <Button 
                        onClick={proceedToTask2} 
                        disabled={!task1Answer.trim()} 
                        variant="default"
                        style={{
                          backgroundColor: themeStyles.buttonPrimary,
                          color: '#ffffff'
                        }}
                      >
                        Continue to Task 2
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </ResizablePanel>
            </ResizablePanelGroup>
          ) : (
            // Task 1 without image
            <Card className="rounded-3xl" style={{
              backgroundColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.9)' : themeStyles.theme.name === 'dark' ? 'rgba(30, 41, 59, 0.95)' : themeStyles.theme.name === 'minimalist' ? '#ffffff' : themeStyles.theme.colors.cardBackground,
              borderColor: themeStyles.border,
              backdropFilter: themeStyles.theme.name === 'glassmorphism' ? 'blur(12px)' : themeStyles.theme.name === 'dark' ? 'blur(8px)' : 'none',
              boxShadow: themeStyles.theme.name === 'dark' 
                ? '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)'
                : themeStyles.theme.name === 'note'
                ? themeStyles.theme.styles.cardStyle?.boxShadow
                : '0 8px 32px rgba(15, 23, 42, 0.16), 0 0 0 1px rgba(148, 163, 253, 0.06)',
              ...themeStyles.cardStyle,
              minHeight: `${themeStyles.theme.name === 'dark' ? 500 : themeStyles.theme.name === 'minimalist' ? 550 : themeStyles.theme.name === 'note' ? 580 : 600}px`
            }}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  {/* Title removed */}
                  <div className="text-xs" style={{ color: themeStyles.textSecondary }}>
                    Words: {getWordCount(task1Answer)} • Min: 150
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Textarea 
                  value={task1Answer} 
                  onChange={e => setTask1Answer(e.target.value)} 
                  placeholder="Write your description here..." 
                  className="min-h-[400px] text-base leading-relaxed resize-none rounded-2xl focus:outline-none focus:ring-0"
                  style={{
                    backgroundColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.1)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.05)' : themeStyles.theme.name === 'minimalist' ? '#f9fafb' : 'rgba(255,255,255,0.6)',
                    borderColor: themeStyles.border,
                    color: themeStyles.textPrimary,
                    outline: 'none',
                    boxShadow: 'none'
                  }} 
                />
                <div className="flex justify-between items-center mt-4">
                  <div></div>
                  <Button 
                    onClick={proceedToTask2} 
                    disabled={!task1Answer.trim()} 
                    variant="default"
                    style={{
                      backgroundColor: themeStyles.buttonPrimary,
                      color: '#ffffff'
                    }}
                  >
                    Continue to Task 2
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        ) : (
          // Task 2 - Essay Writing
          <Card className="rounded-3xl" style={{
            backgroundColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.9)' : themeStyles.theme.name === 'dark' ? 'rgba(30, 41, 59, 0.95)' : themeStyles.theme.name === 'minimalist' ? '#ffffff' : themeStyles.theme.colors.cardBackground,
            borderColor: themeStyles.border,
            backdropFilter: themeStyles.theme.name === 'glassmorphism' ? 'blur(12px)' : themeStyles.theme.name === 'dark' ? 'blur(8px)' : 'none',
            boxShadow: themeStyles.theme.name === 'dark' 
              ? '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)'
              : themeStyles.theme.name === 'note'
              ? themeStyles.theme.styles.cardStyle?.boxShadow
              : '0 8px 32px rgba(15, 23, 42, 0.16), 0 0 0 1px rgba(148, 163, 253, 0.06)',
            ...themeStyles.cardStyle,
            minHeight: `${themeStyles.theme.name === 'dark' ? 500 : themeStyles.theme.name === 'minimalist' ? 550 : themeStyles.theme.name === 'note' ? 580 : 600}px`
          }}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div></div>
                <div className="text-xs" style={{ color: themeStyles.textSecondary }}>
                  Words: {getWordCount(task2Answer)} • Min: 250
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea 
                value={task2Answer} 
                onChange={e => setTask2Answer(e.target.value)} 
                placeholder="Write your essay here..." 
                className="min-h-[400px] text-base leading-relaxed resize-none rounded-2xl focus:outline-none focus:ring-0"
                style={{
                  backgroundColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.1)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.05)' : themeStyles.theme.name === 'minimalist' ? '#f9fafb' : 'rgba(255,255,255,0.6)',
                  borderColor: themeStyles.border,
                  color: themeStyles.textPrimary,
                  outline: 'none',
                  boxShadow: 'none'
                }} 
              />
              <div className="flex justify-end items-center gap-3 mt-4">
                {/* Feedback Language Selector - Simple, next to Submit */}
                <Select value={feedbackLanguage} onValueChange={setFeedbackLanguage}>
                  <SelectTrigger 
                    className="w-[140px] h-9 text-sm border transition-colors rounded-xl"
                    style={{
                      backgroundColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.9)' : themeStyles.theme.name === 'dark' ? 'rgba(30, 41, 59, 0.95)' : themeStyles.theme.name === 'minimalist' ? '#ffffff' : themeStyles.theme.colors.cardBackground,
                      borderColor: themeStyles.border,
                      color: themeStyles.textPrimary,
                      backdropFilter: themeStyles.theme.name === 'glassmorphism' ? 'blur(12px)' : 'none'
                    }}
                  >
                    <SelectValue placeholder="Language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="ko">한국어 (Korean)</SelectItem>
                    <SelectItem value="zh">中文 (Chinese)</SelectItem>
                    <SelectItem value="ja">日本語 (Japanese)</SelectItem>
                    <SelectItem value="es">Español (Spanish)</SelectItem>
                    <SelectItem value="pt">Português (Portuguese)</SelectItem>
                    <SelectItem value="fr">Français (French)</SelectItem>
                    <SelectItem value="de">Deutsch (German)</SelectItem>
                    <SelectItem value="ru">Русский (Russian)</SelectItem>
                    <SelectItem value="hi">हिन्दी (Hindi)</SelectItem>
                    <SelectItem value="vi">Tiếng Việt (Vietnamese)</SelectItem>
                    <SelectItem value="ar">العربية (Arabic)</SelectItem>
                    <SelectItem value="bn">বাংলা (Bengali)</SelectItem>
                    <SelectItem value="ur">اردو (Urdu)</SelectItem>
                    <SelectItem value="id">Bahasa Indonesia</SelectItem>
                    <SelectItem value="tr">Türkçe (Turkish)</SelectItem>
                    <SelectItem value="fa">فارسی (Persian)</SelectItem>
                    <SelectItem value="ta">தமிழ் (Tamil)</SelectItem>
                    <SelectItem value="ne">नेपाली (Nepali)</SelectItem>
                    <SelectItem value="th">ไทย (Thai)</SelectItem>
                    <SelectItem value="yue">粵語 (Cantonese)</SelectItem>
                    <SelectItem value="ms">Bahasa Melayu (Malay)</SelectItem>
                    <SelectItem value="kk">Қазақ (Kazakh)</SelectItem>
                    <SelectItem value="sr">Српски (Serbian)</SelectItem>
                    <SelectItem value="tl">Filipino</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  onClick={submitTest} 
                  disabled={isSubmitting || !task1Answer.trim() || !task2Answer.trim()} 
                  variant="default"
                  style={{
                    backgroundColor: themeStyles.buttonPrimary,
                    color: '#ffffff'
                  }}
                >
                  {isSubmitting ? "Submitting..." : "Submit Test"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Exit Button - Fixed Bottom Left */}
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigate('/ielts/writing')} 
          className="fixed bottom-6 left-6 z-50 rounded-xl"
          style={{
            backgroundColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.9)' : themeStyles.theme.name === 'dark' ? 'rgba(30, 41, 59, 0.95)' : themeStyles.theme.name === 'minimalist' ? '#ffffff' : themeStyles.theme.colors.cardBackground,
            borderColor: themeStyles.border,
            color: themeStyles.textPrimary
          }}
        >
          Exit
        </Button>

        {/* Catie AI Assistant - Floating Bottom Right */}
        <div className="fixed bottom-6 right-3 sm:bottom-6 sm:right-6 z-50">
          {/* Chat card */}
          {showAIAssistant && (
            <Card
              className={`backdrop-blur-md rounded-3xl w-[260px] h-[360px] sm:w-96 sm:h-[500px] shadow-2xl flex flex-col transform-gpu origin-bottom-right transition-all duration-260 ease-in-out ${
                showAIAssistantVisible
                  ? 'opacity-100 scale-100 translate-y-0'
                  : 'opacity-0 scale-75 translate-y-8'
              }`}
              style={{
                backgroundColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.95)' : themeStyles.theme.name === 'dark' ? 'rgba(30, 41, 59, 0.95)' : themeStyles.theme.name === 'minimalist' ? '#ffffff' : themeStyles.theme.colors.cardBackground,
                borderColor: themeStyles.border,
                backdropFilter: themeStyles.theme.name === 'glassmorphism' ? 'blur(12px)' : themeStyles.theme.name === 'dark' ? 'blur(8px)' : 'none',
                ...themeStyles.cardStyle
              }}
            >
              <CardHeader className="pb-1 sm:pb-2 rounded-t-3xl relative">
                <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={closeAIAssistant}
                    className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                    style={{ color: themeStyles.textPrimary }}
                  >
                    ✕
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col px-2.5 py-2 sm:p-4 overflow-hidden">
                <Conversation className="flex-1 min-h-0">
                  <ConversationContent className="flex-1 min-h-0">
                    {getCurrentChatMessages().length === 0 && !isChatLoading ? (
                      <ConversationEmptyState
                        icon={<Orb className="size-9 sm:size-12" style={{ color: themeStyles.textSecondary }} />}
                        title="Start a conversation"
                        description="Ask for help with your IELTS writing practice"
                      />
                    ) : (
                      <>
                        {/* Current task displayed at the top of chat */}
                        <div 
                          className="rounded-lg p-3 mb-4"
                          style={{
                            backgroundColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.1)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.05)' : themeStyles.theme.name === 'minimalist' ? '#f9fafb' : 'rgba(255,255,255,0.6)',
                            borderColor: themeStyles.border,
                            borderWidth: '1px',
                            borderStyle: 'solid'
                          }}
                        >
                          <div className="text-[10px] sm:text-sm whitespace-pre-wrap" style={{ color: themeStyles.textSecondary }}>
                            {currentTaskData?.title || (currentTask === 1 ? 'Letter Writing' : 'Essay Writing')}
                          </div>
                        </div>

                        {getCurrentChatMessages().map((message) => (
                          <Message key={message.id} from={message.type === 'user' ? 'user' : 'assistant'}>
                            {message.type === 'bot' && (
                              <div
                                style={{
                                  borderRadius: '50%',
                                  overflow: 'hidden',
                                  width: '52px',
                                  height: '52px',
                                  flexShrink: 0
                                }}
                              >
                                <img
                                  src="https://raw.githubusercontent.com/AlfieAlfiegithu2/alfie-ai-coach/main/public/1000031289.png"
                                  alt="Catie"
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                              </div>
                            )}
                            <MessageContent>
                              <div
                                className="px-3 py-2 rounded-xl text-sm"
                                style={{
                                  backgroundColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.1)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.05)' : themeStyles.theme.name === 'minimalist' ? '#f9fafb' : 'rgba(255,255,255,0.5)',
                                  borderColor: themeStyles.border,
                                  borderWidth: '1px',
                                  borderStyle: 'solid',
                                  color: themeStyles.textPrimary
                                }}
                              >
                                <Response
                                  dangerouslySetInnerHTML={{
                                    __html: message.content
                                      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                      .replace(/\*(.*?)\*/g, '<em>$1</em>')
                                      .replace(/^• (.*)$/gm, '<li>$1</li>')
                                      .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
                                      .replace(/\n/g, '<br>'),
                                  }}
                                />
                              </div>
                            </MessageContent>
                            {message.type === 'user' && profile?.avatar_url && (
                              <div
                                style={{
                                  borderRadius: '50%',
                                  overflow: 'hidden',
                                  width: '52px',
                                  height: '52px',
                                  flexShrink: 0
                                }}
                              >
                                <img
                                  src={profile.avatar_url}
                                  alt="Your avatar"
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                              </div>
                            )}
                          </Message>
                        ))}
                        {isChatLoading && (
                          <Message from="assistant">
                            <MessageContent>
                              <div 
                                className="px-3 py-2 rounded-xl text-sm"
                                style={{
                                  backgroundColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.1)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.05)' : themeStyles.theme.name === 'minimalist' ? '#f9fafb' : 'rgba(255,255,255,0.5)',
                                  borderColor: themeStyles.border,
                                  borderWidth: '1px',
                                  borderStyle: 'solid'
                                }}
                              >
                                <ShimmeringText text="Thinking..." />
                              </div>
                            </MessageContent>
                            <div
                              style={{
                                borderRadius: '50%',
                                overflow: 'hidden',
                                width: '52px',
                                height: '52px',
                              }}
                            >
                              <img
                                src="https://raw.githubusercontent.com/AlfieAlfiegithu2/alfie-ai-coach/main/public/1000031289.png"
                                alt="Catie"
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            </div>
                          </Message>
                        )}
                      </>
                    )}
                  </ConversationContent>
                </Conversation>

                <div className="flex-shrink-0 mt-2.5 sm:mt-4">
                  <div className="flex gap-1.5 sm:gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) =>
                        e.key === 'Enter' && !isChatLoading && newMessage.trim() && sendChatMessage()
                      }
                      placeholder="Ask for writing help..."
                      className="flex-1 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg text-[10px] sm:text-sm focus:outline-none focus:ring-0 resize-none"
                      style={{
                        backgroundColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.1)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.05)' : themeStyles.theme.name === 'minimalist' ? '#ffffff' : themeStyles.theme.colors.cardBackground,
                        borderColor: themeStyles.border,
                        borderWidth: '1px',
                        borderStyle: 'solid',
                        color: themeStyles.textPrimary
                      }}
                      disabled={isChatLoading}
                    />
                    <style dangerouslySetInnerHTML={{ __html: `
                      input[placeholder="Ask for writing help..."]::placeholder {
                        color: ${themeStyles.textSecondary};
                      }
                    ` }} />
                    <Button
                      onClick={() => sendChatMessage()}
                      disabled={isChatLoading || !newMessage.trim()}
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                      style={{ color: themeStyles.textPrimary }}
                    >
                      {isChatLoading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2" style={{ borderColor: themeStyles.textPrimary }} />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          {/* Show Catie dock icon only when chat is fully closed */}
          {!showAIAssistant && (
            <div
              style={{
                borderRadius: '50%',
                overflow: 'hidden',
                width: '64px',
                height: '64px',
                cursor: 'pointer',
                boxShadow: '0 8px 20px rgba(0,0,0,0.18)',
                transition: 'transform 0.22s ease-out, box-shadow 0.22s ease-out',
              }}
              onClick={() => {
                setShowAIAssistant(true);
                requestAnimationFrame(() => setShowAIAssistantVisible(true));
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.transform = 'scale(1.06) translateY(-2px)';
                el.style.boxShadow = '0 14px 30px rgba(0,0,0,0.24)';
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.transform = 'scale(1.0) translateY(0px)';
                el.style.boxShadow = '0 10px 25px rgba(0,0,0,0.15)';
              }}
            >
              <img
                src="https://raw.githubusercontent.com/AlfieAlfiegithu2/alfie-ai-coach/main/public/1000031289.png"
                alt="Catie"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          )}
        </div>

        {/* Loading Overlay */}
        {isSubmitting && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-card p-8 rounded-3xl shadow-xl border border-border">
               <DotLottieLoadingAnimation 
                message="Analyzing your writing with AI examiner..."
                subMessage="Please wait while we evaluate your IELTS writing"
                size={200}
               />
            </div>
          </div>
        )}
            </div>
          </div>
        </StudentLayout>
      </div>
    </div>
  );
};

export default IELTSWritingTestInterface;