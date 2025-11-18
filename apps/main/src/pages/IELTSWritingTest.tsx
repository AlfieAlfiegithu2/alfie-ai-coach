import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import StudentLayout from "@/components/StudentLayout";
import { Bot, ListTree, Clock, FileText, PenTool, Palette, Send, CheckCircle2, Loader2, Info, HelpCircle } from "lucide-react";
import { DraggableChatbot } from "@/components/DraggableChatbot";
import DotLottieLoadingAnimation from "@/components/animations/DotLottieLoadingAnimation";
import SpotlightCard from "@/components/SpotlightCard";
import { useThemeStyles } from '@/hooks/useThemeStyles';
import { useTheme } from '@/contexts/ThemeContext';
import { themes, ThemeName } from '@/lib/themes';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  const [zoomOrigin, setZoomOrigin] = useState('center');
  const [feedbackLanguage, setFeedbackLanguage] = useState<string>("en");
  const [selectedModel, setSelectedModel] = useState<string>("gemini-2.5-flash");
  const [searchParams] = useSearchParams();
  const selectedTrainingType = searchParams.get('training') as 'Academic' | 'General' | null;
  const [filteredTests, setFilteredTests] = useState<any[]>([]);

  // Timer states
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [timerStarted, setTimerStarted] = useState(false);
  const [totalTimeSpent, setTotalTimeSpent] = useState<number>(0);

  // Spelling check and grammar feedback states
  const [spellCheckEnabled, setSpellCheckEnabled] = useState(false);
  const [isGrammarLoading, setIsGrammarLoading] = useState(false);
  const [task1GrammarFeedback, setTask1GrammarFeedback] = useState<string | null>(null);
  const [task1GrammarImproved, setTask1GrammarImproved] = useState<string | null>(null);
  const [task2GrammarFeedback, setTask2GrammarFeedback] = useState<string | null>(null);
  const [task2GrammarImproved, setTask2GrammarImproved] = useState<string | null>(null);
  
  // Skip task states
  const [task1Skipped, setTask1Skipped] = useState(false);
  const [task2Skipped, setTask2Skipped] = useState(false);

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
        throw new Error('Test ID is required');
      }

      // Load test and questions in parallel - only select needed fields for faster queries
      const [testResult, questionsResult] = await Promise.all([
        supabase
          .from('tests')
          .select('id, test_name, test_type, module, skill_category, test_subtype')
          .eq('id', testId)
          .maybeSingle(),
        supabase
          .from('questions')
          .select('id, test_id, part_number, question_text, passage_text, image_url, explanation, transcription')
          .eq('test_id', testId)
          .in('part_number', [1, 2])
          .order('part_number')
      ]);

      if (testResult.error) {
        throw testResult.error;
      }
      if (questionsResult.error) {
        throw questionsResult.error;
      }

      const testData = testResult.data;
      if (!testData) {
        throw new Error('Test not found');
      }
      
      // Batch state updates to reduce re-renders
      setTest(testData);

      const questions = questionsResult.data || [];
      
      // Find Task 1 and Task 2 questions
      const task1Question = questions.find(q => q.part_number === 1);
      const task2Question = questions.find(q => q.part_number === 2);

      // Preload image if available for faster display
      if (task1Question?.image_url) {
        const img = new Image();
        img.src = task1Question.image_url;
      }

      // Batch task state updates
      const newTask1: Task = task1Question ? {
        id: task1Question.id,
        title: task1Question.question_text || "Task 1 - Data Description",
        instructions: task1Question.passage_text || "",
        imageUrl: task1Question.image_url || "",
        imageContext: task1Question.explanation || "",
        modelAnswer: task1Question.transcription || ""
      } : {
        id: 'default-task1',
        title: "Task 1 - Data Description",
        instructions: "Task 1 question not found. Please contact support.",
        imageUrl: "",
        imageContext: "",
        modelAnswer: ""
      };

      const newTask2: Task = task2Question ? {
        id: task2Question.id,
        title: task2Question.question_text || "Task 2 - Essay Writing",
        instructions: task2Question.passage_text || "",
        modelAnswer: task2Question.transcription || ""
      } : {
        id: 'default-task2',
        title: "Task 2 - Essay Writing",
        instructions: "Task 2 question not found. Please contact support.",
        modelAnswer: ""
      };

      // Update both tasks in a single batch
      setTask1(newTask1);
      setTask2(newTask2);
    } catch (error: any) {
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
      // Optimized query - only select needed fields
      const { data: tests, error: testsError } = await supabase
        .from('tests')
        .select('id, test_name, test_type, module, skill_category, test_subtype, created_at')
        .eq('test_type', 'IELTS')
        .or('module.eq.Writing,skill_category.eq.Writing')
        .order('created_at', { ascending: false });

      if (testsError) {
        throw testsError;
      }

      // Filter out any null or invalid tests
      let finalTests = (tests || []).filter((test: any) => {
        return test && test.id && (test.test_name || test.module || test.skill_category);
      });

      // Fallback: if no tests found with exact match, try broader search
      if (finalTests.length === 0) {
        const { data: allIeltsTests, error: allTestsError } = await supabase
          .from('tests')
          .select('id, test_name, test_type, module, skill_category, test_subtype, created_at')
          .eq('test_type', 'IELTS')
          .order('created_at', { ascending: false });
        
        if (!allTestsError && allIeltsTests) {
          // Filter client-side exactly like admin does
          finalTests = allIeltsTests.filter((test: any) => {
            return test && test.id && (
              test.module === 'Writing' || 
              test.skill_category === 'Writing' || 
              test.test_name?.toLowerCase().includes('writing')
            );
          });
        }
      }
      
      setAvailableTests(finalTests);
    } catch (error) {
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

  const getMinWordCount = () => {
    return currentTask === 1 ? 150 : 250;
  };

  const handleGrammarFeedback = async (retryCount: number = 0) => {
    const currentAnswer = getCurrentAnswer();
    if (!currentAnswer || currentAnswer.trim().length < 10) {
      toast({
        title: "Insufficient content",
        description: "Please write at least 10 characters before requesting grammar feedback.",
        variant: "destructive"
      });
      return;
    }

    setIsGrammarLoading(true);

    try {
      const currentTaskData = getCurrentTask();
      console.log('📝 Requesting grammar feedback for Task', currentTask, retryCount > 0 ? `(retry ${retryCount})` : '');
      
      // Create the function invocation promise with timeout handling
      const functionPromise = supabase.functions.invoke('grammar-feedback', {
        body: {
          writing: currentAnswer,
          taskType: currentTask === 1 ? 'Task 1 - Data Description' : 'Task 2 - Essay Writing',
          taskNumber: currentTask,
          targetLanguage: feedbackLanguage !== "en" ? feedbackLanguage : undefined
        }
      });

      // Create a timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Request timeout - the grammar check is taking too long. Please try again.'));
        }, 30000); // 30 second timeout
      });

      // Race between timeout and function call
      const result = await Promise.race([functionPromise, timeoutPromise]);
      const { data, error } = result as any;

      console.log('📥 Grammar feedback response:', { data, error });

      if (error) {
        console.error('❌ Grammar feedback error:', error);
        
        // Check if it's a connection error that might be retryable
        const isConnectionError = 
          error?.message?.includes('ERR_CONNECTION_CLOSED') ||
          error?.message?.includes('Failed to send a request') ||
          error?.message?.includes('network') ||
          error?.message?.includes('timeout') ||
          error?.name === 'FunctionsFetchError';

        if (isConnectionError && retryCount < 2) {
          console.log(`🔄 Retrying grammar feedback request (attempt ${retryCount + 1}/3)...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Exponential backoff
          return handleGrammarFeedback(retryCount + 1);
        }
        
        throw error;
      }

      if (!data) {
        throw new Error('No response data received from grammar feedback service');
      }

      if (data.success && data.feedback) {
        if (currentTask === 1) {
          setTask1GrammarFeedback(data.feedback);
          setTask1GrammarImproved(data.improved || null);
        } else {
          setTask2GrammarFeedback(data.feedback);
          setTask2GrammarImproved(data.improved || null);
        }
        const toastId = toast({
          title: "Grammar feedback ready",
          description: "Grammar analysis completed. Check the feedback below.",
        });
        // Auto-dismiss after 1 second
        setTimeout(() => {
          toastId.dismiss();
        }, 1000);
      } else {
        const errorMsg = data.error || data.details || 'Failed to get grammar feedback';
        console.error('❌ Grammar feedback failed:', errorMsg);
        throw new Error(errorMsg);
      }
    } catch (error: any) {
      console.error('❌ Grammar feedback catch error:', error);
      
      // Provide user-friendly error messages
      let errorMessage = "Failed to get grammar feedback. Please try again.";
      
      if (error?.message?.includes('timeout')) {
        errorMessage = "The grammar check is taking too long. Please try again in a moment.";
      } else if (error?.message?.includes('ERR_CONNECTION_CLOSED') || error?.message?.includes('Failed to send a request')) {
        errorMessage = "Connection error. Please check your internet connection and try again.";
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (error?.error) {
        errorMessage = error.error;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
        duration: 5000
      });
    } finally {
      setIsGrammarLoading(false);
    }
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
    // Grammar feedback is stored per task, so no need to clear
  };

  const submitTest = async () => {
    // Check if tasks are skipped or have content
    const task1HasContent = !task1Skipped && task1Answer.trim();
    const task2HasContent = !task2Skipped && task2Answer.trim();
    
    // Allow submission if at least one task is completed (not skipped and has content)
    if (!task1HasContent && !task2HasContent) {
      toast({
        title: "Please complete at least one task",
        description: "You need to complete at least Task 1 or Task 2 to submit (or skip one)",
        variant: "destructive"
      });
      return;
    }

    // Validate word count for non-skipped tasks
    // If a task is NOT skipped, it MUST meet the minimum word count
    const task1WordCount = getWordCount(task1Answer);
    const task2WordCount = getWordCount(task2Answer);
    const task1MinWords = 150;
    const task2MinWords = 250;

    // Task 1: If not skipped, must have content AND meet word count
    if (!task1Skipped) {
      if (!task1Answer.trim()) {
        toast({
          title: "Task 1 is required",
          description: "Please complete Task 1 or skip it before submitting.",
          variant: "destructive"
        });
        return;
      }
      if (task1WordCount < task1MinWords) {
        toast({
          title: "Task 1 word count too low",
          description: `Task 1 requires a minimum of ${task1MinWords} words. You currently have ${task1WordCount} words.`,
          variant: "destructive"
        });
        return;
      }
    }

    // Task 2: If not skipped, must have content AND meet word count
    if (!task2Skipped) {
      if (!task2Answer.trim()) {
        toast({
          title: "Task 2 is required",
          description: "Please complete Task 2 or skip it before submitting.",
          variant: "destructive"
        });
        return;
      }
      if (task2WordCount < task2MinWords) {
        toast({
          title: "Task 2 word count too low",
          description: `Task 2 requires a minimum of ${task2MinWords} words. You currently have ${task2WordCount} words.`,
          variant: "destructive"
        });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      // Run AI examiner assessment only (corrections will be generated on-demand in results page)
      // Only include tasks that are not skipped and have answers
      const [examinerResponse] = await Promise.all([
        // AI Examiner for comprehensive assessment
        supabase.functions.invoke('ielts-writing-examiner', {
          body: {
            task1Answer: (!task1Skipped && task1Answer.trim()) ? task1Answer.trim() : null,
            task2Answer: (!task2Skipped && task2Answer.trim()) ? task2Answer.trim() : null,
            task1Data: (!task1Skipped && task1Answer.trim()) ? task1 : null,
            task2Data: (!task2Skipped && task2Answer.trim()) ? task2 : null,
            targetLanguage: feedbackLanguage !== "en" ? feedbackLanguage : undefined,
            model: selectedModel
          }
        })
      ]);

      if (examinerResponse.error) throw examinerResponse.error;

      const { structured, feedback, task1WordCount, task2WordCount } = examinerResponse.data;

      // Calculate word counts (use 0 if task was skipped or has no content)
      const finalTask1WordCount = (!task1Skipped && task1Answer.trim()) ? (task1WordCount || getWordCount(task1Answer)) : 0;
      const finalTask2WordCount = (!task2Skipped && task2Answer.trim()) ? (task2WordCount || getWordCount(task2Answer)) : 0;

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
            task1Answer: (!task1Skipped && task1Answer.trim()) ? task1Answer.trim() : null,
            task2Answer: (!task2Skipped && task2Answer.trim()) ? task2Answer.trim() : null,
            overall_band: structured?.overall?.band || 7.0
          }
        })
        .select()
        .single();

      if (testError) throw testError;

      // Save Task 1 results (only if task was not skipped and has content)
      if (!task1Skipped && task1Answer.trim()) {
      const { error: task1Error } = await supabase
        .from('writing_test_results')
        .insert({
          user_id: user?.id,
          test_result_id: testResult.id,
          task_number: 1,
          prompt_text: task1?.instructions || task1?.title || '',
          user_response: task1Answer,
            word_count: finalTask1WordCount,
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
      }

      // Save Task 2 results (only if task was not skipped and has content)
      if (!task2Skipped && task2Answer.trim()) {
      const { error: task2Error } = await supabase
        .from('writing_test_results')
        .insert({
          user_id: user?.id,
          test_result_id: testResult.id,
          task_number: 2,
          prompt_text: task2?.instructions || task2?.title || '',
          user_response: task2Answer,
            word_count: finalTask2WordCount,
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
      }

      // Navigate to the enhanced results page with both state and DB persistence
      navigate('/ielts-writing-results-pro', {
        state: {
          testName: test?.test_name,
          testId: testId,
          submissionId: testResult.id,
          task1Answer: (!task1Skipped && task1Answer.trim()) ? task1Answer.trim() : null,
          task2Answer: (!task2Skipped && task2Answer.trim()) ? task2Answer.trim() : null,
          task1Skipped,
          task2Skipped,
          feedback,
          structured,
          task1Data: task1,
          task2Data: task2,
          task1WordCount: finalTask1WordCount,
          task2WordCount: finalTask2WordCount
        }
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to submit test for evaluation",
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
                      <h1 className="text-4xl font-bold text-foreground mb-2 text-center">
                        IELTS {selectedTrainingType || 'Writing'} Tests
                      </h1>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {testsToShow.map((test) => {
                        if (!test || !test.id) {
                          return null;
                        }
                        return (
                          <SpotlightCard key={test.id} className="cursor-pointer h-[140px] hover:scale-105 transition-all duration-300 hover:shadow-lg bg-white/80 flex items-center justify-center" onClick={() => navigate(`/ielts-writing-test/${test.id}`)}>
                             <CardContent className="p-3 md:p-4 text-center flex items-center justify-center h-full">
                               <h3 className="font-semibold text-sm">{test.test_name || 'Untitled Test'}</h3>
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
        className="relative z-10 flex flex-col"
        style={{
          backgroundColor: themeStyles.theme.name === 'dark' ? themeStyles.theme.colors.background : 'transparent',
          minHeight: 'calc(100vh - 80px)'
        }}
      >
        <StudentLayout title="IELTS Writing Test" showBackButton>
          <div className="flex-1 flex justify-center py-6 sm:py-6 pb-4">
            <div className="w-full max-w-6xl mx-auto space-y-8 px-4 flex flex-col">
        {/* Floating Controls - Timer, Theme, Task Selection */}
        <div className="flex items-center justify-center gap-4 mb-6">
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

        {/* Main Content Layout */}
        {currentTask === 1 ? (
          currentTaskData?.imageUrl ? (
            <ResizablePanelGroup direction="horizontal" className="gap-8" style={{
              minHeight: `${themeStyles.theme.name === 'dark' ? 500 : themeStyles.theme.name === 'minimalist' ? 550 : themeStyles.theme.name === 'note' ? 580 : 600}px`
            }}>
              <ResizablePanel defaultSize={45} minSize={40}>
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
                    {/* Task Instructions */}
                    <div className="mb-4">
                      {currentTaskData?.instructions && (
                        <div>
                          <h4 className="font-medium mb-2 text-sm" style={{ color: themeStyles.textPrimary }}>Task Instructions</h4>
                          <div className="whitespace-pre-wrap leading-relaxed p-3 rounded-lg text-sm" style={{
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

                    {/* Photo */}
                    <div className="flex-1 overflow-hidden">
                      <img
                        src={currentTaskData.imageUrl}
                        alt="Task 1 visual data"
                        className="w-full h-full object-contain cursor-pointer"
                        loading="eager"
                        decoding="async"
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const x = ((e.clientX - rect.left) / rect.width) * 100;
                          const y = ((e.clientY - rect.top) / rect.height) * 100;
                          setZoomOrigin(`${x}% ${y}%`);
                          setZoomScale(zoomScale === 1 ? 1.5 : 1);
                        }}
                        style={{
                          transform: `scale(${zoomScale})`,
                          transformOrigin: zoomOrigin,
                          transition: 'transform 0.2s ease-out'
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>
              </ResizablePanel>

              <ResizablePanel defaultSize={55} minSize={35}>
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
                  <CardHeader className="pb-2">
                    {/* Unified Controls Row */}
                    <div className="flex items-center justify-between gap-4">
                      {/* Left side: Word count and Skip */}
                      <div className="flex items-center gap-2">
                        <div className="text-xs font-medium" style={{ color: themeStyles.textSecondary }}>
                          <span className={getWordCount(task1Answer) < 150 ? "text-red-500" : "text-green-600"}>{getWordCount(task1Answer)}</span> / {getMinWordCount()}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setTask1Skipped(!task1Skipped);
                            if (!task1Skipped) {
                              setTask1Answer('');
                            }
                          }}
                          className="text-xs h-8 px-2 font-medium"
                          style={{
                            backgroundColor: task1Skipped
                              ? themeStyles.buttonPrimary
                              : 'transparent',
                            color: task1Skipped ? '#ffffff' : themeStyles.textPrimary,
                            border: 'none',
                            boxShadow: 'none',
                            padding: '0 8px'
                          }}
                        >
                          {task1Skipped ? 'Unskip' : 'Skip'}
                        </Button>
                      </div>

                      {/* Right side: Spell check, Grammar, Language */}
                      <div className="flex items-center gap-2">
                        {/* Spell Check */}
                        <div className="flex items-center gap-2">
                          <Switch
                            id="spellcheck-task1"
                            checked={spellCheckEnabled}
                            onCheckedChange={setSpellCheckEnabled}
                            style={{
                              backgroundColor: spellCheckEnabled
                                ? themeStyles.buttonPrimary
                                : themeStyles.theme.name === 'dark'
                                  ? 'rgba(255,255,255,0.1)'
                                  : themeStyles.theme.name === 'glassmorphism'
                                  ? 'rgba(255,255,255,0.2)'
                                  : 'rgba(0,0,0,0.1)'
                            }}
                            className="data-[state=checked]:bg-primary scale-75"
                          />
                        </div>

                        {/* Grammar Button */}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleGrammarFeedback(0)}
                                disabled={isGrammarLoading || !task1Answer.trim() || task1Skipped}
                                className="h-8 w-8 p-0 rounded-xl"
                                style={{
                                  backgroundColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.9)' : themeStyles.theme.name === 'dark' ? 'rgba(30, 41, 59, 0.95)' : themeStyles.theme.name === 'minimalist' ? '#ffffff' : themeStyles.theme.colors.cardBackground,
                                  borderColor: themeStyles.border,
                                  color: themeStyles.textPrimary,
                                  backdropFilter: themeStyles.theme.name === 'glassmorphism' ? 'blur(12px)' : 'none'
                                }}
                              >
                                {isGrammarLoading ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="w-3 h-3" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="max-w-xs">
                              <p>Get AI-powered grammar feedback on your writing. Identifies errors and provides an improved version.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        {/* Language Selector */}
                        <Select value={feedbackLanguage} onValueChange={setFeedbackLanguage}>
                          <SelectTrigger
                            id="feedback-language-task1"
                            className="w-[120px] h-8 text-xs border transition-colors rounded-xl"
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
                            <SelectItem value="zh">中文 (Chinese)</SelectItem>
                            <SelectItem value="hi">हिन्दी (Hindi)</SelectItem>
                            <SelectItem value="es">Español (Spanish)</SelectItem>
                            <SelectItem value="fr">Français (French)</SelectItem>
                            <SelectItem value="ar">العربية (Arabic)</SelectItem>
                            <SelectItem value="bn">বাংলা (Bengali)</SelectItem>
                            <SelectItem value="pt">Português (Portuguese)</SelectItem>
                            <SelectItem value="ru">Русский (Russian)</SelectItem>
                            <SelectItem value="ja">日本語 (Japanese)</SelectItem>
                            <SelectItem value="ur">اردو (Urdu)</SelectItem>
                            <SelectItem value="id">Bahasa Indonesia</SelectItem>
                            <SelectItem value="de">Deutsch (German)</SelectItem>
                            <SelectItem value="vi">Tiếng Việt (Vietnamese)</SelectItem>
                            <SelectItem value="tr">Türkçe (Turkish)</SelectItem>
                            <SelectItem value="it">Italiano (Italian)</SelectItem>
                            <SelectItem value="ko">한국어 (Korean)</SelectItem>
                            <SelectItem value="fa">فارسی (Persian)</SelectItem>
                            <SelectItem value="ta">தமிழ் (Tamil)</SelectItem>
                            <SelectItem value="ne">नेपाली (Nepali)</SelectItem>
                            <SelectItem value="th">ไทย (Thai)</SelectItem>
                            <SelectItem value="yue">粵語 (Cantonese)</SelectItem>
                            <SelectItem value="ms">Bahasa Melayu (Malay)</SelectItem>
                            <SelectItem value="te">తెలుగు (Telugu)</SelectItem>
                            <SelectItem value="mr">मराठी (Marathi)</SelectItem>
                            <SelectItem value="gu">ગુજરાતી (Gujarati)</SelectItem>
                            <SelectItem value="kn">ಕನ್ನಡ (Kannada)</SelectItem>
                            <SelectItem value="ml">മലയാളം (Malayalam)</SelectItem>
                            <SelectItem value="pa">ਪੰਜਾਬੀ (Punjabi)</SelectItem>
                            <SelectItem value="or">ଓଡ଼ିଆ (Odia)</SelectItem>
                            <SelectItem value="as">অসমীয়া (Assamese)</SelectItem>
                            <SelectItem value="sw">Kiswahili (Swahili)</SelectItem>
                            <SelectItem value="ha">Hausa</SelectItem>
                            <SelectItem value="yo">Yorùbá (Yoruba)</SelectItem>
                            <SelectItem value="ig">Ásụ̀sụ́ Ìgbò (Igbo)</SelectItem>
                            <SelectItem value="am">አማርኛ (Amharic)</SelectItem>
                            <SelectItem value="zu">isiZulu (Zulu)</SelectItem>
                            <SelectItem value="af">Afrikaans</SelectItem>
                            <SelectItem value="pl">Polski (Polish)</SelectItem>
                            <SelectItem value="uk">Українська (Ukrainian)</SelectItem>
                            <SelectItem value="ro">Română (Romanian)</SelectItem>
                            <SelectItem value="nl">Nederlands (Dutch)</SelectItem>
                            <SelectItem value="el">Ελληνικά (Greek)</SelectItem>
                            <SelectItem value="cs">Čeština (Czech)</SelectItem>
                            <SelectItem value="hu">Magyar (Hungarian)</SelectItem>
                            <SelectItem value="sv">Svenska (Swedish)</SelectItem>
                            <SelectItem value="bg">Български (Bulgarian)</SelectItem>
                            <SelectItem value="sr">Српски (Serbian)</SelectItem>
                            <SelectItem value="hr">Hrvatski (Croatian)</SelectItem>
                            <SelectItem value="sk">Slovenčina (Slovak)</SelectItem>
                            <SelectItem value="no">Norsk (Norwegian)</SelectItem>
                            <SelectItem value="da">Dansk (Danish)</SelectItem>
                            <SelectItem value="fi">Suomi (Finnish)</SelectItem>
                            <SelectItem value="sq">Shqip (Albanian)</SelectItem>
                            <SelectItem value="sl">Slovenščina (Slovenian)</SelectItem>
                            <SelectItem value="et">Eesti (Estonian)</SelectItem>
                            <SelectItem value="lv">Latviešu (Latvian)</SelectItem>
                            <SelectItem value="lt">Lietuvių (Lithuanian)</SelectItem>
                            <SelectItem value="uz">Oʻzbek (Uzbek)</SelectItem>
                            <SelectItem value="kk">Қазақша (Kazakh)</SelectItem>
                            <SelectItem value="az">Azərbaycan (Azerbaijani)</SelectItem>
                            <SelectItem value="mn">Монгол (Mongolian)</SelectItem>
                            <SelectItem value="he">עברית (Hebrew)</SelectItem>
                            <SelectItem value="ps">پښتو (Pashto)</SelectItem>
                            <SelectItem value="ka">ქართული (Georgian)</SelectItem>
                            <SelectItem value="hy">Հայերեն (Armenian)</SelectItem>
                            <SelectItem value="tl">Tagalog</SelectItem>
                            <SelectItem value="my">မြန်မာ (Burmese)</SelectItem>
                            <SelectItem value="km">ភាសាខ្មែរ (Khmer)</SelectItem>
                            <SelectItem value="si">සිංහල (Sinhala)</SelectItem>
                            <SelectItem value="ne">नेपाली (Nepali)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="h-full p-4 flex flex-col">
                    <Textarea
                      value={task1Answer}
                      onChange={e => setTask1Answer(e.target.value)}
                      placeholder={task1Skipped ? "Task 1 is skipped" : (test?.test_subtype === 'General' || selectedTrainingType === 'General' ? "Write your letter here..." : "Write your description here...")}
                      className="-mt-2 h-[500px] text-base leading-relaxed resize-none rounded-2xl focus:outline-none focus:ring-0"
                      spellCheck={spellCheckEnabled}
                      disabled={task1Skipped}
                      style={{
                        backgroundColor: task1Skipped 
                          ? (themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.05)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.02)' : themeStyles.theme.name === 'minimalist' ? '#f3f4f6' : 'rgba(255,255,255,0.3)')
                          : (themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.1)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.05)' : themeStyles.theme.name === 'minimalist' ? '#f9fafb' : 'rgba(255,255,255,0.6)'),
                        borderColor: themeStyles.border,
                        color: task1Skipped ? themeStyles.textSecondary : themeStyles.textPrimary,
                        outline: 'none',
                        boxShadow: 'none',
                        cursor: task1Skipped ? 'not-allowed' : 'text',
                        opacity: task1Skipped ? 0.6 : 1
                      }} 
                    />
                    {task1GrammarFeedback && currentTask === 1 && (
                      <div className="mt-4 space-y-4">
                        <div className="p-4 rounded-lg border" style={{
                          backgroundColor: themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.05)' : themeStyles.theme.name === 'minimalist' ? '#f9fafb' : 'rgba(255,255,255,0.6)',
                          borderColor: themeStyles.border
                        }}>
                          <h4 className="font-semibold mb-2" style={{ color: themeStyles.textPrimary }}>Grammar Feedback:</h4>
                          <div className="text-sm whitespace-pre-wrap" style={{ color: themeStyles.textPrimary }}>
                            {task1GrammarFeedback}
                          </div>
                        </div>
                        {task1GrammarImproved && (
                          <div className="p-4 rounded-lg border" style={{
                            backgroundColor: themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.05)' : themeStyles.theme.name === 'minimalist' ? '#f9fafb' : 'rgba(255,255,255,0.6)',
                            borderColor: themeStyles.border
                          }}>
                            <h4 className="font-semibold mb-2" style={{ color: themeStyles.textPrimary }}>Improved Version:</h4>
                            <div className="text-sm whitespace-pre-wrap" style={{ color: themeStyles.textPrimary }}>
                              {task1GrammarImproved}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
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
              <CardHeader className="pb-2">
                <div className="flex items-center justify-end gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Switch
                        id="spellcheck-task1-noimg"
                        checked={spellCheckEnabled}
                        onCheckedChange={setSpellCheckEnabled}
                        style={{
                          backgroundColor: spellCheckEnabled 
                            ? themeStyles.buttonPrimary 
                            : themeStyles.theme.name === 'dark' 
                              ? 'rgba(255,255,255,0.1)' 
                              : themeStyles.theme.name === 'glassmorphism'
                              ? 'rgba(255,255,255,0.2)'
                              : 'rgba(0,0,0,0.1)'
                        }}
                        className="data-[state=checked]:bg-primary"
                      />
                    </div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleGrammarFeedback(0)}
                            disabled={isGrammarLoading || !task1Answer.trim()}
                            className="text-xs rounded-xl"
                            style={{
                              backgroundColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.9)' : themeStyles.theme.name === 'dark' ? 'rgba(30, 41, 59, 0.95)' : themeStyles.theme.name === 'minimalist' ? '#ffffff' : themeStyles.theme.colors.cardBackground,
                              borderColor: themeStyles.border,
                              color: themeStyles.textPrimary,
                              backdropFilter: themeStyles.theme.name === 'glassmorphism' ? 'blur(12px)' : 'none'
                            }}
                          >
                            {isGrammarLoading ? (
                              <>
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                Analyzing...
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Grammar
                              </>
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-xs">
                          <p>Get AI-powered grammar feedback on your writing. Identifies errors and provides an improved version.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 flex flex-col">
                <Textarea 
                  value={task1Answer} 
                  onChange={e => setTask1Answer(e.target.value)} 
                  placeholder={task1Skipped ? "Task 1 is skipped" : (test?.test_subtype === 'General' || selectedTrainingType === 'General' ? "Write your letter here..." : "Write your description here...")} 
                  className="min-h-[500px] text-base leading-relaxed resize-none rounded-2xl focus:outline-none focus:ring-0"
                  spellCheck={spellCheckEnabled}
                  disabled={task1Skipped}
                  style={{
                    backgroundColor: task1Skipped 
                      ? (themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.05)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.02)' : themeStyles.theme.name === 'minimalist' ? '#f3f4f6' : 'rgba(255,255,255,0.3)')
                      : (themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.1)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.05)' : themeStyles.theme.name === 'minimalist' ? '#f9fafb' : 'rgba(255,255,255,0.6)'),
                    borderColor: themeStyles.border,
                    color: task1Skipped ? themeStyles.textSecondary : themeStyles.textPrimary,
                    outline: 'none',
                    boxShadow: 'none',
                    cursor: task1Skipped ? 'not-allowed' : 'text',
                    opacity: task1Skipped ? 0.6 : 1
                  }} 
                />
                {task1GrammarFeedback && currentTask === 1 && (
                  <div className="mt-4 space-y-4">
                    <div className="p-4 rounded-lg border" style={{
                      backgroundColor: themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.05)' : themeStyles.theme.name === 'minimalist' ? '#f9fafb' : 'rgba(255,255,255,0.6)',
                      borderColor: themeStyles.border
                    }}>
                      <h4 className="font-semibold mb-2" style={{ color: themeStyles.textPrimary }}>Grammar Feedback:</h4>
                      <div className="text-sm whitespace-pre-wrap" style={{ color: themeStyles.textPrimary }}>
                        {task1GrammarFeedback}
                      </div>
                    </div>
                    {task1GrammarImproved && (
                      <div className="p-4 rounded-lg border" style={{
                        backgroundColor: themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.05)' : themeStyles.theme.name === 'minimalist' ? '#f9fafb' : 'rgba(255,255,255,0.6)',
                        borderColor: themeStyles.border
                      }}>
                        <h4 className="font-semibold mb-2" style={{ color: themeStyles.textPrimary }}>Improved Version:</h4>
                        <div className="text-sm whitespace-pre-wrap" style={{ color: themeStyles.textPrimary }}>
                          {task1GrammarImproved}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <div className="flex justify-between items-center mt-4 gap-3">
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-medium" style={{ color: themeStyles.textSecondary }}>
                      <span className={getWordCount(task1Answer) < 150 ? "text-red-500" : "text-green-600"}>{getWordCount(task1Answer)}</span> / {getMinWordCount()}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setTask1Skipped(!task1Skipped);
                        if (!task1Skipped) {
                          setTask1Answer('');
                        }
                      }}
                      className="text-sm h-9 px-3 font-medium"
                      style={{
                        backgroundColor: task1Skipped 
                          ? themeStyles.buttonPrimary 
                          : 'transparent',
                        color: task1Skipped ? '#ffffff' : themeStyles.textPrimary,
                        border: 'none',
                        boxShadow: 'none',
                        padding: '0 12px'
                      }}
                    >
                      {task1Skipped ? 'Unskip' : 'Skip'}
                    </Button>
                  </div>
                  <div className="flex items-center gap-3">
                    <Label htmlFor="feedback-language-task1-noimg" className="text-sm font-medium whitespace-nowrap" style={{ color: themeStyles.textPrimary }}>
                      Feedback:
                    </Label>
                    <Select value={feedbackLanguage} onValueChange={setFeedbackLanguage}>
                      <SelectTrigger 
                        id="feedback-language-task1-noimg"
                        className="w-[180px] h-9 text-sm border transition-colors rounded-xl"
                        style={{
                          backgroundColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.9)' : themeStyles.theme.name === 'dark' ? 'rgba(30, 41, 59, 0.95)' : themeStyles.theme.name === 'minimalist' ? '#ffffff' : themeStyles.theme.colors.cardBackground,
                          borderColor: themeStyles.border,
                          color: themeStyles.textPrimary,
                          backdropFilter: themeStyles.theme.name === 'glassmorphism' ? 'blur(12px)' : 'none'
                        }}
                      >
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="zh">中文 (Chinese)</SelectItem>
                        <SelectItem value="hi">हिन्दी (Hindi)</SelectItem>
                        <SelectItem value="es">Español (Spanish)</SelectItem>
                        <SelectItem value="fr">Français (French)</SelectItem>
                        <SelectItem value="ar">العربية (Arabic)</SelectItem>
                        <SelectItem value="bn">বাংলা (Bengali)</SelectItem>
                        <SelectItem value="pt">Português (Portuguese)</SelectItem>
                        <SelectItem value="ru">Русский (Russian)</SelectItem>
                        <SelectItem value="ja">日本語 (Japanese)</SelectItem>
                        <SelectItem value="ur">اردو (Urdu)</SelectItem>
                        <SelectItem value="id">Bahasa Indonesia</SelectItem>
                        <SelectItem value="de">Deutsch (German)</SelectItem>
                        <SelectItem value="vi">Tiếng Việt (Vietnamese)</SelectItem>
                        <SelectItem value="tr">Türkçe (Turkish)</SelectItem>
                        <SelectItem value="it">Italiano (Italian)</SelectItem>
                        <SelectItem value="ko">한국어 (Korean)</SelectItem>
                        <SelectItem value="fa">فارسی (Persian)</SelectItem>
                        <SelectItem value="ta">தமிழ் (Tamil)</SelectItem>
                        <SelectItem value="th">ไทย (Thai)</SelectItem>
                        <SelectItem value="yue">粵語 (Cantonese)</SelectItem>
                        <SelectItem value="ms">Bahasa Melayu (Malay)</SelectItem>
                        <SelectItem value="te">తెలుగు (Telugu)</SelectItem>
                        <SelectItem value="mr">मराठी (Marathi)</SelectItem>
                        <SelectItem value="gu">ગુજરાતી (Gujarati)</SelectItem>
                        <SelectItem value="kn">ಕನ್ನಡ (Kannada)</SelectItem>
                        <SelectItem value="ml">മലയാളം (Malayalam)</SelectItem>
                        <SelectItem value="pa">ਪੰਜਾਬੀ (Punjabi)</SelectItem>
                        <SelectItem value="or">ଓଡ଼ିଆ (Odia)</SelectItem>
                        <SelectItem value="as">অসমীয়া (Assamese)</SelectItem>
                        <SelectItem value="sw">Kiswahili (Swahili)</SelectItem>
                        <SelectItem value="ha">Hausa</SelectItem>
                        <SelectItem value="yo">Yorùbá (Yoruba)</SelectItem>
                        <SelectItem value="ig">Ásụ̀sụ́ Ìgbò (Igbo)</SelectItem>
                        <SelectItem value="am">አማርኛ (Amharic)</SelectItem>
                        <SelectItem value="zu">isiZulu (Zulu)</SelectItem>
                        <SelectItem value="af">Afrikaans</SelectItem>
                        <SelectItem value="pl">Polski (Polish)</SelectItem>
                        <SelectItem value="uk">Українська (Ukrainian)</SelectItem>
                        <SelectItem value="ro">Română (Romanian)</SelectItem>
                        <SelectItem value="nl">Nederlands (Dutch)</SelectItem>
                        <SelectItem value="el">Ελληνικά (Greek)</SelectItem>
                        <SelectItem value="cs">Čeština (Czech)</SelectItem>
                        <SelectItem value="hu">Magyar (Hungarian)</SelectItem>
                        <SelectItem value="sv">Svenska (Swedish)</SelectItem>
                        <SelectItem value="bg">Български (Bulgarian)</SelectItem>
                        <SelectItem value="sr">Српски (Serbian)</SelectItem>
                        <SelectItem value="hr">Hrvatski (Croatian)</SelectItem>
                        <SelectItem value="sk">Slovenčina (Slovak)</SelectItem>
                        <SelectItem value="no">Norsk (Norwegian)</SelectItem>
                        <SelectItem value="da">Dansk (Danish)</SelectItem>
                        <SelectItem value="fi">Suomi (Finnish)</SelectItem>
                        <SelectItem value="sq">Shqip (Albanian)</SelectItem>
                        <SelectItem value="sl">Slovenščina (Slovenian)</SelectItem>
                        <SelectItem value="et">Eesti (Estonian)</SelectItem>
                        <SelectItem value="lv">Latviešu (Latvian)</SelectItem>
                        <SelectItem value="lt">Lietuvių (Lithuanian)</SelectItem>
                        <SelectItem value="uz">Oʻzbek (Uzbek)</SelectItem>
                        <SelectItem value="kk">Қазақша (Kazakh)</SelectItem>
                        <SelectItem value="az">Azərbaycan (Azerbaijani)</SelectItem>
                        <SelectItem value="mn">Монгол (Mongolian)</SelectItem>
                        <SelectItem value="he">עברית (Hebrew)</SelectItem>
                        <SelectItem value="ps">پښتو (Pashto)</SelectItem>
                        <SelectItem value="ka">ქართული (Georgian)</SelectItem>
                        <SelectItem value="hy">Հայերեն (Armenian)</SelectItem>
                        <SelectItem value="tl">Tagalog</SelectItem>
                        <SelectItem value="my">မြန်မာ (Burmese)</SelectItem>
                        <SelectItem value="km">ភាសាខ្មែរ (Khmer)</SelectItem>
                        <SelectItem value="si">සිංහල (Sinhala)</SelectItem>
                        <SelectItem value="ne">नेपाली (Nepali)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
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
            <CardHeader className="pb-2">
              <div className="flex items-center justify-end gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="spellcheck-task2"
                      checked={spellCheckEnabled}
                      onCheckedChange={setSpellCheckEnabled}
                      style={{
                        backgroundColor: spellCheckEnabled 
                          ? themeStyles.buttonPrimary 
                          : themeStyles.theme.name === 'dark' 
                            ? 'rgba(255,255,255,0.1)' 
                            : themeStyles.theme.name === 'glassmorphism'
                            ? 'rgba(255,255,255,0.2)'
                            : 'rgba(0,0,0,0.1)'
                      }}
                      className="data-[state=checked]:bg-primary"
                    />
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleGrammarFeedback(0)}
                          disabled={isGrammarLoading || !task2Answer.trim() || task2Skipped}
                          className="text-xs rounded-xl"
                          style={{
                            backgroundColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.9)' : themeStyles.theme.name === 'dark' ? 'rgba(30, 41, 59, 0.95)' : themeStyles.theme.name === 'minimalist' ? '#ffffff' : themeStyles.theme.colors.cardBackground,
                            borderColor: themeStyles.border,
                            color: themeStyles.textPrimary,
                            backdropFilter: themeStyles.theme.name === 'glassmorphism' ? 'blur(12px)' : 'none'
                          }}
                        >
                          {isGrammarLoading ? (
                            <>
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                              Analyzing...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Grammar
                            </>
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-xs">
                        <p>Get AI-powered grammar feedback on your writing. Identifies errors and provides an improved version.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 flex flex-col">
              <Textarea 
                value={task2Answer} 
                onChange={e => setTask2Answer(e.target.value)} 
                placeholder={task2Skipped ? "Task 2 is skipped" : "Write your essay here..."} 
                className="min-h-[500px] text-base leading-relaxed resize-none rounded-2xl focus:outline-none focus:ring-0"
                spellCheck={spellCheckEnabled}
                disabled={task2Skipped}
                style={{
                  backgroundColor: task2Skipped 
                    ? (themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.05)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.02)' : themeStyles.theme.name === 'minimalist' ? '#f3f4f6' : 'rgba(255,255,255,0.3)')
                    : (themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.1)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.05)' : themeStyles.theme.name === 'minimalist' ? '#f9fafb' : 'rgba(255,255,255,0.6)'),
                  borderColor: themeStyles.border,
                  color: task2Skipped ? themeStyles.textSecondary : themeStyles.textPrimary,
                  outline: 'none',
                  boxShadow: 'none',
                  cursor: task2Skipped ? 'not-allowed' : 'text',
                  opacity: task2Skipped ? 0.6 : 1
                }} 
              />
              {task2GrammarFeedback && currentTask === 2 && (
                <div className="mt-4 space-y-4">
                  <div className="p-4 rounded-lg border" style={{
                    backgroundColor: themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.05)' : themeStyles.theme.name === 'minimalist' ? '#f9fafb' : 'rgba(255,255,255,0.6)',
                    borderColor: themeStyles.border
                  }}>
                    <h4 className="font-semibold mb-2" style={{ color: themeStyles.textPrimary }}>Grammar Feedback:</h4>
                    <div className="text-sm whitespace-pre-wrap" style={{ color: themeStyles.textPrimary }}>
                      {task2GrammarFeedback}
                    </div>
                  </div>
                  {task2GrammarImproved && (
                    <div className="p-4 rounded-lg border" style={{
                      backgroundColor: themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.05)' : themeStyles.theme.name === 'minimalist' ? '#f9fafb' : 'rgba(255,255,255,0.6)',
                      borderColor: themeStyles.border
                    }}>
                      <h4 className="font-semibold mb-2" style={{ color: themeStyles.textPrimary }}>Improved Version:</h4>
                      <div className="text-sm whitespace-pre-wrap" style={{ color: themeStyles.textPrimary }}>
                        {task2GrammarImproved}
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div className="mt-4">
                {/* Feedback Language and Submit Button */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-medium" style={{ color: themeStyles.textSecondary }}>
                      <span className={getWordCount(task2Answer) < 250 ? "text-red-500" : "text-green-600"}>{getWordCount(task2Answer)}</span> / {getMinWordCount()}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setTask2Skipped(!task2Skipped);
                        if (!task2Skipped) {
                          setTask2Answer('');
                        }
                      }}
                      className="text-sm h-9 px-3 font-medium"
                      style={{
                        backgroundColor: task2Skipped 
                          ? themeStyles.buttonPrimary 
                          : 'transparent',
                        color: task2Skipped ? '#ffffff' : themeStyles.textPrimary,
                        border: 'none',
                        boxShadow: 'none',
                        padding: '0 12px'
                      }}
                    >
                      {task2Skipped ? 'Unskip' : 'Skip'}
                    </Button>
                  </div>
                  <div className="flex items-center gap-3">
                    <Label htmlFor="ai-model-selector" className="text-sm font-medium whitespace-nowrap" style={{ color: themeStyles.textPrimary }}>
                      AI Model:
                    </Label>
                    <Select value={selectedModel} onValueChange={setSelectedModel}>
                      <SelectTrigger
                        id="ai-model-selector"
                        className="w-[200px] h-9 text-sm border transition-colors rounded-xl"
                        style={{
                          backgroundColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.9)' : themeStyles.theme.name === 'dark' ? 'rgba(30, 41, 59, 0.95)' : themeStyles.theme.name === 'minimalist' ? '#ffffff' : themeStyles.theme.colors.cardBackground,
                          borderColor: themeStyles.border,
                          color: themeStyles.textPrimary,
                          backdropFilter: themeStyles.theme.name === 'glassmorphism' ? 'blur(12px)' : 'none'
                        }}
                      >
                        <SelectValue placeholder="Select AI Model" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
                        <SelectItem value="kimi-k2-thinking">Kimi K2 Thinking</SelectItem>
                        <SelectItem value="gpt-5.1">ChatGPT 5.1</SelectItem>
                      </SelectContent>
                    </Select>
                    <Label htmlFor="feedback-language-task2" className="text-sm font-medium whitespace-nowrap" style={{ color: themeStyles.textPrimary }}>
                      Feedback:
                    </Label>
                    <Select value={feedbackLanguage} onValueChange={setFeedbackLanguage}>
                      <SelectTrigger
                        id="feedback-language-task2"
                        className="w-[180px] h-9 text-sm border transition-colors rounded-xl"
                        style={{
                          backgroundColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.9)' : themeStyles.theme.name === 'dark' ? 'rgba(30, 41, 59, 0.95)' : themeStyles.theme.name === 'minimalist' ? '#ffffff' : themeStyles.theme.colors.cardBackground,
                          borderColor: themeStyles.border,
                          color: themeStyles.textPrimary,
                          backdropFilter: themeStyles.theme.name === 'glassmorphism' ? 'blur(12px)' : 'none'
                        }}
                      >
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="zh">中文 (Chinese)</SelectItem>
                        <SelectItem value="hi">हिन्दी (Hindi)</SelectItem>
                        <SelectItem value="es">Español (Spanish)</SelectItem>
                        <SelectItem value="fr">Français (French)</SelectItem>
                        <SelectItem value="ar">العربية (Arabic)</SelectItem>
                        <SelectItem value="bn">বাংলা (Bengali)</SelectItem>
                        <SelectItem value="pt">Português (Portuguese)</SelectItem>
                        <SelectItem value="ru">Русский (Russian)</SelectItem>
                        <SelectItem value="ja">日本語 (Japanese)</SelectItem>
                        <SelectItem value="ur">اردو (Urdu)</SelectItem>
                        <SelectItem value="id">Bahasa Indonesia</SelectItem>
                        <SelectItem value="de">Deutsch (German)</SelectItem>
                        <SelectItem value="vi">Tiếng Việt (Vietnamese)</SelectItem>
                        <SelectItem value="tr">Türkçe (Turkish)</SelectItem>
                        <SelectItem value="it">Italiano (Italian)</SelectItem>
                        <SelectItem value="ko">한국어 (Korean)</SelectItem>
                        <SelectItem value="fa">فارسی (Persian)</SelectItem>
                        <SelectItem value="ta">தமிழ் (Tamil)</SelectItem>
                        <SelectItem value="th">ไทย (Thai)</SelectItem>
                        <SelectItem value="yue">粵語 (Cantonese)</SelectItem>
                        <SelectItem value="ms">Bahasa Melayu (Malay)</SelectItem>
                        <SelectItem value="te">తెలుగు (Telugu)</SelectItem>
                        <SelectItem value="mr">मराठी (Marathi)</SelectItem>
                        <SelectItem value="gu">ગુજરાતી (Gujarati)</SelectItem>
                        <SelectItem value="kn">ಕನ್ನಡ (Kannada)</SelectItem>
                        <SelectItem value="ml">മലയാളം (Malayalam)</SelectItem>
                        <SelectItem value="pa">ਪੰਜਾਬੀ (Punjabi)</SelectItem>
                        <SelectItem value="or">ଓଡ଼ିଆ (Odia)</SelectItem>
                        <SelectItem value="as">অসমীয়া (Assamese)</SelectItem>
                        <SelectItem value="sw">Kiswahili (Swahili)</SelectItem>
                        <SelectItem value="ha">Hausa</SelectItem>
                        <SelectItem value="yo">Yorùbá (Yoruba)</SelectItem>
                        <SelectItem value="ig">Ásụ̀sụ́ Ìgbò (Igbo)</SelectItem>
                        <SelectItem value="am">አማርኛ (Amharic)</SelectItem>
                        <SelectItem value="zu">isiZulu (Zulu)</SelectItem>
                        <SelectItem value="af">Afrikaans</SelectItem>
                        <SelectItem value="pl">Polski (Polish)</SelectItem>
                        <SelectItem value="uk">Українська (Ukrainian)</SelectItem>
                        <SelectItem value="ro">Română (Romanian)</SelectItem>
                        <SelectItem value="nl">Nederlands (Dutch)</SelectItem>
                        <SelectItem value="el">Ελληνικά (Greek)</SelectItem>
                        <SelectItem value="cs">Čeština (Czech)</SelectItem>
                        <SelectItem value="hu">Magyar (Hungarian)</SelectItem>
                        <SelectItem value="sv">Svenska (Swedish)</SelectItem>
                        <SelectItem value="bg">Български (Bulgarian)</SelectItem>
                        <SelectItem value="sr">Српски (Serbian)</SelectItem>
                        <SelectItem value="hr">Hrvatski (Croatian)</SelectItem>
                        <SelectItem value="sk">Slovenčina (Slovak)</SelectItem>
                        <SelectItem value="no">Norsk (Norwegian)</SelectItem>
                        <SelectItem value="da">Dansk (Danish)</SelectItem>
                        <SelectItem value="fi">Suomi (Finnish)</SelectItem>
                        <SelectItem value="sq">Shqip (Albanian)</SelectItem>
                        <SelectItem value="sl">Slovenščina (Slovenian)</SelectItem>
                        <SelectItem value="et">Eesti (Estonian)</SelectItem>
                        <SelectItem value="lv">Latviešu (Latvian)</SelectItem>
                        <SelectItem value="lt">Lietuvių (Lithuanian)</SelectItem>
                        <SelectItem value="uz">Oʻzbek (Uzbek)</SelectItem>
                        <SelectItem value="kk">Қазақша (Kazakh)</SelectItem>
                        <SelectItem value="az">Azərbaycan (Azerbaijani)</SelectItem>
                        <SelectItem value="mn">Монгол (Mongolian)</SelectItem>
                        <SelectItem value="he">עברית (Hebrew)</SelectItem>
                        <SelectItem value="ps">پښتو (Pashto)</SelectItem>
                        <SelectItem value="ka">ქართული (Georgian)</SelectItem>
                        <SelectItem value="hy">Հայերեն (Armenian)</SelectItem>
                        <SelectItem value="tl">Tagalog</SelectItem>
                        <SelectItem value="my">မြန်မာ (Burmese)</SelectItem>
                        <SelectItem value="km">ភាសាខ្មែរ (Khmer)</SelectItem>
                        <SelectItem value="si">සිංහල (Sinhala)</SelectItem>
                        <SelectItem value="ne">नेपाली (Nepali)</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="w-4 h-4" style={{ color: themeStyles.textSecondary }} />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            <p>You can submit with just one task completed. The other task will be marked as skipped.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                  <Button
                    onClick={submitTest}
                    disabled={
                      isSubmitting ||
                      ((task1Skipped || !task1Answer.trim()) && (task2Skipped || !task2Answer.trim())) ||
                      (!task1Skipped && task1Answer.trim() && getWordCount(task1Answer) < 150) ||
                      (!task2Skipped && task2Answer.trim() && getWordCount(task2Answer) < 250) ||
                      (!task1Skipped && !task1Answer.trim()) ||
                      (!task2Skipped && !task2Answer.trim())
                    }
                    variant="default"
                    className="min-w-[120px]"
                    style={{
                      backgroundColor: themeStyles.buttonPrimary,
                      color: '#ffffff'
                    }}
                  >
                    {isSubmitting ? "Submitting..." : "Submit Test"}
                  </Button>
                    </div>
                  </div>
                </div>
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
      
      {/* Enhanced Spell Check Styling */}
      {spellCheckEnabled && (
        <style>{`
          /* Subtle underline only for spell check errors */
          textarea[spellcheck="true"]::spelling-error {
            text-decoration: wavy underline rgba(239, 68, 68, 0.6) 2px !important;
            text-decoration-skip-ink: none !important;
          }
          
          textarea[spellcheck="true"]:focus::spelling-error {
            text-decoration: wavy underline rgba(239, 68, 68, 0.7) 2px !important;
          }
        `}</style>
      )}
    </div>
  );
};

export default IELTSWritingTestInterface;