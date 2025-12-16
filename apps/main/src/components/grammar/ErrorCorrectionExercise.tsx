import { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle, XCircle, Lightbulb, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useThemeStyles } from '@/hooks/useThemeStyles';

interface ErrorCorrectionExerciseProps {
  incorrectSentence: string;
  instruction?: string;
  correctAnswer: string;
  acceptableAnswers?: string[];
  explanation?: string;
  hint?: string;
  errorHighlight?: string; // The specific error word/phrase to highlight
  onComplete: (isCorrect: boolean, answer: string) => void;
  showResult?: boolean;
}

const ErrorCorrectionExercise = ({
  incorrectSentence,
  instruction,
  correctAnswer,
  acceptableAnswers = [],
  explanation,
  hint,
  errorHighlight,
  onComplete,
  showResult = true,
}: ErrorCorrectionExerciseProps) => {
  const { theme } = useThemeStyles();
  const [userAnswer, setUserAnswer] = useState('');
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
    card: isNoteTheme ? 'bg-[#fdf6e3] border-[#e8d5a3]' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700',
    textPrimary: isNoteTheme ? 'text-[#5d4e37]' : 'text-gray-900 dark:text-gray-100',
    textSecondary: isNoteTheme ? 'text-[#8b6914]' : 'text-gray-500 dark:text-gray-400',
    incorrectContainer: isNoteTheme
      ? 'bg-[#fffbf0] border-[#e8d5a3]'
      : 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700',
    errorHighlight: isNoteTheme
      ? 'bg-red-100 text-[#5d4e37] decoration-red-400'
      : 'bg-red-200 text-red-800 decoration-red-500',
    inputBase: isNoteTheme
      ? 'border-[#e8d5a3] bg-white text-[#5d4e37] placeholder:text-[#a68b5b]'
      : 'text-base',
    inputCorrect: isNoteTheme
      ? 'border-[#8b6914] bg-[#fdf6e3] text-[#5d4e37]'
      : 'border-emerald-500 bg-emerald-50',
    inputIncorrect: isNoteTheme
      ? 'border-red-300 bg-red-50 text-[#5d4e37]'
      : 'border-red-500 bg-red-50',
    button: isNoteTheme
      ? 'bg-[#8b6914] hover:bg-[#5d4e37] text-white'
      : 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600',
    resultContainer: (correct: boolean) => {
      if (isNoteTheme) {
        return `border-2 ${correct ? 'bg-[#fdf6e3] border-[#8b6914]' : 'bg-[#fff] border-red-300'}`;
      }
      return `border-2 ${correct ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-700' : 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700'}`;
    },
    hintContainer: isNoteTheme
      ? 'bg-[#fffbf0] border-[#e8d5a3]'
      : 'bg-amber-50 border-amber-200',
    hintIcon: isNoteTheme ? 'text-[#8b6914]' : 'text-amber-500',
    hintText: isNoteTheme ? 'text-[#5d4e37]' : 'text-amber-800',
    hintButtonText: isNoteTheme ? 'text-[#8b6914] hover:text-[#5d4e37]' : 'text-amber-600 hover:text-amber-700',
    instructionIcon: isNoteTheme ? 'text-[#8b6914]' : 'text-amber-500',
    correctSentenceBox: isNoteTheme
      ? 'bg-white border-[#e8d5a3] text-[#5d4e37]'
      : 'bg-white dark:bg-gray-700 border dark:border-gray-600 text-emerald-700 dark:text-emerald-300',
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

  const getInputStyle = () => {
    if (isSubmitted) {
      return isCorrect ? styles.inputCorrect : styles.inputIncorrect;
    }
    return styles.inputBase;
  };

  // Render sentence with error highlighted
  const renderIncorrectSentence = () => {
    if (!errorHighlight) {
      return <span>{incorrectSentence}</span>;
    }

    const parts = incorrectSentence.split(new RegExp(`(${errorHighlight})`, 'i'));
    return (
      <>
        {parts.map((part, index) => (
          part.toLowerCase() === errorHighlight.toLowerCase() ? (
            <span
              key={index}
              className={`px-1 rounded underline decoration-wavy ${styles.errorHighlight}`}
            >
              {part}
            </span>
          ) : (
            <span key={index}>{part}</span>
          )
        ))}
      </>
    );
  };

  return (
    <Card className={`w-full ${styles.card}`}>
      <CardContent className="p-6 space-y-4">
        {/* Instruction */}
        <div className="flex items-start gap-2">
          <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${styles.instructionIcon}`} />
          <p className={`text-sm ${styles.textSecondary}`}>
            {instruction || 'Find and correct the error in this sentence:'}
          </p>
        </div>

        {/* Incorrect Sentence */}
        <div className={`p-4 rounded-lg border ${styles.incorrectContainer}`}>
          <p className={`text-lg leading-relaxed ${styles.textPrimary}`}>
            {renderIncorrectSentence()}
          </p>
        </div>

        {/* User Input */}
        <div className="space-y-2">
          <label className={`text-sm font-medium ${styles.textPrimary}`}>
            Write the corrected sentence:
          </label>
          <Input
            ref={inputRef}
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSubmitted}
            placeholder="Type the correct sentence..."
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
                  <span className={`font-semibold ${isNoteTheme ? 'text-[#5d4e37]' : 'text-emerald-700 dark:text-emerald-300'}`}>Correct!</span>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-red-500" />
                  <span className={`font-semibold ${isNoteTheme ? 'text-red-700' : 'text-red-700 dark:text-red-300'}`}>Not quite right</span>
                </>
              )}
            </div>

            {/* Show correct sentence */}
            <div className={`p-3 rounded border mb-2 ${styles.correctSentenceBox}`}>
              <p className={`text-sm mb-1 ${isNoteTheme ? 'text-[#8b6914]' : 'text-gray-600 dark:text-gray-300'}`}>Correct sentence:</p>
              <p className="font-medium">{correctAnswer}</p>
            </div>

            {explanation && (
              <p className={cn(
                'text-sm',
                isNoteTheme
                  ? (isCorrect ? 'text-[#5d4e37]' : 'text-[#5d4e37]')
                  : (isCorrect ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300')
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

export default ErrorCorrectionExercise;

