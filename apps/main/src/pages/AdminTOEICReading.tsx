import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Upload, 
  BookOpen, 
  Image as ImageIcon, 
  Sparkles, 
  Save, 
  Trash2, 
  CheckCircle,
  FileText,
  AlignLeft,
  Newspaper,
  Plus,
  Copy,
  Wand2,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  LayoutGrid,
  List,
  Check
} from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { ImageQuestionExtractor } from "@/components/ImageQuestionExtractor";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Question {
  id?: string;
  question_number: number;
  question_text: string;
  question_type: string;
  options: string[] | null;
  correct_answer: string;
  explanation: string;
  ai_explanation?: string;
  toeic_part: number;
  passage_context?: string;
  related_passage_id?: string;
}

interface Passage {
  id?: string;
  title?: string;
  content: string;
  type: 'single' | 'double' | 'triple';
  imageUrl?: string;
  questionStart: number;
  questionEnd: number;
}

interface PartData {
  questions: Question[];
  passages: Passage[];
  saved: boolean;
}

const TOEIC_READING_PARTS = [
  { 
    number: 5, 
    name: "Incomplete Sentences", 
    questions: 40, 
    description: "Choose the word or phrase that best completes the sentence",
    icon: AlignLeft,
    hasPassages: false
  },
  { 
    number: 6, 
    name: "Text Completion", 
    questions: 12, 
    description: "Complete passages with missing words or sentences",
    icon: FileText,
    hasPassages: true
  },
  { 
    number: 7, 
    name: "Reading Comprehension", 
    questions: 48, 
    description: "Read passages and answer questions about them",
    icon: Newspaper,
    hasPassages: true
  }
];

