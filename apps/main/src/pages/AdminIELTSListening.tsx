import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, Upload, Circle, Headphones, Sparkles, Image, Scissors, Trash2 } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useAdminContent } from "@/hooks/useAdminContent";
import { ImageQuestionExtractor } from "@/components/ImageQuestionExtractor";
import { AudioTrimmer } from "@/components/AudioTrimmer";
import { toast } from "sonner";

interface ListeningTestData {
  title: string;
  instructions: string;
  audioFile: File | null;
  existingAudioUrl: string | null;
  csvFile: File | null;
  transcriptText: string;
  answerImageFile: File | null;
  saved: boolean;
  audioTrimStart?: number;
  audioTrimEnd?: number;
}

const AdminIELTSListening = () => {
  const navigate = useNavigate();
  const { testType, testId } = useParams<{ testType: string; testId: string; }>();
  const { admin, loading } = useAdminAuth();
  const { listContent, createContent, uploadAudio } = useAdminContent();

  const [testData, setTestData] = useState<ListeningTestData>({
    title: "",
    instructions: "",
    audioFile: null,
    existingAudioUrl: null,
    csvFile: null,
    transcriptText: "",
    answerImageFile: null,
    saved: false
  });
  const [saving, setSaving] = useState(false);
  const [generatingTimestamps, setGeneratingTimestamps] = useState(false);
  const [generatingExplanations, setGeneratingExplanations] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [explanations, setExplanations] = useState<{ [key: number]: string }>({});
  const [showAudioTrimmer, setShowAudioTrimmer] = useState(false);

  const [questions, setQuestions] = useState<any[]>([]);


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

      // 1. Find the test
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
      console.log('📼 Audio URL from tests table:', (testRecord as any).audio_url);

      // 2. Fetch questions
      const { data: questions } = await supabase
        .from('questions')
        .select('*')
        .eq('test_id', testRecord.id)
        .order('question_number_in_part', { ascending: true });

      console.log('📊 Found', questions?.length || 0, 'questions for this test');

      // Get audio URL from tests table first, fallback to questions
      const audioUrl = (testRecord as any).audio_url || (questions && questions.length > 0 ? questions[0].audio_url : null);
      console.log('📼 Final audio URL to use:', audioUrl);

      // Handle case with questions
      if (questions && questions.length > 0) {
        const firstQuestion = questions[0];

        // Reconstruct CSV-like structure for questions
        const reconstructedQuestions = questions.map(q => ({
          question_text: q.question_text,
          question_type: q.question_type,
          options: q.choices ? (q.choices.includes(';') ? q.choices.split(';') : [q.choices]) : [],
          correct_answer: q.correct_answer,
          explanation: q.explanation
        }));

        setQuestions(reconstructedQuestions);

        const questionsData = JSON.stringify(reconstructedQuestions);
        const file = new File([questionsData], `existing-questions.json`, {
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
          saved: true
        });

        // Show toast if audio exists
        if (audioUrl) {
          toast.success(`Existing audio loaded: ${audioUrl.split('/').pop()}`);
        } else {
          console.warn('⚠️ No audio URL found in database for this test');
        }
      } else {
        // Handle case with NO questions - load from tests table
        console.log('⚠️ No questions found, loading audio from tests table');

        setTestData(prev => ({
          ...prev,
          title: testRecord.test_name,
          existingAudioUrl: audioUrl || null,
          saved: true
        }));

        if (audioUrl) {
          console.log('✅ Audio URL loaded from tests table:', audioUrl);
          toast.success(`Existing audio loaded: ${audioUrl.split('/').pop()}`);
        } else {
          console.warn('⚠️ No audio URL found in tests table');
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

  const handleCSVUpload = (uploadedQuestions: any[]) => {
    console.log('CSV uploaded with questions:', uploadedQuestions);
    setQuestions(uploadedQuestions);
    const questionsData = JSON.stringify(uploadedQuestions);
    const file = new File([questionsData], `listening-questions.json`, {
      type: 'application/json'
    });
    updateTestData('csvFile', file);
  };

  const handleAudioUpload = (file: File) => {
    setTestData(prev => ({ ...prev, audioFile: file }));
    // Reset trim settings when new file is uploaded
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
    // No auto-save – admin must click the Save button
  };

  const handleTranscribeAudio = async (fileToTranscribe?: File) => {
    const file = fileToTranscribe || testData.audioFile;
    if (!file) {
      toast.error('Please upload an audio file first');
      return;
    }

    setTranscribing(true);
    try {
      toast.info('Transcribing audio... This may take a few minutes.');

      const { supabase } = await import('@/integrations/supabase/client');

      // Create FormData for the edge function
      const formData = new FormData();
      formData.append('file', file);
      formData.append('language', 'en'); // Default to English for IELTS

      const { data, error } = await supabase.functions.invoke('transcribe-audio', {
        body: formData,
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Transcription failed');

      console.log('✅ Transcription result:', data.transcription);

      // Update transcript text
      updateTestData('transcriptText', data.transcription.text);

      toast.success('Audio transcribed successfully!');
    } catch (error: any) {
      console.error('Error transcribing audio:', error);
      toast.error(`Transcription failed: ${error.message}`);
    } finally {
      setTranscribing(false);
    }
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

      // If we have timestamps already generated, we should try to use them?
      // For now, we'll just pass the text and let the AI infer or use timestamps if we had them stored.
      // TODO: Pass transcriptJson if available.

      const { data, error } = await supabase.functions.invoke('generate-listening-explanations', {
        body: {
          questions,
          transcriptText: testData.transcriptText,
          transcriptJson: null
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to generate explanations');

      // Merge explanations into questions
      const updatedQuestions = questions.map((q, index) => {
        const explanationItem = data.explanations.find((e: any) => e.questionIndex === index + 1);
        return {
          ...q,
          explanation: explanationItem ? explanationItem.explanation : q.explanation
        };
      });

      setQuestions(updatedQuestions);

      // Update the file object too
      const questionsData = JSON.stringify(updatedQuestions);
      const file = new File([questionsData], `questions-with-explanations.json`, {
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

    // Allow saving if we have either audio or questions or existing audio
    if (!audioFile && !testData.existingAudioUrl && questions.length === 0) {
      toast.error('Please upload either an audio file or add questions first');
      return;
    }

    setSaving(true);
    try {
      let audioUrl = testData.existingAudioUrl; // Default to existing URL
      console.log('💾 Starting save with existingAudioUrl:', audioUrl);

      // Upload audio file if provided - using Cloudflare R2
      if (audioFile) {
        console.log('📤 Uploading audio to Cloudflare R2...');
        const audioResult = await uploadAudio(audioFile);
        audioUrl = audioResult.url;
        console.log('✅ Audio uploaded successfully:', audioUrl);
      } else {
        console.log('ℹ️ No new audio file to upload, using existing URL:', audioUrl);
      }

      // Generate timestamps if transcript is provided and we have an audio URL
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

      // Upload answer image if provided
      let answerImageUrl = null;
      if (testData.answerImageFile) {
        console.log('📤 Uploading answer image...');
        const imageResult = await uploadAudio(testData.answerImageFile); // Reusing uploadAudio as it handles generic file upload to R2
        answerImageUrl = imageResult.url;
        console.log('✅ Answer image uploaded:', answerImageUrl);
      }

      // Use the questions from state which might have updated explanations
      const questionsToSave = questions.length > 0 ? questions : [];

      if (questionsToSave.length === 0 && testData.csvFile) {
        // Fallback to parsing file if state is empty (shouldn't happen if loaded correctly)
        const fileContent = await testData.csvFile.text();
        try {
          const parsed = JSON.parse(fileContent);
          questionsToSave.push(...parsed);
        } catch {
          // CSV fallback logic...
          const lines = fileContent.split('\n').filter(line => line.trim());
          const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
          const parsed = lines.slice(1).map((line) => {
            const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
            const question: any = {};
            headers.forEach((header, i) => {
              question[header] = values[i] || '';
            });
            return question;
          }).filter(q => q.question_text && q.correct_answer);
          questionsToSave.push(...parsed);
        }
      }

      // 1. Save via Edge Function (bypasses RLS)
      const { supabase } = await import('@/integrations/supabase/client');

      const dataToSave = {
        testId,
        testData: {
          title: testData.title || `IELTS Listening Test ${testId}`,
          instructions: testData.instructions,
          audioUrl,
          transcriptText: testData.transcriptText,
          transcriptJson,
          answerImageUrl
        },
        questions: questionsToSave.map((q, i) => ({
          ...q,
          explanation: explanations[i] || q.explanation || ''
        }))
      };

      console.log('💾 Saving test via Edge Function with audioUrl:', audioUrl);
      console.log('📦 Data being sent to Edge Function:', JSON.stringify(dataToSave, null, 2));

      const { data, error } = await supabase.functions.invoke('save-listening-test', {
        body: dataToSave
      });

      console.log('Edge Function response:', { data, error });

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

      console.log('📝 About to update state with:', {
        saved: true,
        existingAudioUrl: audioUrl,
        audioFile: null
      });

      // Update state to preserve the audio URL and clear the file
      setTestData(prev => {
        const newState = {
          ...prev,
          saved: true,
          existingAudioUrl: audioUrl, // Explicitly preserve the audio URL
          audioFile: null // Clear the file object since it's now uploaded
        };
        console.log('📝 New state object created:', {
          audioFile: newState.audioFile,
          existingAudioUrl: newState.existingAudioUrl,
          saved: newState.saved
        });
        return newState;
      });
      setSaving(false);


    } catch (error: any) {
      console.error('Error saving test:', error);
      toast.error(`Failed to save test: ${error.message}`);
      setSaving(false);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading Listening Management...</p>
        </div>
      </div>
    );
  }

  if (!admin) return null;

  return (
    <AdminLayout
      title={`${testType?.toUpperCase()} Test ${testId} - Listening Management`}
      showBackButton={true}
      backPath={`/admin/${testType}/listening`}
      onBackClick={() => navigate(`/admin/${testType}/listening`)}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              {testType?.toUpperCase()} Test {testId} - Listening Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Create a complete listening test with one audio file and questions for all 4 parts (40 questions total)
            </p>
          </div>
          <Badge variant="secondary" className="text-sm">
            Test {testId}
          </Badge>
        </div>



        {/* Single Test Card */}
        <Card className="border border-border bg-card shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {testData.saved ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground" />
                )}
                Listening Test - All Parts (1-4)
              </CardTitle>
              <Badge variant={testData.saved ? "default" : "outline"}>
                {testData.saved ? 'Saved' : 'Not Saved'}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">

            {/* Audio Upload - Single File for All Parts */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Audio File (All 4 Parts) *
              </label>
              <p className="text-xs text-muted-foreground mb-2">
                Upload one continuous audio file containing all 4 parts of the listening test (approximately 30 minutes)
              </p>
              <div className="border-2 border-dashed border-muted-foreground/25 bg-muted/5 rounded-lg p-6 hover:bg-muted/10 transition-colors">
                <div className="flex items-center justify-center">
                  <div className="text-center">
                    <Headphones className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-3">
                      Upload MP3 or WAV audio file (recommended: 30-40 minutes)
                    </p>
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
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Choose Audio File
                    </Button>
                  </div>
                </div>
                {testData.audioFile && (
                  <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-green-800 dark:text-green-200">
                          ✓ Audio file ready: {testData.audioFile.name}
                        </p>
                        <p className="text-xs text-green-600 dark:text-green-300 mt-1">
                          Size: {(testData.audioFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAudioTrimmer(true)}
                        className="bg-white/50 hover:bg-white/80 dark:bg-black/20 dark:hover:bg-black/40 border-green-200 text-green-800 dark:text-green-200"
                      >
                        <Scissors className="w-3 h-3 mr-2" />
                        Trim Audio
                      </Button>
                    </div>
                    <audio
                      controls
                      src={URL.createObjectURL(testData.audioFile)}
                      className="w-full mt-3 h-8"
                    />
                  </div>
                )}
                {!testData.audioFile && testData.existingAudioUrl && (
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                          ✓ Audio file already uploaded
                        </p>
                        <p className="text-xs text-blue-600 dark:text-blue-300 mt-1 break-all">
                          {testData.existingAudioUrl.split('/').pop()}
                        </p>
                        <audio controls className="mt-2 w-full max-w-md">
                          <source src={testData.existingAudioUrl} type="audio/mpeg" />
                          Your browser does not support the audio element.
                        </audio>
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleModifySavedAudio}
                          className="bg-white/50 hover:bg-white/80 dark:bg-black/20 dark:hover:bg-black/40 border-blue-200 text-blue-800 dark:text-blue-200"
                        >
                          <Scissors className="w-3 h-3 mr-2" />
                          Trim / Modify
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleDeleteAudio}
                          className="bg-white/50 hover:bg-red-50 dark:bg-black/20 dark:hover:bg-red-900/20 border-red-200 text-red-600 dark:text-red-400"
                        >
                          <Trash2 className="w-3 h-3 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Audio Trimmer (Optional) */}
            {showAudioTrimmer && testData.audioFile && (
              <AudioTrimmer
                audioFile={testData.audioFile}
                onTrimComplete={handleTrimComplete}
              />
            )}

            {/* Transcript Input (Optional) */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Transcript Text <span className="text-muted-foreground font-normal">(Optional)</span>
              </label>
              <p className="text-xs text-muted-foreground mb-2">
                Paste the full transcript text here. AI will automatically sync it with the audio for the student viewer.
              </p>
              <Textarea
                placeholder="Paste the full transcript text here..."
                value={testData.transcriptText}
                onChange={(e) => updateTestData('transcriptText', e.target.value)}
                rows={6}
                className="font-mono text-sm"
              />
              {testData.transcriptText && (
                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200">
                  <p className="text-xs text-purple-800 dark:text-purple-200 flex items-center gap-2">
                    <Sparkles className="w-3 h-3" />
                    Timestamps will be auto-generated when you save!
                  </p>
                </div>
              )}
            </div>

            {/* Answer Image & Questions - AI Extraction */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Answer Image & Questions (All 40 Questions) *
              </label>
              <p className="text-xs text-muted-foreground mb-2">
                Upload an image of the questions/answer sheet. The image will be stored as the Answer Image, and you can extract questions from it using AI.
              </p>

              <ImageQuestionExtractor
                testId={testId || ''}
                testType={testType || 'ielts'}
                initialImageFile={testData.answerImageFile}
                onImageSelected={(file) => updateTestData('answerImageFile', file)}
                onQuestionsExtracted={(questions) => {
                  console.log('✨ AI extracted questions:', questions);
                  // Convert to JSON file format
                  const questionsData = JSON.stringify(questions);
                  const file = new File([questionsData], `ai-extracted-questions.json`, {
                    type: 'application/json'
                  });
                  setQuestions(questions);
                  updateTestData('csvFile', file);
                  toast.success(`Ready to save ${questions.length} AI-extracted questions!`);
                }}
              />
            </div>




            {/* Questions Review & Explanations */}
            {questions.length > 0 && (
              <div className="space-y-4 border-t pt-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Review Questions & Explanations</h3>
                  <Button
                    variant="outline"
                    onClick={generateExplanations}
                    disabled={generatingExplanations || !testData.transcriptText}
                    className="gap-2"
                  >
                    {generatingExplanations ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    ) : (
                      <Sparkles className="w-4 h-4 text-purple-500" />
                    )}
                    Generate Explanations with Gemini 3.0 Pro
                  </Button>
                </div>

                {!testData.transcriptText && (
                  <p className="text-sm text-amber-600 bg-amber-50 p-2 rounded">
                    ⚠️ You need to add a transcript above to generate AI explanations.
                  </p>
                )}

                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                  {questions.map((q, i) => (
                    <Card key={i} className="bg-card border border-border shadow-sm hover:border-primary/50 transition-colors">
                      <CardContent className="p-4 space-y-2">
                        <div className="flex justify-between items-start gap-4">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">Q{i + 1}</Badge>
                              <span className="font-medium">{q.question_text}</span>
                            </div>
                            <div className="text-sm text-muted-foreground pl-10">
                              Answer: <span className="font-semibold text-green-600">{q.correct_answer}</span>
                            </div>
                          </div>
                        </div>

                        {/* Explanation Section */}
                        <div className="pl-10 mt-2">
                          <div className="bg-white dark:bg-slate-800 p-3 rounded-md border border-border text-sm">
                            <div className="flex items-center gap-2 mb-1 text-purple-600 dark:text-purple-400 font-medium text-xs uppercase tracking-wider">
                              <Sparkles className="w-3 h-3" />
                              AI Explanation
                            </div>
                            {(explanations[i] || q.explanation) ? (
                              <p className="text-muted-foreground whitespace-pre-wrap">{explanations[i] || q.explanation}</p>
                            ) : (
                              <p className="text-muted-foreground/50 italic">No explanation generated yet. Click "Generate AI Explanations" above.</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Info Panel */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200">
              <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                💡 How this works:
              </h4>
              <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
                <li>Upload ONE audio file containing all 4 parts (Parts 1-4)</li>
                <li>Use AI to extract questions from your test images</li>
                <li>Questions 1-10 = Part 1, 11-20 = Part 2, 21-30 = Part 3, 31-40 = Part 4</li>
                <li>Audio will be uploaded to Cloudflare R2 for fast global delivery</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 justify-end pt-4 border-t">
              {testData.csvFile && testData.transcriptText && (
                <Button
                  variant="outline"
                  onClick={generateExplanations}
                  disabled={generatingExplanations || !testData.csvFile}
                  className="border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-300 dark:hover:bg-purple-900/20"
                  size="lg"
                >
                  {generatingExplanations ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600 mr-2"></div>
                      Generating AI Explanations...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate AI Explanations
                    </>
                  )}
                </Button>
              )}

              <Button
                onClick={() => saveTest()}
                disabled={saving || (!testData.audioFile && !testData.existingAudioUrl && questions.length === 0)}
                className="bg-primary hover:bg-primary/90 px-8"
                size="lg"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving Test...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Save Complete Listening Test
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminIELTSListening;