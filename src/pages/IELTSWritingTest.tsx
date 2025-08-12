import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import StudentLayout from "@/components/StudentLayout";

interface Task {
  id: string;
  title: string;
  instructions: string;
  imageUrl?: string;
  imageContext?: string;
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
    content: "Hello! I'm **Catbot**, your friendly IELTS Writing tutor! 🐱 I'm here to help you with **Task 1 - Data Description**. I'll guide you through analyzing charts, graphs, or diagrams and structuring your description. What would you like help with?",
    timestamp: new Date()
  }]);
  
  const [task2ChatMessages, setTask2ChatMessages] = useState<ChatMessage[]>([{
    id: '1',
    type: 'bot',
    content: "Hello! I'm **Catbot**, your friendly IELTS Writing tutor! 🐱 I'm here to help you with **Task 2 - Essay Writing**. I'll guide you through structuring arguments, developing ideas, and presenting your opinion clearly. What would you like help with?",
    timestamp: new Date()
  }]);
  
  const [newMessage, setNewMessage] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [isCatbotOpen, setIsCatbotOpen] = useState(false);

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
  
  useEffect(() => {
    if (testId) {
      loadTestData();
    }
  }, [testId]);

  const loadTestData = async () => {
    try {
      // Load test details
      const { data: testData, error: testError } = await supabase
        .from('tests')
        .select('*')
        .eq('id', testId)
        .single();
      
      if (testError) throw testError;
      setTest(testData);

      // Load questions for this test (only IELTS Writing tasks)
      const { data: questions, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('test_id', testId)
        .in('question_type', ['Task 1', 'Task 2'])
        .order('part_number');
      
      if (questionsError) throw questionsError;
      
      const task1Question = questions.find(q => q.part_number === 1);
      const task2Question = questions.find(q => q.part_number === 2);
      
      if (task1Question) {
        setTask1({
          id: task1Question.id,
          title: task1Question.question_text || "",
          instructions: task1Question.passage_text || "",
          imageUrl: task1Question.image_url || "",
          imageContext: task1Question.explanation || ""
        });
      }
      
      if (task2Question) {
        // For Task 2, ensure we use the correct field mapping
        let taskTitle = "";
        let taskInstructions = "";

        // If question_text contains the actual essay prompt, use it as title
        if (task2Question.question_text && !task2Question.question_text.toLowerCase().includes('paragraph')) {
          taskTitle = task2Question.question_text;
          taskInstructions = task2Question.passage_text || "";
        } else if (task2Question.passage_text) {
          // Extract the main question from passage_text
          const lines = task2Question.passage_text.split('\n').filter(line => line.trim());
          // Find the actual question (usually starts with common essay prompts)
          const questionLine = lines.find(line => 
            line.includes('To what extent') || 
            line.includes('Do you agree') || 
            line.includes('Discuss both') || 
            line.includes('What is your opinion') || 
            line.includes('Some people') || 
            line.includes('Many people') || 
            line.length > 50 // Essay questions are typically longer
          );
          
          if (questionLine) {
            taskTitle = questionLine;
            // Use remaining text as instructions, or use explanation field
            taskInstructions = task2Question.explanation || lines.filter(line => line !== questionLine).join('\n');
          } else {
            // Fallback: use first substantial line as title
            taskTitle = lines[0] || task2Question.question_text || "Essay Writing Task";
            taskInstructions = lines.slice(1).join('\n') || task2Question.explanation || "";
          }
        }
        
        setTask2({
          id: task2Question.id,
          title: taskTitle,
          instructions: taskInstructions
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
- Instructions: "${currentTaskData.instructions.substring(0, 500)}${currentTaskData.instructions.length > 500 ? '...' : ''}"`;
      
      if (currentTask === 1 && currentTaskData.imageContext) {
        contextPrompt += `\n- Image Context: "${currentTaskData.imageContext}"`;
      }

      // Add task type context to help AI understand what the student should focus on
      if (currentTask === 1) {
        contextPrompt += `\n- Task Type: Data Description (charts, graphs, tables, diagrams)`;
      } else {
        contextPrompt += `\n- Task Type: Essay Writing (present arguments, opinions with examples)`;
      }

      // Add current writing progress if available
      const currentAnswer = getCurrentAnswer();
      if (currentAnswer.trim()) {
        contextPrompt += `\n\n**Current Writing Progress:** (${getWordCount(currentAnswer)} words)\n"${currentAnswer.substring(0, 200)}${currentAnswer.length > 200 ? '...' : ''}"`;
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

  if (!test || !task1 || !task2) {
    return (
      <StudentLayout title="IELTS Writing Test" showBackButton>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-sm text-muted-foreground">Loading IELTS Writing test...</p>
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
        <div className="rounded-2xl border border-light-border p-4" style={{ background: 'var(--gradient-card)' }}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-heading-2 mb-1 text-foreground">{test.test_name}</h1>
              <p className="text-warm-gray">IELTS Academic Writing Test</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="rounded-xl">
                Go Back
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

        {/* Main Content Layout */}
        {currentTask === 1 && currentTaskData?.imageUrl ? (
          <ResizablePanelGroup direction="horizontal" className="gap-6 min-h-[600px]">
            <ResizablePanel defaultSize={55} minSize={40}>
              <Card className="glass-card rounded-3xl h-full">
                <CardHeader>
                  <CardTitle className="text-slate-950">Task 1 Visual</CardTitle>
                </CardHeader>
                <CardContent className="h-full">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm text-muted-foreground">Use controls to zoom and pan</div>
                    <div className="flex gap-2 items-center">
                      <Button variant="outline" size="sm" onClick={() => setZoomScale(s => Math.max(1, Number((s - 0.25).toFixed(2))))}>-</Button>
                      <div className="px-2 py-1 text-sm">{Math.round(zoomScale * 100)}%</div>
                      <Button variant="outline" size="sm" onClick={() => setZoomScale(s => Math.min(3, Number((s + 0.25).toFixed(2))))}>+</Button>
                      <Button variant="ghost" size="sm" onClick={() => setZoomScale(1)}>Reset</Button>
                    </div>
                  </div>
                  <div className="h-[500px] overflow-auto rounded-lg border border-border bg-background p-2">
                    <img 
                      src={currentTaskData.imageUrl} 
                      alt="Task 1 visual data" 
                      className="mx-auto" 
                      style={{ 
                        transform: `scale(${zoomScale})`, 
                        transformOrigin: 'center top' 
                      }} 
                    />
                  </div>
                </CardContent>
              </Card>
            </ResizablePanel>

            <ResizableHandle withHandle />

            <ResizablePanel defaultSize={45} minSize={35}>
              <Card className="glass-card rounded-3xl h-full">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-slate-950">Write your Task 1 answer (synced)</CardTitle>
                    <div className="text-xs text-muted-foreground">
                      Words: {getWordCount(task1Answer)} • Min: 150
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="h-full">
                  <Textarea 
                    value={task1Answer} 
                    onChange={e => setTask1Answer(e.target.value)} 
                    placeholder="Write here while viewing the larger image..." 
                    className="h-[450px] text-base leading-relaxed resize-none bg-background border-border text-foreground placeholder:text-muted-foreground" 
                  />
                  <div className="flex justify-between items-center mt-4">
                    <div className="text-sm">
                      {getWordCount(task1Answer) >= 150 ? (
                        <span className="text-green-400">✓ Word count requirement met</span>
                      ) : (
                        <span className="text-orange-400">
                          {150 - getWordCount(task1Answer)} more words needed
                        </span>
                      )}
                    </div>
                    <Button 
                      onClick={proceedToTask2} 
                      disabled={!task1Answer.trim()} 
                      className="glass-button hover:bg-white/20 border-white/30 text-slate-950"
                    >
                      Continue to Task 2
                    </Button>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">Changes here are synced with the main answer box.</div>
                </CardContent>
              </Card>
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          <Card className="glass-card rounded-3xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-slate-950">Your Answer - Task {currentTask}</CardTitle>
                <div className="flex items-center gap-4 text-sm text-white/80">
                  <span className="text-slate-950">Words: {getWordCount(currentAnswer)}</span>
                  <span className={getWordCount(currentAnswer) >= (currentTask === 1 ? 150 : 250) ? "text-green-400" : "text-orange-400"}>
                    Min: {currentTask === 1 ? '150' : '250'}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea 
                value={currentAnswer} 
                onChange={e => setCurrentAnswer(e.target.value)} 
                placeholder={`Write your Task ${currentTask} answer here...`} 
                className="min-h-[400px] text-base leading-relaxed resize-none bg-white/90 border-white/20 text-black placeholder:text-gray-500 focus:border-white/40" 
              />
              <div className="flex justify-between items-center mt-4">
                <div className="text-sm text-white/80">
                  {getWordCount(currentAnswer) >= (currentTask === 1 ? 150 : 250) ? (
                    <span className="text-green-400">✓ Word count requirement met</span>
                  ) : (
                    <span className="text-orange-400">
                      {(currentTask === 1 ? 150 : 250) - getWordCount(currentAnswer)} more words needed
                    </span>
                  )}
                </div>
                {currentTask === 2 && (
                  <Button 
                    onClick={submitTest} 
                    disabled={isSubmitting || !task1Answer.trim() || !task2Answer.trim()} 
                    className="bg-green-600/80 hover:bg-green-600 text-white border border-green-500/50 backdrop-blur-sm"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Submitting...
                      </>
                    ) : (
                      'Submit for Feedback'
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Floating Catbot in Bottom Right */}
        <div className="fixed bottom-6 right-6 z-50">
          {isCatbotOpen ? (
            <Card className="glass-card rounded-3xl w-96 h-[500px] animate-scale-in">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-3 text-slate-950">
                    <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <img src="/lovable-uploads/c1ab595f-8894-4f83-8bed-f87c5e7bb066.png" alt="Catbot" className="w-5 h-5 rounded-full" />
                    </div>
                    <div>
                      <div className="text-base font-semibold text-foreground">Catbot</div>
                      <div className="text-xs text-muted-foreground font-normal">Your AI Writing Tutor</div>
                    </div>
                  </CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setIsCatbotOpen(false)}
                    className="h-8 w-8 p-0"
                  >
                    ✕
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="h-full flex flex-col">
                <div className="flex-1 overflow-y-auto mb-4 space-y-3 rounded-lg p-4 border border-border bg-card">
                  {getCurrentChatMessages().map(message => (
                    <div key={message.id} className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`flex gap-3 max-w-[85%] ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div className={`px-3 py-2 rounded-xl text-sm ${message.type === 'user' ? 'bg-muted text-foreground border border-border' : 'bg-card text-foreground border border-border'}`}>
                          <div
                            dangerouslySetInnerHTML={{
                              __html: message.content
                                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                                .replace(/^• (.*)$/gm, '<li>$1</li>')
                                .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
                                .replace(/\n/g, '<br>')
                            }}
                            className="prose prose-sm max-w-none"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  {isChatLoading && (
                    <div className="flex gap-3 justify-start">
                      <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center mt-1">
                        <img src="/lovable-uploads/c1ab595f-8894-4f83-8bed-f87c5e7bb066.png" alt="Catbot" className="w-5 h-5 rounded-full" />
                      </div>
                      <div className="bg-muted border border-border px-3 py-2 rounded-xl text-sm">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <Button variant="outline" size="sm" onClick={() => handleSuggestionClick("Help with Writing Structure")} disabled={isChatLoading} className="text-xs h-8">
                    📝 Structure
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleSuggestionClick("Suggest Some Vocabulary")} disabled={isChatLoading} className="text-xs h-8">
                    📚 Vocabulary
                  </Button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && sendChatMessage()}
                    placeholder="Ask Catbot for writing help..."
                    className="flex-1 px-3 py-2 rounded-lg text-sm bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                    disabled={isChatLoading}
                  />
                  <Button onClick={() => sendChatMessage()} disabled={isChatLoading || !newMessage.trim()} size="sm">
                    Send
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Button
              onClick={() => setIsCatbotOpen(true)}
              size="lg"
              className="rounded-full w-16 h-16 shadow-xl bg-primary hover:bg-primary/90 text-white"
            >
              <img src="/lovable-uploads/c1ab595f-8894-4f83-8bed-f87c5e7bb066.png" alt="Catbot" className="w-8 h-8 rounded-full" />
            </Button>
          )}
        </div>
      </div>
    </StudentLayout>
  );
};

export default IELTSWritingTestInterface;