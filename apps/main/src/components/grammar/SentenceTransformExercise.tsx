import { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle, XCircle, Lightbulb, ArrowRight, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    const type = transformationType.toLowerCase();
    if (type.includes('passive')) return 'bg-purple-100 text-purple-700 border-purple-200';
    if (type.includes('reported') || type.includes('indirect')) return 'bg-blue-100 text-blue-700 border-blue-200';
    if (type.includes('conditional')) return 'bg-amber-100 text-amber-700 border-amber-200';
    if (type.includes('negative')) return 'bg-red-100 text-red-700 border-red-200';
    if (type.includes('question')) return 'bg-green-100 text-green-700 border-green-200';
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  return (
    <Card className="w-full">
      <CardContent className="p-6 space-y-4">
        {/* Transformation Type Badge */}
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-gray-500" />
          <span className={cn('text-xs font-medium px-2 py-1 rounded-full border', getTransformationColor())}>
            {transformationType}
          </span>
        </div>

        {/* Instruction */}
        <p className="text-sm text-muted-foreground">
          {instruction || `Transform the sentence (${transformationType}):`}
        </p>

        {/* Original Sentence */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-lg font-medium text-blue-800">{originalSentence}</p>
        </div>

        {/* Transformation Arrow */}
        <div className="flex items-center justify-center">
          <ArrowRight className="w-6 h-6 text-gray-400" />
        </div>

        {/* User Input */}
        <div className="space-y-2">
          {startingWord && (
            <p className="text-sm text-gray-600">
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
            isCorrect ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
          )}>
            <div className="flex items-center gap-2 mb-2">
              {isCorrect ? (
                <>
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                  <span className="font-semibold text-emerald-700">Correct!</span>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-red-500" />
                  <span className="font-semibold text-red-700">Not quite right</span>
                </>
              )}
            </div>

            {/* Show correct transformation */}
            <div className="p-3 bg-white rounded border mb-2">
              <p className="text-sm text-gray-600 mb-1">Correct transformation:</p>
              <p className="font-medium text-emerald-700">{correctAnswer}</p>
            </div>

            {explanation && (
              <p className={cn(
                'text-sm',
                isCorrect ? 'text-emerald-700' : 'text-red-700'
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