const AdminTOEICReading = () => {
  const navigate = useNavigate();
  const { testId } = useParams<{ testId: string }>();
  const { admin, loading: authLoading } = useAdminAuth();

  const [testName, setTestName] = useState("");
  const [activePart, setActivePart] = useState("5");
  const [activeInputMethod, setActiveInputMethod] = useState<'paste' | 'image' | 'answers'>('paste');
  const [saving, setSaving] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [generatingExplanations, setGeneratingExplanations] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [previewQuestionIndex, setPreviewQuestionIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [gridColumns, setGridColumns] = useState(2);

  // Text input states
  const [questionText, setQuestionText] = useState("");
  const [answerKeyText, setAnswerKeyText] = useState("");

  // Part data for each of the 3 reading parts
  const [partData, setPartData] = useState<{ [key: number]: PartData }>({
    5: { questions: [], passages: [], saved: false },
    6: { questions: [], passages: [], saved: false },
    7: { questions: [], passages: [], saved: false },
  });

  useEffect(() => {
    if (!authLoading && !admin) {
      navigate('/admin/login');
    }
  }, [admin, authLoading, navigate]);

  useEffect(() => {
    if (testId) {
      loadTestData();
    }
  }, [testId]);

  const loadTestData = async () => {
    if (!testId) return;

    try {
      // Load test info
      const { data: test, error: testError } = await supabase
        .from('tests')
        .select('*')
        .eq('id', testId)
        .single();

      if (testError) throw testError;
      setTestName(test.test_name);

      // Load questions
      const { data: questions, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('test_id', testId)
        .order('question_number_in_part', { ascending: true });

      if (questionsError) throw questionsError;

      // Load passages
      const { data: passages, error: passagesError } = await supabase
        .from('toeic_passages')
        .select('*')
        .eq('test_id', testId)
        .order('question_range_start', { ascending: true });

      // Group questions and passages by part
      const grouped: { [key: number]: PartData } = { 
        5: { questions: [], passages: [], saved: false },
        6: { questions: [], passages: [], saved: false },
        7: { questions: [], passages: [], saved: false }
      };

      questions?.forEach((q: any) => {
        const part = q.toeic_part || 5;
        if (grouped[part]) {
          grouped[part].questions.push({
            id: q.id,
            question_number: q.question_number_in_part,
            question_text: q.question_text,
            question_type: q.question_type,
            options: q.choices ? JSON.parse(q.choices) : null,
            correct_answer: q.correct_answer,
            explanation: q.explanation || '',
            ai_explanation: q.ai_explanation,
            toeic_part: part,
            passage_context: q.passage_context,
            related_passage_id: q.related_passage_id
          });
        }
      });

      passages?.forEach((p: any) => {
        const part = p.part_number;
        if (grouped[part]) {
          grouped[part].passages.push({
            id: p.id,
            title: p.passage_title,
            content: p.passage_content,
            type: p.passage_type,
            imageUrl: p.passage_image_url,
            questionStart: p.question_range_start,
            questionEnd: p.question_range_end
          });
        }
      });

      setPartData(grouped);
    } catch (error) {
      console.error('Error loading test data:', error);
      toast.error('Failed to load test data');
    }
  };

  // Systematic parser for TOEIC Part 5 questions (no AI needed)
  const parseQuestionTextSystematic = (part: number) => {
    if (!questionText.trim()) {
      toast.error('Please enter question text to parse');
      return;
    }

    setParsing(true);
    try {
      // Step 1: Clean up and normalize text
      let normalizedText = questionText
        .replace(/\r\n/g, '\n')
        .replace(/\n+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      // Step 2: Remove common garbage patterns (test metadata, page markers, etc.)
      const garbagePatterns = [
        /TEST\d+\([A-D]\)[^(]*/gi,  // TEST01(C) connect...
        /KOD ON:[^\n]*/gi,          // KOD ON:TO THE NEXT P
        /GO ON TO THE NEXT PAGE/gi,
        /NEXT PAGE/gi,
        /PAGE \d+/gi,
        /\bPART \d+\b(?!\.\s)/gi,   // PART 5 markers (but not "Part 5.")
      ];
      
      garbagePatterns.forEach(pattern => {
        normalizedText = normalizedText.replace(pattern, ' ');
      });
      normalizedText = normalizedText.replace(/\s+/g, ' ').trim();
      
      console.log('Normalized text:', normalizedText.substring(0, 300) + '...');
      
      const parsedQuestions: Question[] = [];
      
      // Step 3: Use regex to find all complete questions with all 4 options
      // Pattern: number. question_text (A) opt1 (B) opt2 (C) opt3 (D) opt4
      const questionPattern = /(\d{1,3})\.\s*([\s\S]*?)\s*\(A\)\s*([\s\S]*?)\s*\(B\)\s*([\s\S]*?)\s*\(C\)\s*([\s\S]*?)\s*\(D\)\s*([\s\S]*?)(?=\d{1,3}\.\s*[A-Z]|\d{1,3}\.\s*[a-z]|$)/g;
      
      let match;
      const rawMatches: Array<{num: number, qText: string, optA: string, optB: string, optC: string, optD: string, fullMatch: string}> = [];
      
      while ((match = questionPattern.exec(normalizedText)) !== null) {
        const [fullMatch, numStr, qText, optA, optB, optC, optD] = match;
        rawMatches.push({
          num: parseInt(numStr),
          qText: qText.trim(),
          optA: optA.trim(),
          optB: optB.trim(),
          optC: optC.trim(),
          optD: optD.trim(),
          fullMatch
        });
      }
      
      console.log('Found raw matches:', rawMatches.length);
      
      // Step 4: Process matches and fix continuation issues
      // Sometimes "108." appears in the middle of question 107's text, followed by options for 107
      for (let i = 0; i < rawMatches.length; i++) {
        const current = rawMatches[i];
        let { num, qText, optA, optB, optC, optD } = current;
        
        // Check if question text contains an errant question number (continuation issue)
        // e.g., "retirement was not well received 108. by most of the staff"
        // The "108." should be removed and text merged
        const errantNumPattern = /(\d{1,3})\.\s+/g;
        let errantMatch;
        let cleanedQText = qText;
        
        while ((errantMatch = errantNumPattern.exec(qText)) !== null) {
          const errantNum = parseInt(errantMatch[1]);
          // If this number is close to current question number (within 5), it's likely a continuation issue
          if (Math.abs(errantNum - num) <= 5 && errantNum !== num) {
            console.log(`Fixing continuation issue: removing "${errantMatch[0]}" from Q${num}`);
            cleanedQText = cleanedQText.replace(errantMatch[0], ' ');
          }
        }
        qText = cleanedQText.replace(/\s+/g, ' ').trim();
        
        // Step 5: Clean option D - remove any text that looks like start of next question or garbage
        // Option D should be a single word or short phrase
        const optDCleanPatterns = [
          /\s+\d{1,3}\.\s+.*/,           // Next question number starts
          /\s+[A-Z][a-z]+\s+[a-z]+\s+[a-z]+.*$/,  // Sentence starts (likely next question)
          /\s+TEST\d+.*/i,               // Test marker
          /\s+KOD\s+ON.*/i,              // KOD marker
        ];
        
        let cleanOptD = optD;
        // For Part 5 (incomplete sentences), option D should typically be a single word
        // Find where option D likely ends (before any long text that looks like a new sentence)
        const firstCapitalSentence = cleanOptD.match(/\s+([A-Z][a-z]+(?:\s+[a-z]+){3,})/);
        if (firstCapitalSentence && firstCapitalSentence.index !== undefined) {
          cleanOptD = cleanOptD.substring(0, firstCapitalSentence.index).trim();
        }
        
        // Also clean by common garbage patterns
        optDCleanPatterns.forEach(pattern => {
          cleanOptD = cleanOptD.replace(pattern, '');
        });
        cleanOptD = cleanOptD.trim();
        
        // If optD is still too long (>50 chars), it probably contains garbage
        if (cleanOptD.length > 50) {
          // Take only the first word or phrase before any suspicious content
          const words = cleanOptD.split(/\s+/);
          cleanOptD = words[0];
        }
        
        console.log(`Q${num}:`, { 
          qText: qText.substring(0, 50) + (qText.length > 50 ? '...' : ''), 
          optA, 
          optB, 
          optC, 
          optD: cleanOptD 
        });
        
        // Validate: question text should not be empty, options should be reasonable
        if (qText && qText.length > 5 && optA && optB && optC && cleanOptD) {
          parsedQuestions.push({
            question_number: num,
            question_text: qText,
            question_type: getDefaultQuestionType(part),
            options: [optA, optB, optC, cleanOptD],
            correct_answer: '',
            explanation: '',
            toeic_part: part
          });
        } else {
          console.log(`Q${num}: Invalid question, skipping`, { qText, optA, optB, optC, cleanOptD });
        }
      }
      
      // Step 6: Sort by question number and deduplicate
      parsedQuestions.sort((a, b) => a.question_number - b.question_number);
      const uniqueQuestions = parsedQuestions.filter((q, index, arr) => 
        index === 0 || q.question_number !== arr[index - 1].question_number
      );
      
      if (uniqueQuestions.length > 0) {
        setPartData(prev => ({
          ...prev,
          [part]: { 
            ...prev[part], 
            questions: [...prev[part].questions, ...uniqueQuestions],
            saved: false 
          }
        }));
        
        setQuestionText('');
        toast.success(`${uniqueQuestions.length} questions parsed successfully!`);
      } else {
        toast.error('No questions could be parsed. Check format: 101. question text (A) opt (B) opt (C) opt (D) opt');
      }
    } catch (error) {
      console.error('Error parsing questions:', error);
      toast.error('Failed to parse questions');
    } finally {
      setParsing(false);
    }
  };

  // Part 6 Text Completion Parser - handles passages with inline questions
  const parsePart6TextCompletion = (part: number) => {
    if (!questionText.trim()) {
      toast.error('Please enter passage text to parse');
      return;
    }

    setParsing(true);
    try {
      const text = questionText.trim();
      
      // Extract title if present (usually the first line in bold or standalone)
      const lines = text.split('\n');
      let title = '';
      let contentStartIndex = 0;
      
      // Check if first non-empty line looks like a title (short, no punctuation at end except period)
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line) {
          if (line.length < 100 && !line.match(/\d+\.\s*\(A\)/)) {
            title = line;
            contentStartIndex = i + 1;
          }
          break;
        }
      }
      
      // Get the full content
      const fullContent = lines.slice(contentStartIndex).join('\n');
      
      // Find all questions in the format: number. (A) option (B) option (C) option (D) option
      const questionRegex = /(\d{1,3})\.\s*\(A\)\s*([^\n(]+)\s*\(B\)\s*([^\n(]+)\s*\(C\)\s*([^\n(]+)\s*\(D\)\s*([^\n(]+)/g;
      
      const parsedQuestions: Question[] = [];
      let match;
      
      while ((match = questionRegex.exec(fullContent)) !== null) {
        const [fullMatch, numStr, optA, optB, optC, optD] = match;
        const questionNum = parseInt(numStr);
        
        // Find the context before this question (the sentence with the blank)
        const beforeQuestion = fullContent.substring(0, match.index);
        const lastSentences = beforeQuestion.split(/(?<=[.!?])\s+/).slice(-2).join(' ');
        
        // Look for the blank (--------) in the context
        const blankMatch = lastSentences.match(/[^.!?]*-{4,}[^.!?]*/);
        const questionContext = blankMatch ? blankMatch[0].trim() : lastSentences.trim();
        
        parsedQuestions.push({
          question_number: questionNum,
          question_text: questionContext || `Question ${questionNum}`,
          question_type: 'text_completion',
          options: [optA.trim(), optB.trim(), optC.trim(), optD.trim()],
          correct_answer: '',
          explanation: '',
          toeic_part: part,
          passage_context: fullContent // Store full passage for Part 6
        });
      }
      
      if (parsedQuestions.length > 0) {
        // Create a passage object
        const passage: Passage = {
          title: title,
          content: fullContent,
          type: 'single',
          questionStart: parsedQuestions[0].question_number,
          questionEnd: parsedQuestions[parsedQuestions.length - 1].question_number
        };
        
        setPartData(prev => ({
          ...prev,
          [part]: { 
            ...prev[part], 
            questions: [...prev[part].questions, ...parsedQuestions],
            passages: [...prev[part].passages, passage],
            saved: false 
          }
        }));
        
        setQuestionText('');
        toast.success(`Parsed passage with ${parsedQuestions.length} questions (${title || 'Untitled'})`);
      } else {
        toast.error('No questions found. Make sure format is: 147. (A) option (B) option (C) option (D) option');
      }
    } catch (error) {
      console.error('Error parsing Part 6:', error);
      toast.error('Failed to parse passage');
    } finally {
      setParsing(false);
    }
  };

  const parseQuestionText = async (part: number) => {
    if (!questionText.trim()) {
      toast.error('Please enter question text to parse');
      return;
    }

    setParsing(true);
    try {
      const { data, error } = await supabase.functions.invoke('toeic-parse-questions', {
        body: {
          text: questionText,
          part: part,
          testType: 'TOEIC Reading'
        }
      });

      if (error) throw error;

      if (data.questions && data.questions.length > 0) {
        const formattedQuestions: Question[] = data.questions.map((q: any) => ({
          question_number: q.question_number,
          question_text: q.question_text,
          question_type: q.question_type || getDefaultQuestionType(part),
          options: q.options,
          correct_answer: q.correct_answer || '',
          explanation: '',
          toeic_part: part,
          passage_context: q.passage_context
        }));

        setPartData(prev => ({
          ...prev,
          [part]: { 
            ...prev[part], 
            questions: [...prev[part].questions, ...formattedQuestions],
            passages: data.passages || prev[part].passages,
            saved: false 
          }
        }));

        setQuestionText('');
        toast.success(`${formattedQuestions.length} questions parsed successfully!`);
      } else {
        toast.error('No questions could be parsed from the text');
      }
    } catch (error) {
      console.error('Error parsing questions:', error);
      toast.error('Failed to parse questions');
    } finally {
      setParsing(false);
    }
  };

  const parseAnswerKey = async (part: number) => {
    if (!answerKeyText.trim()) {
      toast.error('Please enter answer key text');
      return;
    }

    setParsing(true);
    try {
      const { data, error } = await supabase.functions.invoke('toeic-parse-answers', {
        body: {
          text: answerKeyText,
          part: part
        }
      });

      if (error) throw error;

      if (data.answers) {
        // Update existing questions with answers
        const updatedQuestions = partData[part].questions.map(q => {
          const answer = data.answers.find((a: any) => a.question_number === q.question_number);
          return answer ? { ...q, correct_answer: answer.answer } : q;
        });

        setPartData(prev => ({
          ...prev,
          [part]: { ...prev[part], questions: updatedQuestions, saved: false }
        }));

        setAnswerKeyText('');
        toast.success(`${Object.keys(data.answers).length} answers matched!`);
      }
    } catch (error) {
      console.error('Error parsing answers:', error);
      toast.error('Failed to parse answer key');
    } finally {
      setParsing(false);
    }
  };

  const handleQuestionsExtracted = (part: number, questions: any[]) => {
    const formattedQuestions: Question[] = questions.map((q, index) => ({
      question_number: q.question_number || partData[part].questions.length + index + 1,
      question_text: q.question_text,
      question_type: q.question_type || getDefaultQuestionType(part),
      options: q.options,
      correct_answer: q.correct_answer || '',
      explanation: q.explanation || '',
      toeic_part: part,
      passage_context: q.passage_context
    }));

    setPartData(prev => ({
      ...prev,
      [part]: { 
        ...prev[part], 
        questions: [...prev[part].questions, ...formattedQuestions], 
        saved: false 
      }
    }));

    toast.success(`${questions.length} questions extracted for Part ${part}`);
  };

  const getDefaultQuestionType = (part: number): string => {
    switch (part) {
      case 5: return 'incomplete_sentence';
      case 6: return 'text_completion';
      case 7: return 'reading_comprehension';
      default: return 'multiple_choice';
    }
  };

  const savePartQuestions = async (part: number) => {
    if (!testId) return;
    
    setSaving(true);
    try {
      const questions = partData[part].questions;
      const passages = partData[part].passages;

      // Use edge function to bypass RLS (reusing save-reading-test with toeic mode)
      const { data, error } = await supabase.functions.invoke('save-reading-test', {
        body: {
          mode: 'toeic',
          testId,
          part,
          questions: questions.map((q, index) => ({
            question_number: q.question_number || index + 1,
            question_text: q.question_text,
            question_type: q.question_type,
            options: q.options,
            correct_answer: q.correct_answer,
            explanation: q.explanation,
            ai_explanation: q.ai_explanation,
            passage_context: q.passage_context,
            related_passage_id: q.related_passage_id
          })),
          passages: passages.map(p => ({
            type: p.type,
            title: p.title,
            content: p.content,
            imageUrl: p.imageUrl,
            questionStart: p.questionStart,
            questionEnd: p.questionEnd
          }))
        }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to save questions');

      setPartData(prev => ({
        ...prev,
        [part]: { ...prev[part], saved: true }
      }));

      toast.success(`Part ${part} saved successfully! (${data.questionsCount} questions)`);
    } catch (error) {
      console.error('Error saving questions:', error);
      toast.error('Failed to save questions');
    } finally {
      setSaving(false);
    }
  };

  const generateAIExplanations = async (part: number) => {
    setGeneratingExplanations(true);
    try {
      const questions = partData[part].questions;
      
      const { data, error } = await supabase.functions.invoke('toeic-generate-explanations', {
        body: {
          questions: questions.map(q => ({
            question_number: q.question_number,
            question_text: q.question_text,
            options: q.options,
            correct_answer: q.correct_answer,
            passage_context: q.passage_context,
            part: part
          })),
          testType: 'TOEIC Reading',
          part: part
        }
      });

      if (error) throw error;

      if (data.explanations) {
        const updatedQuestions = questions.map((q, index) => ({
          ...q,
          ai_explanation: data.explanations[index] || q.ai_explanation
        }));

        setPartData(prev => ({
          ...prev,
          [part]: { ...prev[part], questions: updatedQuestions, saved: false }
        }));

        toast.success('AI explanations generated!');
      }
    } catch (error) {
      console.error('Error generating explanations:', error);
      toast.error('Failed to generate AI explanations');
    } finally {
      setGeneratingExplanations(false);
    }
  };

  const updateQuestion = (part: number, index: number, field: keyof Question, value: any) => {
    setPartData(prev => {
      const questions = [...prev[part].questions];
      questions[index] = { ...questions[index], [field]: value };
      return {
        ...prev,
        [part]: { ...prev[part], questions, saved: false }
      };
    });
  };

  const deleteQuestion = (part: number, index: number) => {
    setPartData(prev => {
      const questions = prev[part].questions.filter((_, i) => i !== index);
      return {
        ...prev,
        [part]: { ...prev[part], questions, saved: false }
      };
    });
  };

  const addManualQuestion = (part: number) => {
    const newQuestionIndex = partData[part].questions.length;
    const newQuestion: Question = {
      question_number: newQuestionIndex + 1,
      question_text: '',
      question_type: getDefaultQuestionType(part),
      options: ['', '', '', ''],
      correct_answer: '',
      explanation: '',
      toeic_part: part
    };

    setPartData(prev => ({
      ...prev,
      [part]: { 
        ...prev[part], 
        questions: [...prev[part].questions, newQuestion], 
        saved: false 
      }
    }));

    // Automatically show the new question in preview mode
    setPreviewQuestionIndex(newQuestionIndex);
    setPreviewMode(true);
    
    toast.success(`Question ${newQuestionIndex + 1} added - ready to edit!`);
  };

  const getQuestionProgress = (part: number) => {
    const expected = TOEIC_READING_PARTS.find(p => p.number === part)?.questions || 0;
    const current = partData[part].questions.length;
    return { current, expected, percentage: expected > 0 ? (current / expected) * 100 : 0 };
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <AdminLayout title="TOEIC Reading Test" showBackButton={true} backPath="/admin/toeic">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#5D4E37]">{testName || 'TOEIC Reading Test'}</h1>
            <p className="text-[#8B6914]">
              Manage Parts 5-7 (100 questions total)
            </p>
          </div>
          <Badge variant="outline" className="bg-[#FEF9E7] text-[#8B6914] border-[#E8D5A3]">
            TOEIC Reading
          </Badge>
        </div>

        {/* Progress Overview */}
        <Card className="bg-[#FEF9E7] border-[#E8D5A3]">
          <CardHeader>
            <CardTitle className="text-lg text-[#5D4E37]">Question Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {TOEIC_READING_PARTS.map((part) => {
                const progress = getQuestionProgress(part.number);
                const PartIcon = part.icon;
                return (
                  <div key={part.number} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1 text-[#5D4E37]">
                        <PartIcon className="w-4 h-4 text-[#8B6914]" />
                        Part {part.number}
                      </span>
                      <span className="text-[#8B6914]">
                        {progress.current}/{progress.expected}
                      </span>
                    </div>
                    <Progress value={progress.percentage} className="h-2 bg-[#E8D5A3]" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Parts Tabs */}
        <Tabs value={activePart} onValueChange={setActivePart}>
          <TabsList className="grid grid-cols-3 w-full bg-[#E8D5A3]/20 border border-[#E8D5A3]">
            {TOEIC_READING_PARTS.map((part) => {
              const progress = getQuestionProgress(part.number);
              const PartIcon = part.icon;
              return (
                <TabsTrigger 
                  key={part.number} 
                  value={String(part.number)}
                  className="flex items-center gap-2 data-[state=active]:bg-[#FEF9E7] data-[state=active]:text-[#5D4E37] text-[#8B6914]"
                >
                  <PartIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">Part {part.number}</span>
                  <span className="sm:hidden">P{part.number}</span>
                  {progress.current === progress.expected && progress.expected > 0 && (
                    <CheckCircle className="w-3 h-3 text-green-500" />
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {TOEIC_READING_PARTS.map((part) => (
            <TabsContent key={part.number} value={String(part.number)} className="space-y-6">
              {/* Part Info */}
              <Card className="bg-[#FEF9E7] border-[#E8D5A3]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-[#5D4E37]">
                    <part.icon className="w-5 h-5 text-[#8B6914]" />
                    Part {part.number}: {part.name}
                  </CardTitle>
                  <CardDescription className="text-[#8B6914]">{part.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-[#8B6914]">
                    Expected questions: <span className="font-semibold text-[#5D4E37]">{part.questions}</span>
                  </p>
                </CardContent>
              </Card>

              {/* Input Method Tabs */}
              <Card className="bg-[#FEF9E7] border-[#E8D5A3]">
                <CardHeader>
                  <CardTitle className="text-lg text-[#5D4E37]">Add Questions</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs value={activeInputMethod} onValueChange={(v) => setActiveInputMethod(v as any)}>
                    <TabsList className="grid grid-cols-3 w-full mb-4 bg-[#E8D5A3]/20 border border-[#E8D5A3]">
                      <TabsTrigger value="paste" className="flex items-center gap-2 data-[state=active]:bg-[#FEF9E7] data-[state=active]:text-[#5D4E37] text-[#8B6914]">
                        <Copy className="w-4 h-4" />
                        Paste Text
                      </TabsTrigger>
                      <TabsTrigger value="image" className="flex items-center gap-2 data-[state=active]:bg-[#FEF9E7] data-[state=active]:text-[#5D4E37] text-[#8B6914]">
                        <ImageIcon className="w-4 h-4" />
                        Upload Image
                      </TabsTrigger>
                      <TabsTrigger value="answers" className="flex items-center gap-2 data-[state=active]:bg-[#FEF9E7] data-[state=active]:text-[#5D4E37] text-[#8B6914]">
                        <FileText className="w-4 h-4" />
                        Answer Key
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="paste" className="space-y-4">
                      <div>
                        <Label className="text-[#5D4E37]">
                          {part.number === 6 ? 'Paste Full Passage with Questions' : 'Paste TOEIC Questions'}
                        </Label>
                        <p className="text-sm text-[#8B6914] mb-2">
                          {part.number === 6 
                            ? 'Paste the complete passage including title, text, and inline questions (147. (A)... format)'
                            : 'Paste questions in standard TOEIC format. Questions will be parsed automatically.'
                          }
                        </p>
                        <Textarea
                          value={questionText}
                          onChange={(e) => setQuestionText(e.target.value)}
                          placeholder={part.number === 6 
                            ? `Promoting Cycling in our City

An essential element of the transportation system in many of the cities around the world is cycling. The city of Buffalo recognizes this and has developed a 10-year plan to promote more cycling in our city.

The city's development plan includes the addition of more cycling -------- to our streets.
147. (A) admission
(B) entrance
(C) access
(D) pass

This, of course, is with the intention of encouraging greater cycling -------- by our citizens...
148. (A) participate
(B) participation
(C) participates
(D) participated`
                            : `101. ------- you want to receive additional
information regarding the services we
offer, please log onto our website.
(A) If
(B) For
(C) Despite
(D) Whether

102. Sandy Duncan was handpicked by the
general manager because of ------- experience.
(A) her
(B) hers
(C) herself
(D) she`}
                          rows={part.number === 6 ? 16 : 12}
                          className="font-mono text-sm bg-white border-[#E8D5A3] focus:border-[#8B6914] focus:ring-[#8B6914] text-[#5D4E37] placeholder:text-[#A68B5B]"
                        />
                      </div>
                      <Button 
                        onClick={() => part.number === 6 ? parsePart6TextCompletion(part.number) : parseQuestionTextSystematic(part.number)}
                        disabled={parsing || !questionText.trim()}
                        className="bg-[#A68B5B] hover:bg-[#8B6914] text-white"
                      >
                        <Wand2 className="w-4 h-4 mr-2" />
                        {parsing ? 'Parsing...' : part.number === 6 ? 'Parse Passage' : 'Parse Questions'}
                      </Button>
                    </TabsContent>

                    <TabsContent value="image">
                      <ImageQuestionExtractor
                        testId={testId || ''}
                        testType="TOEIC"
                        onQuestionsExtracted={(questions) => handleQuestionsExtracted(part.number, questions)}
                      />
                    </TabsContent>

                    <TabsContent value="answers" className="space-y-4">
                      <div>
                        <Label className="text-[#5D4E37]">Paste Answer Key</Label>
                        <p className="text-sm text-[#8B6914] mb-2">
                          Paste answer key in format: "101. (A) 102. (B) 103. (C)..."
                        </p>
                        <Textarea
                          value={answerKeyText}
                          onChange={(e) => setAnswerKeyText(e.target.value)}
                          placeholder="101. (A) 102. (A) 103. (C) 104. (C) 105. (D) 106. (A) 107. (D) 108. (B) 109. (A) 110. (B)
111. (A) 112. (C) 113. (A) 114. (D) 115. (B) 116. (A) 117. (A) 118. (C) 119. (A) 120. (C)"
                          rows={6}
                          className="font-mono text-sm bg-white/50 border-[#E8D5A3] focus:border-[#8B6914] focus:ring-[#8B6914]"
                        />
                      </div>
                      <Button 
                        onClick={() => parseAnswerKey(part.number)}
                        disabled={parsing || !answerKeyText.trim() || partData[part.number].questions.length === 0}
                        className="bg-[#A68B5B] hover:bg-[#8B6914] text-white"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        {parsing ? 'Matching...' : 'Match Answers'}
                      </Button>
                      {partData[part.number].questions.length === 0 && (
                        <p className="text-sm text-amber-600">
                          Add questions first before matching answer keys.
                        </p>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              {/* Questions List */}
              <Card className="bg-[#FEF9E7] border-[#E8D5A3]">
                <CardHeader>
                  <div className="flex flex-col gap-4">
                    {/* Title and Stats Row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <CardTitle className="text-[#5D4E37]">
                          Questions
                        </CardTitle>
                        {/* Question Stats */}
                        <div className="flex items-center gap-3">
                          <Badge className="bg-[#A68B5B] text-white">
                            {partData[part.number].questions.length} / {part.questions}
                          </Badge>
                          {partData[part.number].questions.filter(q => q.correct_answer).length > 0 && (
                            <Badge variant="outline" className="border-green-500 text-green-600 flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              {partData[part.number].questions.filter(q => q.correct_answer).length} answered
                            </Badge>
                          )}
                          {partData[part.number].questions.filter(q => !q.correct_answer).length > 0 && (
                            <Badge variant="outline" className="border-amber-500 text-amber-600 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              {partData[part.number].questions.filter(q => !q.correct_answer).length} missing answers
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {/* View Toggle */}
                      <div className="flex items-center gap-2">
                        <div className="flex items-center border border-[#E8D5A3] rounded-lg overflow-hidden">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setViewMode('list');
                              setPreviewMode(false);
                            }}
                            className={`rounded-none px-3 ${viewMode === 'list' && !previewMode ? 'bg-[#A68B5B] text-white' : 'text-[#5D4E37]'}`}
                            title="List View - Edit one question at a time"
                          >
                            <List className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setViewMode('grid');
                              setPreviewMode(false);
                            }}
                            className={`rounded-none px-3 ${viewMode === 'grid' && !previewMode ? 'bg-[#A68B5B] text-white' : 'text-[#5D4E37]'}`}
                            title="Grid View - See multiple questions"
                          >
                            <LayoutGrid className="w-4 h-4" />
                          </Button>
                        </div>
                        {viewMode === 'grid' && !previewMode && (
                          <Select value={String(gridColumns)} onValueChange={(v) => setGridColumns(Number(v))}>
                            <SelectTrigger className="w-24 h-8 bg-white border-[#E8D5A3] text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="2">2 columns</SelectItem>
                              <SelectItem value="3">3 columns</SelectItem>
                              <SelectItem value="4">4 columns</SelectItem>
                              <SelectItem value="6">6 columns</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                        {previewMode && (
                          <Badge variant="outline" className="border-blue-400 text-blue-600 bg-blue-50">
                            Preview Mode
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons Row */}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setPreviewMode(!previewMode);
                          setPreviewQuestionIndex(0);
                        }}
                        className={`border-[#E8D5A3] ${previewMode ? 'bg-[#A68B5B] text-white' : 'text-[#5D4E37]'} hover:bg-[#E8D5A3]/20`}
                        disabled={partData[part.number].questions.length === 0}
                      >
                        {previewMode ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
                        {previewMode ? 'Exit Preview' : 'Student Preview'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addManualQuestion(part.number)}
                        className="border-[#E8D5A3] text-[#5D4E37] hover:bg-[#E8D5A3]/20"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Question
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => generateAIExplanations(part.number)}
                        disabled={generatingExplanations || partData[part.number].questions.length === 0}
                        className="border-[#E8D5A3] text-[#5D4E37] hover:bg-[#E8D5A3]/20"
                      >
                        <Sparkles className="w-4 h-4 mr-1" />
                        {generatingExplanations ? 'Generating...' : 'AI Explanations'}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => savePartQuestions(part.number)}
                        disabled={saving || partData[part.number].saved || partData[part.number].questions.length === 0}
                        className="bg-[#A68B5B] hover:bg-[#8B6914] text-white"
                      >
                        <Save className="w-4 h-4 mr-1" />
                        {saving ? 'Saving...' : partData[part.number].saved ? 'Saved' : 'Save Questions'}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {partData[part.number].questions.length > 0 ? (
                    previewMode ? (
                      /* Student Preview Mode - With Admin Editing */
                      <div className="bg-gradient-to-br from-white to-[#FEF9E7]/30 rounded-2xl shadow-lg border border-[#E8D5A3]/60 overflow-hidden">
                        {/* Top Action Bar */}
                        <div className="bg-[#5D4E37] px-6 py-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {/* Previous Button */}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setPreviewQuestionIndex(Math.max(0, previewQuestionIndex - 1))}
                              disabled={previewQuestionIndex === 0}
                              className="text-white/80 hover:text-white hover:bg-white/20 disabled:opacity-30 w-8 h-8"
                            >
                              <ChevronLeft className="w-5 h-5" />
                            </Button>
                            
                            <Badge className="bg-[#A68B5B] text-white text-sm px-4 py-1.5 font-semibold">
                              Q{partData[part.number].questions[previewQuestionIndex]?.question_number || previewQuestionIndex + 1}
                            </Badge>
                            <span className="text-white/80 text-sm">
                              {previewQuestionIndex + 1} of {partData[part.number].questions.length}
                            </span>
                            
                            {/* Next Button */}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setPreviewQuestionIndex(Math.min(partData[part.number].questions.length - 1, previewQuestionIndex + 1))}
                              disabled={previewQuestionIndex >= partData[part.number].questions.length - 1}
                              className="text-white/80 hover:text-white hover:bg-white/20 disabled:opacity-30 w-8 h-8"
                            >
                              <ChevronRight className="w-5 h-5" />
                            </Button>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => addManualQuestion(part.number)}
                              className="text-white/80 hover:text-white hover:bg-white/10"
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Add
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => generateAIExplanations(part.number)}
                              disabled={generatingExplanations}
                              className="text-white/80 hover:text-white hover:bg-white/10"
                            >
                              <Sparkles className="w-4 h-4 mr-1" />
                              {generatingExplanations ? 'Generating...' : 'AI Explain'}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                deleteQuestion(part.number, previewQuestionIndex);
                                if (previewQuestionIndex >= partData[part.number].questions.length - 1) {
                                  setPreviewQuestionIndex(Math.max(0, previewQuestionIndex - 1));
                                }
                              }}
                              className="text-red-300 hover:text-red-100 hover:bg-red-500/20"
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </div>

                        {/* Main Content Area */}
                        <div className="p-8">
                          {part.number === 6 && partData[part.number].passages.length > 0 ? (
                            /* Part 6 - Document/Letter Style Preview */
                            <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-8 shadow-inner">
                              {/* Document Header */}
                              {(() => {
                                const currentQ = partData[part.number].questions[previewQuestionIndex];
                                const passage = partData[part.number].passages.find(p => 
                                  currentQ && currentQ.question_number >= p.questionStart && currentQ.question_number <= p.questionEnd
                                ) || partData[part.number].passages[0];
                                
                                if (!passage) return null;
                                
                                // Split passage content to insert questions inline
                                const passageContent = passage.content || currentQ?.passage_context || '';
                                
                                // Find all question positions and render passage with inline questions
                                const passageQuestions = partData[part.number].questions.filter(q => 
                                  q.question_number >= passage.questionStart && q.question_number <= passage.questionEnd
                                );
                                
                                return (
                                  <div className="font-serif">
                                    {/* Title */}
                                    {passage.title && (
                                      <h2 className="text-xl font-bold text-center text-[#5D4E37] mb-6 pb-4 border-b border-gray-200">
                                        {passage.title}
                                      </h2>
                                    )}
                                    
                                    {/* Passage Text with Inline Questions */}
                                    <div className="text-[#5D4E37] leading-relaxed space-y-4">
                                      {passageContent.split(/(\d{1,3}\.\s*\(A\)[\s\S]*?\(D\)[^\d]*)/g).map((segment, segIndex) => {
                                        // Check if this segment is a question block
                                        const questionMatch = segment.match(/^(\d{1,3})\.\s*\(A\)\s*([^\n(]+)\s*\(B\)\s*([^\n(]+)\s*\(C\)\s*([^\n(]+)\s*\(D\)\s*([^\d]*)/);
                                        
                                        if (questionMatch) {
                                          const [, qNum, optA, optB, optC, optD] = questionMatch;
                                          const qIndex = partData[part.number].questions.findIndex(q => q.question_number === parseInt(qNum));
                                          const question = partData[part.number].questions[qIndex];
                                          const isCurrentQuestion = qIndex === previewQuestionIndex;
                                          
                                          return (
                                            <div 
                                              key={segIndex} 
                                              className={`my-4 p-4 rounded-lg border-2 transition-all ${
                                                isCurrentQuestion 
                                                  ? 'border-[#A68B5B] bg-[#FEF9E7] shadow-md' 
                                                  : 'border-gray-200 bg-gray-50 hover:border-[#E8D5A3] cursor-pointer'
                                              }`}
                                              onClick={() => !isCurrentQuestion && setPreviewQuestionIndex(qIndex)}
                                            >
                                              <div className="flex items-center gap-2 mb-3">
                                                <Badge className={`${isCurrentQuestion ? 'bg-[#A68B5B]' : 'bg-gray-400'} text-white`}>
                                                  {qNum}.
                                                </Badge>
                                                {question?.correct_answer && (
                                                  <Badge className="bg-green-500 text-white text-xs">
                                                    Answer: {question.correct_answer}
                                                  </Badge>
                                                )}
                                              </div>
                                              <div className="grid grid-cols-2 gap-2">
                                                {['A', 'B', 'C', 'D'].map((letter, i) => {
                                                  const opts = [optA, optB, optC, optD];
                                                  const isCorrect = question?.correct_answer === letter;
                                                  return (
                                                    <button
                                                      key={letter}
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (qIndex >= 0) {
                                                          updateQuestion(part.number, qIndex, 'correct_answer', letter);
                                                        }
                                                      }}
                                                      className={`text-left p-2 rounded border transition-all ${
                                                        isCorrect
                                                          ? 'bg-green-100 border-green-400 text-green-800 font-medium'
                                                          : 'bg-white border-gray-200 hover:border-[#A68B5B] hover:bg-[#FEF9E7]'
                                                      }`}
                                                    >
                                                      <span className="font-bold mr-1">({letter})</span>
                                                      {opts[i]?.trim()}
                                                      {isCorrect && <CheckCircle className="inline w-4 h-4 ml-1 text-green-600" />}
                                                    </button>
                                                  );
                                                })}
                                              </div>
                                            </div>
                                          );
                                        } else {
                                          // Regular passage text
                                          return segment.trim() ? (
                                            <p key={segIndex} className="text-base">
                                              {segment.trim()}
                                            </p>
                                          ) : null;
                                        }
                                      })}
                                    </div>
                                    
                                    {/* Questions without answers warning */}
                                    {passageQuestions.filter(q => !q.correct_answer).length > 0 && (
                                      <div className="mt-6 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-amber-700">
                                        <AlertCircle className="w-4 h-4" />
                                        <span className="text-sm">
                                          {passageQuestions.filter(q => !q.correct_answer).length} question(s) missing answers - click option to set
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          ) : (
                            /* Part 5 & 7 - Standard Question Preview */
                            <>
                              {/* Question Text - Editable */}
                              <div className="mb-8">
                                <Label className="text-xs text-[#8B6914] mb-2 block uppercase tracking-wide">Question Text (click to edit)</Label>
                                <Textarea
                                  value={partData[part.number].questions[previewQuestionIndex]?.question_text || ''}
                                  onChange={(e) => updateQuestion(part.number, previewQuestionIndex, 'question_text', e.target.value)}
                                  className="text-xl text-[#5D4E37] leading-relaxed font-serif bg-transparent border-dashed border-[#E8D5A3] hover:border-[#A68B5B] focus:border-[#A68B5B] focus:ring-[#A68B5B] resize-none min-h-[100px]"
                                  placeholder="Enter question text..."
                                />
                              </div>
                              
                              {/* Options - Editable with Click to Set Answer */}
                              <div className="space-y-3 mb-6">
                                <Label className="text-xs text-[#8B6914] uppercase tracking-wide">Options (click letter to set as correct answer)</Label>
                                {(partData[part.number].questions[previewQuestionIndex]?.options || ['', '', '', '']).map((option, optIndex) => {
                                  const letter = String.fromCharCode(65 + optIndex);
                                  const isCorrect = partData[part.number].questions[previewQuestionIndex]?.correct_answer === letter;
                                  return (
                                    <div
                                      key={optIndex}
                                      className={`group flex items-center gap-3 p-3 rounded-xl border transition-all
                                        ${isCorrect 
                                          ? 'bg-green-50 border-green-300 shadow-sm' 
                                          : 'bg-white border-[#E8D5A3] hover:border-[#A68B5B]'
                                        }`}
                                    >
                                      <button
                                        onClick={() => updateQuestion(part.number, previewQuestionIndex, 'correct_answer', letter)}
                                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all shrink-0
                                          ${isCorrect 
                                            ? 'bg-green-500 text-white shadow-md scale-110' 
                                            : 'bg-[#FEF9E7] text-[#8B6914] hover:bg-[#A68B5B] hover:text-white border-2 border-[#E8D5A3] hover:border-[#A68B5B]'
                                          }`}
                                        title={isCorrect ? 'Correct answer' : 'Click to set as correct answer'}
                                      >
                                        {letter}
                                      </button>
                                      <Input
                                        value={option}
                                        onChange={(e) => {
                                          const newOptions = [...(partData[part.number].questions[previewQuestionIndex]?.options || ['', '', '', ''])];
                                          newOptions[optIndex] = e.target.value;
                                          updateQuestion(part.number, previewQuestionIndex, 'options', newOptions);
                                        }}
                                        className={`flex-1 border-0 bg-transparent text-base focus:ring-0 focus-visible:ring-0 ${isCorrect ? 'text-green-700 font-medium' : 'text-[#5D4E37]'}`}
                                        placeholder={`Option ${letter}...`}
                                      />
                                      {isCorrect && (
                                        <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                              
                              {/* Correct Answer Warning */}
                              {!partData[part.number].questions[previewQuestionIndex]?.correct_answer && (
                                <div className="flex items-center justify-center text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200 mb-6">
                                  <AlertCircle className="w-4 h-4 mr-2" />
                                  <span className="text-sm font-medium">Click a letter button above to set the correct answer</span>
                                </div>
                              )}

                              {/* AI Explanation Display */}
                              {partData[part.number].questions[previewQuestionIndex]?.ai_explanation && (
                                <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl mb-6">
                                  <Label className="text-xs text-blue-600 uppercase tracking-wide mb-2 block flex items-center gap-1">
                                    <Sparkles className="w-3 h-3" /> AI Explanation
                                  </Label>
                                  <p className="text-sm text-blue-800">{partData[part.number].questions[previewQuestionIndex]?.ai_explanation}</p>
                                </div>
                              )}
                            </>
                          )}
                        </div>

                        {/* Bottom Navigation */}
                        <div className="bg-[#FEF9E7] px-6 py-4 flex items-center justify-between border-t border-[#E8D5A3]">
                          <Button
                            variant="outline"
                            onClick={() => setPreviewQuestionIndex(Math.max(0, previewQuestionIndex - 1))}
                            disabled={previewQuestionIndex === 0}
                            className="border-[#A68B5B] text-[#5D4E37] hover:bg-[#A68B5B] hover:text-white disabled:opacity-40 px-6"
                          >
                            <ChevronLeft className="w-4 h-4 mr-2" />
                            Previous
                          </Button>
                          
                          {/* Quick Jump */}
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-[#8B6914]">Jump to:</span>
                            <Select 
                              value={String(previewQuestionIndex)} 
                              onValueChange={(v) => setPreviewQuestionIndex(Number(v))}
                            >
                              <SelectTrigger className="w-24 h-9 bg-white border-[#E8D5A3]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {partData[part.number].questions.map((q, i) => (
                                  <SelectItem key={i} value={String(i)}>
                                    Q{q.question_number} {q.correct_answer ? '✓' : '?'}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <Button
                            variant="outline"
                            onClick={() => setPreviewQuestionIndex(Math.min(partData[part.number].questions.length - 1, previewQuestionIndex + 1))}
                            disabled={previewQuestionIndex >= partData[part.number].questions.length - 1}
                            className="border-[#A68B5B] text-[#5D4E37] hover:bg-[#A68B5B] hover:text-white disabled:opacity-40 px-6"
                          >
                            Next
                            <ChevronRight className="w-4 h-4 ml-2" />
                          </Button>
                        </div>
                      </div>
                    ) : viewMode === 'grid' ? (
                      /* Grid View Mode - Compact cards showing multiple questions at once */
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm text-[#8B6914]">
                          <span>Showing {partData[part.number].questions.length} questions in {gridColumns}-column grid</span>
                          <span>Click any card to preview or edit</span>
                        </div>
                        <div 
                          className="grid gap-3 max-h-[600px] overflow-y-auto pr-2 pb-2"
                          style={{ gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))` }}
                        >
                          {partData[part.number].questions.map((question, index) => (
                            <Card 
                              key={index} 
                              className={`border bg-white hover:shadow-lg transition-all cursor-pointer hover:scale-[1.02] ${
                                question.correct_answer ? 'border-green-300 hover:border-green-400' : 'border-amber-300 hover:border-amber-400'
                              }`}
                              onClick={() => {
                                setPreviewQuestionIndex(index);
                                setPreviewMode(true);
                              }}
                            >
                              <CardContent className="p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <Badge 
                                    variant="outline" 
                                    className={`text-xs font-bold ${
                                      question.correct_answer 
                                        ? 'border-green-500 text-green-700 bg-green-50' 
                                        : 'border-amber-500 text-amber-700 bg-amber-50'
                                    }`}
                                  >
                                    Q{question.question_number}
                                  </Badge>
                                  <div className="flex items-center gap-1">
                                    {question.correct_answer ? (
                                      <Badge className="bg-green-500 text-white text-xs px-2 font-bold">
                                        {question.correct_answer}
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="border-amber-400 text-amber-600 text-xs px-2">
                                        No answer
                                      </Badge>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deleteQuestion(part.number, index);
                                      }}
                                    >
                                      <Trash2 className="w-3 h-3 text-red-400 hover:text-red-600" />
                                    </Button>
                                  </div>
                                </div>
                                <p className="text-xs text-[#5D4E37] line-clamp-3 mb-2 leading-relaxed">
                                  {question.question_text || 'No question text'}
                                </p>
                                {question.options && (
                                  <div className="grid grid-cols-2 gap-1">
                                    {question.options.map((opt, optIndex) => (
                                      <div 
                                        key={optIndex}
                                        className={`text-[10px] px-1.5 py-1 rounded flex items-center gap-1 ${
                                          question.correct_answer === String.fromCharCode(65 + optIndex)
                                            ? 'bg-green-100 text-green-800 font-medium border border-green-300'
                                            : 'bg-gray-50 text-gray-600 border border-gray-200'
                                        }`}
                                      >
                                        <span className="font-bold">{String.fromCharCode(65 + optIndex)}:</span>
                                        <span className="truncate">{opt}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    ) : (
                      /* List View Mode - Full edit mode */
                      <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                        {partData[part.number].questions.map((question, index) => (
                          <Card key={index} className="border border-[#E8D5A3] bg-white/50">
                            <CardContent className="pt-4">
                              <div className="flex items-start justify-between mb-3">
                                <Badge variant="outline" className="border-[#E8D5A3] text-[#5D4E37]">Q{question.question_number}</Badge>
                                <div className="flex items-center gap-2">
                                  {question.correct_answer && (
                                    <Badge variant="secondary" className="bg-green-100 text-green-700">
                                      Answer: {question.correct_answer}
                                    </Badge>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setPreviewQuestionIndex(index);
                                      setPreviewMode(true);
                                    }}
                                  >
                                    <Eye className="w-4 h-4 text-[#8B6914]" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deleteQuestion(part.number, index)}
                                  >
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                  </Button>
                                </div>
                              </div>

                              <div className="space-y-3">
                                {/* Passage context for Part 6 & 7 */}
                                {part.hasPassages && question.passage_context && (
                                  <div className="bg-[#FEF9E7] border border-[#E8D5A3] p-3 rounded-lg mb-3">
                                    <Label className="text-xs text-[#8B6914]">Passage Context</Label>
                                    <p className="text-sm mt-1 whitespace-pre-wrap text-[#5D4E37]">{question.passage_context}</p>
                                  </div>
                                )}

                                <div>
                                  <Label className="text-[#5D4E37]">Question Text</Label>
                                  <Textarea
                                    value={question.question_text}
                                    onChange={(e) => updateQuestion(part.number, index, 'question_text', e.target.value)}
                                    rows={2}
                                    className="bg-white border-[#E8D5A3] focus:border-[#8B6914] focus:ring-[#8B6914] text-[#5D4E37]"
                                  />
                                </div>

                                {question.options && (
                                  <div>
                                    <Label className="text-[#5D4E37]">Options</Label>
                                    <div className="grid grid-cols-2 gap-2 mt-1">
                                      {question.options.map((opt, optIndex) => (
                                        <div key={optIndex} className="flex items-center gap-2">
                                          <span className="text-sm font-medium w-6 text-[#5D4E37]">
                                            ({String.fromCharCode(65 + optIndex)})
                                          </span>
                                          <Input
                                            value={opt}
                                            onChange={(e) => {
                                              const newOptions = [...question.options!];
                                              newOptions[optIndex] = e.target.value;
                                              updateQuestion(part.number, index, 'options', newOptions);
                                            }}
                                            placeholder={`Option ${String.fromCharCode(65 + optIndex)}`}
                                            className="bg-white border-[#E8D5A3] focus:border-[#8B6914] focus:ring-[#8B6914] text-[#5D4E37]"
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label className="text-[#5D4E37]">Correct Answer</Label>
                                    <Select
                                      value={question.correct_answer}
                                      onValueChange={(value) => updateQuestion(part.number, index, 'correct_answer', value)}
                                    >
                                      <SelectTrigger className="bg-white border-[#E8D5A3] focus:border-[#8B6914] focus:ring-[#8B6914] text-[#5D4E37]">
                                        <SelectValue placeholder="Select answer" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="A">A</SelectItem>
                                        <SelectItem value="B">B</SelectItem>
                                        <SelectItem value="C">C</SelectItem>
                                        <SelectItem value="D">D</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label className="text-[#5D4E37]">Question Type</Label>
                                    <Input
                                      value={question.question_type}
                                      onChange={(e) => updateQuestion(part.number, index, 'question_type', e.target.value)}
                                      className="bg-white border-[#E8D5A3] focus:border-[#8B6914] focus:ring-[#8B6914] text-[#5D4E37]"
                                    />
                                  </div>
                                </div>

                                {question.ai_explanation && (
                                  <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg">
                                    <Label className="text-blue-700 dark:text-blue-400">AI Explanation</Label>
                                    <p className="text-sm mt-1">{question.ai_explanation}</p>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )
                  ) : (
                    <div className="text-center py-12 text-[#8B6914]">
                      <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No questions added yet.</p>
                      <p className="text-sm">Use the methods above to add questions.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminTOEICReading;

