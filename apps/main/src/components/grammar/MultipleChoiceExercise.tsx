import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useThemeStyles } from '@/hooks/useThemeStyles';

interface MultipleChoiceExerciseProps {
  question: string;
  instruction?: string;
  correctAnswer: string;
  incorrectAnswers: string[];
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

const MultipleChoiceExercise = ({
  question,
  instruction,
  correctAnswer,
  incorrectAnswers,
  explanation,
  hint,
  onComplete,
  showResult = true,
}: MultipleChoiceExerciseProps) => {
  const { theme } = useThemeStyles();
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showHint, setShowHint] = useState(false);

  // Shuffle options once on mount
  const options = useMemo(() => {
    return shuffleArray([correctAnswer, ...incorrectAnswers]);
  }, [correctAnswer, incorrectAnswers]);

  const isCorrect = selectedAnswer === correctAnswer;
  const isNoteTheme = theme.name === 'note';

  // Theme-specific styles
  const styles = {
    card: isNoteTheme ? 'bg-[#fdf6e3] border-[#e8d5a3]' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700',
    textPrimary: isNoteTheme ? 'text-[#5d4e37]' : 'text-gray-900 dark:text-gray-100',
    textSecondary: isNoteTheme ? 'text-[#8b6914]' : 'text-gray-500 dark:text-gray-400',
    optionDefault: isNoteTheme
      ? 'border-[#e8d5a3] bg-white text-[#5d4e37] hover:bg-[#fef9e7]'
      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-900 dark:text-gray-100',
    optionSelected: isNoteTheme
      ? 'border-[#8b6914] bg-[#fef9e7] text-[#5d4e37] font-medium'
      : 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-200 dark:ring-blue-800 text-gray-900 dark:text-gray-100',
    optionCorrect: isNoteTheme
      ? 'border-[#8b6914] bg-[#fdf6e3] text-[#5d4e37] font-bold'
      : 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200',
    optionIncorrect: isNoteTheme
      ? 'border-red-300 bg-red-50 text-[#5d4e37]'
      : 'border-red-500 bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200',
    optionDisabled: isNoteTheme
      ? 'opacity-50 border-[#e8d5a3] text-[#8b6914]'
      : 'border-gray-200 dark:border-gray-600 opacity-50 text-gray-500 dark:text-gray-400',
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

  const handleSelect = (option: string) => {
    if (isSubmitted) return;
    setSelectedAnswer(option);
  };

  const handleSubmit = () => {
    if (!selectedAnswer || isSubmitted) return;
    setIsSubmitted(true);
    onComplete(selectedAnswer === correctAnswer, selectedAnswer);
  };

  const getOptionStyle = (option: string) => {
    if (!isSubmitted) {
      return selectedAnswer === option ? styles.optionSelected : styles.optionDefault;
    }

    if (option === correctAnswer) {
      return styles.optionCorrect;
    }

    if (option === selectedAnswer && option !== correctAnswer) {
      return styles.optionIncorrect;
    }

    return styles.optionDisabled;
  };

  return (
    <Card className={`w-full ${styles.card}`}>
      <CardContent className="p-6 space-y-4">
        {/* Instruction */}
        {instruction && (
          <p className={`text-sm italic ${styles.textSecondary}`}>{instruction}</p>
        )}

        {/* Question */}
        <div className={`text-lg font-medium leading-relaxed ${styles.textPrimary}`}>{question}</div>

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

        {/* Options */}
        <div className="grid gap-3">
          {options.map((option, index) => (
            <button
              key={index}
              onClick={() => handleSelect(option)}
              disabled={isSubmitted}
              className={cn(
                'w-full p-4 text-left rounded-lg border-2 transition-all duration-200',
                getOptionStyle(option),
                !isSubmitted && 'cursor-pointer'
              )}
            >
              <div className="flex items-center gap-3">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium shrink-0 ${isNoteTheme ? 'bg-[#e8d5a3] text-[#5d4e37]' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'}`}>
                  {String.fromCharCode(65 + index)}
                </span>
                <span className="flex-1 text-inherit">{option}</span>
                {isSubmitted && option === correctAnswer && (
                  <CheckCircle className={`w-5 h-5 shrink-0 ${isNoteTheme ? 'text-[#8b6914]' : 'text-emerald-500'}`} />
                )}
                {isSubmitted && option === selectedAnswer && option !== correctAnswer && (
                  <XCircle className={`w-5 h-5 shrink-0 ${isNoteTheme ? 'text-red-500' : 'text-red-500'}`} />
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Submit Button */}
        {!isSubmitted && (
          <Button
            onClick={handleSubmit}
            disabled={!selectedAnswer}
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

export default MultipleChoiceExercise;

