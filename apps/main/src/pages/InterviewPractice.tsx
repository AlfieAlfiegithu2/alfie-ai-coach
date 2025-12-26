import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import StudentLayout from '@/components/StudentLayout';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import LoadingAnimation from '@/components/animations/LoadingAnimation';
import SEO from '@/components/SEO';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useThemeStyles } from '@/hooks/useThemeStyles';
import {
  Mic, MicOff, Phone, PhoneOff, Volume2, ChevronRight, Home, ArrowLeft,
  Play, Pause, SkipForward, CheckCircle2, AlertCircle, Sparkles,
  Target, MessageSquare, Star, Award, Languages, BarChart3
} from 'lucide-react';

// Types
interface InterviewQuestion {
  id: string;
  question: string;
  category: 'behavioral' | 'technical' | 'situational';
  answer?: string;
  qualityScore?: number;
  englishScore?: number;
  feedback?: string;
}

interface InterviewSession {
  id: string;
  occupation: string;
  gradingMode: 'quality_only' | 'quality_and_english';
  questions: InterviewQuestion[];
  currentQuestion: number;
  status: 'setup' | 'in_progress' | 'completed';
  overallQualityScore?: number;
  overallEnglishScore?: number;
  summaryFeedback?: string;
  strengths?: string[];
  areasToImprove?: string[];
}

// Qwen TTS Voices (from existing implementation)
const INTERVIEWER_VOICES = [
  { id: 'Elias', name: 'Elias - Professional', gender: 'Male' },
  { id: 'Jennifer', name: 'Jennifer - Friendly', gender: 'Female' },
  { id: 'Ryan', name: 'Ryan - Formal', gender: 'Male' },
  { id: 'Katerina', name: 'Katerina - Warm', gender: 'Female' },
];

