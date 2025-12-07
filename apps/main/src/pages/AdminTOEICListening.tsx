import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { 
  Upload, 
  Headphones, 
  Image as ImageIcon, 
  Sparkles, 
  Save, 
  Trash2, 
  Play, 
  Pause,
  CheckCircle,
  AlertCircle,
  Camera,
  MessageSquare,
  Users,
  Mic,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight
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
  image_url?: string;
  audio_url?: string;
}

interface PartData {
  questions: Question[];
  audioFile: File | null;
  audioUrl: string | null;
  saved: boolean;
}

const TOEIC_LISTENING_PARTS = [
  { 
    number: 1, 
    name: "Photos", 
    questions: 6, 
    description: "Look at a photo and choose the statement that best describes it",
    icon: Camera
  },
  { 
    number: 2, 
    name: "Question-Response", 
    questions: 25, 
    description: "Listen to a question and choose the best response",
    icon: MessageSquare
  },
  { 
    number: 3, 
    name: "Conversations", 
    questions: 39, 
    description: "Listen to conversations and answer questions",
    icon: Users
  },
  { 
    number: 4, 
    name: "Talks", 
    questions: 30, 
    description: "Listen to talks and answer questions",
    icon: Mic
  }
];

const AdminTOEICListening = () => {
  const navigate = useNavigate();
  const { testId } = useParams<{ testId: string }>();
  const { admin, loading: authLoading } = useAdminAuth();
  const audioRef = useRef<HTMLAudioElement>(null);

  const [testName, setTestName] = useState("");
  const [activePart, setActivePart] = useState("1");
  const [saving, setSaving] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [generatingExplanations, setGeneratingExplanations] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [previewQuestionIndex, setPreviewQuestionIndex] = useState(0);

  // Part data for each of the 4 parts
  const [partData, setPartData] = useState<{ [key: number]: PartData }>({
    1: { questions: [], audioFile: null, audioUrl: null, saved: false },
    2: { questions: [], audioFile: null, audioUrl: null, saved: false },
    3: { questions: [], audioFile: null, audioUrl: null, saved: false },
    4: { questions: [], audioFile: null, audioUrl: null, saved: false },
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

      // Load questions grouped by part
      const { data: questions, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('test_id', testId)
        .order('question_number_in_part', { ascending: true });

      if (questionsError) throw questionsError;

      // Group questions by toeic_part
      const grouped: { [key: number]: Question[] } = { 1: [], 2: [], 3: [], 4: [] };
      questions?.forEach((q: any) => {
        const part = q.toeic_part || 1;
        if (grouped[part]) {
          grouped[part].push({
            id: q.id,
            question_number: q.question_number_in_part,
            question_text: q.question_text,
            question_type: q.question_type,
            options: q.choices ? JSON.parse(q.choices) : null,
            correct_answer: q.correct_answer,
            explanation: q.explanation || '',
            ai_explanation: q.ai_explanation,
            toeic_part: part,
            image_url: q.image_url,
            audio_url: q.audio_url
          });
        }
      });

      setPartData(prev => ({
        1: { ...prev[1], questions: grouped[1], audioUrl: questions?.find((q: any) => q.toeic_part === 1)?.audio_url || null },
        2: { ...prev[2], questions: grouped[2], audioUrl: questions?.find((q: any) => q.toeic_part === 2)?.audio_url || null },
        3: { ...prev[3], questions: grouped[3], audioUrl: questions?.find((q: any) => q.toeic_part === 3)?.audio_url || null },
        4: { ...prev[4], questions: grouped[4], audioUrl: questions?.find((q: any) => q.toeic_part === 4)?.audio_url || null },
      }));

    } catch (error) {
      console.error('Error loading test data:', error);
      toast.error('Failed to load test data');
    }
  };

  const handleAudioUpload = async (part: number, file: File) => {
    try {
      const fileName = `toeic-listening/${testId}/part${part}/${Date.now()}_${file.name}`;
      
      const { data, error } = await supabase.storage
        .from('audio')
        .upload(fileName, file, { upsert: true });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('audio')
        .getPublicUrl(fileName);

      setPartData(prev => ({
        ...prev,
        [part]: { ...prev[part], audioFile: file, audioUrl: publicUrl }
      }));

      toast.success(`Audio uploaded for Part ${part}`);
    } catch (error) {
      console.error('Error uploading audio:', error);
      toast.error('Failed to upload audio');
    }
  };

  const handleQuestionsExtracted = (part: number, questions: any[]) => {
    const formattedQuestions: Question[] = questions.map((q, index) => ({
      question_number: q.question_number || index + 1,
      question_text: q.question_text,
      question_type: q.question_type || getDefaultQuestionType(part),
      options: q.options,
      correct_answer: q.correct_answer || '',
      explanation: q.explanation || '',
      toeic_part: part
    }));

    setPartData(prev => ({
      ...prev,
      [part]: { ...prev[part], questions: formattedQuestions, saved: false }
    }));

    toast.success(`${questions.length} questions extracted for Part ${part}`);
  };

  const getDefaultQuestionType = (part: number): string => {
    switch (part) {
      case 1: return 'photo_description';
      case 2: return 'question_response';
      case 3: return 'conversation';
      case 4: return 'talk';
      default: return 'multiple_choice';
    }
  };

  const savePartQuestions = async (part: number) => {
    if (!testId) return;
    
    setSaving(true);
    try {
      const questions = partData[part].questions;
      const audioUrl = partData[part].audioUrl;

      // Delete existing questions for this part
      await supabase
        .from('questions')
        .delete()
        .eq('test_id', testId)
        .eq('toeic_part', part);

      // Insert new questions
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
        audio_url: audioUrl,
        image_url: q.image_url
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
            part: part
          })),
          testType: 'TOEIC Listening',
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

  const getQuestionProgress = (part: number) => {
    const expected = TOEIC_LISTENING_PARTS.find(p => p.number === part)?.questions || 0;
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
    <AdminLayout title="TOEIC Listening Test" showBackButton={true} backPath="/admin/toeic">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#5D4E37]">{testName || 'TOEIC Listening Test'}</h1>
            <p className="text-[#8B6914]">
              Manage Parts 1-4 (100 questions total)
            </p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="bg-[#FEF9E7] text-[#8B6914] border-[#E8D5A3]">
              TOEIC Listening
            </Badge>
          </div>
        </div>

        {/* Progress Overview */}
        <Card className="bg-[#FEF9E7] border-[#E8D5A3]">
          <CardHeader>
            <CardTitle className="text-lg text-[#5D4E37]">Question Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              {TOEIC_LISTENING_PARTS.map((part) => {
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
          <TabsList className="grid grid-cols-4 w-full bg-[#E8D5A3]/20 border border-[#E8D5A3]">
            {TOEIC_LISTENING_PARTS.map((part) => {
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

          {TOEIC_LISTENING_PARTS.map((part) => (
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

              {/* Audio Upload */}
              <Card className="bg-[#FEF9E7] border-[#E8D5A3]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-[#5D4E37]">
                    <Headphones className="w-5 h-5 text-[#8B6914]" />
                    Audio for Part {part.number}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {partData[part.number].audioUrl ? (
                    <div className="flex items-center gap-4">
                      <audio 
                        ref={audioRef} 
                        src={partData[part.number].audioUrl!} 
                        className="flex-1"
                        controls
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-[#E8D5A3] text-[#5D4E37] hover:bg-[#E8D5A3]/20"
                        onClick={() => setPartData(prev => ({
                          ...prev,
                          [part.number]: { ...prev[part.number], audioUrl: null, audioFile: null }
                        }))}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-[#E8D5A3] rounded-lg p-8 text-center bg-white/30">
                      <Upload className="w-8 h-8 mx-auto mb-2 text-[#8B6914]" />
                      <p className="text-sm text-[#8B6914] mb-2">
                        Upload audio file for Part {part.number}
                      </p>
                      <input
                        type="file"
                        accept="audio/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleAudioUpload(part.number, file);
                        }}
                        className="hidden"
                        id={`audio-upload-${part.number}`}
                      />
                      <Button
                        variant="outline"
                        className="border-[#E8D5A3] text-[#5D4E37] hover:bg-[#E8D5A3]/20"
                        onClick={() => document.getElementById(`audio-upload-${part.number}`)?.click()}
                      >
                        Choose Audio File
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Question Extraction */}
              <ImageQuestionExtractor
                testId={testId || ''}
                testType="TOEIC"
                onQuestionsExtracted={(questions) => handleQuestionsExtracted(part.number, questions)}
              />

              {/* Questions List */}
              {partData[part.number].questions.length > 0 && (
                <Card className="bg-[#FEF9E7] border-[#E8D5A3]">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-[#5D4E37]">
                        Questions ({partData[part.number].questions.length})
                      </CardTitle>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setPreviewMode(!previewMode);
                            setPreviewQuestionIndex(0);
                          }}
                          className={`border-[#E8D5A3] ${previewMode ? 'bg-[#A68B5B] text-white' : 'text-[#5D4E37]'} hover:bg-[#E8D5A3]/20`}
                        >
                          {previewMode ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
                          {previewMode ? 'Exit Preview' : 'Student Preview'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => generateAIExplanations(part.number)}
                          disabled={generatingExplanations}
                          className="border-[#E8D5A3] text-[#5D4E37] hover:bg-[#E8D5A3]/20"
                        >
                          <Sparkles className="w-4 h-4 mr-1" />
                          {generatingExplanations ? 'Generating...' : 'AI Explanations'}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => savePartQuestions(part.number)}
                          disabled={saving || partData[part.number].saved}
                          className="bg-[#A68B5B] hover:bg-[#8B6914] text-white"
                        >
                          <Save className="w-4 h-4 mr-1" />
                          {saving ? 'Saving...' : partData[part.number].saved ? 'Saved' : 'Save Questions'}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {previewMode ? (
                      /* Student Preview Mode */
                      <div className="bg-white rounded-xl shadow-lg p-6 border border-[#E8D5A3]">
                        <div className="flex items-center justify-between mb-6">
                          <Badge className="bg-[#A68B5B] text-white text-sm px-3 py-1">
                            Question {partData[part.number].questions[previewQuestionIndex]?.question_number || previewQuestionIndex + 1}
                          </Badge>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPreviewQuestionIndex(Math.max(0, previewQuestionIndex - 1))}
                              disabled={previewQuestionIndex === 0}
                              className="border-[#E8D5A3]"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <span className="text-sm text-[#5D4E37] font-medium">
                              {previewQuestionIndex + 1} / {partData[part.number].questions.length}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPreviewQuestionIndex(Math.min(partData[part.number].questions.length - 1, previewQuestionIndex + 1))}
                              disabled={previewQuestionIndex >= partData[part.number].questions.length - 1}
                              className="border-[#E8D5A3]"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        
                        {/* Question Text */}
                        <div className="mb-6">
                          <p className="text-lg text-[#5D4E37] leading-relaxed">
                            {partData[part.number].questions[previewQuestionIndex]?.question_text || 'No question text'}
                          </p>
                        </div>
                        
                        {/* Options */}
                        <div className="space-y-3">
                          {(partData[part.number].questions[previewQuestionIndex]?.options || []).map((option, optIndex) => {
                            const letter = String.fromCharCode(65 + optIndex);
                            const isCorrect = partData[part.number].questions[previewQuestionIndex]?.correct_answer === letter;
                            return (
                              <div
                                key={optIndex}
                                className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all cursor-pointer
                                  ${isCorrect 
                                    ? 'bg-green-50 border-green-400' 
                                    : 'bg-[#FEF9E7] border-[#E8D5A3] hover:border-[#A68B5B]'
                                  }`}
                              >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm
                                  ${isCorrect 
                                    ? 'bg-green-500 text-white' 
                                    : 'bg-[#A68B5B] text-white'
                                  }`}>
                                  {letter}
                                </div>
                                <span className={`text-base ${isCorrect ? 'text-green-700 font-medium' : 'text-[#5D4E37]'}`}>
                                  {option}
                                </span>
                                {isCorrect && (
                                  <CheckCircle className="w-5 h-5 text-green-500 ml-auto" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                        
                        {/* Correct Answer Indicator */}
                        {!partData[part.number].questions[previewQuestionIndex]?.correct_answer && (
                          <p className="text-amber-600 text-sm mt-4 text-center">
                            ⚠️ No correct answer set for this question
                          </p>
                        )}
                      </div>
                    ) : (
                      /* Edit Mode */
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
                                    <Input
                                      value={question.correct_answer}
                                      onChange={(e) => updateQuestion(part.number, index, 'correct_answer', e.target.value)}
                                      placeholder="A, B, C, or D"
                                      className="bg-white border-[#E8D5A3] focus:border-[#8B6914] focus:ring-[#8B6914] text-[#5D4E37]"
                                    />
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
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminTOEICListening;

