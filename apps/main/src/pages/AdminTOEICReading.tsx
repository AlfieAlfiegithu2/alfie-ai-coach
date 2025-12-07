import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

const TOEIC_PARTS_INFO: { [key: string]: { number: number; name: string; questions: number; description: string; questionRange: string; hasPassages: boolean } } = {
  'Part5': { 
    number: 5, 
    name: "Incomplete Sentences", 
    questions: 30, 
    questionRange: "101-130",
    description: "Choose the word or phrase that best completes the sentence",
    hasPassages: false
  },
  'Part6': { 
    number: 6, 
    name: "Text Completion", 
    questions: 16, 
    questionRange: "131-146",
    description: "Complete passages with missing words or sentences (4 passages × 4 questions)",
    hasPassages: true
  },
  'Part7': { 
    number: 7, 
    name: "Reading Comprehension", 
    questions: 54, 
    questionRange: "147-200",
    description: "Read passages and answer questions about them",
    hasPassages: true
  }
};

const AdminTOEICReading = () => {
  const navigate = useNavigate();
  const { testId } = useParams<{ testId: string }>();
  const { admin, loading: authLoading } = useAdminAuth();

  const [testName, setTestName] = useState("");
  const [testPart, setTestPart] = useState<string>("Part5"); // Part5, Part6, or Part7
  const [activeInputMethod, setActiveInputMethod] = useState<'paste' | 'image' | 'answers' | 'passage'>('paste');
  const [saving, setSaving] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [generatingExplanations, setGeneratingExplanations] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [previewQuestionIndex, setPreviewQuestionIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [gridColumns, setGridColumns] = useState(3);

  // Text input states
  const [questionText, setQuestionText] = useState("");
  const [answerKeyText, setAnswerKeyText] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  // Questions and passages for this test
  const [questions, setQuestions] = useState<Question[]>([]);
  const [passages, setPassages] = useState<Passage[]>([]);
  const [saved, setSaved] = useState(false);

  const partInfo = TOEIC_PARTS_INFO[testPart];

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
      
      // Set the part type from test_subtype
      if (test.test_subtype && ['Part5', 'Part6', 'Part7'].includes(test.test_subtype)) {
        setTestPart(test.test_subtype);
      }

      // Load questions
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('test_id', testId)
        .order('question_number_in_part', { ascending: true });

      if (questionsError) throw questionsError;

      const loadedQuestions: Question[] = (questionsData || []).map((q: any) => ({
        id: q.id,
        question_number: q.question_number_in_part,
        question_text: q.question_text,
        question_type: q.question_type,
        options: q.choices ? JSON.parse(q.choices) : null,
        correct_answer: q.correct_answer,
        explanation: q.explanation || '',
        ai_explanation: q.ai_explanation,
        toeic_part: q.toeic_part || 5,
        passage_context: q.passage_context,
        related_passage_id: q.related_passage_id
      }));

      setQuestions(loadedQuestions);

      // Load passages
      const { data: passagesData } = await supabase
        .from('toeic_passages')
        .select('*')
        .eq('test_id', testId)
        .order('question_range_start', { ascending: true });

      if (passagesData) {
        setPassages(passagesData.map((p: any) => ({
          id: p.id,
          title: p.passage_title,
          content: p.passage_content,
          type: p.passage_type,
          imageUrl: p.passage_image_url,
          questionStart: p.question_range_start,
          questionEnd: p.question_range_end
        })));
      }
    } catch (error) {
      console.error('Error loading test data:', error);
      toast.error('Failed to load test data');
    }
  };

  // Parse Part 5 questions - Improved to capture FULL question text
  const parseQuestionTextSystematic = () => {
    if (!questionText.trim()) {
      toast.error('Please enter question text to parse');
      return;
    }

    setParsing(true);
    try {
      const text = questionText.trim();
      const parsedQuestions: Question[] = [];
      
      // Pattern: Question number followed by text, then (A), (B), (C), (D) options
      // This regex captures everything from question number to the options
      const questionBlocks = text.split(/(?=\b1[0-4]\d\b\.)/);
      
      for (const block of questionBlocks) {
        const trimmedBlock = block.trim();
        if (!trimmedBlock) continue;
        
        // Match question number at start
        const numMatch = trimmedBlock.match(/^(\d{3})\.\s*/);
        if (!numMatch) continue;
        
        const questionNum = parseInt(numMatch[1]);
        const afterNum = trimmedBlock.slice(numMatch[0].length);
        
        // Find the options section - look for (A) followed by options
        const optionsMatch = afterNum.match(/\(A\)\s*([^(]+)\s*\(B\)\s*([^(]+)\s*\(C\)\s*([^(]+)\s*\(D\)\s*([^(]*?)(?=\d{3}\.|$)/s);
        
        if (!optionsMatch) {
          console.log(`Q${questionNum}: Could not find all options`);
          continue;
        }
        
        // Everything before (A) is the question text
        const optionAStart = afterNum.indexOf('(A)');
        const qText = afterNum.slice(0, optionAStart).replace(/\s+/g, ' ').trim();
        
        const [, optA, optB, optC, optD] = optionsMatch;
        
        // Clean up options - remove extra whitespace and any trailing question numbers
        const cleanOption = (opt: string) => {
          return opt.replace(/\s+/g, ' ').trim().replace(/\d{3}\.$/, '').trim();
        };
        
        if (qText) {
          parsedQuestions.push({
            question_number: questionNum,
            question_text: qText,
            question_type: 'incomplete_sentence',
            options: [cleanOption(optA), cleanOption(optB), cleanOption(optC), cleanOption(optD)],
            correct_answer: '',
            explanation: '',
            toeic_part: partInfo.number
          });
        }
      }
      
      if (parsedQuestions.length > 0) {
        setQuestions(prev => [...prev, ...parsedQuestions]);
        setSaved(false);
        setQuestionText('');
        toast.success(`${parsedQuestions.length} questions parsed successfully!`);
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

  // Parse answer key
  const parseAnswerKey = () => {
    if (!answerKeyText.trim()) {
      toast.error('Please enter answer key text');
      return;
    }

    setParsing(true);
    try {
      // Match patterns like "101. (A)" or "101. A" or "101 A" or "101-A"
      const answerPattern = /(\d{3})[\.\s\-]*\(?([A-D])\)?/g;
      const answers: { [key: number]: string } = {};
      
      let match;
      while ((match = answerPattern.exec(answerKeyText)) !== null) {
        const qNum = parseInt(match[1]);
        const answer = match[2];
        answers[qNum] = answer;
      }
      
      const matchedCount = Object.keys(answers).length;
      
      if (matchedCount > 0) {
        setQuestions(prev => prev.map(q => {
          if (answers[q.question_number]) {
            return { ...q, correct_answer: answers[q.question_number] };
          }
          return q;
        }));
        
        setSaved(false);
        setAnswerKeyText('');
        toast.success(`${matchedCount} answers matched!`);
      } else {
        toast.error('No answers could be parsed. Format: 101. (A) 102. (B) ...');
      }
    } catch (error) {
      console.error('Error parsing answers:', error);
      toast.error('Failed to parse answer key');
    } finally {
      setParsing(false);
    }
  };

  // Handle image upload for passages (Part 6 & 7)
  const handlePassageImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        
        const newPassage: Passage = {
          title: '',
          content: '',
          type: 'single',
          imageUrl: base64,
          questionStart: passages.length > 0 
            ? passages[passages.length - 1].questionEnd + 1 
            : (testPart === 'Part6' ? 131 : 147),
          questionEnd: passages.length > 0 
            ? passages[passages.length - 1].questionEnd + 4 
            : (testPart === 'Part6' ? 134 : 150)
        };
        
        setPassages(prev => [...prev, newPassage]);
        setSaved(false);
        toast.success('Passage image uploaded! Set the question range and add questions.');
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  // Add manual question
  const addManualQuestion = () => {
    const startNum = testPart === 'Part5' ? 101 : (testPart === 'Part6' ? 131 : 147);
    const newQuestionNum = questions.length > 0 
      ? Math.max(...questions.map(q => q.question_number)) + 1 
      : startNum;
    
    const newQuestion: Question = {
      question_number: newQuestionNum,
      question_text: '',
      question_type: testPart === 'Part5' ? 'incomplete_sentence' : 'text_completion',
      options: ['', '', '', ''],
      correct_answer: '',
      explanation: '',
      toeic_part: partInfo.number
    };

    setQuestions(prev => [...prev, newQuestion]);
    setSaved(false);
    setPreviewQuestionIndex(questions.length);
    setPreviewMode(true);
    toast.success(`Question ${newQuestionNum} added - ready to edit!`);
  };

  // Update question
  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    setQuestions(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
    setSaved(false);
  };

  // Delete question
  const deleteQuestion = (index: number) => {
    setQuestions(prev => prev.filter((_, i) => i !== index));
    setSaved(false);
    if (previewQuestionIndex >= questions.length - 1) {
      setPreviewQuestionIndex(Math.max(0, previewQuestionIndex - 1));
    }
  };

  // Save questions
  const saveQuestions = async () => {
    if (!testId) return;
    
    setSaving(true);
    try {
      // Use edge function to bypass RLS
      const { data, error } = await supabase.functions.invoke('save-reading-test', {
        body: {
          mode: 'toeic',
          testId,
          part: partInfo.number,
          questions: questions.map((q, index) => ({
            question_number: q.question_number,
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

      setSaved(true);
      toast.success(`Saved ${data.questionsCount} questions!`);
    } catch (error) {
      console.error('Error saving questions:', error);
      toast.error('Failed to save questions');
    } finally {
      setSaving(false);
    }
  };

  // Generate AI explanations
  const generateAIExplanations = async () => {
    setGeneratingExplanations(true);
    try {
      const { data, error } = await supabase.functions.invoke('toeic-generate-explanations', {
        body: {
          questions: questions.map(q => ({
            question_number: q.question_number,
            question_text: q.question_text,
            options: q.options,
            correct_answer: q.correct_answer,
            passage_context: q.passage_context,
            part: partInfo.number
          })),
          testType: 'TOEIC Reading',
          part: partInfo.number
        }
      });

      if (error) throw error;

      if (data.explanations) {
        setQuestions(prev => prev.map((q, index) => ({
          ...q,
          ai_explanation: data.explanations[index] || q.ai_explanation
        })));
        setSaved(false);
        toast.success('AI explanations generated!');
      }
    } catch (error) {
      console.error('Error generating explanations:', error);
      toast.error('Failed to generate AI explanations');
    } finally {
      setGeneratingExplanations(false);
    }
  };

  // Get question progress
  const getQuestionProgress = () => {
    const expected = partInfo.questions;
    const current = questions.length;
    const answered = questions.filter(q => q.correct_answer).length;
    return { current, expected, answered, percentage: expected > 0 ? (current / expected) * 100 : 0 };
  };

  const progress = getQuestionProgress();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <AdminLayout title={`TOEIC ${partInfo.name}`} showBackButton={true} backPath="/admin/toeic">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#5D4E37]">{testName || `TOEIC ${partInfo.name}`}</h1>
            <p className="text-[#8B6914]">
              {partInfo.description} • Questions {partInfo.questionRange}
            </p>
          </div>
          <Badge variant="outline" className="bg-[#FEF9E7] text-[#8B6914] border-[#E8D5A3] text-lg px-4 py-2">
            Part {partInfo.number}
          </Badge>
        </div>

        {/* Progress Card */}
        <Card className="bg-[#FEF9E7] border-[#E8D5A3]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-4">
                <span className="text-[#5D4E37] font-medium">Questions Added:</span>
                <Badge className="bg-[#A68B5B] text-white text-lg px-3">
                  {progress.current} / {progress.expected}
                </Badge>
                {progress.answered > 0 && (
                  <Badge variant="outline" className="border-green-500 text-green-600">
                    <Check className="w-3 h-3 mr-1" />
                    {progress.answered} answered
                  </Badge>
                )}
                {progress.current > 0 && progress.current - progress.answered > 0 && (
                  <Badge variant="outline" className="border-amber-500 text-amber-600">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {progress.current - progress.answered} missing answers
                  </Badge>
                )}
              </div>
              <Button
                onClick={saveQuestions}
                disabled={saving || saved || questions.length === 0}
                className="bg-[#A68B5B] hover:bg-[#8B6914] text-white"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : saved ? 'Saved ✓' : 'Save All Questions'}
              </Button>
            </div>
            <Progress value={progress.percentage} className="h-3 bg-[#E8D5A3]" />
          </CardContent>
        </Card>

        {/* Input Section */}
        <Card className="bg-[#FEF9E7] border-[#E8D5A3]">
          <CardHeader>
            <CardTitle className="text-lg text-[#5D4E37]">Add Questions</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeInputMethod} onValueChange={(v) => setActiveInputMethod(v as any)}>
              <TabsList className={`grid w-full mb-4 bg-[#E8D5A3]/20 border border-[#E8D5A3] ${partInfo.hasPassages ? 'grid-cols-4' : 'grid-cols-3'}`}>
                {partInfo.hasPassages && (
                  <TabsTrigger value="passage" className="data-[state=active]:bg-[#FEF9E7] data-[state=active]:text-[#5D4E37] text-[#8B6914]">
                    <ImageIcon className="w-4 h-4 mr-2" />
                    Upload Passage
                  </TabsTrigger>
                )}
                <TabsTrigger value="paste" className="data-[state=active]:bg-[#FEF9E7] data-[state=active]:text-[#5D4E37] text-[#8B6914]">
                  <Copy className="w-4 h-4 mr-2" />
                  Paste Questions
                </TabsTrigger>
                <TabsTrigger value="image" className="data-[state=active]:bg-[#FEF9E7] data-[state=active]:text-[#5D4E37] text-[#8B6914]">
                  <Wand2 className="w-4 h-4 mr-2" />
                  Extract from Image
                </TabsTrigger>
                <TabsTrigger value="answers" className="data-[state=active]:bg-[#FEF9E7] data-[state=active]:text-[#5D4E37] text-[#8B6914]">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Answer Key
                </TabsTrigger>
              </TabsList>

              {/* Passage Upload Tab (Part 6 & 7 only) */}
              {partInfo.hasPassages && (
                <TabsContent value="passage" className="space-y-4">
                  <div>
                    <Label className="text-[#5D4E37]">Upload Passage Image</Label>
                    <p className="text-sm text-[#8B6914] mb-3">
                      Upload the passage image (letter, email, notice, etc.) - students will see this exact image
                    </p>
                    
                    {/* Existing Passages */}
                    {passages.length > 0 && (
                      <div className="mb-4 space-y-3">
                        {passages.map((passage, idx) => (
                          <div key={idx} className="border border-[#E8D5A3] rounded-lg p-3 bg-white">
                            <div className="flex items-center justify-between mb-2">
                              <Badge className="bg-[#A68B5B] text-white">
                                Passage {idx + 1}: Q{passage.questionStart}-{passage.questionEnd}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setPassages(prev => prev.filter((_, i) => i !== idx));
                                  setSaved(false);
                                }}
                                className="text-red-500 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                            {passage.imageUrl && (
                              <img src={passage.imageUrl} alt={`Passage ${idx + 1}`} className="max-h-40 rounded border" />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Upload Button */}
                    <label className="cursor-pointer inline-block">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePassageImageUpload}
                        disabled={uploadingImage}
                      />
                      <div className="flex items-center gap-2 px-4 py-2 bg-[#A68B5B] hover:bg-[#8B6914] text-white rounded-lg transition-colors">
                        <Upload className="w-4 h-4" />
                        {uploadingImage ? 'Uploading...' : 'Add Passage Image'}
                      </div>
                    </label>
                  </div>
                </TabsContent>
              )}

              {/* Paste Questions Tab */}
              <TabsContent value="paste" className="space-y-4">
                <div>
                  <Label className="text-[#5D4E37]">Paste TOEIC Questions</Label>
                  <p className="text-sm text-[#8B6914] mb-2">
                    Paste all questions with their options. Format: 101. question text (A) opt (B) opt (C) opt (D) opt
                  </p>
                  <Textarea
                    value={questionText}
                    onChange={(e) => setQuestionText(e.target.value)}
                    placeholder={`101. The new employee was asked to ------- all documents before submitting them to the supervisor.
(A) review
(B) reviews
(C) reviewing
(D) reviewed

102. Ms. Johnson's presentation was ------- received by the board members.
(A) favorable
(B) favorably
(C) favor
(D) favoring`}
                    rows={14}
                    className="font-mono text-sm bg-white border-[#E8D5A3] focus:border-[#8B6914] focus:ring-[#8B6914] text-[#5D4E37]"
                  />
                </div>
                <Button 
                  onClick={parseQuestionTextSystematic}
                  disabled={parsing || !questionText.trim()}
                  className="bg-[#A68B5B] hover:bg-[#8B6914] text-white"
                >
                  <Wand2 className="w-4 h-4 mr-2" />
                  {parsing ? 'Parsing...' : 'Parse Questions'}
                </Button>
              </TabsContent>

              {/* Extract from Image Tab */}
              <TabsContent value="image">
                <ImageQuestionExtractor
                  testId={testId || ''}
                  testType="TOEIC"
                  onQuestionsExtracted={(extractedQuestions) => {
                    const formatted: Question[] = extractedQuestions.map((q: any, index: number) => ({
                      question_number: q.question_number || (questions.length + index + 101),
                      question_text: q.question_text,
                      question_type: q.question_type || 'incomplete_sentence',
                      options: q.options,
                      correct_answer: q.correct_answer || '',
                      explanation: q.explanation || '',
                      toeic_part: partInfo.number,
                      passage_context: q.passage_context
                    }));
                    setQuestions(prev => [...prev, ...formatted]);
                    setSaved(false);
                    toast.success(`${formatted.length} questions extracted!`);
                  }}
                />
              </TabsContent>

              {/* Answer Key Tab */}
              <TabsContent value="answers" className="space-y-4">
                <div>
                  <Label className="text-[#5D4E37]">Paste Answer Key</Label>
                  <p className="text-sm text-[#8B6914] mb-2">
                    Paste answer key in format: "101. (A) 102. (B) 103. (C)..."
                  </p>
                  <Textarea
                    value={answerKeyText}
                    onChange={(e) => setAnswerKeyText(e.target.value)}
                    placeholder="101. (A) 102. (B) 103. (C) 104. (D) 105. (A) 106. (B) 107. (C) 108. (D) 109. (A) 110. (B)"
                    rows={6}
                    className="font-mono text-sm bg-white border-[#E8D5A3]"
                  />
                </div>
                <Button 
                  onClick={parseAnswerKey}
                  disabled={parsing || !answerKeyText.trim() || questions.length === 0}
                  className="bg-[#A68B5B] hover:bg-[#8B6914] text-white"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {parsing ? 'Matching...' : 'Match Answers'}
                </Button>
                {questions.length === 0 && (
                  <p className="text-sm text-amber-600">Add questions first before matching answers.</p>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Questions Section */}
        <Card className="bg-[#FEF9E7] border-[#E8D5A3]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <CardTitle className="text-[#5D4E37]">Questions</CardTitle>
                <Badge className="bg-[#A68B5B] text-white">{questions.length}</Badge>
              </div>
              <div className="flex items-center gap-2">
                {/* View Toggle */}
                <div className="flex items-center border border-[#E8D5A3] rounded-lg overflow-hidden">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setViewMode('list'); setPreviewMode(false); }}
                    className={`rounded-none px-3 ${viewMode === 'list' && !previewMode ? 'bg-[#A68B5B] text-white' : 'text-[#5D4E37]'}`}
                  >
                    <List className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setViewMode('grid'); setPreviewMode(false); }}
                    className={`rounded-none px-3 ${viewMode === 'grid' && !previewMode ? 'bg-[#A68B5B] text-white' : 'text-[#5D4E37]'}`}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </Button>
                </div>
                
                {viewMode === 'grid' && !previewMode && (
                  <Select value={String(gridColumns)} onValueChange={(v) => setGridColumns(Number(v))}>
                    <SelectTrigger className="w-24 h-8 bg-white border-[#E8D5A3]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">2 cols</SelectItem>
                      <SelectItem value="3">3 cols</SelectItem>
                      <SelectItem value="4">4 cols</SelectItem>
                      <SelectItem value="5">5 cols</SelectItem>
                      <SelectItem value="6">6 cols</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setPreviewMode(!previewMode); setPreviewQuestionIndex(0); }}
                  className={`border-[#E8D5A3] ${previewMode ? 'bg-[#A68B5B] text-white' : 'text-[#5D4E37]'}`}
                  disabled={questions.length === 0}
                >
                  {previewMode ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
                  {previewMode ? 'Exit Preview' : 'Preview'}
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addManualQuestion}
                  className="border-[#E8D5A3] text-[#5D4E37]"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generateAIExplanations}
                  disabled={generatingExplanations || questions.length === 0}
                  className="border-[#E8D5A3] text-[#5D4E37]"
                >
                  <Sparkles className="w-4 h-4 mr-1" />
                  {generatingExplanations ? 'Generating...' : 'AI Explain'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {questions.length > 0 ? (
              previewMode ? (
                /* Preview Mode */
                <div className="bg-white rounded-xl shadow-md border border-[#E8D5A3] overflow-hidden">
                  {/* Preview Header */}
                  <div className="bg-[#5D4E37] px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setPreviewQuestionIndex(Math.max(0, previewQuestionIndex - 1))}
                        disabled={previewQuestionIndex === 0}
                        className="text-white/80 hover:text-white hover:bg-white/20 disabled:opacity-30"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </Button>
                      <Badge className="bg-[#A68B5B] text-white px-4 py-1.5 font-semibold">
                        Q{questions[previewQuestionIndex]?.question_number}
                      </Badge>
                      <span className="text-white/80 text-sm">
                        {previewQuestionIndex + 1} of {questions.length}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setPreviewQuestionIndex(Math.min(questions.length - 1, previewQuestionIndex + 1))}
                        disabled={previewQuestionIndex >= questions.length - 1}
                        className="text-white/80 hover:text-white hover:bg-white/20 disabled:opacity-30"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          deleteQuestion(previewQuestionIndex);
                        }}
                        className="text-red-300 hover:text-red-100 hover:bg-red-500/20"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                  
                  {/* Preview Content */}
                  <div className="p-6 bg-[#FEF9E7]">
                    <div className="mb-6">
                      <Label className="text-xs text-[#8B6914] uppercase tracking-wide mb-2 block">Question Text</Label>
                      <Textarea
                        value={questions[previewQuestionIndex]?.question_text || ''}
                        onChange={(e) => updateQuestion(previewQuestionIndex, 'question_text', e.target.value)}
                        className="text-lg text-[#5D4E37] bg-white border border-[#E8D5A3] min-h-[80px] placeholder:text-gray-400"
                        placeholder="Enter question text..."
                      />
                    </div>
                    
                    <div className="space-y-3 mb-6">
                      <Label className="text-xs text-[#8B6914] uppercase tracking-wide">Options (click to set correct)</Label>
                      {(questions[previewQuestionIndex]?.options || ['', '', '', '']).map((opt, optIdx) => {
                        const letter = String.fromCharCode(65 + optIdx);
                        const isCorrect = questions[previewQuestionIndex]?.correct_answer === letter;
                        return (
                          <div key={optIdx} className={`flex items-center gap-3 p-3 rounded-lg border-2 ${isCorrect ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-white'}`}>
                            <button
                              onClick={() => updateQuestion(previewQuestionIndex, 'correct_answer', letter)}
                              className={`w-10 h-10 rounded-full font-bold transition-all ${isCorrect ? 'bg-green-500 text-white scale-110' : 'bg-gray-100 text-[#5D4E37] hover:bg-[#A68B5B] hover:text-white'}`}
                            >
                              {letter}
                            </button>
                            <Input
                              value={opt}
                              onChange={(e) => {
                                const newOpts = [...(questions[previewQuestionIndex]?.options || ['', '', '', ''])];
                                newOpts[optIdx] = e.target.value;
                                updateQuestion(previewQuestionIndex, 'options', newOpts);
                              }}
                              className="flex-1 border border-gray-200 bg-white text-[#5D4E37] placeholder:text-gray-400"
                              placeholder={`Option ${letter}...`}
                            />
                            {isCorrect && <CheckCircle className="w-5 h-5 text-green-500" />}
                          </div>
                        );
                      })}
                    </div>
                    
                    {!questions[previewQuestionIndex]?.correct_answer && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        Click a letter to set the correct answer
                      </div>
                    )}
                  </div>
                  
                  {/* Quick Jump */}
                  <div className="bg-[#FEF9E7] px-6 py-3 border-t border-[#E8D5A3] flex items-center justify-center gap-2">
                    <span className="text-sm text-[#8B6914]">Jump to:</span>
                    <Select value={String(previewQuestionIndex)} onValueChange={(v) => setPreviewQuestionIndex(Number(v))}>
                      <SelectTrigger className="w-32 h-8 bg-white border-[#E8D5A3]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {questions.map((q, i) => (
                          <SelectItem key={i} value={String(i)}>
                            Q{q.question_number} {q.correct_answer ? '✓' : '?'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : viewMode === 'grid' ? (
                /* Grid View */
                <div 
                  className="grid gap-3 max-h-[600px] overflow-y-auto"
                  style={{ gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))` }}
                >
                  {questions.map((q, idx) => (
                    <div
                      key={idx}
                      onClick={() => { setPreviewQuestionIndex(idx); setPreviewMode(true); }}
                      className={`p-3 rounded-lg border-2 cursor-pointer hover:shadow-md transition-all ${q.correct_answer ? 'border-green-300 bg-green-50' : 'border-amber-300 bg-amber-50'}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Badge className={`${q.correct_answer ? 'bg-green-500' : 'bg-amber-500'} text-white text-xs`}>
                          Q{q.question_number}
                        </Badge>
                        {q.correct_answer ? (
                          <Badge className="bg-green-600 text-white text-xs">{q.correct_answer}</Badge>
                        ) : (
                          <Badge variant="outline" className="border-amber-400 text-amber-600 text-xs">?</Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-700 line-clamp-2">{q.question_text || 'No text'}</p>
                    </div>
                  ))}
                </div>
              ) : (
                /* List View */
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {questions.map((q, idx) => (
                    <Card key={idx} className="border border-[#E8D5A3] bg-white">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="border-[#E8D5A3]">Q{q.question_number}</Badge>
                            {q.correct_answer ? (
                              <Badge className="bg-green-500 text-white">Answer: {q.correct_answer}</Badge>
                            ) : (
                              <Badge variant="outline" className="border-amber-400 text-amber-600">No answer</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" onClick={() => { setPreviewQuestionIndex(idx); setPreviewMode(true); }}>
                              <Eye className="w-4 h-4 text-[#8B6914]" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => deleteQuestion(idx)}>
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm text-[#5D4E37] line-clamp-2">{q.question_text || 'No question text'}</p>
                        {q.options && (
                          <div className="flex gap-2 mt-2">
                            {q.options.map((opt, optIdx) => (
                              <span key={optIdx} className={`text-xs px-2 py-1 rounded ${q.correct_answer === String.fromCharCode(65 + optIdx) ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}>
                                ({String.fromCharCode(65 + optIdx)}) {opt.slice(0, 20)}{opt.length > 20 ? '...' : ''}
                              </span>
                            ))}
                          </div>
                        )}
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
      </div>
    </AdminLayout>
  );
};

export default AdminTOEICReading;
