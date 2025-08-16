import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2 } from 'lucide-react';

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
}

const WordCard = ({ word, onRemove }: WordCardProps) => {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleCardClick = () => {
    setIsFlipped(!isFlipped);
  };

  return (
    <div className="relative">
      {/* Flashcard Container */}
      <div
        className={`relative w-full h-28 cursor-pointer transition-transform duration-500 preserve-3d ${
          isFlipped ? 'rotate-y-180' : ''
        }`}
        onClick={handleCardClick}
      >
        {/* Front of Card */}
        <Card className="absolute inset-0 backface-hidden bg-white/10 border-white/20 backdrop-blur-xl">
          <CardContent className="p-3 flex flex-col items-center justify-center h-full text-center">
            <h3 className="text-lg font-bold text-slate-800 mb-1" style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}>
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
        <Card className="absolute inset-0 backface-hidden rotate-y-180 bg-white/10 border-white/20 backdrop-blur-xl">
          <CardContent className="p-3 flex flex-col items-center justify-center h-full text-center space-y-1">
            {word.translations.map((translation, index) => (
              <p key={index} className="text-lg font-bold text-slate-800" style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}>
                {translation}
              </p>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Delete Button */}
      <Button
        variant="destructive"
        size="sm"
        className="absolute -top-2 -right-2 w-6 h-6 rounded-full p-0 z-10 bg-red-500/80 border border-white/20"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(word.id);
        }}
      >
        <Trash2 className="w-3 h-3" />
      </Button>

      <style dangerouslySetInnerHTML={{
        __html: `
          .perspective-1000 {
            perspective: 1000px;
          }
          .preserve-3d {
            transform-style: preserve-3d;
          }
          .backface-hidden {
            backface-visibility: hidden;
          }
          .rotate-y-180 {
            transform: rotateY(180deg);
          }
        `
      }} />
    </div>
  );
};

export default WordCard;