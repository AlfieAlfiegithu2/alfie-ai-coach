import React, { useState } from 'react';
import { Button } from '@/components/ui/button';

interface FallbackTTSProps {
  text: string;
  onPlay?: () => void;
  onStop?: () => void;
  className?: string;
}

export const FallbackTTS: React.FC<FallbackTTSProps> = ({ 
  text, 
  onPlay, 
  onStop,
  className = "" 
}) => {
  const [isPlaying, setIsPlaying] = useState(false);

  const playFallbackTTS = () => {
    if (isPlaying) {
      // Stop current speech
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      onStop?.();
      return;
    }

    // Check if browser supports speech synthesis
    if (!('speechSynthesis' in window)) {
      alert('Your browser does not support text-to-speech. Please use Chrome, Safari, or Edge.');
      return;
    }

    // Stop any existing speech
    window.speechSynthesis.cancel();

    // Create speech synthesis utterance
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.8; // Slightly slower for better comprehension
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Try to use a good voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferredVoices = ['Google US English', 'Microsoft Zira Desktop', 'Alex', 'Samantha'];
    
    for (const preferredVoice of preferredVoices) {
      const voice = voices.find(v => v.name.includes(preferredVoice));
      if (voice) {
        utterance.voice = voice;
        break;
      }
    }

    utterance.onstart = () => {
      setIsPlaying(true);
      onPlay?.();
    };

    utterance.onend = () => {
      setIsPlaying(false);
      onStop?.();
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      setIsPlaying(false);
      onStop?.();
      alert('Text-to-speech failed. Please try again.');
    };

    // Start speaking
    window.speechSynthesis.speak(utterance);
  };

  return (
    <button
      onClick={playFallbackTTS}
      className={`inline-flex items-center justify-center w-6 h-6 rounded-full hover:bg-slate-100 transition-colors ${className}`}
      title={isPlaying ? "Stop pronunciation" : "Play pronunciation"}
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
  );
};

export default FallbackTTS;
