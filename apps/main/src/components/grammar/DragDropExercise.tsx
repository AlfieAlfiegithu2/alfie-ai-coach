import { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Lightbulb, RotateCcw, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useThemeStyles } from '@/hooks/useThemeStyles';

interface DragDropExerciseProps {
  instruction?: string;
  words: string[]; // Shuffled words to arrange
  correctOrder: string[]; // Words in correct order
  explanation?: string;
  hint?: string;
  onComplete: (isCorrect: boolean, answer: string) => void;
  showResult?: boolean;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

const DragDropExercise = ({
  instruction,
  words,
  correctOrder,
  explanation,
  hint,
  onComplete,
  showResult = true,
}: DragDropExerciseProps) => {
  const { theme } = useThemeStyles();
  const [availableWords, setAvailableWords] = useState<string[]>(() => shuffleArray(words));
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [draggedWord, setDraggedWord] = useState<string | null>(null);
  const [draggedFrom, setDraggedFrom] = useState<'available' | 'selected' | null>(null);

  // Check if current order matches correct order
  const isCorrect = selectedWords.length === correctOrder.length &&
    selectedWords.every((word, index) => word.toLowerCase() === correctOrder[index].toLowerCase());
  const isNoteTheme = theme.name === 'note';

  // Theme-specific styles
  const styles = {
    card: isNoteTheme ? 'bg-[#fdf6e3] text-[#5d4e37]' : 'w-full',
    instruction: isNoteTheme ? 'text-[#8b6914] italic' : 'text-sm text-muted-foreground',
    dropZoneEmpty: isNoteTheme
      ? 'border-[#e8d5a3] bg-[#fffbf0]'
      : 'border-gray-300 bg-gray-50',
    dropZoneActive: isNoteTheme
      ? 'border-[#8b6914] bg-[#fef9e7]'
      : 'border-blue-300 bg-blue-50',
    dropZoneCorrect: isNoteTheme
      ? 'border-[#8b6914] bg-[#fdf6e3]'
      : 'border-emerald-400 bg-emerald-50',
    dropZoneIncorrect: isNoteTheme
      ? 'border-red-300 bg-red-50'
      : 'border-red-400 bg-red-50',
    wordItem: isNoteTheme
      ? 'bg-white border-[#e8d5a3] text-[#5d4e37] shadow-sm hover:shadow-md'
      : 'bg-white border-2 shadow-sm hover:shadow-md',
    wordItemCorrect: isNoteTheme
      ? 'border-[#8b6914] text-[#5d4e37]'
      : 'border-emerald-400 text-emerald-700',
    wordItemIncorrect: isNoteTheme
      ? 'border-red-300 text-[#5d4e37]'
      : 'border-red-400 text-red-700',
    wordItemActive: isNoteTheme
      ? 'border-[#8b6914] text-[#8b6914]'
      : 'border-blue-400 text-blue-700',
    availableZone: isNoteTheme
      ? 'bg-[#fffbf0] border-[#e8d5a3]'
      : 'bg-gray-100 border-gray-200',
    availableWord: isNoteTheme
      ? 'bg-white border-[#e8d5a3] text-[#5d4e37] shadow-sm hover:border-[#8b6914]'
      : 'bg-white border-2 border-gray-300 text-gray-700 shadow-sm hover:border-blue-400',
    hintContainer: isNoteTheme
      ? 'bg-[#fffbf0] border-[#e8d5a3]'
      : 'bg-amber-50 border-amber-200',
    hintIcon: isNoteTheme ? 'text-[#8b6914]' : 'text-amber-500',
    hintText: isNoteTheme ? 'text-[#5d4e37]' : 'text-amber-800',
    hintButtonText: isNoteTheme ? 'text-[#8b6914] hover:text-[#5d4e37]' : 'text-amber-600 hover:text-amber-700',
    button: isNoteTheme
      ? 'bg-[#8b6914] hover:bg-[#5d4e37] text-white'
      : 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600',
    resetButton: isNoteTheme
      ? 'border-[#e8d5a3] text-[#8b6914] hover:bg-[#fffbf0] hover:text-[#5d4e37]'
      : 'variant="outline"',
    resultContainer: (correct: boolean) => {
      if (isNoteTheme) {
        return `border-2 ${correct ? 'bg-[#fdf6e3] border-[#8b6914]' : 'bg-[#fff] border-red-300'}`;
      }
      return `border-2 ${correct ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`;
    },
    correctOrderBox: isNoteTheme
      ? 'bg-white border-[#e8d5a3] text-[#5d4e37]'
      : 'bg-white rounded border mb-2',
    correctOrderText: isNoteTheme ? 'text-[#5d4e37]' : 'text-emerald-700',
  };

  const handleWordClick = (word: string, from: 'available' | 'selected') => {
    if (isSubmitted) return;

    if (from === 'available') {
      // Move from available to selected
      setAvailableWords(prev => prev.filter((w, i) => {
        const firstIndex = prev.indexOf(word);
        return i !== firstIndex;
      }));
      setSelectedWords(prev => [...prev, word]);
    } else {
      // Move from selected back to available
      setSelectedWords(prev => prev.filter((w, i) => {
        const firstIndex = prev.indexOf(word);
        return i !== firstIndex;
      }));
      setAvailableWords(prev => [...prev, word]);
    }
  };

  const handleDragStart = (word: string, from: 'available' | 'selected') => {
    setDraggedWord(word);
    setDraggedFrom(from);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetArea: 'available' | 'selected', targetIndex?: number) => {
    if (!draggedWord || !draggedFrom || isSubmitted) return;

    // Remove from source
    if (draggedFrom === 'available') {
      setAvailableWords(prev => {
        const idx = prev.indexOf(draggedWord);
        return prev.filter((_, i) => i !== idx);
      });
    } else {
      setSelectedWords(prev => {
        const idx = prev.indexOf(draggedWord);
        return prev.filter((_, i) => i !== idx);
      });
    }

    // Add to target
    if (targetArea === 'available') {
      setAvailableWords(prev => [...prev, draggedWord]);
    } else {
      if (targetIndex !== undefined) {
        setSelectedWords(prev => {
          const newArr = [...prev];
          newArr.splice(targetIndex, 0, draggedWord);
          return newArr;
        });
      } else {
        setSelectedWords(prev => [...prev, draggedWord]);
      }
    }

    setDraggedWord(null);
    setDraggedFrom(null);
  };

  const handleReorder = (fromIndex: number, toIndex: number) => {
    if (isSubmitted) return;
    setSelectedWords(prev => {
      const newArr = [...prev];
      const [removed] = newArr.splice(fromIndex, 1);
      newArr.splice(toIndex, 0, removed);
      return newArr;
    });
  };

  const handleReset = () => {
    setSelectedWords([]);
    setAvailableWords(shuffleArray(words));
    setIsSubmitted(false);
  };

  const handleSubmit = () => {
    if (selectedWords.length === 0 || isSubmitted) return;
    setIsSubmitted(true);
    onComplete(isCorrect, selectedWords.join(' '));
  };

  // Helper to determine selected area style
  const getSelectedAreaStyle = () => {
    if (selectedWords.length === 0) return styles.dropZoneEmpty;
    if (isSubmitted) {
      return isCorrect ? styles.dropZoneCorrect : styles.dropZoneIncorrect;
    }
    return styles.dropZoneActive;
  };

  const getWordStyle = (word: string) => {
    if (isSubmitted) {
      return isCorrect ? styles.wordItemCorrect : styles.wordItemIncorrect;
    }
    return styles.wordItemActive;
  };

  return (
    <Card className={`w-full ${isNoteTheme ? styles.card : ''}`}>
      <CardContent className="p-6 space-y-4">
        {/* Instruction */}
        <p className={styles.instruction}>
          {instruction || 'Arrange the words to form a correct sentence:'}
        </p>

        {/* Selected Words Area (Sentence being built) */}
        <div
          className={cn(
            'min-h-[60px] p-3 rounded-lg border-2 border-dashed transition-colors',
            getSelectedAreaStyle()
          )}
          onDragOver={handleDragOver}
          onDrop={() => handleDrop('selected')}
        >
          {selectedWords.length === 0 ? (
            <p className={`text-center text-sm py-2 ${isNoteTheme ? 'text-[#8b6914]/50' : 'text-gray-400'}`}>
              Click or drag words here to build your sentence
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {selectedWords.map((word, index) => (
                <div
                  key={`selected-${index}`}
                  draggable={!isSubmitted}
                  onDragStart={() => handleDragStart(word, 'selected')}
                  onDragOver={handleDragOver}
                  onDrop={(e) => {
                    e.stopPropagation();
                    if (draggedFrom === 'selected') {
                      const fromIndex = selectedWords.indexOf(draggedWord!);
                      handleReorder(fromIndex, index);
                    } else {
                      handleDrop('selected', index);
                    }
                  }}
                  onClick={() => handleWordClick(word, 'selected')}
                  className={cn(
                    'inline-flex items-center gap-1 px-3 py-2 rounded-lg font-medium text-sm cursor-pointer transition-all',
                    isNoteTheme ? 'bg-white border-2' : styles.wordItem,
                    isSubmitted ? 'cursor-default' : 'hover:scale-105',
                    getWordStyle(word)
                  )}
                >
                  <GripVertical className="w-3 h-3 opacity-50" />
                  {word}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Available Words */}
        <div
          className={`min-h-[60px] p-3 rounded-lg ${styles.availableZone}`}
          onDragOver={handleDragOver}
          onDrop={() => handleDrop('available')}
        >
          {availableWords.length === 0 ? (
            <p className={`text-center text-sm py-2 ${isNoteTheme ? 'text-[#8b6914]/50' : 'text-gray-400'}`}>
              All words used!
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {availableWords.map((word, index) => (
                <div
                  key={`available-${index}`}
                  draggable={!isSubmitted}
                  onDragStart={() => handleDragStart(word, 'available')}
                  onClick={() => handleWordClick(word, 'available')}
                  className={cn(
                    'inline-flex items-center gap-1 px-3 py-2 rounded-lg font-medium text-sm cursor-pointer transition-all border-2',
                    styles.availableWord,
                    isSubmitted ? 'cursor-default opacity-50' : 'hover:shadow-md hover:scale-105'
                  )}
                >
                  {word}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Hint */}
        {hint && !isSubmitted && (
          <div>
            {showHint ? (
              <div className={`flex items-start gap-2 p-3 rounded-lg border ${styles.hintContainer}`}>
                <Lightbulb className={`w-5 h-5 shrink-0 mt-0.5 ${styles.hintIcon}`} />
                <p className={`text-sm ${styles.hintText}`}>{hint}</p>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHint(true)}
                className={styles.hintButtonText}
              >
                <Lightbulb className="w-4 h-4 mr-1" />
                Show Hint
              </Button>
            )}
          </div>
        )}

        {/* Action Buttons */}
        {!isSubmitted && (
          <div className="flex gap-2">
            <Button
              variant={isNoteTheme ? 'ghost' : 'outline'}
              onClick={handleReset}
              disabled={selectedWords.length === 0}
              className={`flex-1 ${styles.resetButton}`}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={selectedWords.length === 0}
              className={`flex-1 ${styles.button}`}
            >
              Check Answer
            </Button>
          </div>
        )}

        {/* Result & Explanation */}
        {isSubmitted && showResult && (
          <div className={`p-4 rounded-lg ${styles.resultContainer(isCorrect)}`}>
            <div className="flex items-center gap-2 mb-2">
              {isCorrect ? (
                <>
                  <CheckCircle className={`w-5 h-5 ${isNoteTheme ? 'text-[#8b6914]' : 'text-emerald-500'}`} />
                  <span className={`font-semibold ${isNoteTheme ? 'text-[#5d4e37]' : 'text-emerald-700'}`}>Correct!</span>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-red-500" />
                  <span className={`font-semibold ${isNoteTheme ? 'text-red-700' : 'text-red-700'}`}>Not quite right</span>
                </>
              )}
            </div>

            {/* Show correct order */}
            {!isCorrect && (
              <div className={`p-3 rounded border mb-2 ${styles.correctOrderBox}`}>
                <p className={`text-sm mb-1 ${isNoteTheme ? 'text-[#8b6914]' : 'text-gray-600'}`}>Correct order:</p>
                <p className={`font-medium ${styles.correctOrderText}`}>{correctOrder.join(' ')}</p>
              </div>
            )}

            {explanation && (
              <p className={cn(
                'text-sm',
                isNoteTheme
                  ? (isCorrect ? 'text-[#5d4e37]' : 'text-[#5d4e37]')
                  : (isCorrect ? 'text-emerald-700' : 'text-red-700')
              )}>
                {explanation}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DragDropExercise;
