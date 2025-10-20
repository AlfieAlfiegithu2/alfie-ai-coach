import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAdminContent } from "@/hooks/useAdminContent";
import { useToast } from "@/hooks/use-toast";
import { Upload, Save, Mic, Plus, Clock, FileText, ArrowLeft } from "lucide-react";
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
  
  // Part 1: Interview (4 audio slots only)
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
      // Load test details
      const { data: test, error: testError } = await supabase
        .from('tests')
        .select('*')
        .eq('id', testId)
        .single();

      if (testError) throw testError;
      setTestName(test.test_name);

      // Load existing speaking prompts
      const { data: prompts, error: promptsError } = await supabase
        .from('speaking_prompts')
        .select('*')
        .eq('cambridge_book', `Test ${test.test_name}`);

      if (promptsError) throw promptsError;

      if (prompts && prompts.length > 0) {
        // Check if test is locked
        const isTestLocked = prompts.some(p => p.is_locked);
        setIsLocked(isTestLocked);
        
        // Organize prompts by part
        const part1 = prompts.filter(p => p.part_number === 1);
        const part2 = prompts.filter(p => p.part_number === 2);
        const part3 = prompts.filter(p => p.part_number === 3);

        if (part1.length > 0) {
          const updatedPart1 = [...part1Prompts];
          part1.forEach((prompt, index) => {
            if (index < 4) {
              updatedPart1[index] = prompt;
            }
          });
          setPart1Prompts(updatedPart1);
        }

        if (part2.length > 0) {
          setPart2Prompt(part2[0]);
        }

        if (part3.length > 0) {
          // Fix: Properly handle Part 3 data loading to prevent disappearing content
          const updatedPart3 = [...part3Prompts];
          part3.forEach((prompt, index) => {
            if (index < updatedPart3.length) {
              updatedPart3[index] = {
                ...updatedPart3[index],
                ...prompt, // Override with saved data
                id: prompt.id
              };
            } else {
              // Add additional prompts if saved data has more than default
              updatedPart3.push(prompt);
            }
          });
          setPart3Prompts(updatedPart3);
          setPart3Questions(Math.max(part3.length, 4)); // Ensure at least 4 questions
          console.log(`📝 Part 3 loaded: ${part3.length} prompts`);
        }
      }
    } catch (error) {
      console.error('Error loading test data:', error);
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
        if (part2Prompt.prompt_text.trim()) {
          prompts = [part2Prompt];
        }
      } else if (partNumber === 3) {
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

      // Delete existing prompts for this part
      const { error: deleteError } = await supabase
        .from('speaking_prompts')
        .delete()
        .eq('cambridge_book', `Test ${testName}`)
        .eq('part_number', partNumber);

      if (deleteError) throw deleteError;

      // Insert new prompts
      if (prompts.length > 0) {
        const promptsToInsert = prompts.map(prompt => ({
          title: prompt.title,
          prompt_text: prompt.prompt_text,
          part_number: prompt.part_number,
          time_limit: prompt.time_limit,
          sample_answer: null,
          test_number: parseInt(testName) || 1,
          cambridge_book: `Test ${testName}`,
          transcription: prompt.transcription || null,
          audio_url: prompt.audio_url || null,
          is_locked: true // Lock after saving
        }));

        console.log(`💾 Inserting prompts:`, promptsToInsert);

        const { error: insertError } = await supabase
          .from('speaking_prompts')
          .insert(promptsToInsert);

        if (insertError) throw insertError;
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
      // Unlock all speaking prompts for this test
      const { error } = await supabase
        .from('speaking_prompts')
        .update({ is_locked: false })
        .eq('cambridge_book', `Test ${testName}`);

      if (error) throw error;

      setIsLocked(false);
      setIsModifying(true);
      
      toast({
        title: "Success",
        description: "Test unlocked for modification"
      });
    } catch (error) {
      console.error('Error unlocking test:', error);
      toast({
        title: "Error",
        description: "Failed to unlock test",
        variant: "destructive"
      });
    }
  };

  return (
    <AdminLayout title={`IELTS Speaking - ${testName}`}>
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
                IELTS Speaking Test Management
              </h1>
              <p className="text-muted-foreground">
                Test: {testName} {isLocked && <Badge variant="secondary">Locked</Badge>}
              </p>
            </div>
          </div>
          {isLocked && !isModifying && (
            <Button
              onClick={handleModifyTest}
              variant="outline"
              className="rounded-xl"
            >
              Modify Test
            </Button>
          )}
        </div>

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
                  <p className="text-sm text-muted-foreground">4 personal questions (4-5 minutes total)</p>
                </div>
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
                          preload="metadata"
                          onError={(e) => {
                            console.error('❌ Audio playback error:', {
                              url: prompt.audio_url,
                              error: (e.target as HTMLAudioElement).error
                            });
                          }}
                          onLoadedMetadata={() => console.log('✅ Audio metadata loaded:', prompt.audio_url)}
                        >
                          <source src={prompt.audio_url} type="audio/wav" />
                          <source src={prompt.audio_url} type="audio/mpeg" />
                          <source src={prompt.audio_url} type="audio/mp3" />
                          Your browser does not support the audio element.
                        </audio>
                        <p className="text-xs text-gray-500 break-all">
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
              <Button 
                onClick={() => savePart(2)}
                disabled={saving || (isLocked && !isModifying)}
                className="rounded-xl"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Part 2
              </Button>
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

        {/* Part 3: Discussion */}
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
                    min="4"
                    max="6"
                    value={part3Questions}
                    onChange={(e) => updatePart3Questions(parseInt(e.target.value) || 4)}
                    className="w-16 h-8 text-center rounded-xl"
                  />
                </div>
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
                          preload="metadata"
                          onError={(e) => {
                            console.error('❌ Audio playback error:', {
                              url: prompt.audio_url,
                              error: (e.target as HTMLAudioElement).error
                            });
                          }}
                          onLoadedMetadata={() => console.log('✅ Audio metadata loaded:', prompt.audio_url)}
                        >
                          <source src={prompt.audio_url} type="audio/wav" />
                          <source src={prompt.audio_url} type="audio/mpeg" />
                          <source src={prompt.audio_url} type="audio/mp3" />
                          Your browser does not support the audio element.
                        </audio>
                        <p className="text-xs text-gray-500 break-all">
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
      </div>
    </AdminLayout>
  );
};

export default AdminIELTSSpeaking;