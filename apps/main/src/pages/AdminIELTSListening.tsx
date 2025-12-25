import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Upload, Headphones, Scissors, Trash2, Save, Eye,
  ImageIcon, Plus, ArrowLeft, FileText, ClipboardList,
  MoveVertical, Loader2, Sparkles, ChevronUp, ChevronDown
} from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useAdminContent } from "@/hooks/useAdminContent";
import { AudioTrimmer } from "@/components/AudioTrimmer";
import { toast } from "sonner";
import { QuestionSectionEditor, SectionData } from "@/components/QuestionSectionEditor";
import { QuestionData, QuestionType } from "@/components/QuestionTypeRenderers";

// Part Data Structure
interface PartData {
  partNumber: number;
  imageUrl: string | null;
  imagePosition: 'top' | 'left' | 'right' | 'bottom';
  sections: SectionData[];
}

interface TestData {
  title: string;
  instructions: string;
  audioFile: File | null;
  existingAudioUrl: string | null;
  transcriptText: string;
  saved: boolean;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

// Default empty part
function createEmptyPart(partNumber: number): PartData {
  return {
    partNumber,
    imageUrl: null,
    imagePosition: 'top',
    sections: []
  };
}

const AdminIELTSListening = () => {
  const navigate = useNavigate();
  const { testType, testId } = useParams<{ testType: string; testId: string }>();
  const { admin, loading } = useAdminAuth();

  const effectiveTestType = testType || 'ielts';
  const backPath = `/admin/${effectiveTestType}/listening`;
  const { uploadAudio, uploadFile } = useAdminContent();

  // Test metadata
  const [testData, setTestData] = useState<TestData>({
    title: "",
    instructions: "",
    audioFile: null,
    existingAudioUrl: null,
    transcriptText: "",
    saved: false
  });

  // 4 Parts
  const [parts, setParts] = useState<PartData[]>([
    createEmptyPart(1),
    createEmptyPart(2),
    createEmptyPart(3),
    createEmptyPart(4)
  ]);

  const [activePartTab, setActivePartTab] = useState("1");
  const [saving, setSaving] = useState(false);
  const [showAudioTrimmer, setShowAudioTrimmer] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [showBulkAnswerDialog, setShowBulkAnswerDialog] = useState(false);
  const [bulkRawAnswers, setBulkRawAnswers] = useState("");
  const [uploadingPartImage, setUploadingPartImage] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Auth check
  useEffect(() => {
    if (!loading && !admin) {
      navigate('/admin/login');
    }
  }, [admin, loading, navigate]);

  // Load existing test data
  useEffect(() => {
    loadExistingData();
  }, [testId]);

  const loadExistingData = async () => {
    if (!testId) return;

    try {
      const { supabase } = await import('@/integrations/supabase/client');

      const { data: testRecord } = await supabase
        .from('tests')
        .select('*')
        .eq('id', testId)
        .maybeSingle();

      if (!testRecord) return;

      const { data: questionsData } = await supabase
        .from('questions')
        .select('*')
        .eq('test_id', testRecord.id)
        .order('part_number', { ascending: true })
        .order('question_number_in_part', { ascending: true });

      // Reconstruct parts from questions
      const reconstructedParts: PartData[] = [1, 2, 3, 4].map(partNum => {
        const partQuestions = questionsData?.filter(q => q.part_number === partNum) || [];

        // Group questions into sections by section_header
        const sectionMap = new Map<string, QuestionData[]>();
        partQuestions.forEach((q, idx) => {
          const sectionKey = (q as any).section_header || `Section ${idx + 1}`;
          if (!sectionMap.has(sectionKey)) {
            sectionMap.set(sectionKey, []);
          }
          sectionMap.get(sectionKey)!.push({
            id: q.id || generateId(),
            questionNumber: q.question_number_in_part || idx + 1,
            questionText: q.question_text,
            questionType: (q.question_type as QuestionType) || 'gap_completion',
            options: q.choices ? q.choices.split(';') : undefined,
            correctAnswer: q.correct_answer,
            explanation: q.explanation
          });
        });

        const sections: SectionData[] = Array.from(sectionMap.entries()).map(([title, questions]) => ({
          id: generateId(),
          title,
          instruction: questions[0]?.questionText?.includes('Choose') ? 'Choose the correct letter A, B or C.' : 'Complete the notes below.',
          questionType: (questions[0]?.questionType as QuestionType) || 'gap_completion',
          questions
        }));

        return {
          partNumber: partNum,
          imageUrl: (partQuestions[0] as any)?.question_image_url || null,
          imagePosition: 'top' as const,
          sections
        };
      });

      setParts(reconstructedParts);

      setTestData({
        title: testRecord.test_name,
        instructions: testRecord.instructions || "",
        audioFile: null,
        existingAudioUrl: (testRecord as any).audio_url || null,
        transcriptText: (testRecord as any).transcript_text || "",
        saved: true
      });

      if ((testRecord as any).audio_url) {
        toast.success(`Loaded test: ${testRecord.test_name}`);
      }
    } catch (error) {
      console.error('Error loading existing data:', error);
      toast.error('Failed to load existing data');
    }
  };

  // Audio handlers (preserved from existing)
  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setTestData(prev => ({ ...prev, audioFile: file, saved: false }));
      setShowAudioTrimmer(true);
      toast.success(`Audio file uploaded: ${file.name}`);
    }
  };

  const handleTrimComplete = (trimmedFile: File, startTime: number, endTime: number) => {
    setTestData(prev => ({ ...prev, audioFile: trimmedFile, saved: false }));
    setShowAudioTrimmer(false);
    toast.success(`Trim applied: ${startTime.toFixed(1)}s to ${endTime.toFixed(1)}s`);
  };

  const handleModifySavedAudio = async () => {
    if (!testData.existingAudioUrl) return;

    try {
      const toastId = toast.loading("Loading audio for editing...");
      const response = await fetch(testData.existingAudioUrl);
      const blob = await response.blob();
      const filename = testData.existingAudioUrl.split('/').pop() || "existing-audio.mp3";
      const file = new File([blob], filename, { type: blob.type });

      setTestData(prev => ({ ...prev, audioFile: file }));
      setShowAudioTrimmer(true);
      toast.dismiss(toastId);
      toast.success("Audio loaded for editing");
    } catch (error) {
      toast.error("Failed to load audio for editing");
    }
  };

  const handleDeleteAudio = () => {
    if (confirm("Are you sure you want to delete this audio?")) {
      setTestData(prev => ({
        ...prev,
        existingAudioUrl: null,
        audioFile: null,
        saved: false
      }));
      toast.success("Audio deleted");
    }
  };

  // Auto-transcribe audio
  const handleAutoTranscribe = async () => {
    if (!testData.audioFile && !testData.existingAudioUrl) {
      toast.error("Please upload audio first");
      return;
    }

    setTranscribing(true);
    const toastId = toast.loading("AI Transcribing audio...");

    try {
      let audioUrl = testData.existingAudioUrl;

      if (!audioUrl && testData.audioFile) {
        toast.loading("Uploading audio for transcription...", { id: toastId });
        const result = await uploadAudio(testData.audioFile);
        audioUrl = result.url;
        setTestData(prev => ({ ...prev, existingAudioUrl: audioUrl }));
      }

      const { supabase } = await import("@/integrations/supabase/client");
      const { data, error } = await supabase.functions.invoke('transcribe-audio-gemini', {
        body: { audioUrl }
      });

      if (error) throw error;
      if (!data.transcript) throw new Error("No transcript data returned");

      const transcriptText = data.transcript.map((t: any) => t.text).join(" ");
      setTestData(prev => ({ ...prev, transcriptText }));
      toast.success("Transcription complete!");
    } catch (error: any) {
      toast.error("Transcription failed: " + error.message);
    } finally {
      setTranscribing(false);
      toast.dismiss(toastId);
    }
  };

  // Part image upload
  const handlePartImageUpload = async (partNum: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    setUploadingPartImage(partNum);
    try {
      const result = await uploadFile(file);
      setParts(prev => prev.map(p =>
        p.partNumber === partNum
          ? { ...p, imageUrl: result.url }
          : p
      ));
      toast.success(`Image uploaded for Part ${partNum}`);
    } catch (error: any) {
      toast.error('Failed to upload image: ' + error.message);
    } finally {
      setUploadingPartImage(null);
    }
  };

  // Section management
  const addSection = (partNum: number) => {
    const part = parts.find(p => p.partNumber === partNum);
    if (!part) return;

    // Calculate starting question number
    let startQ = 1;
    for (let i = 1; i < partNum; i++) {
      const p = parts.find(pp => pp.partNumber === i);
      if (p) {
        p.sections.forEach(s => {
          startQ += s.questions.length;
        });
      }
    }
    part.sections.forEach(s => {
      startQ += s.questions.length;
    });

    const newSection: SectionData = {
      id: generateId(),
      title: `Questions ${startQ}-${startQ + 3}`,
      instruction: 'Choose the correct letter A, B or C.',
      questionType: 'multiple_choice',
      questions: []
    };

    setParts(prev => prev.map(p =>
      p.partNumber === partNum
        ? { ...p, sections: [...p.sections, newSection] }
        : p
    ));
  };

  const updateSection = (partNum: number, sectionId: string, section: SectionData) => {
    setParts(prev => prev.map(p =>
      p.partNumber === partNum
        ? {
          ...p,
          sections: p.sections.map(s => s.id === sectionId ? section : s)
        }
        : p
    ));
  };

  const deleteSection = (partNum: number, sectionId: string) => {
    if (!confirm('Delete this section and all its questions?')) return;

    setParts(prev => prev.map(p =>
      p.partNumber === partNum
        ? { ...p, sections: p.sections.filter(s => s.id !== sectionId) }
        : p
    ));
  };

  // Calculate starting question number for a section
  const getStartingQuestionNumber = (partNum: number, sectionIndex: number): number => {
    let count = 1;
    // Add questions from previous parts
    for (let i = 1; i < partNum; i++) {
      const p = parts.find(pp => pp.partNumber === i);
      if (p) {
        p.sections.forEach(s => {
          count += s.questions.length;
        });
      }
    }
    // Add questions from previous sections in this part
    const currentPart = parts.find(p => p.partNumber === partNum);
    if (currentPart) {
      for (let i = 0; i < sectionIndex; i++) {
        count += currentPart.sections[i]?.questions.length || 0;
      }
    }
    return count;
  };

  // Bulk answer import
  const handleBulkAnswerImport = () => {
    const answerMap = new Map<number, string>();
    const lines = bulkRawAnswers.split('\n');
    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;
      const match = trimmed.match(/^(\d+)[.)\s]+(.*)$/);
      if (match) {
        answerMap.set(parseInt(match[1]), match[2].trim());
      }
    });

    if (answerMap.size === 0) {
      toast.error("No valid answers found. Use format: '1. answer' or '1) answer'");
      return;
    }

    // Apply answers to questions
    let appliedCount = 0;
    setParts(prev => prev.map(part => ({
      ...part,
      sections: part.sections.map(section => ({
        ...section,
        questions: section.questions.map(q => {
          if (answerMap.has(q.questionNumber)) {
            appliedCount++;
            return { ...q, correctAnswer: answerMap.get(q.questionNumber)! };
          }
          return q;
        })
      }))
    })));

    setShowBulkAnswerDialog(false);
    setBulkRawAnswers("");
    toast.success(`Applied answers to ${appliedCount} questions`);
  };

  // Save test
  const saveTest = async () => {
    const allQuestions = parts.flatMap(part =>
      part.sections.flatMap(section => section.questions)
    );

    if (!testData.audioFile && !testData.existingAudioUrl && allQuestions.length === 0) {
      toast.error('Please upload audio or add questions first');
      return;
    }

    setSaving(true);
    try {
      let audioUrl = testData.existingAudioUrl;

      if (testData.audioFile) {
        const audioResult = await uploadAudio(testData.audioFile);
        audioUrl = audioResult.url;
      }

      // Flatten questions for database
      const questionsToSave: any[] = [];
      let globalQNum = 1;

      parts.forEach(part => {
        part.sections.forEach(section => {
          section.questions.forEach((q, idx) => {
            questionsToSave.push({
              part_number: part.partNumber,
              question_number_in_part: globalQNum,
              question_text: q.questionText,
              question_type: q.questionType,
              correct_answer: q.correctAnswer || q.correctAnswers?.join(', ') || '',
              choices: q.options?.join(';') || null,
              explanation: q.explanation || '',
              section_header: section.title,
              section_instruction: section.instruction,
              question_image_url: part.imageUrl,
              passage_text: idx === 0 ? section.instruction : null
            });
            globalQNum++;
          });
        });
      });

      const { supabase } = await import('@/integrations/supabase/client');

      const dataToSave = {
        testId,
        testData: {
          title: testData.title || `IELTS Listening Test`,
          instructions: testData.instructions,
          audioUrl,
          transcriptText: testData.transcriptText,
          totalParts: 4,
          partConfigs: parts.reduce((acc, p) => {
            acc[p.partNumber] = {
              imageUrl: p.imageUrl,
              imagePosition: p.imagePosition
            };
            return acc;
          }, {} as any)
        },
        questions: questionsToSave
      };

      const { data, error } = await supabase.functions.invoke('save-listening-test', {
        body: dataToSave
      });

      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || 'Failed to save test');

      toast.success('Test saved successfully!');
      setTestData(prev => ({
        ...prev,
        saved: true,
        existingAudioUrl: audioUrl,
        audioFile: null,
      }));

    } catch (error: any) {
      console.error('Error saving test:', error);
      toast.error(`Failed to save test: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Count total questions
  const totalQuestions = parts.reduce((sum, part) =>
    sum + part.sections.reduce((sSum, section) => sSum + section.questions.length, 0), 0
  );

  if (loading) {
    return (
      <AdminLayout title="Loading...">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  // Note theme colors
  const noteTheme = {
    bg: '#FEF9E7',
    bgLight: '#FFFBF0',
    border: '#E8D5A3',
    textPrimary: '#5D4E37',
    textSecondary: '#8B6914',
    accent: '#A68B5B',
    accentHover: '#8B6914',
  };

  return (
    <AdminLayout title="IELTS Listening Editor">
      <div
        className="min-h-screen py-6"
        style={{
          background: `linear-gradient(to bottom, ${noteTheme.bg} 0%, #FDF6E3 100%)`,
        }}
      >
        <div className="container mx-auto space-y-6 max-w-6xl px-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(backPath)}
                className="hover:bg-[#E8D5A3]/50"
                style={{ color: noteTheme.textPrimary }}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold font-serif" style={{ color: noteTheme.textPrimary }}>
                  IELTS Listening Test Editor
                </h1>
                <p className="text-sm" style={{ color: noteTheme.accent }}>
                  {testId ? `Editing Test #${testId}` : 'Create New Test'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="text-sm"
                style={{
                  borderColor: noteTheme.border,
                  color: noteTheme.textSecondary,
                  backgroundColor: noteTheme.bgLight
                }}
              >
                {totalQuestions} Questions
              </Badge>
              <Button
                onClick={saveTest}
                disabled={saving}
                className="gap-2"
                style={{
                  backgroundColor: noteTheme.accent,
                  color: 'white'
                }}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Test
              </Button>
            </div>
          </div>

          {/* Test Metadata */}
          <Card
            className="border shadow-sm"
            style={{
              backgroundColor: noteTheme.bgLight,
              borderColor: noteTheme.border,
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
            }}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-serif" style={{ color: noteTheme.textPrimary }}>
                Test Details
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <Label style={{ color: noteTheme.textSecondary }}>Test Title</Label>
                <Input
                  value={testData.title}
                  onChange={(e) => setTestData(prev => ({ ...prev, title: e.target.value, saved: false }))}
                  placeholder="e.g., Cambridge IELTS 18 Test 1"
                  className="bg-white border-[#E8D5A3] focus:border-[#8B6914] focus:ring-[#8B6914]/20"
                />
              </div>
              <div>
                <Label style={{ color: noteTheme.textSecondary }}>General Instructions</Label>
                <Input
                  value={testData.instructions}
                  onChange={(e) => setTestData(prev => ({ ...prev, instructions: e.target.value, saved: false }))}
                  placeholder="Optional overall instructions..."
                  className="bg-white border-[#E8D5A3] focus:border-[#8B6914] focus:ring-[#8B6914]/20"
                />
              </div>
            </CardContent>
          </Card>

          {/* Audio Section */}
          <Card
            className="border shadow-sm"
            style={{
              backgroundColor: noteTheme.bgLight,
              borderColor: noteTheme.border,
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
            }}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2 font-serif" style={{ color: noteTheme.textPrimary }}>
                  <Headphones className="h-5 w-5" style={{ color: noteTheme.textSecondary }} />
                  Audio
                </CardTitle>
                {(testData.audioFile || testData.existingAudioUrl) && (
                  <Badge
                    variant="secondary"
                    style={{
                      backgroundColor: '#E8D5A3',
                      color: noteTheme.textPrimary
                    }}
                  >
                    ✓ Audio Ready
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {testData.existingAudioUrl && !testData.audioFile ? (
                <div
                  className="flex items-center justify-between p-4 rounded-lg"
                  style={{ backgroundColor: noteTheme.bg }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="h-10 w-10 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: '#E8D5A3' }}
                    >
                      <Headphones className="h-5 w-5" style={{ color: noteTheme.textSecondary }} />
                    </div>
                    <div>
                      <p className="font-medium text-sm" style={{ color: noteTheme.textPrimary }}>
                        {testData.existingAudioUrl.split('/').pop()}
                      </p>
                      <p className="text-xs" style={{ color: noteTheme.accent }}>Saved audio file</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleModifySavedAudio}
                      className="border-[#E8D5A3] hover:bg-[#E8D5A3]/50"
                      style={{ color: noteTheme.textSecondary }}
                    >
                      <Scissors className="h-4 w-4 mr-1" /> Trim
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-600" onClick={handleDeleteAudio}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : testData.audioFile ? (
                <div className="flex items-center justify-between p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                      <Headphones className="h-5 w-5 text-amber-700" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{testData.audioFile.name}</p>
                      <p className="text-xs text-amber-600">Unsaved - will upload on save</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowAudioTrimmer(true)}>
                      <Scissors className="h-4 w-4 mr-1" /> Trim
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600"
                      onClick={() => setTestData(prev => ({ ...prev, audioFile: null }))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="font-medium">Click to upload audio</p>
                  <p className="text-sm text-muted-foreground">MP3, WAV, or M4A</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={handleAudioUpload}
                  />
                </div>
              )}

              {/* Transcript */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <Label>Transcript (optional)</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAutoTranscribe}
                    disabled={transcribing || (!testData.audioFile && !testData.existingAudioUrl)}
                  >
                    {transcribing ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-1" />
                    )}
                    AI Transcribe
                  </Button>
                </div>
                <Textarea
                  value={testData.transcriptText}
                  onChange={(e) => setTestData(prev => ({ ...prev, transcriptText: e.target.value }))}
                  placeholder="Paste or auto-generate transcript..."
                  className="min-h-[100px]"
                />
              </div>
            </CardContent>
          </Card>

          {/* Parts Tabs */}
          <Card
            className="border shadow-sm"
            style={{
              backgroundColor: noteTheme.bgLight,
              borderColor: noteTheme.border,
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
            }}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-serif" style={{ color: noteTheme.textPrimary }}>
                  Questions by Part
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBulkAnswerDialog(true)}
                  className="border-[#E8D5A3] hover:bg-[#E8D5A3]/50"
                  style={{ color: noteTheme.textSecondary }}
                >
                  <ClipboardList className="h-4 w-4 mr-1" /> Bulk Import Answers
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs value={activePartTab} onValueChange={setActivePartTab}>
                <TabsList
                  className="grid w-full grid-cols-4 p-1"
                  style={{ backgroundColor: noteTheme.border }}
                >
                  {[1, 2, 3, 4].map(partNum => {
                    const part = parts.find(p => p.partNumber === partNum);
                    const questionCount = part?.sections.reduce((sum, s) => sum + s.questions.length, 0) || 0;
                    return (
                      <TabsTrigger
                        key={partNum}
                        value={String(partNum)}
                        className="gap-2 data-[state=active]:bg-[#8B6914] data-[state=active]:text-white"
                        style={{ color: noteTheme.textPrimary }}
                      >
                        Part {partNum}
                        {questionCount > 0 && (
                          <Badge
                            variant="secondary"
                            className="text-xs"
                            style={{
                              backgroundColor: noteTheme.bg,
                              color: noteTheme.textSecondary
                            }}
                          >
                            {questionCount}
                          </Badge>
                        )}
                      </TabsTrigger>
                    );
                  })}
                </TabsList>

                {parts.map(part => (
                  <TabsContent key={part.partNumber} value={String(part.partNumber)} className="mt-4 space-y-4">
                    {/* Part Image */}
                    <Card
                      style={{
                        backgroundColor: noteTheme.bg,
                        borderColor: noteTheme.border
                      }}
                    >
                      <CardHeader className="py-3">
                        <CardTitle
                          className="text-sm font-medium flex items-center gap-2"
                          style={{ color: noteTheme.textSecondary }}
                        >
                          <ImageIcon className="h-4 w-4" />
                          Part {part.partNumber} Image (optional)
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pb-4">
                        <div className="flex items-start gap-4">
                          {part.imageUrl ? (
                            <div className="relative">
                              <img
                                src={part.imageUrl}
                                alt={`Part ${part.partNumber}`}
                                className="max-h-32 rounded-lg border"
                              />
                              <Button
                                size="icon"
                                variant="destructive"
                                className="absolute -top-2 -right-2 h-6 w-6"
                                onClick={() => setParts(prev => prev.map(p =>
                                  p.partNumber === part.partNumber ? { ...p, imageUrl: null } : p
                                ))}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <label className="flex-shrink-0 w-32 h-24 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors">
                              {uploadingPartImage === part.partNumber ? (
                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                              ) : (
                                <>
                                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground">Upload</span>
                                </>
                              )}
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => handlePartImageUpload(part.partNumber, e)}
                              />
                            </label>
                          )}

                          <div className="flex-1">
                            <Label className="text-xs text-muted-foreground">Image Position</Label>
                            <Select
                              value={part.imagePosition}
                              onValueChange={(v: any) => setParts(prev => prev.map(p =>
                                p.partNumber === part.partNumber ? { ...p, imagePosition: v } : p
                              ))}
                            >
                              <SelectTrigger className="w-32 bg-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="top">Top</SelectItem>
                                <SelectItem value="left">Left</SelectItem>
                                <SelectItem value="right">Right</SelectItem>
                                <SelectItem value="bottom">Bottom</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Sections */}
                    <div className="space-y-3">
                      {part.sections.map((section, sectionIdx) => (
                        <QuestionSectionEditor
                          key={section.id}
                          section={section}
                          onChange={(updated) => updateSection(part.partNumber, section.id, updated)}
                          onDelete={() => deleteSection(part.partNumber, section.id)}
                          startingQuestionNumber={getStartingQuestionNumber(part.partNumber, sectionIdx)}
                        />
                      ))}

                      <Button
                        onClick={() => addSection(part.partNumber)}
                        variant="outline"
                        className="w-full border-dashed hover:border-solid"
                      >
                        <Plus className="h-4 w-4 mr-2" /> Add Question Section
                      </Button>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Audio Trimmer Dialog */}
        {showAudioTrimmer && testData.audioFile && (
          <Dialog open={showAudioTrimmer} onOpenChange={setShowAudioTrimmer}>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Trim Audio</DialogTitle>
                <DialogDescription>
                  Adjust the start and end points to trim the audio
                </DialogDescription>
              </DialogHeader>
              <AudioTrimmer
                audioFile={testData.audioFile}
                onTrimComplete={handleTrimComplete}
              />
            </DialogContent>
          </Dialog>
        )}

        {/* Bulk Answer Import Dialog */}
        <Dialog open={showBulkAnswerDialog} onOpenChange={setShowBulkAnswerDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Bulk Import Answers</DialogTitle>
              <DialogDescription>
                Paste answers in format: "1. answer" or "1) answer" (one per line)
              </DialogDescription>
            </DialogHeader>
            <Textarea
              value={bulkRawAnswers}
              onChange={(e) => setBulkRawAnswers(e.target.value)}
              placeholder={`1. materials cost less
2. 2009
3. better to overestimate
...`}
              className="min-h-[200px] font-mono text-sm"
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowBulkAnswerDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleBulkAnswerImport}>
                Import Answers
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminIELTSListening;
