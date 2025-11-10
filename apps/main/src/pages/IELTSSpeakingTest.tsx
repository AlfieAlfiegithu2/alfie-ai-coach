import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Mic, Play, Pause, Clock, ArrowRight, ArrowLeft, Upload, Volume2, Bot, ListTree, BookOpen, PauseIcon, PlayIcon, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import StudentLayout from "@/components/StudentLayout";
import InteractiveSpeakingAssistant from "@/components/InteractiveSpeakingAssistant";
import { supabase } from "@/integrations/supabase/client";
import { AudioR2 } from "@/lib/cloudflare-r2";
import SpotlightCard from "@/components/SpotlightCard";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AudioPlayerProvider, useAudioPlayer, AudioPlayerButton, AudioPlayerTime, AudioPlayerProgress, AudioPlayerDuration, AudioPlayerSpeed } from "@/components/ui/audio-player";
import { LiveWaveform } from "@/components/ui/live-waveform";

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

interface Track {
  id: string;
  name: string;
  url: string;
}

// Custom Audio Player component that accepts tracks as props
const AudioPlayerWithTracks = ({ tracks, currentQuestionIndex }: { tracks: Track[], currentQuestionIndex: number }) => {
  return (
    <AudioPlayerProvider>
      <AudioPlayerDemoWithTracks tracks={tracks} currentQuestionIndex={currentQuestionIndex} />
    </AudioPlayerProvider>
  )
}

const AudioPlayerDemoWithTracks = ({ tracks, currentQuestionIndex }: { tracks: Track[], currentQuestionIndex: number }) => {
  const player = useAudioPlayer()
  
  // Note: Auto-play removed - browsers require user interaction before playing audio
  // Audio will only play when user clicks on a track in the list

  return (
    <Card className="w-full overflow-hidden p-0">
      <div className="flex flex-col lg:h-[180px] lg:flex-row">
        <div className="bg-muted/50 flex flex-col overflow-hidden lg:h-full lg:w-64">
          <ScrollArea className="h-48 w-full lg:h-full">
            <div className="space-y-1 p-3">
              {tracks.map((song) => (
                <SongListItem
                  key={song.id}
                  song={song}
                />
              ))}
            </div>
          </ScrollArea>
        </div>
        <Player currentQuestionIndex={currentQuestionIndex} tracks={tracks} />
      </div>
    </Card>
  )
}

const Player = ({ currentQuestionIndex, tracks }: { currentQuestionIndex: number, tracks: Track[] }) => {
  const player = useAudioPlayer()
  
  // Get current question track
  const currentTrack = tracks[currentQuestionIndex]
  const canPlay = currentTrack !== undefined

  return (
    <div className="flex flex-1 items-center p-4 sm:p-6">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-4">
          <h3 className="text-base font-semibold sm:text-lg">
            {player.activeItem?.data?.name ?? `Question ${currentQuestionIndex + 1}`}
          </h3>
        </div>
        <div className="flex items-center gap-3 sm:gap-4">
          <AudioPlayerButton
            variant="outline"
            size="default"
            className="h-12 w-12 shrink-0 sm:h-10 sm:w-10"
            disabled={!canPlay}
          />

          <div className="flex flex-1 items-center gap-2 sm:gap-3">
            <AudioPlayerTime className="text-xs tabular-nums" />
            <AudioPlayerProgress className="flex-1" />
            <AudioPlayerDuration className="text-xs tabular-nums" />
            <AudioPlayerSpeed variant="ghost" size="icon" />
          </div>
        </div>
      </div>
    </div>
  )
}

const SongListItem = ({
  song,
}: {
  song: Track
}) => {
  const player = useAudioPlayer()
  const isActive = player.isItemActive(song.id)
  const isCurrentlyPlaying = isActive && player.isPlaying

  return (
    <div className="group/song relative">
      <Button
        variant={isActive ? "secondary" : "ghost"}
        size="sm"
        className={cn(
          "h-10 w-full justify-start px-3 font-normal sm:h-9 sm:px-2",
          isActive && "bg-secondary"
        )}
        onClick={() => {
          if (isCurrentlyPlaying) {
            player.pause()
          } else {
            player.play({
              id: song.id,
              src: song.url,
              data: song,
            })
          }
        }}
      >
        <div className="flex w-full items-center gap-3">
          <div className="flex w-5 shrink-0 items-center justify-center">
            {isCurrentlyPlaying ? (
              <PauseIcon className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
            ) : (
              <PlayIcon className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
            )}
          </div>
          <span className="truncate text-left text-sm">{song.name}</span>
        </div>
      </Button>
    </div>
  )
}

