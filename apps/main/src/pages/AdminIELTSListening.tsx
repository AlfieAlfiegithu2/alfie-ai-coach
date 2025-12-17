import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, Upload, Circle, Headphones, Sparkles, Image, Scissors, Trash2, Edit2, X, Save, Eye, ImageIcon, Plus, Minus, Table2, Map as MapIcon, ListOrdered, FileText, GitBranch, LayoutGrid, ClipboardList } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useAdminContent } from "@/hooks/useAdminContent";
import { ImageQuestionExtractor } from "@/components/ImageQuestionExtractor";
import { AudioTrimmer } from "@/components/AudioTrimmer";
import { toast } from "sonner";
import { SmartListeningPaste } from "@/components/SmartListeningPaste";
import { ScrollArea } from "@/components/ui/scroll-area";

// Question types based on IELTS Listening formats
const QUESTION_TYPES = {
  note_completion: { label: 'Note Completion', icon: FileText, description: 'Fill in blanks in notes' },
  table_completion: { label: 'Table/Form Completion', icon: Table2, description: 'Fill in table cells' },
  map_labeling: { label: 'Map/Plan Labeling', icon: MapIcon, description: 'Label locations on a map' },
  multiple_choice_matching: { label: 'Multiple Choice Matching', icon: ListOrdered, description: 'Match letters A-H to items' },
  sentence_completion: { label: 'Sentence Completion', icon: FileText, description: 'Complete sentences' },
  flowchart_completion: { label: 'Flowchart Completion', icon: GitBranch, description: 'Fill in flowchart boxes' },
  plan_labeling: { label: 'Plan/Diagram Labeling', icon: LayoutGrid, description: 'Label a plan or diagram' },
  multiple_choice: { label: 'Multiple Choice', icon: ListOrdered, description: 'Choose correct answer' },
  fill_blank: { label: 'Fill in the Blank', icon: FileText, description: 'Generic fill-in-blank' },
} as const;

type QuestionType = keyof typeof QUESTION_TYPES;

interface ListeningQuestion {
  question_number: number;
  question_text: string;
  question_type: QuestionType | string;
  options?: string[];
  correct_answer: string;
  explanation?: string;
  section_header?: string; // e.g., "Questions 6-10. Complete the notes..."
  section_label?: string; // e.g., "Henry", "Extras", "Contact details"
  section_instruction?: string; // e.g., "Write NO MORE THAN TWO WORDS..."
  part_number?: number;
  question_number_in_part?: number;
  table_headers?: string[]; // For table completion
  diagram_image_url?: string; // For map/plan labeling
  // New fields for IELTS note/table format
  is_info_row?: boolean; // True if this is an informational row (no blank)
  label?: string; // Left column text (e.g., "Weight", "Make")
  value?: string; // Right column text before blank (e.g., "only", "Not", "Allegro")
}

interface ListeningTestData {
  title: string;
  instructions: string;
  audioFile: File | null;
  existingAudioUrl: string | null;
  csvFile: File | null;
  transcriptText: string;
  answerImageFile: File | null;
  referenceImageUrl: string | null;
  saved: boolean;
  audioTrimStart?: number;
  audioTrimEnd?: number;
}

const DEFAULT_PART_SIZE = 5;
const MIN_PARTS = 1;
const MAX_PARTS = 20; // Allow up to 20 parts

interface PartConfig {
  questionCount: number;
  questionType: QuestionType;
  instruction: string;
}

const DEFAULT_PART_CONFIG: PartConfig = {
  questionCount: DEFAULT_PART_SIZE,
  questionType: 'note_completion',
  instruction: 'Write NO MORE THAN TWO WORDS OR A NUMBER for each answer.',
};

