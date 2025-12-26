import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Mic,
  MicOff,
  Play,
  Pause,
  SkipForward,
  Clock,
  Volume2,
  Send,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Image as ImageIcon,
  X
} from 'lucide-react';
import StudentLayout from '@/components/StudentLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import LoadingAnimation from '@/components/animations/LoadingAnimation';
import { useThemeStyles } from '@/hooks/useThemeStyles';
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
} from "@/components/ui/conversation";
import { Message, MessageContent } from "@/components/ui/message";
import { Response } from "@/components/ui/response";
import { Orb } from "@/components/ui/orb";
import { ShimmeringText } from "@/components/ui/shimmering-text";

interface ChatMessage {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
}

// Type configurations
const TYPE_CONFIG: Record<string, {
  name: string;
  isSpeaking: boolean;
  isWriting: boolean;
  hasAudio: boolean;
  hasImage: boolean;
  hasPassage: boolean;
  timeLimit: number;
  wordLimit?: number;
  instructions: string;
}> = {
  'read_aloud': {
    name: 'Read Aloud',
    isSpeaking: true,
    isWriting: false,
    hasAudio: false,
    hasImage: false,
    hasPassage: true,
    timeLimit: 40,
    instructions: 'Look at the text below. In 30-40 seconds, you must read this text aloud as naturally and clearly as possible.'
  },
  'repeat_sentence': {
    name: 'Repeat Sentence',
    isSpeaking: true,
    isWriting: false,
    hasAudio: true,
    hasImage: false,
    hasPassage: false,
    timeLimit: 15,
    instructions: 'You will hear a sentence. Please repeat the sentence exactly as you hear it.'
  },
  'describe_image': {
    name: 'Describe Image',
    isSpeaking: true,
    isWriting: false,
    hasAudio: false,
    hasImage: true,
    hasPassage: false,
    timeLimit: 40,
    instructions: 'Look at the image below. In 25 seconds, please speak into the microphone and describe in detail what the image is showing.'
  },
  'retell_lecture': {
    name: 'Retell Lecture',
    isSpeaking: true,
    isWriting: false,
    hasAudio: true,
    hasImage: true,
    hasPassage: false,
    timeLimit: 40,
    instructions: 'You will hear a lecture. After listening to the lecture, in 10 seconds, please speak into the microphone and retell what you have just heard.'
  },
  'answer_short_question': {
    name: 'Answer Short Question',
    isSpeaking: true,
    isWriting: false,
    hasAudio: true,
    hasImage: false,
    hasPassage: false,
    timeLimit: 10,
    instructions: 'You will hear a question. Please give a simple and short answer. Often just one or a few words is enough.'
  },
  'summarize_group_discussion': {
    name: 'Summarize Group Discussion',
    isSpeaking: true,
    isWriting: false,
    hasAudio: true,
    hasImage: false,
    hasPassage: false,
    timeLimit: 70,
    instructions: 'You will hear a group discussion. You will have 10 seconds to prepare, then summarize the main points of the discussion in 70 seconds.'
  },
  'respond_to_situation': {
    name: 'Respond to a Situation',
    isSpeaking: true,
    isWriting: false,
    hasAudio: false,
    hasImage: false,
    hasPassage: true,
    timeLimit: 40,
    instructions: 'You will see a scenario. In 20 seconds prepare time, think about what you would say in this situation. Then speak for up to 40 seconds.'
  },
  'summarize_written_text': {
    name: 'Summarize Written Text',
    isSpeaking: false,
    isWriting: true,
    hasAudio: false,
    hasImage: false,
    hasPassage: true,
    timeLimit: 600,
    wordLimit: 75,
    instructions: 'Read the passage below. Write a one-sentence summary of the passage. Your summary should be between 5 and 75 words.'
  },
  'write_essay': {
    name: 'Write Essay',
    isSpeaking: false,
    isWriting: true,
    hasAudio: false,
    hasImage: false,
    hasPassage: false,
    timeLimit: 1200,
    wordLimit: 300,
    instructions: 'You will have 20 minutes to plan, write and revise an essay about the topic below. Your response will be judged on how well you develop a position, organize your ideas, present supporting details, and control the elements of standard written English.'
  }
};

