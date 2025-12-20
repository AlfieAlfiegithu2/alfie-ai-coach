import MultipleChoiceExercise from './MultipleChoiceExercise';
import FillInBlankExercise from './FillInBlankExercise';
import ErrorCorrectionExercise from './ErrorCorrectionExercise';
import SentenceTransformExercise from './SentenceTransformExercise';
import DragDropExercise from './DragDropExercise';

export type ExerciseType =
  | 'multiple_choice'
  | 'fill_in_blank'
  | 'error_correction'
  | 'sentence_transformation'
  | 'drag_drop_reorder';

export interface ExerciseData {
  id: string | number;
  type: ExerciseType;
  question?: string;
  instruction?: string;
  correctAnswer: string;
  incorrectAnswers?: string[];
  acceptableAnswers?: string[];
  explanation?: string;
  hint?: string;

  // For fill_in_blank
  sentenceWithBlank?: string;

  // For error_correction
  incorrectSentence?: string;
  errorHighlight?: string;

  // For sentence_transformation
  originalSentence?: string;
  transformationType?: string;
  startingWord?: string;

  // For drag_drop
  words?: string[];
  correctOrder?: string[];
}

interface GrammarExerciseProps {
  exercise: ExerciseData;
  onComplete: (isCorrect: boolean, answer: string) => void;
  showResult?: boolean;
}

const GrammarExercise = ({ exercise, onComplete, showResult = true }: GrammarExerciseProps) => {
  switch (exercise.type) {
    case 'multiple_choice':
      return (
        <MultipleChoiceExercise
          question={exercise.question || ''}
          instruction={exercise.instruction}
          correctAnswer={exercise.correctAnswer}
          incorrectAnswers={exercise.incorrectAnswers || []}
          explanation={exercise.explanation}
          hint={exercise.hint}
          onComplete={onComplete}
          showResult={showResult}
        />
      );

    case 'fill_in_blank':
      return (
        <FillInBlankExercise
          sentence={exercise.sentenceWithBlank || exercise.question || ''}
          instruction={exercise.instruction}
          correctAnswer={exercise.correctAnswer}
          acceptableAnswers={exercise.acceptableAnswers}
          explanation={exercise.explanation}
          hint={exercise.hint}
          onComplete={onComplete}
          showResult={showResult}
        />
      );

    case 'error_correction':
      return (
        <ErrorCorrectionExercise
          incorrectSentence={exercise.incorrectSentence || exercise.question || ''}
          instruction={exercise.instruction}
          correctAnswer={exercise.correctAnswer}
          acceptableAnswers={exercise.acceptableAnswers}
          explanation={exercise.explanation}
          hint={exercise.hint}
          errorHighlight={exercise.errorHighlight}
          onComplete={onComplete}
          showResult={showResult}
        />
      );

    case 'sentence_transformation':
      return (
        <SentenceTransformExercise
          originalSentence={exercise.originalSentence || exercise.question || ''}
          instruction={exercise.instruction}
          transformationType={exercise.transformationType || 'transformation'}
          correctAnswer={exercise.correctAnswer}
          acceptableAnswers={exercise.acceptableAnswers}
          startingWord={exercise.startingWord}
          explanation={exercise.explanation}
          hint={exercise.hint}
          onComplete={onComplete}
          showResult={showResult}
        />
      );

    case 'drag_drop_reorder':
      return (
        <DragDropExercise
          instruction={exercise.instruction}
          words={exercise.words || exercise.correctOrder || []}
          correctOrder={exercise.correctOrder || []}
          explanation={exercise.explanation}
          hint={exercise.hint}
          onComplete={onComplete}
          showResult={showResult}
        />
      );

    default:
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">Unknown exercise type: {exercise.type}</p>
        </div>
      );
  }
};

export default GrammarExercise;

