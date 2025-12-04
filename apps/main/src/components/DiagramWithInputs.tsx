import React, { useState, useRef } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

interface DiagramQuestion {
  id: string;
  question_number: number;
  question_text: string;
  correct_answer: string;
  // Position on the diagram (percentage-based for responsiveness)
  position?: {
    x: number; // 0-100 percentage from left
    y: number; // 0-100 percentage from top
  };
  // Optional label text that appears near the blank
  label?: string;
  // Optional prefix/suffix for the blank
  prefixText?: string;
  suffixText?: string;
}

interface DiagramWithInputsProps {
  imageUrl: string;
  questions: DiagramQuestion[];
  answers: Record<string, string>;
  onAnswerChange: (questionId: string, answer: string) => void;
  isSubmitted: boolean;
  partNumber?: string;
  taskInstructions?: string;
  questionRange?: string;
  // If true, show in admin edit mode with draggable positions
  editMode?: boolean;
  onPositionChange?: (questionNumber: number, position: { x: number; y: number }) => void;
}

export const DiagramWithInputs: React.FC<DiagramWithInputsProps> = ({
  imageUrl,
  questions,
  answers,
  onAnswerChange,
  isSubmitted,
  partNumber,
  taskInstructions,
  questionRange,
  editMode = false,
  onPositionChange
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [draggingQuestion, setDraggingQuestion] = useState<number | null>(null);

  // Calculate question range from questions
  const firstQ = questions.length > 0 ? Math.min(...questions.map(q => q.question_number)) : 1;
  const lastQ = questions.length > 0 ? Math.max(...questions.map(q => q.question_number)) : questions.length;
  const range = questionRange || `${firstQ}-${lastQ}`;

  // Handle drag start in edit mode
  const handleDragStart = (e: React.MouseEvent, questionNumber: number) => {
    if (!editMode) return;
    e.preventDefault();
    setDraggingQuestion(questionNumber);
  };

  // Handle drag move
  const handleDragMove = (e: React.MouseEvent) => {
    if (!editMode || draggingQuestion === null || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    // Clamp values between 0 and 100
    const clampedX = Math.max(0, Math.min(100, x));
    const clampedY = Math.max(0, Math.min(100, y));
    
    if (onPositionChange) {
      onPositionChange(draggingQuestion, { x: clampedX, y: clampedY });
    }
  };

  // Handle drag end
  const handleDragEnd = () => {
    setDraggingQuestion(null);
  };

  // Default positions if not specified - spread around diagram edges like real IELTS
  const getDefaultPosition = (index: number, total: number): { x: number; y: number } => {
    // Arrange questions around the edges of the image to point to different parts
    // These positions mimic typical IELTS diagram labelling layouts
    const positions = [
      { x: 50, y: 12 },   // Top center (e.g., "level light")
      { x: 85, y: 25 },   // Right upper
      { x: 88, y: 45 },   // Right middle (e.g., "boiler")
      { x: 12, y: 55 },   // Left middle (e.g., "ON-OFF switch", "tap")
      { x: 35, y: 88 },   // Bottom left (e.g., "drainage")
      { x: 70, y: 85 },   // Bottom right (e.g., "Filter")
      { x: 15, y: 30 },   // Left upper
      { x: 50, y: 70 },   // Center bottom
      { x: 25, y: 70 },   // Lower left
      { x: 75, y: 70 },   // Lower right
    ];
    return positions[index % positions.length] || { x: 50, y: 50 };
  };

  return (
    <div className="space-y-4">
      {/* Header - Yellow IELTS style */}
      <div className="bg-yellow-400 p-4 border-b-2 border-yellow-600">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-6">
            <span className="text-lg font-bold text-black italic">
              {partNumber || 'Part - 2'}
            </span>
            <span className="text-lg font-bold text-black">
              Questions {range}
            </span>
          </div>
          <div className="text-base font-bold text-black">
            Complete the diagram below.
          </div>
          <p className="text-sm font-bold text-black">
            {taskInstructions || 'Write ONE WORD ONLY for each answer.'}
          </p>
        </div>
      </div>

      {/* Diagram Container - White background like IELTS paper */}
      <div 
        ref={containerRef}
        className="relative bg-white overflow-hidden"
        onMouseMove={editMode ? handleDragMove : undefined}
        onMouseUp={editMode ? handleDragEnd : undefined}
        onMouseLeave={editMode ? handleDragEnd : undefined}
      >
        {/* The Diagram Image */}
        <img 
          src={imageUrl} 
          alt="Diagram for labelling"
          className="w-full h-auto"
          onLoad={() => setImageLoaded(true)}
          draggable={false}
        />

        {/* Overlay Input Fields */}
        {imageLoaded && questions.map((question, index) => {
          const position = question.position || getDefaultPosition(index, questions.length);
          const questionId = question.id;
          const userAnswer = answers[questionId] || '';
          const isCorrect = isSubmitted && userAnswer.toLowerCase().trim() === question.correct_answer.toLowerCase().trim();
          const isWrong = isSubmitted && userAnswer && !isCorrect;

          return (
            <div
              key={questionId}
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 ${editMode ? 'cursor-move' : ''}`}
              style={{
                left: `${position.x}%`,
                top: `${position.y}%`,
                zIndex: draggingQuestion === question.question_number ? 100 : 10
              }}
              onMouseDown={(e) => handleDragStart(e, question.question_number)}
            >
              {/* IELTS-style inline blank - blends with photo */}
              <div className={`
                flex items-center gap-0.5
                ${editMode ? 'bg-blue-100/50 rounded px-1 cursor-move' : ''}
              `}>
                {/* Question Number in red parentheses - like real IELTS */}
                <span className={`
                  font-bold text-sm
                  ${isCorrect ? 'text-green-600' : isWrong ? 'text-red-600' : 'text-red-600'}
                `}>
                  ({question.question_number})
                </span>

                {/* The blank/input - styled like dotted line on paper */}
                <div className="relative mx-0.5">
                  {isSubmitted ? (
                    <span className={`
                      font-medium text-sm px-1
                      ${isCorrect ? 'text-green-700 bg-green-100/80 rounded' : 'text-red-700 bg-red-100/80 rounded'}
                    `}>
                      {userAnswer || '___'}
                      {isWrong && (
                        <span className="text-green-600 text-xs ml-1">
                          ({question.correct_answer})
                        </span>
                      )}
                    </span>
                  ) : (
                    <input
                      type="text"
                      value={userAnswer}
                      onChange={(e) => onAnswerChange(questionId, e.target.value)}
                      placeholder="..............."
                      className="
                        w-20 text-sm px-1 py-0 h-5
                        bg-transparent border-0 border-b border-dotted border-gray-600
                        focus:outline-none focus:border-red-500 focus:border-solid
                        text-gray-800 font-medium
                        placeholder:text-gray-400 placeholder:tracking-wider
                      "
                      style={{ 
                        background: 'transparent',
                        borderBottom: '2px dotted #666'
                      }}
                      disabled={editMode}
                    />
                  )}
                </div>

                {/* Suffix Text (like "level light", "tap", etc.) */}
                {question.suffixText && (
                  <span className="text-sm text-gray-800 font-medium whitespace-nowrap">
                    {question.suffixText}
                  </span>
                )}

                {/* Prefix/Label before the number (like "drainage", "Filter") */}
                {question.label && !question.suffixText && (
                  <span className="text-sm text-gray-800 font-medium whitespace-nowrap ml-0.5">
                    {question.label}
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {/* Edit Mode Instructions */}
        {editMode && (
          <div className="absolute bottom-2 left-2 right-2 bg-blue-600/90 text-white text-xs p-2 rounded-lg">
            <strong>Edit Mode:</strong> Drag the question badges to position them on the diagram. 
            Click and drag any question number to reposition it.
          </div>
        )}
      </div>

      {/* Answer summary below diagram - shown after submission */}
      {isSubmitted && (
        <div className="bg-gray-50 rounded-b-lg p-4 border-t border-gray-200">
          <h4 className="font-semibold text-gray-700 mb-3 text-sm">Your Answers:</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {questions.map((question) => {
              const questionId = question.id;
              const userAnswer = answers[questionId] || '';
              const isCorrect = userAnswer.toLowerCase().trim() === question.correct_answer.toLowerCase().trim();

              return (
                <div 
                  key={questionId}
                  className={`
                    flex items-center gap-2 p-2 rounded border text-sm
                    ${isCorrect ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}
                  `}
                >
                  <span className="font-bold text-red-600">({question.question_number})</span>
                  <span className={isCorrect ? 'text-green-700' : 'text-red-700'}>
                    {userAnswer || '—'}
                  </span>
                  {isCorrect ? (
                    <CheckCircle className="w-4 h-4 text-green-600 ml-auto" />
                  ) : (
                    <span className="text-green-600 text-xs ml-auto">
                      ✓ {question.correct_answer}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default DiagramWithInputs;

