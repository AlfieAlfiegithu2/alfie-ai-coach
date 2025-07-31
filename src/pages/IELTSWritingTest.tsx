import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PenTool, Clock, MessageCircle, ArrowRight, Send, User, Bot } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'bot',
      content: "Hi! I'm Catbot, your AI writing tutor. I'm here to help you with this IELTS Writing task. Feel free to ask me questions about the prompt, writing techniques, or anything else related to your essay!",
      timestamp: new Date()
    }
  ]);
  const [newMessage, setNewMessage] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

      // Load questions for this test
      const { data: questions, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('test_id', testId)
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
        setTask2({
          id: task2Question.id,
          title: task2Question.question_text || "",
          instructions: task2Question.passage_text || ""
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

  const sendChatMessage = async () => {
    if (!newMessage.trim() || isChatLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: newMessage.trim(),
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setNewMessage("");
    setIsChatLoading(true);

    try {
      const currentTaskData = getCurrentTask();
      if (!currentTaskData) throw new Error('No task data available');

      // Create context-specific prompt
      let context = `You are Catbot, an expert IELTS Writing tutor. The student is currently working on IELTS Writing Task ${currentTask}.

Task ${currentTask} Prompt: "${currentTaskData.title}"
Task ${currentTask} Instructions: "${currentTaskData.instructions}"`;

      if (currentTask === 1 && currentTaskData.imageContext) {
        context += `\nImage Description: "${currentTaskData.imageContext}"`;
      }

      context += `\n\nStudent's question: "${userMessage.content}"

Please provide helpful, specific guidance related to this IELTS Writing task. Keep your response concise but informative.`;

      const { data, error } = await supabase.functions.invoke('gemini-chat', {
        body: {
          message: context,
          context: 'ielts_writing_tutor'
        }
      });

      if (error) throw error;

      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: data.response,
        timestamp: new Date()
      };

      setChatMessages(prev => [...prev, botMessage]);
    } catch (error: any) {
      console.error('Error sending chat message:', error);
      toast({
        title: "Error",
        description: "Failed to get response from tutor",
        variant: "destructive"
      });
    } finally {
      setIsChatLoading(false);
    }
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
    setChatMessages([
      {
        id: Date.now().toString(),
        type: 'bot',
        content: "Great! Now let's move on to Task 2. This is an essay task where you need to present your opinion with clear arguments and examples. How can I help you with this task?",
        timestamp: new Date()
      }
    ]);
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
      // Create comprehensive context for AI examiner
      const examinerContext = `You are an official IELTS Writing examiner. Please evaluate these two writing tasks according to the official IELTS Writing criteria and provide detailed feedback.

TEST DETAILS:
Test: ${test?.test_name}

TASK 1:
Prompt: "${task1?.title}"
Instructions: "${task1?.instructions}"
${task1?.imageContext ? `Image Description: "${task1?.imageContext}"` : ''}

Student's Task 1 Answer:
"${task1Answer}"

TASK 2:
Prompt: "${task2?.title}"
Instructions: "${task2?.instructions}"

Student's Task 2 Answer:
"${task2Answer}"

Please provide:
1. Overall Writing Band Score (0-9)
2. Task 1 individual score and detailed feedback covering:
   - Task Achievement
   - Coherence and Cohesion
   - Lexical Resource
   - Grammatical Range and Accuracy
3. Task 2 individual score and detailed feedback covering:
   - Task Response
   - Coherence and Cohesion
   - Lexical Resource
   - Grammatical Range and Accuracy
4. Specific suggestions for improvement
5. Strengths identified in the writing

Format your response as a comprehensive IELTS Writing assessment report.`;

      const { data, error } = await supabase.functions.invoke('gemini-chat', {
        body: {
          message: examinerContext,
          context: 'ielts_examiner'
        }
      });

      if (error) throw error;

      // Navigate to results page with the feedback
      navigate('/ielts-writing-results', {
        state: {
          testName: test?.test_name,
          task1Answer,
          task2Answer,
          feedback: data.response,
          task1Data: task1,
          task2Data: task2
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading IELTS Writing test...</p>
        </div>
      </div>
    );
  }

  const currentTaskData = getCurrentTask();
  const currentAnswer = getCurrentAnswer();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-white border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{test.test_name}</h1>
              <p className="text-sm text-muted-foreground">IELTS Writing Test</p>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant={currentTask === 1 ? "default" : "secondary"}>
                Task 1
              </Badge>
              <Badge variant={currentTask === 2 ? "default" : "secondary"}>
                Task 2
              </Badge>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>60 minutes total</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Task Header */}
        <div className="mb-6">
          <h2 className="text-3xl font-bold mb-2">
            Task {currentTask} {currentTask === 1 ? "- Data Description" : "- Essay Writing"}
          </h2>
          <p className="text-muted-foreground">
            {currentTask === 1 
              ? "Describe the visual information in at least 150 words (suggested time: 20 minutes)"
              : "Write an essay of at least 250 words presenting your opinion (suggested time: 40 minutes)"
            }
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* Left Column - Task Content */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PenTool className="w-5 h-5" />
                  Task {currentTask} Prompt
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Title</h3>
                  <p className="text-sm">{currentTaskData?.title}</p>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="font-semibold mb-2">Instructions</h3>
                  <p className="text-sm whitespace-pre-wrap">{currentTaskData?.instructions}</p>
                </div>

                {currentTask === 1 && currentTaskData?.imageUrl && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-semibold mb-2">Visual Data</h3>
                      <img 
                        src={currentTaskData.imageUrl} 
                        alt="Task 1 visual data"
                        className="w-full rounded-lg border"
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Chatbot */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                Catbot - AI Writing Tutor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80 overflow-y-auto mb-4 space-y-3 border rounded-lg p-4 bg-muted/30">
                {chatMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex gap-3 max-w-[85%] ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className="flex-shrink-0">
                        {message.type === 'user' ? (
                          <User className="w-6 h-6 text-primary" />
                        ) : (
                          <Bot className="w-6 h-6 text-secondary" />
                        )}
                      </div>
                      <div
                        className={`px-3 py-2 rounded-lg text-sm ${
                          message.type === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-background border'
                        }`}
                      >
                        {message.content}
                      </div>
                    </div>
                  </div>
                ))}
                {isChatLoading && (
                  <div className="flex gap-3 justify-start">
                    <Bot className="w-6 h-6 text-secondary" />
                    <div className="bg-background border px-3 py-2 rounded-lg text-sm">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                  placeholder="Ask Catbot about this task..."
                  className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={isChatLoading}
                />
                <Button 
                  onClick={sendChatMessage}
                  disabled={isChatLoading || !newMessage.trim()}
                  size="sm"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Writing Area */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Your Answer - Task {currentTask}</CardTitle>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Word count: {getWordCount(currentAnswer)}</span>
                <span>
                  Minimum: {currentTask === 1 ? '150' : '250'} words
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Textarea
              value={currentAnswer}
              onChange={(e) => setCurrentAnswer(e.target.value)}
              placeholder={`Write your Task ${currentTask} answer here...`}
              className="min-h-[300px] text-base leading-relaxed"
            />
            
            <div className="flex justify-between items-center mt-6">
              <div className="text-sm text-muted-foreground">
                {currentTask === 1 
                  ? "Describe the data accurately and identify key trends"
                  : "Present clear arguments with relevant examples"
                }
              </div>
              
              {currentTask === 1 ? (
                <Button onClick={proceedToTask2} className="bg-primary hover:bg-primary/90">
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Proceed to Task 2
                </Button>
              ) : (
                <Button 
                  onClick={submitTest} 
                  disabled={isSubmitting}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <PenTool className="w-4 h-4 mr-2" />
                      Submit Test for Feedback
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default IELTSWritingTestInterface;