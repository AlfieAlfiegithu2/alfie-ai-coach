import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface MultiAccentTTSProps {
  text: string;
  onPlay?: () => void;
  onStop?: () => void;
  className?: string;
  showAccentButtons?: boolean;
}

const ACCENTS = [
  { code: 'US', name: '🇺🇸 US', flag: '🇺🇸' },
  { code: 'UK', name: '🇬🇧 UK', flag: '🇬🇧' },
  { code: 'AUS', name: '🇦🇺 AUS', flag: '🇦🇺' },
  { code: 'IND', name: '🇮🇳 IND', flag: '🇮🇳' }
];

export const MultiAccentTTS: React.FC<MultiAccentTTSProps> = ({ 
  text, 
  onPlay, 
  onStop,
  className = "",
  showAccentButtons = true
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedAccent, setSelectedAccent] = useState<string>('US');

  const playTTS = async (accent: string) => {
    if (isPlaying) {
      // Stop current audio
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      onStop?.();
      return;
    }

    setIsPlaying(true);
    onPlay?.();

    try {
      console.log(`🎵 Playing ${accent} accent for:`, text);
      
      const { data, error } = await supabase.functions.invoke('audio-cache', {
        body: {
          text,
          accent: accent,
          question_id: `accent-${accent}-${text}-${Date.now()}`
        }
      });

      console.log('TTS Response:', data);

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

  if (!showAccentButtons) {
    // Single button mode - play with selected accent
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <select 
          value={selectedAccent} 
          onChange={(e) => setSelectedAccent(e.target.value)}
          className="text-xs px-2 py-1 rounded border"
        >
          {ACCENTS.map(accent => (
            <option key={accent.code} value={accent.code}>
              {accent.flag} {accent.code}
            </option>
          ))}
        </select>
        <button
          onClick={() => playTTS(selectedAccent)}
          className="inline-flex items-center justify-center w-6 h-6 rounded-full hover:bg-slate-100 transition-colors"
          title={`Play ${selectedAccent} accent`}
        >
          {isPlaying ? (
            <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1zm4 0a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-slate-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.793L4.383 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.383l4-3.793a1 1 0 011-.131zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
            </svg>
          )}
        </button>
      </div>
    );
  }

  // Multiple buttons mode - show all accents
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {ACCENTS.map(accent => (
        <button
          key={accent.code}
          onClick={() => playTTS(accent.code)}
          className="inline-flex items-center justify-center w-8 h-6 rounded text-xs hover:bg-slate-100 transition-colors"
          title={`Play ${accent.name} accent`}
        >
          {accent.flag}
        </button>
      ))}
    </div>
  );
};

export default MultiAccentTTS;
