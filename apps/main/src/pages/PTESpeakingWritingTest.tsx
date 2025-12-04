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
  Image as ImageIcon
} from 'lucide-react';
import StudentLayout from '@/components/StudentLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import LoadingAnimation from '@/components/animations/LoadingAnimation';

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
  const { user } = useAuth();
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

  const config = type ? TYPE_CONFIG[type] : null;
  const currentItem = items[currentIndex];
  const wordCount = writtenResponse.trim().split(/\s+/).filter(w => w).length;

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

      // If speaking task, upload audio
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

      // Show sample answer as feedback
      if (currentItem.sample_answer) {
        setFeedback({
          sampleAnswer: currentItem.sample_answer
        });
      }
      
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
    <StudentLayout title={config.name} showBackButton>
      <audio ref={audioRef} onEnded={handleAudioEnded} className="hidden" />
      
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Progress Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="text-violet-600 border-violet-600">
              {currentIndex + 1} / {items.length}
            </Badge>
            <Badge variant="secondary">{currentItem.difficulty}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className={`font-mono text-lg ${timeLeft < 10 ? 'text-red-500' : ''}`}>
              {formatTime(timeLeft)}
            </span>
          </div>
        </div>

        <Progress value={(currentIndex / items.length) * 100} className="h-2" />

        {/* Instructions */}
        <Card className="bg-violet-50 dark:bg-violet-950/20 border-violet-200">
          <CardContent className="pt-4">
            <p className="text-sm text-violet-700 dark:text-violet-300">
              {config.instructions}
            </p>
          </CardContent>
        </Card>

        {/* Main Content */}
        <Card>
          <CardHeader>
            <CardTitle>{currentItem.title || config.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Prompt */}
            <div className="text-lg">{currentItem.prompt_text}</div>

            {/* Passage (for Read Aloud, Summarize Written Text, etc.) */}
            {config.hasPassage && currentItem.passage_text && (
              <Card className="bg-gray-50 dark:bg-gray-900">
                <CardContent className="pt-4">
                  <p className="whitespace-pre-wrap">{currentItem.passage_text}</p>
                </CardContent>
              </Card>
            )}

            {/* Image (for Describe Image, Retell Lecture) */}
            {config.hasImage && currentItem.image_url && (
              <div className="flex justify-center">
                <img 
                  src={currentItem.image_url} 
                  alt="Practice image" 
                  className="max-w-full max-h-96 rounded-lg shadow-lg"
                />
              </div>
            )}

            {/* Audio Player (for Repeat Sentence, Retell Lecture, etc.) */}
            {config.hasAudio && currentItem.audio_url && (
              <Card className="bg-blue-50 dark:bg-blue-950/20">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-center gap-4">
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={isPlaying ? pauseAudio : playAudio}
                      disabled={hasListened && type === 'repeat_sentence'}
                    >
                      {isPlaying ? (
                        <Pause className="w-6 h-6" />
                      ) : (
                        <Play className="w-6 h-6" />
                      )}
                    </Button>
                    <div className="text-sm text-muted-foreground">
                      {hasListened ? 'Audio played' : 'Click to listen'}
                      {type === 'repeat_sentence' && hasListened && ' (one time only)'}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Speaking Response */}
            {config.isSpeaking && !showFeedback && (
              <div className="space-y-4">
                <div className="flex justify-center gap-4">
                  {!isRecording && !audioBlob && (
                    <Button 
                      size="lg"
                      onClick={startRecording}
                      className="bg-red-600 hover:bg-red-700"
                      disabled={config.hasAudio && !hasListened}
                    >
                      <Mic className="w-5 h-5 mr-2" />
                      Start Recording
                    </Button>
                  )}
                  {isRecording && (
                    <Button 
                      size="lg"
                      onClick={stopRecording}
                      variant="destructive"
                    >
                      <MicOff className="w-5 h-5 mr-2" />
                      Stop Recording
                    </Button>
                  )}
                  {audioBlob && !isRecording && (
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="bg-green-100 text-green-700">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Recording saved
                      </Badge>
                      <Button variant="outline" onClick={() => setAudioBlob(null)}>
                        Re-record
                      </Button>
                    </div>
                  )}
                </div>
                {isRecording && (
                  <div className="text-center">
                    <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse mx-auto" />
                    <p className="text-sm text-muted-foreground mt-2">Recording...</p>
                  </div>
                )}
              </div>
            )}

            {/* Writing Response */}
            {config.isWriting && !showFeedback && (
              <div className="space-y-4">
                {!isTimerRunning && !writtenResponse && (
                  <div className="text-center">
                    <Button onClick={startWriting} size="lg">
                      Start Writing
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
                      className="font-mono"
                    />
                    <div className="flex items-center justify-between text-sm">
                      <span className={wordCount > (config.wordLimit || 300) ? 'text-red-500' : 'text-muted-foreground'}>
                        Words: {wordCount} {config.wordLimit && `/ ${config.wordLimit}`}
                      </span>
                      {config.wordLimit && wordCount < 5 && (
                        <span className="text-yellow-500">
                          <AlertCircle className="w-4 h-4 inline mr-1" />
                          Minimum 5 words required
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Submit Button */}
            {!showFeedback && (
              <div className="flex justify-end">
                <Button 
                  onClick={submitResponse}
                  disabled={
                    isSubmitting || 
                    (config.isSpeaking && !audioBlob) ||
                    (config.isWriting && wordCount < 5)
                  }
                  className="bg-violet-600 hover:bg-violet-700"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {isSubmitting ? 'Submitting...' : 'Submit Response'}
                </Button>
              </div>
            )}

            {/* Feedback */}
            {showFeedback && (
              <div className="space-y-4">
                <Card className="bg-green-50 dark:bg-green-950/20 border-green-200">
                  <CardHeader>
                    <CardTitle className="text-green-700 dark:text-green-400 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      Response Submitted
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {feedback?.sampleAnswer && (
                      <div className="space-y-2">
                        <p className="font-medium">Sample Answer:</p>
                        <p className="text-muted-foreground whitespace-pre-wrap">
                          {feedback.sampleAnswer}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="flex justify-end">
                  <Button onClick={nextItem} className="bg-violet-600 hover:bg-violet-700">
                    {currentIndex < items.length - 1 ? (
                      <>
                        <SkipForward className="w-4 h-4 mr-2" />
                        Next Item
                      </>
                    ) : (
                      'Complete'
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </StudentLayout>
  );
};

export default PTESpeakingWritingTest;

