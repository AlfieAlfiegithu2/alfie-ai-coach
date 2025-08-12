import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Mic, Play, Pause, Clock, ArrowRight, ArrowLeft, Upload, Volume2, Bot, ListTree, BookOpen } from "lucide-react";
import StudentLayout from "@/components/StudentLayout";
import InteractiveSpeakingAssistant from "@/components/InteractiveSpeakingAssistant";
import { supabase } from "@/integrations/supabase/client";
import VolumeSlider from "@/components/ui/VolumeSlider";

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
  // Catbot chat state for speaking assistant
  interface ChatMessage { id: string; type: 'user' | 'bot'; content: string; timestamp: Date; }
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'bot',
      content: "Hello! I'm Catbot, your IELTS Speaking tutor. I can help with ideas, structure, and vocabulary. What would you like help with?",
      timestamp: new Date()
    }
  ]);
  const [newMessage, setNewMessage] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Global audio volume shared across the app (0.0 - 1.0)
  const initialVol = (() => {
    try {
      const stored = typeof window !== 'undefined' ? window.localStorage.getItem('appAudioVolume') : null;
      const n = stored ? parseInt(stored, 10) : 50;
      const v = n / 100;
      return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0.5;
    } catch {
      return 0.5;
    }
  })();
  const globalVolumeRef = useRef<number>(initialVol);

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

  // Listen for global volume changes dispatched by VolumeSlider
  useEffect(() => {
    const handler = (e: any) => {
      const v = e?.detail?.volume;
      if (typeof v === 'number') {
        globalVolumeRef.current = v;
        if (audioRef.current) audioRef.current.volume = v;
      }
    };
    window.addEventListener('app:volume-change', handler as EventListener);
    return () => window.removeEventListener('app:volume-change', handler as EventListener);
  }, []);


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
      audioRef.current.volume = globalVolumeRef.current;
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

  const beep = () => {
    try {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = 880;
      o.connect(g);
      g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.01);
      o.start();
      setTimeout(() => {
        g.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.12);
        setTimeout(() => { o.stop(); ctx.close(); }, 150);
      }, 100);
    } catch {}
  };

  const startRecording = async () => {
    try {
      beep();
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
    beep();
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
      audio.volume = globalVolumeRef.current;
      
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

      // Save speaking test result with 30-day audio retention
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const audioUrls = uploadedRecordings.map(r => r.audio_url);
          
          // Save main test result
          const { data: testResult, error: testError } = await supabase
            .from('test_results')
            .insert({
              user_id: user.id,
              test_type: 'speaking',
              total_questions: uploadedRecordings.length,
              correct_answers: uploadedRecordings.length, // Speaking is subjectively scored
              score_percentage: 75, // Placeholder
              time_taken: 15 * 60, // Approximate speaking test duration
              audio_urls: audioUrls,
              audio_retention_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
              test_data: {
                recordings_count: uploadedRecordings.length,
                parts_completed: [1, 2, 3]
              } as any
            })
            .select()
            .single();

          if (testError) throw testError;

          // Save detailed speaking results for each part
          for (const recording of uploadedRecordings) {
            const partNumber = parseInt(recording.part.replace('part', '').split('_')[0]);
            let questionText = '';
            
            if (partNumber === 1 && testData.part1_prompts.length > 0) {
              const questionIndex = parseInt(recording.part.split('_q')[1] || '0');
              questionText = testData.part1_prompts[questionIndex]?.prompt_text || '';
            } else if (partNumber === 2 && testData.part2_prompt) {
              questionText = testData.part2_prompt.prompt_text;
            } else if (partNumber === 3 && testData.part3_prompts.length > 0) {
              const questionIndex = parseInt(recording.part.split('_q')[1] || '0');
              questionText = testData.part3_prompts[questionIndex]?.prompt_text || '';
            }

            await supabase.from('speaking_test_results').insert({
              user_id: user.id,
              test_result_id: testResult.id,
              part_number: partNumber,
              question_text: questionText,
              audio_url: recording.audio_url,
              transcription: '', // Will be filled by AI analysis
              band_scores: {},
              detailed_feedback: '',
              duration_seconds: 120 // Approximate
            });
          }

          console.log('✅ Speaking test results saved successfully');
        }
      } catch (saveError) {
        console.error('Error saving speaking results:', saveError);
      }

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

  // Catbot chat handlers (speaking)
  const sendChatMessage = async (messageText?: string) => {
    const message = messageText || newMessage.trim();
    if (!message || isChatLoading) return;

    const userMessage = {
      id: Date.now().toString(),
      type: 'user' as const,
      content: message,
      timestamp: new Date(),
    };
    setChatMessages((prev) => [...prev, userMessage]);
    if (!messageText) setNewMessage("");
    setIsChatLoading(true);

    try {
      const questionText = getCurrentQuestionText();
      const contextPrompt = `CONTEXT: The student is practicing IELTS Speaking Part ${currentPart}.

Question: "${questionText}"

Student: "${message}"

Please provide concise, practical speaking guidance (ideas, vocabulary, structure). Do NOT write a full answer.`;

      const { data, error } = await supabase.functions.invoke('openai-chat', {
        body: {
          message: contextPrompt,
          context: 'catbot',
        },
      });
      if (error) throw error;

      const botMessage = {
        id: (Date.now() + 1).toString(),
        type: 'bot' as const,
        content: data.response,
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error('Error sending chat message:', error);
      toast({ title: 'Error', description: 'Failed to get response from Catbot', variant: 'destructive' });
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    sendChatMessage(suggestion);
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
                <VolumeSlider defaultValue={50} className="w-64 md:w-72" />
                
                {/* AI Assistant moved to floating bottom-right */}
                
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
                <div className="text-center p-6 bg-primary/5 rounded-lg border border-primary/10">
                  <Clock className="w-8 h-8 mx-auto mb-3 text-primary" />
                  <h3 className="text-lg font-semibold mb-2">Preparation Time</h3>
                  <p className="text-2xl font-bold text-primary">{formatTime(preparationTime)}</p>
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
                        className="text-primary border-primary/30 hover:bg-primary/10"
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
                      className="w-full h-32 p-3 border border-yellow-300 rounded-lg bg-white resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    
                    {showNoteTips && noteTips && (
                      <div className="mt-3 p-3 bg-muted/50 border border-border rounded-lg">
                        <h4 className="font-semibold text-foreground mb-2">💡 Note-taking Tips:</h4>
                        <p className="text-sm text-muted-foreground">{noteTips}</p>
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
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-6">
                  <div className="text-center space-y-4">
                    <div className="flex items-center justify-center space-x-2 mb-3">
                      <Volume2 className="w-5 h-5 text-primary" />
                      <span className="font-medium text-foreground">
                        {isPlaying ? 'Playing Question Audio...' : 'Question Audio Ready'}
                      </span>
                    </div>
                    
                    <div className="flex justify-center space-x-3">
                      <Button
                        onClick={repeatAudio}
                        disabled={isPlaying}
                        variant="outline"
                        className="rounded-xl border-primary/30 text-primary hover:bg-primary/10"
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

        {/* AI Assistant - Floating Bottom Right (Writing-style) */}
        <div className="fixed bottom-6 right-6 z-50">
          {showAIAssistant ? (
            <Card className="glass-card rounded-3xl w-96 h-[500px] animate-scale-in shadow-2xl border border-primary/20 flex flex-col">
              <CardHeader className="pb-4 bg-gradient-to-r from-primary/5 to-accent/5 rounded-t-3xl">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-3 text-foreground">
                    <div className="w-10 h-10 rounded-full bg-primary/10 backdrop-blur-sm flex items-center justify-center">
                      <Bot className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-foreground">AI Speaking Assistant</div>
                      <div className="text-sm text-muted-foreground font-normal">Your IELTS Speaking Tutor</div>
                    </div>
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setShowAIAssistant(false)} className="h-8 w-8 p-0 hover:bg-destructive/20 text-foreground">
                    ✕
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col p-4 overflow-hidden">
                <div className="flex-1 min-h-0 overflow-y-auto mb-4 space-y-3 rounded-lg p-4 border border-border bg-card/50 backdrop-blur-sm">
                  {chatMessages.map((message) => (
                    <div key={message.id} className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`flex gap-3 max-w-[85%] ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div className={`px-3 py-2 rounded-xl text-sm ${message.type === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground border border-border'}`}>
                          <div
                            dangerouslySetInnerHTML={{
                              __html: message.content
                                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                                .replace(/^• (.*)$/gm, '<li>$1</li>')
                                .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
                                .replace(/\n/g, '<br>'),
                            }}
                            className="prose prose-sm max-w-none dark:prose-invert"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  {isChatLoading && (
                    <div className="flex gap-3 justify-start">
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mt-1">
                        <Bot className="w-4 h-4 text-primary" />
                      </div>
                      <div className="bg-muted border border-border px-3 py-2 rounded-xl text-sm">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 mb-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSuggestionClick('Help with Speaking Structure')}
                    disabled={isChatLoading}
                    className="text-xs h-8 border-primary/30 hover:bg-primary/10"
                  >
                    <ListTree className="w-3 h-3 mr-2" />
                    Structure
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSuggestionClick('Suggest Some Speaking Vocabulary')}
                    disabled={isChatLoading}
                    className="text-xs h-8 border-primary/30 hover:bg-primary/10"
                  >
                    <BookOpen className="w-3 h-3 mr-2" />
                    Vocabulary
                  </Button>
                </div>

                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !isChatLoading && newMessage.trim() && sendChatMessage()}
                    placeholder="Ask for speaking help..."
                    className="flex-1 px-3 py-2 rounded-lg text-sm bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary resize-none"
                    disabled={isChatLoading}
                  />
                  <Button
                    onClick={() => sendChatMessage()}
                    disabled={isChatLoading || !newMessage.trim()}
                    size="sm"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    {isChatLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground" />
                    ) : (
                      'Send'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Button
              onClick={() => setShowAIAssistant(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl border border-primary/30 w-14 h-14 rounded-full flex items-center justify-center"
            >
              <Bot className="w-6 h-6" />
            </Button>
          )}
        </div>
      </div>
    </StudentLayout>
  );
};

export default IELTSSpeakingTest;