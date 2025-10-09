import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface TTSTestButtonProps {
  text?: string;
  className?: string;
}

export const TTSTestButton: React.FC<TTSTestButtonProps> = ({ 
  text = "Hello, this is a test of the text-to-speech system.", 
  className = "" 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const testTTS = async () => {
    setIsLoading(true);
    setLastError(null);

    try {
      console.log('🎵 Testing TTS with text:', text);
      
      const { data, error } = await supabase.functions.invoke('audio-cache', {
        body: {
          text,
          voice_id: 'JBFqnCBsd6RMkjVDRZzb', // ElevenLabs Sarah (Rachel) voice
          question_id: `test-${Date.now()}`
        }
      });

      console.log('TTS Response:', data);

      if (error) {
        console.error('TTS Error:', error);
        setLastError(`Function error: ${error.message}`);
        return;
      }

      if (!data?.success) {
        console.error('TTS Failed:', data);
        setLastError(data?.error || 'Unknown error');
        
        // Show debug info if available
        if (data?.debug) {
          console.log('Debug info:', data.debug);
          if (data.debug.missingVars?.length > 0) {
            setLastError(`Missing environment variables: ${data.debug.missingVars.join(', ')}`);
          }
        }
        return;
      }

      if (data?.audio_url) {
        console.log('✅ TTS Success! Playing audio:', data.audio_url);
        
        const audio = new Audio(data.audio_url);
        audio.addEventListener('error', (e) => {
          console.error('Audio playback error:', e);
          setLastError('Audio playback failed - check console for details');
        });
        
        await audio.play();
        console.log('🎵 Audio playing successfully');
      } else {
        setLastError('No audio URL returned');
      }

    } catch (err: any) {
      console.error('TTS Test Error:', err);
      setLastError(err.message || 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <Button
        onClick={testTTS}
        disabled={isLoading}
        variant="outline"
        size="sm"
        className="w-full"
      >
        {isLoading ? 'Testing TTS...' : '🔊 Test TTS'}
      </Button>
      
      {lastError && (
        <div className="text-xs text-red-600 bg-red-50 p-2 rounded border">
          <strong>Error:</strong> {lastError}
        </div>
      )}
      
      <div className="text-xs text-slate-500">
        This will test your TTS setup and show any configuration issues.
      </div>
    </div>
  );
};

export default TTSTestButton;
