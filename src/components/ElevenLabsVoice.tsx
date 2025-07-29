import { useState } from 'react';
import { Play, Pause, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ElevenLabsVoiceProps {
  text: string;
  voiceId?: string;
  model?: string;
  className?: string;
}

export const ElevenLabsVoice = ({ 
  text, 
  voiceId = "9BWtsMINqrJLrRacOk9x", // Aria voice
  model = "eleven_turbo_v2_5",
  className = ""
}: ElevenLabsVoiceProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  const generateSpeech = async () => {
    const apiKey = prompt("Please enter your ElevenLabs API key:");
    
    if (!apiKey) {
      alert("ElevenLabs API key is required for voice generation");
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey
        },
        body: JSON.stringify({
          text,
          model_id: model,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate speech');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const newAudio = new Audio(audioUrl);
      
      newAudio.addEventListener('ended', () => {
        setIsPlaying(false);
      });
      
      setAudio(newAudio);
      newAudio.play();
      setIsPlaying(true);
    } catch (error) {
      console.error('Error generating speech:', error);
      alert('Failed to generate speech. Please check your API key and try again.');
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
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : isPlaying ? (
        <Pause className="w-4 h-4" />
      ) : (
        <Play className="w-4 h-4" />
      )}
      {isLoading ? 'Generating...' : isPlaying ? 'Pause' : 'Play Audio'}
    </Button>
  );
};