interface PTEItem {
  id: string;
  title: string;
  prompt_text: string;
  passage_text?: string;
  image_url?: string;
  audio_url?: string;
  sample_answer?: string;
  time_limit: number;
  word_limit?: number;
  difficulty: string;
}

const PTESpeakingWritingTest = () => {
  const navigate = useNavigate();
  const { type } = useParams<{ type: string }>();
  const { user, profile } = useAuth();
  const themeStyles = useThemeStyles();
  const isNoteTheme = themeStyles.theme.name === 'note';
  const audioRef = useRef<HTMLAudioElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [items, setItems] = useState<PTEItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasListened, setHasListened] = useState(false);
  const [writtenResponse, setWrittenResponse] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState<any>(null);

  // Catie AI Assistant state
  const [showCatieAssistant, setShowCatieAssistant] = useState(false);
  const [showCatieVisible, setShowCatieVisible] = useState(false);
  const [catieMessages, setCatieMessages] = useState<ChatMessage[]>([{
    id: '1',
    type: 'bot',
    content: "Hello! I'm Catie, your PTE Speaking & Writing tutor. 🎯 I'm here to help you improve your responses. Ask me about structure, vocabulary, pronunciation tips, or any PTE strategy!",
    timestamp: new Date()
  }]);
  const [newCatieMessage, setNewCatieMessage] = useState('');
  const [isCatieLoading, setIsCatieLoading] = useState(false);

  const config = type ? TYPE_CONFIG[type] : null;
  const currentItem = items[currentIndex];
  const wordCount = writtenResponse.trim().split(/\s+/).filter(w => w).length;

  // Catie chat functions
  const closeCatieAssistant = () => {
    setShowCatieVisible(false);
    setTimeout(() => setShowCatieAssistant(false), 260);
  };

  const sendCatieMessage = async () => {
    if (!newCatieMessage.trim() || isCatieLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: newCatieMessage,
      timestamp: new Date()
    };

    setCatieMessages(prev => [...prev, userMessage]);
    setNewCatieMessage('');
    setIsCatieLoading(true);

    try {
      const systemPrompt = `You are Catie, a friendly and expert PTE Academic tutor specializing in Speaking and Writing tasks. 
The student is currently practicing: ${config?.name || 'PTE task'}
Task instructions: ${config?.instructions || ''}
${currentItem?.prompt_text ? `Current prompt: ${currentItem.prompt_text}` : ''}
${currentItem?.passage_text ? `Passage: ${currentItem.passage_text}` : ''}

Help the student with:
- Task-specific strategies
- Vocabulary and grammar tips
- Structure and organization
- Pronunciation guidance (for speaking)
- Time management advice

Be encouraging, specific, and practical. Keep responses concise but helpful.`;

      const { data, error } = await supabase.functions.invoke('gemini-chat', {
        body: {
          message: newCatieMessage,
          context: 'pte_tutor',
          systemPrompt
        }
      });

      if (error) throw error;

      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: data?.response || "I'm here to help! Could you please rephrase your question?",
        timestamp: new Date()
      };

      setCatieMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Catie error:', error);
      toast.error("Catie couldn't respond. Please try again.");
    } finally {
      setIsCatieLoading(false);
    }
  };

  useEffect(() => {
    if (type) {
      loadItems();
    }
  }, [type]);

  useEffect(() => {
    if (currentItem && config) {
      setTimeLeft(currentItem.time_limit || config.timeLimit);
      setWrittenResponse('');
      setAudioBlob(null);
      setShowFeedback(false);
      setFeedback(null);
      setHasListened(false);
    }
  }, [currentIndex, currentItem]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            if (isRecording) {
              stopRecording();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timeLeft, isRecording]);

  const loadItems = async () => {
    if (!type) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('pte_items')
        .select('*')
        .eq('pte_section_type', type)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        toast.error('No items available for this type');
        navigate('/pte-portal');
        return;
      }

      setItems(data);
    } catch (error) {
      console.error('Error loading items:', error);
      toast.error('Failed to load practice items');
    } finally {
      setIsLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setIsTimerRunning(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Failed to access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsTimerRunning(false);
    }
  };

  const playAudio = () => {
    if (audioRef.current && currentItem?.audio_url) {
      audioRef.current.src = currentItem.audio_url;
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const pauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setHasListened(true);
  };

  const startWriting = () => {
    setIsTimerRunning(true);
  };

  const submitResponse = async () => {
    if (!user || !currentItem) return;

    setIsSubmitting(true);
    try {
      let responseText = writtenResponse;
      let responseAudioUrl = null;
      let transcribedText = '';

      // If speaking task, upload audio and transcribe
      if (config?.isSpeaking && audioBlob) {
        const fileName = `pte-responses/${user.id}/${type}/${Date.now()}.webm`;
        const { data, error } = await supabase.storage
          .from('audio')
          .upload(fileName, audioBlob, { upsert: true });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from('audio')
          .getPublicUrl(fileName);

        responseAudioUrl = publicUrl;

        // Convert audio to base64 for AI processing
        const arrayBuffer = await audioBlob.arrayBuffer();
        const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

        // Call AI evaluator for speaking tasks
        toast.loading('AI is evaluating your response...');

        const { data: evalData, error: evalError } = await supabase.functions.invoke('pte-speaking-evaluator', {
          body: {
            taskType: type,
            transcribedText: transcribedText || '[Audio response - transcription pending]',
            audioBase64: base64Audio,
            originalText: currentItem.passage_text || currentItem.prompt_text,
            imageDescription: currentItem.image_url ? 'Image provided' : undefined,
            lectureContent: currentItem.audio_url ? 'Lecture audio provided' : undefined,
            situationContext: currentItem.passage_text,
            correctAnswer: currentItem.sample_answer
          }
        });

        toast.dismiss();

        if (evalError) {
          console.error('AI evaluation error:', evalError);
          // Fall back to sample answer
          setFeedback({ sampleAnswer: currentItem.sample_answer });
        } else if (evalData?.success) {
          setFeedback({
            aiEvaluation: evalData.evaluation,
            taskName: evalData.taskName,
            scoringCriteria: evalData.scoringCriteria,
            sampleAnswer: currentItem.sample_answer
          });
        }
      }

      // If writing task, call writing evaluator
      if (config?.isWriting && writtenResponse) {
        toast.loading('AI is evaluating your response...');

        const { data: evalData, error: evalError } = await supabase.functions.invoke('pte-writing-evaluator', {
          body: {
            taskType: type,
            writtenResponse: writtenResponse,
            originalPassage: currentItem.passage_text,
            essayPrompt: currentItem.prompt_text,
            spokenTextContent: currentItem.audio_url ? 'Audio content provided' : undefined
          }
        });

        toast.dismiss();

        if (evalError) {
          console.error('AI evaluation error:', evalError);
          setFeedback({ sampleAnswer: currentItem.sample_answer });
        } else if (evalData?.success) {
          setFeedback({
            aiEvaluation: evalData.evaluation,
            taskName: evalData.taskName,
            scoringCriteria: evalData.scoringCriteria,
            wordLimits: evalData.wordLimits,
            sampleAnswer: currentItem.sample_answer
          });
        }
      }

      // Save progress
      const { error: progressError } = await supabase
        .from('pte_user_progress')
        .insert({
          user_id: user.id,
          pte_skill: 'speaking_writing',
          pte_section_type: type,
          item_id: currentItem.id,
          completed: true,
          response_text: responseText || null,
          response_audio_url: responseAudioUrl,
          time_taken: (currentItem.time_limit || config?.timeLimit || 60) - timeLeft
        });

      if (progressError) throw progressError;

      setShowFeedback(true);
      toast.success('Response submitted!');
    } catch (error) {
      console.error('Error submitting response:', error);
      toast.error('Failed to submit response');
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextItem = () => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      toast.success('You have completed all items!');
      navigate('/pte-portal');
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
        <LoadingAnimation />
      </div>
    );
  }

  if (!config || !currentItem) {
    return (
      <StudentLayout title="PTE Practice" showBackButton>
        <div className="text-center py-12">
          <p className="text-muted-foreground">No items available</p>
          <Button onClick={() => navigate('/pte-portal')} className="mt-4">
            Back to PTE Portal
          </Button>
        </div>
      </StudentLayout>
    );
  }

  return (
    <div
      className={`min-h-screen relative ${isNoteTheme ? 'font-serif' : ''}`}
      style={isNoteTheme ? { backgroundColor: themeStyles.theme.colors.background } : {}}
    >
      {/* Background Texture for Note Theme - ENHANCED NOTEBOOK EFFECT */}
      {isNoteTheme && (
        <>
          <div
            className="absolute inset-0 pointer-events-none opacity-50 z-0"
            style={{
              backgroundColor: '#FEF9E7',
              backgroundImage: `url("https://www.transparenttextures.com/patterns/cream-paper.png")`,
              mixBlendMode: 'multiply'
            }}
          />
          <div
            className="absolute inset-0 pointer-events-none opacity-30 z-0"
            style={{
              backgroundImage: `url("https://www.transparenttextures.com/patterns/notebook.png")`,
              mixBlendMode: 'multiply',
              filter: 'contrast(1.2)'
            }}
          />
        </>
      )}

      <StudentLayout title={config.name} showBackButton transparentBackground={true}>
        <audio ref={audioRef} onEnded={handleAudioEnded} className="hidden" />

        <div className="max-w-4xl mx-auto space-y-6 pb-24">
          {/* Progress Header - Note Theme */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Badge
                variant="outline"
                className="font-medium"
                style={{
                  borderColor: '#A68B5B',
                  color: '#5D4E37',
                  backgroundColor: 'rgba(254, 249, 231, 0.8)'
                }}
              >
                {currentIndex + 1} / {items.length}
              </Badge>
              <Badge
                style={{
                  backgroundColor: '#E8D5A3',
                  color: '#5D4E37'
                }}
              >
                {currentItem.difficulty}
              </Badge>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ backgroundColor: 'rgba(254, 249, 231, 0.9)', border: '1px solid #E8D5A3' }}>
              <Clock className="w-4 h-4" style={{ color: '#8B6914' }} />
              <span
                className="font-mono text-lg font-semibold"
                style={{ color: timeLeft < 10 ? '#C97D60' : '#5D4E37' }}
              >
                {formatTime(timeLeft)}
              </span>
            </div>
          </div>

          <Progress
            value={(currentIndex / items.length) * 100}
            className="h-2"
            style={{ backgroundColor: '#E8D5A3' }}
          />

          {/* Instructions Card - Note Theme Style */}
          <Card
            className="rounded-2xl border-2"
            style={{
              background: 'linear-gradient(to bottom, #FFF8E7 0%, #FEF3D6 100%)',
              borderColor: '#E8D5A3',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.5)',
            }}
          >
            <CardContent className="pt-4">
              <p className="text-sm" style={{ color: '#8B6914' }}>
                📋 {config.instructions}
              </p>
            </CardContent>
          </Card>

          {/* Main Content Card - Note Theme Style */}
          <Card
            className="rounded-2xl shadow-lg border-2"
            style={{
              background: 'linear-gradient(to bottom, #FEF9E7 0%, #FDF6E3 100%)',
              borderColor: '#E8D5A3',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.5)',
            }}
          >
            <CardHeader>
              <CardTitle style={{ color: '#5D4E37' }}>{currentItem.title || config.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Prompt - Note Theme */}
              <div
                className="text-lg p-4 rounded-lg"
                style={{
                  backgroundColor: 'rgba(166, 139, 91, 0.1)',
                  border: '1px dashed #E8D5A3',
                  color: '#5D4E37'
                }}
              >
                ✏️ {currentItem.prompt_text}
              </div>

              {/* Passage (for Read Aloud, Summarize Written Text, etc.) - Note Theme */}
              {config.hasPassage && currentItem.passage_text && (
                <Card
                  className="border-2"
                  style={{
                    backgroundColor: 'rgba(254, 249, 231, 0.8)',
                    borderColor: '#E8D5A3',
                    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)'
                  }}
                >
                  <CardContent className="pt-4">
                    <h3 className="font-semibold mb-3" style={{ color: '#8B6914' }}>📖 Passage:</h3>
                    <p className="whitespace-pre-wrap leading-relaxed" style={{ color: '#5D4E37' }}>{currentItem.passage_text}</p>
                  </CardContent>
                </Card>
              )}

              {/* Image (for Describe Image, Retell Lecture) - Note Theme */}
              {config.hasImage && currentItem.image_url && (
                <div className="flex justify-center">
                  <img
                    src={currentItem.image_url}
                    alt="Practice image"
                    className="max-w-full max-h-96 rounded-lg border-2"
                    style={{ borderColor: '#E8D5A3', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                </div>
              )}

              {/* Audio Player (for Repeat Sentence, Retell Lecture, etc.) - Note Theme */}
              {config.hasAudio && currentItem.audio_url && (
                <Card
                  className="border-2"
                  style={{
                    backgroundColor: 'rgba(232, 213, 163, 0.3)',
                    borderColor: '#E8D5A3'
                  }}
                >
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-center gap-4">
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={isPlaying ? pauseAudio : playAudio}
                        disabled={hasListened && type === 'repeat_sentence'}
                        className="rounded-full"
                        style={{ borderColor: '#A68B5B', color: '#5D4E37' }}
                      >
                        {isPlaying ? (
                          <Pause className="w-6 h-6" />
                        ) : (
                          <Play className="w-6 h-6" />
                        )}
                      </Button>
                      <div className="text-sm" style={{ color: '#8B6914' }}>
                        🎧 {hasListened ? 'Audio played' : 'Click to listen'}
                        {type === 'repeat_sentence' && hasListened && ' (one time only)'}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Speaking Response - Note Theme */}
              {config.isSpeaking && !showFeedback && (
                <div className="space-y-4">
                  <div className="flex justify-center gap-4">
                    {!isRecording && !audioBlob && (
                      <Button
                        size="lg"
                        onClick={startRecording}
                        disabled={config.hasAudio && !hasListened}
                        style={{ backgroundColor: '#A68B5B', color: 'white' }}
                        className="hover:opacity-90"
                      >
                        <Mic className="w-5 h-5 mr-2" />
                        🎙️ Start Recording
                      </Button>
                    )}
                    {isRecording && (
                      <Button
                        size="lg"
                        onClick={stopRecording}
                        style={{ backgroundColor: '#C97D60', color: 'white' }}
                        className="hover:opacity-90"
                      >
                        <MicOff className="w-5 h-5 mr-2" />
                        Stop Recording
                      </Button>
                    )}
                    {audioBlob && !isRecording && (
                      <div className="flex items-center gap-3">
                        <Badge style={{ backgroundColor: 'rgba(232, 213, 163, 0.5)', color: '#5D4E37', border: '1px solid #E8D5A3' }}>
                          <CheckCircle className="w-4 h-4 mr-1" style={{ color: '#8B6914' }} />
                          Recording saved
                        </Badge>
                        <Button
                          variant="outline"
                          onClick={() => setAudioBlob(null)}
                          style={{ borderColor: '#E8D5A3', color: '#5D4E37' }}
                        >
                          Re-record
                        </Button>
                      </div>
                    )}
                  </div>
                  {isRecording && (
                    <div className="text-center">
                      <div className="w-4 h-4 rounded-full animate-pulse mx-auto" style={{ backgroundColor: '#C97D60' }} />
                      <p className="text-sm mt-2" style={{ color: '#8B6914' }}>Recording...</p>
                    </div>
                  )}
                </div>
              )}

              {/* Writing Response - Note Theme */}
              {config.isWriting && !showFeedback && (
                <div className="space-y-4">
                  {!isTimerRunning && !writtenResponse && (
                    <div className="text-center">
                      <Button
                        onClick={startWriting}
                        size="lg"
                        style={{ backgroundColor: '#A68B5B', color: 'white' }}
                        className="hover:opacity-90"
                      >
                        ✍️ Start Writing
                      </Button>
                    </div>
                  )}
                  {(isTimerRunning || writtenResponse) && (
                    <>
                      <Textarea
                        value={writtenResponse}
                        onChange={(e) => setWrittenResponse(e.target.value)}
                        placeholder="Type your response here..."
                        rows={10}
                        className="font-mono border-2"
                        style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.7)',
                          borderColor: '#E8D5A3',
                          color: '#5D4E37'
                        }}
                      />
                      <div className="flex items-center justify-between text-sm">
                        <span style={{ color: wordCount > (config.wordLimit || 300) ? '#C97D60' : '#8B6914' }}>
                          📝 Words: {wordCount} {config.wordLimit && `/ ${config.wordLimit}`}
                        </span>
                        {config.wordLimit && wordCount < 5 && (
                          <span style={{ color: '#C97D60' }}>
                            <AlertCircle className="w-4 h-4 inline mr-1" />
                            Minimum 5 words required
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Submit Button - Note Theme */}
              {!showFeedback && (
                <div className="flex justify-end">
                  <Button
                    onClick={submitResponse}
                    disabled={
                      isSubmitting ||
                      (config.isSpeaking && !audioBlob) ||
                      (config.isWriting && wordCount < 5)
                    }
                    style={{ backgroundColor: '#A68B5B', color: 'white' }}
                    className="hover:opacity-90"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {isSubmitting ? 'Submitting...' : 'Submit Response'}
                  </Button>
                </div>
              )}

              {/* Feedback - Note Theme */}
              {showFeedback && (
                <div className="space-y-4">
                  {/* AI Evaluation Results */}
                  {feedback?.aiEvaluation && (
                    <Card className="border-2" style={{ borderColor: '#E8D5A3' }}>
                      <CardHeader style={{ background: 'linear-gradient(to right, #FEF9E7, #FFF8E7)' }}>
                        <CardTitle className="flex items-center justify-between" style={{ color: '#5D4E37' }}>
                          <span className="flex items-center gap-2">
                            ✨ AI Evaluation - {feedback.taskName}
                          </span>
                          <Badge className="text-lg" style={{ backgroundColor: '#A68B5B', color: 'white' }}>
                            {feedback.aiEvaluation.totalScore}/{feedback.aiEvaluation.totalMax}
                            <span className="ml-2 text-xs">({feedback.aiEvaluation.percentage}%)</span>
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4 space-y-4" style={{ backgroundColor: '#FEF9E7' }}>
                        {/* Score Breakdown */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {Object.entries(feedback.aiEvaluation.scores || {}).map(([key, score]) => (
                            <div key={key} className="p-3 rounded-lg border" style={{ backgroundColor: 'rgba(255, 255, 255, 0.6)', borderColor: '#E8D5A3' }}>
                              <div className="text-xs capitalize" style={{ color: '#8B6914' }}>
                                {key.replace(/_/g, ' ')}
                              </div>
                              <div className="text-lg font-bold" style={{ color: '#A68B5B' }}>
                                {score as number}/{feedback.scoringCriteria?.[key] || 5}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Estimated PTE Score */}
                        <div className="flex items-center gap-4 p-3 rounded-lg" style={{ backgroundColor: 'rgba(232, 213, 163, 0.4)', border: '1px solid #E8D5A3' }}>
                          <div>
                            <div className="text-xs" style={{ color: '#8B6914' }}>Estimated PTE Score</div>
                            <div className="text-2xl font-bold" style={{ color: '#5D4E37' }}>{feedback.aiEvaluation.pteScore}</div>
                          </div>
                          <div className="text-sm" style={{ color: '#8B6914' }}>
                            (Scale: 10-90)
                          </div>
                        </div>

                        {/* Overall Feedback */}
                        <div className="space-y-2">
                          <h4 className="font-medium" style={{ color: '#8B6914' }}>📝 Overall Feedback</h4>
                          <p className="text-sm" style={{ color: '#5D4E37' }}>
                            {feedback.aiEvaluation.overallFeedback}
                          </p>
                        </div>

                        {/* Strengths */}
                        {feedback.aiEvaluation.strengths?.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="font-medium flex items-center gap-2" style={{ color: '#8B6914' }}>
                              <CheckCircle className="w-4 h-4" style={{ color: '#A68B5B' }} /> ✅ Strengths
                            </h4>
                            <ul className="list-disc list-inside text-sm space-y-1" style={{ color: '#5D4E37' }}>
                              {feedback.aiEvaluation.strengths.map((s: string, i: number) => (
                                <li key={i}>{s}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Areas for Improvement */}
                        {feedback.aiEvaluation.improvements?.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="font-medium flex items-center gap-2" style={{ color: '#C97D60' }}>
                              <AlertCircle className="w-4 h-4" /> 📈 Areas for Improvement
                            </h4>
                            <ul className="list-disc list-inside text-sm space-y-1" style={{ color: '#5D4E37' }}>
                              {feedback.aiEvaluation.improvements.map((i: string, idx: number) => (
                                <li key={idx}>{i}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Detailed Feedback by Criterion */}
                        {feedback.aiEvaluation.feedback && (
                          <div className="space-y-2">
                            <h4 className="font-medium" style={{ color: '#8B6914' }}>📋 Detailed Feedback</h4>
                            <div className="space-y-2 text-sm">
                              {Object.entries(feedback.aiEvaluation.feedback).map(([key, fb]) => (
                                <div key={key} className="p-2 rounded border" style={{ backgroundColor: 'rgba(255, 255, 255, 0.5)', borderColor: '#E8D5A3' }}>
                                  <span className="font-medium capitalize" style={{ color: '#8B6914' }}>{key.replace(/_/g, ' ')}:</span>{' '}
                                  <span style={{ color: '#5D4E37' }}>{fb as string}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Grammar/Spelling Errors (for writing) */}
                        {feedback.aiEvaluation.grammarErrors?.length > 0 && (
                          <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(201, 125, 96, 0.15)', border: '1px solid #C97D60' }}>
                            <h4 className="font-medium text-sm" style={{ color: '#C97D60' }}>⚠️ Grammar Issues:</h4>
                            <ul className="list-disc list-inside text-xs" style={{ color: '#5D4E37' }}>
                              {feedback.aiEvaluation.grammarErrors.map((e: string, i: number) => (
                                <li key={i}>{e}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Sample Answer - Note Theme */}
                  {feedback?.sampleAnswer && (
                    <Card className="border-2" style={{ backgroundColor: 'rgba(232, 213, 163, 0.3)', borderColor: '#E8D5A3' }}>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base" style={{ color: '#8B6914' }}>
                          <CheckCircle className="w-5 h-5" style={{ color: '#A68B5B' }} />
                          💡 Sample Answer
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="whitespace-pre-wrap text-sm" style={{ color: '#5D4E37' }}>
                          {feedback.sampleAnswer}
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  <div className="flex justify-end">
                    <Button
                      onClick={nextItem}
                      style={{ backgroundColor: '#A68B5B', color: 'white' }}
                      className="hover:opacity-90"
                    >
                      {currentIndex < items.length - 1 ? (
                        <>
                          <SkipForward className="w-4 h-4 mr-2" />
                          Next Item
                        </>
                      ) : (
                        '🎉 Complete'
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Catie AI Assistant - Floating Bottom Right - Note Theme */}
        <div className="fixed bottom-6 right-3 sm:bottom-6 sm:right-6 z-50">
          {/* Chat card */}
          {showCatieAssistant && (
            <Card
              className={`rounded-3xl w-[280px] h-[400px] sm:w-96 sm:h-[500px] shadow-2xl flex flex-col transform-gpu origin-bottom-right transition-all duration-260 ease-in-out border-2 ${showCatieVisible
                ? 'opacity-100 scale-100 translate-y-0'
                : 'opacity-0 scale-75 translate-y-8'
                }`}
              style={{
                background: 'linear-gradient(to bottom, #FEF9E7 0%, #FDF6E3 100%)',
                borderColor: '#E8D5A3',
                boxShadow: '0 8px 32px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.5)',
              }}
            >
              <CardHeader className="pb-1 sm:pb-2 rounded-t-3xl relative">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden border-2" style={{ borderColor: '#E8D5A3' }}>
                    <img src="/1000031289.png" alt="Catie" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <CardTitle className="text-base" style={{ color: '#5D4E37' }}>
                      Ask Catie
                    </CardTitle>
                    <p className="text-xs" style={{ color: '#8B6914' }}>
                      Your PTE tutor
                    </p>
                  </div>
                </div>
                <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={closeCatieAssistant}
                    className="h-7 w-7 sm:h-8 sm:w-8 p-0 hover:bg-amber-100"
                    style={{ color: '#5D4E37' }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col px-2.5 py-2 sm:p-4 overflow-hidden">
                <Conversation className="flex-1 min-h-0">
                  <ConversationContent className="flex-1 min-h-0">
                    {catieMessages.length === 0 && !isCatieLoading ? (
                      <ConversationEmptyState
                        icon={<Orb className="size-9 sm:size-12" style={{ color: '#8B6914' }} />}
                        title="Ask Catie anything"
                        description="Get help with your PTE practice"
                      />
                    ) : (
                      <>
                        {/* Current task context */}
                        <div
                          className="rounded-lg p-2 mb-3 text-xs"
                          style={{
                            backgroundColor: 'rgba(232, 213, 163, 0.4)',
                            borderColor: '#E8D5A3',
                            borderWidth: '1px',
                            borderStyle: 'solid',
                            color: '#8B6914'
                          }}
                        >
                          📝 {config?.name || 'PTE Practice'}
                        </div>

                        {catieMessages.map((message) => (
                          <Message key={message.id} from={message.type === 'user' ? 'user' : 'assistant'}>
                            {message.type === 'bot' && (
                              <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border" style={{ borderColor: '#E8D5A3' }}>
                                <img src="/1000031289.png" alt="Catie" className="w-full h-full object-cover" />
                              </div>
                            )}
                            <MessageContent>
                              <div
                                className="px-3 py-2 rounded-xl text-sm"
                                style={{
                                  backgroundColor: message.type === 'user' ? 'rgba(166, 139, 91, 0.15)' : 'rgba(255, 255, 255, 0.6)',
                                  borderColor: '#E8D5A3',
                                  borderWidth: '1px',
                                  borderStyle: 'solid',
                                  color: '#5D4E37'
                                }}
                              >
                                <Response
                                  dangerouslySetInnerHTML={{
                                    __html: message.content
                                      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                      .replace(/\*(.*?)\*/g, '<em>$1</em>')
                                      .replace(/^• (.*)$/gm, '<li>$1</li>')
                                      .replace(/\n/g, '<br>'),
                                  }}
                                />
                              </div>
                            </MessageContent>
                            {message.type === 'user' && profile?.avatar_url && (
                              <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border" style={{ borderColor: '#E8D5A3' }}>
                                <img src={profile.avatar_url} alt="You" className="w-full h-full object-cover" />
                              </div>
                            )}
                          </Message>
                        ))}
                        {isCatieLoading && (
                          <Message from="assistant">
                            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border" style={{ borderColor: '#E8D5A3' }}>
                              <img src="/1000031289.png" alt="Catie" className="w-full h-full object-cover" />
                            </div>
                            <MessageContent>
                              <div
                                className="px-3 py-2 rounded-xl text-sm"
                                style={{
                                  backgroundColor: 'rgba(255, 255, 255, 0.6)',
                                  borderColor: '#E8D5A3',
                                  borderWidth: '1px',
                                  borderStyle: 'solid'
                                }}
                              >
                                <ShimmeringText text="Thinking..." />
                              </div>
                            </MessageContent>
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
                      value={newCatieMessage}
                      onChange={(e) => setNewCatieMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && !isCatieLoading && newCatieMessage.trim() && sendCatieMessage()}
                      placeholder="Ask Catie for PTE help..."
                      className="flex-1 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg text-sm focus:outline-none focus:ring-2"
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.7)',
                        borderColor: '#E8D5A3',
                        borderWidth: '1px',
                        borderStyle: 'solid',
                        color: '#5D4E37'
                      }}
                      disabled={isCatieLoading}
                    />
                    <Button
                      onClick={sendCatieMessage}
                      disabled={isCatieLoading || !newCatieMessage.trim()}
                      size="icon"
                      className="h-9 w-9"
                      style={{
                        backgroundColor: '#A68B5B',
                        color: 'white',
                      }}
                    >
                      {isCatieLoading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Catie Dock Icon - Show when chat is closed */}
          {!showCatieAssistant && (
            <div
              className="cursor-pointer transition-all duration-200 hover:scale-110"
              style={{
                borderRadius: '50%',
                overflow: 'hidden',
                width: '64px',
                height: '64px',
                boxShadow: '0 8px 20px rgba(166, 139, 91, 0.4)',
                border: '3px solid #E8D5A3',
              }}
              onClick={() => {
                setShowCatieAssistant(true);
                requestAnimationFrame(() => setShowCatieVisible(true));
              }}
            >
              <img
                src="/1000031289.png"
                alt="Ask Catie"
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>

        {/* Exit Button - Fixed Bottom Left - Note Theme */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/pte-portal')}
          className="fixed bottom-6 left-6 z-50 rounded-xl"
          style={{
            backgroundColor: '#FEF9E7',
            borderColor: '#E8D5A3',
            color: '#5D4E37'
          }}
        >
          Exit
        </Button>
      </StudentLayout>
    </div>
  );
};

export default PTESpeakingWritingTest;

