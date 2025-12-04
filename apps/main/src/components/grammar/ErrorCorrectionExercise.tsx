import { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle, XCircle, Lightbulb, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

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
              className="bg-red-200 text-red-800 px-1 rounded underline decoration-wavy decoration-red-500"
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
    <Card className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
      <CardContent className="p-6 space-y-4">
        {/* Instruction */}
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {instruction || 'Find and correct the error in this sentence:'}
          </p>
        </div>

        {/* Incorrect Sentence */}
        <div className="p-4 bg-red-50 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-700">
          <p className="text-lg leading-relaxed text-gray-900 dark:text-gray-100">
            {renderIncorrectSentence()}
          </p>
        </div>

        {/* User Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
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
              isSubmitted && isCorrect && 'border-emerald-500 bg-emerald-50',
              isSubmitted && !isCorrect && 'border-red-500 bg-red-50'
            )}
          />
        </div>

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

        {/* Submit Button */}
        {!isSubmitted && (
          <Button
            onClick={handleSubmit}
            disabled={!userAnswer.trim()}
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
            
            {/* Show correct sentence */}
            <div className="p-3 bg-white dark:bg-gray-700 rounded border dark:border-gray-600 mb-2">
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">Correct sentence:</p>
              <p className="font-medium text-emerald-700 dark:text-emerald-300">{correctAnswer}</p>
            </div>

            {explanation && (
              <p className={cn(
                'text-sm',
                isCorrect ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'
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

