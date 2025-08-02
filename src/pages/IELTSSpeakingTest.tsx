import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Mic, Play, Pause, Clock, ArrowRight, ArrowLeft, Upload, Volume2, Sparkles } from "lucide-react";
import StudentLayout from "@/components/StudentLayout";
import InteractiveSpeakingAssistant from "@/components/InteractiveSpeakingAssistant";
import { supabase } from "@/integrations/supabase/client";

interface SpeakingPrompt {
  id: string;
  title: string;
  prompt_text: string;
  part_number: number;
  time_limit: number;
  audio_url?: string;
  transcription?: string;
}

interface TestData {
  id: string;
  test_name: string;
  part1_prompts: SpeakingPrompt[];
  part2_prompt: SpeakingPrompt | null;
  part3_prompts: SpeakingPrompt[];
}

const IELTSSpeakingTest = () => {
  const { testName } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [testData, setTestData] = useState<TestData | null>(null);
  const [currentPart, setCurrentPart] = useState(1);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [preparationTime, setPreparationTime] = useState(60);
  const [recordings, setRecordings] = useState<{[key: string]: Blob}>({});
  const [part2Notes, setPart2Notes] = useState("");
  const [showNoteTips, setShowNoteTips] = useState(false);
  const [noteTips, setNoteTips] = useState("");
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    loadTestData();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [testName]);

  useEffect(() => {
    if (timeLeft > 0) {
      timerRef.current = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    } else if (timeLeft === 0 && isRecording) {
      stopRecording();
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timeLeft, isRecording]);

  // Auto-play audio when test data loads or question changes
  useEffect(() => {
    if (testData && currentPart !== 2) {
      const currentPrompt = getCurrentPrompt();
      if (currentPrompt?.audio_url && !isRecording) {
        // Small delay to ensure UI is ready
        setTimeout(() => {
          console.log(`🎵 Auto-playing audio for Part ${currentPart}, Question ${currentQuestion + 1}`);
          playAudio(currentPrompt.audio_url!);
        }, 1000);
      }
    }
  }, [testData, currentPart, currentQuestion]);

  const loadTestData = async () => {
    if (!testName) return;
    
    setIsLoading(true);
    try {
      console.log(`🔍 Loading speaking test data for: ${testName}`);
      
      // Try multiple query patterns to find speaking content
      const queries = [
        supabase.from('speaking_prompts').select('*').eq('cambridge_book', `Test ${testName}`),
        supabase.from('speaking_prompts').select('*').eq('test_number', parseInt(testName.match(/\d+/)?.[0] || '1')),
        supabase.from('speaking_prompts').select('*').ilike('cambridge_book', `%${testName}%`)
      ];

      let prompts = null;
      for (const query of queries) {
        const { data, error } = await query.order('part_number', { ascending: true });
        if (error) throw error;
        if (data && data.length > 0) {
          prompts = data;
          console.log(`✅ Found ${data.length} speaking prompts using query pattern`);
          break;
        }
      }

      if (prompts && prompts.length > 0) {
        const part1 = prompts.filter(p => p.part_number === 1);
        const part2 = prompts.find(p => p.part_number === 2);
        const part3 = prompts.filter(p => p.part_number === 3);

        setTestData({
          id: testName,
          test_name: testName,
          part1_prompts: part1,
          part2_prompt: part2 || null,
          part3_prompts: part3
        });
        
        console.log(`📝 Test data loaded: Part 1 (${part1.length}), Part 2 (${part2 ? 1 : 0}), Part 3 (${part3.length})`);
      } else {
        console.log(`⚠️ No speaking content found for test ${testName} - showing placeholder interface`);
        // Show interface even without content, with helpful message
        setTestData({
          id: testName,
          test_name: testName,
          part1_prompts: [],
          part2_prompt: null,
          part3_prompts: []
        });
      }
    } catch (error) {
      console.error('Error loading test data:', error);
      toast({
        title: "Error",
        description: "Failed to load test data",
        variant: "destructive"
      });
      // Don't navigate away, show error state instead
    } finally {
      setIsLoading(false);
    }
  };

  const playAudio = async (audioUrl: string) => {
    if (!audioUrl) return;
    
    try {
      setIsPlaying(true);
      
      // Stop any currently playing audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      
      audioRef.current = new Audio(audioUrl);
      audioRef.current.onended = () => {
        setIsPlaying(false);
        console.log(`✅ Audio playback completed`);
      };
      audioRef.current.onerror = () => {
        setIsPlaying(false);
        console.error('Audio playback error');
        toast({
          title: "Audio Error",
          description: "Failed to play audio prompt",
          variant: "destructive"
        });
      };
      
      console.log(`▶️ Playing audio: ${audioUrl}`);
      await audioRef.current.play();
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsPlaying(false);
      toast({
        title: "Audio Error", 
        description: "Failed to play audio prompt. Please try the repeat button.",
        variant: "destructive"
      });
    }
  };

  const repeatAudio = () => {
    const currentPrompt = getCurrentPrompt();
    if (currentPrompt?.audio_url) {
      console.log(`🔁 Repeating audio for Part ${currentPart}`);
      playAudio(currentPrompt.audio_url);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const recordingKey = `part${currentPart}_q${currentQuestion}`;
        console.log(`💾 Saving recording for ${recordingKey}, blob size: ${blob.size}`);
        setRecordings(prev => {
          const updated = { ...prev, [recordingKey]: blob };
          console.log(`📱 Recordings updated:`, Object.keys(updated));
          return updated;
        });
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      
      // Set timer based on current part
      if (currentPart === 1 || currentPart === 3) {
        setTimeLeft(120); // 2 minutes
      } else if (currentPart === 2) {
        setTimeLeft(120); // 2 minutes for Part 2 response
      }

    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Recording Error",
        description: "Failed to start recording. Please check microphone permissions.",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setTimeLeft(0);
    }
  };

  const playRecording = async (recordingKey: string) => {
    const recording = recordings[recordingKey];
    if (!recording) return;
    
    try {
      const audioUrl = URL.createObjectURL(recording);
      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
      };
      
      await audio.play();
      console.log(`🎵 Playing back recording: ${recordingKey}`);
    } catch (error) {
      console.error('Error playing recording:', error);
      toast({
        title: "Playback Error",
        description: "Failed to play your recording",
        variant: "destructive"
      });
    }
  };

  const getNoteTakingTips = async () => {
    if (!testData?.part2_prompt) return;
    
    setShowNoteTips(true);
    try {
      const { data, error } = await supabase.functions.invoke('openai-chat', {
        body: {
          messages: [
            {
              role: "system",
              content: "You are an IELTS Speaking expert. Provide 2-3 specific, actionable note-taking tips for the given Part 2 cue card. Be concise and practical."
            },
            {
              role: "user", 
              content: `Give me specific note-taking tips for this IELTS Part 2 cue card: "${testData.part2_prompt.prompt_text}"`
            }
          ]
        }
      });
      
      if (error) throw error;
      setNoteTips(data.response || "Focus on the key points: what, when, where, why, and how you felt about it.");
    } catch (error) {
      console.error('Error getting note tips:', error);
      setNoteTips("Focus on the key points: what, when, where, why, and how you felt about it.");
    }
  };

  const nextQuestion = () => {
    if (currentPart === 1) {
      if (currentQuestion < (testData?.part1_prompts.length || 0) - 1) {
        setCurrentQuestion(currentQuestion + 1);
        console.log(`➡️ Moving to Part 1, Question ${currentQuestion + 2}`);
      } else {
        // Move to Part 2
        setCurrentPart(2);
        setCurrentQuestion(0);
        setPreparationTime(60);
        console.log(`➡️ Moving to Part 2 - Long Turn`);
        startPreparationTimer();
      }
    } else if (currentPart === 2) {
      // Move to Part 3 after Part 2
      setCurrentPart(3);
      setCurrentQuestion(0);
      console.log(`➡️ Moving to Part 3 - Discussion`);
    } else if (currentPart === 3) {
      if (currentQuestion < (testData?.part3_prompts.length || 0) - 1) {
        setCurrentQuestion(currentQuestion + 1);
        console.log(`➡️ Moving to Part 3, Question ${currentQuestion + 2}`);
      } else {
        // Test complete
        console.log(`🏁 Test completed`);
        submitTest();
      }
    }
  };

  const startPreparationTimer = () => {
    const timer = setInterval(() => {
      setPreparationTime(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          // Don't auto-start recording - student must click manually
          toast({
            title: "Preparation Time Complete",
            description: "You may now start recording your response.",
            duration: 5000
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const submitTest = async () => {
    try {
      const recordingEntries = Object.entries(recordings);
      const uploadPromises = recordingEntries.map(async ([key, blob]) => {
        const fileName = `speaking_${testData?.id}_${key}_${Date.now()}.webm`;
        const { data, error } = await supabase.storage
          .from('audio-files')
          .upload(fileName, blob);

        if (error) throw error;

        const { data: publicData } = supabase.storage
          .from('audio-files')
          .getPublicUrl(fileName);

        return {
          part: key,
          audio_url: publicData.publicUrl
        };
      });

      const uploadedRecordings = await Promise.all(uploadPromises);

      // Navigate to results page with recordings data and test prompts for transcriptions
      navigate('/ielts-speaking-results', { 
        state: { 
          testData, 
          recordings: uploadedRecordings 
        } 
      });

    } catch (error) {
      console.error('Error submitting test:', error);
      toast({
        title: "Submission Error",
        description: "Failed to submit test. Please try again.",
        variant: "destructive"
      });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading speaking test...</p>
        </div>
      </div>
    );
  }

  if (!testData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">Test not found</p>
          <Button onClick={() => navigate('/ielts-portal')} className="mt-4">
            Back to Portal
          </Button>
        </div>
      </div>
    );
  }

  // Show no content message if test has no speaking prompts
  if (testData.part1_prompts.length === 0 && !testData.part2_prompt && testData.part3_prompts.length === 0) {
    return (
      <StudentLayout title={`IELTS Speaking - ${testData.test_name}`} showBackButton>
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center">
            <Badge variant="outline" className="mb-4 px-4 py-1 text-primary border-primary/20">
              IELTS SPEAKING TEST
            </Badge>
            <h1 className="text-heading-2 mb-2">{testData.test_name}</h1>
          </div>
          
          <Card className="card-modern">
            <CardContent className="p-8 text-center">
              <Mic className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h2 className="text-xl font-semibold mb-2">No Speaking Content Available</h2>
              <p className="text-muted-foreground mb-6">
                This test doesn't have speaking content created yet. Please contact your administrator or try another test.
              </p>
              <div className="flex gap-4 justify-center">
                <Button onClick={() => navigate('/ielts-portal')} variant="outline">
                  Back to Portal
                </Button>
                <Button onClick={() => navigate('/speaking')}>
                  Try General Speaking Practice
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </StudentLayout>
    );
  }

  const getCurrentPrompt = () => {
    if (currentPart === 1) return testData.part1_prompts[currentQuestion];
    if (currentPart === 2) return testData.part2_prompt;
    if (currentPart === 3) return testData.part3_prompts[currentQuestion];
    return null;
  };

  const getCurrentQuestionText = (): string => {
    const prompt = getCurrentPrompt();
    if (!prompt) return "";
    
    // For Part 2, use the prompt_text (cue card content)
    if (currentPart === 2) {
      return prompt.prompt_text || "";
    }
    
    // For Parts 1 & 3, use transcription if available, otherwise fall back to title
    return prompt.transcription || prompt.title || "";
  };

  const getQuestionType = (): string => {
    if (currentPart === 1) return "Part 1 (Interview)";
    if (currentPart === 2) return "Part 2 (Long Turn)"; 
    if (currentPart === 3) return "Part 3 (Discussion)";
    return "Unknown Part";
  };

  const currentPrompt = getCurrentPrompt();
  const currentQuestionText = getCurrentQuestionText();
  const questionType = getQuestionType();

  return (
    <StudentLayout title={`IELTS Speaking - ${testData.test_name}`} showBackButton>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <Badge variant="outline" className="mb-4 px-4 py-1 text-primary border-primary/20">
            IELTS SPEAKING TEST
          </Badge>
          <h1 className="text-heading-2 mb-2">{testData.test_name}</h1>
          <p className="text-muted-foreground">
            Part {currentPart} of 3 • {currentPart === 1 ? 'Interview' : currentPart === 2 ? 'Long Turn' : 'Discussion'}
          </p>
        </div>

        {/* Progress */}
        <Card className="card-modern">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium">Test Progress</span>
              <span className="text-sm text-muted-foreground">
                {currentPart === 1 && `Question ${currentQuestion + 1} of ${testData.part1_prompts.length}`}
                {currentPart === 2 && 'Cue Card Response'}
                {currentPart === 3 && `Question ${currentQuestion + 1} of ${testData.part3_prompts.length}`}
              </span>
            </div>
            <Progress 
              value={
                currentPart === 1 ? ((currentQuestion + 1) / testData.part1_prompts.length) * 33.33 :
                currentPart === 2 ? 66.66 :
                66.66 + ((currentQuestion + 1) / testData.part3_prompts.length) * 33.33
              } 
              className="h-2"
            />
          </CardContent>
        </Card>

        {/* Main Content */}
        <Card className="card-modern">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>
                Part {currentPart}: {currentPart === 1 ? 'Interview' : currentPart === 2 ? 'Long Turn' : 'Discussion'}
              </span>
              <div className="flex items-center gap-3">
                {/* AI Assistant Button */}
                <Button
                  onClick={() => setShowAIAssistant(true)}
                  variant="outline"
                  size="sm"
                  className="bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  AI Assistant
                </Button>
                
                {timeLeft > 0 && (
                  <Badge variant="outline" className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {formatTime(timeLeft)}
                  </Badge>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Part 2 Preparation Timer with Note-taking */}
            {currentPart === 2 && preparationTime > 0 && (
              <div className="space-y-4">
                <div className="text-center p-6 bg-blue-50 rounded-lg">
                  <Clock className="w-8 h-8 mx-auto mb-3 text-blue-600" />
                  <h3 className="text-lg font-semibold mb-2">Preparation Time</h3>
                  <p className="text-2xl font-bold text-blue-600">{formatTime(preparationTime)}</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Use this time to prepare your response and take notes
                  </p>
                </div>
                
                {/* Note-taking area */}
                <Card className="bg-yellow-50 border-yellow-200">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between text-lg">
                      <span className="flex items-center gap-2">
                        📝 Your Notes
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={getNoteTakingTips}
                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                      >
                        💡 Need help with note-taking?
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <textarea
                      placeholder="Write your preparation notes here..."
                      value={part2Notes}
                      onChange={(e) => setPart2Notes(e.target.value)}
                      className="w-full h-32 p-3 border border-yellow-300 rounded-lg bg-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    
                    {showNoteTips && noteTips && (
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <h4 className="font-semibold text-blue-800 mb-2">💡 Note-taking Tips:</h4>
                        <p className="text-sm text-blue-700">{noteTips}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Part 2 Notes Display During Recording - FIXED: Notes remain visible during recording */}
            {currentPart === 2 && preparationTime === 0 && part2Notes && (
              <Card className="bg-yellow-50 border-yellow-200">
                <CardHeader>
                  <CardTitle className="text-lg">
                    📝 Your Notes (for reference while recording)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="p-3 bg-white border border-yellow-300 rounded-lg text-sm whitespace-pre-wrap">
                    {part2Notes}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Audio Prompt with Auto-play and Repeat */}
            {currentPrompt?.audio_url && currentPart !== 2 && (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-6">
                  <div className="text-center space-y-4">
                    <div className="flex items-center justify-center space-x-2 mb-3">
                      <Volume2 className="w-5 h-5 text-blue-600" />
                      <span className="font-medium text-blue-900">
                        {isPlaying ? 'Playing Question Audio...' : 'Question Audio Ready'}
                      </span>
                    </div>
                    
                    <div className="flex justify-center space-x-3">
                      <Button
                        onClick={repeatAudio}
                        disabled={isPlaying}
                        variant="outline"
                        className="rounded-xl border-blue-300 text-blue-700 hover:bg-blue-100"
                        size="lg"
                      >
                        {isPlaying ? (
                          <>
                            <Pause className="w-5 h-5 mr-2" />
                            Playing...
                          </>
                        ) : (
                          <>
                            <Play className="w-5 h-5 mr-2" />
                            Repeat Audio
                          </>
                        )}
                      </Button>
                    </div>
                    
                    <p className="text-sm text-blue-700">
                      {currentPart === 1 ? 'Listen carefully and answer the question' : 'Listen to the discussion question'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Cue Card Display */}
            {currentPart === 2 && currentPrompt && (
              <div className="p-6 bg-gray-50 rounded-lg">
                <h3 className="font-semibold mb-3">Cue Card</h3>
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {currentPrompt.prompt_text}
                </div>
              </div>
            )}

            {/* Recording Interface */}
            {((currentPart === 2 && preparationTime === 0) || currentPart !== 2) && (
              <div className="text-center space-y-4">
                <div className="p-6 border-2 border-dashed border-gray-300 rounded-lg">
                  {isRecording ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-center space-x-2 text-red-600">
                        <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
                        <span className="font-medium">Recording...</span>
                      </div>
                      <Button
                        onClick={stopRecording}
                        variant="outline"
                        className="rounded-xl"
                      >
                        <Mic className="w-4 h-4 mr-2" />
                        Stop Recording
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Mic className="w-8 h-8 mx-auto text-gray-400" />
                      <p className="text-sm text-gray-500">Ready to record your response</p>
                      <Button
                        onClick={startRecording}
                        className="rounded-xl"
                        size="lg"
                      >
                        <Mic className="w-4 h-4 mr-2" />
                        Start Recording
                      </Button>
                    </div>
                  )}
                </div>

                {/* Recording indicator and playback for current question */}
                {recordings[`part${currentPart}_q${currentQuestion}`] && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-center space-x-2 text-green-600">
                      <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                      <span className="text-sm">Response recorded</span>
                    </div>
                    
                    {/* Listen to Your Recording Feature */}
                    {(currentPart === 1 || currentPart === 3) && (
                      <div className="flex justify-center space-x-3">
                        <Button
                          onClick={() => playRecording(`part${currentPart}_q${currentQuestion}`)}
                          variant="outline"
                          size="sm"
                          className="rounded-xl border-green-300 text-green-700 hover:bg-green-50"
                        >
                          <Volume2 className="w-4 h-4 mr-2" />
                          Listen to Your Recording
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <Separator />

            {/* Navigation */}
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                onClick={() => navigate('/ielts-portal')}
                className="rounded-xl"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Exit Test
              </Button>

              {recordings[`part${currentPart}_q${currentQuestion}`] && (
                <div className="flex space-x-3">
                  {/* Listen to Recording button for Parts 1 & 3 */}
                  {(currentPart === 1 || currentPart === 3) && (
                    <Button
                      onClick={() => playRecording(`part${currentPart}_q${currentQuestion}`)}
                      variant="outline"
                      className="rounded-xl border-green-300 text-green-700 hover:bg-green-50"
                    >
                      <Volume2 className="w-4 h-4 mr-2" />
                      Listen to Your Recording
                    </Button>
                  )}
                  
                  {/* Continue/Next button */}
                  <Button
                    onClick={nextQuestion}
                    className="rounded-xl"
                  >
                    {currentPart === 1 && currentQuestion < testData.part1_prompts.length - 1 && (
                      <>Continue to Next Question <ArrowRight className="w-4 h-4 ml-2" /></>
                    )}
                    {currentPart === 1 && currentQuestion === testData.part1_prompts.length - 1 && (
                      <>Continue to Part 2 <ArrowRight className="w-4 h-4 ml-2" /></>
                    )}
                    {currentPart === 2 && (
                      <>Continue to Part 3 <ArrowRight className="w-4 h-4 ml-2" /></>
                    )}
                    {currentPart === 3 && currentQuestion < testData.part3_prompts.length - 1 && (
                      <>Continue to Next Question <ArrowRight className="w-4 h-4 ml-2" /></>
                    )}
                    {currentPart === 3 && currentQuestion === testData.part3_prompts.length - 1 && (
                      <>Submit Test <Upload className="w-4 h-4 ml-2" /></>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Interactive AI Assistant */}
        <InteractiveSpeakingAssistant
          isOpen={showAIAssistant}
          onClose={() => setShowAIAssistant(false)}
          questionText={currentQuestionText}
          questionType={questionType}
          partNumber={currentPart}
        />
      </div>
    </StudentLayout>
  );
};

export default IELTSSpeakingTest;