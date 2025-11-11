import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useAdminContent } from "@/hooks/useAdminContent";
import { useToast } from "@/hooks/use-toast";
import { Upload, Save, Mic, Plus, Clock, FileText, ArrowLeft, X } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";

interface SpeakingPrompt {
  id?: string;
  title: string;
  prompt_text: string;
  part_number: number;
  time_limit: number;
  sample_answer?: string;
  audio_url?: string;
  transcription?: string;
  is_locked?: boolean;
}

const AdminIELTSSpeaking = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const { uploadAudio, loading } = useAdminContent();
  const { toast } = useToast();
  
  const [testName, setTestName] = useState("");
  const [saving, setSaving] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isModifying, setIsModifying] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState("Loading test data...");
  
  // Part visibility toggles
  const [includePart2, setIncludePart2] = useState(true);
  const [includePart3, setIncludePart3] = useState(true);
  
  // Part 1: Interview (dynamic number of questions)
  const [part1Questions, setPart1Questions] = useState(4);
  const [part1Prompts, setPart1Prompts] = useState<SpeakingPrompt[]>([
    { title: "Interview Question 1", prompt_text: "Audio prompt", part_number: 1, time_limit: 2, transcription: "" },
    { title: "Interview Question 2", prompt_text: "Audio prompt", part_number: 1, time_limit: 2, transcription: "" },
    { title: "Interview Question 3", prompt_text: "Audio prompt", part_number: 1, time_limit: 2, transcription: "" },
    { title: "Interview Question 4", prompt_text: "Audio prompt", part_number: 1, time_limit: 2, transcription: "" }
  ]);

  // Part 2: Long Turn / Cue Card (text only, no sample answer)
  const [part2Prompt, setPart2Prompt] = useState<SpeakingPrompt>({
    title: "Cue Card",
    prompt_text: "",
    part_number: 2,
    time_limit: 3
  });

  // Part 3: Discussion (4-6 audio questions only)
  const [part3Questions, setPart3Questions] = useState(4);
  const [part3Prompts, setPart3Prompts] = useState<SpeakingPrompt[]>([
    { title: "Discussion Question 1", prompt_text: "Audio prompt", part_number: 3, time_limit: 2, transcription: "" },
    { title: "Discussion Question 2", prompt_text: "Audio prompt", part_number: 3, time_limit: 2, transcription: "" },
    { title: "Discussion Question 3", prompt_text: "Audio prompt", part_number: 3, time_limit: 2, transcription: "" },
    { title: "Discussion Question 4", prompt_text: "Audio prompt", part_number: 3, time_limit: 2, transcription: "" }
  ]);

  useEffect(() => {
    loadTestData();
  }, [testId]);

  const loadTestData = async () => {
    if (!testId) return;

    try {
      console.log('📝 Loading speaking test data for testId:', testId);
      setIsLoadingData(true);
      setLoadingMessage("Loading test data...");

      // Use REST API directly with timeout
      const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTkxMjEsImV4cCI6MjA2OTA5NTEyMX0.8jqO_ciOttSxSLZnKY0i5oJmEn79ROF53TjUMYhNemI';
      const baseUrl = 'https://cuumxmfzhwljylbdlflj.supabase.co';
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      try {
        // Fetch test details
        console.log('📝 Fetching speaking test details via REST API...');
        const testResponse = await fetch(
          `${baseUrl}/rest/v1/tests?id=eq.${testId}&select=*`,
          {
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json'
            },
            signal: controller.signal
          }
        );

        if (testResponse.ok) {
          const testResults = await testResponse.json();
          const test = testResults?.[0];
          if (test) {
            console.log('✅ Test loaded:', test.test_name);
            setTestName(test.test_name);
          }
        }

        // Fetch speaking prompts for this specific test
        console.log('📝 Fetching speaking prompts via REST API...');
        const promptsResponse = await fetch(
          `${baseUrl}/rest/v1/speaking_prompts?test_id=eq.${testId}&select=*&order=part_number.asc,title.asc`,
          {
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json'
            },
            signal: controller.signal
          }
        );

        if (promptsResponse.ok) {
          const prompts = await promptsResponse.json();
          console.log('✅ Speaking prompts loaded:', prompts?.length || 0);
          console.log('📝 Prompts by part:', {
            part1: prompts.filter((p: any) => p.part_number === 1).length,
            part2: prompts.filter((p: any) => p.part_number === 2).length,
            part3: prompts.filter((p: any) => p.part_number === 3).length
          });
          prompts.forEach((p: any, i: number) => {
            console.log(`  Prompt ${i+1}: Part ${p.part_number} - ${p.title} (ID: ${p.id})`);
          });

          if (prompts && prompts.length > 0) {
            const isTestLocked = prompts.some((p: any) => p.is_locked);
            setIsLocked(isTestLocked);

            const part1 = prompts.filter((p: any) => p.part_number === 1);
            const part2 = prompts.filter((p: any) => p.part_number === 2);
            const part3 = prompts.filter((p: any) => p.part_number === 3);

            if (part1.length > 0) {
              // Sort Part 1 prompts by question number extracted from title
              const sortedPart1 = part1.sort((a, b) => {
                const numA = parseInt(a.title.match(/(\d+)/)?.[1] || '0');
                const numB = parseInt(b.title.match(/(\d+)/)?.[1] || '0');
                return numA - numB;
              });

              console.log('📝 Loading part 1 prompts:', sortedPart1.length, 'questions');
              sortedPart1.forEach((p, i) => console.log(`  Part 1 Q${i+1}:`, p.title, p.id));

              // Update question count based on loaded data
              setPart1Questions(Math.max(sortedPart1.length, 1));

              const updatedPart1 = Array.from({ length: Math.max(sortedPart1.length, 1) }, (_, index) =>
                sortedPart1[index] || part1Prompts[index] || {
                  title: `Interview Question ${index + 1}`,
                  prompt_text: "Audio prompt",
                  part_number: 1,
                  time_limit: 2,
                  transcription: ""
                }
              );
              setPart1Prompts(updatedPart1);
            }

            if (part2.length > 0) {
              setPart2Prompt(part2[0]);
              setIncludePart2(true);
            } else {
              setIncludePart2(false);
            }

            if (part3.length > 0) {
              // Sort Part 3 prompts by question number extracted from title
              const sortedPart3 = part3.sort((a, b) => {
                const numA = parseInt(a.title.match(/(\d+)/)?.[1] || '0');
                const numB = parseInt(b.title.match(/(\d+)/)?.[1] || '0');
                return numA - numB;
              });

              console.log('📝 Loading part 3 prompts:', sortedPart3.length, 'questions');
              sortedPart3.forEach((p, i) => console.log(`  Part 3 Q${i+1}:`, p.title, p.id));

              const updatedPart3 = [...part3Prompts];
              sortedPart3.forEach((prompt: any, index: number) => {
                if (index < updatedPart3.length) {
                  updatedPart3[index] = {
                    ...updatedPart3[index],
                    ...prompt,
                    id: prompt.id
                  };
                } else {
                  updatedPart3.push(prompt);
                }
              });
              setPart3Prompts(updatedPart3);
              setPart3Questions(Math.max(sortedPart3.length, 1));
              setIncludePart3(true);
              console.log('📝 Final part 3 setup:', updatedPart3.length, 'questions displayed');
            } else {
              setIncludePart3(false);
            }
          }
        }

        console.log('✅ Speaking test data loading complete');
        setIsLoadingData(false);
        setLoadingMessage("Test data loading complete");
        // Clear the message after 3 seconds
        setTimeout(() => setLoadingMessage(""), 3000);
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      console.error('❌ Error loading speaking test data:', error);
      setIsLoadingData(false);
      setLoadingMessage("Failed to load test data");
      toast({
        title: "Error",
        description: "Failed to load test data",
        variant: "destructive"
      });
    }
  };

  const handleAudioUpload = async (file: File, partNumber: number, index?: number) => {
    try {
      const result = await uploadAudio(file);
      if (result.success) {
        console.log('🎵 Audio URL received:', result.url);
        
        // Test if URL is accessible
        try {
          const testResponse = await fetch(result.url, { method: 'HEAD' });
          console.log('✅ Audio URL accessible:', testResponse.status, testResponse.headers.get('content-type'));
        } catch (fetchError) {
          console.error('❌ Audio URL not accessible:', fetchError);
          toast({
            title: "Warning",
            description: "Audio uploaded but may not be publicly accessible. Check R2 bucket settings.",
            variant: "destructive"
          });
        }
        
        if (partNumber === 1 && index !== undefined) {
          const updated = [...part1Prompts];
          updated[index].audio_url = result.url;
          setPart1Prompts(updated);
        } else if (partNumber === 2) {
          setPart2Prompt(prev => ({ ...prev, audio_url: result.url }));
        } else if (partNumber === 3 && index !== undefined) {
          const updated = [...part3Prompts];
          updated[index].audio_url = result.url;
          setPart3Prompts(updated);
        }
        
        toast({
          title: "Success",
          description: "Audio uploaded successfully"
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Error",
        description: "Failed to upload audio",
        variant: "destructive"
      });
    }
  };

  const handleAudioRemove = (partNumber: number, index?: number) => {
    if (partNumber === 1 && index !== undefined) {
      const updated = [...part1Prompts];
      updated[index].audio_url = undefined;
      setPart1Prompts(updated);
    } else if (partNumber === 2) {
      setPart2Prompt(prev => ({ ...prev, audio_url: undefined }));
    } else if (partNumber === 3 && index !== undefined) {
      const updated = [...part3Prompts];
      updated[index].audio_url = undefined;
      setPart3Prompts(updated);
    }
    
    toast({
      title: "Success",
      description: "Audio removed"
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent, partNumber: number, index?: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isLocked && !isModifying) return;
    
    const files = Array.from(e.dataTransfer.files);
    const audioFile = files.find(file => file.type.startsWith('audio/'));
    
    if (audioFile) {
      await handleAudioUpload(audioFile, partNumber, index);
    } else {
      toast({
        title: "Invalid file",
        description: "Please drop an audio file",
        variant: "destructive"
      });
    }
  };

  const updatePart1Questions = (count: number) => {
    setPart1Questions(count);
    const newPrompts = Array.from({ length: count }, (_, index) =>
      part1Prompts[index] || {
        title: `Interview Question ${index + 1}`,
        prompt_text: "Audio prompt",
        part_number: 1,
        time_limit: 2,
        transcription: ""
      }
    );
    setPart1Prompts(newPrompts);
  };

  const updatePart3Questions = (count: number) => {
    setPart3Questions(count);
    const newPrompts = Array.from({ length: count }, (_, index) =>
      part3Prompts[index] || {
        title: `Discussion Question ${index + 1}`,
        prompt_text: "Audio prompt",
        part_number: 3,
        time_limit: 2,
        transcription: ""
      }
    );
    setPart3Prompts(newPrompts);
  };

  const savePart = async (partNumber: number) => {
    setSaving(true);
    try {
      let prompts: SpeakingPrompt[] = [];
      
      console.log(`🔄 Saving Part ${partNumber}...`);
      
      if (partNumber === 1) {
        // Save all Part 1 prompts regardless of audio (audio and transcription can be added separately)
        prompts = part1Prompts.map((prompt, index) => ({
          ...prompt,
          title: `Interview Question ${index + 1}`,
          prompt_text: "Audio prompt",
          part_number: 1,
          time_limit: 2
        }));
        console.log(`📝 Part 1 prompts to save:`, prompts);
      } else if (partNumber === 2) {
        if (!includePart2) {
          // Delete Part 2 prompts if Part 2 is disabled
          const { error: deleteError } = await supabase
            .from('speaking_prompts')
            .delete()
            .eq('test_id', testId)
            .eq('part_number', 2);
          
          if (deleteError) throw deleteError;
          toast({
            title: "Success",
            description: "Part 2 removed successfully"
          });
          return;
        }
        if (part2Prompt.prompt_text.trim()) {
          prompts = [part2Prompt];
        }
      } else if (partNumber === 3) {
        if (!includePart3) {
          // Delete Part 3 prompts if Part 3 is disabled
          const { error: deleteError } = await supabase
            .from('speaking_prompts')
            .delete()
            .eq('test_id', testId)
            .eq('part_number', 3);
          
          if (deleteError) throw deleteError;
          toast({
            title: "Success",
            description: "Part 3 removed successfully"
          });
          return;
        }
        // Save all Part 3 prompts regardless of audio (audio and transcription can be added separately)
        prompts = part3Prompts.map((prompt, index) => ({
          ...prompt,
          title: `Discussion Question ${index + 1}`,
          prompt_text: "Audio prompt",
          part_number: 3,
          time_limit: 2
        }));
        console.log(`📝 Part 3 prompts to save:`, prompts);
      }

      // For standalone prompts, we update existing prompts or create new ones
      if (prompts.length > 0) {
        console.log(`💾 Processing ${prompts.length} prompts...`);

        // For Part 1 and Part 3 (multiple questions per part), we need to handle each question individually
        if (partNumber === 1 || partNumber === 3) {
          const promptsArray = partNumber === 1 ? part1Prompts : part3Prompts;

          for (let index = 0; index < prompts.length; index++) {
            const prompt = prompts[index];

            // Check if prompt already exists for this test, part, and position
            const { data: existingPrompt } = await supabase
              .from('speaking_prompts')
              .select('id, audio_url')
              .eq('test_id', testId)
              .eq('part_number', prompt.part_number)
              .eq('title', prompt.title) // Match by title to identify specific question
              .maybeSingle();

            const promptData = {
              title: prompt.title,
              prompt_text: prompt.prompt_text,
              part_number: prompt.part_number,
              time_limit: prompt.time_limit,
              sample_answer: null,
              test_id: testId,
              transcription: prompt.transcription || null,
              audio_url: prompt.audio_url || null,
              is_locked: true
            };

            if (existingPrompt) {
              // Update existing prompt - preserve audio_url if not explicitly set
              const updateData = {
                ...promptData,
                audio_url: prompt.audio_url || existingPrompt.audio_url || null
              };
              console.log(`📝 Updating existing prompt: ${prompt.title}`);
              const { error: updateError } = await supabase
                .from('speaking_prompts')
                .update(updateData)
                .eq('id', existingPrompt.id);

              if (updateError) throw updateError;
            } else {
              // Insert new prompt
              console.log(`📝 Inserting new prompt: ${prompt.title}`);
              const { error: insertError } = await supabase
                .from('speaking_prompts')
                .insert(promptData);

              if (insertError) throw insertError;
            }
          }
        } else {
          // For Part 2 (single prompt per part)
          const prompt = prompts[0];

          // Check if prompt already exists for this test and part
          const { data: existingPrompt } = await supabase
            .from('speaking_prompts')
            .select('id, audio_url')
            .eq('test_id', testId)
            .eq('part_number', prompt.part_number)
            .maybeSingle();

          const promptData = {
            title: prompt.title,
            prompt_text: prompt.prompt_text,
            part_number: prompt.part_number,
            time_limit: prompt.time_limit,
            sample_answer: null,
            test_id: testId,
            transcription: prompt.transcription || null,
            audio_url: prompt.audio_url || null,
            is_locked: true
          };

          if (existingPrompt) {
            // Update existing prompt - preserve audio_url if not explicitly set
            const updateData = {
              ...promptData,
              audio_url: prompt.audio_url || existingPrompt.audio_url || null
            };
            console.log(`📝 Updating existing Part 2 prompt`);
            const { error: updateError } = await supabase
              .from('speaking_prompts')
              .update(updateData)
              .eq('id', existingPrompt.id);

            if (updateError) throw updateError;
          } else {
            // Insert new prompt
            console.log(`📝 Inserting new Part 2 prompt`);
            const { error: insertError } = await supabase
              .from('speaking_prompts')
              .insert(promptData);

            if (insertError) throw insertError;
          }
        }
      }

      toast({
        title: "Success",
        description: `Part ${partNumber} saved successfully`
      });
      
      // Lock the test after saving
      setIsLocked(true);
      setIsModifying(false);
    } catch (error) {
      console.error('Error saving part:', error);
      toast({
        title: "Error",
        description: `Failed to save Part ${partNumber}`,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleModifyTest = async () => {
    try {
      // Unlock all speaking prompts
      const { error } = await supabase
        .from('speaking_prompts')
        .update({ is_locked: false })
        .eq('is_locked', true);

      if (error) throw error;

      setIsLocked(false);
      setIsModifying(true);

      toast({
        title: "Success",
        description: "Speaking prompts unlocked for modification"
      });
    } catch (error) {
      console.error('Error unlocking prompts:', error);
      toast({
        title: "Error",
        description: "Failed to unlock prompts",
        variant: "destructive"
      });
    }
  };

  return (
    <AdminLayout title={`${testName ? testName : 'IELTS Speaking Management'}`}>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => navigate("/admin/ielts")}
              className="rounded-xl"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to IELTS Admin
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {testName ? `${testName} - Speaking Prompts` : 'IELTS Speaking Prompts Management'}
              </h1>
              <div className="text-muted-foreground">
                Manage speaking prompts for {testName ? `test: ${testName}` : 'all IELTS tests'} {isLocked && <Badge variant="secondary" className="ml-2">Locked</Badge>}
              </div>
              {loadingMessage && (
                <div className="text-sm text-blue-600 font-medium mt-1">
                  {isLoadingData ? (
                    <span className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                      {loadingMessage}
                    </span>
                  ) : (
                    <span className="text-green-600">✓ {loadingMessage}</span>
                  )}
                </div>
              )}
            </div>
          </div>
          {isLocked && !isModifying && (
            <Button
              onClick={handleModifyTest}
              variant="outline"
              className="rounded-xl"
            >
              Modify Prompts
            </Button>
          )}
        </div>

        {/* Part Configuration Toggles */}
        <Card className="rounded-2xl border-light-border shadow-soft">
          <CardHeader>
            <CardTitle className="text-lg">Test Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Include Part 2 (Cue Card)</label>
                <p className="text-xs text-muted-foreground">Long turn presentation section</p>
              </div>
              {includePart2 ? (
                <Badge variant="secondary">Enabled</Badge>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIncludePart2(true)}
                  disabled={isLocked && !isModifying}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Part 2
                </Button>
              )}
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Include Part 3 (Discussion)</label>
                <p className="text-xs text-muted-foreground">Abstract discussion questions</p>
              </div>
              {includePart3 ? (
                <Badge variant="secondary">Enabled</Badge>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIncludePart3(true)}
                  disabled={isLocked && !isModifying}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Part 3
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Part 1: Interview */}
        <Card className="rounded-2xl border-light-border shadow-soft">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <Mic className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-xl">Part 1: Interview</CardTitle>
                  <p className="text-sm text-muted-foreground">Personal questions (4-5 minutes total)</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium">Questions:</label>
                  <Input
                    type="number"
                    min="1"
                    max="6"
                    value={part1Questions}
                    onChange={(e) => updatePart1Questions(parseInt(e.target.value) || 1)}
                    className="w-16 h-8 text-center rounded-xl"
                  />
                </div>
                <Button
                  onClick={() => savePart(1)}
                  disabled={saving || (isLocked && !isModifying)}
                  className="rounded-xl"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Part 1
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {part1Prompts.map((prompt, index) => (
              <Card key={index} className="border-light-border bg-white/50">
                <CardContent 
                  className="p-4 space-y-3"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, 1, index)}
                >
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">Audio Question {index + 1}</Badge>
                    <div className="flex items-center space-x-2">
                      <input
                        type="file"
                        accept="audio/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleAudioUpload(file, 1, index);
                        }}
                        className="hidden"
                        id={`audio-part1-${index}`}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById(`audio-part1-${index}`)?.click()}
                        disabled={isLocked && !isModifying}
                        className="rounded-xl"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Audio
                      </Button>
                    </div>
                  </div>
                  {prompt.audio_url ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div className="flex items-center space-x-2 text-sm text-green-600">
                          <Mic className="w-4 h-4" />
                          <span>Audio uploaded successfully</span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAudioRemove(1, index)}
                          disabled={isLocked && !isModifying}
                          className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                          Remove
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <audio 
                          controls 
                          className="w-full" 
                          preload="none"
                          onError={(e) => {
                            console.error('❌ Audio playback error:', {
                              url: prompt.audio_url,
                              error: (e.target as HTMLAudioElement).error?.message || 'Unknown error'
                            });
                            // Hide the audio player on SSL/cipher errors
                            const audioElement = e.target as HTMLAudioElement;
                            if (audioElement.error?.code === 4 || audioElement.error?.message?.includes('SSL') || audioElement.error?.message?.includes('cipher')) {
                              audioElement.style.display = 'none';
                              const errorMsg = audioElement.parentElement?.querySelector('.audio-error');
                              if (errorMsg) {
                                errorMsg.textContent = 'Audio file unavailable (SSL compatibility issue)';
                              }
                            }
                          }}
                          onLoadedMetadata={() => console.log('✅ Audio metadata loaded:', prompt.audio_url)}
                        >
                          <source src={prompt.audio_url} type="audio/wav" />
                          <source src={prompt.audio_url} type="audio/mpeg" />
                          <source src={prompt.audio_url} type="audio/mp3" />
                          Your browser does not support the audio element.
                        </audio>
                        <p className="text-xs text-gray-500 break-all audio-error">
                          URL: {prompt.audio_url}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 transition-colors">
                      <Mic className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm text-gray-500">Upload audio for this question</p>
                      <p className="text-xs text-gray-400 mt-1">or drag & drop an audio file here</p>
                    </div>
                  )}
                  
                  {/* Question Transcription Field */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Question Transcription
                    </label>
                    <Textarea
                      placeholder="Enter the exact text of the audio question..."
                      value={prompt.transcription || ""}
                      onChange={(e) => {
                        const updated = [...part1Prompts];
                        updated[index].transcription = e.target.value;
                        setPart1Prompts(updated);
                      }}
                      disabled={isLocked && !isModifying}
                      className="rounded-xl min-h-[80px]"
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>

        {/* Part 2: Long Turn / Cue Card */}
        {includePart2 && (
        <Card className="rounded-2xl border-light-border shadow-soft">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-green-100">
                  <FileText className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-xl">Part 2: Long Turn / Cue Card</CardTitle>
                  <p className="text-sm text-muted-foreground">Individual presentation (3-4 minutes)</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIncludePart2(false)}
                  disabled={isLocked && !isModifying}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="w-4 h-4 mr-1" />
                  Remove
                </Button>
                <Button 
                  onClick={() => savePart(2)}
                  disabled={saving || (isLocked && !isModifying)}
                  className="rounded-xl"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Part 2
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Card className="border-light-border bg-white/50">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <Badge variant="outline">Cue Card</Badge>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4" />
                    <Input
                      type="number"
                      value={part2Prompt.time_limit}
                      onChange={(e) => setPart2Prompt(prev => ({ 
                        ...prev, 
                        time_limit: parseInt(e.target.value) || 3 
                      }))}
                      className="w-16 h-8 text-center rounded-xl"
                    />
                    <span className="text-sm">minutes</span>
                  </div>
                </div>
                <Textarea
                  placeholder="Cue card text (e.g., 'Describe a place you would like to visit...')"
                  value={part2Prompt.prompt_text}
                  onChange={(e) => setPart2Prompt(prev => ({ 
                    ...prev, 
                    prompt_text: e.target.value 
                  }))}
                  disabled={isLocked && !isModifying}
                  className="rounded-xl min-h-[120px]"
                />
              </CardContent>
            </Card>
          </CardContent>
        </Card>
        )}

        {/* Part 3: Discussion */}
        {includePart3 && (
        <Card className="rounded-2xl border-light-border shadow-soft">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-purple-100">
                  <Mic className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-xl">Part 3: Discussion</CardTitle>
                  <p className="text-sm text-muted-foreground">Abstract discussion questions (4-5 minutes)</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium">Questions:</label>
                  <Input
                    type="number"
                    min="1"
                    max="6"
                    value={part3Questions}
                    onChange={(e) => updatePart3Questions(parseInt(e.target.value) || 1)}
                    className="w-16 h-8 text-center rounded-xl"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIncludePart3(false)}
                    disabled={isLocked && !isModifying}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Remove
                  </Button>
                  <Button 
                    onClick={() => savePart(3)}
                    disabled={saving || (isLocked && !isModifying)}
                    className="rounded-xl"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Part 3
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {part3Prompts.map((prompt, index) => (
              <Card key={index} className="border-light-border bg-white/50">
                <CardContent 
                  className="p-4 space-y-3"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, 3, index)}
                >
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">Audio Question {index + 1}</Badge>
                    <div className="flex items-center space-x-2">
                      <input
                        type="file"
                        accept="audio/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleAudioUpload(file, 3, index);
                        }}
                        className="hidden"
                        id={`audio-part3-${index}`}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById(`audio-part3-${index}`)?.click()}
                        disabled={isLocked && !isModifying}
                        className="rounded-xl"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Audio
                      </Button>
                    </div>
                  </div>
                  {prompt.audio_url ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div className="flex items-center space-x-2 text-sm text-green-600">
                          <Mic className="w-4 h-4" />
                          <span>Audio uploaded successfully</span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAudioRemove(3, index)}
                          disabled={isLocked && !isModifying}
                          className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                          Remove
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <audio 
                          controls 
                          className="w-full" 
                          preload="none"
                          onError={(e) => {
                            console.error('❌ Audio playback error:', {
                              url: prompt.audio_url,
                              error: (e.target as HTMLAudioElement).error?.message || 'Unknown error'
                            });
                            // Hide the audio player on SSL/cipher errors
                            const audioElement = e.target as HTMLAudioElement;
                            if (audioElement.error?.code === 4 || audioElement.error?.message?.includes('SSL') || audioElement.error?.message?.includes('cipher')) {
                              audioElement.style.display = 'none';
                              const errorMsg = audioElement.parentElement?.querySelector('.audio-error');
                              if (errorMsg) {
                                errorMsg.textContent = 'Audio file unavailable (SSL compatibility issue)';
                              }
                            }
                          }}
                          onLoadedMetadata={() => console.log('✅ Audio metadata loaded:', prompt.audio_url)}
                        >
                          <source src={prompt.audio_url} type="audio/wav" />
                          <source src={prompt.audio_url} type="audio/mpeg" />
                          <source src={prompt.audio_url} type="audio/mp3" />
                          Your browser does not support the audio element.
                        </audio>
                        <p className="text-xs text-gray-500 break-all audio-error">
                          URL: {prompt.audio_url}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-400 transition-colors">
                      <Mic className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm text-gray-500">Upload audio for this question</p>
                      <p className="text-xs text-gray-400 mt-1">or drag & drop an audio file here</p>
                    </div>
                  )}
                   
                  {/* Question Transcription Field */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Question Transcription
                    </label>
                    <Textarea
                      placeholder="Enter the exact text of the audio question..."
                      value={prompt.transcription || ""}
                      onChange={(e) => {
                        const updated = [...part3Prompts];
                        updated[index].transcription = e.target.value;
                        setPart3Prompts(updated);
                      }}
                      disabled={isLocked && !isModifying}
                      className="rounded-xl min-h-[80px]"
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminIELTSSpeaking;