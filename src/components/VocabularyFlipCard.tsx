import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Trash2, Languages, Globe } from 'lucide-react';

interface SavedWord {
  id: string;
  word: string;
  translation?: string;
  context?: string;
  savedAt: string;
  languageCode?: string;
}

interface VocabularyFlipCardProps {
  word: SavedWord;
  onRemove: () => void;
  translating?: boolean;
}

const VocabularyFlipCard = ({ word, onRemove, translating = false }: VocabularyFlipCardProps) => {
  const [isFlipped, setIsFlipped] = useState(false);

  const needsTranslation = !word.translation;

  return (
    <div 
      className="relative w-full h-32 perspective-1000 cursor-pointer"
      onMouseEnter={() => setIsFlipped(true)}
      onMouseLeave={() => setIsFlipped(false)}
    >
      <div className={`relative w-full h-full transition-transform duration-500 transform-style-preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
        
        {/* Front Side - English Word */}
        <div className="absolute inset-0 w-full h-full backface-hidden rounded-xl bg-white/10 border border-white/20 backdrop-blur-xl flex items-center justify-center shadow-soft">
          <h3 className="text-2xl font-bold text-black text-center">
            {word.word}
          </h3>
        </div>

        <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 rounded-xl bg-white/10 border border-white/20 backdrop-blur-xl p-4 flex flex-col justify-between shadow-soft">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {needsTranslation ? (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Translation saved automatically
                  </h3>
                  {translating && (
                    <div className="flex items-center text-white/70">
                      <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Processing...
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {word.translation}
                  </h3>
                  {word.context && (
                    <div className="text-sm text-white/80 bg-white/10 p-2 rounded-lg">
                      <span className="text-xs text-white/60 block mb-1">Context:</span>
                      "{word.context}"
                    </div>
                  )}
                </>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="text-white/70 hover:text-red-400 hover:bg-red-500/20"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="text-xs bg-white/20 text-white border-white/30">
              <Languages className="w-3 h-3 mr-1" />
              Translation
            </Badge>
            <div className="text-xs text-white/50">
              Original: {word.word}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VocabularyFlipCard;