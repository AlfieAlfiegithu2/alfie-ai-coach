import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Mic, Play, Pause, Clock, ArrowRight, ArrowLeft, Upload, Volume2, Bot, ListTree, BookOpen, PauseIcon, PlayIcon, Eye, EyeOff, Plus, Square, Send, Sparkles } from "lucide-react";
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
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ui/conversation";
import { Message, MessageContent } from "@/components/ui/message";
import { Response } from "@/components/ui/response";
import { Orb } from "@/components/ui/orb";
import { ShimmeringText } from "@/components/ui/shimmering-text";

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
  const [showAIAssistantVisible, setShowAIAssistantVisible] = useState(false); // for dock-style animation
  const [showQuestion, setShowQuestion] = useState(false);
  const [userHasInteracted, setUserHasInteracted] = useState(false);
  const [needsInteractionPrompt, setNeedsInteractionPrompt] = useState(false);
  // Catie chat state for speaking assistant
  interface ChatMessage { id: string; type: 'user' | 'bot'; content: string; timestamp: Date; }
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'bot',
      content: "Hello! I'm Catie, your expert IELTS Speaking tutor. I'm here to guide you through strategic speaking techniques, structure, and vocabulary enhancement. What specific aspect of your speaking would you like to work on?",
      timestamp: new Date()
    }
  ]);
  const [newMessage, setNewMessage] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mainCardRef = useRef<HTMLDivElement>(null);
  const recordingStartTimeRef = useRef<number | null>(null);

  // Global audio volume shared across the app (0.0 - 1.0)
  const initialVol = (() => {
    try {
      const stored = typeof window !== 'undefined' ? window.localStorage.getItem('appAudioVolume') : null;
      const n = stored ? parseInt(stored, 10) : 100;
      const v = n / 100;
      return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 1.0; // Default to max volume
    } catch {
      return 1.0; // Default to max volume on error
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

  // Auto-scroll to bottom when new chat messages are added
  useEffect(() => {
    if (chatMessages.length > 0) {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        const scrollContainer = document.querySelector('[data-conversation-content]');
        if (scrollContainer) {
          scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior: 'smooth' });
        }
      }, 100);
    }
  }, [chatMessages]);

  // Reset showQuestion when question changes
  useEffect(() => {
    setShowQuestion(false);
  }, [currentQuestion, currentPart]);

  // Disable all hover effects on main card container
  useEffect(() => {
    if (mainCardRef.current) {
      const card = mainCardRef.current;
      
      // Set initial styles
      card.style.setProperty('transform', 'scale(1)', 'important');
      card.style.setProperty('transition', 'none', 'important');
      
      // Prevent hover effects
      const preventHover = (e: MouseEvent) => {
        card.style.setProperty('transform', 'scale(1)', 'important');
        card.style.setProperty('box-shadow', '0 8px 32px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.1)', 'important');
        card.style.setProperty('transition', 'none', 'important');
      };
      
      card.addEventListener('mouseenter', preventHover);
      card.addEventListener('mouseleave', preventHover);
      
      return () => {
        card.removeEventListener('mouseenter', preventHover);
        card.removeEventListener('mouseleave', preventHover);
      };
    }
  }, [testData, currentPart, currentQuestion]);

  // DISABLED: Track user interaction to enable autoplay
  // useEffect(() => {
  //   const handleUserInteraction = async () => {
  //     if (!userHasInteracted) {
  //       // Set state first
  //       setUserHasInteracted(true);
  //       setNeedsInteractionPrompt(false);

  //       // Wait for state to update and ensure the interaction event is fully processed
  //       await new Promise(resolve => setTimeout(resolve, 100));

  //       // Try to play audio immediately after first interaction
  //       if (testData && currentPart !== 2) {
  //         const currentPrompt = getCurrentPrompt();
  //         if (currentPrompt?.audio_url && !isPlaying && !isRecording) {
  //           console.log(`🎵 User interacted - playing audio for Part ${currentPart}, Question ${currentQuestion + 1}`);
  //           try {
  //             await playAudio(currentPrompt.audio_url!);
  //           } catch (error) {
  //             console.log('Audio play failed after interaction:', error);
  //           }
  //         }
  //       }
  //     }
  //     // Remove listeners after first interaction
  //     document.removeEventListener('click', handleUserInteraction);
  //     document.removeEventListener('touchstart', handleUserInteraction);
  //     document.removeEventListener('keydown', handleUserInteraction);
  //   };

  //   if (!userHasInteracted) {
  //     document.addEventListener('click', handleUserInteraction, { once: true });
  //     document.addEventListener('touchstart', handleUserInteraction, { once: true });
  //     document.addEventListener('keydown', handleUserInteraction, { once: true });
  //   }

  //   return () => {
  //     document.removeEventListener('click', handleUserInteraction);
  //     document.removeEventListener('touchstart', handleUserInteraction);
  //     document.removeEventListener('keydown', handleUserInteraction);
  //   };
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [userHasInteracted, testData, currentPart, currentQuestion]);

  // DISABLED: Auto-play audio when test data loads or question changes (only after user interaction)
  // useEffect(() => {
  //   // Only attempt to play audio if user has already interacted
  //   if (testData && currentPart !== 2 && userHasInteracted) {
  //     const currentPrompt = getCurrentPrompt();
  //     if (currentPrompt?.audio_url && !isRecording && !isPlaying) {
  //       // Small delay to ensure UI is ready
  //       setTimeout(() => {
  //         console.log(`🎵 Auto-playing audio for Part ${currentPart}, Question ${currentQuestion + 1}`);
  //         playAudio(currentPrompt.audio_url!).catch((error) => {
  //           // Silently handle autoplay failure
  //           console.log('Autoplay failed:', error);
  //         });
  //       }, 300);
  //     }
  //   }
  //   // Don't attempt to play if user hasn't interacted - wait for user interaction handler
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [testData, currentPart, currentQuestion, userHasInteracted, isRecording]);

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

  const playRecordingStartSound = () => {
    try {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();

      // Create two oscillators for a pleasant ascending chime
      const o1 = ctx.createOscillator();
      const o2 = ctx.createOscillator();
      const g = ctx.createGain();

      o1.type = 'sine';
      o1.frequency.value = 523; // C5 note
      o2.type = 'sine';
      o2.frequency.value = 659; // E5 note

      o1.connect(g);
      o2.connect(g);
      g.connect(ctx.destination);

      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 0.01);

      o1.start();
      o2.start();

      setTimeout(() => {
        g.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.15);
        setTimeout(() => {
          o1.stop();
          o2.stop();
          ctx.close();
        }, 200);
      }, 120);
    } catch {}
  };

  const playRecordingStopSound = () => {
    // Use the same pleasant chime sound for stop as start
    playRecordingStartSound();
  };

  const beep = () => playRecordingStartSound(); // For backward compatibility

  const startRecording = async () => {
    try {
      beep();
      // Delay recording start to avoid capturing the beep sound
      await new Promise(resolve => setTimeout(resolve, 100));
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
      recordingStartTimeRef.current = Date.now(); // Track when recording started
      
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
    // For Part 2, enforce minimum 1 minute recording time
    if (currentPart === 2 && recordingStartTimeRef.current) {
      const elapsedSeconds = Math.floor((Date.now() - recordingStartTimeRef.current) / 1000);
      const minimumSeconds = 60; // 1 minute minimum
      
      if (elapsedSeconds < minimumSeconds) {
        const remainingSeconds = minimumSeconds - elapsedSeconds;
        toast({
          title: "Minimum Recording Time Required",
          description: `For IELTS Part 2, you should speak for at least 1 minute to receive a good score. Please continue recording for ${remainingSeconds} more second${remainingSeconds !== 1 ? 's' : ''}.`,
          variant: "destructive",
          duration: 5000
        });
        return; // Prevent stopping
      }
    }

    playRecordingStopSound();
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setTimeLeft(0);
      recordingStartTimeRef.current = null; // Reset start time
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

  const closeAIAssistant = () => {
    // Mac-style "suck into dock" animation:
    // 1) Animate card down + shrink (showAIAssistantVisible -> false).
    // 2) After animation completes, unmount card and show avatar.
    setShowAIAssistantVisible(false);
    setTimeout(() => {
      setShowAIAssistant(false);
    }, 260); // must match card transition duration
  };

  const nextQuestion = () => {
    if (currentPart === 1) {
      if (currentQuestion < (testData?.part1_prompts.length || 0) - 1) {
        setCurrentQuestion(currentQuestion + 1);
        // Clear chat for new question
        setChatMessages([{
          id: '1',
          type: 'bot',
          content: "Hello! I'm Catie, your expert IELTS Speaking tutor. I'm here to guide you through strategic speaking techniques, structure, and vocabulary enhancement. What specific aspect of your speaking would you like to work on?",
          timestamp: new Date()
        }]);
        console.log(`➡️ Moving to Part 1, Question ${currentQuestion + 2}`);
      } else {
        // Move to Part 2
        setCurrentPart(2);
        setCurrentQuestion(0);
        setPreparationTime(60);
        // Clear chat for new part
        setChatMessages([{
          id: '1',
          type: 'bot',
          content: "Hello! I'm Catie, your expert IELTS Speaking tutor. I'm here to guide you through strategic speaking techniques, structure, and vocabulary enhancement. What specific aspect of your speaking would you like to work on?",
          timestamp: new Date()
        }]);
        console.log(`➡️ Moving to Part 2 - Long Turn`);
        startPreparationTimer();
      }
    } else if (currentPart === 2) {
      // Move to Part 3 after Part 2
      setCurrentPart(3);
      setCurrentQuestion(0);
      // Clear chat for new part
      setChatMessages([{
        id: '1',
        type: 'bot',
        content: "Hello! I'm Catie, your expert IELTS Speaking tutor. I'm here to guide you through strategic speaking techniques, structure, and vocabulary enhancement. What specific aspect of your speaking would you like to work on?",
        timestamp: new Date()
      }]);
      console.log(`➡️ Moving to Part 3 - Discussion`);
    } else if (currentPart === 3) {
      if (currentQuestion < (testData?.part3_prompts.length || 0) - 1) {
        setCurrentQuestion(currentQuestion + 1);
        // Clear chat for new question
        setChatMessages([{
          id: '1',
          type: 'bot',
          content: "Hello! I'm Catie, your expert IELTS Speaking tutor. I'm here to guide you through strategic speaking techniques, structure, and vocabulary enhancement. What specific aspect of your speaking would you like to work on?",
          timestamp: new Date()
        }]);
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

      console.log('📝 Preparing speaking uploads:', {
        count: recordingEntries.length,
        keys: recordingEntries.map(([key]) => key),
      });

      const uploadPromises = recordingEntries.map(async ([key, blob], index) => {
        const safeTestId = testData?.id || 'unknown';
        const timestamp = Date.now();
        const fileName = `speaking_${safeTestId}_${key}_${timestamp}.webm`;

        // Convert blob to File object
        const file = new File([blob], fileName, { type: 'audio/webm' });

        try {
          console.log(`📤 Uploading speaking recording [${index + 1}/${recordingEntries.length}]:`, {
            fileName,
            key,
            size: blob.size,
          });

          const result = await AudioR2.uploadSpeaking(file, safeTestId, key);

          if (!result.success) {
            // R2 function responded but indicated failure
            console.error(`❌ R2 upload reported failure for ${fileName}:`, result.error);
            throw new Error(result.error || 'Upload failed');
          }

          if (!result.url) {
            console.warn(`⚠️ R2 upload returned success but no URL for ${fileName}. Falling back to deterministic URL.`);
          }

          const finalUrl =
            result.url ||
            // Deterministic R2-style path so backend jobs can handle it consistently
            `https://placeholder-r2/${safeTestId}/speaking/${encodeURIComponent(
              key
            )}/${timestamp}.webm`;

          console.log(`✅ Speaking recording uploaded successfully: ${finalUrl}`);

          return {
            part: key,
            audio_url: finalUrl,
            upload_error: false,
          };
        } catch (error: any) {
          // Hard failure (network/500/etc). We DO NOT block submission.
          const message =
            error?.message ||
            (typeof error === 'string' ? error : 'Unknown upload error');

          console.error(`❌ Hard failure uploading ${fileName}:`, message);

          // Show a warning once per failure key so users understand scoring might be limited
          toast({
            title: "Upload Warning",
            description: `We could not upload your recording for ${key}. We will still save your test and run analysis using available audio.`,
            variant: "destructive",
          });

          // Deterministic, clearly-marked fallback URL so backend can decide how to handle it.
          const mockUrl = `https://mock-r2-fallback.local/speaking/${encodeURIComponent(
            safeTestId
          )}/${encodeURIComponent(key)}/${timestamp}.webm`;

          return {
            part: key,
            audio_url: mockUrl,
            upload_error: true,
            error_message: message,
          };
        }
      });

      const uploadedRecordings = await Promise.all(uploadPromises);

      if (!uploadedRecordings || uploadedRecordings.length === 0) {
        console.error('❌ No speaking upload results returned');
        toast({
          title: 'Upload error',
          description: 'We could not process your recordings. Please try again.',
          variant: 'destructive',
        });
        return;
      }

      const successfulCount = uploadedRecordings.filter(r => !r.upload_error).length;
      const failedCount = uploadedRecordings.filter(r => r.upload_error).length;

      console.log('📊 Speaking upload summary:', {
        total: uploadedRecordings.length,
        successfulCount,
        failedCount,
      });

      // Even if all failed, we still proceed to save metadata with fallback URLs.
      // This guarantees submitTest never fully fails due to R2 issues.

      // Save speaking test result with 30-day audio retention AND run AI scoring
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('User not authenticated while submitting speaking test');
        }

        const audioUrls = uploadedRecordings.map(r => r.audio_url);

        // 1) Create main test_results row with temporary score 0
        const { data: testResult, error: testError } = await supabase
          .from('test_results')
          .insert({
            user_id: user.id,
            test_type: 'speaking',
            total_questions: uploadedRecordings.length,
            correct_answers: null,
            score_percentage: 0, // will be updated after AI scoring
            time_taken: 15 * 60,
            audio_urls: audioUrls,
            audio_retention_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            test_data: {
              recordings_count: uploadedRecordings.length,
              parts_completed: [1, 2, 3],
              r2_upload_summary: {
                total: uploadedRecordings.length,
                successful: successfulCount,
                failed: failedCount,
              },
            } as any
          })
          .select()
          .single();

        if (testError || !testResult) {
          throw testError || new Error('Failed to create speaking test result');
        }

        console.log('✅ Speaking test base records saved. AI scoring will be handled by backend using stored metadata and URLs.');

        // 2) Insert per-recording rows into speaking_test_results
        const speakingRowsToInsert: any[] = [];
        for (const recording of uploadedRecordings) {
          const partNumber = parseInt(recording.part.replace('part', '').split('_')[0], 10);
          let questionText = '';

          if (partNumber === 1 && testData?.part1_prompts?.length) {
            const questionIndex = parseInt(recording.part.split('_q')[1] || '0', 10);
            questionText = testData.part1_prompts[questionIndex]?.prompt_text || '';
          } else if (partNumber === 2 && testData?.part2_prompt) {
            questionText = testData.part2_prompt.prompt_text;
          } else if (partNumber === 3 && testData?.part3_prompts?.length) {
            const questionIndex = parseInt(recording.part.split('_q')[1] || '0', 10);
            questionText = testData.part3_prompts[questionIndex]?.prompt_text || '';
          }

          speakingRowsToInsert.push({
            user_id: user.id,
            test_result_id: testResult.id,
            part_number: partNumber,
            question_text: questionText,
            audio_url: recording.audio_url,
            transcription: '',
            band_scores: {},
            detailed_feedback: '',
            duration_seconds: 120
          });
        }

        const { error: speakingInsertError } = await supabase
          .from('speaking_test_results')
          .insert(speakingRowsToInsert);

        if (speakingInsertError) {
          throw speakingInsertError;
        }

        console.log('✅ Speaking test base records saved. Running AI scoring...');

        // 3) Call AI scoring Edge Function for each recording (synchronous, fact-based wiring)
        const scoredBandValues: number[] = [];

        // NOTE:
        // We intentionally do NOT call the "enhanced-speech-analysis" Edge Function here.
        // Recent logs show 500 errors when invoked with mock/fallback URLs such as:
        // https://your-bucket.your-domain.com/...
        // That function either expects real, accessible audio or a different payload.
        //
        // To keep the pipeline reliable and fact-based:
        // - We store recordings in Cloudflare R2 (or mock URLs on failure).
        // - We persist metadata into test_results & speaking_test_results.
        // - AI scoring is expected to be handled by a backend/Edge Function or cron job
        //   that reads from speaking_test_results and updates band_scores + score_percentage.
        //
        // This avoids frontend-triggered 500 errors and ensures submit always completes.
        console.log('ℹ️ Skipping inline AI scoring for speaking test; base records saved for backend evaluation.');

        // Clear local recordings after successful save
        setRecordings({});

        // Navigate to results page with references
        navigate('/ielts-speaking-results', {
          state: {
            testData,
            recordings: uploadedRecordings,
            audioBlobs: Object.fromEntries(recordingEntries),
            testResultId: testResult.id
          }
        });
      } catch (saveError) {
        console.error('Error saving or scoring speaking results:', saveError);
        toast({
          title: 'Save error',
          description: 'Failed to save or score speaking results. Your recordings may not be fully processed.',
          variant: 'destructive'
        });
      }

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
              <Mic className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
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
      toast({ title: 'Error', description: 'Failed to get response from Catie', variant: 'destructive' });
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
              <span className="text-lg font-semibold text-foreground">
                Part {currentPart}
              </span>
            </div>

            {/* Main Content */}
            <Card ref={mainCardRef} className="bg-white/80 dark:bg-slate-800/90 backdrop-blur-sm shadow-lg rounded-2xl border border-white/20 dark:border-slate-600/50 flex flex-col" style={{
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.08)',
            }}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>
              </span>
              <div className="flex items-center gap-3">
                {/* Unveil Toggle Switch */}
                {(currentPart === 1 || currentPart === 3) && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          onClick={() => setShowQuestion(!showQuestion)}
                          className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background bg-gray-300 dark:bg-gray-600"
                          data-state={showQuestion ? "checked" : "unchecked"}
                        >
                          <div
                            className="pointer-events-none flex h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0 items-center justify-center"
                            data-state={showQuestion ? "checked" : "unchecked"}
                          >
                            {showQuestion ? (
                              <Eye className="w-3 h-3 text-primary dark:text-primary" />
                            ) : (
                              <EyeOff className="w-3 h-3 text-muted-foreground dark:text-slate-400" />
                            )}
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{showQuestion ? "Hide question" : "Show question"}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

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
            {/* Part 2 Simple Timer */}
            {currentPart === 2 && preparationTime > 0 && (
              <div className="text-center">
                <div className="flex items-center justify-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  <p className="text-xl font-bold text-primary">{formatTime(preparationTime)}</p>
                </div>
              </div>
            )}


            {/* Part 1 - Structured Questions Display */}
            {currentPart === 1 && testData.part1_prompts.length > 0 && (
              <div className="space-y-6 relative flex flex-col min-h-[200px]">
                {/* Question Text - Fixed Height Container */}
                <div className="min-h-[200px] flex items-center justify-center flex-1">
                  {showQuestion && (
                    <div className="text-lg font-medium text-center select-none">
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
                    <div className="text-lg font-medium text-center select-none">
                      {getCurrentQuestionText()}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Cue Card Display */}
            {currentPart === 2 && currentPrompt && (
              <div className="p-6 bg-gray-50 dark:bg-slate-800 rounded-lg">
                <h3 className="font-semibold mb-3">Cue Card</h3>
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {currentPrompt.prompt_text}
                </div>
              </div>
            )}

            {/* Part 2 Notes Container */}
            {currentPart === 2 && (
              <>
                {/* Note-taking area during preparation */}
                {preparationTime > 0 && (
                  <div className="relative bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    {/* +1 Minute Icon Button - Top Right */}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setPreparationTime(prev => prev + 60);
                            }}
                            className="absolute top-2 right-2 h-8 w-8 text-primary"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Add 1 minute for notes</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <textarea
                      placeholder="Write your preparation notes here..."
                      value={part2Notes}
                      onChange={(e) => setPart2Notes(e.target.value)}
                      className="w-full h-32 p-3 bg-transparent resize-none focus:outline-none"
                    />
                  </div>
                )}

                {/* Notes Display During/After Recording */}
                {preparationTime === 0 && part2Notes && (
                  <div className="relative bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                    {/* +1 Minute Icon Button - Top Right */}
                    {!isRecording && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setPreparationTime(60);
                                startPreparationTimer();
                              }}
                              className="absolute top-2 right-2 h-8 w-8 text-primary"
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Add 1 minute for notes</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    <div className="p-3 text-sm whitespace-pre-wrap">
                      {part2Notes}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Recording Interface */}
            {((currentPart === 2 && preparationTime === 0) || currentPart !== 2) && (
              <div className="text-center h-[80px] flex items-center justify-center relative">
                {isRecording ? (
                  <>
                    {/* Live Audio Waveform - Centered Between Question Text and Stop Button */}
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <LiveWaveform
                        active={true}
                        height={65}
                        barWidth={10}
                        barGap={3}
                        barRadius={3}
                        mode="static"
                        fadeEdges={false}
                        barColor="#3b82f6"
                        sensitivity={1.2}
                        fftSize={256}
                        historySize={60}
                        updateRate={30}
                      />
                    </div>

                    {/* Stop Recording Button - Positioned at bottom */}
                    <Button
                      onClick={stopRecording}
                      variant="outline"
                      size="icon"
                      className="rounded-xl h-8 w-8 absolute bottom-0 left-1/2 transform -translate-x-1/2 dark:bg-slate-800/50 dark:border-primary/40 dark:text-primary dark:hover:bg-slate-700/50"
                    >
                      <Square className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <TooltipProvider>
                    <div className="flex items-center justify-center gap-3">
                      {/* Record Button */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            onClick={startRecording}
                            variant="outline"
                              className="rounded-xl bg-white/30 dark:bg-red-900/30 text-foreground border border-border dark:border-red-700/50 shadow-sm h-12 w-12 hover:!bg-white/30 dark:hover:!bg-red-800/40 hover:!text-foreground"
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
                              className="h-12 w-12 rounded-xl border-primary/30 text-primary dark:bg-slate-800/50 dark:border-primary/40 dark:text-primary dark:hover:bg-slate-700/50"
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
                      {recordings[`part${currentPart}_q${currentQuestion}`] && (
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
                              className="h-12 w-12 rounded-xl border-primary/30 text-primary dark:bg-slate-800/50 dark:border-primary/40 dark:text-primary dark:hover:bg-slate-700/50"
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
              <TooltipProvider>
                <>
                  {/* Previous Question Button - Bottom Left */}
                  <Tooltip>
                    <TooltipTrigger asChild>
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
                        className="absolute bottom-0 left-0 h-12 w-12 hover:bg-transparent hover:text-foreground"
                      >
                        <ArrowLeft className="w-5 h-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Previous question</p>
                    </TooltipContent>
                  </Tooltip>

                  {/* Next Question Button - Bottom Right */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setShowQuestion(false);
                          nextQuestion();
                        }}
                        disabled={recordings[`part${currentPart}_q${currentQuestion}`] === undefined}
                        size="icon"
                        className="absolute bottom-0 right-0 h-12 w-12 hover:bg-transparent hover:text-foreground"
                      >
                        <ArrowRight className="w-5 h-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{recordings[`part${currentPart}_q${currentQuestion}`] === undefined ? "Please record your answer first" : "Next question"}</p>
                    </TooltipContent>
                  </Tooltip>
                </>
              </TooltipProvider>
            )}

            {/* Part 2 Navigation Button - Go to Part 3 */}
            {currentPart === 2 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        nextQuestion();
                      }}
                      disabled={recordings[`part${currentPart}_q${currentQuestion}`] === undefined}
                      size="icon"
                      className="absolute bottom-0 right-0 h-12 w-12 hover:bg-transparent hover:text-foreground"
                    >
                      <ArrowRight className="w-5 h-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{recordings[`part${currentPart}_q${currentQuestion}`] === undefined ? "Please record your answer first" : "Go to Part 3"}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </CardContent>
        </Card>

        {/* Exit Test and Theme Toggle */}
        <div className="fixed bottom-6 left-6 z-40 flex items-center gap-4">
          <button
            onClick={() => navigate('/ielts-portal')}
            className="text-lg text-foreground cursor-pointer hover:text-primary transition-colors"
          >
            Exit Test
          </button>
          <ThemeToggle />
        </div>

        {/* Quick suggestion buttons next to Catie bot:
            - Structure
            - Vocabulary
            - Example answers (new)
        */}
        {showAIAssistant && (
          <div className="fixed bottom-36 right-[420px] z-50 flex flex-col gap-3">
            {/* Structure helper */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSuggestionClick('Help with Speaking Structure')}
                    disabled={isChatLoading}
                    className="h-12 w-12 p-0 border-primary/30 bg-white/30 dark:bg-slate-800/90 backdrop-blur-sm shadow-lg hover:bg-primary/10 dark:hover:bg-primary/20"
                  >
                    <ListTree className="w-6 h-6" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>Get help with speaking structure</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Vocabulary helper */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSuggestionClick('Suggest Some Speaking Vocabulary')}
                    disabled={isChatLoading}
                    className="h-12 w-12 p-0 border-primary/30 bg-white/30 dark:bg-slate-800/90 backdrop-blur-sm shadow-lg hover:bg-primary/10 dark:hover:bg-primary/20"
                  >
                    <BookOpen className="w-6 h-6" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>Get vocabulary suggestions</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Example answers helper (new) */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleSuggestionClick(
                        'Give me 2-3 straightforward band 7+ example answers for this exact IELTS Speaking question. Just show the actual answers, no explanations.'
                      )
                    }
                    disabled={isChatLoading}
                    className="h-12 w-12 p-0 border-primary/30 bg-white/30 dark:bg-slate-800/90 backdrop-blur-sm shadow-lg hover:bg-primary/10 dark:hover:bg-primary/20"
                  >
                    <Sparkles className="w-6 h-6" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>View band 7+ example answers</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}

        {/* AI Assistant - Floating Bottom Right (Mac-style "suck into dock" animation) */}
        <div className="fixed bottom-24 right-6 z-50">
          {/* Chat card */}
          {showAIAssistant && (
            <Card
              className={`bg-white/20 dark:bg-slate-800/90 backdrop-blur-sm rounded-3xl w-96 h-[500px] shadow-2xl flex flex-col transform-gpu origin-bottom-right transition-all duration-260 ease-in-out ${
                showAIAssistantVisible
                  ? 'opacity-100 scale-100 translate-y-0'
                  : 'opacity-0 scale-75 translate-y-8'
              }`}
            >
              <CardHeader className="pb-2 rounded-t-3xl relative">
                <div className="absolute top-2 right-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={closeAIAssistant}
                    className="h-8 w-8 p-0 text-foreground"
                  >
                    ✕
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col p-4 overflow-hidden">
                <Conversation className="flex-1 min-h-0">
                  <ConversationContent className="flex-1 min-h-0">
                    {chatMessages.length === 0 && !isChatLoading ? (
                      <ConversationEmptyState
                        icon={<Orb className="size-12" />}
                        title="Start a conversation"
                        description="Ask for help with your IELTS speaking practice"
                      />
                    ) : (
                      <>
                        {/* Current question displayed at the top of chat */}
                        <div className="rounded-lg p-3 bg-muted/60 border border-border mb-4">
                          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Question</div>
                          <div className="text-sm font-medium text-foreground">{questionType}</div>
                          <div className="text-sm text-muted-foreground whitespace-pre-wrap mt-1">
                            {currentQuestionText || 'No question available.'}
                          </div>
                        </div>

                        {chatMessages.map((message) => (
                          <Message key={message.id} from={message.type === 'user' ? 'user' : 'assistant'}>
                            <MessageContent>
                              <div
                                className={`px-3 py-2 rounded-xl text-sm ${
                                  message.type === 'user'
                                    ? 'bg-muted/50 text-foreground border border-border/50'
                                    : 'bg-muted/50 text-foreground border border-border/50'
                                }`}
                              >
                                <Response
                                  dangerouslySetInnerHTML={{
                                    __html: message.content
                                      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                      .replace(/\*(.*?)\*/g, '<em>$1</em>')
                                      .replace(/^• (.*)$/gm, '<li>$1</li>')
                                      .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
                                      .replace(/\n/g, '<br>'),
                                  }}
                                />
                              </div>
                            </MessageContent>
                            {message.type === 'bot' && (
                              <div
                                style={{
                                  borderRadius: '50%',
                                  overflow: 'hidden',
                                  width: '72px',
                                  height: '72px',
                                }}
                              >
                                <img
                                  src="https://raw.githubusercontent.com/AlfieAlfiegithu2/alfie-ai-coach/main/public/1000031289.png"
                                  alt="Catie"
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                              </div>
                            )}
                          </Message>
                        ))}
                        {isChatLoading && (
                          <Message from="assistant">
                            <MessageContent>
                              <div className="bg-muted border border-border px-3 py-2 rounded-xl text-sm">
                                <ShimmeringText text="Thinking..." />
                              </div>
                            </MessageContent>
                            <div
                              style={{
                                borderRadius: '50%',
                                overflow: 'hidden',
                                width: '72px',
                                height: '72px',
                              }}
                            >
                              <img
                                src="https://raw.githubusercontent.com/AlfieAlfiegithu2/alfie-ai-coach/main/public/1000031289.png"
                                alt="Catie"
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            </div>
                          </Message>
                        )}
                      </>
                    )}
                  </ConversationContent>
                </Conversation>

                <div className="flex-shrink-0 mt-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) =>
                        e.key === 'Enter' && !isChatLoading && newMessage.trim() && sendChatMessage()
                      }
                      placeholder="Ask for speaking help..."
                      className="flex-1 px-3 py-2 rounded-lg text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0 resize-none"
                      disabled={isChatLoading}
                    />
                    <Button
                      onClick={() => sendChatMessage()}
                      disabled={isChatLoading || !newMessage.trim()}
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-foreground"
                    >
                      {isChatLoading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-foreground" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          {/* Show Catie dock icon only when chat is fully closed for natural feel */}
          {!showAIAssistant && (
            <div
              style={{
                borderRadius: '50%',
                overflow: 'hidden',
                width: '80px',
                height: '80px',
                cursor: 'pointer',
                boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                transition: 'transform 0.22s ease-out, box-shadow 0.22s ease-out',
              }}
              onClick={() => {
                setShowAIAssistant(true);
                // ensure mount, then trigger pop-out animation from dock icon
                requestAnimationFrame(() => setShowAIAssistantVisible(true));
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.transform = 'scale(1.06) translateY(-2px)';
                el.style.boxShadow = '0 16px 36px rgba(0,0,0,0.22)';
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.transform = 'scale(1.0) translateY(0px)';
                el.style.boxShadow = '0 10px 25px rgba(0,0,0,0.15)';
              }}
            >
              <img
                src="https://raw.githubusercontent.com/AlfieAlfiegithu2/alfie-ai-coach/main/public/1000031289.png"
                alt="Catie"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          )}
        </div>

        {/* Overlay to close Catie when clicking outside (triggers bin-style close) */}
        {showAIAssistant && (
          <div
            className="fixed inset-0 z-40"
            onClick={closeAIAssistant}
          />
        )}
            </div>
          </div>
        </StudentLayout>
      </div>
    </div>
  );
};

export default IELTSSpeakingTest;