const AdminIELTSListening = () => {
  const navigate = useNavigate();
  const { testType, testId } = useParams<{ testType: string; testId: string; }>();
  const { admin, loading } = useAdminAuth();

  const effectiveTestType = testType || 'ielts';
  const backPath = `/admin/${effectiveTestType}/listening`;
  const { listContent, createContent, uploadAudio } = useAdminContent();

  const [testData, setTestData] = useState<ListeningTestData>({
    title: "",
    instructions: "",
    audioFile: null,
    existingAudioUrl: null,
    csvFile: null,
    transcriptText: "",
    answerImageFile: null,
    referenceImageUrl: null,
    saved: false
  });
  const [saving, setSaving] = useState(false);
  const [generatingTimestamps, setGeneratingTimestamps] = useState(false);
  const [generatingExplanations, setGeneratingExplanations] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [explanations, setExplanations] = useState<{ [key: number]: string }>({});
  const [showAudioTrimmer, setShowAudioTrimmer] = useState(false);
  const [uploadingRefImage, setUploadingRefImage] = useState(false);

  const [questions, setQuestions] = useState<ListeningQuestion[]>([]);

  // Bulk Answer Import State
  const [showBulkAnswerDialog, setShowBulkAnswerDialog] = useState(false);
  const [bulkRawAnswers, setBulkRawAnswers] = useState("");

  const parsedBulkAnswers = useMemo(() => {
    const answerMap = new Map<number, string>();
    const lines = bulkRawAnswers.split('\n');
    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;
      const match = trimmed.match(/^(\d+)[\.\)]?\s+(.*)$/);
      if (match) {
        answerMap.set(parseInt(match[1]), match[2].trim());
      }
    });
    return answerMap;
  }, [bulkRawAnswers]);

  const handleBulkAnswerImport = () => {
    if (parsedBulkAnswers.size === 0) {
      toast.error("No valid answers found. Check format.");
      return;
    }

    let appliedCount = 0;
    const updatedQuestions = questions.map(q => {
      const qNum = Number(q.question_number);
      if (parsedBulkAnswers.has(qNum)) {
        appliedCount++;
        return { ...q, correct_answer: parsedBulkAnswers.get(qNum) };
      }
      return q;
    });

    setQuestions(updatedQuestions);
    setShowBulkAnswerDialog(false);
    setBulkRawAnswers("");
    if (appliedCount > 0) {
      toast.success(`Applied answers to ${appliedCount} questions.`);
    } else {
      toast.warning("No questions matched the provided numbers.");
    }
  };
  const [previewPart, setPreviewPart] = useState(1);

  // Dynamic parts - start with 8 parts, admin can add more
  const [totalParts, setTotalParts] = useState(8);
  const [partConfigs, setPartConfigs] = useState<Record<number, PartConfig>>(() => {
    const initial: Record<number, PartConfig> = {};
    for (let i = 1; i <= 8; i++) {
      initial[i] = { ...DEFAULT_PART_CONFIG, questionCount: 5 }; // 5 questions per part by default
    }
    return initial;
  });

  // Legacy compatibility - convert partConfigs to partQuestionCounts
  const partQuestionCounts = Object.fromEntries(
    Object.entries(partConfigs).map(([k, v]) => [k, v.questionCount])
  ) as Record<number, number>;

  // Edit modal state
  const [editingQuestion, setEditingQuestion] = useState<ListeningQuestion | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const getCounts = () =>
    Array.from({ length: totalParts }, (_, i) => partQuestionCounts[i + 1] || DEFAULT_PART_SIZE);

  const getPartFromIndex = (idx: number) => {
    const counts = getCounts();
    let running = 0;
    for (let i = 0; i < counts.length; i++) {
      running += counts[i];
      if (idx < running) return i + 1;
    }
    return totalParts;
  };

  const getQuestionNumberInPartFromIndex = (idx: number) => {
    const counts = getCounts();
    let running = 0;
    for (let i = 0; i < counts.length; i++) {
      const nextRunning = running + counts[i];
      if (idx < nextRunning) {
        return idx - running + 1;
      }
      running = nextRunning;
    }
    const totalBeforeLast = counts.slice(0, counts.length - 1).reduce((a, b) => a + b, 0);
    return idx - totalBeforeLast + 1;
  };

  const getPartStart = (part: number) => {
    const counts = getCounts();
    return counts.slice(0, part - 1).reduce((a, b) => a + b, 0) + 1;
  };

  // Add a new part
  const addPart = () => {
    if (totalParts >= MAX_PARTS) {
      toast.error(`Maximum ${MAX_PARTS} parts allowed`);
      return;
    }
    const newPartNum = totalParts + 1;
    setTotalParts(newPartNum);
    setPartConfigs(prev => ({
      ...prev,
      [newPartNum]: { ...DEFAULT_PART_CONFIG }
    }));
    toast.success(`Part ${newPartNum} added`);
  };

  // Remove the last part
  const removePart = () => {
    if (totalParts <= MIN_PARTS) {
      toast.error(`Minimum ${MIN_PARTS} part required`);
      return;
    }
    // Check if there are questions in the last part
    const lastPartQuestions = questions.filter(q => (q.part_number || getPartFromIndex(questions.indexOf(q))) === totalParts);
    if (lastPartQuestions.length > 0) {
      if (!confirm(`Part ${totalParts} has ${lastPartQuestions.length} question(s). Remove anyway?`)) {
        return;
      }
    }
    const newPartConfigs = { ...partConfigs };
    delete newPartConfigs[totalParts];
    setPartConfigs(newPartConfigs);
    setTotalParts(totalParts - 1);
    if (previewPart > totalParts - 1) {
      setPreviewPart(totalParts - 1);
    }
    toast.success(`Part ${totalParts} removed`);
  };

  // Update part config
  const updatePartConfig = (part: number, updates: Partial<PartConfig>) => {
    setPartConfigs(prev => ({
      ...prev,
      [part]: { ...(prev[part] || DEFAULT_PART_CONFIG), ...updates }
    }));
  };

  // Get total questions across all parts
  const getTotalQuestions = () => getCounts().reduce((a, b) => a + b, 0);

  // Count only non-info rows for question numbering
  // Info rows inherit the part from the nearest question
  const questionsWithMeta = (() => {
    let questionCounter = 0; // Track actual question numbers (excluding info rows)
    let currentPart = 1; // Track current part for info rows

    return questions.map((q, idx) => {
      const isInfoRow = q.is_info_row === true || q.question_number === 0;

      if (isInfoRow) {
        // Info rows inherit the part from the current question context
        // Use the part that the next question would be in, or current part
        const part = q.part_number || currentPart;
        return {
          ...q,
          globalNumber: 0,
          part,
          questionInPart: 0,
          originalIndex: idx,
          is_info_row: true
        };
      } else {
        // Regular question rows
        const part = q.part_number || getPartFromIndex(questionCounter);
        currentPart = part; // Update current part for subsequent info rows
        const questionInPart = q.question_number_in_part || getQuestionNumberInPartFromIndex(questionCounter);
        const globalNumber = q.question_number || (getPartStart(part) + questionInPart - 1);
        questionCounter++;
        return { ...q, globalNumber, part, questionInPart, originalIndex: idx };
      }
    });
  })();

  const groupedQuestions: Record<number, any[]> = questionsWithMeta.reduce((acc, q) => {
    acc[q.part] = acc[q.part] ? [...acc[q.part], q] : [q];
    return acc;
  }, {} as Record<number, any[]>);

  // Edit question handlers
  const openEditModal = (q: any, index: number) => {
    setEditingQuestion({ ...q });
    setEditingIndex(index);
  };

  const saveEditedQuestion = () => {
    if (editingIndex !== null && editingQuestion) {
      const updated = [...questions];
      updated[editingIndex] = {
        ...updated[editingIndex],
        question_text: editingQuestion.question_text,
        question_type: editingQuestion.question_type,
        correct_answer: editingQuestion.correct_answer,
        options: editingQuestion.options,
        section_header: editingQuestion.section_header,
        section_label: editingQuestion.section_label,
        section_instruction: editingQuestion.section_instruction,
        explanation: editingQuestion.explanation,
      };
      setQuestions(updated);
      setEditingQuestion(null);
      setEditingIndex(null);
      toast.success('Question updated');
    }
  };

  const handleQuestionMetaChange = (index: number, part: number, value: number) => {
    const maxForPart = partQuestionCounts[part] || DEFAULT_PART_SIZE;
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === index
          ? {
            ...q,
            question_number_in_part: Math.max(1, Math.min(maxForPart, Number.isFinite(value) ? value : 1)),
          }
          : q
      )
    );
  };

  // Reference image upload handler
  const handleReferenceImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    setUploadingRefImage(true);
    try {
      const result = await uploadAudio(file); // reuses R2 upload
      setTestData(prev => ({ ...prev, referenceImageUrl: result.url }));
      toast.success('Reference image uploaded');
    } catch (error: any) {
      toast.error('Failed to upload reference image: ' + error.message);
    } finally {
      setUploadingRefImage(false);
    }
  };

  useEffect(() => {
    if (!loading && !admin) {
      navigate('/admin/login');
    }
  }, [admin, loading, navigate]);

  useEffect(() => {
    loadExistingData();
  }, [testType, testId]);

  const loadExistingData = async () => {
    const type = testType || 'IELTS';
    console.log('🔄 loadExistingData called with testType:', type, 'testId:', testId);

    if (!testId) {
      console.log('⚠️ Skipping loadExistingData - missing testId');
      return;
    }

    try {
      const { supabase } = await import('@/integrations/supabase/client');

      const { data: testRecord } = await supabase
        .from('tests')
        .select('*')
        .eq('id', testId)
        .maybeSingle();

      if (!testRecord) {
        console.log('⚠️ No existing test found for testId:', testId);
        return;
      }

      console.log('📋 Found existing test:', testRecord.test_name);

      const { data: questionsData } = await supabase
        .from('questions')
        .select('*')
        .eq('test_id', testRecord.id)
        .order('question_number_in_part', { ascending: true });

      console.log('📊 Found', questionsData?.length || 0, 'questions for this test');

      const audioUrl = (testRecord as any).audio_url || (questionsData && questionsData.length > 0 ? questionsData[0].audio_url : null);
      const referenceImageUrl = (testRecord as any).reference_image_url || null;

      if (questionsData && questionsData.length > 0) {
        const firstQuestion = questionsData[0];

        const reconstructedQuestions: ListeningQuestion[] = questionsData.map((q, idx) => {
          const part_number = q.part_number || getPartFromIndex(idx);
          const question_number_in_part = q.question_number_in_part || getQuestionNumberInPartFromIndex(idx);
          return {
            question_number: q.question_number_in_part || idx + 1,
            question_text: q.question_text,
            question_type: q.question_type || 'fill_blank',
            options: q.choices ? (q.choices.includes(';') ? q.choices.split(';') : [q.choices]) : undefined,
            correct_answer: q.correct_answer,
            explanation: q.explanation,
            section_header: (q as any).section_header || undefined,
            section_label: (q as any).section_label || undefined,
            part_number,
            question_number_in_part
          };
        });

        setQuestions(reconstructedQuestions);

        const questionsJson = JSON.stringify(reconstructedQuestions);
        const file = new File([questionsJson], `existing-questions.json`, {
          type: 'application/json'
        });

        setTestData({
          title: testRecord.test_name,
          instructions: firstQuestion.passage_text || "",
          audioFile: null,
          existingAudioUrl: audioUrl || null,
          csvFile: file,
          transcriptText: firstQuestion.transcription || "",
          answerImageFile: null,
          referenceImageUrl: referenceImageUrl,
          saved: true
        });

        if (audioUrl) {
          toast.success(`Existing audio loaded: ${audioUrl.split('/').pop()}`);
        }
      } else {
        setTestData(prev => ({
          ...prev,
          title: testRecord.test_name,
          existingAudioUrl: audioUrl || null,
          referenceImageUrl: referenceImageUrl,
          saved: true
        }));

        if (audioUrl) {
          toast.success(`Existing audio loaded: ${audioUrl.split('/').pop()}`);
        }
      }
    } catch (error) {
      console.error('Error loading existing data:', error);
      toast.error('Failed to load existing data');
    }
  };

  const updateTestData = (field: keyof ListeningTestData, value: any) => {
    setTestData(prev => ({ ...prev, [field]: value, saved: false }));
  };

  const handleAudioUpload = (file: File) => {
    setTestData(prev => ({ ...prev, audioFile: file }));
    setTestData(prev => ({ ...prev, audioTrimStart: undefined, audioTrimEnd: undefined }));
    setShowAudioTrimmer(true);
    toast.success(`Audio file uploaded: ${file.name}`);
  };

  const handleModifySavedAudio = async () => {
    if (!testData.existingAudioUrl) return;

    try {
      const toastId = toast.loading("Loading audio for editing...");
      const response = await fetch(testData.existingAudioUrl);
      const blob = await response.blob();
      const filename = testData.existingAudioUrl.split('/').pop() || "existing-audio.mp3";
      const file = new File([blob], filename, { type: blob.type });

      setTestData(prev => ({
        ...prev,
        audioFile: file
      }));
      setShowAudioTrimmer(true);
      toast.dismiss(toastId);
      toast.success("Audio loaded for editing");
    } catch (error) {
      console.error("Error loading audio:", error);
      toast.dismiss();
      toast.error("Failed to load audio for editing");
    }
  };

  const handleDeleteAudio = () => {
    if (confirm("Are you sure you want to delete this audio?")) {
      setTestData(prev => ({
        ...prev,
        existingAudioUrl: null,
        audioFile: null
      }));
      toast.success("Audio deleted");
    }
  };

  const handleTrimComplete = (trimmedFile: File, startTime: number, endTime: number) => {
    updateTestData('audioFile', trimmedFile);
    updateTestData('audioTrimStart', startTime);
    updateTestData('audioTrimEnd', endTime);
    setShowAudioTrimmer(false);
    toast.success(`Trim applied: ${startTime.toFixed(1)}s to ${endTime.toFixed(1)}s`);
  };

  const generateExplanations = async () => {
    if (questions.length === 0) {
      toast.error('Please upload questions first');
      return;
    }

    if (!testData.transcriptText) {
      toast.error('Please provide a transcript first');
      return;
    }

    setGeneratingExplanations(true);
    try {
      console.log('🤖 Generating AI explanations with Gemini 3.0 Pro (via Edge Function)...');
      const { supabase } = await import('@/integrations/supabase/client');

      const { data, error } = await supabase.functions.invoke('generate-listening-explanations', {
        body: {
          questions,
          transcriptText: testData.transcriptText,
          transcriptJson: null
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to generate explanations');

      const updatedQuestions = questions.map((q, index) => {
        const explanationItem = data.explanations.find((e: any) => e.questionIndex === index + 1);
        return {
          ...q,
          explanation: explanationItem ? explanationItem.explanation : q.explanation
        };
      });

      setQuestions(updatedQuestions);

      const questionsJson = JSON.stringify(updatedQuestions);
      const file = new File([questionsJson], `questions-with-explanations.json`, {
        type: 'application/json'
      });
      updateTestData('csvFile', file);

      toast.success(`Generated explanations for ${data.explanations.length} questions!`);
    } catch (error: any) {
      console.error('Error generating explanations:', error);
      toast.error(`Failed to generate explanations: ${error.message}`);
    } finally {
      setGeneratingExplanations(false);
    }
  };

  const saveTest = async (audioFileOverride?: File) => {
    const audioFile = audioFileOverride || testData.audioFile;

    if (!audioFile && !testData.existingAudioUrl && questions.length === 0) {
      toast.error('Please upload either an audio file or add questions first');
      return;
    }

    setSaving(true);
    try {
      let audioUrl = testData.existingAudioUrl;
      console.log('💾 Starting save with existingAudioUrl:', audioUrl);

      if (audioFile) {
        console.log('📤 Uploading audio to Cloudflare R2...');
        const audioResult = await uploadAudio(audioFile);
        audioUrl = audioResult.url;
        console.log('✅ Audio uploaded successfully:', audioUrl);
      }

      let transcriptJson = null;
      if (testData.transcriptText.trim() && audioUrl) {
        setGeneratingTimestamps(true);
        try {
          console.log('🎙️ Generating timestamps for transcript...');
          const { supabase } = await import('@/integrations/supabase/client');
          const { data, error } = await supabase.functions.invoke('generate-transcript-timestamps', {
            body: {
              audioUrl,
              transcript: testData.transcriptText
            }
          });

          if (error) throw error;
          if (!data.success) throw new Error(data.error || 'Failed to generate timestamps');

          transcriptJson = data.timestamps;
          console.log('✅ Timestamps generated successfully');
          toast.success('Transcript timestamps generated!');
        } catch (error) {
          console.error('Error generating timestamps:', error);
          toast.error('Failed to generate timestamps, but saving test anyway.');
        } finally {
          setGeneratingTimestamps(false);
        }
      }

      let answerImageUrl = null;
      if (testData.answerImageFile) {
        console.log('📤 Uploading answer image...');
        const imageResult = await uploadAudio(testData.answerImageFile);
        answerImageUrl = imageResult.url;
        console.log('✅ Answer image uploaded:', answerImageUrl);
      }

      const questionsToSave = questions.length > 0 ? questions : [];

      const { supabase } = await import('@/integrations/supabase/client');

      const dataToSave = {
        testId,
        testData: {
          title: testData.title || `IELTS Listening Test ${testId}`,
          instructions: testData.instructions,
          audioUrl,
          transcriptText: testData.transcriptText,
          transcriptJson,
          answerImageUrl,
          referenceImageUrl: testData.referenceImageUrl,
          totalParts,
          partConfigs,
          partQuestionCounts // Legacy compatibility
        },
        questions: questionsToSave.map((q, i) => {
          const part = q.part_number || getPartFromIndex(i);
          const questionInPart = q.question_number_in_part || getQuestionNumberInPartFromIndex(i);
          const isFirstOfPart = questionInPart === 1;
          const partConfig = partConfigs[part] || DEFAULT_PART_CONFIG;
          return {
            ...q,
            part_number: part,
            question_number_in_part: questionInPart,
            question_type: q.question_type || partConfig.questionType,
            explanation: explanations[i] || q.explanation || '',
            passage_text: isFirstOfPart ? partConfig.instruction : null,
            section_instruction: isFirstOfPart ? partConfig.instruction : null
          };
        })
      };

      console.log('💾 Saving test via Edge Function with audioUrl:', audioUrl);

      const { data, error } = await supabase.functions.invoke('save-listening-test', {
        body: dataToSave
      });

      if (error) {
        console.error('Edge Function error:', error);
        throw new Error(`Edge Function failed: ${error.message || JSON.stringify(error)}`);
      }
      if (!data || !data.success) {
        const errorMsg = data?.error || 'Failed to save test';
        console.error('Edge Function returned error:', errorMsg);
        throw new Error(errorMsg);
      }

      console.log('✅ Test saved successfully!');
      toast.success('Test saved successfully!');

      setTestData(prev => ({
        ...prev,
        saved: true,
        existingAudioUrl: audioUrl || prev.existingAudioUrl,
        audioFile: null,
      }));
      setSaving(false);

    } catch (error: any) {
      console.error('Error saving test:', error);
      toast.error(`Failed to save test: ${error.message}`);
      setSaving(false);
    }
  };

  // Get question type config
  const getQuestionTypeConfig = (type: string) => {
    return QUESTION_TYPES[type as QuestionType] || QUESTION_TYPES.fill_blank;
  };

  // Render question in IELTS student style based on question type
  const renderStudentQuestion = (q: any) => {
    const globalNum = q.question_number || q.globalNumber || q.questionInPart;
    const qType = q.question_type || 'fill_blank';

    // Multiple choice matching (A-H style)
    if (qType === 'multiple_choice_matching' || (q.options && q.options.length > 0 && qType !== 'multiple_choice')) {
      return (
        <tr key={`q-${globalNum}`} className="border-b border-gray-100">
          <td colSpan={2} className="py-3">
            <div className="flex items-center gap-2">
              <span className="text-red-600 font-bold text-lg">({globalNum})</span>
              <span className="text-[#1a1a1a] font-medium text-lg">{q.question_text}</span>
              <span className="flex-1 border-b-2 border-dotted border-red-500 min-w-[60px]"></span>
            </div>
          </td>
        </tr>
      );
    }

    // Standard multiple choice (A, B, C)
    if (qType === 'multiple_choice') {
      return (
        <tr key={`q-${globalNum}`} className="border-b border-gray-100">
          <td colSpan={2} className="py-3">
            <div className="flex items-start gap-2 mb-2">
              <span className="text-red-600 font-bold text-lg">({globalNum})</span>
              <span className="text-[#1a1a1a] font-medium text-lg">{q.question_text}</span>
            </div>
            <div className="pl-8 space-y-1">
              {(q.options || []).map((opt: string, idx: number) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-blue-600 font-semibold">({String.fromCharCode(65 + idx)})</span>
                  <span className="text-blue-600">{opt}</span>
                </div>
              ))}
            </div>
          </td>
        </tr>
      );
    }

    // Table completion - show as row with blank
    if (qType === 'table_completion') {
      return (
        <React.Fragment key={`frag-${globalNum}`}>
          <tr key={`q-${globalNum}`} className="border-b border-gray-100/50">
            <td className="py-3 pr-8 text-[#1a1a1a] font-medium text-lg align-top whitespace-pre-wrap">
              {/* Show Label (Column 1/Context) */}
              {q.label}
              {q.is_info_row && q.table_headers && (
                <div className="text-[10px] text-stone-400 uppercase font-bold mb-1">{q.table_headers[0]}</div>
              )}
            </td>
            <td className="py-3 align-top">
              {q.is_info_row ? (
                <div>
                  {q.value || q.question_text}
                  {q.is_info_row && q.table_headers && q.table_headers[1] && (
                    <div className="text-[10px] text-stone-400 uppercase font-bold mb-1">{q.table_headers[1]}</div>
                  )}
                </div>
              ) : (
                <span className="inline-flex flex-col items-start">
                  {q.value && <span className="text-[#1a1a1a] font-semibold text-lg mr-2 mb-1">{q.value}</span>}
                  <div className="flex items-baseline">
                    <span className="text-red-600 font-bold text-lg mr-1">({globalNum})</span>
                    <span className="inline-block w-[150px] border-b-2 border-dotted border-red-400 bg-stone-50/50"></span>
                  </div>
                </span>
              )}
            </td>
          </tr>
        </React.Fragment>
      );
    }

    // Fallback logic for others...
    if (qType === 'map_labeling' || qType === 'plan_labeling') {
      return (
        <tr key={`q-${globalNum}`} className="border-b border-gray-100">
          <td colSpan={2} className="py-3">
            <div className="flex items-center gap-2">
              <span className="text-red-600 font-bold text-lg">({globalNum})</span>
              <span className="inline-block w-[150px] border-b-2 border-dotted border-red-500"></span>
              {q.question_text && <span className="text-[#1a1a1a] text-lg">{q.question_text}</span>}
            </div>
          </td>
        </tr>
      );
    }

    return (
      <tr key={`q-${globalNum}`} className="border-b border-gray-100">
        <td className="py-3 pr-8 text-[#1a1a1a] font-semibold text-lg whitespace-nowrap">
          {q.label || `Question ${globalNum}`}
        </td>
        <td className="py-3">
          <span className="inline-flex items-baseline">
            {q.value && <span className="text-[#1a1a1a] font-semibold text-lg mr-2">{q.value}</span>}
            <span className="text-red-600 font-bold text-lg">({globalNum})</span>
            <span className="inline-block w-[180px] border-b-2 border-dotted border-red-400 ml-2"></span>
          </span>
        </td>
      </tr>
    );
  };

  const handleSmartImport = (importedQuestions: any[]) => {
    // Replace current questions with imported ones
    // Note: This overwrites existing manually added questions if any, which is usually expected for a "paste whole test" action
    // We Map them to ListeninQuestion type
    const mappedQuestions: ListeningQuestion[] = importedQuestions.map((q, idx) => ({
      question_number: q.question_number,
      question_text: q.question_text,
      question_type: q.question_type,
      options: q.options,
      correct_answer: q.correct_answer || '',
      explanation: '',
      part_number: q.part_number,
      question_number_in_part: 0, // Will be recalculated
      is_info_row: q.is_info_row,
      label: q.label,
      value: q.value,
      section_header: q.section_header,
      table_headers: q.table_headers
    }));

    setQuestions(mappedQuestions);

    // Update Parts Configuration
    const maxPart = Math.max(...importedQuestions.map(q => q.part_number || 1), totalParts);
    if (maxPart > totalParts) {
      setTotalParts(maxPart);
      setPartConfigs(prev => {
        const next = { ...prev };
        for (let i = totalParts + 1; i <= maxPart; i++) {
          next[i] = { ...DEFAULT_PART_CONFIG };
        }
        return next;
      });
    }

    // Update question counts per part
    const partCounts: Record<number, number> = {};
    const partInstructions: Record<number, string> = {};
    const parttypes: Record<number, string> = {};

    importedQuestions.forEach(q => {
      const p = q.part_number || 1;
      if (q.question_number > 0) {
        partCounts[p] = (partCounts[p] || 0) + 1;
      }
      // Capture instructions if available in questions
      if (q.section_header && !partInstructions[p]) partInstructions[p] = q.section_header;
      if (q.question_type && !parttypes[p]) parttypes[p] = q.question_type;
    });

    setPartConfigs(prev => {
      const next = { ...prev };
      // Ensure all parts exist in config
      for (let i = 1; i <= maxPart; i++) {
        if (!next[i]) next[i] = { ...DEFAULT_PART_CONFIG };

        if (partCounts[i] !== undefined) {
          next[i].questionCount = partCounts[i];
        }
        if (partInstructions[i]) {
          // Try to extract just the instruction part if header is long
          next[i].instruction = partInstructions[i];
        }
        if (parttypes[i]) {
          next[i].questionType = parttypes[i] as QuestionType;
        }
      }
      return next;
    });

    toast.success(`Imported ${importedQuestions.length} questions from text`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fdfaf3] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto"></div>
          <p className="mt-2 text-sm text-[#5a4a3f]">Loading Listening Management...</p>
        </div>
      </div>
    );
  }

  if (!admin) return null;

  return (
    <AdminLayout
      title={`${effectiveTestType.toUpperCase()} Test ${testId} - Listening Management`}
      showBackButton={true}
      backPath={backPath}
      onBackClick={() => navigate(backPath)}
    >
      <div className="space-y-6 bg-[#fdfaf3] min-h-screen p-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#2f241f]">
              {effectiveTestType.toUpperCase()} Test {testId} - Listening Management
            </h1>
            <p className="text-sm text-[#5a4a3f] mt-1">
              Note theme: warm paper, per-part review with student preview
            </p>
          </div>
          <Badge variant="secondary" className="text-sm bg-amber-100 text-amber-900 border-amber-200">
            Test {testId}
          </Badge>
        </div>

        {/* Main Content Card */}
        <Card className="border border-[#e0d6c7] bg-[#fdfaf3] shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-[#2f241f]">
                {testData.saved ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <Circle className="w-5 h-5 text-[#a89a8c]" />
                )}
                Listening Test - {totalParts} Part{totalParts > 1 ? 's' : ''} ({getTotalQuestions()} Questions)
              </CardTitle>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={removePart}
                    disabled={totalParts <= MIN_PARTS}
                    className="h-8 w-8 p-0 border-amber-200"
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <span className="text-sm font-medium text-[#2f241f] min-w-[60px] text-center">{totalParts} Parts</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addPart}
                    disabled={totalParts >= MAX_PARTS}
                    className="h-8 w-8 p-0 border-amber-200"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <Badge variant={testData.saved ? "default" : "outline"} className={testData.saved ? "bg-green-100 text-green-800 border-green-200" : "border-[#e0d6c7]"}>
                  {testData.saved ? 'Saved' : 'Not Saved'}
                </Badge>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Test Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#2f241f]">Test Name *</label>
              <Input
                placeholder={`IELTS Listening Test ${testId}`}
                value={testData.title}
                onChange={(e) => updateTestData('title', e.target.value)}
                className="max-w-md bg-white border-[#e0d6c7] focus:border-amber-400 focus:ring-amber-200 text-[#2f241f]"
              />
            </div>

            {/* Audio Upload */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#2f241f]">Audio File (All Parts) *</label>
              <div className="border-2 border-dashed border-[#e0d6c7] bg-white rounded-lg p-6 hover:bg-amber-50/50 transition-colors">
                <div className="flex items-center justify-center">
                  <div className="text-center">
                    <Headphones className="w-12 h-12 mx-auto mb-3 text-amber-600" />
                    <p className="text-sm text-[#5a4a3f] mb-3">Upload MP3 or WAV (30-40 minutes)</p>
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleAudioUpload(file);
                      }}
                      className="hidden"
                      id="audio-upload"
                    />
                    <Button
                      variant="outline"
                      onClick={() => document.getElementById('audio-upload')?.click()}
                      className="bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Choose Audio File
                    </Button>
                  </div>
                </div>
                {testData.audioFile && (
                  <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-green-800">✓ Audio file ready: {testData.audioFile.name}</p>
                        <p className="text-xs text-green-600 mt-1">Size: {(testData.audioFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setShowAudioTrimmer(true)} className="border-green-200 text-green-800">
                        <Scissors className="w-3 h-3 mr-2" />Trim
                      </Button>
                    </div>
                    <audio controls src={URL.createObjectURL(testData.audioFile)} className="w-full mt-3 h-8" />
                  </div>
                )}
                {!testData.audioFile && testData.existingAudioUrl && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-blue-800">✓ Audio file already uploaded</p>
                        <audio controls className="mt-2 w-full max-w-md">
                          <source src={testData.existingAudioUrl} type="audio/mpeg" />
                        </audio>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button variant="outline" size="sm" onClick={handleModifySavedAudio} className="border-blue-200 text-blue-800">
                          <Scissors className="w-3 h-3 mr-2" />Trim
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleDeleteAudio} className="border-red-200 text-red-600">
                          <Trash2 className="w-3 h-3 mr-2" />Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {showAudioTrimmer && testData.audioFile && (
              <AudioTrimmer audioFile={testData.audioFile} onTrimComplete={handleTrimComplete} />
            )}

            {/* Reference Image Upload */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#2f241f]">Reference Image (Optional)</label>
              <p className="text-xs text-[#5a4a3f]">Upload the original test image for reference in student preview</p>
              <div className="flex items-center gap-4">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleReferenceImageUpload(file);
                  }}
                  className="hidden"
                  id="reference-image-upload"
                />
                <Button
                  variant="outline"
                  onClick={() => document.getElementById('reference-image-upload')?.click()}
                  disabled={uploadingRefImage}
                  className="bg-white border-[#e0d6c7] text-[#2f241f] hover:bg-amber-50"
                >
                  {uploadingRefImage ? (
                    <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-amber-600 mr-2" />Uploading...</>
                  ) : (
                    <><ImageIcon className="w-4 h-4 mr-2" />Upload Reference Image</>
                  )}
                </Button>
                {testData.referenceImageUrl && (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-700">Reference image uploaded</span>
                    <Button variant="ghost" size="sm" onClick={() => updateTestData('referenceImageUrl', null)} className="text-red-500 h-6">
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
              {testData.referenceImageUrl && (
                <img src={testData.referenceImageUrl} alt="Reference" className="max-w-md rounded-lg border border-[#e0d6c7] mt-2" />
              )}
            </div>

            {/* Transcript */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#2f241f]">Transcript Text (Optional)</label>
              <Textarea
                placeholder="Paste the full transcript text here..."
                value={testData.transcriptText}
                onChange={(e) => updateTestData('transcriptText', e.target.value)}
                rows={6}
                className="font-mono text-sm bg-white border-[#e0d6c7] text-[#2f241f]"
              />
              {testData.transcriptText && (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-xs text-amber-900 flex items-center gap-2">
                    <Sparkles className="w-3 h-3" />Timestamps will be auto-generated when you save.
                  </p>
                </div>
              )}
            </div>





            {/* AI Question Extraction Tools */}
            <div className="space-y-4 border-t border-[#e0d6c7] pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[#2f241f]">Add Content</h3>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Smart Paste */}
                <Card className="bg-white border-[#e0d6c7] shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base text-[#2f241f] flex gap-2">
                      <FileText className="w-5 h-5 text-indigo-600" />
                      Paste Text / PDF
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-[#5a4a3f] mb-4">
                      Paste text directly from IELTS PDFs. Auto-detects tables, multiple choice, and note completion formats.
                    </p>
                    <SmartListeningPaste onImport={handleSmartImport} />
                  </CardContent>
                </Card>

                {/* Image Extraction */}
                <Card className="bg-white border-[#e0d6c7] shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base text-[#2f241f] flex gap-2">
                      <ImageIcon className="w-5 h-5 text-amber-600" />
                      Extract from Image
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <p className="text-sm text-[#5a4a3f]">
                        Upload a screenshot of the test. AI will identify questions and layout.
                      </p>
                      <ImageQuestionExtractor
                        testId={testId || ''}
                        testType={effectiveTestType}
                        initialImageFile={testData.answerImageFile}
                        onImageSelected={(file) => updateTestData('answerImageFile', file)}
                        onQuestionsExtracted={(extractedQuestions) => {
                          console.log('✨ AI extracted questions:', extractedQuestions);
                          setQuestions(extractedQuestions as ListeningQuestion[]);
                          const questionsJson = JSON.stringify(extractedQuestions);
                          const file = new File([questionsJson], `ai-extracted-questions.json`, { type: 'application/json' });
                          updateTestData('csvFile', file);
                          toast.success(`Ready to save ${extractedQuestions.length} items!`);
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Legacy Image Extraction Section - Keeping commented out or removed since now integrated above */}
            {/* <div className="space-y-4 border-t border-[#e0d6c7] pt-6">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-[#2f241f]">Extract Questions from Image *</label>

            {/* Preview Section - Side by Side Layout */}
            <div className="border-t border-[#e0d6c7] pt-6">
              <h3 className="text-lg font-semibold text-[#2f241f] flex items-center gap-2 mb-4">
                <Eye className="w-5 h-5" />
                Preview Comparison
              </h3>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Uploaded Image (Full View) */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-[#5a4a3f] flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    Uploaded Image (Original)
                  </h4>
                  <Card className="bg-white border-2 border-[#e0d6c7] overflow-hidden">
                    {testData.answerImageFile ? (
                      <div className="p-4">
                        <img
                          src={URL.createObjectURL(testData.answerImageFile)}
                          alt="Uploaded Question Image"
                          className="w-full h-auto rounded-lg border border-gray-200"
                          style={{ maxHeight: '600px', objectFit: 'contain' }}
                        />
                      </div>
                    ) : testData.referenceImageUrl ? (
                      <div className="p-4">
                        <img
                          src={testData.referenceImageUrl}
                          alt="Reference"
                          className="w-full h-auto rounded-lg border border-gray-200"
                          style={{ maxHeight: '600px', objectFit: 'contain' }}
                        />
                      </div>
                    ) : (
                      <div className="p-8 text-center text-[#5a4a3f]">
                        <ImageIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p className="text-sm">No image uploaded yet</p>
                        <p className="text-xs text-gray-400 mt-1">Upload an image above to see it here</p>
                      </div>
                    )}
                  </Card>
                </div>

              </div>

            </div>

            {/* Full Test Preview & Editor */}
            <div className="space-y-8 border-t border-[#e0d6c7] pt-8">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-[#2f241f] flex items-center gap-2">
                  <Eye className="w-6 h-6 text-amber-600" />
                  Test Preview & Editor
                </h3>
                <div className="flex gap-2">
                  <Button onClick={addPart} variant="outline" size="sm" className="border-amber-200 text-amber-900 hover:bg-amber-50">
                    <Plus className="w-4 h-4 mr-1" /> Add Part
                  </Button>
                  <Button onClick={removePart} variant="outline" size="sm" className="border-red-200 text-red-700 hover:bg-red-50">
                    <Minus className="w-4 h-4 mr-1" /> Remove Part
                  </Button>
                </div>
              </div>

              {Array.from({ length: totalParts }, (_, i) => i + 1).map((part) => {
                const partQs = groupedQuestions[part] || [];
                const partConfig = partConfigs[part] || DEFAULT_PART_CONFIG;
                const TypeIcon = QUESTION_TYPES[partConfig.questionType]?.icon || FileText;

                // Sort questions by index
                const sortedQs = [...partQs].sort((a, b) => (a.originalIndex || 0) - (b.originalIndex || 0));

                return (
                  <Card key={part} className="bg-white border text-left border-[#e0d6c7] shadow-sm overflow-hidden">
                    {/* Part Header */}
                    <div className="bg-amber-100/50 px-6 py-4 border-b border-[#e0d6c7] flex flex-col md:flex-row md:items-center gap-4 justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-lg font-bold text-[#2f241f]">Part {part}</h4>
                          <Badge variant="outline" className="bg-white border-amber-200 text-amber-800">
                            {partQs.length} Questions
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[#5a4a3f]">
                          <TypeIcon className="w-3 h-3" />
                          {QUESTION_TYPES[partConfig.questionType]?.label}
                        </div>
                      </div>

                      {/* Part Settings (Instruction & Type) */}
                      <div className="flex-1 flex flex-col md:flex-row gap-4 items-start md:items-center justify-end">
                        <div className="w-full md:w-auto">
                          <label className="text-[10px] uppercase font-bold text-amber-700/60 block mb-1">Type</label>
                          <Select
                            value={partConfigs[part]?.questionType || 'note_completion'}
                            onValueChange={(value) => updatePartConfig(part, { questionType: value as QuestionType })}
                          >
                            <SelectTrigger className="h-8 text-xs w-[160px] bg-white border-amber-200">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(QUESTION_TYPES).map(([key, config]) => (
                                <SelectItem key={key} value={key} className="text-xs">{config.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="w-full md:w-[400px]">
                          <label className="text-[10px] uppercase font-bold text-amber-700/60 block mb-1">Instruction</label>
                          <Input
                            value={partConfigs[part]?.instruction || ''}
                            onChange={(e) => updatePartConfig(part, { instruction: e.target.value })}
                            className="h-8 text-sm bg-white border-amber-200"
                            placeholder="e.g. Write NO MORE THAN TWO WORDS..."
                          />
                        </div>
                      </div>
                    </div>

                    {/* Content Preview */}
                    <CardContent className="p-0">
                      {sortedQs.length === 0 ? (
                        <div className="p-8 text-center text-stone-400">
                          <p className="text-sm italic">No questions imported for Part {part}</p>
                        </div>
                      ) : (
                        <div className="p-6 overflow-x-auto">
                          <table className="w-full max-w-4xl">
                            <tbody>
                              {sortedQs.map((q) => (
                                <React.Fragment key={q.originalIndex}>
                                  {/* Edit Wrap */}
                                  <tr className="group">
                                    <td colSpan={2} className="p-0">
                                      <div className="relative">
                                        <div className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-bl-lg"
                                            onClick={() => openEditModal(q, q.originalIndex)}
                                          >
                                            <Edit2 className="w-3 h-3" />
                                          </Button>
                                        </div>
                                        <table className="w-full">
                                          <tbody>
                                            {renderStudentQuestion(q)}
                                          </tbody>
                                        </table>
                                      </div>
                                    </td>
                                  </tr>
                                </React.Fragment>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}


              {/* Bottom Actions */}
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-8 pt-6 border-t border-[#e0d6c7]">
                <div className="text-sm text-amber-800 bg-amber-50 px-4 py-2 rounded-lg border border-amber-100">
                  <span className="font-bold mr-2">Status:</span>
                  {testData.saved ? (
                    <span className="text-green-600 flex items-center inline-flex gap-1"><CheckCircle className="w-4 h-4" /> Saved</span>
                  ) : (
                    <span className="text-amber-600">Unsaved changes</span>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowBulkAnswerDialog(true)}
                    className="border-amber-200 text-amber-900 hover:bg-amber-50"
                  >
                    <ClipboardList className="w-4 h-4 mr-2" /> Import Answers
                  </Button>

                  <Button
                    variant="outline"
                    onClick={generateExplanations}
                    disabled={generatingExplanations || !testData.transcriptText}
                    className="border-amber-200 text-amber-900 hover:bg-amber-50"
                  >
                    {generatingExplanations ? (
                      <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-amber-500 mr-2" />Generating...</>
                    ) : (
                      <><Sparkles className="w-4 h-4 mr-2" />Generate Explanations</>
                    )}
                  </Button>

                  <Button
                    onClick={() => saveTest()}
                    disabled={saving}
                    className="bg-green-600 hover:bg-green-700 text-white min-w-[200px]"
                    size="lg"
                  >
                    {saving ? (
                      <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />Saving...</>
                    ) : (
                      <><Save className="w-4 h-4 mr-2" />Save Test</>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Question Dialog - Simplified */}
      <Dialog open={editingQuestion !== null} onOpenChange={(open) => !open && setEditingQuestion(null)}>
        <DialogContent className="max-w-md bg-[#fdfaf3] border-[#e0d6c7]">
          <DialogHeader>
            <DialogTitle className="text-[#2f241f]">Edit Question {editingQuestion?.question_number}</DialogTitle>
          </DialogHeader>
          {editingQuestion && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-[#2f241f]">Question Text</label>
                <Textarea
                  value={editingQuestion.question_text || ''}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, question_text: e.target.value })}
                  rows={3}
                  className="mt-1 bg-white border-[#e0d6c7]"
                  placeholder="Enter question text. Use newlines for extra context/rows (e.g. 'Make Allegro')."
                />
                <p className="text-xs text-[#5a4a3f] mt-1">Tip: Use newlines to add informational rows before the question.</p>
              </div>

              <div>
                <label className="text-sm font-medium text-[#2f241f]">Correct Answer</label>
                <Input
                  value={editingQuestion.correct_answer || ''}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, correct_answer: e.target.value })}
                  className="mt-1 bg-white border-[#e0d6c7]"
                  placeholder="Enter correct answer..."
                />
              </div>

              {/* Options - only show if question has options */}
              {editingQuestion.options && editingQuestion.options.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-[#2f241f]">Options (one per line)</label>
                  <Textarea
                    value={(editingQuestion.options || []).join('\n')}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, options: e.target.value.split('\n').filter(o => o.trim()) })}
                    rows={3}
                    className="mt-1 bg-white border-[#e0d6c7]"
                  />
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-[#2f241f]">Section Label (Optional)</label>
                <Input
                  value={editingQuestion.section_label || ''}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, section_label: e.target.value })}
                  placeholder="e.g., The Gherkin Building"
                  className="mt-1 bg-white border-[#e0d6c7]"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingQuestion(null)} className="border-[#e0d6c7]">Cancel</Button>
            <Button onClick={saveEditedQuestion} className="bg-amber-600 hover:bg-amber-700 text-white">
              <Save className="w-4 h-4 mr-2" />Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Answer Import Dialog */}
      <Dialog open={showBulkAnswerDialog} onOpenChange={setShowBulkAnswerDialog}>
        <DialogContent className="max-w-4xl bg-[#fdfaf3] border-[#e0d6c7] h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-[#2f241f]">Import Answers (Bulk)</DialogTitle>
            <DialogDescription>
              Paste your list on the left. Verify detected answers on the right.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 min-h-0 py-4">
            {/* Left: Input */}
            <div className="flex flex-col gap-2 h-full">
              <Label className="text-stone-700 font-bold">Paste Text</Label>
              <Textarea
                value={bulkRawAnswers}
                onChange={(e) => setBulkRawAnswers(e.target.value)}
                placeholder={`1. Saturday 25\n2. 55\n3. knives/ forks\n...`}
                className="flex-1 font-mono text-base bg-white border-[#e0d6c7] text-stone-900 resize-none focus-visible:ring-amber-500 p-4"
              />
            </div>

            {/* Right: Preview Grid */}
            <div className="flex flex-col gap-2 h-full min-h-0">
              <div className="flex justify-between items-center">
                <Label className="text-stone-700 font-bold">Preview ({parsedBulkAnswers.size} detected)</Label>
              </div>
              <div className="flex-1 border border-[#e0d6c7] rounded-md bg-white overflow-hidden flex flex-col">
                <ScrollArea className="flex-1 p-3">
                  <div className="grid grid-cols-2 gap-2">
                    {Array.from(parsedBulkAnswers.entries()).sort((a, b) => a[0] - b[0]).map(([num, text]) => (
                      <div key={num} className="flex items-center gap-2 p-2 rounded bg-amber-50 border border-amber-100">
                        <Badge className="bg-amber-500 hover:bg-amber-600 text-white w-6 h-6 flex items-center justify-center p-0 text-xs shrink-0">
                          {num}
                        </Badge>
                        <span className="text-sm font-medium text-stone-900 truncate" title={text}>{text}</span>
                      </div>
                    ))}
                    {parsedBulkAnswers.size === 0 && (
                      <div className="col-span-2 text-center text-stone-400 italic py-10">
                        No answers detected yet...
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkAnswerDialog(false)} className="border-[#e0d6c7]">Cancel</Button>
            <Button onClick={handleBulkAnswerImport} className="bg-amber-600 hover:bg-amber-700 text-white">
              Apply {parsedBulkAnswers.size} Answers
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminIELTSListening;
