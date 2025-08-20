import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import StudentLayout from "@/components/StudentLayout";
import { Bot, BookOpen, ListTree, Clock, FileText, PenTool } from "lucide-react";
import { DraggableChatbot } from "@/components/DraggableChatbot";

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

  const [test, setTest] = useState<any>(null);
  const [task1, setTask1] = useState<Task | null>(null);
  const [task2, setTask2] = useState<Task | null>(null);
  const [currentTask, setCurrentTask] = useState<1 | 2>(1);
  const [task1Answer, setTask1Answer] = useState("");
  const [task2Answer, setTask2Answer] = useState("");

  // Separate chat messages for each task to prevent context bleeding
  const [task1ChatMessages, setTask1ChatMessages] = useState<ChatMessage[]>([{
    id: '1',
    type: 'bot',
    content: "Hello! I'm Catbot, your IELTS Writing tutor. I'm here to help you with Task 1 - Data Description. I'll guide you through analyzing charts, graphs, or diagrams and structuring your description. What would you like help with?",
    timestamp: new Date()
  }]);
  
  const [task2ChatMessages, setTask2ChatMessages] = useState<ChatMessage[]>([{
    id: '1',
    type: 'bot',
    content: "Hello! I'm Catbot, your IELTS Writing tutor. I'm here to help you with Task 2 - Essay Writing. I'll guide you through structuring arguments, developing ideas, and presenting your opinion clearly. What would you like help with?",
    timestamp: new Date()
  }]);

  const [newMessage, setNewMessage] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCatbotOpen, setIsCatbotOpen] = useState(false);
  const [isDraggableChatOpen, setIsDraggableChatOpen] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);

  // Timer states
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [timerStarted, setTimerStarted] = useState(false);

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
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerStarted, timeRemaining]);

  useEffect(() => {
    if (testId) {
      loadTestData();
    }
  }, [testId]);

  const loadTestData = async () => {
    try {
      // Load test from tests table
      const { data: testData, error: testError } = await supabase
        .from('tests')
        .select('*')
        .eq('id', testId)
        .single();

      if (testError) throw testError;
      setTest(testData);

      // Load questions for this test (IELTS Writing tasks)
      const { data: questions, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('test_id', testId)
        .order('part_number');

      if (questionsError) throw questionsError;

      // Find Task 1 and Task 2 questions
      const task1Question = questions?.find(q => q.part_number === 1);
      const task2Question = questions?.find(q => q.part_number === 2);

      if (task1Question) {
        setTask1({
          id: task1Question.id,
          title: task1Question.question_text || "Task 1 - Data Description",
          instructions: task1Question.passage_text || "",
          imageUrl: task1Question.image_url || "",
          imageContext: task1Question.explanation || "",
          modelAnswer: task1Question.transcription || ""
        });
      }

      if (task2Question) {
        setTask2({
          id: task2Question.id,
          title: task2Question.question_text || "Task 2 - Essay Writing",
          instructions: task2Question.passage_text || "",
          modelAnswer: task2Question.transcription || ""
        });
      }
    } catch (error) {
      console.error('Error loading test data:', error);
      toast({
        title: "Error",
        description: "Failed to load test data",
        variant: "destructive"
      });
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

      // Create context-aware prompt for Catbot
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
          context: 'catbot'
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
      toast({
        title: "Error",
        description: "Failed to get response from Catbot",
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
    // Reset and start timer for the new task
    const taskTime = taskNumber === 1 ? 20 * 60 : 40 * 60; // 20 min for Task 1, 40 min for Task 2
    setTimeRemaining(taskTime);
    setTimerStarted(true);
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
      // Use the new AI Examiner for comprehensive assessment
      const examinerResponse = await supabase.functions.invoke('ielts-writing-examiner', {
        body: {
          task1Answer,
          task2Answer,
          task1Data: task1,
          task2Data: task2
        }
      });

      if (examinerResponse.error) throw examinerResponse.error;

      // Navigate to the enhanced results page
      navigate('/ielts-writing-results-pro', {
        state: {
          testName: test?.test_name,
          testId: testId,
          task1Answer,
          task2Answer,
          feedback: examinerResponse.data.feedback,
          structured: examinerResponse.data.structured,
          task1Data: task1,
          task2Data: task2,
          task1WordCount: examinerResponse.data.task1WordCount,
          task2WordCount: examinerResponse.data.task2WordCount
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

  // Initialize timer on component mount
  useEffect(() => {
    if (!timerStarted && currentTask) {
      const taskTime = currentTask === 1 ? 20 * 60 : 40 * 60;
      setTimeRemaining(taskTime);
      setTimerStarted(true);
    }
  }, [currentTask, timerStarted]);

  if (!test || !task1 || !task2) {
    return (
      <StudentLayout title="IELTS Writing Test" showBackButton>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-sm text-text-tertiary">Loading IELTS Writing test...</p>
          </div>
        </div>
      </StudentLayout>
    );
  }

  const currentTaskData = getCurrentTask();
  const currentAnswer = getCurrentAnswer();

  return (
    <StudentLayout title="IELTS Writing Test" showBackButton>
      <div className="space-y-6 relative z-10">
        {/* Test Header */}
        <div className="rounded-2xl border border-light-border p-4" style={{
          background: 'var(--gradient-card)'
        }}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-heading-2 mb-1 text-foreground">{test.test_name}</h1>
            </div>
            <div className="flex items-center gap-4">
              {/* Timer */}
              <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-lg">
                <Clock className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">
                  Task {currentTask}: {formatTime(timeRemaining)}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => navigate('/ielts/writing')} className="rounded-xl">
                  Exit
                </Button>
                <Button variant={currentTask === 1 ? "default" : "outline"} size="sm" onClick={() => switchToTask(1)} className="rounded-xl">
                  Task 1
                </Button>
                <Button variant={currentTask === 2 ? "default" : "outline"} size="sm" onClick={() => switchToTask(2)} className="rounded-xl">
                  Task 2
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Task Description Section */}
        <Card className="glass-card rounded-3xl">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {currentTaskData?.title || `Task ${currentTask} - ${currentTask === 1 ? 'Data Description' : 'Essay Writing'}`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-text-secondary">
                {currentTask === 1 
                  ? "Task 1 requires students to describe visual information (graphs, charts, tables, etc.)"
                  : "Task 2 requires students to write an essay presenting arguments, opinions, and examples."
                }
              </p>
              
              {currentTaskData?.instructions && (
                <div>
                  <h4 className="font-medium text-foreground mb-2">Task Instructions</h4>
                  <div className="text-foreground whitespace-pre-wrap leading-relaxed bg-surface-3 p-4 rounded-lg border border-border">
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
            <ResizablePanelGroup direction="horizontal" className="gap-6 min-h-[600px]">
              <ResizablePanel defaultSize={55} minSize={40}>
                <Card className="glass-card rounded-3xl h-full">
                  <CardContent className="p-4 h-full flex flex-col">
                    {/* Zoom Controls */}
                    <div className="flex items-center justify-end gap-2 mb-3">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setZoomScale(s => Math.max(0.5, Number((s - 0.25).toFixed(2))))}
                        className="w-8 h-8 p-0"
                      >
                        -
                      </Button>
                      <span className="text-sm text-text-secondary min-w-12 text-center">{Math.round(zoomScale * 100)}%</span>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setZoomScale(s => Math.min(3, Number((s + 0.25).toFixed(2))))}
                        className="w-8 h-8 p-0"
                      >
                        +
                      </Button>
                    </div>
                    
                    {/* Image Container - Minimal padding, tight fit */}
                    <div className="flex-1 overflow-auto bg-white rounded-xl p-2">
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
                <Card className="glass-card rounded-3xl h-full">
                  <CardHeader>
                    <div className="text-xs text-text-tertiary">
                      Words: {getWordCount(task1Answer)} • Min: 150
                    </div>
                  </CardHeader>
                  <CardContent className="h-full">
                    <Textarea 
                      value={task1Answer} 
                      onChange={e => setTask1Answer(e.target.value)} 
                      placeholder="Write your description here..." 
                      className="h-[450px] text-base leading-relaxed resize-none bg-surface-3 border-border text-foreground placeholder:text-text-tertiary rounded-2xl" 
                    />
                    <div className="flex justify-between items-center mt-4">
                      <div className="text-sm">
                        {getWordCount(task1Answer) >= 150 ? 
                          <span className="text-brand-green">✓ Word count requirement met</span> : 
                          <span className="text-brand-orange">
                            {150 - getWordCount(task1Answer)} more words needed
                          </span>
                        }
                      </div>
                      <Button onClick={proceedToTask2} disabled={!task1Answer.trim()} variant="default">
                        Continue to Task 2
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </ResizablePanel>
            </ResizablePanelGroup>
          ) : (
            // Task 1 without image
            <Card className="glass-card rounded-3xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-foreground">Your Answer - Task 1</CardTitle>
                  <div className="text-xs text-text-tertiary">
                    Words: {getWordCount(task1Answer)} • Min: 150
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Textarea 
                  value={task1Answer} 
                  onChange={e => setTask1Answer(e.target.value)} 
                  placeholder="Write your description here..." 
                  className="min-h-[400px] text-base leading-relaxed resize-none bg-surface-3 border-border text-foreground placeholder:text-text-tertiary rounded-2xl" 
                />
                <div className="flex justify-between items-center mt-4">
                  <div className="text-sm">
                    {getWordCount(task1Answer) >= 150 ? (
                      <span className="text-brand-green">✓ Word count requirement met</span>
                    ) : (
                      <span className="text-brand-orange">
                        {150 - getWordCount(task1Answer)} more words needed
                      </span>
                    )}
                  </div>
                  <Button 
                    onClick={proceedToTask2} 
                    disabled={!task1Answer.trim()} 
                    variant="default"
                  >
                    Continue to Task 2
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        ) : (
          // Task 2 - Essay Writing
          <Card className="glass-card rounded-3xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-foreground">Your Answer - Task 2</CardTitle>
                <div className="text-xs text-text-tertiary">
                  Words: {getWordCount(task2Answer)} • Min: 250
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea 
                value={task2Answer} 
                onChange={e => setTask2Answer(e.target.value)} 
                placeholder="Write your essay here..." 
                className="min-h-[400px] text-base leading-relaxed resize-none bg-surface-3 border-border text-foreground placeholder:text-text-tertiary rounded-2xl" 
              />
              <div className="flex justify-between items-center mt-4">
                <div className="text-sm">
                  {getWordCount(task2Answer) >= 250 ? 
                    <span className="text-brand-green">✓ Word count requirement met</span> : 
                    <span className="text-brand-orange">
                      {250 - getWordCount(task2Answer)} more words needed
                    </span>
                  }
                </div>
                <Button 
                  onClick={submitTest} 
                  disabled={isSubmitting || !task1Answer.trim() || !task2Answer.trim()} 
                  variant="default"
                >
                  {isSubmitting ? "Submitting..." : "Submit Test"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Floating Foxbot Button */}
        {!isDraggableChatOpen && (
          <Button 
            onClick={() => setIsDraggableChatOpen(true)}
            className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg bg-muted hover:bg-muted/80 transform hover:scale-110 transition-all duration-300 z-40"
          >
            <img src="/lovable-uploads/dc03c5f0-f40a-40f2-a71a-0b12438f0f6b.png" alt="Foxbot" className="w-10 h-10 rounded-full object-cover" />
          </Button>
        )}

        <DraggableChatbot
          isVisible={isDraggableChatOpen}
          onClose={() => setIsDraggableChatOpen(false)}
          taskType={currentTaskData?.title || "IELTS Writing"}
          taskInstructions={currentTaskData?.instructions || ""}
        />
      </div>
    </StudentLayout>
  );
};

export default IELTSWritingTestInterface;