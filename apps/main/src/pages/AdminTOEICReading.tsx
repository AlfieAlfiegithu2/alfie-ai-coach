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
  Wand2
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

      // Delete existing questions for this part
      await supabase
        .from('questions')
        .delete()
        .eq('test_id', testId)
        .eq('toeic_part', part);

      // Delete existing passages for this part
      await supabase
        .from('toeic_passages')
        .delete()
        .eq('test_id', testId)
        .eq('part_number', part);

      // Insert passages first (for Part 6 & 7)
      if (passages.length > 0) {
        const passagesToInsert = passages.map(p => ({
          test_id: testId,
          part_number: part,
          passage_type: p.type,
          passage_title: p.title,
          passage_content: p.content,
          passage_image_url: p.imageUrl,
          question_range_start: p.questionStart,
          question_range_end: p.questionEnd
        }));

        await supabase
          .from('toeic_passages')
          .insert(passagesToInsert);
      }

      // Insert questions
      const questionsToInsert = questions.map((q, index) => ({
        test_id: testId,
        question_number_in_part: q.question_number || index + 1,
        part_number: part,
        toeic_part: part,
        question_text: q.question_text,
        question_type: q.question_type,
        choices: q.options ? JSON.stringify(q.options) : null,
        correct_answer: q.correct_answer,
        explanation: q.explanation,
        ai_explanation: q.ai_explanation,
        passage_context: q.passage_context,
        related_passage_id: q.related_passage_id
      }));

      const { error } = await supabase
        .from('questions')
        .insert(questionsToInsert);

      if (error) throw error;

      setPartData(prev => ({
        ...prev,
        [part]: { ...prev[part], saved: true }
      }));

      toast.success(`Part ${part} saved successfully!`);
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
    const newQuestion: Question = {
      question_number: partData[part].questions.length + 1,
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
            <h1 className="text-2xl font-bold">{testName || 'TOEIC Reading Test'}</h1>
            <p className="text-muted-foreground">
              Manage Parts 5-7 (100 questions total)
            </p>
          </div>
          <Badge variant="outline" className="bg-orange-50 text-orange-700">
            TOEIC Reading
          </Badge>
        </div>

        {/* Progress Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Question Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {TOEIC_READING_PARTS.map((part) => {
                const progress = getQuestionProgress(part.number);
                const PartIcon = part.icon;
                return (
                  <div key={part.number} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1">
                        <PartIcon className="w-4 h-4" />
                        Part {part.number}
                      </span>
                      <span className="text-muted-foreground">
                        {progress.current}/{progress.expected}
                      </span>
                    </div>
                    <Progress value={progress.percentage} className="h-2" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Parts Tabs */}
        <Tabs value={activePart} onValueChange={setActivePart}>
          <TabsList className="grid grid-cols-3 w-full">
            {TOEIC_READING_PARTS.map((part) => {
              const progress = getQuestionProgress(part.number);
              const PartIcon = part.icon;
              return (
                <TabsTrigger 
                  key={part.number} 
                  value={String(part.number)}
                  className="flex items-center gap-2"
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
              <Card className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <part.icon className="w-5 h-5" />
                    Part {part.number}: {part.name}
                  </CardTitle>
                  <CardDescription>{part.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Expected questions: <span className="font-semibold">{part.questions}</span>
                  </p>
                </CardContent>
              </Card>

              {/* Input Method Tabs */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Add Questions</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs value={activeInputMethod} onValueChange={(v) => setActiveInputMethod(v as any)}>
                    <TabsList className="grid grid-cols-3 w-full mb-4">
                      <TabsTrigger value="paste" className="flex items-center gap-2">
                        <Copy className="w-4 h-4" />
                        Paste Text
                      </TabsTrigger>
                      <TabsTrigger value="image" className="flex items-center gap-2">
                        <ImageIcon className="w-4 h-4" />
                        Upload Image
                      </TabsTrigger>
                      <TabsTrigger value="answers" className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Answer Key
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="paste" className="space-y-4">
                      <div>
                        <Label>Paste TOEIC Questions</Label>
                        <p className="text-sm text-muted-foreground mb-2">
                          Paste questions in TOEIC format. AI will automatically parse the structure.
                        </p>
                        <Textarea
                          value={questionText}
                          onChange={(e) => setQuestionText(e.target.value)}
                          placeholder={`101. The Technical Department is currently formulating written guidelines ------- the use of our micro-publishing facilities.
(A) in
(B) for
(C) at
(D) with

102. Company strategists ------- predicted that conditions in the Middle East would eventually stabilize...`}
                          rows={12}
                          className="font-mono text-sm"
                        />
                      </div>
                      <Button 
                        onClick={() => parseQuestionText(part.number)}
                        disabled={parsing || !questionText.trim()}
                        className="bg-orange-600 hover:bg-orange-700"
                      >
                        <Wand2 className="w-4 h-4 mr-2" />
                        {parsing ? 'Parsing...' : 'Parse Questions with AI'}
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
                        <Label>Paste Answer Key</Label>
                        <p className="text-sm text-muted-foreground mb-2">
                          Paste answer key in format: "101. (A) 102. (B) 103. (C)..."
                        </p>
                        <Textarea
                          value={answerKeyText}
                          onChange={(e) => setAnswerKeyText(e.target.value)}
                          placeholder="101. (A) 102. (A) 103. (C) 104. (C) 105. (D) 106. (A) 107. (D) 108. (B) 109. (A) 110. (B)
111. (A) 112. (C) 113. (A) 114. (D) 115. (B) 116. (A) 117. (A) 118. (C) 119. (A) 120. (C)"
                          rows={6}
                          className="font-mono text-sm"
                        />
                      </div>
                      <Button 
                        onClick={() => parseAnswerKey(part.number)}
                        disabled={parsing || !answerKeyText.trim() || partData[part.number].questions.length === 0}
                        className="bg-orange-600 hover:bg-orange-700"
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
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>
                      Questions ({partData[part.number].questions.length})
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addManualQuestion(part.number)}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Question
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => generateAIExplanations(part.number)}
                        disabled={generatingExplanations || partData[part.number].questions.length === 0}
                      >
                        <Sparkles className="w-4 h-4 mr-1" />
                        {generatingExplanations ? 'Generating...' : 'Generate AI Explanations'}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => savePartQuestions(part.number)}
                        disabled={saving || partData[part.number].saved || partData[part.number].questions.length === 0}
                        className="bg-orange-600 hover:bg-orange-700"
                      >
                        <Save className="w-4 h-4 mr-1" />
                        {saving ? 'Saving...' : partData[part.number].saved ? 'Saved' : 'Save Questions'}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {partData[part.number].questions.length > 0 ? (
                    <div className="space-y-4 max-h-[600px] overflow-y-auto">
                      {partData[part.number].questions.map((question, index) => (
                        <Card key={index} className="border">
                          <CardContent className="pt-4">
                            <div className="flex items-start justify-between mb-3">
                              <Badge variant="outline">Q{question.question_number}</Badge>
                              <div className="flex items-center gap-2">
                                {question.correct_answer && (
                                  <Badge variant="secondary" className="bg-green-100 text-green-700">
                                    Answer: {question.correct_answer}
                                  </Badge>
                                )}
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
                                <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg mb-3">
                                  <Label className="text-xs text-muted-foreground">Passage Context</Label>
                                  <p className="text-sm mt-1 whitespace-pre-wrap">{question.passage_context}</p>
                                </div>
                              )}

                              <div>
                                <Label>Question Text</Label>
                                <Textarea
                                  value={question.question_text}
                                  onChange={(e) => updateQuestion(part.number, index, 'question_text', e.target.value)}
                                  rows={2}
                                />
                              </div>

                              {question.options && (
                                <div>
                                  <Label>Options</Label>
                                  <div className="grid grid-cols-2 gap-2 mt-1">
                                    {question.options.map((opt, optIndex) => (
                                      <div key={optIndex} className="flex items-center gap-2">
                                        <span className="text-sm font-medium w-6">
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
                                        />
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label>Correct Answer</Label>
                                  <Select
                                    value={question.correct_answer}
                                    onValueChange={(value) => updateQuestion(part.number, index, 'correct_answer', value)}
                                  >
                                    <SelectTrigger>
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
                                  <Label>Question Type</Label>
                                  <Input
                                    value={question.question_type}
                                    onChange={(e) => updateQuestion(part.number, index, 'question_type', e.target.value)}
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
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
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

