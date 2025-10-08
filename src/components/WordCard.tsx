import { memo, useState, useRef } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
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
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleCardClick = (e: React.MouseEvent) => {
    if (isEditMode) {
      e.preventDefault();
      onToggleSelect?.(word.id);
      return;
    }
    // Play pronunciation when clicking the word
    playPronunciation(e);
  };

  const playPronunciation = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (isPlayingAudio) {
      // Stop current audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setIsPlayingAudio(false);
      return;
    }

    setIsPlayingAudio(true);
    try {
      // Generate audio using TTS cache function
          const { data, error } = await supabase.functions.invoke('tts-audio-cache', {
            body: {
              text: word.word,
              language: 'en-US',
              voice: 'en-US-Neural2-J',
              speed: 0.9,
              provider: 'auto'
            }
          });

      if (error) throw error;

      if (data.success && data.audioUrl) {
        const audio = new Audio(data.audioUrl);
        audioRef.current = audio;
        audio.onended = () => setIsPlayingAudio(false);
        audio.onerror = () => setIsPlayingAudio(false);
        await audio.play();
      }
    } catch (error: any) {
      console.error('Pronunciation error:', error);
      setIsPlayingAudio(false);
      
      // Show error to user for debugging
      console.error('Full error details:', error);
    }
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
          <div className="font-bold text-lg mb-1 flex items-center justify-center gap-2">
            {word.word}
            {!isEditMode && (
              <span className="inline-block">
                {isPlayingAudio ? (
                  <VolumeX className="w-4 h-4 text-blue-500" />
                ) : (
                  <Volume2 className="w-4 h-4 text-gray-400 opacity-60" />
                )}
              </span>
            )}
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