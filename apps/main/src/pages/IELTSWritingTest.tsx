import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import StudentLayout from "@/components/StudentLayout";
import { Bot, ListTree, Clock, FileText, PenTool, Palette, Send, CheckCircle2, Loader2, Info, HelpCircle, Sparkles, Copy, ArrowRight, Eye, EyeOff, BookOpen } from "lucide-react";
import { DraggableChatbot } from "@/components/DraggableChatbot";
import DotLottieLoadingAnimation from "@/components/animations/DotLottieLoadingAnimation";
import SpotlightCard from "@/components/SpotlightCard";
import { useThemeStyles } from '@/hooks/useThemeStyles';
import { useTheme } from '@/contexts/ThemeContext';
import { themes, ThemeName } from '@/lib/themes';
import { FEEDBACK_LANGUAGES } from '@/lib/constants/languages';
import { GrammarFeedbackDisplay } from '@/components/writing/GrammarFeedbackDisplay';
import { getWritingCardStyles, getTextareaStyles, getInstructionBoxStyles } from '@/lib/utils/writingTestStyles';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
} from "@/components/ui/conversation";
import { Message, MessageContent } from "@/components/ui/message";
import { Response } from "@/components/ui/response";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
    content: "Hi! I'm Catie, your IELTS Writing tutor 📝 I can see your Task 1 instructions above. Ask me anything specific about this task - like how to structure your response, what key features to highlight, or how to get started!",
    timestamp: new Date()
  }]);

  const [task2ChatMessages, setTask2ChatMessages] = useState<ChatMessage[]>([{
    id: '1',
    type: 'bot',
    content: "Hi! I'm Catie, your IELTS Writing tutor 📝 I can see your Task 2 essay topic above. Ask me about structuring your argument, developing your ideas for this specific topic, or how to present your opinion effectively!",
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
  const [selectedModel, setSelectedModel] = useState<string>("deepseek-v3.2");
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

  // Chat scroll anchor
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Grammar improve section (always visible below cards)
  const [beforeText, setBeforeText] = useState("");
  const [afterText, setAfterText] = useState("");
  const [isImproveSectionLoading, setIsImproveSectionLoading] = useState(false);

  // Answer improve section (enhances vocabulary, grammar, structure)
  const [answerBeforeText, setAnswerBeforeText] = useState("");
  const [answerAfterText, setAnswerAfterText] = useState("");
  const [isAnswerImproveSectionLoading, setIsAnswerImproveSectionLoading] = useState(false);

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
      // Optimized query - only select needed fields and use pagination
      const { data: tests, error: testsError } = await supabase
        .from('tests')
        .select('id, test_name, test_type, module, skill_category, test_subtype, created_at')
        .eq('test_type', 'IELTS')
        // Use ILIKE for case-insensitive matching to avoid needing a fallback query
        .or('module.ilike.Writing,skill_category.ilike.Writing,test_name.ilike.%Writing%')
        .order('created_at', { ascending: false })
        .limit(50);

      if (testsError) {
        throw testsError;
      }

      // Filter out any null or invalid tests
      const finalTests = (tests || []).filter((test: any) => {
        return test && test.id && (test.test_name || test.module || test.skill_category);
      });

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

  // Hardcoded Band 8 model answers for common IELTS Writing tasks
  // These use logical reasoning and general examples - NO fabricated research
  const getModelAnswer = (task: Task | null): string | null => {
    if (!task) return null;

    // If database has a model answer, use it
    if (task.modelAnswer) return task.modelAnswer;

    const instructions = task.instructions?.toLowerCase() || '';

    // Task 1 Model Answers
    if (currentTask === 1) {
      // Australian Telephone Calls (2001-2008 bar chart)
      // Data: Local 72→78→85→89→90→84→79→72, National 38→41→45→48→50→55→60→61, Mobile 2→5→7→9→12→23→39→46
      if (instructions.includes('telephone calls') || instructions.includes('telephone call')) {
        return `The bar chart illustrates the total number of minutes (in billions) spent on local, national/international, and mobile telephone calls in Australia over an eight-year period from 2001 to 2008.

Overall, local calls remained the most popular category throughout, despite some fluctuation. Meanwhile, both national/international and mobile calls showed consistent growth, with mobile usage experiencing the most dramatic increase.

Looking at local calls first, these started at 72 billion minutes in 2001 and rose steadily each year, peaking at 90 billion minutes in 2005. After this, usage declined year on year, returning to exactly 72 billion minutes by 2008. National and international calls began at 38 billion minutes and increased every year without exception, reaching 61 billion by the end of the period.

The most striking trend was in mobile phone usage. Starting from just 2 billion minutes in 2001, mobile calls grew slowly at first, reaching only 12 billion by 2005. However, growth then accelerated sharply, with figures jumping to 23 billion in 2006, 39 billion in 2007, and finally 46 billion minutes in 2008. By the final year, mobile usage had overtaken national/international calls and was approaching two-thirds of local call volume.`;
      }

      // Electrical Appliances and Housework (1920-2019 line chart)
      if (instructions.includes('electrical appliances') || instructions.includes('housework')) {
        return `The chart illustrates changes in the ownership of three electrical appliances and time spent on housework in households in one country between 1920 and 2019.

Overall, ownership of all three appliances increased dramatically over the century, while housework hours fell significantly. By 2019, washing machines and refrigerators had become almost universal.

Looking at appliance ownership, washing machines were found in approximately 40% of homes in 1920. This figure rose steadily, reaching almost 100% by the 1980s and remaining stable after that. Refrigerator ownership started much lower at around 5% but increased even more rapidly, achieving near-universal adoption by 1980. Vacuum cleaners followed a similar upward trend, climbing from about 30% to approximately 95% over the period.

The time spent on housework shows an inverse relationship with appliance ownership. In 1920, households devoted roughly 50 hours per week to domestic tasks. As electrical appliances became more common, this figure dropped sharply to about 20 hours by 1960. The decline continued more gradually after this point, reaching approximately 10 hours per week by 2019.`;
      }

      // Fallback for Task 1 - generic chart description guidance
      return null;
    }

    // Task 2 Model Answers - NO fabricated research, just logical reasoning
    if (currentTask === 2) {

      // Travelling question: "Today people are travelling more than ever before..."
      if (instructions.includes('travelling') || instructions.includes('travel')) {
        return `It is true that international travel has become increasingly common in recent decades. This essay will explore the reasons behind this trend and the benefits it brings to travellers.

Several factors explain why more people are travelling today than ever before. Firstly, air travel has become significantly more affordable. Budget airlines now offer flights for a fraction of what they cost thirty years ago, making destinations that were once only accessible to the wealthy now within reach of ordinary families. Secondly, rising incomes in developing countries, particularly in Asia, have created millions of new tourists who can now afford to explore the world. Finally, the internet has made it easier than ever to research destinations, compare prices, book accommodation, and navigate foreign countries without speaking the local language.

Travelling offers substantial benefits to individuals. Exposure to different cultures broadens perspectives and increases tolerance. Someone who has experienced life in another country is likely to be more understanding of different viewpoints and customs. Travel also provides educational experiences that cannot be replicated in classrooms—learning a language through immersion or understanding history by walking through ancient ruins is far more memorable than reading about them in textbooks. Furthermore, taking breaks from daily routines helps reduce stress and prevents burnout, leaving travellers feeling refreshed and more productive when they return.

In conclusion, cheaper transport, rising prosperity, and digital technology have made travel accessible to more people than ever, and the personal benefits of broadened horizons and improved wellbeing make it a worthwhile pursuit.`;
      }

      // Teenage years vs adult life happiness
      if (instructions.includes('teenage') || instructions.includes('adolescen') || (instructions.includes('adult') && instructions.includes('happi'))) {
        return `It is often argued that the most fulfilling stage of a person's life is during adolescence, while others believe that adulthood, despite responsibilities like work and family, brings more happiness. This essay agrees with the former view. It will first discuss how adults face pressures that reduce happiness, and then explain why teenagers are generally more carefree.

Upon reaching maturity, people are expected to fend for themselves, and this often leads to stress. Most adults have rent and bills to pay, as well as partners and children to support, which frequently forces them into jobs they don't particularly enjoy simply for the income. Many people would leave their current employment if they didn't have financial obligations like mortgages or school fees. The weight of responsibility for others clearly takes a significant toll on adult wellbeing, leaving little time for hobbies, friendships, or simply relaxing.

On the other hand, young people are largely free from these worries because they are supported financially and have fewer obligations. Most teenagers live with parents who cover all their basic needs, leaving them free to focus on friendships, hobbies, and studies. While teenagers often complain about school or restrictions from parents, they rarely appreciate the freedom they have from financial stress and major life decisions. It is only in hindsight, when burdened with adult responsibilities, that most people recognise how carefree their teenage years really were.

In conclusion, youth really is wasted on the young. While teenagers may not appreciate their freedom at the time, the pressures of adult responsibility—particularly around money and family obligations—make those carefree years the happiest in hindsight.`;
      }

      // University subjects / freedom of choice
      if (instructions.includes('university') && (instructions.includes('study') || instructions.includes('subject'))) {
        return `It is often argued that university students should be free to study any subject they wish, while others believe they should focus only on practical fields like science and technology. This essay agrees with the former view. It will first discuss why restricting choices can be counterproductive, and then explain the benefits of academic freedom.

Those who support restricting subject choices argue that education should prepare students for employment. It is true that graduates in engineering or computer science often find jobs more easily and earn higher starting salaries than those who studied arts or humanities. Governments invest heavily in higher education and naturally want graduates who can fill skills shortages in key industries. From this perspective, allowing students to study philosophy or ancient history may seem like a waste of resources.

However, limiting choices often backfires. Students forced into subjects they dislike tend to underperform, lose motivation, and drop out at higher rates. A student who is passionate about literature but pushed into engineering will likely struggle to compete with peers who genuinely love the subject. Furthermore, the skills developed through humanities—creativity, communication, and critical thinking—are increasingly valued by employers in all sectors. Many successful business leaders and entrepreneurs studied liberal arts, proving that there is no single path to career success.

In conclusion, while practical subjects have clear career benefits, forcing students into them is counterproductive. Universities should offer guidance rather than restrictions, allowing students to pursue their genuine interests and perform to their potential.`;
      }

      // Crime and punishment
      if (instructions.includes('crime') || instructions.includes('criminal') || instructions.includes('punish')) {
        return `It is often argued that criminals should face harsher punishments to deter crime, while others believe that education and rehabilitation are more effective. This essay agrees with the latter view. It will first acknowledge the arguments for tougher sentences, and then explain why rehabilitation produces better outcomes.

Supporters of harsher punishments argue that the fear of severe consequences deters potential offenders. Countries that impose strict penalties, including lengthy prison terms, often point to their relatively low crime rates as evidence that tough approaches work. Victims of crime also often feel that justice requires proportionate punishment—a burglar receiving only community service may seem unfair to someone whose home and sense of security were violated. There is certainly a moral argument that wrongdoing deserves consequences.

However, harsh punishment alone does not address why people commit crimes in the first place. Many offenders come from backgrounds of poverty, lack of education, or substance abuse. Simply locking them away teaches them nothing except how to become better criminals from other inmates. Countries that focus on rehabilitating prisoners through education, job training, and mental health support tend to see far fewer people returning to crime after release. Furthermore, keeping people in prison for longer is extremely expensive, draining taxpayer money that could be better spent on prevention.

In conclusion, while harsh punishments may satisfy a desire for justice, rehabilitation programmes produce better outcomes for society by addressing the root causes of crime and preparing offenders for productive lives after release.`;
      }

      // Technology and communication / social media
      if (instructions.includes('social media') || (instructions.includes('technology') && instructions.includes('communicat'))) {
        return `It is often argued that smartphones and social media have damaged young people's face-to-face communication skills, while others believe technology has simply changed how we interact. This essay agrees with the former view. It will first discuss how technology reduces opportunities for in-person practice, and then explain why this matters.

Those who defend technology point out that digital communication is still communication. Young people maintain many online friendships and develop skills in written expression and navigating complex social dynamics across platforms. Teenagers today are constantly messaging, commenting, and sharing, which suggests high levels of social engagement even if it looks different from previous generations.

However, in-person skills do appear to be declining. Many young people now feel uncomfortable making phone calls, attending interviews, or having extended conversations without checking their devices. The ability to read facial expressions, interpret body language, and respond spontaneously in conversation can only be developed through practice, and screens provide fewer opportunities for this. Many employers now complain that young graduates struggle with basic professional interactions like phone calls, meetings, and presentations. The convenience of texting means fewer young people develop the verbal communication skills that success in both career and personal relationships requires.

In conclusion, while technology offers new ways to connect, it cannot fully replace face-to-face interaction. Parents and schools should ensure children have regular opportunities to develop in-person communication skills alongside their digital abilities.`;
      }

      // Environment / individual responsibility  
      if (instructions.includes('environment') || (instructions.includes('protect') && instructions.includes('government'))) {
        return `It is often argued that individuals can do little to protect the environment and that governments and corporations must lead the way. This essay disagrees with this view. It will first acknowledge the scale of industrial pollution, and then explain why individual action still matters.

Those who dismiss individual responsibility make valid points about scale. The vast majority of global emissions come from large corporations, not households. One person recycling or taking shorter showers makes almost no measurable difference to climate change. Governments have the power to regulate industries, ban harmful products, and invest in renewable energy at a scale that individuals simply cannot match. Without systemic change led by those in power, individual actions may feel pointless.

However, individual action creates the conditions for systemic change. Consumer choices drive markets—when enough people demand sustainable products, companies respond by changing what they offer. The growth of organic food, electric cars, and plant-based meat all demonstrate that consumer demand can shift entire industries. Furthermore, people who make environmentally conscious choices in their own lives are more likely to support environmental policies and encourage others to do the same. Change has to start somewhere, and often it begins with individuals setting examples.

In conclusion, while governments and corporations must take the lead on major environmental challenges, individual action is neither pointless nor optional. Personal choices help build the public support and market demand that make systemic change possible.`;
      }

      // Default Task 2 - generic but well-structured
      return `This topic presents two contrasting viewpoints that deserve careful examination. This essay will discuss both perspectives before offering a personal opinion.

On one hand, there are valid arguments supporting the first view. Proponents point to practical considerations and everyday observations that support their position. In many countries, this approach has proven effective, and there are clear benefits in terms of efficiency and outcomes. It is understandable why many people hold this view, particularly those who prioritise immediate, tangible results.

On the other hand, the opposing perspective also has considerable merit. Those who hold this view emphasise longer-term consequences and broader considerations that extend beyond immediate practicality. They argue that focusing solely on short-term gains overlooks important factors that affect individuals and communities over time. There are numerous examples of societies that have adopted this alternative approach with positive results.

In my opinion, the most effective solution often lies in finding a balance between these two positions. Rather than viewing this as an either-or choice, we should recognise that different situations may require different approaches. What works in one context may not be appropriate in another, and flexibility is essential when dealing with complex issues that affect diverse groups of people.

In conclusion, while both views have valid arguments, a balanced approach that considers specific circumstances is most likely to succeed in practice.`;
    }

    return null;
  };

  const getCurrentAnswer = () => {
    return currentTask === 1 ? task1Answer : task2Answer;
  };

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

  const getTotalWordCount = () => {
    if (currentTask === 1) {
      return getWordCount(task1Answer);
    }
    return getWordCount(task2Answer);
  };

  const getMinWordCount = () => {
    return currentTask === 1 ? 150 : 250;
  };

  // Helper function to check if submit button should be disabled
  const isSubmitDisabled = () => {
    return isSubmitting ||
      ((task1Skipped || !task1Answer.trim()) && (task2Skipped || !task2Answer.trim())) ||
      (!task1Skipped && task1Answer.trim() && getWordCount(task1Answer) < 150) ||
      (!task2Skipped && task2Answer.trim() && getWordCount(task2Answer) < 250) ||
      (!task1Skipped && !task1Answer.trim()) ||
      (!task2Skipped && !task2Answer.trim());
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
        // Scroll to the improve section
        const improveSection = document.querySelector('[data-improve-section]');
        if (improveSection) {
          improveSection.scrollIntoView({ behavior: 'smooth' });
        }

        if (currentTask === 1) {
          setTask1GrammarFeedback(data.feedback);
          setTask1GrammarImproved(data.improved || null);
        } else {
          setTask2GrammarFeedback(data.feedback);
          setTask2GrammarImproved(data.improved || null);
        }

        toast({
          title: "Grammar feedback ready",
          description: "Use the section below to improve your writing.",
        });
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

  const handleImprove = async () => {
    // Scroll to the improve section
    const improveSection = document.querySelector('[data-improve-section]');
    if (improveSection) {
      improveSection.scrollIntoView({ behavior: 'smooth' });
    }
    setAfterText(""); // Clear after text
  };

  // Handle improve from the bottom section
  const handleImproveFromSection = async () => {
    if (!beforeText || beforeText.trim().length < 10) {
      toast({
        title: "Insufficient content",
        description: "Please paste at least 10 characters in the 'Before' box.",
        variant: "destructive"
      });
      return;
    }

    setIsImproveSectionLoading(true);

    try {
      const currentTaskData = getCurrentTask();
      console.log('✨ Requesting improvement for pasted text');

      const { data, error } = await supabase.functions.invoke('grammar-feedback', {
        body: {
          writing: beforeText,
          taskType: currentTask === 1 ? 'Task 1 - Data Description' : 'Task 2 - Essay Writing',
          taskNumber: currentTask,
          targetLanguage: feedbackLanguage !== "en" ? feedbackLanguage : undefined,
          taskInstructions: currentTaskData?.instructions || '',
          mode: 'improve'
        }
      });

      if (error) {
        console.error('❌ Improvement error:', error);
        throw error;
      }

      if (!data) {
        throw new Error('No response data received from improvement service');
      }

      if (data.success && data.improved) {
        setAfterText(data.improved);
        toast({
          title: "Improved! ✨",
          description: "Your improved text is ready in the 'After' box.",
        });
      } else {
        const errorMsg = data.error || data.details || 'Failed to improve writing';
        console.error('❌ Improvement failed:', errorMsg);
        throw new Error(errorMsg);
      }
    } catch (error: any) {
      console.error('❌ Improvement catch error:', error);

      let errorMessage = "Failed to improve writing. Please try again.";
      if (error?.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
        duration: 5000
      });
    } finally {
      setIsImproveSectionLoading(false);
    }
  };

  // Handle answer improve from the bottom section (full enhancement: vocab, grammar, structure)
  const handleAnswerImproveFromSection = async () => {
    if (!answerBeforeText || answerBeforeText.trim().length < 10) {
      toast({
        title: "Insufficient content",
        description: "Please paste at least 10 characters in the box.",
        variant: "destructive"
      });
      return;
    }

    setIsAnswerImproveSectionLoading(true);

    try {
      const currentTaskData = getCurrentTask();
      console.log('✨ Requesting full answer improvement for pasted text');

      const { data, error } = await supabase.functions.invoke('grammar-feedback', {
        body: {
          writing: answerBeforeText,
          taskType: currentTask === 1 ? 'Task 1 - Data Description' : 'Task 2 - Essay Writing',
          taskNumber: currentTask,
          targetLanguage: feedbackLanguage !== "en" ? feedbackLanguage : undefined,
          taskInstructions: currentTaskData?.instructions || '',
          mode: 'full-improve' // Full improvement: vocabulary, grammar, structure, coherence
        }
      });

      if (error) {
        console.error('❌ Answer improvement error:', error);
        throw error;
      }

      if (!data) {
        throw new Error('No response data received from improvement service');
      }

      if (data.success && data.improved) {
        setAnswerAfterText(data.improved);
        toast({
          title: "Answer Enhanced! ✨",
          description: "Your improved answer is ready.",
        });
      } else {
        const errorMsg = data.error || data.details || 'Failed to improve answer';
        console.error('❌ Answer improvement failed:', errorMsg);
        throw new Error(errorMsg);
      }
    } catch (error: any) {
      console.error('❌ Answer improvement catch error:', error);

      let errorMessage = "Failed to improve answer. Please try again.";
      if (error?.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
        duration: 5000
      });
    } finally {
      setIsAnswerImproveSectionLoading(false);
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
      const currentAnswer = getCurrentAnswer();

      // Send the student's question - the server will add task context from the other parameters
      const { data, error } = await supabase.functions.invoke('openai-chat', {
        body: {
          message: message,
          context: 'catbot',
          imageContext: currentTaskData.imageContext,
          taskType: currentTask === 1 ? 'Task 1 - Data Description (charts, graphs, tables, diagrams)' : 'Task 2 - Essay Writing (arguments, opinions, examples)',
          taskInstructions: currentTaskData.instructions,
          studentWriting: currentAnswer,
          skipCache: true // Don't cache task-specific responses
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

  // Auto-scroll chat to bottom when messages update or loading changes
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [task1ChatMessages, task2ChatMessages, isChatLoading, currentTask]);

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
                : `url('/1000031207.png')`,
              backgroundColor: themeStyles.backgroundImageColor
            }} />
          <div className="relative z-10">
            <StudentLayout title="Available Writing Tests" transparentBackground={true}>
              <div className="min-h-screen py-12">
                <div className="container mx-auto px-4">
                  <div className="max-w-4xl mx-auto">
                    <div className="mb-8">
                      <Button
                        variant="outline"
                        onClick={() => navigate('/ielts-portal')}
                        className="mb-4 transition-all duration-200 hover:shadow-md"
                        style={{
                          backgroundColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.5)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.1)' : themeStyles.cardBackground,
                          color: themeStyles.textPrimary,
                          borderColor: themeStyles.border
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = themeStyles.hoverBg;
                          e.currentTarget.style.color = themeStyles.buttonPrimary;
                          e.currentTarget.style.borderColor = themeStyles.buttonPrimary;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.5)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.1)' : themeStyles.cardBackground;
                          e.currentTarget.style.color = themeStyles.textPrimary;
                          e.currentTarget.style.borderColor = themeStyles.border;
                        }}
                      >
                        ← Back to IELTS Portal
                      </Button>
                      <h1
                        className="text-4xl font-bold mb-2 text-center"
                        style={{ color: themeStyles.textPrimary }}
                      >
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
            : `url('/1000031207.png')`,
          backgroundColor: themeStyles.backgroundImageColor
        }} />
      <div
        className="relative z-10 flex flex-col pb-24 sm:pb-6"
        style={{
          backgroundColor: themeStyles.theme.name === 'dark' ? themeStyles.theme.colors.background : 'transparent',
          minHeight: 'calc(100vh - 80px)'
        }}
      >
        <StudentLayout title="IELTS Writing Test" showBackButton transparentBackground={true}>
          <div className="flex-1 flex justify-center py-6 sm:py-6 pb-4">
            <div className="w-full max-w-6xl mx-auto space-y-4 px-4 sm:px-6 flex flex-col">
              {/* Control Panel - Docker Style */}
              <Card className="rounded-3xl mb-4 max-w-fit mx-auto px-4" style={{
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
                <CardContent className="p-2 sm:p-3">
                  <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
                    {/* Timer */}
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" style={{ color: themeStyles.textPrimary }} />
                      <span className="text-sm font-medium tabular-nums" style={{ color: themeStyles.textPrimary }}>
                        {formatTime(timeRemaining)}
                      </span>
                    </div>

                    {/* Task Selection Buttons */}
                    <Button
                      size="sm"
                      onClick={() => switchToTask(1)}
                      className="h-9 sm:h-8 px-4 sm:px-3 text-sm sm:text-sm font-medium min-w-[70px]"
                      style={{
                        backgroundColor: currentTask === 1 ? themeStyles.buttonPrimary : 'transparent',
                        color: currentTask === 1 ? '#ffffff' : themeStyles.textPrimary,
                        border: 'none'
                      }}
                    >
                      Task 1
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => switchToTask(2)}
                      className="h-9 sm:h-8 px-4 sm:px-3 text-sm sm:text-sm font-medium min-w-[70px]"
                      style={{
                        backgroundColor: currentTask === 2 ? themeStyles.buttonPrimary : 'transparent',
                        color: currentTask === 2 ? '#ffffff' : themeStyles.textPrimary,
                        border: 'none'
                      }}
                    >
                      Task 2
                    </Button>
                  </div>

                </CardContent>
              </Card>

              {/* Main Content Layout */}
              {currentTask === 1 ? (
                currentTaskData?.imageUrl ? (
                  <div className="flex flex-col lg:flex-row gap-4 flex-1" style={{ minHeight: '400px' }}>
                    <div className="flex-1 lg:flex-[0_0_50%] min-h-0">
                      <Card className="rounded-3xl h-full" style={{
                        backgroundColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.9)' : themeStyles.theme.name === 'dark' ? 'rgba(30, 41, 59, 0.95)' : themeStyles.theme.name === 'minimalist' ? '#ffffff' : themeStyles.theme.colors.cardBackground,
                        borderColor: themeStyles.border,
                        backdropFilter: themeStyles.theme.name === 'glassmorphism' ? 'blur(12px)' : themeStyles.theme.name === 'dark' ? 'blur(8px)' : 'none',
                        boxShadow: themeStyles.theme.name === 'dark'
                          ? '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)'
                          : themeStyles.theme.name === 'note'
                            ? themeStyles.theme.styles.cardStyle?.boxShadow
                            : '0 8px 32px rgba(15, 23, 42, 0.16), 0 0 0 1px rgba(148, 163, 253, 0.06)',
                        ...themeStyles.cardStyle,
                        display: 'flex',
                        flexDirection: 'column'
                      }}>
                        <CardContent className="p-4 flex-1 flex flex-col" style={{ minHeight: 0 }}>
                          {/* Task Instructions */}
                          <div className="mb-4">
                            {currentTaskData?.instructions && (
                              <div>
                                <div className="whitespace-pre-wrap leading-relaxed p-3 rounded-lg text-sm sm:text-base" style={{
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
                    </div>

                    <div className="flex-1 lg:flex-[0_0_50%] min-h-0">
                      <Card className="rounded-3xl h-full" style={{
                        backgroundColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.9)' : themeStyles.theme.name === 'dark' ? 'rgba(30, 41, 59, 0.95)' : themeStyles.theme.name === 'minimalist' ? '#ffffff' : themeStyles.theme.colors.cardBackground,
                        borderColor: themeStyles.border,
                        backdropFilter: themeStyles.theme.name === 'glassmorphism' ? 'blur(12px)' : themeStyles.theme.name === 'dark' ? 'blur(8px)' : 'none',
                        boxShadow: themeStyles.theme.name === 'dark'
                          ? '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)'
                          : themeStyles.theme.name === 'note'
                            ? themeStyles.theme.styles.cardStyle?.boxShadow
                            : '0 8px 32px rgba(15, 23, 42, 0.16), 0 0 0 1px rgba(148, 163, 253, 0.06)',
                        ...themeStyles.cardStyle,
                        display: 'flex',
                        flexDirection: 'column'
                      }}>
                        <CardContent className="flex-1 p-4 flex flex-col" style={{ minHeight: 0 }}>
                          <div className="flex-1 flex flex-col" style={{ minHeight: 0 }}>
                            <Textarea
                              value={getCurrentAnswer()}
                              onChange={e => setCurrentAnswer(e.target.value)}
                              className="flex-1 min-h-[300px] w-full text-base leading-relaxed resize-none rounded-2xl focus:outline-none focus:ring-0"
                              placeholder={
                                task1Skipped
                                  ? "Task 1 is skipped"
                                  : (test?.test_subtype === 'General' || selectedTrainingType === 'General')
                                    ? "Write your letter here..."
                                    : "Write your Task 1 response here..."
                              }
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
                          </div>

                          {/* Bottom Controls */}
                          <div className="flex items-center justify-between mt-4 pt-3 border-t flex-shrink-0" style={{ borderColor: themeStyles.border }}>
                            {/* Word Count */}
                            <div className="text-xs font-medium" style={{ color: themeStyles.textSecondary }}>
                              <span className={getTotalWordCount() < getMinWordCount() ? "text-red-500" : "text-green-600"}>{getTotalWordCount()}</span> / {getMinWordCount()}
                            </div>

                            <div className="flex items-center gap-3">
                              {/* Model Answer Button */}
                              {getModelAnswer(currentTaskData) && (
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 px-2 text-xs font-medium"
                                      style={{ color: themeStyles.textPrimary }}
                                    >
                                      <BookOpen className="w-4 h-4 mr-1" />
                                      Model Answer
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" style={{
                                    backgroundColor: themeStyles.cardBackground,
                                    color: themeStyles.textPrimary,
                                    borderColor: themeStyles.border
                                  }}>
                                    <DialogHeader>
                                      <DialogTitle className="flex items-center justify-between">
                                        <span>Model Answer</span>
                                        <span className="text-sm font-normal opacity-70">
                                          {getWordCount(getModelAnswer(currentTaskData) || '')} words
                                        </span>
                                      </DialogTitle>
                                    </DialogHeader>
                                    <div className="mt-4 whitespace-pre-wrap leading-relaxed text-base" style={{ fontFamily: 'Georgia, serif' }}>
                                      {getModelAnswer(currentTaskData)}
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              )}

                              {/* Skip Button */}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setTask1Skipped(!task1Skipped);
                                  // When skipping Task 1, switch to Task 2 but keep all written text
                                  if (!task1Skipped) {
                                    switchToTask(2);
                                  }
                                }}
                                className="h-7 px-2 text-xs font-medium hover:bg-transparent"
                                style={{
                                  backgroundColor: task1Skipped
                                    ? themeStyles.buttonPrimary
                                    : 'transparent',
                                  color: task1Skipped ? '#ffffff' : themeStyles.textPrimary,
                                  border: 'none',
                                  boxShadow: 'none'
                                }}
                              >
                                {task1Skipped ? 'Unskip' : 'Skip'}
                              </Button>

                              {/* Spell Check Toggle (like reveal question) */}
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-medium" style={{ color: themeStyles.textPrimary }}>Spell Check</span>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div
                                        onClick={() => setSpellCheckEnabled(!spellCheckEnabled)}
                                        className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none"
                                        style={{
                                          backgroundColor: spellCheckEnabled
                                            ? themeStyles.buttonPrimary
                                            : (themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.2)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.1)' : themeStyles.theme.name === 'minimalist' ? '#e5e7eb' : themeStyles.border)
                                        }}
                                        data-state={spellCheckEnabled ? "checked" : "unchecked"}
                                      >
                                        <div
                                          className="pointer-events-none flex h-4 w-4 rounded-full shadow-lg ring-0 transition-transform"
                                          style={{
                                            backgroundColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.95)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.9)' : themeStyles.theme.name === 'minimalist' ? '#ffffff' : themeStyles.theme.colors.cardBackground,
                                            transform: spellCheckEnabled ? 'translateX(16px)' : 'translateX(0px)'
                                          }}
                                        />
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>{spellCheckEnabled ? "Hide spell check" : "Show spell check"}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                ) : (
                  // Task 1 without image
                  <Card className="rounded-3xl max-w-3xl w-full mx-auto" style={{
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
                    <CardContent className="p-4 flex flex-col flex-1">
                      {currentTaskData?.instructions && (
                        <div className="mb-4">
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
                      <Textarea
                        value={getCurrentAnswer()}
                        onChange={e => setCurrentAnswer(e.target.value)}
                        placeholder={
                          task1Skipped
                            ? "Task 1 is skipped"
                            : (test?.test_subtype === 'General' || selectedTrainingType === 'General')
                              ? "Write your letter here..."
                              : "Write your Task 1 response here..."
                        }
                        className="flex-1 min-h-[500px] text-base leading-relaxed resize-none rounded-2xl focus:outline-none focus:ring-0"
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
                          opacity: task1Skipped ? 0.6 : 1,
                          height: '100%'
                        }}
                      />

                      {/* Bottom Controls */}
                      <div className="flex items-center justify-between mt-4 pt-3 border-t" style={{ borderColor: themeStyles.border }}>
                        {/* Word Count */}
                        <div className="text-xs font-medium" style={{ color: themeStyles.textSecondary }}>
                          <span className={getTotalWordCount() < getMinWordCount() ? "text-red-500" : "text-green-600"}>{getTotalWordCount()}</span> / {getMinWordCount()}
                        </div>

                        <div className="flex items-center gap-3">
                          {/* Model Answer Button */}
                          {getModelAnswer(currentTaskData) && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-xs font-medium"
                                  style={{ color: themeStyles.textPrimary }}
                                >
                                  <BookOpen className="w-4 h-4 mr-1" />
                                  Model Answer
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" style={{
                                backgroundColor: themeStyles.cardBackground,
                                color: themeStyles.textPrimary,
                                borderColor: themeStyles.border
                              }}>
                                <DialogHeader>
                                  <DialogTitle className="flex items-center justify-between">
                                    <span>Model Answer</span>
                                    <span className="text-sm font-normal opacity-70">
                                      {getWordCount(getModelAnswer(currentTaskData) || '')} words
                                    </span>
                                  </DialogTitle>
                                </DialogHeader>
                                <div className="mt-4 whitespace-pre-wrap leading-relaxed text-base" style={{ fontFamily: 'Georgia, serif' }}>
                                  {getModelAnswer(currentTaskData)}
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}

                          {/* Skip Button */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setTask1Skipped(!task1Skipped);
                              // When skipping Task 1, switch to Task 2 but keep all written text
                              if (!task1Skipped) {
                                switchToTask(2);
                              }
                            }}
                            className="h-7 px-2 text-xs font-medium hover:bg-transparent"
                            style={{
                              backgroundColor: task1Skipped
                                ? themeStyles.buttonPrimary
                                : 'transparent',
                              color: task1Skipped ? '#ffffff' : themeStyles.textPrimary,
                              border: 'none',
                              boxShadow: 'none'
                            }}
                          >
                            {task1Skipped ? 'Unskip' : 'Skip'}
                          </Button>

                          {/* Spell Check Toggle (like reveal question) */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-medium" style={{ color: themeStyles.textPrimary }}>Spell Check</span>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div
                                    onClick={() => setSpellCheckEnabled(!spellCheckEnabled)}
                                    className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none"
                                    style={{
                                      backgroundColor: spellCheckEnabled
                                        ? themeStyles.buttonPrimary
                                        : (themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.2)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.1)' : themeStyles.theme.name === 'minimalist' ? '#e5e7eb' : themeStyles.border)
                                    }}
                                    data-state={spellCheckEnabled ? "checked" : "unchecked"}
                                  >
                                    <div
                                      className="pointer-events-none flex h-4 w-4 rounded-full shadow-lg ring-0 transition-transform"
                                      style={{
                                        backgroundColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.95)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.9)' : themeStyles.theme.name === 'minimalist' ? '#ffffff' : themeStyles.theme.colors.cardBackground,
                                        transform: spellCheckEnabled ? 'translateX(16px)' : 'translateX(0px)'
                                      }}
                                    />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{spellCheckEnabled ? "Hide spell check" : "Show spell check"}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>

                          {/* Submit Button */}
                          <Button
                            onClick={submitTest}
                            disabled={isSubmitDisabled()}
                            variant="default"
                            className="h-7 px-3 text-xs"
                            style={{
                              backgroundColor: themeStyles.buttonPrimary,
                              color: '#ffffff'
                            }}
                          >
                            {isSubmitting ? "Submitting..." : "Submit Test"}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              ) : (
                // Task 2 - Essay Writing
                <Card className="rounded-3xl h-full max-w-3xl w-full mx-auto" style={{
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
                  <CardContent className="p-4 flex flex-col h-full">
                    {currentTaskData?.instructions && (
                      <div className="mb-4">
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
                    <Textarea
                      value={getCurrentAnswer()}
                      onChange={e => setCurrentAnswer(e.target.value)}
                      placeholder={
                        task2Skipped
                          ? "Task 2 is skipped"
                          : "Write your Task 2 essay here..."
                      }
                      className="flex-1 min-h-[500px] text-base leading-relaxed resize-none rounded-2xl focus:outline-none focus:ring-0"
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
                        opacity: task2Skipped ? 0.6 : 1,
                        height: '100%'
                      }}
                    />

                    {/* Controls Row */}
                    <div className="flex items-center justify-between mt-4 pt-3 border-t" style={{ borderColor: themeStyles.border }}>
                      {/* Word Count */}
                      <div className="text-xs font-medium" style={{ color: themeStyles.textSecondary }}>
                        <span className={getTotalWordCount() < getMinWordCount() ? "text-red-500" : "text-green-600"}>{getTotalWordCount()}</span> / {getMinWordCount()}
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Model Answer Button */}
                        {getModelAnswer(currentTaskData) && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs font-medium"
                                style={{ color: themeStyles.textPrimary }}
                              >
                                <BookOpen className="w-4 h-4 mr-1" />
                                Model Answer
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" style={{
                              backgroundColor: themeStyles.cardBackground,
                              color: themeStyles.textPrimary,
                              borderColor: themeStyles.border
                            }}>
                              <DialogHeader>
                                <DialogTitle className="flex items-center justify-between">
                                  <span>Model Answer</span>
                                  <span className="text-sm font-normal opacity-70">
                                    {getWordCount(getModelAnswer(currentTaskData) || '')} words
                                  </span>
                                </DialogTitle>
                              </DialogHeader>
                              <div className="mt-4 whitespace-pre-wrap leading-relaxed text-base" style={{ fontFamily: 'Georgia, serif' }}>
                                {getModelAnswer(currentTaskData)}
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}

                        {/* Skip Button */}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setTask2Skipped(!task2Skipped);
                            // When skipping Task 2, just mark as skipped but keep all written text
                          }}
                          className="h-7 px-2 text-xs font-medium hover:bg-transparent"
                          style={{
                            backgroundColor: task2Skipped
                              ? themeStyles.buttonPrimary
                              : 'transparent',
                            color: task2Skipped ? '#ffffff' : themeStyles.textPrimary,
                            border: 'none',
                            boxShadow: 'none'
                          }}
                        >
                          {task2Skipped ? 'Unskip' : 'Skip'}
                        </Button>

                        {/* Spell Check Toggle (like reveal question) */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium" style={{ color: themeStyles.textPrimary }}>Spell Check</span>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  onClick={() => setSpellCheckEnabled(!spellCheckEnabled)}
                                  className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none"
                                  style={{
                                    backgroundColor: spellCheckEnabled
                                      ? themeStyles.buttonPrimary
                                      : (themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.2)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.1)' : themeStyles.theme.name === 'minimalist' ? '#e5e7eb' : themeStyles.border)
                                  }}
                                  data-state={spellCheckEnabled ? "checked" : "unchecked"}
                                >
                                  <div
                                    className="pointer-events-none flex h-4 w-4 rounded-full shadow-lg ring-0 transition-transform"
                                    style={{
                                      backgroundColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.95)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.9)' : themeStyles.theme.name === 'minimalist' ? '#ffffff' : themeStyles.theme.colors.cardBackground,
                                      transform: spellCheckEnabled ? 'translateX(16px)' : 'translateX(0px)'
                                    }}
                                  />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{spellCheckEnabled ? "Hide spell check" : "Show spell check"}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>

                        {/* Language Selector */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium" style={{ color: themeStyles.textPrimary }}>Language</span>
                          <Select value={feedbackLanguage} onValueChange={setFeedbackLanguage}>
                            <SelectTrigger
                              className="w-[130px] h-7 text-xs rounded-lg px-2 border shadow-sm focus:ring-2 focus:ring-offset-0"
                              style={{
                                color: themeStyles.textPrimary,
                                backgroundColor: themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.1)' : themeStyles.theme.name === 'note' ? 'rgba(255,255,255,0.5)' : '#ffffff',
                                borderColor: themeStyles.border,
                                '--tw-ring-color': themeStyles.buttonPrimary
                              } as React.CSSProperties}
                            >
                              <SelectValue>
                                {(() => {
                                  const lang = FEEDBACK_LANGUAGES.find(l => l.value === feedbackLanguage);
                                  return lang ? `${lang.flag} ${lang.nativeName}` : 'Language';
                                })()}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent
                              className="max-h-80"
                              style={{
                                backgroundColor: themeStyles.theme.name === 'note' ? '#fffaf1' : themeStyles.theme.name === 'dark' ? '#1e293b' : '#ffffff',
                                borderColor: themeStyles.theme.name === 'note' ? '#e6cda4' : themeStyles.border,
                              }}
                            >
                              {FEEDBACK_LANGUAGES.map((lang) => (
                                <SelectItem
                                  key={lang.value}
                                  value={lang.value}
                                  className={themeStyles.theme.name === 'note' ? 'focus:bg-[#f5e6d3] focus:text-[#5c4a32] data-[state=checked]:bg-[#f5e6d3]' : ''}
                                  style={{
                                    color: themeStyles.textPrimary,
                                  }}
                                >
                                  <span className="flex items-center gap-2">
                                    <span>{lang.flag}</span>
                                    <span>{lang.nativeName}</span>
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Submit Test */}
                        <Button
                          onClick={submitTest}
                          disabled={isSubmitDisabled()}
                          variant="default"
                          className="h-7 px-3 text-xs"
                          style={{
                            backgroundColor: themeStyles.buttonPrimary,
                            color: '#ffffff'
                          }}
                        >
                          {isSubmitting ? "Submitting..." : "Submit Test"}
                        </Button>
                      </div>
                    </div>

                    {/* AI Model Selector below controls */}
                    <div className="mt-3 pt-2 border-t" style={{ borderColor: themeStyles.border }}>
                      <div className="flex items-center gap-3 flex-wrap">
                        <Label htmlFor="ai-model-selector" className="text-sm font-medium whitespace-nowrap" style={{ color: themeStyles.textPrimary }}>
                          AI Model:
                        </Label>
                        <Select value={selectedModel} onValueChange={setSelectedModel}>
                          <SelectTrigger
                            id="ai-model-selector"
                            className="w-[200px] h-9 text-sm border transition-colors rounded-lg"
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
                            <SelectItem value="deepseek-v3.2">DeepSeek V3.2</SelectItem>
                            <SelectItem value="gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* AI Writing Improver Section - Always visible below cards */}
              <div className="mt-6 max-w-3xl mx-auto w-full" data-improve-section>
                <div className="flex items-center gap-3">
                  {/* Left: Grammar Improve textarea */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold" style={{ color: themeStyles.theme.name === 'note' ? '#8b7355' : themeStyles.textSecondary }}>
                        Grammar Improve
                      </span>
                    </div>
                    <Textarea
                      value={beforeText}
                      onChange={(e) => setBeforeText(e.target.value)}
                      placeholder="Paste your text here to improve..."
                      className="min-h-[120px] text-sm leading-relaxed resize-none rounded-xl focus-visible:ring-0 focus:ring-0 focus-visible:outline-none"
                      style={{
                        backgroundColor: themeStyles.theme.name === 'note' ? '#fffaf1' : themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.5)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.05)' : themeStyles.theme.name === 'minimalist' ? '#f9fafb' : 'rgba(255,255,255,0.6)',
                        borderColor: themeStyles.theme.name === 'note' ? '#e6cda4' : themeStyles.border,
                        borderWidth: '1px',
                        borderStyle: 'solid',
                        color: themeStyles.textPrimary,
                        boxShadow: 'none',
                        outline: 'none'
                      }}
                    />
                  </div>

                  {/* Middle: Arrow button for improve */}
                  <div className="flex flex-col items-center justify-center pt-6">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={handleImproveFromSection}
                            disabled={isImproveSectionLoading || !beforeText.trim()}
                            className="px-2 py-1 transition-all hover:translate-x-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-x-0 focus:outline-none focus:ring-0"
                            style={{
                              backgroundColor: 'transparent',
                              color: themeStyles.theme.name === 'note' ? '#8b7355' : themeStyles.textPrimary,
                              border: 'none',
                              boxShadow: 'none',
                              outline: 'none'
                            }}
                          >
                            {isImproveSectionLoading ? (
                              <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                              <ArrowRight className="w-5 h-5" />
                            )}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Improve text</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>

                  {/* Right: Improved text textarea */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold invisible">Placeholder</span>
                      {afterText.trim() && (
                        <button
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(afterText);
                              toast({ title: "Copied", description: "Improved text copied to clipboard." });
                            } catch (e) {
                              toast({ title: "Copy failed", description: "Please copy manually.", variant: "destructive" });
                            }
                          }}
                          className="text-xs flex items-center gap-1 px-2 py-1 rounded-md transition-colors hover:bg-black/5"
                          style={{ color: themeStyles.theme.name === 'note' ? '#8b7355' : themeStyles.textSecondary }}
                        >
                          <Copy className="w-3 h-3" />
                          Copy
                        </button>
                      )}
                    </div>
                    <Textarea
                      value={afterText}
                      readOnly
                      placeholder="Improved text will appear here..."
                      className="min-h-[120px] text-sm leading-relaxed resize-none rounded-xl focus-visible:ring-0 focus:ring-0 focus-visible:outline-none"
                      style={{
                        backgroundColor: themeStyles.theme.name === 'note' ? '#fffaf1' : themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.5)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.05)' : themeStyles.theme.name === 'minimalist' ? '#f9fafb' : 'rgba(255,255,255,0.6)',
                        borderColor: themeStyles.theme.name === 'note' ? '#e6cda4' : themeStyles.border,
                        borderWidth: '1px',
                        borderStyle: 'solid',
                        color: themeStyles.textPrimary,
                        boxShadow: 'none',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Answer Improve Section - Full enhancement (vocab, grammar, structure) */}
              <div className="mt-4 max-w-3xl mx-auto w-full">
                <div className="flex items-center gap-3">
                  {/* Left: Answer Improve textarea */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold" style={{ color: themeStyles.theme.name === 'note' ? '#8b7355' : themeStyles.textSecondary }}>
                        Answer Improve
                      </span>
                    </div>
                    <Textarea
                      value={answerBeforeText}
                      onChange={(e) => setAnswerBeforeText(e.target.value)}
                      placeholder="Paste your answer here for full enhancement..."
                      className="min-h-[120px] text-sm leading-relaxed resize-none rounded-xl focus-visible:ring-0 focus:ring-0 focus-visible:outline-none"
                      style={{
                        backgroundColor: themeStyles.theme.name === 'note' ? '#fffaf1' : themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.5)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.05)' : themeStyles.theme.name === 'minimalist' ? '#f9fafb' : 'rgba(255,255,255,0.6)',
                        borderColor: themeStyles.theme.name === 'note' ? '#e6cda4' : themeStyles.border,
                        borderWidth: '1px',
                        borderStyle: 'solid',
                        color: themeStyles.textPrimary,
                        boxShadow: 'none',
                        outline: 'none'
                      }}
                    />
                  </div>

                  {/* Middle: Arrow button for answer improve */}
                  <div className="flex flex-col items-center justify-center pt-6">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={handleAnswerImproveFromSection}
                            disabled={isAnswerImproveSectionLoading || !answerBeforeText.trim()}
                            className="px-2 py-1 transition-all hover:translate-x-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-x-0 focus:outline-none focus:ring-0"
                            style={{
                              backgroundColor: 'transparent',
                              color: themeStyles.theme.name === 'note' ? '#8b7355' : themeStyles.textPrimary,
                              border: 'none',
                              boxShadow: 'none',
                              outline: 'none'
                            }}
                          >
                            {isAnswerImproveSectionLoading ? (
                              <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                              <ArrowRight className="w-5 h-5" />
                            )}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Enhance answer (vocab, grammar, structure)</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>

                  {/* Right: Improved answer textarea */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold invisible">Placeholder</span>
                      {answerAfterText.trim() && (
                        <button
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(answerAfterText);
                              toast({ title: "Copied", description: "Enhanced answer copied to clipboard." });
                            } catch (e) {
                              toast({ title: "Copy failed", description: "Please copy manually.", variant: "destructive" });
                            }
                          }}
                          className="text-xs flex items-center gap-1 px-2 py-1 rounded-md transition-colors hover:bg-black/5"
                          style={{ color: themeStyles.theme.name === 'note' ? '#8b7355' : themeStyles.textSecondary }}
                        >
                          <Copy className="w-3 h-3" />
                          Copy
                        </button>
                      )}
                    </div>
                    <Textarea
                      value={answerAfterText}
                      readOnly
                      placeholder="Enhanced answer will appear here..."
                      className="min-h-[120px] text-sm leading-relaxed resize-none rounded-xl focus-visible:ring-0 focus:ring-0 focus-visible:outline-none"
                      style={{
                        backgroundColor: themeStyles.theme.name === 'note' ? '#fffaf1' : themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.5)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.05)' : themeStyles.theme.name === 'minimalist' ? '#f9fafb' : 'rgba(255,255,255,0.6)',
                        borderColor: themeStyles.theme.name === 'note' ? '#e6cda4' : themeStyles.border,
                        borderWidth: '1px',
                        borderStyle: 'solid',
                        color: themeStyles.textPrimary,
                        boxShadow: 'none',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Grammar Feedback Section */}
              <div className="mt-6">
                {((currentTask === 1 && task1GrammarFeedback) || (currentTask === 2 && task2GrammarFeedback)) && (
                  <GrammarFeedbackDisplay
                    feedback={currentTask === 1 ? task1GrammarFeedback : task2GrammarFeedback}
                    improved={currentTask === 1 ? task1GrammarImproved : task2GrammarImproved}
                  />
                )}
              </div>

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
                    className={`backdrop-blur-md rounded-3xl w-[260px] h-[360px] sm:w-96 sm:h-[500px] shadow-2xl flex flex-col transform-gpu origin-bottom-right transition-all duration-260 ease-in-out ${showAIAssistantVisible
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
                                        src="/1000031289.png"
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
                                      src="/1000031289.png"
                                      alt="Catie"
                                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                  </div>
                                </Message>
                              )}
                              <div ref={chatBottomRef} />
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
                          <style dangerouslySetInnerHTML={{
                            __html: `
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
                      src="/1000031289.png"
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

      {/* Spell Check Styling */}
      {spellCheckEnabled && (
        <style>{`
          /* Prominent underline for spell check errors */
          textarea[spellcheck="true"]::spelling-error {
            text-decoration: wavy underline rgba(239, 68, 68, 0.8) 2px !important;
            text-decoration-skip-ink: none !important;
          }

          textarea[spellcheck="true"]:focus::spelling-error {
            text-decoration: wavy underline rgba(239, 68, 68, 0.9) 2px !important;
          }
        `}</style>
      )}
    </div>
  );
};

export default IELTSWritingTestInterface;