const InterviewPractice = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const themeStyles = useThemeStyles();
  const audioRef = useRef<HTMLAudioElement>(null);
  const recognitionRef = useRef<any>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [occupation, setOccupation] = useState('');
  const [industry, setIndustry] = useState('');

  // Session state
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [gradingMode, setGradingMode] = useState<'quality_only' | 'quality_and_english'>('quality_only');
  const [selectedVoice, setSelectedVoice] = useState('Jennifer');

  // Interview state
  const [interviewState, setInterviewState] = useState<'idle' | 'speaking' | 'listening' | 'thinking' | 'grading'>('idle');
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);

  // Debug
  const [debugLog, setDebugLog] = useState<string[]>([]);

  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] ${msg}`);
    setDebugLog(prev => [...prev.slice(-10), `[${timestamp}] ${msg}`]);
  };

  // Load user profile
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const { data } = await supabase
          .from('business_profiles')
          .select('occupation, industry')
          .eq('user_id', user.id)
          .maybeSingle();

        if (data) {
          setOccupation(data.occupation || '');
          setIndustry(data.industry || '');
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      addLog('Speech recognition not supported');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.language = 'en-US';

    recognition.onstart = () => {
      addLog('Speech recognition started');
      setInterviewState('listening');
    };

    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim = transcript;
        }
      }

      if (final) {
        setCurrentAnswer(prev => prev + ' ' + final);
        setLiveTranscript('');
      } else {
        setLiveTranscript(interim);
      }
    };

    recognition.onerror = (event: any) => {
      addLog(`Speech error: ${event.error}`);
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        toast({
          title: 'Microphone Error',
          description: 'Please check your microphone settings',
          variant: 'destructive',
        });
      }
    };

    recognition.onend = () => {
      addLog('Speech recognition ended');
      // Don't restart if we're done with this question
      if (interviewState === 'listening') {
        try {
          recognition.start();
        } catch (e) {
          // Already started
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.abort();
      } catch (e) { }
    };
  }, [toast]);

  // Start interview session
  const startInterview = async () => {
    if (!occupation) {
      toast({
        title: 'Profile required',
        description: 'Please set up your business profile first',
        variant: 'destructive',
      });
      navigate('/business-portal');
      return;
    }

    setInterviewState('thinking');
    addLog('Starting interview...');

    try {
      // Generate 10 questions based on occupation
      const { data, error } = await supabase.functions.invoke('interview-evaluator', {
        body: {
          action: 'generate_questions',
          occupation: occupation,
          industry: industry,
          count: 10,
        },
      });

      if (error) throw error;

      if (data.success && data.questions) {
        const newSession: InterviewSession = {
          id: crypto.randomUUID(),
          occupation: occupation,
          gradingMode: gradingMode,
          questions: data.questions.map((q: string, idx: number) => ({
            id: crypto.randomUUID(),
            question: q,
            category: idx < 4 ? 'behavioral' : idx < 7 ? 'situational' : 'technical',
          })),
          currentQuestion: 0,
          status: 'in_progress',
        };

        setSession(newSession);

        // Play first question
        await playQuestion(newSession.questions[0].question);
      } else {
        throw new Error(data.error || 'Failed to generate questions');
      }
    } catch (error) {
      console.error('Error starting interview:', error);
      toast({
        title: 'Error',
        description: 'Failed to start interview. Please try again.',
        variant: 'destructive',
      });
      setInterviewState('idle');
    }
  };

  // Play question using Qwen TTS
  const playQuestion = async (question: string) => {
    setInterviewState('speaking');
    setIsPlaying(true);
    addLog(`Playing question: ${question.substring(0, 50)}...`);

    try {
      const { data, error } = await supabase.functions.invoke('openrouter-qwen-tts', {
        body: {
          text: question,
          voice: selectedVoice,
          language_type: 'English',
        },
      });

      if (error) throw error;

      if (data.audioContent) {
        // Clean and decode base64
        let cleanedBase64 = data.audioContent.trim().replace(/\s/g, '');
        cleanedBase64 = cleanedBase64.replace(/-/g, '+').replace(/_/g, '/');
        while (cleanedBase64.length % 4) cleanedBase64 += '=';

        const binaryString = atob(cleanedBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'audio/mp3' });

        if (audioRef.current) {
          const url = URL.createObjectURL(blob);
          audioRef.current.src = url;

          audioRef.current.onended = () => {
            URL.revokeObjectURL(url);
            setIsPlaying(false);
            addLog('Question audio ended, starting listening');
            startListening();
          };

          audioRef.current.onerror = () => {
            addLog('Audio playback error');
            setIsPlaying(false);
            startListening();
          };

          await audioRef.current.play();
        }
      } else {
        throw new Error('No audio content received');
      }
    } catch (error) {
      console.error('TTS error:', error);
      addLog(`TTS error: ${error}`);
      setIsPlaying(false);
      // Still allow user to answer even if TTS fails
      startListening();
    }
  };

  // Start listening for answer
  const startListening = () => {
    setCurrentAnswer('');
    setLiveTranscript('');
    setInterviewState('listening');

    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        addLog('Started listening for answer');
      } catch (e) {
        addLog('Recognition already started');
      }
    }
  };

  // Stop listening and submit answer
  const submitAnswer = async () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) { }
    }

    const finalAnswer = (currentAnswer + ' ' + liveTranscript).trim();

    if (!finalAnswer) {
      toast({
        title: 'No answer detected',
        description: 'Please speak your answer before submitting',
        variant: 'destructive',
      });
      return;
    }

    if (!session) return;

    setInterviewState('grading');
    addLog(`Submitting answer: ${finalAnswer.substring(0, 50)}...`);

    try {
      // Grade the answer
      const { data, error } = await supabase.functions.invoke('interview-evaluator', {
        body: {
          action: 'grade_answer',
          question: session.questions[session.currentQuestion].question,
          answer: finalAnswer,
          occupation: occupation,
          gradingMode: gradingMode,
        },
      });

      if (error) throw error;

      if (data.success) {
        // Update session with graded answer
        const updatedQuestions = [...session.questions];
        updatedQuestions[session.currentQuestion] = {
          ...updatedQuestions[session.currentQuestion],
          answer: finalAnswer,
          qualityScore: data.qualityScore,
          englishScore: data.englishScore,
          feedback: data.feedback,
        };

        const newCurrentQuestion = session.currentQuestion + 1;
        const isComplete = newCurrentQuestion >= session.questions.length;

        setSession({
          ...session,
          questions: updatedQuestions,
          currentQuestion: newCurrentQuestion,
          status: isComplete ? 'completed' : 'in_progress',
        });

        if (isComplete) {
          // Generate final summary
          await generateSummary(updatedQuestions);
        } else {
          // Play next question
          setCurrentAnswer('');
          setLiveTranscript('');
          await playQuestion(updatedQuestions[newCurrentQuestion].question);
        }
      } else {
        throw new Error(data.error || 'Failed to grade answer');
      }
    } catch (error) {
      console.error('Error grading answer:', error);
      toast({
        title: 'Error',
        description: 'Failed to grade answer. Please try again.',
        variant: 'destructive',
      });
      setInterviewState('listening');
    }
  };

  // Generate final summary
  const generateSummary = async (questions: InterviewQuestion[]) => {
    addLog('Generating final summary...');

    try {
      const { data, error } = await supabase.functions.invoke('interview-evaluator', {
        body: {
          action: 'generate_summary',
          questions: questions,
          occupation: occupation,
          gradingMode: gradingMode,
        },
      });

      if (error) throw error;

      if (data.success && session) {
        setSession({
          ...session,
          status: 'completed',
          overallQualityScore: data.overallQualityScore,
          overallEnglishScore: data.overallEnglishScore,
          summaryFeedback: data.summaryFeedback,
          strengths: data.strengths,
          areasToImprove: data.areasToImprove,
        });

        // Save to database
        if (user) {
          await supabase.from('interview_sessions').insert({
            user_id: user.id,
            occupation: occupation,
            industry: industry,
            grading_mode: gradingMode,
            questions: questions as unknown as Json,
            overall_quality_score: data.overallQualityScore,
            overall_english_score: data.overallEnglishScore,
            summary_feedback: data.summaryFeedback,
            strengths: data.strengths,
            areas_to_improve: data.areasToImprove,
            status: 'completed',
            completed_at: new Date().toISOString(),
          });
        }

        setInterviewState('idle');
        addLog('Interview completed!');
      }
    } catch (error) {
      console.error('Error generating summary:', error);
      setInterviewState('idle');
    }
  };

  // Skip current question
  const skipQuestion = async () => {
    if (!session) return;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) { }
    }

    const newCurrentQuestion = session.currentQuestion + 1;
    const isComplete = newCurrentQuestion >= session.questions.length;

    if (isComplete) {
      setSession({
        ...session,
        currentQuestion: newCurrentQuestion,
        status: 'completed',
      });
      await generateSummary(session.questions);
    } else {
      setSession({
        ...session,
        currentQuestion: newCurrentQuestion,
      });
      setCurrentAnswer('');
      setLiveTranscript('');
      await playQuestion(session.questions[newCurrentQuestion].question);
    }
  };

  // End interview early
  const endInterview = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) { }
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setSession(null);
    setInterviewState('idle');
    setCurrentAnswer('');
    setLiveTranscript('');
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: themeStyles.theme.colors.background }}>
        <LoadingAnimation />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: themeStyles.theme.colors.background }}>
      <SEO
        title="Interview Practice - Business English"
        description="Practice job interviews with AI voice interviewer. Get feedback on answer quality and English proficiency."
        keywords="interview practice, job interview, mock interview, interview preparation"
      />

      <StudentLayout title="Interview Practice" showBackButton backPath="/business-portal">
        <div className="max-w-4xl mx-auto px-4 space-y-6">
          {/* Back Button - unified style */}
          <div className="flex items-center mb-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/business-portal')}
              className="text-[#5d4e37] hover:bg-[#E8D5A3]/30 rounded-full h-9 px-4 transition-all"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              <span className="font-medium">Back</span>
            </Button>
          </div>

          {/* Setup Screen */}
          {!session && (
            <Card style={{ backgroundColor: themeStyles.theme.colors.cardBackground }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mic className="h-6 w-6 text-orange-500" />
                  AI Interview Practice
                </CardTitle>
                <CardDescription>
                  Practice with a voice-powered AI interviewer. Get instant feedback on your answers.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Occupation Display */}
                <div className="p-4 bg-orange-50 dark:bg-orange-950 rounded-lg">
                  <p className="text-sm text-muted-foreground">Practicing for:</p>
                  <p className="text-lg font-semibold capitalize" style={{ color: themeStyles.textPrimary }}>
                    {occupation.replace(/_/g, ' ')} {industry && `• ${industry}`}
                  </p>
                </div>

                {/* Grading Mode Selection */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">Grading Mode</Label>
                  <RadioGroup value={gradingMode} onValueChange={(v) => setGradingMode(v as any)}>
                    <div className="flex items-start gap-3 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                      <RadioGroupItem value="quality_only" id="quality_only" />
                      <div className="flex-1">
                        <Label htmlFor="quality_only" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                          <Target className="h-4 w-4 text-blue-500" />
                          Answer Quality Only
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Focuses on content relevance, structure, depth, and examples
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                      <RadioGroupItem value="quality_and_english" id="quality_and_english" />
                      <div className="flex-1">
                        <Label htmlFor="quality_and_english" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                          <Languages className="h-4 w-4 text-purple-500" />
                          Quality + English Proficiency
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Also evaluates grammar, vocabulary, fluency, and pronunciation
                        </p>
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                {/* Voice Selection */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">Interviewer Voice</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {INTERVIEWER_VOICES.map((voice) => (
                      <button
                        key={voice.id}
                        onClick={() => setSelectedVoice(voice.id)}
                        className={`p-3 rounded-lg border-2 transition-all text-left ${selectedVoice === voice.id
                          ? 'border-orange-500 bg-orange-50 dark:bg-orange-950'
                          : 'border-border hover:border-orange-300'
                          }`}
                      >
                        <p className="text-sm font-medium">{voice.name}</p>
                        <p className="text-xs text-muted-foreground">{voice.gender}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Start Button */}
                <Button
                  onClick={startInterview}
                  disabled={!occupation}
                  className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                  size="lg"
                >
                  <Phone className="h-5 w-5 mr-2" />
                  Start Interview
                </Button>

                {/* Info */}
                <div className="text-sm text-muted-foreground text-center">
                  <p>10 questions • ~15-20 minutes • Voice-to-voice conversation</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Interview In Progress */}
          {session && session.status === 'in_progress' && (
            <>
              {/* Progress */}
              <Card style={{ backgroundColor: themeStyles.theme.colors.cardBackground }}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Question {session.currentQuestion + 1} of 10</span>
                    <span className="text-sm text-muted-foreground">
                      {interviewState === 'speaking' ? '🔊 Listening...' :
                        interviewState === 'listening' ? '🎤 Your turn...' :
                          interviewState === 'grading' ? '⏳ Grading...' : ''}
                    </span>
                  </div>
                  <Progress value={(session.currentQuestion + 1) * 10} className="h-2" />
                </CardContent>
              </Card>

              {/* Current Question */}
              <Card style={{ backgroundColor: themeStyles.theme.colors.cardBackground }}>
                <CardHeader>
                  <Badge variant="outline" className="w-fit capitalize">
                    {session.questions[session.currentQuestion]?.category}
                  </Badge>
                  <CardTitle className="text-xl mt-2">
                    {session.questions[session.currentQuestion]?.question}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Live Transcript */}
                  {(interviewState === 'listening' || currentAnswer || liveTranscript) && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg min-h-[100px]">
                      <p className="text-sm text-muted-foreground mb-2">Your Answer:</p>
                      <p className="text-base">
                        {currentAnswer}
                        {liveTranscript && (
                          <span className="text-muted-foreground italic"> {liveTranscript}</span>
                        )}
                      </p>
                    </div>
                  )}

                  {/* Controls */}
                  <div className="flex gap-3">
                    {interviewState === 'listening' && (
                      <>
                        <Button onClick={submitAnswer} className="flex-1">
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Submit Answer
                        </Button>
                        <Button variant="outline" onClick={skipQuestion}>
                          <SkipForward className="h-4 w-4 mr-2" />
                          Skip
                        </Button>
                      </>
                    )}
                    {interviewState === 'speaking' && (
                      <Button variant="outline" disabled className="flex-1">
                        <Volume2 className="h-4 w-4 mr-2 animate-pulse" />
                        AI Speaking...
                      </Button>
                    )}
                    {interviewState === 'grading' && (
                      <Button variant="outline" disabled className="flex-1">
                        <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                        Analyzing Answer...
                      </Button>
                    )}
                    <Button variant="destructive" onClick={endInterview}>
                      <PhoneOff className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Previous Answers Summary */}
              {session.currentQuestion > 0 && (
                <Card style={{ backgroundColor: themeStyles.theme.colors.cardBackground }}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Previous Answers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {session.questions.slice(0, session.currentQuestion).map((q, idx) => (
                        <div key={q.id} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Q{idx + 1}</span>
                          {q.qualityScore !== undefined && (
                            <span className={`font-medium ${getScoreColor(q.qualityScore)}`}>
                              {q.qualityScore}/10
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Results Screen */}
          {session && session.status === 'completed' && (
            <>
              {/* Overall Score */}
              <Card style={{ backgroundColor: themeStyles.theme.colors.cardBackground }}>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <Award className="h-16 w-16 mx-auto text-yellow-500 mb-4" />
                    <h2 className="text-2xl font-bold mb-2">Interview Complete!</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                      <div className="p-6 bg-blue-50 dark:bg-blue-950 rounded-lg">
                        <Target className="h-8 w-8 mx-auto text-blue-500 mb-2" />
                        <p className="text-sm text-muted-foreground">Answer Quality</p>
                        <p className={`text-4xl font-bold ${getScoreColor(session.overallQualityScore || 0)}`}>
                          {session.overallQualityScore?.toFixed(1)}/10
                        </p>
                      </div>

                      {gradingMode === 'quality_and_english' && (
                        <div className="p-6 bg-purple-50 dark:bg-purple-950 rounded-lg">
                          <Languages className="h-8 w-8 mx-auto text-purple-500 mb-2" />
                          <p className="text-sm text-muted-foreground">English Proficiency</p>
                          <p className={`text-4xl font-bold ${getScoreColor(session.overallEnglishScore || 0)}`}>
                            {session.overallEnglishScore?.toFixed(1)}/10
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Summary Feedback */}
              {session.summaryFeedback && (
                <Card style={{ backgroundColor: themeStyles.theme.colors.cardBackground }}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-blue-500" />
                      Interview Feedback
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{session.summaryFeedback}</p>
                  </CardContent>
                </Card>
              )}

              {/* Strengths & Improvements */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {session.strengths && session.strengths.length > 0 && (
                  <Card style={{ backgroundColor: themeStyles.theme.colors.cardBackground }}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2 text-green-600">
                        <CheckCircle2 className="h-4 w-4" />
                        Strengths
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="text-sm space-y-2">
                        {session.strengths.map((s, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <Star className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                            {s}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {session.areasToImprove && session.areasToImprove.length > 0 && (
                  <Card style={{ backgroundColor: themeStyles.theme.colors.cardBackground }}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2 text-orange-600">
                        <AlertCircle className="h-4 w-4" />
                        Areas to Improve
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="text-sm space-y-2">
                        {session.areasToImprove.map((a, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <ChevronRight className="h-4 w-4 text-orange-500 flex-shrink-0 mt-0.5" />
                            {a}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Question-by-Question Results */}
              <Card style={{ backgroundColor: themeStyles.theme.colors.cardBackground }}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-purple-500" />
                    Question Results
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {session.questions.map((q, idx) => (
                      <div key={q.id} className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <Badge variant="outline" className="capitalize text-xs mb-1">
                              {q.category}
                            </Badge>
                            <p className="font-medium text-sm">Q{idx + 1}: {q.question}</p>
                          </div>
                          {q.qualityScore !== undefined && (
                            <div className="text-right ml-4">
                              <span className={`text-lg font-bold ${getScoreColor(q.qualityScore)}`}>
                                {q.qualityScore}/10
                              </span>
                              {gradingMode === 'quality_and_english' && q.englishScore !== undefined && (
                                <p className="text-xs text-muted-foreground">
                                  English: {q.englishScore}/10
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                        {q.answer && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            <strong>Your answer:</strong> {q.answer}
                          </p>
                        )}
                        {q.feedback && (
                          <p className="text-sm text-blue-600 dark:text-blue-400 mt-2">
                            <strong>Feedback:</strong> {q.feedback}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSession(null);
                    setInterviewState('idle');
                  }}
                  className="flex-1"
                >
                  Practice Again
                </Button>
                <Button
                  onClick={() => navigate('/business-portal')}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-red-500"
                >
                  Back to Portal
                </Button>
              </div>
            </>
          )}

          {/* Hidden Audio Element */}
          <audio ref={audioRef} />
        </div>
      </StudentLayout>
    </div>
  );
};

export default InterviewPractice;

