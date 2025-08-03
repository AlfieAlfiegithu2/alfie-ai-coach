import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Trash2, Languages, Globe } from 'lucide-react';

interface SavedWord {
  id: string;
  word: string;
  translation: string;
  context: string;
  savedAt: string;
}

interface VocabularyFlipCardProps {
  word: SavedWord;
  onRemove: (wordId: string) => void;
  onTranslate?: (wordId: string, word: string) => Promise<void>;
  selectedLanguage?: string;
  translating?: string | null;
}

const VocabularyFlipCard = ({ word, onRemove, onTranslate, selectedLanguage = 'Spanish', translating }: VocabularyFlipCardProps) => {
  const [isFlipped, setIsFlipped] = useState(false);

  const needsTranslation = word.translation.includes('Translation coming soon') || word.translation.includes('Auto saved from');

  return (
    <div 
      className="relative w-full h-32 perspective-1000 cursor-pointer"
      onMouseEnter={() => setIsFlipped(true)}
      onMouseLeave={() => setIsFlipped(false)}
    >
      <div className={`relative w-full h-full transition-transform duration-500 transform-style-preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
        
        {/* Front Side - English Word */}
        <div className="absolute inset-0 w-full h-full backface-hidden rounded-xl bg-white/90 border border-white/40 backdrop-blur-xl flex items-center justify-center shadow-soft">
          <h3 className="text-2xl font-bold text-black text-center">
            {word.word}
          </h3>
        </div>

        {/* Back Side - Translation */}
        <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 rounded-xl bg-white/90 border border-white/40 backdrop-blur-xl flex items-center justify-center shadow-soft">
          {needsTranslation ? (
            <div className="text-center">
              <p className="text-black mb-3 text-lg">Not translated yet</p>
              {onTranslate && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTranslate(word.id, word.word);
                  }}
                  disabled={translating === word.id}
                  className="text-black/70 hover:text-black hover:bg-black/10 border border-black/30"
                >
                  {translating === word.id ? (
                    <div className="w-3 h-3 border border-black border-t-transparent rounded-full animate-spin mr-2" />
                  ) : (
                    <Globe className="w-3 h-3 mr-2" />
                  )}
                  Translate to {selectedLanguage}
                </Button>
              )}
            </div>
          ) : (
            <h3 className="text-2xl font-bold text-black text-center">
              {word.translation}
            </h3>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(word.id);
            }}
            className="absolute top-2 right-2 text-black/70 hover:text-red-600 hover:bg-red-500/20"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default VocabularyFlipCard;