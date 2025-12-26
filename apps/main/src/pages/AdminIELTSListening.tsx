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
  MoveVertical, Loader2, Sparkles, ChevronUp, ChevronDown, Play, ClipboardPaste
} from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useAdminContent } from "@/hooks/useAdminContent";
import { AudioTrimmer } from "@/components/AudioTrimmer";
import { toast } from "sonner";
import { QuestionSectionEditor, SectionData } from "@/components/QuestionSectionEditor";
import { QuestionData, QuestionType } from "@/components/QuestionTypeRenderers";
import ListeningTest, { ListeningSection, ListeningQuestion } from "./ListeningTest";

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
  transcriptJson: any[] | null;
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

// Map detected question type to QuestionType
function mapToQuestionType(detected: string): QuestionType {
  if (detected === 'Multiple Choice') return 'multiple_choice';
  if (detected === 'List Selection' || detected.includes('TWO') || detected.includes('FOUR')) return 'multiple_select_2';
  if (detected === 'Summary Completion' || detected === 'Short Answer') return 'gap_completion';
  if (detected === 'Matching Features') return 'matching';
  if (detected.includes('Notes') || detected.includes('Completion')) return 'note_completion';
  return 'gap_completion';
}

// Parse question text for listening test (similar to reading admin)
function parseListeningQuestions(text: string, partNumber: number): SectionData[] {
  const sections: SectionData[] = [];

  // Split by "Questions X-Y" or "Questions X and Y" or "Question X" pattern
  const sectionPattern = /Questions?\s+(\d+)(?:\s*(?:[-–—]|and|to)\s*(\d+))?/gi;
  const allMatches = [...text.matchAll(sectionPattern)];

  if (allMatches.length === 0) return sections;

  // Filter to unique ranges
  const seenRanges = new Set<string>();
  const sectionMatches = allMatches.filter(match => {
    const startNum = parseInt(match[1]);
    const endNum = match[2] ? parseInt(match[2]) : startNum;
    const rangeKey = `${startNum}-${endNum}`;
    if (seenRanges.has(rangeKey)) return false;
    seenRanges.add(rangeKey);
    return true;
  });

  for (let i = 0; i < sectionMatches.length; i++) {
    const match = sectionMatches[i];
    const startNum = parseInt(match[1]);
    const endNum = match[2] ? parseInt(match[2]) : startNum;

    // Get section text
    let sectionStart = match.index!;
    while (sectionStart > 0 && text[sectionStart - 1] !== '\n') sectionStart--;

    let sectionEnd = text.length;
    for (let j = i + 1; j < sectionMatches.length; j++) {
      let nextStart = sectionMatches[j].index!;
      while (nextStart > 0 && text[nextStart - 1] !== '\n') nextStart--;
      sectionEnd = nextStart;
      break;
    }

    const sectionText = text.substring(sectionStart, sectionEnd);
    const lowerText = sectionText.toLowerCase();

    // Detect question type
    let questionType: QuestionType = 'multiple_choice';
    let instruction = 'Choose the correct letter A, B or C.';

    if (lowerText.includes('complete the table')) {
      questionType = 'table_completion';
      instruction = 'Complete the table below.';
    } else if (lowerText.includes('choose two') || lowerText.includes('which two')) {
      questionType = 'multiple_select_2';
      instruction = 'Choose TWO letters A-E.';
    } else if (lowerText.includes('choose four') || lowerText.includes('which four')) {
      questionType = 'multiple_select_4' as QuestionType;
      instruction = 'Choose FOUR letters A-G.';
    } else if (lowerText.includes('complete the notes') || lowerText.includes('no more than')) {
      questionType = 'note_completion';
      instruction = 'Complete the notes below. Write NO MORE THAN TWO WORDS for each answer.';
    } else if (lowerText.includes('match') || lowerText.includes('options')) {
      questionType = 'matching';
      instruction = 'Choose FOUR answers from the list.';
    } else if (lowerText.includes('choose the correct letter')) {
      questionType = 'multiple_choice';
      instruction = 'Choose the correct letter A, B or C.';
    }

    // Parse questions from section
    const questions: QuestionData[] = [];
    const lines = sectionText.split('\n');
    let currentQuestion: { num: number; text: string; options: string[] } | null = null;

    const pushCurrentQuestion = () => {
      if (currentQuestion) {
        questions.push({
          id: generateId(),
          questionNumber: currentQuestion.num,
          questionText: currentQuestion.text,
          questionType: questionType,
          options: currentQuestion.options.length > 0 ? currentQuestion.options : undefined,
          correctAnswer: ''
        });
      }
    };

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // 1. Check for Standard Numbering: "6. Text" or "6 Text"
      const standardMatch = trimmed.match(/^(\d+)\.?\s+(.+)/);

      // 2. Check for Embedded Numbering: "Address: (6)..."
      const embeddedMatches = Array.from(trimmed.matchAll(/\((\d+)\)/g));

      if (standardMatch) {
        const num = parseInt(standardMatch[1]);
        if (num >= startNum && num <= endNum) {
          pushCurrentQuestion();
          currentQuestion = { num, text: standardMatch[2].trim(), options: [] };
        }
      }
      else if (embeddedMatches.length > 0) {
        // Found one or more embedded questions
        for (const match of embeddedMatches) {
          const num = parseInt(match[1]);
          if (num >= startNum && num <= endNum) {
            pushCurrentQuestion();
            // Use the full line as text for embedded questions to preserve context
            currentQuestion = { num, text: trimmed, options: [] };
          }
        }
      }
      // 3. Match Option (A, B, C...)
      else if (/^[A-G]\s+.+/.test(trimmed) && currentQuestion) {
        currentQuestion.options.push(trimmed);
      }
      // 4. Continuation Text
      else if (currentQuestion && !trimmed.match(/^Questions?\s+\d+/i)) {
        currentQuestion.text += ' ' + trimmed;
      }
    }

    // Don't forget last question
    pushCurrentQuestion();

    // Create section if we have questions
    if (questions.length > 0) {
      sections.push({
        id: generateId(),
        title: startNum === endNum ? `Question ${startNum}` : `Questions ${startNum}-${endNum}`,
        instruction,
        questionType,
        questions
      });
    }
  }

  return sections;
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
    transcriptJson: null,
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
  const [magicImportingPart, setMagicImportingPart] = useState<number | null>(null);

  // Paste questions dialog state
  const [showPasteDialog, setShowPasteDialog] = useState(false);
  const [pastePartNumber, setPastePartNumber] = useState<number>(1);
  const [pasteQuestionsText, setPasteQuestionsText] = useState("");

  // Preview state
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);

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
        title: testRecord.test_name || "",
        instructions: testRecord.instructions || "",
        audioFile: null,
        existingAudioUrl: testRecord.audio_url || null,
        transcriptText: (testRecord as any).transcript_text || "",
        transcriptJson: (testRecord as any).transcript_json || null,
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

      if (error) {
        console.error("❌ Transcription error from Supabase:", error);
        // Supabase functions.invoke might return a string or an object in error.message
        const errorMessage = typeof error === 'object' && 'context' in error
          ? await (error as any).context.json().then((j: any) => j.error || j.message).catch(() => error.message)
          : error.message;
        throw new Error(errorMessage || "Edge Function returned an error");
      }

      if (!data.transcript) {
        if (data.error) throw new Error(data.error);
        throw new Error("No transcript data returned");
      }

      const transcriptText = data.transcript.map((t: any) => t.text).join(" ");
      setTestData(prev => ({
        ...prev,
        transcriptText,
        transcriptJson: data.transcript
      }));
      toast.success("Transcription complete!");
    } catch (error: any) {
      console.error("❌ Transcription failed:", error);
      toast.error("Transcription failed: " + (error.message || "Unknown error"), { duration: 10000 });
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

  // Handle paste questions
  const handlePasteQuestions = () => {
    if (!pasteQuestionsText.trim()) {
      toast.error("Please paste some question text first");
      return;
    }

    const parsedSections = parseListeningQuestions(pasteQuestionsText, pastePartNumber);

    if (parsedSections.length === 0) {
      toast.error("No questions found. Make sure text includes 'Questions X-Y' format.");
      return;
    }

    // Overwrite sections in the part
    setParts(prev => prev.map(p =>
      p.partNumber === pastePartNumber
        ? { ...p, sections: parsedSections }
        : p
    ));

    const totalQuestions = parsedSections.reduce((sum, s) => sum + s.questions.length, 0);
    toast.success(`Added ${parsedSections.length} section(s) with ${totalQuestions} questions to Part ${pastePartNumber}`);

    setShowPasteDialog(false);
    setPasteQuestionsText("");
  };

  // Open paste dialog for a part
  const openPasteDialog = (partNum: number) => {
    setPastePartNumber(partNum);
    setPasteQuestionsText("");
    setShowPasteDialog(true);
  };

  const handlePreview = () => {
    const transformedParts: { [key: number]: { section: ListeningSection, questions: ListeningQuestion[] } } = {};

    // Create audio URL if needed
    let audioUrl = testData.existingAudioUrl || "";
    if (testData.audioFile && !testData.existingAudioUrl) {
      audioUrl = URL.createObjectURL(testData.audioFile);
    }

    parts.forEach(part => {
      const partQuestions: ListeningQuestion[] = [];
      let partInstructions = "";

      part.sections.forEach(section => {
        // Append instructions logic could be refined but simple concat for now
        if (section.instruction) partInstructions += section.instruction + " ";

        section.questions.forEach(q => {
          partQuestions.push({
            id: q.id,
            question_text: q.questionText,
            question_number: q.questionNumber,
            options: q.options ? (Array.isArray(q.options) ? q.options : []) : undefined,
            correct_answer: q.correctAnswer,
            question_type: section.questionType,
            explanation: "",
            section_id: `part-${part.partNumber}`,
            structure_data: section.tableConfig ? { listeningTableConfig: section.tableConfig } : undefined,
            section_header: section.title,
            section_instruction: section.instruction
          });
        });
      });

      // Ensure instructions are at least defaulted
      if (!partInstructions.trim()) partInstructions = `Part ${part.partNumber}`;

      transformedParts[part.partNumber] = {
        section: {
          id: `part-${part.partNumber}`,
          title: `Part ${part.partNumber}`,
          section_number: part.partNumber,
          instructions: partInstructions,
          audio_url: audioUrl,
          transcript: testData.transcriptText,
          part_number: part.partNumber,
          photo_url: part.imageUrl || undefined
        },
        questions: partQuestions
      };
    });

    setPreviewData({
      parts: transformedParts,
      currentPart: parseInt(activePartTab) || 1
    });
    setShowPreview(true);
  };

  // Save test
  const handleMagicAIImport = async (partNumber: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setMagicImportingPart(partNumber);
    const toastId = toast.loading(`AI Magic Import: Analyzing Part ${partNumber}...`);

    try {
      // 1. Convert image to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      const imageBase64 = await base64Promise;

      // 2. Call Edge Function
      const { supabase } = await import('@/integrations/supabase/client');
      const { data, error } = await supabase.functions.invoke('gemini-question-extractor', {
        body: {
          imageBase64,
          extractionType: 'ielts-listening-sections',
          testType: 'IELTS'
        }
      });

      if (error) throw error;
      if (!data.success || !data.sections) {
        throw new Error(data.error || 'Failed to extract sections');
      }

      // 3. Map sections to SectionData
      const newSections: SectionData[] = data.sections.map((s: any) => ({
        id: generateId(),
        title: s.title || 'Questions',
        instruction: s.instruction || '',
        questionType: (s.questionType as QuestionType) || 'gap_completion',
        questions: (s.questions || []).map((q: any) => ({
          id: generateId(),
          questionNumber: q.questionNumber || 1,
          questionText: q.questionText || '',
          questionType: (s.questionType as QuestionType) || 'gap_completion',
          correctAnswer: q.correctAnswer || '',
          options: q.options || undefined
        })),
        tableConfig: s.tableConfig || undefined
      }));

      // 4. Overwrite sections for this part
      setParts(prev => prev.map(p =>
        p.partNumber === partNumber ? { ...p, sections: newSections } : p
      ));

      toast.success(`Success! Imported ${newSections.length} sections for Part ${partNumber}.`, { id: toastId });
    } catch (err: any) {
      console.error('Magic Import Error:', err);
      toast.error(`Import failed: ${err.message}`, { id: toastId });
    } finally {
      setMagicImportingPart(null);
      // Reset input
      event.target.value = '';
    }
  };

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
              passage_text: idx === 0 ? section.instruction : null,
              structure_data: section.questionType === 'table_completion' && section.tableConfig
                ? { listeningTableConfig: section.tableConfig }
                : null
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
          transcriptJson: testData.transcriptJson,
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
    bg: '#FFFAF0',
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
                <>
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
                  {/* Audio Player for admin to listen */}
                  <audio
                    controls
                    src={testData.existingAudioUrl}
                    className="w-full mt-3 rounded"
                    style={{ height: '40px' }}
                  />
                </>
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

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <Button
                          onClick={() => openPasteDialog(part.partNumber)}
                          variant="outline"
                          className="border-dashed hover:border-solid bg-white hover:bg-slate-50"
                        >
                          <ClipboardPaste className="h-4 w-4 mr-2" /> Paste Text
                        </Button>
                        <Button
                          variant="outline"
                          className="border-dashed hover:border-solid bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-900 relative h-10 overflow-hidden"
                          disabled={magicImportingPart === part.partNumber}
                        >
                          {magicImportingPart === part.partNumber ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Sparkles className="h-4 w-4 mr-2 text-amber-500" />
                          )}
                          AI Magic Import (Image)
                          <input
                            type="file"
                            accept="image/*"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={(e) => handleMagicAIImport(part.partNumber, e)}
                            disabled={magicImportingPart === part.partNumber}
                          />
                        </Button>
                        <Button
                          onClick={() => addSection(part.partNumber)}
                          variant="outline"
                          className="border-dashed hover:border-solid bg-white hover:bg-slate-50"
                        >
                          <Plus className="h-4 w-4 mr-2" /> Add Manually
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>

          {/* Bottom Actions */}
          <div className="flex items-center justify-between gap-4 py-4 sticky bottom-0 z-10 bg-[#FFFAF0]/95 backdrop-blur-sm p-4 border-t border-[#E8D5A3] shadow-lg rounded-t-xl mt-8">
            <div className="text-sm text-[#5d4e37] font-medium">
              {parts.reduce((acc, p) => acc + p.sections.reduce((sAcc, s) => sAcc + s.questions.length, 0), 0)} Questions Total
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handlePreview}
                className="border-[#E8D5A3] hover:bg-white text-[#5d4e37]"
              >
                <Eye className="h-4 w-4 mr-2" /> Student Preview
              </Button>
              <Button
                onClick={saveTest}
                disabled={saving}
                className="bg-[#8B6914] hover:bg-[#705510] text-white min-w-[150px]"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save Test
              </Button>
            </div>
          </div>

          {/* Preview Dialog */}
          <Dialog open={showPreview} onOpenChange={setShowPreview}>
            <DialogContent className="max-w-[95vw] w-full h-[95vh] p-0 overflow-hidden bg-[#fafafa]">
              <div className="h-full w-full overflow-y-auto">
                {previewData && (
                  <ListeningTest
                    previewData={previewData}
                    onPreviewClose={() => setShowPreview(false)}
                  />
                )}
              </div>
            </DialogContent>
          </Dialog>
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

        {/* Paste Questions Dialog */}
        <Dialog open={showPasteDialog} onOpenChange={setShowPasteDialog}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Paste Questions for Part {pastePartNumber}</DialogTitle>
              <DialogDescription>
                Paste IELTS listening questions text. Include headers like "Questions 11-14" or "Questions 15 and 16".
              </DialogDescription>
            </DialogHeader>
            <Textarea
              value={pasteQuestionsText}
              onChange={(e) => setPasteQuestionsText(e.target.value)}
              placeholder={`Part 2: Questions 11-14
Choose the correct letter A, B or C.

11. According to the speaker, why is it a good time for D-I-Y painting?
 A there are better products available now
 B materials cost less than they used to
 C people have more free time than before

12. What happened in 2009 in the UK?
 A a record volume of paint was sold
 B a large amount of paint was wasted
...`}
              className="min-h-[300px] font-mono text-sm"
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPasteDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handlePasteQuestions}>
                <ClipboardPaste className="h-4 w-4 mr-2" /> Parse & Import
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout >
  );
};

export default AdminIELTSListening;
