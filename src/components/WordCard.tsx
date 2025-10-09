import { memo, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SavedWord {
  id: string;
  word: string;
  translations: string[];
  context: string;
  savedAt: string;
  languageCode: string;
}

interface WordCardProps {
  word: SavedWord;
  onRemove: (wordId: string) => void;
  isEditMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (wordId: string) => void;
}

const WordCard = memo(({ word, onRemove, isEditMode = false, isSelected = false, onToggleSelect }: WordCardProps) => {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [currentAccentIndex, setCurrentAccentIndex] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const ACCENTS = ['US', 'UK', 'AUS', 'IND'];

  const handleCardClick = (e: React.MouseEvent) => {
    if (isEditMode) {
      e.preventDefault();
      onToggleSelect?.(word.id);
      return;
    }
    // Play pronunciation when clicking the word
    playPronunciation();
  };

  const playPronunciation = async () => {
    if (isPlayingAudio) {
      // Stop current audio
      window.speechSynthesis.cancel();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setIsPlayingAudio(false);
      return;
    }

    const currentAccent = ACCENTS[currentAccentIndex];
    setCurrentAccentIndex((prev) => (prev + 1) % ACCENTS.length);
    
    setIsPlayingAudio(true);

    // Try ElevenLabs first for high-quality audio
    try {
      console.log(`🎵 Playing ${currentAccent} accent for:`, word.word);
      
      const { data, error } = await supabase.functions.invoke('audio-cache', {
        body: {
          text: word.word,
          accent: currentAccent,
          question_id: `word-${word.word}-${currentAccent}-${Date.now()}`
        }
      });

      if (error) throw error;

      if (data?.success && data?.audio_url) {
        console.log('✅ ElevenLabs Success! Playing high-quality audio:', data.audio_url);
        
        const audio = new Audio(data.audio_url);
        audioRef.current = audio;
        audio.addEventListener('error', (e) => {
          console.error('Audio playback error:', e);
          fallbackToBrowserTTS();
        });

        audio.addEventListener('ended', () => {
          setIsPlayingAudio(false);
        });

        await audio.play();
        console.log('🎵 High-quality audio playing successfully');
        return; // Success, don't use fallback
      }
    } catch (error: any) {
      console.log('ElevenLabs failed, using browser TTS fallback:', error.message);
    }

    // Fallback to browser TTS if ElevenLabs fails
    fallbackToBrowserTTS();
  };

  const fallbackToBrowserTTS = () => {
    console.log('🔄 Using browser TTS fallback');
    
    // Use browser TTS as fallback
    const utterance = new SpeechSynthesisUtterance(word.word);
    utterance.rate = 0.8;
    utterance.volume = 1;
    
    // Try to select a good voice
    const voices = window.speechSynthesis.getVoices();
    let selectedVoice = voices.find(voice => 
      voice.name.includes('Google') && voice.lang.startsWith('en')
    ) || voices.find(voice => voice.lang.startsWith('en'));
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    
    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);
    
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="relative">
      {/* Edit Mode Checkbox */}
      {isEditMode && (
        <div className="absolute -top-2 -left-2 z-20">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect?.(word.id)}
            className="w-5 h-5 rounded-full bg-white/90 border-2 border-slate-300 checked:bg-red-500 checked:border-red-500"
          />
        </div>
      )}

      {/* Word Card with Corner-Wipe Animation */}
      <div
        className={`word-card ${isEditMode ? 'cursor-pointer' : 'cursor-pointer hover:shadow-lg transition-shadow'}`}
        data-translation={word.translations.join(', ')}
        onClick={handleCardClick}
        style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}
      >
        <div className="text-center relative">
          <div className="font-bold text-lg mb-1">
            {word.word}
          </div>
          {word.context && (
            <div className="text-xs opacity-60 px-2 py-1 bg-white/20 rounded-full inline-block">
              {word.context}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default WordCard;