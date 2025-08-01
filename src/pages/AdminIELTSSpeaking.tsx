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
}

const AdminIELTSSpeaking = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const { uploadAudio, loading } = useAdminContent();
  const { toast } = useToast();
  
  const [testName, setTestName] = useState("");
  const [saving, setSaving] = useState(false);
  
  // Part 1: Interview (4 slots)
  const [part1Prompts, setPart1Prompts] = useState<SpeakingPrompt[]>([
    { title: "", prompt_text: "", part_number: 1, time_limit: 2 },
    { title: "", prompt_text: "", part_number: 1, time_limit: 2 },
    { title: "", prompt_text: "", part_number: 1, time_limit: 2 },
    { title: "", prompt_text: "", part_number: 1, time_limit: 2 }
  ]);

  // Part 2: Long Turn / Cue Card
  const [part2Prompt, setPart2Prompt] = useState<SpeakingPrompt>({
    title: "Cue Card",
    prompt_text: "",
    part_number: 2,
    time_limit: 3
  });

  // Part 3: Discussion (4-6 questions)
  const [part3Questions, setPart3Questions] = useState(4);
  const [part3Prompts, setPart3Prompts] = useState<SpeakingPrompt[]>([
    { title: "", prompt_text: "", part_number: 3, time_limit: 2 },
    { title: "", prompt_text: "", part_number: 3, time_limit: 2 },
    { title: "", prompt_text: "", part_number: 3, time_limit: 2 },
    { title: "", prompt_text: "", part_number: 3, time_limit: 2 }
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
          const updatedPart3 = [...part3Prompts];
          part3.forEach((prompt, index) => {
            if (index < updatedPart3.length) {
              updatedPart3[index] = prompt;
            }
          });
          setPart3Prompts(updatedPart3);
          setPart3Questions(part3.length);
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
      toast({
        title: "Error",
        description: "Failed to upload audio",
        variant: "destructive"
      });
    }
  };

  const updatePart3Questions = (count: number) => {
    setPart3Questions(count);
    const newPrompts = Array.from({ length: count }, (_, index) => 
      part3Prompts[index] || { title: "", prompt_text: "", part_number: 3, time_limit: 2 }
    );
    setPart3Prompts(newPrompts);
  };

  const savePart = async (partNumber: number) => {
    setSaving(true);
    try {
      let prompts: SpeakingPrompt[] = [];
      
      if (partNumber === 1) {
        prompts = part1Prompts.filter(p => p.title && p.prompt_text);
      } else if (partNumber === 2) {
        if (part2Prompt.prompt_text) {
          prompts = [part2Prompt];
        }
      } else if (partNumber === 3) {
        prompts = part3Prompts.filter(p => p.title && p.prompt_text);
      }

      // Delete existing prompts for this part
      const { error: deleteError } = await supabase
        .from('speaking_prompts')
        .delete()
        .eq('test_number', parseInt(testName) || 1)
        .eq('part_number', partNumber);

      if (deleteError) throw deleteError;

      // Insert new prompts
      if (prompts.length > 0) {
        const promptsToInsert = prompts.map(prompt => ({
          title: prompt.title,
          prompt_text: prompt.prompt_text,
          part_number: prompt.part_number,
          time_limit: prompt.time_limit,
          sample_answer: prompt.sample_answer || null,
          test_number: parseInt(testName) || 1,
          cambridge_book: `Test ${testName}`
        }));

        const { error: insertError } = await supabase
          .from('speaking_prompts')
          .insert(promptsToInsert);

        if (insertError) throw insertError;
      }

      toast({
        title: "Success",
        description: `Part ${partNumber} saved successfully`
      });
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
                Test: {testName}
              </p>
            </div>
          </div>
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
                disabled={saving}
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
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">Question {index + 1}</Badge>
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
                      className="rounded-xl"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Audio
                    </Button>
                  </div>
                  <Input
                    placeholder="Question title"
                    value={prompt.title}
                    onChange={(e) => {
                      const updated = [...part1Prompts];
                      updated[index].title = e.target.value;
                      setPart1Prompts(updated);
                    }}
                    className="rounded-xl"
                  />
                  <Textarea
                    placeholder="Question text"
                    value={prompt.prompt_text}
                    onChange={(e) => {
                      const updated = [...part1Prompts];
                      updated[index].prompt_text = e.target.value;
                      setPart1Prompts(updated);
                    }}
                    className="rounded-xl min-h-[80px]"
                  />
                  {prompt.audio_url && (
                    <div className="flex items-center space-x-2 text-sm text-green-600">
                      <Mic className="w-4 h-4" />
                      <span>Audio uploaded</span>
                    </div>
                  )}
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
                disabled={saving}
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
                  className="rounded-xl min-h-[120px]"
                />
                <Textarea
                  placeholder="Sample answer (optional)"
                  value={part2Prompt.sample_answer || ""}
                  onChange={(e) => setPart2Prompt(prev => ({ 
                    ...prev, 
                    sample_answer: e.target.value 
                  }))}
                  className="rounded-xl min-h-[80px]"
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
                  disabled={saving}
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
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">Question {index + 1}</Badge>
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
                      className="rounded-xl"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Audio
                    </Button>
                  </div>
                  <Input
                    placeholder="Question title"
                    value={prompt.title}
                    onChange={(e) => {
                      const updated = [...part3Prompts];
                      updated[index].title = e.target.value;
                      setPart3Prompts(updated);
                    }}
                    className="rounded-xl"
                  />
                  <Textarea
                    placeholder="Discussion question"
                    value={prompt.prompt_text}
                    onChange={(e) => {
                      const updated = [...part3Prompts];
                      updated[index].prompt_text = e.target.value;
                      setPart3Prompts(updated);
                    }}
                    className="rounded-xl min-h-[80px]"
                  />
                  {prompt.audio_url && (
                    <div className="flex items-center space-x-2 text-sm text-green-600">
                      <Mic className="w-4 h-4" />
                      <span>Audio uploaded</span>
                    </div>
                  )}
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