const IELTSSpeakingTest = () => {
  const params = useParams();
  // Support both testId (UUID) and testName (legacy) for backward compatibility
  const testId = params.testId || params.testName;
  const navigate = useNavigate();
  const { toast } = useToast();

  
  const [testData, setTestData] = useState<TestData | null>(null);
  const [availableTests, setAvailableTests] = useState<any[]>([]);
  const [currentPart, setCurrentPart] = useState(1);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPlayingRecording, setIsPlayingRecording] = useState(false);
  const [currentPlayingRecording, setCurrentPlayingRecording] = useState<string | null>(null);
  const [currentAudioElement, setCurrentAudioElement] = useState<HTMLAudioElement | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [preparationTime, setPreparationTime] = useState(60);
  const [recordings, setRecordings] = useState<{[key: string]: Blob}>({});
  const [part2Notes, setPart2Notes] = useState("");
  const [showNoteTips, setShowNoteTips] = useState(false);
  const [noteTips, setNoteTips] = useState("");
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [showQuestion, setShowQuestion] = useState(false);
  const [userHasInteracted, setUserHasInteracted] = useState(false);
  const [needsInteractionPrompt, setNeedsInteractionPrompt] = useState(false);
  // Foxbot chat state for speaking assistant
  interface ChatMessage { id: string; type: 'user' | 'bot'; content: string; timestamp: Date; }
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'bot',
      content: "Hello! I'm Foxbot, your expert IELTS Speaking tutor. I'm here to guide you through strategic speaking techniques, structure, and vocabulary enhancement. What specific aspect of your speaking would you like to work on?",
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
      const n = stored ? parseInt(stored, 10) : 100;
      const v = n / 100;
      return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0.5;
    } catch {
      return 0.5;
    }
  })();
  const globalVolumeRef = useRef<number>(initialVol);

  useEffect(() => {
    if (testId) {
      loadTestData();
    } else {
      loadAvailableTests();
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [testId]);

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

  // Reset showQuestion when question changes
  useEffect(() => {
    setShowQuestion(false);
  }, [currentQuestion, currentPart]);

  // Track user interaction to enable autoplay
  useEffect(() => {
    const handleUserInteraction = async () => {
      if (!userHasInteracted) {
        // Set state first
        setUserHasInteracted(true);
        setNeedsInteractionPrompt(false);
        
        // Wait for state to update and ensure the interaction event is fully processed
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Try to play audio immediately after first interaction
        if (testData && currentPart !== 2) {
          const currentPrompt = getCurrentPrompt();
          if (currentPrompt?.audio_url && !isPlaying && !isRecording) {
            console.log(`🎵 User interacted - playing audio for Part ${currentPart}, Question ${currentQuestion + 1}`);
            try {
              await playAudio(currentPrompt.audio_url!);
            } catch (error) {
              console.log('Audio play failed after interaction:', error);
            }
          }
        }
      }
      // Remove listeners after first interaction
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };

    if (!userHasInteracted) {
      document.addEventListener('click', handleUserInteraction, { once: true });
      document.addEventListener('touchstart', handleUserInteraction, { once: true });
      document.addEventListener('keydown', handleUserInteraction, { once: true });
    }

    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userHasInteracted, testData, currentPart, currentQuestion]);

  // Auto-play audio when test data loads or question changes (only after user interaction)
  useEffect(() => {
    // Only attempt to play audio if user has already interacted
    if (testData && currentPart !== 2 && userHasInteracted) {
      const currentPrompt = getCurrentPrompt();
      if (currentPrompt?.audio_url && !isRecording && !isPlaying) {
        // Small delay to ensure UI is ready
        setTimeout(() => {
          console.log(`🎵 Auto-playing audio for Part ${currentPart}, Question ${currentQuestion + 1}`);
          playAudio(currentPrompt.audio_url!).catch((error) => {
            // Silently handle autoplay failure
            console.log('Autoplay failed:', error);
          });
        }, 300);
      }
    }
    // Don't attempt to play if user hasn't interacted - wait for user interaction handler
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testData, currentPart, currentQuestion, userHasInteracted, isRecording]);

  const loadTestData = async () => {
    if (!testId) return;
    
    setIsLoading(true);
    try {
      console.log(`🔍 Loading speaking test data for test ID: ${testId}`);

      // Get the test details - try ID first (UUID), then test_name if ID fails (legacy support)
      let testData, testError;
      
      // Check if testId looks like a UUID (has dashes and is 36 chars)
      if (testId.includes('-') && testId.length === 36) {
        // It's a UUID, query by id
        const result = await supabase
          .from('tests')
          .select('*')
          .eq('id', testId)
          .single();
        testData = result.data;
        testError = result.error;
      } else {
        // It's a test name (legacy), query by test_name
        const result = await supabase
          .from('tests')
          .select('*')
          .eq('test_name', testId)
          .eq('test_type', 'IELTS')
          .eq('module', 'Speaking')
          .maybeSingle();
        testData = result.data;
        testError = result.error;
      }

      if (testError) throw testError;
      
      if (!testData) {
        toast({
          title: "Test Not Found",
          description: "This speaking test doesn't exist. Please check the test ID.",
          variant: "destructive"
        });
        navigate(-1);
        return;
      }
      
      console.log('✅ Test loaded:', testData.test_name);

      // Load speaking prompts for this specific test - use actual test ID from database
      const actualTestId = testData.id;
      const { data: prompts, error: promptsError } = await supabase
        .from('speaking_prompts')
        .select('*')
        .eq('test_id', actualTestId)
        .order('part_number', { ascending: true });

      if (promptsError) {
        console.error('❌ Error loading prompts:', promptsError);
        // Continue anyway - show empty test
      }

      const promptsList = prompts || [];
      console.log(`📝 Loaded ${promptsList.length} total speaking prompts`);

      if (promptsList.length > 0) {
        const part1 = promptsList.filter(p => p.part_number === 1);
        const part2 = promptsList.find(p => p.part_number === 2);
        const part3 = promptsList.filter(p => p.part_number === 3);

        setTestData({
          id: testData.id,
          test_name: testData.test_name,
          part1_prompts: part1,
          part2_prompt: part2 || null,
          part3_prompts: part3
        });
        
        console.log(`✅ Test ready: Part 1 (${part1.length}), Part 2 (${part2 ? 1 : 0}), Part 3 (${part3.length})`);
      } else {
        console.log(`ℹ️ No speaking prompts available - showing blank test`);
        setTestData({
          id: testData.id,
          test_name: testData.test_name,
          part1_prompts: [],
          part2_prompt: null,
          part3_prompts: []
        });
      }
    } catch (error) {
      console.error('❌ Error:', error);
      // Still show the test so student can record
      if (testId) {
        setTestData({
          id: testId,
          test_name: "Speaking Test",
          part1_prompts: [],
          part2_prompt: null,
          part3_prompts: []
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Load list of available speaking tests
  const loadAvailableTests = async () => {
    setIsLoading(true);
    try {
      console.log('📋 Loading available speaking tests...');
      
      // Match admin query exactly: filter for tests where module='Speaking' OR skill_category='Speaking'
      const { data: tests, error: testsError } = await supabase
        .from('tests')
        .select('*')
        .eq('test_type', 'IELTS')
        .or('module.eq.Speaking,skill_category.eq.Speaking')
        .order('created_at', { ascending: false });

      if (testsError) {
        console.error('❌ Error loading tests:', testsError);
        throw testsError;
      }

      // Fallback: if no tests found with exact match, try case-insensitive
      let finalTests = tests || [];
      if (finalTests.length === 0) {
        console.log('🔄 No exact matches, trying case-insensitive search...');
        const { data: allIeltsTests } = await supabase
          .from('tests')
          .select('*')
          .eq('test_type', 'IELTS')
          .order('created_at', { ascending: false });
        
        // Filter client-side exactly like admin does
        finalTests = (allIeltsTests || []).filter((test: any) => 
          test.module === 'Speaking' || test.skill_category === 'Speaking'
        );
      }

      console.log(`✅ Found ${finalTests.length} available speaking tests:`, finalTests.map(t => ({ id: t.id, name: t.test_name, module: t.module, skill_category: t.skill_category })));
      setAvailableTests(finalTests);
    } catch (error) {
      console.error('❌ Error loading tests:', error);
      toast({
        title: "Error",
        description: "Failed to load available speaking tests",
        variant: "destructive"
      });
      setAvailableTests([]);
    } finally {
      setIsLoading(false);
    }
  };

  const playAudio = async (audioUrl: string) => {
    if (!audioUrl) return;
    
    // Mark user as interacted when they manually trigger audio
    if (!userHasInteracted) {
      setUserHasInteracted(true);
      setNeedsInteractionPrompt(false);
    }
    
    try {
      setIsPlaying(true);
      
      // Stop any currently playing audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
      
      // Create new audio element
      const audio = new Audio(audioUrl);
      audio.preload = 'auto';
      audio.volume = globalVolumeRef.current;
      
      // Set up event handlers before playing
      audio.onended = () => {
        setIsPlaying(false);
        console.log(`✅ Audio playback completed`);
        audioRef.current = null;
      };
      
      audio.onerror = (e) => {
        setIsPlaying(false);
        console.error('Audio playback error:', e);
        audioRef.current = null;
        toast({
          title: "Audio Error",
          description: "Failed to play audio prompt",
          variant: "destructive"
        });
      };
      
      audio.onloadstart = () => {
        console.log('Audio loading started');
      };
      
      audio.oncanplay = () => {
        console.log('Audio can play');
      };
      
      audio.oncanplaythrough = () => {
        console.log('Audio can play through');
      };
      
      // Store reference
      audioRef.current = audio;
      
      console.log(`▶️ Playing audio: ${audioUrl}`);
      
      // Load the audio first
      audio.load();
      
      // Wait a bit for audio to load, then play
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Try to play - this will fail if user hasn't interacted
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        await playPromise;
        console.log('Audio started playing successfully');
      }
    } catch (error: any) {
      console.error('Error playing audio:', error);
      setIsPlaying(false);
      
      // Handle specific browser autoplay restrictions
      if (error.name === 'NotAllowedError' || error.message?.includes('user didn\'t interact')) {
        // Only show prompt if user hasn't interacted yet
        if (!userHasInteracted) {
          setNeedsInteractionPrompt(true);
        }
        // Don't show toast for autoplay failures - user can click replay button
        console.log('Autoplay blocked - user needs to interact first');
      } else {
        toast({
          title: "Audio Error", 
          description: "Failed to play audio prompt. Please try again.",
          variant: "destructive"
        });
      }
      
      // Clean up
      if (audioRef.current) {
        audioRef.current = null;
      }
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
      // Stop any currently playing recording first
      if (currentAudioElement) {
        stopRecordingPlayback();
      }

      const audioUrl = URL.createObjectURL(recording);
      const audio = new Audio(audioUrl);
      audio.volume = globalVolumeRef.current;

      // Store reference to the audio element
      setCurrentAudioElement(audio);

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        setIsPlayingRecording(false);
        setCurrentPlayingRecording(null);
        setCurrentAudioElement(null);
        console.log(`✅ Recording playback ended: ${recordingKey}`);
      };

      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        setIsPlayingRecording(false);
        setCurrentPlayingRecording(null);
        setCurrentAudioElement(null);
        console.error(`❌ Recording playback error: ${recordingKey}`);
      };

      await audio.play();
      setIsPlayingRecording(true);
      setCurrentPlayingRecording(recordingKey);
      console.log(`🎵 Started recording playback: ${recordingKey}`);
    } catch (error) {
      console.error('Error playing recording:', error);
      setIsPlayingRecording(false);
      setCurrentPlayingRecording(null);
      setCurrentAudioElement(null);
      toast({
        title: "Playback Error",
        description: "Failed to play your recording",
        variant: "destructive"
      });
    }
  };

  const stopRecordingPlayback = () => {
    if (currentAudioElement) {
      try {
        currentAudioElement.pause();
        currentAudioElement.currentTime = 0;
        console.log('🛑 Stopped recording playback');
      } catch (error) {
        console.error('Error stopping recording playback:', error);
      }
    }

    setIsPlayingRecording(false);
    setCurrentPlayingRecording(null);
    setCurrentAudioElement(null);
  };

  const getNoteTakingTips = async () => {
    if (!testData?.part2_prompt) return;
    
    setShowNoteTips(true);
    try {
      const { data, error } = await supabase.functions.invoke('openai-chat', {
        body: {
          skipCache: true,
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
      if (recordingEntries.length === 0) {
        toast({
          title: 'No recordings found',
          description: 'Please record answers before submitting.',
          variant: 'destructive'
        });
        return;
      }
      const uploadPromises = recordingEntries.map(async ([key, blob]) => {
        const fileName = `speaking_${testData?.id}_${key}_${Date.now()}.webm`;

        // Convert blob to File object
        const file = new File([blob], fileName, { type: 'audio/webm' });

        try {
          console.log(`📤 Uploading speaking recording: ${fileName} (${blob.size} bytes)`);
          const result = await AudioR2.uploadSpeaking(file, testData?.id || 'unknown', key);

          if (!result.success) {
            throw new Error(result.error || 'Upload failed');
          }

          console.log(`✅ Speaking recording uploaded successfully: ${result.url}`);
          return {
            part: key,
            audio_url: result.url
          };
        } catch (error) {
          console.error(`❌ Failed to upload ${fileName}:`, error);
          // Fallback: create a mock URL but log the error
          toast({
            title: "Upload Warning",
            description: `Audio upload failed for ${key}. Analysis may be limited.`,
            variant: "destructive"
          });

          // Still return a mock URL so the test can continue
          const mockUrl = `https://your-bucket.your-domain.com/${fileName}`;
          return {
            part: key,
            audio_url: mockUrl,
            upload_error: true
          };
        }
      });

      const uploadedRecordings = await Promise.all(uploadPromises);
      if (uploadedRecordings.length === 0) {
        toast({ title: 'Upload error', description: 'No audio files were uploaded.', variant: 'destructive' });
        return;
      }

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
              correct_answers: null,
              score_percentage: 0, // scored later
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
          // Clear local recordings after successful save
          setRecordings({});
        }
      } catch (saveError) {
        console.error('Error saving speaking results:', saveError);
        toast({ title: 'Save error', description: 'Failed to save speaking results.', variant: 'destructive' });
      }

      // Navigate to results page with recordings data and test prompts for transcriptions
      navigate('/ielts-speaking-results', {
        state: {
          testData,
          recordings: uploadedRecordings,
          audioBlobs: Object.fromEntries(recordingEntries) // Pass original blobs for analysis
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
          <p className="mt-2 text-sm text-muted-foreground">Loading speaking tests...</p>
        </div>
      </div>
    );
  }

  // Show test selection if no testId provided (regardless of whether tests are found)
  if (!testId) {
    return (
      <div className="min-h-screen relative">
        <div className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed"
             style={{
               backgroundImage: `url('https://raw.githubusercontent.com/AlfieAlfiegithu2/alfie-ai-coach/main/public/1000031207.png')`,
               backgroundColor: '#ffffff'
             }} />
        <div className="relative z-10">
          <StudentLayout title="Available Speaking Tests">
            <div className="min-h-screen py-12">
              <div className="container mx-auto px-4">
                <div className="max-w-4xl mx-auto">
                  <div className="mb-8 text-center">
                    <h1 className="text-4xl font-bold text-foreground mb-2">IELTS speaking tests</h1>
                  </div>

                  {availableTests.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {availableTests.map((test) => (
                        <SpotlightCard key={test.id} className="cursor-pointer h-[140px] hover:scale-105 transition-all duration-300 hover:shadow-lg bg-white/80 flex items-center justify-center" onClick={() => navigate(`/ielts-speaking-test/${test.id}`)}>
                          <CardContent className="p-3 md:p-4 text-center flex items-center justify-center h-full">
                            <h3 className="font-semibold text-sm">{test.test_name}</h3>
                          </CardContent>
                        </SpotlightCard>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-lg text-muted-foreground mb-4">No speaking tests available yet</p>
                      <Button onClick={() => navigate('/ielts-portal')} variant="outline">
                        Back to Portal
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </StudentLayout>
        </div>
      </div>
    );
  }

  // If testId is provided but testData is null, show error
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
    if (currentPart === 1) return "Part 1";
    if (currentPart === 2) return "Part 2"; 
    if (currentPart === 3) return "Part 3";
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
          skipCache: true,
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
      toast({ title: 'Error', description: 'Failed to get response from Foxbot', variant: 'destructive' });
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
    <div className="min-h-screen relative">
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed"
           style={{
             backgroundImage: `url('https://raw.githubusercontent.com/AlfieAlfiegithu2/alfie-ai-coach/main/public/1000031207.png')`,
             backgroundColor: '#ffffff'
           }} />
      <div className="relative z-10 min-h-screen flex flex-col">
        <StudentLayout title={`IELTS Speaking - ${testData.test_name}`} showBackButton>
          <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-120px)] py-8">
            <div className="w-full max-w-4xl mx-auto space-y-4 px-4 flex flex-col">
            {/* Header */}

            {/* Current Part Indicator */}
            <div className="text-center py-2">
              <span className="text-lg font-semibold text-black">
                Part {currentPart}
              </span>
            </div>

            {/* Main Content */}
            <Card className="card-modern bg-white/80 backdrop-blur-sm shadow-lg rounded-2xl border border-white/20 flex flex-col" style={{ 
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.1)'
            }}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>
                {currentPart === 2 && "Part 2 - Individual Long Turn"}
                {currentPart === 3 && "Part 3 - Two-way Discussion"}
              </span>
              <div className="flex items-center gap-3">
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
          <CardContent className="space-y-4 flex flex-col relative">
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

            {/* Part 1 - Structured Questions Display */}
            {currentPart === 1 && testData.part1_prompts.length > 0 && (
              <div className="space-y-6 relative flex flex-col min-h-[200px]">
                {/* Question Text - Fixed Height Container */}
                <div className="min-h-[200px] flex items-center justify-center flex-1">
                  {showQuestion && (
                    <div className="text-lg font-medium text-center">
                      {getCurrentQuestionText()}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Part 3 - Structured Questions Display */}
            {currentPart === 3 && testData.part3_prompts.length > 0 && (
              <div className="space-y-6 relative flex flex-col min-h-[200px]">
                {/* Question Text - Fixed Height Container */}
                <div className="min-h-[200px] flex items-center justify-center flex-1">
                  {showQuestion && (
                    <div className="text-lg font-medium text-center">
                      {getCurrentQuestionText()}
                    </div>
                  )}
                </div>
              </div>
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

            {/* Recording Playback for Parts 1 & 3 - Moved Above Recording Buttons */}
            {recordings[`part${currentPart}_q${currentQuestion}`] && (currentPart === 1 || currentPart === 3) && (
              <div className="flex justify-center mb-4">
                <Button
                  onClick={() => playRecording(`part${currentPart}_q${currentQuestion}`)}
                  variant="outline"
                  className="rounded-xl"
                >
                  <Volume2 className="w-4 h-4 mr-2" />
                  Listen to Your Recording
                </Button>
              </div>
            )}

            {/* Recording Interface */}
            {((currentPart === 2 && preparationTime === 0) || currentPart !== 2) && (
              <div className="text-center space-y-4">
                {isRecording ? (
                  <div className="space-y-4">
                    {/* Live Audio Waveform */}
                    <LiveWaveform
                      active={true}
                      height={80}
                      barWidth={3}
                      barGap={1}
                      barRadius={1.5}
                      mode="static"
                      fadeEdges={true}
                      barColor="#000000"
                      sensitivity={1}
                      fftSize={256}
                      historySize={60}
                      updateRate={30}
                    />

                    <Button
                      onClick={stopRecording}
                      variant="outline"
                      className="rounded-xl h-12 px-6"
                    >
                      <Mic className="w-4 h-4 mr-2" />
                      Stop Recording
                    </Button>
                  </div>
                ) : (
                  <TooltipProvider>
                    <div className="flex items-center justify-center gap-3">
                      {/* Record Button */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            onClick={startRecording}
                            className="rounded-xl bg-white/80 hover:bg-white/90 text-foreground border border-border shadow-sm h-12 w-12"
                            size="icon"
                          >
                            <Mic className="w-5 h-5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Start recording your answer</p>
                        </TooltipContent>
                      </Tooltip>

                      {/* Replay Audio Button */}
                      {currentPrompt?.audio_url && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              onClick={repeatAudio}
                              disabled={isPlaying}
                              variant="outline"
                              size="icon"
                              className="h-12 w-12 rounded-xl border-primary/30 text-primary hover:bg-primary/10"
                            >
                              {isPlaying ? (
                                <Pause className="w-5 h-5" />
                              ) : (
                                <Play className="w-5 h-5" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{isPlaying ? "Pause question audio" : "Play question audio"}</p>
                          </TooltipContent>
                        </Tooltip>
                      )}

                      {/* Listen to Your Recording Button */}
                      {recordings[`part${currentPart}_q${currentQuestion}`] && (currentPart === 1 || currentPart === 3) && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              onClick={() => {
                                // If currently playing this recording, stop it. Otherwise, start playing.
                                if (isPlayingRecording && currentPlayingRecording === `part${currentPart}_q${currentQuestion}`) {
                                  stopRecordingPlayback();
                                } else {
                                  playRecording(`part${currentPart}_q${currentQuestion}`);
                                }
                              }}
                              variant="outline"
                              size="icon"
                              className="h-12 w-12 rounded-xl border-primary/30 text-primary hover:bg-primary/10"
                            >
                              {isPlayingRecording && currentPlayingRecording === `part${currentPart}_q${currentQuestion}` ? (
                                <Pause className="w-5 h-5" />
                              ) : (
                                <Volume2 className="w-5 h-5" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{isPlayingRecording && currentPlayingRecording === `part${currentPart}_q${currentQuestion}` ? "Stop listening to your recording" : "Listen to your recorded answer"}</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </TooltipProvider>
                )}
              </div>
            )}

            {/* Question Navigation Buttons - Bottom Corners */}
            {(currentPart === 1 || currentPart === 3) && (
              <>
                {/* Previous Question Button - Bottom Left */}
                <Button
                  variant="ghost"
                  onClick={() => {
                    if (currentQuestion > 0) {
                      setCurrentQuestion(currentQuestion - 1);
                      setShowQuestion(false);
                    }
                  }}
                  disabled={currentQuestion === 0}
                  size="icon"
                  className="absolute bottom-0 left-0 h-12 w-12"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>

                {/* Next Question Button - Bottom Right */}
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowQuestion(false);
                    nextQuestion();
                  }}
                  disabled={recordings[`part${currentPart}_q${currentQuestion}`] === undefined}
                  size="icon"
                  className="absolute bottom-0 right-0 h-12 w-12"
                >
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Exit Test Button - Text Only */}
        <div className="fixed bottom-6 left-6 z-40">
          <button
            onClick={() => navigate('/ielts-portal')}
            className="text-sm text-black hover:text-gray-700 transition-colors cursor-pointer"
          >
            Exit Test
          </button>
        </div>

        {/* AI Assistant - Floating Bottom Right (Writing-style) */}
        <div className="fixed bottom-24 right-6 z-50">
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
                  {/* Current question displayed at the top of chat */}
                  <div className="rounded-lg p-3 bg-muted/60 border border-border">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Question</div>
                    <div className="text-sm font-medium text-foreground">{questionType}</div>
                    <div className="text-sm text-muted-foreground whitespace-pre-wrap mt-1">{currentQuestionText || 'No question available.'}</div>
                  </div>

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
                                .replace(/(<li>.*<\/li>)/s, '<ul>$1<\/ul>')
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
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mt-1 overflow-hidden">
                        <img src="/lovable-uploads/dc03c5f0-f40a-40f2-a71a-0b12438f0f6b.png" alt="Foxbot" className="w-6 h-6 rounded-full object-cover" />
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
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl border border-primary/30 w-14 h-14 rounded-full flex items-center justify-center p-0 overflow-hidden"
            >
              <img src="/lovable-uploads/dc03c5f0-f40a-40f2-a71a-0b12438f0f6b.png" alt="Foxbot" className="w-12 h-12 rounded-full object-cover" />
            </Button>
          )}
        </div>
            </div>
          </div>
        </StudentLayout>
      </div>
    </div>
  );
};

export default IELTSSpeakingTest;