import { useState } from 'react';
import { Play, Pause } from 'lucide-react';
import LottieLoadingAnimation from '@/components/animations/LottieLoadingAnimation';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface OpenAIVoiceProps {
  text: string;
  voiceId?: string;
  className?: string;
}

export const ElevenLabsVoice = ({ 
  text, 
  voiceId = "9BWtsMINqrJLrRacOk9x", // Will be mapped to OpenAI voice
  className = ""
}: OpenAIVoiceProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  const generateSpeech = async () => {
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('audio-cache', {
        body: {
          text,
          voice_id: voiceId
        }
      });

      if (error) throw error;

      if (data?.audioContent) {
        const newAudio = new Audio(data.audioContent);
        
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
      }
    } catch (error) {
      console.error('Error generating speech:', error);
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
      generateSpeech();
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
        <LottieLoadingAnimation size="sm" message="" />
      ) : isPlaying ? (
        <Pause className="w-4 h-4" />
      ) : (
        <Play className="w-4 h-4" />
      )}
      {isLoading ? 'Generating...' : isPlaying ? 'Pause' : 'Play Audio'}
    </Button>
  );
};