import { useState } from 'react';
import { Play, Pause, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ElevenLabsVoiceOptimizedProps {
  text: string;
  voiceId?: string;
  questionId?: string;
  className?: string;
}

export const ElevenLabsVoiceOptimized = ({ 
  text, 
  voiceId = "9BWtsMINqrJLrRacOk9x", // Aria voice
  questionId,
  className = ""
}: ElevenLabsVoiceOptimizedProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  const generateOrGetAudio = async () => {
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('audio-cache', {
        body: {
          text,
          voice_id: voiceId,
          question_id: questionId
        }
      });

      if (error) throw error;

      if (data?.audio_url) {
        const newAudio = new Audio(data.audio_url);
        
        newAudio.addEventListener('ended', () => {
          setIsPlaying(false);
        });
        
        newAudio.addEventListener('error', () => {
          toast({
            title: "Audio Error",
            description: "Failed to play audio. Please try again.",
            variant: "destructive"
          });
          setIsPlaying(false);
        });
        
        setAudio(newAudio);
        newAudio.play();
        setIsPlaying(true);

        if (data.cached) {
          console.log('✅ Using cached audio');
        } else {
          console.log('🎵 Generated new audio');
        }
      }
    } catch (error) {
      console.error('Error generating audio:', error);
      toast({
        title: "Audio Generation Failed",
        description: "Could not generate audio. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const togglePlayback = () => {
    if (isPlaying && audio) {
      audio.pause();
      setIsPlaying(false);
    } else if (audio) {
      audio.play();
      setIsPlaying(true);
    } else {
      generateOrGetAudio();
    }
  };

  return (
    <Button
      onClick={togglePlayback}
      disabled={isLoading}
      variant="outline"
      size="sm"
      className={className}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : isPlaying ? (
        <Pause className="w-4 h-4" />
      ) : (
        <Play className="w-4 h-4" />
      )}
      {isLoading ? 'Loading...' : isPlaying ? 'Pause' : 'Play Audio'}
    </Button>
  );
};