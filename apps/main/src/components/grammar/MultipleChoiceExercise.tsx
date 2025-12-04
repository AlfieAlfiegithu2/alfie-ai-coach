import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showHint, setShowHint] = useState(false);

  // Shuffle options once on mount
  const options = useMemo(() => {
    return shuffleArray([correctAnswer, ...incorrectAnswers]);
  }, [correctAnswer, incorrectAnswers]);

  const isCorrect = selectedAnswer === correctAnswer;

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
      return selectedAnswer === option
        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-200 dark:ring-blue-800 text-gray-900 dark:text-gray-100'
        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-900 dark:text-gray-100';
    }

    if (option === correctAnswer) {
      return 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200';
    }

    if (option === selectedAnswer && option !== correctAnswer) {
      return 'border-red-500 bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200';
    }

    return 'border-gray-200 dark:border-gray-600 opacity-50 text-gray-500 dark:text-gray-400';
  };

  return (
    <Card className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
      <CardContent className="p-6 space-y-4">
        {/* Instruction */}
        {instruction && (
          <p className="text-sm text-gray-500 dark:text-gray-400 italic">{instruction}</p>
        )}

        {/* Question */}
        <div className="text-lg font-medium leading-relaxed text-gray-900 dark:text-gray-100">{question}</div>

        {/* Hint */}
        {hint && !isSubmitted && (
          <div>
            {showHint ? (
              <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <Lightbulb className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">{hint}</p>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHint(true)}
                className="text-amber-600 hover:text-amber-700"
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
                <span className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-sm font-medium shrink-0 text-gray-700 dark:text-gray-200">
                  {String.fromCharCode(65 + index)}
                </span>
                <span className="flex-1 text-inherit">{option}</span>
                {isSubmitted && option === correctAnswer && (
                  <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                )}
                {isSubmitted && option === selectedAnswer && option !== correctAnswer && (
                  <XCircle className="w-5 h-5 text-red-500 shrink-0" />
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
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
          >
            Check Answer
          </Button>
        )}

        {/* Result & Explanation */}
        {isSubmitted && showResult && (
          <div className={cn(
            'p-4 rounded-lg border-2',
            isCorrect ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-700' : 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700'
          )}>
            <div className="flex items-center gap-2 mb-2">
              {isCorrect ? (
                <>
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                  <span className="font-semibold text-emerald-700 dark:text-emerald-300">Correct!</span>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-red-500" />
                  <span className="font-semibold text-red-700 dark:text-red-300">Not quite right</span>
                </>
              )}
            </div>
            {explanation && (
              <p className={cn(
                'text-sm',
                isCorrect ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'
              )}>
                {explanation}
              </p>
            )}
            {!isCorrect && (
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                The correct answer is: <strong className="text-gray-800 dark:text-gray-100">{correctAnswer}</strong>
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MultipleChoiceExercise;

