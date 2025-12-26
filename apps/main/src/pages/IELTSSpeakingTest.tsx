import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  Mic, Play, Pause, Clock, ArrowRight, ArrowLeft, Upload, Volume2, Bot, ListTree, BookOpen, PauseIcon, PlayIcon, Eye, EyeOff, Plus, Square, Send, Sparkles, FileText, X,
  Maximize2,
  Minimize2,
  TrendingUp,
  MessageSquare,
  Award,
  AlertCircle,
  SkipForward
} from "lucide-react";
import { CustomAudioPlayer } from "@/components/CustomAudioPlayer";
import { CircularScore, RadarMetrics } from "@/components/MetricVisualizations";
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
import { useThemeStyles } from "@/hooks/useThemeStyles";
import { FEEDBACK_LANGUAGES } from '@/lib/constants/languages';
import { useAuth } from "@/hooks/useAuth";
import DotLottieLoadingAnimation from "@/components/animations/DotLottieLoadingAnimation";

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
  const { profile } = useAuth();
  const { toast } = useToast();
  const themeStyles = useThemeStyles();

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
  const [recordings, setRecordings] = useState<{ [key: string]: Blob }>({});
  const [skippedParts, setSkippedParts] = useState<Set<number>>(new Set());
  const [part2Notes, setPart2Notes] = useState("");
  const [showNoteTips, setShowNoteTips] = useState(false);
  const [noteTips, setNoteTips] = useState("");
  // Feedback language preference shown at end of Part 3
  const [showLanguagePreference, setShowLanguagePreference] = useState(false);
  const [feedbackLanguage, setFeedbackLanguage] = useState<string>("en");

  // Load user's preferred feedback language
  useEffect(() => {
    const loadUserPreferredLanguage = async () => {
      if (!profile?.id) return;

      try {
        const { data } = await supabase
          .from('user_preferences')
          .select('preferred_feedback_language, native_language')
          .eq('user_id', profile.id)
          .maybeSingle();

        const dataWithFeedback = data as any;
        const languageCode = dataWithFeedback?.preferred_feedback_language || dataWithFeedback?.native_language;
        if (languageCode && FEEDBACK_LANGUAGES.find(l => l.value === languageCode)) {
          setFeedbackLanguage(languageCode);
        }
      } catch (error) {
        console.warn('Error loading user preferred language:', error);
      }
    };

    loadUserPreferredLanguage();
  }, [profile?.id]);
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
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<any>(null);
  const [showRecordingPlayer, setShowRecordingPlayer] = useState(false);
  const [recordingStream, setRecordingStream] = useState<MediaStream | null>(null);  // Stream for LiveWaveform

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);  // Store stream to share with LiveWaveform
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mainCardRef = useRef<HTMLDivElement>(null);
  const recordingStartTimeRef = useRef<number | null>(null);
  const preparationTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Audio cache for preloaded audio files
  const audioCache = useRef<{ [key: string]: HTMLAudioElement }>({});

  // Memoize the current recording blob URL to prevent player resets on re-render
  const currentRecordingUrl = useMemo(() => {
    const recordingKey = `part${currentPart}_q${currentQuestion}`;
    const recording = recordings[recordingKey];
    if (recording) {
      return URL.createObjectURL(recording);
    }
    return null;
  }, [recordings, currentPart, currentQuestion]);

  // Cleanup blob URL when it changes
  useEffect(() => {
    return () => {
      if (currentRecordingUrl) {
        URL.revokeObjectURL(currentRecordingUrl);
      }
    };
  }, [currentRecordingUrl]);

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
      // Reset chat messages when a new test is loaded
      setChatMessages([{
        id: '1',
        type: 'bot',
        content: "Hello! I'm Catie, your expert IELTS Speaking tutor. I'm here to guide you through strategic speaking techniques, structure, and vocabulary enhancement. What specific aspect of your speaking would you like to work on?",
        timestamp: new Date()
      }]);
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
    setShowRecordingPlayer(false); // Hide recording player when changing questions
  }, [currentQuestion, currentPart]);

  // Safety check: Reset to valid state if we end up in an invalid state
  useEffect(() => {
    if (testData && !isLoading) {
      // Validate current state is valid
      let isValidState = true;

      if (currentPart === 1) {
        const maxQuestions = testData.part1_prompts?.length || 0;
        if (currentQuestion >= maxQuestions || currentQuestion < 0) {
          console.warn("⚠️ Invalid Part 1 state detected, resetting...");
          isValidState = false;
        }
      } else if (currentPart === 2) {
        if (!testData.part2_prompt) {
          console.warn("⚠️ Part 2 accessed but no Part 2 prompt available, going to Part 3 or completion...");
          if (testData.part3_prompts?.length > 0) {
            setCurrentPart(3);
            setCurrentQuestion(0);
            return;
          } else {
            setShowLanguagePreference(true);
            return;
          }
        }
      } else if (currentPart === 3) {
        const maxQuestions = testData.part3_prompts?.length || 0;
        if (currentQuestion >= maxQuestions || currentQuestion < 0) {
          console.warn("⚠️ Invalid Part 3 state detected, resetting...");
          isValidState = false;
        }
      }

      if (!isValidState) {
        // Reset to safe state
        if (testData.part1_prompts?.length > 0) {
          setCurrentPart(1);
          setCurrentQuestion(0);
        } else if (testData.part2_prompt) {
          setCurrentPart(2);
          setCurrentQuestion(0);
        } else if (testData.part3_prompts?.length > 0) {
          setCurrentPart(3);
          setCurrentQuestion(0);
        } else {
          // No valid parts available
          console.error("❌ No valid test parts available");
          navigate('/ielts-portal');
        }
      }
    }
  }, [testData, currentPart, currentQuestion, isLoading, navigate]);

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

      const isUUID = testId.includes('-') && testId.length === 36;

      // OPTIMIZATION: Single query with join to fetch test and prompts in one go
      const { data: testData, error: testError } = await supabase
        .from('tests')
        .select(`
          id, 
          test_name, 
          speaking_prompts(id, title, prompt_text, part_number, time_limit, audio_url, transcription)
        `)
        .eq(isUUID ? 'id' : 'test_name', testId)
        .eq('test_type', 'IELTS')
        .eq('module', 'Speaking')
        .maybeSingle();

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

      const prompts = testData.speaking_prompts || [];
      console.log(`📝 Loaded ${prompts.length} total speaking prompts`);

      // OPTIMIZATION: Single pass to organize prompts
      const part1: any[] = [];
      let part2: any = null;
      const part3: any[] = [];

      // Sort prompts by part_number manually if not ordered by DB correctly
      const sortedPrompts = [...prompts].sort((a, b) => (a.part_number || 0) - (b.part_number || 0));

      sortedPrompts.forEach((p: any) => {
        if (p.part_number === 1) part1.push(p);
        else if (p.part_number === 2) part2 = p;
        else if (p.part_number === 3) part3.push(p);
      });

      setTestData({
        id: testData.id,
        test_name: testData.test_name,
        part1_prompts: part1,
        part2_prompt: part2,
        part3_prompts: part3
      });

      // Background preload audio for first few prompts to improve responsiveness
      if (part1 && part1.length > 0) {
        part1.slice(0, 3).forEach(p => {
          if (p.audio_url) preloadAudio(p.audio_url).catch(() => { });
        });
      }
      if (part2?.audio_url) preloadAudio(part2.audio_url).catch(() => { });

      console.log(`✅ Test ready: Part 1 (${part1.length}), Part 2 (${part2 ? 1 : 0}), Part 3 (${part3.length})`);
    } catch (error) {
      console.error('❌ Error:', error);
      // Fallback state on error
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

  // Load list of available speaking tests - OPTIMIZED
  const loadAvailableTests = async () => {
    setIsLoading(true);
    try {
      console.log('📋 Loading available speaking tests...');

      // OPTIMIZATION: Use server-side filtering with !inner join
      // This only returns tests that have at least one speaking prompt
      const { data: tests, error } = await supabase
        .from('tests')
        .select('id, test_name, module, skill_category, created_at, speaking_prompts!inner(id)')
        .eq('test_type', 'IELTS')
        .eq('module', 'Speaking')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('❌ Error loading tests:', error);
        throw error;
      }

      const validTests = (tests || []).filter(test => {
        const testName = (test.test_name || '').trim();
        return testName &&
          testName.length >= 2 &&
          !testName.toLowerCase().includes('quick test') &&
          !['test ?', 'another test?', ''].includes(testName.toLowerCase());
      });

      console.log(`✅ Found ${validTests.length} valid speaking tests`);
      setAvailableTests(validTests);
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

  // Preload audio for faster playback
  const preloadAudio = (url: string): Promise<HTMLAudioElement> => {
    return new Promise((resolve, reject) => {
      // Check cache first
      if (audioCache.current[url]) {
        resolve(audioCache.current[url]);
        return;
      }

      const audio = new Audio(url);
      audio.preload = 'auto';

      audio.oncanplaythrough = () => {
        audioCache.current[url] = audio;
        resolve(audio);
      };

      audio.onerror = (e) => {
        console.warn('Audio preload failed:', url, e);
        reject(e);
      };

      // Trigger load
      audio.load();
    });
  };

  // Preload audio when test data loads
  useEffect(() => {
    if (!testData) return;

    const urlsToPreload: string[] = [];

    // Collect all audio URLs from prompts
    testData.part1_prompts?.forEach(p => {
      if (p.audio_url) urlsToPreload.push(p.audio_url);
    });
    if (testData.part2_prompt?.audio_url) {
      urlsToPreload.push(testData.part2_prompt.audio_url);
    }
    testData.part3_prompts?.forEach(p => {
      if (p.audio_url) urlsToPreload.push(p.audio_url);
    });

    // Preload all audio in background
    console.log(`🎵 Preloading ${urlsToPreload.length} audio files...`);
    urlsToPreload.forEach(url => {
      preloadAudio(url).catch(() => { /* Ignore preload errors */ });
    });
  }, [testData]);

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
      }

      // Try to get from cache first for instant playback
      let audio = audioCache.current[audioUrl];

      if (!audio) {
        // Not in cache, create new and wait for it to be ready
        audio = new Audio(audioUrl);
        audio.preload = 'auto';
        audioCache.current[audioUrl] = audio;
      }

      audio.volume = globalVolumeRef.current;
      audio.currentTime = 0; // Reset to start

      // Set up event handlers
      audio.onended = () => {
        setIsPlaying(false);
        console.log(`✅ Audio playback completed`);
      };

      audio.onerror = (e) => {
        setIsPlaying(false);
        console.error('Audio playback error:', e);
        delete audioCache.current[audioUrl]; // Remove failed audio from cache
        toast({
          title: "Audio Error",
          description: "Failed to play audio prompt. The audio may be inaudible or unavailable.",
          variant: "destructive"
        });
      };

      // Store reference
      audioRef.current = audio;

      console.log(`▶️ Playing audio: ${audioUrl}`);

      // Try to play immediately - cached audio should be ready
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
          description: "Failed to play audio prompt. The audio may be inaudible or unavailable. Please try again.",
          variant: "destructive"
        });
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
    } catch { }
  };

  const playRecordingStopSound = () => {
    // Use the same pleasant chime sound for stop as start
    playRecordingStartSound();
  };

  const beep = () => playRecordingStartSound(); // For backward compatibility

  const startRecording = async () => {
    try {
      // Stop preparation timer if still running (user started recording early)
      stopPreparationTimer();
      setPreparationTime(0);

      beep();
      // Delay recording start to avoid capturing the beep sound
      await new Promise(resolve => setTimeout(resolve, 100));
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Store stream for LiveWaveform to use
      recordingStreamRef.current = stream;
      setRecordingStream(stream);

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

        // Force re-render by updating isRecording state
        setIsRecording(false);

        // Clear stream state (LiveWaveform will clean up its audio context)
        setRecordingStream(null);
        recordingStreamRef.current = null;

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
    // For Part 2, show a warning if recording is under 1 minute (but allow stopping)
    if (currentPart === 2 && recordingStartTimeRef.current) {
      const elapsedSeconds = Math.floor((Date.now() - recordingStartTimeRef.current) / 1000);
      const minimumSeconds = 60; // 1 minute recommended

      if (elapsedSeconds < minimumSeconds) {
        toast({
          title: "Short Recording",
          description: `Your recording is ${elapsedSeconds} seconds. In the real IELTS exam, you should speak for 1-2 minutes for Part 2.`,
          variant: "default",
          duration: 4000
        });
        // Allow stopping - just warn the student
      }
    }

    playRecordingStopSound();
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      // REMOVED: setIsRecording(false); - now handled in onstop handler
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
        toast({
          title: "Playback Error",
          description: "Failed to play your recording. The audio may be inaudible or corrupted.",
          variant: "destructive"
        });
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

  const evaluateRecording = async () => {
    const recordingKey = `part${currentPart}_q${currentQuestion}`;
    const recording = recordings[recordingKey];

    console.log('🎯 EVALUATE: Current part:', currentPart);
    console.log('🎯 EVALUATE: Current question:', currentQuestion);
    console.log('🎯 EVALUATE: Recording key:', recordingKey);
    console.log('🎯 EVALUATE: Recording exists:', !!recording);
    console.log('🎯 EVALUATE: Recording size:', recording?.size);
    console.log('🎯 EVALUATE: All recording keys:', Object.keys(recordings));

    if (!recording) {
      console.error('❌ No recording found for', recordingKey);
      toast({
        title: "No Recording Found",
        description: "Please record your answer first before evaluating.",
        variant: "destructive"
      });
      return;
    }

    // Check audio file size - warn if very large (> 10MB)
    const fileSizeMB = recording.size / (1024 * 1024);
    console.log(`📦 Audio file size: ${fileSizeMB.toFixed(2)} MB`);

    if (fileSizeMB > 15) {
      toast({
        title: "Recording Too Large",
        description: "Your recording is too large to process. Try keeping your response shorter.",
        variant: "destructive"
      });
      return;
    }

    setIsEvaluating(true);
    setEvaluationResult(null);

    try {
      // Convert blob to base64 using Promise wrapper
      const base64Audio = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = () => reject(new Error('Failed to read audio file'));
        reader.readAsDataURL(recording);
      });

      console.log(`📤 Base64 audio length: ${(base64Audio.length / 1024).toFixed(0)} KB`);

      const promptText = getCurrentQuestionText();

      console.log('📤 Sending to Edge Function:', {
        audioLength: base64Audio.length,
        prompt: promptText,
        recordingKey
      });

      // Add timeout for large audio files (Part 2 can be up to 2 minutes)
      const timeoutMs = currentPart === 2 ? 90000 : 60000; // 90s for Part 2, 60s for others

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const { data, error } = await supabase.functions.invoke('ielts-speaking-evaluator', {
        body: {
          audio: base64Audio,
          prompt: promptText
        }
      });

      clearTimeout(timeoutId);

      if (error) {
        // Log the full error for debugging
        console.error('❌ Edge Function error:', error);
        console.error('❌ Error name:', error.name);
        console.error('❌ Error message:', error.message);
        console.error('❌ Full error object:', JSON.stringify(error, null, 2));

        // Check for specific error types
        const errorMessage = error.message || '';
        if (errorMessage.includes('FunctionsFetchError') || errorMessage.includes('Failed to send a request')) {
          throw new Error('AI evaluation service is currently unavailable. Please try again in a moment.');
        }
        if (errorMessage.includes('FunctionsHttpError')) {
          // The function returned a non-2xx response - try to get more details
          throw new Error(`Server error: ${errorMessage}. The recording may be too large.`);
        }
        throw error;
      }

      // Check if the response contains an error property (API returned an error)
      if (data?.error) {
        console.error('❌ API returned error:', data.error);
        throw new Error(data.error);
      }

      // Validate that we have the required data structure
      if (!data || !data.metrics || typeof data.metrics !== 'object') {
        console.error('❌ Invalid response structure:', data);
        throw new Error('Invalid response from evaluation service. Please try again.');
      }

      // Ensure metrics have valid numeric values
      const validatedData = {
        ...data,
        metrics: {
          pronunciation: Number(data.metrics.pronunciation) || 0,
          vocabulary: Number(data.metrics.vocabulary) || 0,
          grammar: Number(data.metrics.grammar) || 0,
          intonation: Number(data.metrics.intonation) || 0,
          fluency: Number(data.metrics.fluency) || 0
        }
      };

      console.log('✅ Evaluation received:', validatedData);
      console.log('📊 Validated metrics:', validatedData.metrics);
      setEvaluationResult(validatedData);
    } catch (error: any) {
      console.error('Evaluation error:', error);

      // Provide user-friendly error messages
      let errorDescription = "Could not evaluate the recording. Please try again.";
      if (error?.message?.includes('unavailable') || error?.message?.includes('FunctionsFetchError')) {
        errorDescription = "AI evaluation service is temporarily unavailable. Please try again in a few moments.";
      } else if (error?.message) {
        errorDescription = error.message;
      }

      toast({
        title: "Evaluation Failed",
        description: errorDescription,
        variant: "destructive",
        duration: 6000
      });
    } finally {
      setIsEvaluating(false);
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
    // Note: Chat memory persists - only closes the UI, doesn't reset conversation
    setShowAIAssistantVisible(false);
    setTimeout(() => {
      setShowAIAssistant(false);
    }, 260); // must match card transition duration
  };

  const nextQuestion = () => {
    try {
      console.log(`🔄 Navigation attempt: Part ${currentPart}, Question ${currentQuestion}`, {
        testDataExists: !!testData,
        part1Prompts: testData?.part1_prompts?.length || 0,
        part2Prompt: !!testData?.part2_prompt,
        part3Prompts: testData?.part3_prompts?.length || 0
      });

      // Validate test data exists
      if (!testData) {
        console.error("❌ Navigation failed: No test data available");
        toast({
          title: "Navigation Error",
          description: "Test data not available. Please refresh the page.",
          variant: "destructive"
        });
        return;
      }

      if (currentPart === 1) {
        const maxPart1Questions = testData.part1_prompts?.length || 0;

        if (currentQuestion < maxPart1Questions - 1) {
          // More Part 1 questions remaining
          const nextQ = currentQuestion + 1;
          setCurrentQuestion(nextQ);
          setShowQuestion(false); // Reset question visibility
          // Clear any evaluation results when moving to next question
          setEvaluationResult(null);
          setShowRecordingPlayer(false); // Hide recording player
          console.log(`➡️ Moving to Part 1, Question ${nextQ + 1}`);
        } else {
          // Last Part 1 question just completed
          const hasPart2 = !!testData.part2_prompt;
          const hasPart3 = !!(testData.part3_prompts && testData.part3_prompts.length > 0);

          if (!hasPart2 && !hasPart3) {
            // CASE: Only Part 1 exists for this test
            console.log("🏁 Part 1-only test completed - prompting for feedback language");
            setShowLanguagePreference(true);
          } else if (hasPart2) {
            // Normal flow: move to Part 2
            setCurrentPart(2);
            setCurrentQuestion(0);
            setPreparationTime(60);
            setShowQuestion(false);
            setEvaluationResult(null); // Clear evaluation when moving to new part
            setShowRecordingPlayer(false); // Hide recording player
            console.log("➡️ Moving to Part 2 - Long Turn");
            startPreparationTimer();
          } else if (hasPart3) {
            // No Part 2, but Part 3 exists: move directly to Part 3
            setCurrentPart(3);
            setCurrentQuestion(0);
            setShowQuestion(false);
            setEvaluationResult(null); // Clear evaluation when moving to new part
            setShowRecordingPlayer(false); // Hide recording player
            console.log("➡️ Moving to Part 3 - Discussion (no Part 2 for this test)");
          }
        }
      } else if (currentPart === 2) {
        // Part 2 completed, check if Part 3 exists
        const hasPart3 = testData.part3_prompts && testData.part3_prompts.length > 0;

        if (hasPart3) {
          // Move to Part 3
          setCurrentPart(3);
          setCurrentQuestion(0);
          setShowQuestion(false);
          setEvaluationResult(null); // Clear evaluation when moving to new part
          setShowRecordingPlayer(false); // Hide recording player
          console.log(`➡️ Moving to Part 3 - Discussion`);
        } else {
          // No Part 3, show language preference and allow submission
          console.log(`🏁 Part 2 completed - no Part 3 available, prompting for feedback language`);
          setShowLanguagePreference(true);
        }
      } else if (currentPart === 3) {
        const maxPart3Questions = testData.part3_prompts?.length || 0;

        if (currentQuestion < maxPart3Questions - 1) {
          const nextQ = currentQuestion + 1;
          setCurrentQuestion(nextQ);
          setShowQuestion(false);
          setEvaluationResult(null); // Clear evaluation when moving to next question
          setShowRecordingPlayer(false); // Hide recording player
          console.log(`➡️ Moving to Part 3, Question ${nextQ + 1}`);
        } else {
          // Last question completed: show language preference + submit option
          console.log(`🏁 Last question completed - prompting for feedback language`);
          setShowLanguagePreference(true);
        }
      }
    } catch (error) {
      console.error("❌ Navigation error:", error);
      toast({
        title: "Navigation Error",
        description: "Failed to navigate. Please try again.",
        variant: "destructive"
      });
    }
  };

  const stopPreparationTimer = () => {
    if (preparationTimerRef.current) {
      clearInterval(preparationTimerRef.current);
      preparationTimerRef.current = null;
    }
  };

  const startPreparationTimer = () => {
    // Clear any existing timer first
    stopPreparationTimer();

    preparationTimerRef.current = setInterval(() => {
      setPreparationTime(prev => {
        if (prev <= 1) {
          stopPreparationTimer();
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

  // Skip the current part entirely (Part 1, Part 2, or Part 3)
  const skipCurrentPart = () => {
    if (!testData) return;

    console.log(`⏭️ Skip requested for Part ${currentPart}`);

    // Stop preparation timer if running (Part 2)
    stopPreparationTimer();
    setPreparationTime(0);

    // Stop any ongoing recording first
    if (isRecording && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setTimeLeft(0);
    }

    // Clear any recordings for this part
    const partPrefix = `part${currentPart}_`;
    setRecordings(prev => {
      const filtered: { [key: string]: Blob } = {};
      Object.entries(prev).forEach(([key, value]) => {
        if (!key.startsWith(partPrefix)) {
          filtered[key] = value;
        }
      });
      return filtered;
    });

    // Add current part to skipped parts
    setSkippedParts(prev => new Set([...prev, currentPart]));

    // Clear evaluation result
    setEvaluationResult(null);
    setShowRecordingPlayer(false);

    // Navigate to next part based on current part
    if (currentPart === 1) {
      const hasPart2 = !!testData.part2_prompt;
      const hasPart3 = testData.part3_prompts && testData.part3_prompts.length > 0;

      if (hasPart2) {
        setCurrentPart(2);
        setCurrentQuestion(0);
        setPreparationTime(60);
        setShowQuestion(false);
        console.log("⏭️ Skipped Part 1 - Moving to Part 2");
        toast({
          title: `Part 1 Skipped`,
          description: "Moving to Part 2 - Long Turn",
          duration: 3000
        });
        startPreparationTimer();
      } else if (hasPart3) {
        setCurrentPart(3);
        setCurrentQuestion(0);
        setShowQuestion(false);
        console.log("⏭️ Skipped Part 1 - Moving to Part 3");
        toast({
          title: `Part 1 Skipped`,
          description: "Moving to Part 3 - Discussion",
          duration: 3000
        });
      } else {
        // Only Part 1 exists and it's being skipped
        console.log("⏭️ Cannot skip Part 1 - No other parts available");
        toast({
          title: "Cannot Skip",
          description: "This is the only part in the test. Please complete it or exit.",
          variant: "destructive"
        });
        // Remove from skipped since we can't skip
        setSkippedParts(prev => {
          const newSet = new Set(prev);
          newSet.delete(1);
          return newSet;
        });
      }
    } else if (currentPart === 2) {
      const hasPart3 = testData.part3_prompts && testData.part3_prompts.length > 0;

      if (hasPart3) {
        setCurrentPart(3);
        setCurrentQuestion(0);
        setShowQuestion(false);
        console.log("⏭️ Skipped Part 2 - Moving to Part 3");
        toast({
          title: `Part 2 Skipped`,
          description: "Moving to Part 3 - Discussion",
          duration: 3000
        });
      } else {
        // No Part 3, check if we have Part 1 recordings to submit
        const hasPart1Recordings = Object.keys(recordings).some(key => key.startsWith('part1_'));
        if (hasPart1Recordings) {
          console.log("⏭️ Skipped Part 2 - Completing test with Part 1 recordings");
          toast({
            title: `Part 2 Skipped`,
            description: "You can now submit your test.",
            duration: 3000
          });
          setShowLanguagePreference(true);
        } else {
          // No recordings at all
          console.log("⏭️ Cannot skip Part 2 - No recordings available");
          toast({
            title: "Cannot Complete Test",
            description: "You need at least one recording to submit the test.",
            variant: "destructive"
          });
          setSkippedParts(prev => {
            const newSet = new Set(prev);
            newSet.delete(2);
            return newSet;
          });
        }
      }
    } else if (currentPart === 3) {
      // Part 3 skip - check if we have any recordings from previous parts
      const hasAnyRecordings = Object.keys(recordings).length > 0;

      if (hasAnyRecordings) {
        console.log("⏭️ Skipped Part 3 - Completing test");
        toast({
          title: `Part 3 Skipped`,
          description: "You can now submit your test.",
          duration: 3000
        });
        setShowLanguagePreference(true);
      } else {
        // No recordings at all
        console.log("⏭️ Cannot skip Part 3 - No recordings available");
        toast({
          title: "Cannot Complete Test",
          description: "You need at least one recording to submit the test.",
          variant: "destructive"
        });
        setSkippedParts(prev => {
          const newSet = new Set(prev);
          newSet.delete(3);
          return newSet;
        });
      }
    }
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

          // Get question text for this recording
          let questionText = '';
          const partMatch = key.match(/^part(\d+)_q(\d+)$/);
          if (partMatch) {
            const partNum = parseInt(partMatch[1], 10);
            const qIndex = parseInt(partMatch[2], 10);
            if (partNum === 1 && testData?.part1_prompts?.[qIndex]) {
              questionText = testData.part1_prompts[qIndex]?.prompt_text ||
                testData.part1_prompts[qIndex]?.transcription ||
                testData.part1_prompts[qIndex]?.title || '';
            } else if (partNum === 2 && testData?.part2_prompt) {
              questionText = testData.part2_prompt.prompt_text ||
                testData.part2_prompt.transcription ||
                testData.part2_prompt.title || '';
            } else if (partNum === 3 && testData?.part3_prompts?.[qIndex]) {
              questionText = testData.part3_prompts[qIndex]?.prompt_text ||
                testData.part3_prompts[qIndex]?.transcription ||
                testData.part3_prompts[qIndex]?.title || '';
            }
          }

          return {
            part: key,
            audio_url: finalUrl,
            question_text: questionText,
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

          // Get question text for this recording (even if upload failed)
          let questionText = '';
          const partMatch = key.match(/^part(\d+)_q(\d+)$/);
          if (partMatch) {
            const partNum = parseInt(partMatch[1], 10);
            const qIndex = parseInt(partMatch[2], 10);
            if (partNum === 1 && testData?.part1_prompts?.[qIndex]) {
              questionText = testData.part1_prompts[qIndex]?.prompt_text ||
                testData.part1_prompts[qIndex]?.transcription ||
                testData.part1_prompts[qIndex]?.title || '';
            } else if (partNum === 2 && testData?.part2_prompt) {
              questionText = testData.part2_prompt.prompt_text ||
                testData.part2_prompt.transcription ||
                testData.part2_prompt.title || '';
            } else if (partNum === 3 && testData?.part3_prompts?.[qIndex]) {
              questionText = testData.part3_prompts[qIndex]?.prompt_text ||
                testData.part3_prompts[qIndex]?.transcription ||
                testData.part3_prompts[qIndex]?.title || '';
            }
          }

          return {
            part: key,
            audio_url: mockUrl,
            question_text: questionText,
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
            /**
             * IMPORTANT:
             * We intentionally do NOT expire speaking recordings automatically.
             * Cloudflare R2 storage is low-cost for this use case, and long-term
             * retention allows:
             * - Students to revisit historical attempts.
             * - Consistent training/benchmarking over time.
             *
             * If you ever want time-based deletion, reintroduce a computed
             * audio_retention_expires_at here or control expiry via R2 lifecycle rules.
             */
            audio_retention_expires_at: null,
            test_data: {
              recordings_count: uploadedRecordings.length,
              parts_completed: [1, 2, 3].filter(p => !skippedParts.has(p)),
              parts_skipped: Array.from(skippedParts),
              r2_upload_summary: {
                total: uploadedRecordings.length,
                successful: successfulCount,
                failed: failedCount,
              },
              retention_policy: 'no_auto_expiry_r2_persistent'
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
          // Safely parse part number with validation
          const partMatch = recording.part.match(/^part(\d+)/);
          const partNumber = partMatch ? parseInt(partMatch[1], 10) : NaN;

          if (isNaN(partNumber) || partNumber < 1 || partNumber > 3) {
            console.error(`Invalid part number for recording: ${recording.part}`);
            continue; // Skip invalid recordings
          }

          let questionText = '';

          if (partNumber === 1 && testData?.part1_prompts?.length) {
            const questionMatch = recording.part.match(/_q(\d+)/);
            const questionIndex = questionMatch ? parseInt(questionMatch[1], 10) : 0;
            if (questionIndex >= 0 && questionIndex < testData.part1_prompts.length) {
              questionText = testData.part1_prompts[questionIndex]?.prompt_text || testData.part1_prompts[questionIndex]?.transcription || '';
            }
          } else if (partNumber === 2 && testData?.part2_prompt) {
            questionText = testData.part2_prompt.prompt_text || '';
          } else if (partNumber === 3 && testData?.part3_prompts?.length) {
            const questionMatch = recording.part.match(/_q(\d+)/);
            const questionIndex = questionMatch ? parseInt(questionMatch[1], 10) : 0;
            if (questionIndex >= 0 && questionIndex < testData.part3_prompts.length) {
              questionText = testData.part3_prompts[questionIndex]?.prompt_text || testData.part3_prompts[questionIndex]?.transcription || '';
            }
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
      <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden" style={{ backgroundColor: '#FFFAF0' }}>
        <div
          className="absolute inset-0 pointer-events-none opacity-30 z-0"
          style={{
            backgroundImage: `url("https://www.transparenttextures.com/patterns/rice-paper-2.png")`,
            mixBlendMode: 'multiply'
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none opacity-10 z-0"
          style={{
            backgroundImage: `url("https://www.transparenttextures.com/patterns/natural-paper.png")`,
            mixBlendMode: 'multiply',
            filter: 'contrast(1.2)'
          }}
        />
        <div className="relative z-10">
          <DotLottieLoadingAnimation />
        </div>
      </div>
    );
  }

  // Show test selection if no testId provided (regardless of whether tests are found)
  if (!testId) {
    return (
      <div
        className={`min-h-screen relative ${themeStyles.theme.name === 'note' ? 'font-serif' : ''}`}
        style={{
          backgroundColor: themeStyles.theme.name === 'note' ? '#FFFAF0' : themeStyles.theme.name === 'dark' ? themeStyles.theme.colors.background : 'transparent'
        }}
      >
        <div className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed"
          style={{
            backgroundImage: themeStyles.theme.name === 'note' || themeStyles.theme.name === 'minimalist' || themeStyles.theme.name === 'dark'
              ? 'none'
              : `url('/1000031207.png')`,
            backgroundColor: themeStyles.theme.name === 'note' ? '#FFFAF0' : themeStyles.backgroundImageColor
          }} />

        {/* Paper texture overlays for Note theme */}
        {themeStyles.theme.name === 'note' && (
          <>
            <div
              className="absolute inset-0 pointer-events-none opacity-30 z-0"
              style={{
                backgroundImage: `url("https://www.transparenttextures.com/patterns/rice-paper-2.png")`,
                mixBlendMode: 'multiply'
              }}
            />
            <div
              className="absolute inset-0 pointer-events-none opacity-10 z-0"
              style={{
                backgroundImage: `url("https://www.transparenttextures.com/patterns/natural-paper.png")`,
                mixBlendMode: 'multiply',
                filter: 'contrast(1.2)'
              }}
            />
          </>
        )}
        <div className="relative z-10">
          <StudentLayout title="Available Speaking Tests" transparentBackground={themeStyles.theme.name === 'note'}>
            <div className="min-h-screen py-12">
              <div className="container mx-auto px-4">
                <div className="max-w-4xl mx-auto">
                  <div className="mb-8 text-center">
                    <h1 className="text-4xl font-bold mb-2" style={{ color: themeStyles.textPrimary }}>IELTS speaking tests</h1>
                  </div>

                  {availableTests.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {availableTests.map((test) => (
                        <SpotlightCard
                          key={test.id}
                          className="cursor-pointer h-[140px] hover:scale-105 transition-all duration-300 hover:shadow-lg flex items-center justify-center"
                          onClick={() => navigate(`/ielts-speaking-test/${test.id}`)}
                          style={{
                            backgroundColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.8)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.1)' : themeStyles.theme.name === 'minimalist' ? '#ffffff' : themeStyles.theme.colors.cardBackground,
                            borderColor: themeStyles.border,
                            ...themeStyles.cardStyle
                          }}
                        >
                          <CardContent className="p-3 md:p-4 text-center flex items-center justify-center h-full">
                            <h3 className="font-semibold text-sm" style={{ color: themeStyles.textPrimary }}>{(test.test_name || 'Speaking Test').replace(/IELTS Speaking /gi, '')}</h3>
                          </CardContent>
                        </SpotlightCard>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-lg mb-4" style={{ color: themeStyles.textSecondary }}>No speaking tests available yet</p>
                      <Button
                        onClick={() => navigate('/ielts-portal')}
                        variant="outline"
                        style={{
                          borderColor: themeStyles.border,
                          color: themeStyles.textPrimary,
                          backgroundColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.1)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.1)' : themeStyles.theme.name === 'minimalist' ? '#ffffff' : themeStyles.theme.colors.cardBackground
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = themeStyles.hoverBg}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.1)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.1)' : themeStyles.theme.name === 'minimalist' ? '#ffffff' : themeStyles.theme.colors.cardBackground}
                      >
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

    // Add user message to UI immediately
    setChatMessages((prev) => [...prev, userMessage]);
    if (!messageText) setNewMessage("");
    setIsChatLoading(true);

    try {
      const questionText = getCurrentQuestionText();

      // Build conversation history with context
      // Include system prompt with context, then all previous messages
      const questionContext = `CONTEXT: The student is practicing IELTS Speaking Part ${currentPart}.

Question: "${questionText}"

Please provide concise, practical speaking guidance (ideas, vocabulary, structure). Do NOT write a full answer.`;

      // Convert previous chatMessages to API format (role: 'user' or 'assistant')
      // Note: chatMessages state hasn't updated yet (React state is async), so we use the current state
      const conversationHistory = chatMessages
        .filter(msg => msg.type === 'user' || msg.type === 'bot')
        .map(msg => ({
          role: msg.type === 'user' ? 'user' : 'assistant',
          content: msg.content
        }));

      // Add current user message (not yet in chatMessages state due to async update)
      conversationHistory.push({
        role: 'user',
        content: message
      });

      // Send full conversation history with context
      const { data, error } = await supabase.functions.invoke('openai-chat', {
        body: {
          skipCache: true,
          messages: [
            {
              role: 'system',
              content: questionContext
            },
            ...conversationHistory
          ],
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
    <div
      className="min-h-screen relative"
      style={{
        backgroundColor: themeStyles.theme.name === 'note' ? '#FFFAF0' : themeStyles.theme.name === 'dark' ? themeStyles.theme.colors.background : 'transparent'
      }}
    >
      {/* Paper texture overlays for Note theme */}
      {themeStyles.theme.name === 'note' && (
        <>
          <div
            className="absolute inset-0 pointer-events-none opacity-30 z-0"
            style={{
              backgroundImage: `url("https://www.transparenttextures.com/patterns/rice-paper-2.png")`,
              mixBlendMode: 'multiply'
            }}
          />
          <div
            className="absolute inset-0 pointer-events-none opacity-10 z-0"
            style={{
              backgroundImage: `url("https://www.transparenttextures.com/patterns/natural-paper.png")`,
              mixBlendMode: 'multiply',
              filter: 'contrast(1.2)'
            }}
          />
        </>
      )}

      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed"
        style={{
          backgroundImage: themeStyles.theme.name === 'note' || themeStyles.theme.name === 'minimalist' || themeStyles.theme.name === 'dark'
            ? 'none'
            : `url('/1000031207.png')`,
          backgroundColor: themeStyles.theme.name === 'note' ? '#FFFAF0' : themeStyles.backgroundImageColor
        }} />
      <div
        className="relative z-10 min-h-screen flex flex-col"
        style={{
          backgroundColor: themeStyles.theme.name === 'dark' ? themeStyles.theme.colors.background : 'transparent'
        }}
      >
        <StudentLayout title={`IELTS Speaking - ${testData.test_name}`} showBackButton>
          {/* Desktop: keep original centered layout; Mobile: move content higher */}
          <div className="flex-1 flex justify-center min-h-[calc(100vh-120px)] py-8 sm:items-center sm:py-8">
            <div className="w-full max-w-4xl mx-auto space-y-4 px-4 flex flex-col">
              {/* Current Part Indicator */}
              <div className="text-center py-2 sm:py-2 sm:mb-0 mb-0 flex items-center justify-center gap-2">
                <span className="text-lg font-semibold" style={{ color: themeStyles.textPrimary }}>
                  Part {currentPart}
                </span>
                {/* Skip Part Icon - Only for Part 1 and Part 2 */}
                {(currentPart === 1 || currentPart === 2) && !showLanguagePreference && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={skipCurrentPart}
                          className="p-1 rounded-full transition-colors hover:bg-amber-100"
                          style={{ color: themeStyles.textSecondary }}
                        >
                          <SkipForward className="w-4 h-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Skip Part {currentPart}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>

              {/* Main Content Card - stays upper; Catie dock is anchored separately at bottom */}
              <Card
                ref={mainCardRef}
                className="backdrop-blur-sm shadow-lg rounded-2xl flex flex-col relative"
                style={{
                  backgroundColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.9)' : themeStyles.theme.name === 'dark' ? 'rgba(30, 41, 59, 0.95)' : themeStyles.theme.name === 'minimalist' ? '#ffffff' : themeStyles.theme.colors.cardBackground,
                  borderColor: themeStyles.border,
                  backdropFilter: themeStyles.theme.name === 'glassmorphism' ? 'blur(12px)' : themeStyles.theme.name === 'dark' ? 'blur(8px)' : 'none',
                  boxShadow: themeStyles.theme.name === 'dark'
                    ? '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)'
                    : themeStyles.theme.name === 'note'
                      ? themeStyles.theme.styles.cardStyle?.boxShadow
                      : '0 8px 32px rgba(15, 23, 42, 0.16), 0 0 0 1px rgba(148, 163, 253, 0.06)',
                  ...themeStyles.cardStyle
                }}
              >
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
                                className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                                style={{
                                  backgroundColor: showQuestion
                                    ? themeStyles.buttonPrimary
                                    : (themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.2)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.1)' : themeStyles.theme.name === 'minimalist' ? '#e5e7eb' : themeStyles.border)
                                }}
                                data-state={showQuestion ? "checked" : "unchecked"}
                              >
                                <div
                                  className="pointer-events-none flex h-5 w-5 rounded-full shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0 items-center justify-center"
                                  style={{
                                    backgroundColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.95)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.9)' : themeStyles.theme.name === 'minimalist' ? '#ffffff' : themeStyles.theme.colors.cardBackground
                                  }}
                                  data-state={showQuestion ? "checked" : "unchecked"}
                                >
                                  {showQuestion ? (
                                    <Eye className="w-3 h-3" style={{ color: 'white' }} />
                                  ) : (
                                    <EyeOff className="w-3 h-3" style={{ color: themeStyles.textSecondary }} />
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
                        <Badge
                          variant="outline"
                          className="flex items-center gap-2"
                          style={{
                            borderColor: themeStyles.border,
                            backgroundColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.1)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.05)' : themeStyles.theme.name === 'minimalist' ? '#ffffff' : themeStyles.theme.colors.cardBackground,
                            color: themeStyles.textPrimary
                          }}
                        >
                          <Clock className="w-4 h-4" style={{ color: themeStyles.textPrimary }} />
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
                        <Clock className="w-5 h-5" style={{ color: themeStyles.buttonPrimary }} />
                        <p className="text-xl font-bold" style={{ color: themeStyles.buttonPrimary }}>{formatTime(preparationTime)}</p>
                      </div>
                    </div>
                  )}


                  {/* Part 1 - Structured Questions Display */}
                  {currentPart === 1 && testData.part1_prompts.length > 0 && (
                    <div className="space-y-6 relative flex flex-col min-h-[200px]">
                      {/* Question Text - Fixed Height Container */}
                      <div className="min-h-[200px] flex items-center justify-center flex-1">
                        {showQuestion && (
                          <div className="text-lg font-medium text-center select-none" style={{ color: themeStyles.textPrimary }}>
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
                          <div className="text-lg font-medium text-center select-none" style={{ color: themeStyles.textPrimary }}>
                            {getCurrentQuestionText()}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Cue Card Display */}
                  {currentPart === 2 && currentPrompt && (
                    <div
                      className="p-6 rounded-lg"
                      style={{
                        backgroundColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.1)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.05)' : themeStyles.theme.name === 'minimalist' ? '#f9fafb' : 'rgba(255,255,255,0.6)',
                        borderColor: themeStyles.border,
                        borderWidth: '1px',
                        borderStyle: 'solid'
                      }}
                    >
                      <h3 className="font-semibold mb-3" style={{ color: themeStyles.textPrimary }}>Cue Card</h3>
                      <div className="whitespace-pre-wrap text-sm leading-relaxed" style={{ color: themeStyles.textSecondary }}>
                        {currentPrompt.prompt_text}
                      </div>
                    </div>
                  )}

                  {/* Part 2 Notes Container */}
                  {currentPart === 2 && (
                    <>
                      {/* Note-taking area during preparation */}
                      {preparationTime > 0 && (
                        <div
                          className="relative rounded-lg p-4"
                          style={{
                            backgroundColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.1)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.05)' : themeStyles.theme.name === 'minimalist' ? '#fef3c7' : '#FFFAF0',
                            borderColor: themeStyles.border,
                            borderWidth: '1px',
                            borderStyle: 'solid'
                          }}
                        >
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
                                  className="absolute top-2 right-2 h-8 w-8"
                                  style={{ color: themeStyles.buttonPrimary }}
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
                            style={{ color: themeStyles.textPrimary }}
                          />
                          <style dangerouslySetInnerHTML={{
                            __html: `
                      textarea[placeholder="Write your preparation notes here..."]::placeholder {
                        color: ${themeStyles.textSecondary};
                      }
                    ` }} />
                        </div>
                      )}

                      {/* Notes Display - Always show if notes exist (after prep time or during recording) */}
                      {(preparationTime === 0 || isRecording) && part2Notes && (
                        <div
                          className="relative rounded-lg p-4"
                          style={{
                            backgroundColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.1)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.05)' : themeStyles.theme.name === 'minimalist' ? '#fef3c7' : '#FFFAF0',
                            borderColor: themeStyles.border,
                            borderWidth: '1px',
                            borderStyle: 'solid'
                          }}
                        >
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
                          <div className="p-3 text-sm whitespace-pre-wrap" style={{ color: themeStyles.textPrimary }}>
                            {part2Notes}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Recording Interface - Always show for all parts (Part 2 can start recording anytime) */}
                  <div className="text-center min-h-[80px] flex items-center justify-center relative">
                    {isRecording ? (
                      <>
                        {/* Live Audio Waveform - 50% narrower than previous, centered above stop button */}
                        <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-[130px] sm:w-[180px]">
                          <LiveWaveform
                            active={true}
                            externalStream={recordingStream}
                            height={55}
                            barWidth={6}
                            barGap={2}
                            barRadius={3}
                            mode="static"
                            fadeEdges={false}
                            barColor="#2563eb"
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
                          className="rounded-xl h-8 w-8 absolute bottom-0 left-1/2 transform -translate-x-1/2"
                          style={{
                            borderColor: themeStyles.border,
                            color: themeStyles.buttonPrimary,
                            backgroundColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.9)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.15)' : themeStyles.theme.name === 'minimalist' ? '#ffffff' : themeStyles.theme.colors.cardBackground || '#ffffff'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = themeStyles.hoverBg || 'rgba(0,0,0,0.05)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.9)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.15)' : themeStyles.theme.name === 'minimalist' ? '#ffffff' : themeStyles.theme.colors.cardBackground || '#ffffff';
                          }}
                        >
                          <Square className="w-4 h-4" style={{ color: themeStyles.buttonPrimary || '#2563eb' }} />
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
                                className="rounded-xl shadow-sm h-12 w-12"
                                size="icon"
                                style={{
                                  backgroundColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.8)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.1)' : themeStyles.theme.name === 'minimalist' ? '#ffffff' : themeStyles.theme.colors.cardBackground,
                                  borderColor: themeStyles.border,
                                  color: themeStyles.textPrimary
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = themeStyles.hoverBg;
                                  e.currentTarget.style.color = themeStyles.buttonPrimary;
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.8)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.1)' : themeStyles.theme.name === 'minimalist' ? '#ffffff' : themeStyles.theme.colors.cardBackground;
                                  e.currentTarget.style.color = themeStyles.textPrimary;
                                }}
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
                                  className="h-12 w-12 rounded-xl"
                                  style={{
                                    borderColor: themeStyles.border,
                                    color: themeStyles.buttonPrimary,
                                    backgroundColor: 'transparent'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = themeStyles.hoverBg;
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                  }}
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
                                    // Toggle the audio player display (similar to Catie's feedback)
                                    setShowRecordingPlayer(!showRecordingPlayer);
                                    // Stop any playing audio when hiding the player
                                    if (showRecordingPlayer && isPlayingRecording) {
                                      stopRecordingPlayback();
                                    }
                                  }}
                                  variant="outline"
                                  size="icon"
                                  className="h-12 w-12 rounded-xl"
                                  style={{
                                    borderColor: themeStyles.border,
                                    color: themeStyles.buttonPrimary,
                                    backgroundColor: showRecordingPlayer ? (themeStyles.theme.name === 'dark' ? 'rgba(59, 130, 246, 0.2)' : '#eff6ff') : 'transparent'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = themeStyles.hoverBg;
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = showRecordingPlayer ? (themeStyles.theme.name === 'dark' ? 'rgba(59, 130, 246, 0.2)' : '#eff6ff') : 'transparent';
                                  }}
                                >
                                  <Volume2 className="w-5 h-5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{showRecordingPlayer ? "Hide audio player" : "Listen to your recorded answer"}</p>
                              </TooltipContent>
                            </Tooltip>
                          )}

                          {/* Evaluation Button */}
                          {(() => {
                            console.log("🔍 DEBUG: Checking evaluate button condition", {
                              currentPart,
                              currentQuestion,
                              key: `part${currentPart}_q${currentQuestion}`,
                              hasRecording: !!recordings[`part${currentPart}_q${currentQuestion}`],
                              allRecordingKeys: Object.keys(recordings),
                              recordingValue: recordings[`part${currentPart}_q${currentQuestion}`]
                            });
                            return null;
                          })()}

                          {recordings[`part${currentPart}_q${currentQuestion}`] && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  onClick={evaluateRecording}
                                  disabled={isEvaluating}
                                  variant="outline"
                                  size="icon"
                                  className="h-12 w-12 rounded-xl relative"
                                  style={{
                                    borderColor: themeStyles.border,
                                    color: themeStyles.buttonPrimary,
                                    backgroundColor: isEvaluating ? (themeStyles.theme.name === 'dark' ? 'rgba(59, 130, 246, 0.2)' : '#eff6ff') : 'transparent'
                                  }}
                                  onMouseEnter={(e) => {
                                    if (!isEvaluating) e.currentTarget.style.backgroundColor = themeStyles.hoverBg;
                                  }}
                                  onMouseLeave={(e) => {
                                    if (!isEvaluating) e.currentTarget.style.backgroundColor = 'transparent';
                                  }}
                                >
                                  {isEvaluating ? (
                                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-current border-t-transparent" />
                                  ) : (
                                    <Sparkles className="w-5 h-5" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{isEvaluating ? "Evaluating your answer..." : "Evaluate with AI"}</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TooltipProvider>
                    )}
                  </div>

                  {/* Audio Player for Recorded Answer - Keep playing even during/after evaluation */}
                  {showRecordingPlayer && recordings[`part${currentPart}_q${currentQuestion}`] && (
                    <div className="mt-4 p-4 rounded-xl border animate-in fade-in slide-in-from-top-4 duration-300"
                      style={{
                        borderColor: themeStyles.border,
                        backgroundColor: themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.02)' : '#ffffff'
                      }}>
                      <div className="space-y-3">
                        <h4 className="font-medium flex items-center gap-2 text-sm uppercase tracking-wider opacity-80" style={{ color: themeStyles.textPrimary }}>
                          <Volume2 className="w-4 h-4" />
                          Your Recorded Answer
                        </h4>
                        {currentRecordingUrl && (
                          <div className="p-2 rounded-xl border"
                            style={{
                              borderColor: themeStyles.border,
                              backgroundColor: themeStyles.theme.name === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.5)'
                            }}>
                            <CustomAudioPlayer
                              src={currentRecordingUrl}
                              accentColor={themeStyles.buttonPrimary}
                              style={{
                                backgroundColor: 'transparent'
                              }}
                            />
                          </div>
                        )}
                        <div className="flex justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowRecordingPlayer(false)}
                            className="h-8 px-3 text-xs"
                            style={{ color: themeStyles.textSecondary }}
                          >
                            Hide Player
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* AI Evaluation Loading - Small floating indicator */}
                  {isEvaluating && (
                    <div className="mt-4 flex items-center justify-center animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="flex items-center gap-3 px-5 py-3 rounded-full shadow-lg border"
                        style={{
                          backgroundColor: themeStyles.theme.name === 'dark' ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.98)',
                          borderColor: themeStyles.border,
                          boxShadow: `0 4px 20px -4px ${themeStyles.buttonPrimary}30`
                        }}>
                        <div className="w-8 h-8">
                          <DotLottieLoadingAnimation size={32} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Inline Evaluation Result */}
                  {evaluationResult && (
                    <div className="mt-8 p-6 rounded-2xl border animate-in fade-in slide-in-from-top-4 duration-500 max-w-3xl mx-auto text-left shadow-lg relative overflow-hidden"
                      style={{
                        borderColor: themeStyles.border,
                        backgroundColor: themeStyles.theme.colors.cardBackground || '#ffffff',
                        color: themeStyles.textPrimary
                      }}
                    >
                      {/* Header with Catie's Avatar */}
                      <div className="flex items-center justify-between mb-6 relative z-10">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <img
                              src="/1000031289.png"
                              alt="Catie AI"
                              className="w-14 h-14 rounded-full shadow-md object-cover ring-2 ring-offset-2"
                              style={{ '--tw-ring-color': themeStyles.buttonPrimary } as React.CSSProperties}
                            />
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center shadow-sm border-2 border-white"
                              style={{ backgroundColor: themeStyles.buttonPrimary }}
                            >
                              <Sparkles className="w-2.5 h-2.5 text-white" />
                            </div>
                          </div>
                          <div>
                            <h3 className="font-bold text-lg" style={{ color: themeStyles.textPrimary }}>
                              Catie's Feedback
                            </h3>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEvaluationResult(null)}
                          className="h-8 w-8 p-0 opacity-60 hover:opacity-100"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Audio & Transcription */}
                      <div className="mb-6 space-y-4 relative z-10">
                        <div className="rounded-xl p-4 space-y-3 border"
                          style={{
                            backgroundColor: themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.02)' : '#ffffff',
                            borderColor: themeStyles.border
                          }}>
                          <h4 className="font-medium mb-2 flex items-center gap-2 text-xs uppercase tracking-wider opacity-80" style={{ color: themeStyles.textPrimary }}>
                            <Volume2 className="w-3.5 h-3.5" />
                            Your Response
                          </h4>

                          {/* Custom Audio Player */}
                          {currentRecordingUrl ? (
                            <div className="p-2 rounded-xl border"
                              style={{
                                borderColor: themeStyles.border,
                                backgroundColor: themeStyles.theme.name === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.5)'
                              }}>
                              <CustomAudioPlayer
                                src={currentRecordingUrl}
                                accentColor={themeStyles.buttonPrimary}
                                style={{
                                  backgroundColor: 'transparent'
                                }}
                              />
                            </div>
                          ) : (
                            <div className="text-xs italic p-3 rounded-lg border flex items-center gap-2"
                              style={{ borderColor: themeStyles.border, color: themeStyles.textSecondary }}>
                              <AlertCircle className="w-4 h-4" />
                              Audio recording not available
                            </div>
                          )}

                          {/* Transcription Display */}
                          <div className="mt-4">
                            <div className="rounded-xl p-4 border shadow-sm relative group"
                              style={{
                                backgroundColor: themeStyles.theme.name === 'dark' ? 'rgba(0,0,0,0.2)' : '#ffffff',
                                borderColor: themeStyles.border
                              }}>
                              <div className="absolute top-3 right-3 opacity-20 group-hover:opacity-50 transition-opacity">
                                <FileText className="w-4 h-4" />
                              </div>
                              <p className="text-sm leading-relaxed italic" style={{ color: themeStyles.textPrimary }}>
                                "{evaluationResult.transcription}"
                              </p>
                            </div>
                          </div>

                        </div>

                      </div>

                      {/* Advanced Metrics Visualization */}
                      <div className="mb-8">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
                          {/* Overall Score Circle */}
                          <div className="flex flex-col items-center justify-center p-4 rounded-2xl border"
                            style={{
                              backgroundColor: themeStyles.theme.name === 'dark'
                                ? 'rgba(255,255,255,0.03)'
                                : themeStyles.theme.name === 'minimalist'
                                  ? '#ffffff'
                                  : 'rgba(255,255,255,0.5)',
                              borderColor: themeStyles.border
                            }}>
                            <CircularScore
                              score={Math.round(
                                (Object.values(evaluationResult.metrics || {}) as number[]).reduce((a, b) => a + b, 0) /
                                (Object.keys(evaluationResult.metrics || {}).length || 1)
                              )}
                              label="Overall"
                              subLabel="Speaking Score"
                              size={160}
                              color={themeStyles.buttonPrimary}
                            />
                          </div>

                          {/* Radar Chart - 5 metrics: Pronunciation, Vocabulary, Grammar, Intonation, Fluency */}
                          <div className="flex items-center justify-center p-4 rounded-2xl border min-h-[240px]"
                            style={{
                              backgroundColor: themeStyles.theme.name === 'dark'
                                ? 'rgba(255,255,255,0.03)'
                                : themeStyles.theme.name === 'minimalist'
                                  ? '#ffffff'
                                  : 'rgba(255,255,255,0.5)',
                              borderColor: themeStyles.border
                            }}>
                            <RadarMetrics
                              metrics={{
                                pronunciation: evaluationResult.metrics?.pronunciation || 0,
                                vocabulary: evaluationResult.metrics?.vocabulary || 0,
                                grammar: evaluationResult.metrics?.grammar || 0,
                                intonation: evaluationResult.metrics?.intonation || 0,
                                fluency: evaluationResult.metrics?.fluency || 0
                              }}
                              width={240}
                              height={220}
                            />
                          </div>
                        </div>
                      </div>

                      <Separator className="my-6" style={{ backgroundColor: themeStyles.border }} />

                      {/* Feedback */}
                      <div className="space-y-2 mb-6">
                        <h3 className="font-semibold text-base flex items-center gap-2" style={{ color: themeStyles.textPrimary }}>
                          <MessageSquare className="w-4 h-4" style={{ color: themeStyles.buttonPrimary }} />
                          Feedback
                        </h3>
                        <p className="text-sm leading-relaxed" style={{ color: themeStyles.textSecondary }}>
                          {evaluationResult.feedback}
                        </p>
                      </div>

                      {/* Enhanced Sentence */}
                      <div className="p-4 rounded-xl space-y-2 mb-6 border-2"
                        style={{
                          backgroundColor: themeStyles.theme.name === 'dark'
                            ? 'rgba(255,255,255,0.05)'
                            : themeStyles.theme.name === 'glassmorphism'
                              ? 'rgba(255,255,255,0.7)'
                              : themeStyles.theme.name === 'minimalist'
                                ? '#f0f9ff'
                                : 'rgba(255,255,255,0.4)',
                          borderColor: `${themeStyles.buttonPrimary}40`
                        }}
                      >
                        <h3 className="font-semibold flex items-center gap-2 text-xs uppercase tracking-wide" style={{ color: themeStyles.buttonPrimary }}>
                          <Sparkles className="w-3 h-3" />
                          Try saying it like this
                        </h3>
                        <p className="text-base italic font-medium" style={{ color: themeStyles.textPrimary }}>
                          "{evaluationResult.enhancedSentence}"
                        </p>
                      </div>

                      {/* Detailed Analysis by Metric */}
                      {evaluationResult.detailedAnalysis && (
                        <div className="space-y-3">
                          <h3 className="font-semibold text-sm flex items-center gap-2" style={{ color: themeStyles.textPrimary }}>
                            <TrendingUp className="w-4 h-4" style={{ color: themeStyles.textSecondary }} />
                            Detailed Analysis
                          </h3>
                          <div className="grid gap-2">
                            {/* Pronunciation */}
                            {evaluationResult.detailedAnalysis.pronunciation && (
                              <div className="p-3 rounded-lg border" style={{ borderColor: themeStyles.border, backgroundColor: themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }}>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: themeStyles.textPrimary }}>Pronunciation</span>
                                  <span className="text-xs font-medium px-1.5 py-0.5 rounded" style={{ backgroundColor: themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', color: themeStyles.textSecondary }}>
                                    {evaluationResult.metrics?.pronunciation || 0}%
                                  </span>
                                </div>
                                <p className="text-xs leading-relaxed" style={{ color: themeStyles.textSecondary }}>
                                  {evaluationResult.detailedAnalysis.pronunciation}
                                </p>
                              </div>
                            )}
                            {/* Vocabulary */}
                            {evaluationResult.detailedAnalysis.vocabulary && (
                              <div className="p-3 rounded-lg border" style={{ borderColor: themeStyles.border, backgroundColor: themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }}>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: themeStyles.textPrimary }}>Vocabulary</span>
                                  <span className="text-xs font-medium px-1.5 py-0.5 rounded" style={{ backgroundColor: themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', color: themeStyles.textSecondary }}>
                                    {evaluationResult.metrics?.vocabulary || 0}%
                                  </span>
                                </div>
                                <p className="text-xs leading-relaxed" style={{ color: themeStyles.textSecondary }}>
                                  {evaluationResult.detailedAnalysis.vocabulary}
                                </p>
                              </div>
                            )}
                            {/* Grammar */}
                            {evaluationResult.detailedAnalysis.grammar && (
                              <div className="p-3 rounded-lg border" style={{ borderColor: themeStyles.border, backgroundColor: themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }}>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: themeStyles.textPrimary }}>Grammar</span>
                                  <span className="text-xs font-medium px-1.5 py-0.5 rounded" style={{ backgroundColor: themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', color: themeStyles.textSecondary }}>
                                    {evaluationResult.metrics?.grammar || 0}%
                                  </span>
                                </div>
                                <p className="text-xs leading-relaxed" style={{ color: themeStyles.textSecondary }}>
                                  {evaluationResult.detailedAnalysis.grammar}
                                </p>
                              </div>
                            )}
                            {/* Intonation */}
                            {evaluationResult.detailedAnalysis.intonation && (
                              <div className="p-3 rounded-lg border" style={{ borderColor: themeStyles.border, backgroundColor: themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }}>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: themeStyles.textPrimary }}>Intonation</span>
                                  <span className="text-xs font-medium px-1.5 py-0.5 rounded" style={{ backgroundColor: themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', color: themeStyles.textSecondary }}>
                                    {evaluationResult.metrics?.intonation || 0}%
                                  </span>
                                </div>
                                <p className="text-xs leading-relaxed" style={{ color: themeStyles.textSecondary }}>
                                  {evaluationResult.detailedAnalysis.intonation}
                                </p>
                              </div>
                            )}
                            {/* Fluency */}
                            {evaluationResult.detailedAnalysis.fluency && (
                              <div className="p-3 rounded-lg border" style={{ borderColor: themeStyles.border, backgroundColor: themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }}>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: themeStyles.textPrimary }}>Fluency</span>
                                  <span className="text-xs font-medium px-1.5 py-0.5 rounded" style={{ backgroundColor: themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', color: themeStyles.textSecondary }}>
                                    {evaluationResult.metrics?.fluency || 0}%
                                  </span>
                                </div>
                                <p className="text-xs leading-relaxed" style={{ color: themeStyles.textSecondary }}>
                                  {evaluationResult.detailedAnalysis.fluency}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                    </div>
                  )}

                  {/* Language Selection and Submit - Centered Underneath Recording Button */}
                  {showLanguagePreference && (
                    <div className="flex justify-center mt-4">
                      <div className="flex items-center gap-3">
                        <Select value={feedbackLanguage} onValueChange={setFeedbackLanguage}>
                          <SelectTrigger
                            className="w-[90px] h-8 text-sm border-0 bg-transparent shadow-none p-0 focus:ring-0"
                            style={{
                              color: themeStyles.textPrimary,
                              '--tw-ring-color': themeStyles.buttonPrimary
                            } as React.CSSProperties}
                          >
                            <SelectValue placeholder="Language" />
                          </SelectTrigger>
                          <SelectContent>
                            {FEEDBACK_LANGUAGES.map((lang) => (
                              <SelectItem key={lang.value} value={lang.value}>
                                {lang.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Button
                          type="button"
                          onClick={() => {
                            // Persist preference so backend / results page can localize feedback
                            try {
                              localStorage.setItem(
                                "ielts_speaking_feedback_language",
                                feedbackLanguage || "en"
                              );
                            } catch (e) {
                              console.warn("Unable to persist feedback language preference", e);
                            }
                            submitTest();
                          }}
                          className="font-medium"
                          style={{
                            backgroundColor: themeStyles.buttonPrimary,
                            color: '#ffffff'
                          }}
                        >
                          Submit
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Question Navigation Buttons - Bottom Corners */}
                  {(currentPart === 1 || currentPart === 3) && !showLanguagePreference && (
                    <TooltipProvider>
                      <>
                        {/* Previous Question Button - Bottom Left */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              onClick={() => {
                                console.log("🔙 Previous question button clicked");
                                if (currentQuestion > 0) {
                                  setCurrentQuestion(currentQuestion - 1);
                                  setShowQuestion(false);
                                  setEvaluationResult(null); // Clear evaluation when going back
                                  setShowRecordingPlayer(false); // Hide recording player
                                }
                              }}
                              disabled={currentQuestion === 0}
                              size="icon"
                              className="absolute bottom-0 left-0 h-12 w-12"
                              style={{ color: themeStyles.textSecondary }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.color = themeStyles.buttonPrimary;
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.color = themeStyles.textSecondary;
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }}
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
                                console.log("🔘 Next question button clicked");
                                setShowQuestion(false);
                                nextQuestion();
                              }}
                              disabled={!recordings[`part${currentPart}_q${currentQuestion}`]}
                              size="icon"
                              className="absolute bottom-0 right-0 h-12 w-12"
                              style={{ color: themeStyles.textSecondary }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.color = themeStyles.buttonPrimary;
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.color = themeStyles.textSecondary;
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }}
                            >
                              <ArrowRight className="w-5 h-5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              {!recordings[`part${currentPart}_q${currentQuestion}`]
                                ? "Please record your answer first"
                                : (currentQuestion === (testData?.part1_prompts.length || 0) - 1 && currentPart === 1 && !testData?.part2_prompt && (!testData?.part3_prompts || testData.part3_prompts.length === 0))
                                  ? "Complete test"
                                  : "Next question"}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </>
                    </TooltipProvider>
                  )}

                  {/* Part 2 Navigation Button - Go to Part 3 */}
                  {currentPart === 2 && !showLanguagePreference && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            onClick={() => {
                              console.log("🔘 Part 2 navigation button clicked");
                              nextQuestion();
                            }}
                            disabled={!recordings[`part${currentPart}_q${currentQuestion}`]}
                            size="icon"
                            className="absolute bottom-0 right-0 h-12 w-12 hover:bg-transparent hover:text-foreground"
                            style={{ color: themeStyles.textSecondary }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = themeStyles.buttonPrimary;
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = themeStyles.textSecondary;
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            <ArrowRight className="w-5 h-5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            {!recordings[`part${currentPart}_q${currentQuestion}`]
                              ? "Please record your answer first"
                              : (testData?.part3_prompts && testData.part3_prompts.length > 0)
                                ? "Go to Part 3"
                                : "Complete test"}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </CardContent>
              </Card>


              {/* Exit Test - fixed but kept subtle in corner */}
              <div className="fixed bottom-6 left-6 z-40 flex items-center gap-4">
                <button
                  onClick={() => navigate('/ielts-portal')}
                  className="text-lg cursor-pointer transition-colors"
                  style={{ color: themeStyles.textSecondary }}
                  onMouseEnter={(e) => e.currentTarget.style.color = themeStyles.buttonPrimary}
                  onMouseLeave={(e) => e.currentTarget.style.color = themeStyles.textSecondary}
                >
                  Exit Test
                </button>
              </div>

              {/* Quick suggestion buttons next to Catie bot:
            - Structure
            - Vocabulary
            - Example answers
            - Grammar
        */}
              {showAIAssistant && (
                <div className="fixed bottom-12 right-4 sm:bottom-20 sm:right-[420px] z-50 flex flex-col gap-2 sm:gap-3">
                  {/* Structure helper */}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleSuggestionClick('Help with Speaking Structure')}
                          disabled={isChatLoading}
                          className="h-9 w-9 sm:h-12 sm:w-12 p-0 backdrop-blur-sm shadow-lg"
                          style={{
                            borderColor: themeStyles.border || '#e5e7eb',
                            backgroundColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.9)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.15)' : themeStyles.theme.name === 'minimalist' ? '#ffffff' : themeStyles.theme.colors.cardBackground || '#ffffff',
                            color: themeStyles.buttonPrimary || '#2563eb'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = themeStyles.hoverBg || 'rgba(0,0,0,0.05)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.9)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.15)' : themeStyles.theme.name === 'minimalist' ? '#ffffff' : themeStyles.theme.colors.cardBackground || '#ffffff';
                          }}
                        >
                          <ListTree className="w-4 h-4 sm:w-6 sm:h-6" style={{ color: themeStyles.buttonPrimary || '#2563eb' }} />
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
                          size="icon"
                          onClick={() => handleSuggestionClick('Suggest Some Speaking Vocabulary')}
                          disabled={isChatLoading}
                          className="h-9 w-9 sm:h-12 sm:w-12 p-0 backdrop-blur-sm shadow-lg"
                          style={{
                            borderColor: themeStyles.border || '#e5e7eb',
                            backgroundColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.9)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.15)' : themeStyles.theme.name === 'minimalist' ? '#ffffff' : themeStyles.theme.colors.cardBackground || '#ffffff',
                            color: themeStyles.buttonPrimary || '#2563eb'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = themeStyles.hoverBg || 'rgba(0,0,0,0.05)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.9)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.15)' : themeStyles.theme.name === 'minimalist' ? '#ffffff' : themeStyles.theme.colors.cardBackground || '#ffffff';
                          }}
                        >
                          <BookOpen className="w-4 h-4 sm:w-6 sm:h-6" style={{ color: themeStyles.buttonPrimary || '#2563eb' }} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="left">
                        <p>Get vocabulary suggestions</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  {/* Example answers helper */}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() =>
                            handleSuggestionClick(
                              'Give me 2-3 straightforward band 7+ example answers for this exact IELTS Speaking question. Just show the actual answers, no explanations.'
                            )
                          }
                          disabled={isChatLoading}
                          className="h-9 w-9 sm:h-12 sm:w-12 p-0 backdrop-blur-sm shadow-lg"
                          style={{
                            borderColor: themeStyles.border || '#e5e7eb',
                            backgroundColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.9)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.15)' : themeStyles.theme.name === 'minimalist' ? '#ffffff' : themeStyles.theme.colors.cardBackground || '#ffffff',
                            color: themeStyles.buttonPrimary || '#2563eb'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = themeStyles.hoverBg || 'rgba(0,0,0,0.05)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.9)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.15)' : themeStyles.theme.name === 'minimalist' ? '#ffffff' : themeStyles.theme.colors.cardBackground || '#ffffff';
                          }}
                        >
                          <Sparkles className="w-4 h-4 sm:w-6 sm:h-6" style={{ color: themeStyles.buttonPrimary || '#2563eb' }} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="left">
                        <p>View band 7+ example answers</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  {/* Grammar helper */}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleSuggestionClick('Help me with grammar for this speaking question')}
                          disabled={isChatLoading}
                          className="h-9 w-9 sm:h-12 sm:w-12 p-0 backdrop-blur-sm shadow-lg"
                          style={{
                            borderColor: themeStyles.border || '#e5e7eb',
                            backgroundColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.9)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.15)' : themeStyles.theme.name === 'minimalist' ? '#ffffff' : themeStyles.theme.colors.cardBackground || '#ffffff',
                            color: themeStyles.buttonPrimary || '#2563eb'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = themeStyles.hoverBg || 'rgba(0,0,0,0.05)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.9)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.15)' : themeStyles.theme.name === 'minimalist' ? '#ffffff' : themeStyles.theme.colors.cardBackground || '#ffffff';
                          }}
                        >
                          <FileText className="w-4 h-4 sm:w-6 sm:h-6" style={{ color: themeStyles.buttonPrimary || '#2563eb' }} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="left">
                        <p>Get grammar help</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}

              {/* AI Assistant - Floating Bottom Right (Mac-style "suck into dock" animation)
            Desktop unchanged; Mobile sits slightly lower to stay below main container */}
              <div className="fixed bottom-6 right-3 sm:bottom-6 sm:right-6 z-50">
                {/* Chat card */}
                {showAIAssistant && (
                  <Card
                    className={`backdrop-blur-md rounded-3xl w-[260px] h-[360px] sm:w-96 sm:h-[500px] shadow-2xl flex flex-col transform-gpu origin-bottom-right transition-all duration-260 ease-in-out ${showAIAssistantVisible
                      ? 'opacity-100 scale-100 translate-y-0'
                      : 'opacity-0 scale-75 translate-y-8'
                      }`}
                    style={{
                      backgroundColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.95)' : themeStyles.theme.name === 'dark' ? 'rgba(30, 41, 59, 0.95)' : themeStyles.theme.name === 'minimalist' ? '#ffffff' : themeStyles.theme.colors.cardBackground,
                      borderColor: themeStyles.border,
                      backdropFilter: themeStyles.theme.name === 'glassmorphism' ? 'blur(12px)' : themeStyles.theme.name === 'dark' ? 'blur(8px)' : 'none',
                      ...themeStyles.cardStyle
                    }}
                  >
                    <CardHeader className="pb-1 sm:pb-2 rounded-t-3xl relative">
                      <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={closeAIAssistant}
                          className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                          style={{ color: themeStyles.textPrimary }}
                        >
                          ✕
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col px-2.5 py-2 sm:p-4 overflow-hidden">
                      <Conversation className="flex-1 min-h-0">
                        <ConversationContent className="flex-1 min-h-0">
                          {chatMessages.length === 0 && !isChatLoading ? (
                            <ConversationEmptyState
                              icon={<Orb className="size-9 sm:size-12" style={{ color: themeStyles.textSecondary }} />}
                              title="Start a conversation"
                              description="Ask for help with your IELTS speaking practice"
                            />
                          ) : (
                            <>
                              {/* Current question displayed at the top of chat */}
                              <div
                                className="rounded-lg p-3 mb-4"
                                style={{
                                  backgroundColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.1)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.05)' : themeStyles.theme.name === 'minimalist' ? '#f9fafb' : 'rgba(255,255,255,0.6)',
                                  borderColor: themeStyles.border,
                                  borderWidth: '1px',
                                  borderStyle: 'solid'
                                }}
                              >
                                <div className="text-xs uppercase tracking-wide mb-1" style={{ color: themeStyles.textSecondary }}>Question</div>
                                <div className="text-xs sm:text-sm font-medium" style={{ color: themeStyles.textPrimary }}>{questionType}</div>
                                <div className="text-[10px] sm:text-sm whitespace-pre-wrap mt-1" style={{ color: themeStyles.textSecondary }}>
                                  {currentQuestionText || 'No question available.'}
                                </div>
                              </div>

                              {chatMessages.map((message) => (
                                <Message key={message.id} from={message.type === 'user' ? 'user' : 'assistant'}>
                                  {message.type === 'bot' && (
                                    <div
                                      style={{
                                        borderRadius: '50%',
                                        overflow: 'hidden',
                                        width: '52px',
                                        height: '52px',
                                        flexShrink: 0
                                      }}
                                    >
                                      <img
                                        src="/1000031289.png"
                                        alt="Catie"
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                      />
                                    </div>
                                  )}
                                  <MessageContent>
                                    <div
                                      className="px-3 py-2 rounded-xl text-sm"
                                      style={{
                                        backgroundColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.1)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.05)' : themeStyles.theme.name === 'minimalist' ? '#f9fafb' : 'rgba(255,255,255,0.5)',
                                        borderColor: themeStyles.border,
                                        borderWidth: '1px',
                                        borderStyle: 'solid',
                                        color: themeStyles.textPrimary
                                      }}
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
                                  {message.type === 'user' && profile?.avatar_url && (
                                    <div
                                      style={{
                                        borderRadius: '50%',
                                        overflow: 'hidden',
                                        width: '52px',
                                        height: '52px',
                                        flexShrink: 0
                                      }}
                                    >
                                      <img
                                        src={profile.avatar_url}
                                        alt="Your avatar"
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                      />
                                    </div>
                                  )}
                                </Message>
                              ))}
                              {isChatLoading && (
                                <Message from="assistant">
                                  <MessageContent>
                                    <div
                                      className="px-3 py-2 rounded-xl text-sm"
                                      style={{
                                        backgroundColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.1)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.05)' : themeStyles.theme.name === 'minimalist' ? '#f9fafb' : 'rgba(255,255,255,0.5)',
                                        borderColor: themeStyles.border,
                                        borderWidth: '1px',
                                        borderStyle: 'solid'
                                      }}
                                    >
                                      <ShimmeringText text="Thinking..." />
                                    </div>
                                  </MessageContent>
                                  <div
                                    style={{
                                      borderRadius: '50%',
                                      overflow: 'hidden',
                                      width: '52px',
                                      height: '52px',
                                    }}
                                  >
                                    <img
                                      src="/1000031289.png"
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

                      <div className="flex-shrink-0 mt-2.5 sm:mt-4">
                        <div className="flex gap-1.5 sm:gap-2">
                          <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyPress={(e) =>
                              e.key === 'Enter' && !isChatLoading && newMessage.trim() && sendChatMessage()
                            }
                            placeholder="Ask for speaking help..."
                            className="flex-1 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg text-[10px] sm:text-sm focus:outline-none focus:ring-0 resize-none"
                            style={{
                              backgroundColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.1)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.05)' : themeStyles.theme.name === 'minimalist' ? '#ffffff' : themeStyles.theme.colors.cardBackground,
                              borderColor: themeStyles.border,
                              borderWidth: '1px',
                              borderStyle: 'solid',
                              color: themeStyles.textPrimary
                            }}
                            disabled={isChatLoading}
                          />
                          <style dangerouslySetInnerHTML={{
                            __html: `
                      input[placeholder="Ask for speaking help..."]::placeholder {
                        color: ${themeStyles.textSecondary};
                      }
                    ` }} />
                          <Button
                            onClick={() => sendChatMessage()}
                            disabled={isChatLoading || !newMessage.trim()}
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                            style={{ color: themeStyles.textPrimary }}
                          >
                            {isChatLoading ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2" style={{ borderColor: themeStyles.textPrimary }} />
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
                      width: '64px',
                      height: '64px',
                      cursor: 'pointer',
                      boxShadow: '0 8px 20px rgba(0,0,0,0.18)',
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
                      el.style.boxShadow = '0 14px 30px rgba(0,0,0,0.24)';
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget as HTMLDivElement;
                      el.style.transform = 'scale(1.0) translateY(0px)';
                      el.style.boxShadow = '0 10px 25px rgba(0,0,0,0.15)';
                    }}
                  >
                    <img
                      src="/1000031289.png"
                      alt="Catie"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                )}
              </div>

            </div>

          </div>
        </StudentLayout>

      </div>
      {/* Feedback Display Modal */}

    </div>
  );
};

export default IELTSSpeakingTest;
