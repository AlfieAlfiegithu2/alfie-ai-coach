import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { CheckCircle, XCircle } from 'lucide-react';

interface ListeningQuestion {
  id: string;
  question_text: string;
  question_number: number;
  options?: string[];
  correct_answer: string;
  question_type: string;
  explanation: string;
  fieldLabel?: string;
}

interface DiagramLabellingRendererProps {
  questions: ListeningQuestion[];
  answers: Record<string, string>;
  onAnswerChange: (questionId: string, answer: string) => void;
  isSubmitted: boolean;
  partNumber?: string;
  taskInstructions?: string;
  questionRange?: string;
  imageUrl?: string;
  imageUrls?: string[];
}

export const DiagramLabellingRenderer: React.FC<DiagramLabellingRendererProps> = ({
  questions,
  answers,
  onAnswerChange,
  isSubmitted,
  partNumber,
  taskInstructions,
  questionRange,
  imageUrl,
  imageUrls
}) => {
  // Derive first and last question numbers from questions
  const firstQ = questions.length > 0 ? Math.min(...questions.map(q => q.question_number)) : 1;
  const lastQ = questions.length > 0 ? Math.max(...questions.map(q => q.question_number)) : questions.length;
  const range = questionRange || `${firstQ}-${lastQ}`;

  // Get all images to display
  const allImages = imageUrls && imageUrls.length > 0 ? imageUrls : (imageUrl ? [imageUrl] : []);

  return (
    <Card className="rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Simple Header */}
      <CardHeader className="bg-gray-50 p-4 border-b">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="text-base font-semibold text-gray-800">
              {partNumber || 'Part 2'}
            </span>
            <span className="text-sm text-gray-500">
              Questions {range}
            </span>
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          {taskInstructions || 'Write ONE WORD ONLY for each answer.'}
        </p>
      </CardHeader>

      <CardContent className="p-0">
        {/* Diagram Image - Full width display */}
        {allImages.length > 0 && (
          <div className="border-b border-gray-200">
            {allImages.map((imgUrl, idx) => (
              <img
                key={idx}
                src={imgUrl}
                alt={`Diagram ${idx + 1}`}
                className="w-full h-auto"
              />
            ))}
          </div>
        )}

        {/* Simple Questions List */}
        <div className="p-4 space-y-3">
          {questions.map((question) => {
            const questionId = question.id;
            const userAnswer = answers[questionId] || '';
            const isCorrect = userAnswer.toLowerCase().trim() === question.correct_answer.toLowerCase().trim();
            
            return (
              <div 
                key={questionId}
                className="flex items-center gap-3"
              >
                {/* Question number */}
                <span className="text-red-600 font-bold text-sm w-8 flex-shrink-0">
                  {question.question_number}.
                </span>

                {/* Input */}
                <div className="flex-1 max-w-xs">
                  {isSubmitted ? (
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded border ${
                      isCorrect
                        ? 'border-green-300 bg-green-50'
                        : 'border-red-300 bg-red-50'
                    }`}>
                      <span className={`font-medium ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                        {userAnswer || '—'}
                      </span>
                      {!isCorrect && (
                        <span className="text-xs text-green-600 ml-auto">
                          ✓ {question.correct_answer}
                        </span>
                      )}
                      {isCorrect ? (
                        <CheckCircle className="w-4 h-4 text-green-600 ml-auto flex-shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                      )}
                    </div>
                  ) : (
                    <Input
                      type="text"
                      value={userAnswer}
                      onChange={(e) => onAnswerChange(questionId, e.target.value)}
                      placeholder="........................"
                      className="h-8 border-gray-300 focus:border-blue-500 text-sm"
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default DiagramLabellingRenderer;
