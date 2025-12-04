import { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle, XCircle, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

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

  // Parse sentence to show blank
  const renderSentence = () => {
    const parts = sentence.split('___');
    
    if (parts.length === 1) {
      // No blank marker found, show sentence and input below
      return (
        <div className="space-y-3">
          <p className="text-lg leading-relaxed text-gray-900 dark:text-gray-100">{sentence}</p>
          <Input
            ref={inputRef}
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSubmitted}
            placeholder="Type your answer..."
            className={cn(
              'text-lg font-medium',
              isSubmitted && isCorrect && 'border-emerald-500 bg-emerald-50',
              isSubmitted && !isCorrect && 'border-red-500 bg-red-50'
            )}
          />
        </div>
      );
    }

    return (
      <p className="text-lg leading-relaxed inline-flex flex-wrap items-center gap-1 text-gray-900 dark:text-gray-100">
        {parts.map((part, index) => (
          <span key={index} className="inline-flex items-center gap-1">
            <span className="text-gray-900 dark:text-gray-100">{part}</span>
            {index < parts.length - 1 && (
              <Input
                ref={index === 0 ? inputRef : undefined}
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isSubmitted}
                placeholder="..."
                className={cn(
                  'inline-block w-40 text-center font-medium border-b-2 border-t-0 border-l-0 border-r-0 rounded-none bg-transparent px-2 text-gray-900 dark:text-gray-100',
                  isSubmitted && isCorrect && 'border-emerald-500 text-emerald-700 dark:text-emerald-300',
                  isSubmitted && !isCorrect && 'border-red-500 text-red-700 dark:text-red-300',
                  !isSubmitted && 'border-blue-400 focus:border-blue-500 dark:border-blue-500'
                )}
              />
            )}
          </span>
        ))}
      </p>
    );
  };

  return (
    <Card className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
      <CardContent className="p-6 space-y-4">
        {/* Instruction */}
        {instruction && (
          <p className="text-sm text-gray-500 dark:text-gray-400 italic">{instruction}</p>
        )}

        {/* Sentence with blank */}
        <div className="py-2">
          {renderSentence()}
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

export default FillInBlankExercise;

