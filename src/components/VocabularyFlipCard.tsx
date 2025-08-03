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
        <div className="absolute inset-0 w-full h-full backface-hidden rounded-xl bg-white/10 border border-white/20 backdrop-blur-xl p-4 flex flex-col justify-between shadow-soft">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white mb-1">
                {word.word}
              </h3>
              <Badge variant="secondary" className="text-xs bg-white/20 text-white border-white/30">
                <Languages className="w-3 h-3 mr-1" />
                English
              </Badge>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-xs text-white/70">
              <Calendar className="w-3 h-3" />
              <span>{new Date(word.savedAt).toLocaleDateString()}</span>
            </div>
            <div className="text-xs text-white/50">
              Hover to translate
            </div>
          </div>
        </div>

        <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 rounded-xl bg-white/10 border border-white/20 backdrop-blur-xl p-4 flex flex-col justify-between shadow-soft">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {needsTranslation ? (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Not translated yet
                  </h3>
                  {onTranslate && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onTranslate(word.id, word.word);
                      }}
                      disabled={translating === word.id}
                      className="text-white/70 hover:text-white hover:bg-white/20 border border-white/30"
                    >
                      {translating === word.id ? (
                        <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin mr-2" />
                      ) : (
                        <Globe className="w-3 h-3 mr-2" />
                      )}
                      Translate to {selectedLanguage}
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {word.translation}
                  </h3>
                  <div className="text-sm text-white/80 bg-white/10 p-2 rounded-lg">
                    <span className="text-xs text-white/60 block mb-1">Context:</span>
                    "{word.context}"
                  </div>
                </>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(word.id);
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