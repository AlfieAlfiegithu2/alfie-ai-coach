import { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle, XCircle, Lightbulb, ArrowRight, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useThemeStyles } from '@/hooks/useThemeStyles';

interface SentenceTransformExerciseProps {
  originalSentence: string;
  instruction?: string;
  transformationType: string; // e.g., "active to passive", "direct to indirect"
  correctAnswer: string;
  acceptableAnswers?: string[];
  startingWord?: string; // Optional word to start with
  explanation?: string;
  hint?: string;
  onComplete: (isCorrect: boolean, answer: string) => void;
  showResult?: boolean;
}

const SentenceTransformExercise = ({
  originalSentence,
  instruction,
  transformationType,
  correctAnswer,
  acceptableAnswers = [],
  startingWord,
  explanation,
  hint,
  onComplete,
  showResult = true,
}: SentenceTransformExerciseProps) => {
  const { theme } = useThemeStyles();
  const [userAnswer, setUserAnswer] = useState(startingWord || '');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const normalizeAnswer = (answer: string) => {
    return answer.toLowerCase().trim().replace(/\s+/g, ' ').replace(/[.,!?;:]/g, '');
  };

  const allCorrectAnswers = [correctAnswer, ...acceptableAnswers].map(normalizeAnswer);
  const isCorrect = allCorrectAnswers.includes(normalizeAnswer(userAnswer));
  const isNoteTheme = theme.name === 'note';

  // Theme-specific styles
  const styles = {
    card: isNoteTheme ? 'bg-[#fdf6e3] border-[#e8d5a3]' : 'w-full',
    textPrimary: isNoteTheme ? 'text-[#5d4e37]' : 'text-blue-800',
    textSecondary: isNoteTheme ? 'text-[#8b6914]' : 'text-muted-foreground',
    originalSentenceBox: isNoteTheme
      ? 'bg-[#fffbf0] border-[#e8d5a3]'
      : 'bg-blue-50 border-blue-200',
    arrowIcon: isNoteTheme ? 'text-[#e8d5a3]' : 'text-gray-400',
    startingWord: isNoteTheme ? 'text-[#8b6914]' : 'text-gray-600',
    inputBase: isNoteTheme
      ? 'border-[#e8d5a3] bg-white text-[#5d4e37] placeholder:text-[#a68b5b]'
      : 'text-base',
    inputCorrect: isNoteTheme
      ? 'border-[#8b6914] bg-[#fdf6e3] text-[#5d4e37]'
      : 'border-emerald-500 bg-emerald-50',
    inputIncorrect: isNoteTheme
      ? 'border-red-300 bg-red-50 text-[#5d4e37]'
      : 'border-red-500 bg-red-50',
    hintContainer: isNoteTheme
      ? 'bg-[#fffbf0] border-[#e8d5a3]'
      : 'bg-amber-50 border-amber-200',
    hintIcon: isNoteTheme ? 'text-[#8b6914]' : 'text-amber-500',
    hintText: isNoteTheme ? 'text-[#5d4e37]' : 'text-amber-800',
    hintButtonText: isNoteTheme ? 'text-[#8b6914] hover:text-[#5d4e37]' : 'text-amber-600 hover:text-amber-700',
    button: isNoteTheme
      ? 'bg-[#8b6914] hover:bg-[#5d4e37] text-white'
      : 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600',
    resultContainer: (correct: boolean) => {
      if (isNoteTheme) {
        return `border-2 ${correct ? 'bg-[#fdf6e3] border-[#8b6914]' : 'bg-[#fff] border-red-300'}`;
      }
      return `border-2 ${correct ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`;
    },
    correctTransformationBox: isNoteTheme
      ? 'bg-white border-[#e8d5a3] text-[#5d4e37]'
      : 'bg-white rounded border mb-2',
    correctTransformationText: isNoteTheme ? 'text-[#5d4e37]' : 'text-emerald-700',
  };

  const handleSubmit = () => {
    if (!userAnswer.trim() || isSubmitted) return;
    setIsSubmitted(true);
    onComplete(isCorrect, userAnswer);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  // Transformation type badge colors
  const getTransformationColor = () => {
    if (isNoteTheme) {
      return 'bg-white border-[#e8d5a3] text-[#8b6914]';
    }
    const type = transformationType.toLowerCase();
    if (type.includes('passive')) return 'bg-purple-100 text-purple-700 border-purple-200';
    if (type.includes('reported') || type.includes('indirect')) return 'bg-blue-100 text-blue-700 border-blue-200';
    if (type.includes('conditional')) return 'bg-amber-100 text-amber-700 border-amber-200';
    if (type.includes('negative')) return 'bg-red-100 text-red-700 border-red-200';
    if (type.includes('question')) return 'bg-green-100 text-green-700 border-green-200';
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getInputStyle = () => {
    if (isSubmitted) {
      return isCorrect ? styles.inputCorrect : styles.inputIncorrect;
    }
    return styles.inputBase;
  };

  return (
    <Card className={`w-full ${isNoteTheme ? styles.card : ''}`}>
      <CardContent className="p-6 space-y-4">
        {/* Transformation Type Badge */}
        <div className="flex items-center gap-2">
          <RefreshCw className={`w-4 h-4 ${isNoteTheme ? 'text-[#8b6914]' : 'text-gray-500'}`} />
          <span className={cn('text-xs font-medium px-2 py-1 rounded-full border', getTransformationColor())}>
            {transformationType}
          </span>
        </div>

        {/* Instruction */}
        <p className={`text-sm ${styles.textSecondary}`}>
          {instruction || `Transform the sentence (${transformationType}):`}
        </p>

        {/* Original Sentence */}
        <div className={`p-4 rounded-lg border ${styles.originalSentenceBox}`}>
          <p className={`text-lg font-medium ${styles.textPrimary}`}>{originalSentence}</p>
        </div>

        {/* Transformation Arrow */}
        <div className="flex items-center justify-center">
          <ArrowRight className={`w-6 h-6 ${styles.arrowIcon}`} />
        </div>

        {/* User Input */}
        <div className="space-y-2">
          {startingWord && (
            <p className={`text-sm ${styles.startingWord}`}>
              Begin your answer with: <strong>{startingWord}</strong>
            </p>
          )}
          <Input
            ref={inputRef}
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSubmitted}
            placeholder="Write the transformed sentence..."
            className={cn(
              'text-base',
              getInputStyle()
            )}
          />
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

        {/* Submit Button */}
        {!isSubmitted && (
          <Button
            onClick={handleSubmit}
            disabled={!userAnswer.trim()}
            className={`w-full ${styles.button}`}
          >
            Check Answer
          </Button>
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

            {/* Show correct transformation */}
            <div className={`p-3 rounded border mb-2 ${styles.correctTransformationBox}`}>
              <p className={`text-sm mb-1 ${isNoteTheme ? 'text-[#8b6914]' : 'text-gray-600'}`}>Correct transformation:</p>
              <p className={`font-medium ${styles.correctTransformationText}`}>{correctAnswer}</p>
            </div>

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

export default SentenceTransformExercise;

