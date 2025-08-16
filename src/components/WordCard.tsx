import { memo } from 'react';

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
  const handleCardClick = (e: React.MouseEvent) => {
    if (isEditMode) {
      e.preventDefault();
      onToggleSelect?.(word.id);
      return;
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
        className={`word-card ${isEditMode ? 'cursor-pointer' : ''}`}
        data-translation={word.translations.join(', ')}
        onClick={handleCardClick}
        style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}
      >
        <div className="text-center">
          <div className="font-bold text-lg mb-1">{word.word}</div>
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