import { useState, memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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

      {/* Flashcard Container */}
      <div
        className={`word-card ${isEditMode ? 'cursor-pointer' : ''}`}
        onClick={handleCardClick}
      >
        <div className="word-card-inner">
          {/* Front of Card */}
          <Card className="word-card-front bg-white/10 border-white/20 backdrop-blur-xl hover:scale-100 hover:shadow-none hover:ring-0">
            <CardContent className="p-3 flex flex-col items-center justify-center h-full text-center">
              <h3 className="text-base font-bold text-slate-800 mb-1" style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}>
                {word.word}
              </h3>
              {word.context && (
                <Badge variant="outline" className="bg-white/20 text-slate-600 border-white/30 text-xs">
                  {word.context}
                </Badge>
              )}
            </CardContent>
          </Card>

          {/* Back of Card */}
          <Card className="word-card-back bg-white/10 border-white/20 backdrop-blur-xl hover:scale-100 hover:shadow-none hover:ring-0">
            <CardContent className="p-3 flex flex-col items-center justify-center h-full text-center">
              {word.translations.map((translation, index) => (
                <p key={index} className="text-base font-bold text-slate-800" style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}>
                  {translation}
                </p>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
});

export default WordCard;