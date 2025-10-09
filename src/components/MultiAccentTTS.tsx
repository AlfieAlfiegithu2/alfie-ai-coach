import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface MultiAccentTTSProps {
  text: string;
  onPlay?: () => void;
  onStop?: () => void;
  className?: string;
}

const ACCENTS = ['US', 'UK', 'AUS', 'IND'];
const ACCENT_FLAGS = {
  'US': '🇺🇸',
  'UK': '🇬🇧', 
  'AUS': '🇦🇺',
  'IND': '🇮🇳'
};

export const MultiAccentTTS: React.FC<MultiAccentTTSProps> = ({ 
  text, 
  onPlay, 
  onStop,
  className = ""
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAccentIndex, setCurrentAccentIndex] = useState(0);

  const handleClick = async () => {
    if (isPlaying) {
      // Stop current audio
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      onStop?.();
      return;
    }

    // Get current accent and rotate for next click
    const currentAccent = ACCENTS[currentAccentIndex];
    setCurrentAccentIndex((prev) => (prev + 1) % ACCENTS.length);

    setIsPlaying(true);
    onPlay?.();

    try {
      console.log(`🎵 Playing ${currentAccent} accent for:`, text);
      
      const { data, error } = await supabase.functions.invoke('audio-cache', {
        body: {
          text,
          accent: currentAccent,
          question_id: `accent-${currentAccent}-${text}-${Date.now()}`
        }
      });

      if (error) {
        console.error('TTS Error:', error);
        alert(`TTS failed: ${error.message}`);
        setIsPlaying(false);
        onStop?.();
        return;
      }

      if (!data?.success) {
        console.error('TTS Failed:', data);
        alert(data?.error || 'TTS generation failed');
        setIsPlaying(false);
        onStop?.();
        return;
      }

      if (data?.audio_url) {
        console.log('✅ TTS Success! Playing audio:', data.audio_url);
        
        const audio = new Audio(data.audio_url);
        audio.addEventListener('error', (e) => {
          console.error('Audio playback error:', e);
          alert('Audio playback failed');
          setIsPlaying(false);
          onStop?.();
        });

        audio.addEventListener('ended', () => {
          setIsPlaying(false);
          onStop?.();
        });

        await audio.play();
        console.log('🎵 Audio playing successfully');
      } else {
        alert('No audio URL returned');
        setIsPlaying(false);
        onStop?.();
      }

    } catch (err: any) {
      console.error('TTS Error:', err);
      alert(`TTS failed: ${err.message}`);
      setIsPlaying(false);
      onStop?.();
    }
  };

  // Simple rotating accent button
  return (
    <button
      onClick={handleClick}
      className={`inline-flex items-center justify-center w-6 h-6 rounded-full hover:bg-slate-100 transition-colors ${className}`}
      title={`Click to hear ${ACCENTS[currentAccentIndex]} accent (rotates through ${ACCENTS.join(', ')})`}
    >
      {isPlaying ? (
        <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1zm4 0a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      ) : (
        <span className="text-xs">
          {ACCENT_FLAGS[ACCENTS[currentAccentIndex] as keyof typeof ACCENT_FLAGS]}
        </span>
      )}
    </button>
  );
};

export default MultiAccentTTS;
