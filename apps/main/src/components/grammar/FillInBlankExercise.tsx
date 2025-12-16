import { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle, XCircle, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useThemeStyles } from '@/hooks/useThemeStyles';

interface FillInBlankExerciseProps {
  sentence: string; // Use ___ for blank position
  instruction?: string;
  correctAnswer: string;
  acceptableAnswers?: string[]; // Alternative correct answers
  explanation?: string;
  hint?: string;
  onComplete: (isCorrect: boolean, answer: string) => void;
  showResult?: boolean;
}

const FillInBlankExercise = ({
  sentence,
  instruction,
  correctAnswer,
  acceptableAnswers = [],
  explanation,
  hint,
  onComplete,
  showResult = true,
}: FillInBlankExerciseProps) => {
  const { theme } = useThemeStyles();
  const [userAnswer, setUserAnswer] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Normalize answer for comparison (lowercase, trim, remove extra spaces)
  const normalizeAnswer = (answer: string) => {
    return answer.toLowerCase().trim().replace(/\s+/g, ' ');
  };

  // Check if answer is correct
  const allCorrectAnswers = [correctAnswer, ...acceptableAnswers].map(normalizeAnswer);
  const isCorrect = allCorrectAnswers.includes(normalizeAnswer(userAnswer));
  const isNoteTheme = theme.name === 'note';

  // Theme-specific styles
  const styles = {
    card: isNoteTheme ? 'bg-[#fdf6e3] border-[#e8d5a3]' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700',
    textPrimary: isNoteTheme ? 'text-[#5d4e37]' : 'text-gray-900 dark:text-gray-100',
    textSecondary: isNoteTheme ? 'text-[#8b6914]' : 'text-gray-500 dark:text-gray-400',
    inputBase: isNoteTheme
      ? 'border-[#e8d5a3] bg-white text-[#5d4e37] placeholder:text-[#a68b5b]'
      : 'bg-transparent text-gray-900 dark:text-gray-100 border-blue-400 focus:border-blue-500 dark:border-blue-500 hover:border-blue-500',
    inputCorrect: isNoteTheme
      ? 'border-[#8b6914] bg-[#fdf6e3] text-[#5d4e37]'
      : 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:text-emerald-300',
    inputIncorrect: isNoteTheme
      ? 'border-red-300 bg-red-50 text-[#5d4e37]'
      : 'border-red-500 bg-red-50 text-red-700 dark:text-red-300',
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

  // Parse sentence to show blank
  const renderSentence = () => {
    const parts = sentence.split('___');

    if (parts.length === 1) {
      // No blank marker found, show sentence and input below
      return (
        <div className="space-y-3">
          <p className={`text-lg leading-relaxed ${styles.textPrimary}`}>{sentence}</p>
          <Input
            ref={inputRef}
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSubmitted}
            placeholder="Type your answer..."
            className={cn(
              'text-lg font-medium',
              getInputStyle()
            )}
          />
        </div>
      );
    }

    return (
      <p className={`text-lg leading-relaxed inline-flex flex-wrap items-center gap-1 ${styles.textPrimary}`}>
        {parts.map((part, index) => (
          <span key={index} className="inline-flex items-center gap-1">
            <span className={styles.textPrimary}>{part}</span>
            {index < parts.length - 1 && (
              <Input
                ref={index === 0 ? inputRef : undefined}
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isSubmitted}
                placeholder="..."
                className={cn(
                  'inline-block w-40 text-center font-medium border-b-2 border-t-0 border-l-0 border-r-0 rounded-none px-2 relative z-10 cursor-text',
                  getInputStyle()
                )}
              />
            )}
          </span>
        ))}
      </p>
    );
  };

  return (
    <Card className={`w-full ${styles.card}`}>
      <CardContent className="p-6 space-y-4">
        {/* Instruction */}
        {instruction && (
          <p className={`text-sm italic ${styles.textSecondary}`}>{instruction}</p>
        )}

        {/* Sentence with blank */}
        <div className="py-2">
          {renderSentence()}
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
            {!isCorrect && (
              <p className={`text-sm mt-2 ${isNoteTheme ? 'text-[#8b6914]' : 'text-gray-600 dark:text-gray-300'}`}>
                The correct answer is: <strong className={isNoteTheme ? 'text-[#5d4e37]' : 'text-gray-800 dark:text-gray-100'}>{correctAnswer}</strong>
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FillInBlankExercise;

