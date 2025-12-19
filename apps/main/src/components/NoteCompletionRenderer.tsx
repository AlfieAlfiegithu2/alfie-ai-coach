import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle } from 'lucide-react';
import { DiagramLabellingRenderer } from './DiagramLabellingRenderer';

interface StructureItem {
  order: number;
  label: string;
  displayText: string;
  isQuestion: boolean;
  questionNumber: number | null;
  value?: string;
  prefixText?: string;
  suffixText?: string;
  fullSentence?: boolean; // For sentence completion - display as full sentence
}

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

interface NoteCompletionRendererProps {
  questions: ListeningQuestion[];
  answers: Record<string, string>;
  onAnswerChange: (questionId: string, answer: string) => void;
  isSubmitted: boolean;
  partNumber?: string;
  taskInstructions?: string;
  questionRange?: string;
  structureItems?: StructureItem[];
  imageUrl?: string;
  imageUrls?: string[];
}

export const NoteCompletionRenderer: React.FC<NoteCompletionRendererProps> = ({
  questions,
  answers,
  onAnswerChange,
  isSubmitted,
  partNumber,
  taskInstructions,
  questionRange,
  structureItems
}) => {
  // Parse question_text to extract structure (fallback when no structureItems)
  const parseQuestionText = (question: ListeningQuestion) => {
    const text = question.question_text;

    const numberPattern = /\((\d+)\)/;
    const match = text.match(numberPattern);

    if (!match) {
      return {
        label: text.split(':')[0]?.trim() || '',
        prefix: '',
        suffix: '',
        fullText: text
      };
    }

    const questionNum = match[1];
    const parts = text.split(`(${questionNum})`);
    const labelMatch = text.match(/^([^:]+):/);
    const label = labelMatch ? labelMatch[1].trim() : '';

    let prefix = parts[0] || '';
    if (label && prefix.startsWith(label)) {
      prefix = prefix.substring(label.length).replace(/^:\s*/, '').trim();
    }

    let suffix = parts[1]?.replace(/[_\.]+\s*$/, '').trim() || '';

    return { label, prefix, suffix, fullText: text };
  };

  // Get question by number for structureItems rendering
  const getQuestionByNumber = (questionNumber: number) => {
    return questions.find(q => q.question_number === questionNumber);
  };

  // Derive first and last question numbers from questions
  const firstQ = questions.length > 0 ? Math.min(...questions.map(q => q.question_number)) : 1;
  const lastQ = questions.length > 0 ? Math.max(...questions.map(q => q.question_number)) : questions.length;
  const range = questionRange || `${firstQ}-${lastQ}`;

  // Check if we have structureItems to render the full IELTS paper layout
  const hasStructureItems = structureItems && structureItems.length > 0;

  // Deduplicate structureItems - remove items that are substrings of other items
  const deduplicatedStructureItems = hasStructureItems
    ? structureItems!.filter((item, index, arr) => {
      const itemLabel = (item.label || '').toLowerCase().trim();

      // Check if any OTHER item's label contains this item's label (making this one redundant)
      const isSubstringOfAnother = arr.some((other, otherIdx) => {
        if (otherIdx === index) return false;
        const otherLabel = (other.label || '').toLowerCase().trim();

        // If this item's label is a substring of another's and shorter, skip it
        if (itemLabel && otherLabel && otherLabel.includes(itemLabel) && otherLabel.length > itemLabel.length) {
          return true;
        }
        return false;
      });

      return !isSubstringOfAnother;
    })
    : [];

  return (
    <Card className="rounded-2xl border-2 border-yellow-400 shadow-lg overflow-hidden">
      {/* Yellow Header - Like IELTS Paper */}
      <CardHeader className="bg-gradient-to-r from-yellow-400 to-yellow-300 p-4 border-b-2 border-yellow-500">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-4">
            <span className="text-lg font-bold text-gray-900">
              {partNumber || 'Part 1'}
            </span>
            <span className="text-lg font-bold text-gray-900">
              Questions {range}
            </span>
          </div>
          <div className="text-base font-semibold text-gray-800">
            Complete the notes below.
          </div>
        </div>
        {taskInstructions && (
          <p className="text-sm font-bold text-gray-900 mt-2 uppercase tracking-wide">
            {taskInstructions}
          </p>
        )}
        {!taskInstructions && (
          <p className="text-sm font-bold text-gray-900 mt-2 uppercase tracking-wide">
            Write NO MORE THAN TWO WORDS OR A NUMBER for each answer.
          </p>
        )}
      </CardHeader>

      {/* Questions Body - Note Format with IELTS Paper Style */}
      <CardContent className="bg-white p-6">
        {hasStructureItems && deduplicatedStructureItems.length > 0 ? (
          // Render with structureItems (includes context items like "Make: Allegro")
          <div className="space-y-4">
            {deduplicatedStructureItems.map((item, index) => {
              if (item.isQuestion && item.questionNumber !== null) {
                // Render question item with input field
                const question = getQuestionByNumber(item.questionNumber);
                if (!question) return null;

                const questionId = question.id;
                const userAnswer = answers[questionId] || '';
                const isCorrect = userAnswer.toLowerCase().trim() === question.correct_answer.toLowerCase().trim();

                // Check if this is a full sentence (Sentence Completion type)
                const isFullSentence = item.fullSentence ||
                  (item.displayText && item.displayText.length > 50 && !item.label);

                if (isFullSentence) {
                  // FULL SENTENCE RENDERING - simple format like original IELTS
                  // Format: (16) The sentence text ......................... .

                  // Get clean sentence text
                  let sentenceText = item.displayText || question.question_text || '';
                  // Remove any existing question numbers from the text
                  sentenceText = sentenceText.replace(/^\s*\(?\d+\)?\s*/, '').trim();
                  sentenceText = sentenceText.replace(/\s*\(\d+\)\s*/g, ' ').trim();

                  // Find the position of the blank (dots or underscores)
                  // Replace ALL blanks with a single marker
                  const blankRegex = /[._]{3,}/g;
                  const hasBlank = blankRegex.test(sentenceText);

                  // Split into before and after the blank
                  const cleanText = sentenceText.replace(/[._]{3,}/g, '|SPLIT|').replace(/(\|SPLIT\|\s*)+/g, '|SPLIT|');
                  const [beforeBlank, afterBlank] = cleanText.split('|SPLIT|');

                  return (
                    <div
                      key={`q-${item.order}-${index}`}
                      className="py-2"
                    >
                      <div className="text-sm text-gray-800 leading-relaxed">
                        {/* Question number in red */}
                        <span className="text-red-600 font-bold mr-2">
                          ({item.questionNumber})
                        </span>

                        {/* Text before blank */}
                        <span>{beforeBlank}</span>

                        {/* The input - simple dotted underline style */}
                        {hasBlank && (
                          isSubmitted ? (
                            <span className={`mx-1 px-1 font-medium ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                              {userAnswer || '______'}
                              {!isCorrect && <span className="text-green-600 text-xs ml-1">({question.correct_answer})</span>}
                            </span>
                          ) : (
                            <input
                              type="text"
                              value={userAnswer}
                              onChange={(e) => onAnswerChange(questionId, e.target.value)}
                              className="
                                mx-1 w-32 px-1
                                border-0 border-b-2 border-dotted border-gray-400
                                bg-transparent
                                focus:border-blue-500 focus:outline-none
                                text-gray-800 text-sm
                              "
                              style={{
                                display: 'inline-block',
                                verticalAlign: 'baseline',
                                lineHeight: '1.5'
                              }}
                            />
                          )
                        )}

                        {/* Text after blank */}
                        {afterBlank && <span>{afterBlank}</span>}

                        {/* Result icon */}
                        {isSubmitted && (
                          <span className="ml-2 inline-flex items-center">
                            {isCorrect ? <CheckCircle className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-red-600" />}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                }

                // LABEL-BASED RENDERING (Note Completion, Form Completion)
                return (
                  <div
                    key={`q-${item.order}-${index}`}
                    className="flex items-center gap-3 py-3"
                  >
                    {/* Label Column */}
                    <div className="w-40 sm:w-48 flex-shrink-0">
                      <span className="font-semibold text-gray-900 text-base">
                        {item.label}
                      </span>
                    </div>

                    {/* Answer Area */}
                    <div className="flex-1 flex items-center gap-2 flex-wrap">
                      {/* Prefix text if any */}
                      {item.prefixText && (
                        <span className="text-gray-700 text-base">{item.prefixText}</span>
                      )}

                      {/* Question number in red parentheses */}
                      <span className="text-red-600 font-bold text-base">
                        ({item.questionNumber})
                      </span>

                      {/* Input field styled as dotted line - IELTS style */}
                      <div className="relative flex-1 min-w-[150px] max-w-[250px]">
                        {isSubmitted ? (
                          <div className={`
                            px-2 py-1 rounded border-b-2 
                            ${isCorrect
                              ? 'border-green-500 bg-green-50 text-green-800'
                              : 'border-red-500 bg-red-50 text-red-800'
                            }
                          `}>
                            <span className="font-medium">{userAnswer || '—'}</span>
                            {!isCorrect && (
                              <span className="text-xs text-green-700 ml-2">
                                ✓ {question.correct_answer}
                              </span>
                            )}
                          </div>
                        ) : (
                          <Input
                            type="text"
                            value={userAnswer}
                            onChange={(e) => onAnswerChange(questionId, e.target.value)}
                            placeholder="............................."
                            className="
                              border-0 border-b-2 border-dotted border-gray-400 
                              rounded-none bg-transparent px-1 py-0 h-8
                              focus:border-blue-500 focus:ring-0 focus:outline-none
                              text-gray-800 font-medium text-base
                              placeholder:text-gray-300 placeholder:tracking-[0.12em]
                            "
                          />
                        )}
                      </div>

                      {/* Suffix text if any */}
                      {item.suffixText && (
                        <span className="text-gray-700 text-base">{item.suffixText}</span>
                      )}

                      {/* Result indicator */}
                      {isSubmitted && (
                        <div className="ml-2 flex-shrink-0">
                          {isCorrect ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-600" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              } else {
                // Render context item (like "Make: Allegro") - NO input field
                // Get clean value - avoid duplication
                const cleanValue = getCleanContextValue(item);

                return (
                  <div
                    key={`ctx-${item.order}-${index}`}
                    className="flex items-center gap-3 py-3"
                  >
                    {/* Label Column */}
                    <div className="w-40 sm:w-48 flex-shrink-0">
                      <span className="font-semibold text-gray-900 text-base">
                        {item.label}
                      </span>
                    </div>

                    {/* Value - shown as static text (not editable) */}
                    <div className="flex-1">
                      <span className="text-gray-700 text-base">
                        {cleanValue}
                      </span>
                    </div>
                  </div>
                );
              }
            })}
          </div>
        ) : (
          // Fallback: Render questions only (when no structureItems available)
          <div className="space-y-1">
            {questions.map((question) => {
              const { label, prefix, suffix } = parseQuestionText(question);
              const questionId = question.id;
              const userAnswer = answers[questionId] || '';
              const isCorrect = userAnswer.toLowerCase().trim() === question.correct_answer.toLowerCase().trim();

              return (
                <div
                  key={questionId}
                  className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-b-0"
                >
                  {/* Label Column */}
                  <div className="w-40 sm:w-48 flex-shrink-0">
                    <span className="font-semibold text-gray-900 text-base">
                      {label || question.fieldLabel}
                    </span>
                  </div>

                  {/* Answer Area */}
                  <div className="flex-1 flex items-center gap-2 flex-wrap">
                    {prefix && (
                      <span className="text-gray-700 text-base">{prefix}</span>
                    )}

                    <span className="text-red-600 font-bold text-base">
                      ({question.question_number})
                    </span>

                    <div className="relative flex-1 min-w-[120px] max-w-[200px]">
                      {isSubmitted ? (
                        <div className={`
                          px-2 py-1 rounded border-b-2 
                          ${isCorrect
                            ? 'border-green-500 bg-green-50 text-green-800'
                            : 'border-red-500 bg-red-50 text-red-800'
                          }
                        `}>
                          <span className="font-medium">{userAnswer || '—'}</span>
                          {!isCorrect && (
                            <span className="text-xs text-green-700 ml-2">
                              ✓ {question.correct_answer}
                            </span>
                          )}
                        </div>
                      ) : (
                        <Input
                          type="text"
                          value={userAnswer}
                          onChange={(e) => onAnswerChange(questionId, e.target.value)}
                          placeholder="....................."
                          className="
                            border-0 border-b-2 border-dotted border-gray-400 
                            rounded-none bg-transparent px-1 py-0 h-8
                            focus:border-blue-500 focus:ring-0 focus:outline-none
                            text-red-600 font-medium text-base
                            placeholder:text-gray-300 placeholder:tracking-[0.15em]
                          "
                        />
                      )}
                    </div>

                    {suffix && (
                      <span className="text-gray-700 text-base">{suffix}</span>
                    )}

                    {isSubmitted && (
                      <div className="ml-2 flex-shrink-0">
                        {isCorrect ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Helper function to get clean context value without label duplication
const getCleanContextValue = (item: StructureItem): string => {
  const label = (item.label || '').trim().toLowerCase();
  let value = (item.value || '').trim();
  let displayText = (item.displayText || '').trim();

  // If value exists and is different from label, use it
  if (value && value.toLowerCase() !== label) {
    return value;
  }

  // Try to extract value from displayText by removing "label:" pattern
  let cleanText = displayText;
  const colonPattern = new RegExp(`^${item.label}\\s*:\\s*`, 'i');
  cleanText = cleanText.replace(colonPattern, '');

  // If after cleaning, text is same as label, return empty
  if (cleanText.toLowerCase() === label) {
    return '';
  }

  return cleanText;
};

// Form Completion Renderer - Similar but styled as a form
export const FormCompletionRenderer: React.FC<NoteCompletionRendererProps> = ({
  questions,
  answers,
  onAnswerChange,
  isSubmitted,
  partNumber,
  taskInstructions,
  questionRange
}) => {
  const firstQ = questions.length > 0 ? Math.min(...questions.map(q => q.question_number)) : 1;
  const lastQ = questions.length > 0 ? Math.max(...questions.map(q => q.question_number)) : questions.length;
  const range = questionRange || `${firstQ}-${lastQ}`;

  return (
    <Card className="rounded-2xl border-2 border-blue-400 shadow-lg overflow-hidden">
      {/* Blue Header for Form */}
      <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-400 p-4 border-b-2 border-blue-600">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-4">
            <span className="text-lg font-bold text-white">
              {partNumber || 'Part 1'}
            </span>
            <span className="text-lg font-bold text-white">
              Questions {range}
            </span>
          </div>
          <div className="text-base font-semibold text-white">
            Complete the form below.
          </div>
        </div>
        <p className="text-sm font-bold text-blue-100 mt-2 uppercase tracking-wide">
          {taskInstructions || 'Write NO MORE THAN THREE WORDS AND/OR A NUMBER for each answer.'}
        </p>
      </CardHeader>

      {/* Form Body - Grid Layout */}
      <CardContent className="bg-gray-50 p-6">
        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
          {questions.map((question) => {
            const labelMatch = question.question_text.match(/^([^:]+):/);
            const label = labelMatch ? labelMatch[1].trim() : question.fieldLabel || '';
            const questionId = question.id;
            const userAnswer = answers[questionId] || '';
            const isCorrect = userAnswer.toLowerCase().trim() === question.correct_answer.toLowerCase().trim();

            return (
              <div
                key={questionId}
                className="flex items-center p-4 hover:bg-gray-50 transition-colors"
              >
                {/* Label */}
                <div className="w-1/3 pr-4">
                  <label className="font-medium text-gray-700 text-sm uppercase tracking-wide">
                    {label}
                  </label>
                </div>

                {/* Input */}
                <div className="w-2/3 flex items-center gap-3">
                  <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 font-bold">
                    {question.question_number}
                  </Badge>

                  {isSubmitted ? (
                    <div className={`
                      flex-1 px-3 py-2 rounded-md border
                      ${isCorrect
                        ? 'border-green-400 bg-green-50 text-green-800'
                        : 'border-red-400 bg-red-50 text-red-800'
                      }
                    `}>
                      <span className="font-medium">{userAnswer || '—'}</span>
                      {!isCorrect && (
                        <span className="text-xs text-green-700 ml-2">
                          ✓ {question.correct_answer}
                        </span>
                      )}
                    </div>
                  ) : (
                    <Input
                      type="text"
                      value={userAnswer}
                      onChange={(e) => onAnswerChange(questionId, e.target.value)}
                      placeholder="Enter answer..."
                      className="flex-1 border-gray-300 focus:border-blue-500 focus:ring-blue-200"
                    />
                  )}

                  {isSubmitted && (
                    isCorrect ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )
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

// Table Completion Renderer
export const TableCompletionRenderer: React.FC<NoteCompletionRendererProps> = ({
  questions,
  answers,
  onAnswerChange,
  isSubmitted,
  partNumber,
  taskInstructions,
  questionRange
}) => {
  const firstQ = questions.length > 0 ? Math.min(...questions.map(q => q.question_number)) : 1;
  const lastQ = questions.length > 0 ? Math.max(...questions.map(q => q.question_number)) : questions.length;
  const range = questionRange || `${firstQ}-${lastQ}`;

  return (
    <Card className="rounded-2xl border-2 border-purple-400 shadow-lg overflow-hidden">
      {/* Purple Header for Table */}
      <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-400 p-4 border-b-2 border-purple-600">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-4">
            <span className="text-lg font-bold text-white">
              {partNumber || 'Part 2'}
            </span>
            <span className="text-lg font-bold text-white">
              Questions {range}
            </span>
          </div>
          <div className="text-base font-semibold text-white">
            Complete the table below.
          </div>
        </div>
        <p className="text-sm font-bold text-purple-100 mt-2 uppercase tracking-wide">
          {taskInstructions || 'Write NO MORE THAN TWO WORDS for each answer.'}
        </p>
      </CardHeader>

      {/* Table Body */}
      <CardContent className="bg-white p-4">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-purple-50">
                <th className="border border-purple-200 px-4 py-3 text-left font-semibold text-purple-900">
                  Category
                </th>
                <th className="border border-purple-200 px-4 py-3 text-left font-semibold text-purple-900">
                  Answer
                </th>
              </tr>
            </thead>
            <tbody>
              {questions.map((question) => {
                const labelMatch = question.question_text.match(/^([^:]+):/);
                const label = labelMatch ? labelMatch[1].trim() : question.fieldLabel || `Question ${question.question_number}`;
                const questionId = question.id;
                const userAnswer = answers[questionId] || '';
                const isCorrect = userAnswer.toLowerCase().trim() === question.correct_answer.toLowerCase().trim();

                return (
                  <tr key={questionId} className="hover:bg-purple-50/50 transition-colors">
                    <td className="border border-purple-200 px-4 py-3 font-medium text-gray-800">
                      {label}
                    </td>
                    <td className="border border-purple-200 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 font-bold flex-shrink-0">
                          {question.question_number}
                        </Badge>

                        {isSubmitted ? (
                          <div className={`
                            flex-1 px-3 py-1 rounded border
                            ${isCorrect
                              ? 'border-green-400 bg-green-50 text-green-800'
                              : 'border-red-400 bg-red-50 text-red-800'
                            }
                          `}>
                            {userAnswer || '—'}
                            {!isCorrect && (
                              <span className="text-xs text-green-700 ml-2">✓ {question.correct_answer}</span>
                            )}
                          </div>
                        ) : (
                          <Input
                            type="text"
                            value={userAnswer}
                            onChange={(e) => onAnswerChange(questionId, e.target.value)}
                            placeholder=".................."
                            className="flex-1 border-gray-300 focus:border-purple-500 focus:ring-purple-200"
                          />
                        )}

                        {isSubmitted && (
                          isCorrect ? (
                            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

// Multiple Choice Renderer - IMPORTANT for IELTS Reading
export const MultipleChoiceRenderer: React.FC<NoteCompletionRendererProps & { questionType?: string }> = ({
  questions,
  answers,
  onAnswerChange,
  isSubmitted,
  partNumber,
  taskInstructions,
  questionRange
}) => {
  const firstQ = questions.length > 0 ? Math.min(...questions.map(q => q.question_number)) : 1;
  const lastQ = questions.length > 0 ? Math.max(...questions.map(q => q.question_number)) : questions.length;
  const range = questionRange || `${firstQ}-${lastQ}`;

  return (
    <Card className="rounded-2xl border-2 border-blue-400 shadow-lg overflow-hidden">
      {/* Blue Header for Multiple Choice */}
      <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-500 p-4 border-b-2 border-blue-700">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-4">
            {partNumber && (
              <span className="text-lg font-bold text-white">
                {partNumber}
              </span>
            )}
            <span className="text-lg font-bold text-white">
              Questions {range}
            </span>
          </div>
          <div className="text-base font-semibold text-white">
            Choose the correct letter, A, B, C or D.
          </div>
        </div>
        {taskInstructions && (
          <p className="text-sm font-bold text-blue-100 mt-2 uppercase tracking-wide">
            {taskInstructions}
          </p>
        )}
      </CardHeader>

      {/* Questions Body */}
      <CardContent className="bg-white p-6">
        <div className="space-y-8">
          {questions.map((question) => {
            const questionId = question.id;
            const userAnswer = answers[questionId] || '';
            const correctAnswerLetter = question.correct_answer?.charAt(0).toUpperCase() || '';
            const userAnswerLetter = userAnswer.charAt(0).toUpperCase();
            const isCorrect = userAnswerLetter === correctAnswerLetter;

            // Get options from question
            const options = question.options || [];

            return (
              <div key={questionId} className="space-y-3">
                {/* Question Number and Text */}
                <div className="flex items-start gap-3">
                  <span className="text-lg font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full flex-shrink-0">
                    {question.question_number}
                  </span>
                  <p className="text-gray-800 font-medium text-base pt-1">
                    {question.question_text}
                  </p>
                </div>

                {/* Options */}
                <div className="ml-12 space-y-2">
                  {options.map((option, optIdx) => {
                    // Parse option format: "A   Some text" or just "A Some text"
                    const optionMatch = option.match(/^([A-D])[\s.]+(.+)$/i);
                    const letter = optionMatch ? optionMatch[1].toUpperCase() : String.fromCharCode(65 + optIdx);
                    const text = optionMatch ? optionMatch[2] : option;

                    const isSelected = userAnswerLetter === letter;
                    const isCorrectOption = correctAnswerLetter === letter;

                    return (
                      <label
                        key={letter}
                        className={`
                          flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all border-2
                          ${isSubmitted
                            ? isCorrectOption
                              ? 'border-green-400 bg-green-50'
                              : isSelected && !isCorrectOption
                                ? 'border-red-400 bg-red-50'
                                : 'border-gray-200 bg-gray-50'
                            : isSelected
                              ? 'border-blue-400 bg-blue-50'
                              : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                          }
                        `}
                      >
                        <input
                          type="radio"
                          name={`question-${questionId}`}
                          value={letter}
                          checked={isSelected}
                          onChange={(e) => onAnswerChange(questionId, e.target.value)}
                          disabled={isSubmitted}
                          className="mt-1 w-4 h-4 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="font-bold text-gray-700 flex-shrink-0">{letter}</span>
                        <span className={`flex-1 ${isSubmitted && isCorrectOption ? 'text-green-800 font-medium' : 'text-gray-700'}`}>
                          {text}
                        </span>
                        {isSubmitted && isCorrectOption && (
                          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                        )}
                        {isSubmitted && isSelected && !isCorrectOption && (
                          <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                        )}
                      </label>
                    );
                  })}
                </div>

                {/* Show correct answer if submitted and wrong */}
                {isSubmitted && !isCorrect && (
                  <div className="ml-12 text-sm text-green-700 bg-green-50 p-2 rounded">
                    ✓ Correct answer: <strong>{correctAnswerLetter}</strong>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

// Smart renderer that picks the right component based on question type
export const SmartQuestionRenderer: React.FC<NoteCompletionRendererProps & { questionType?: string }> = (props) => {
  const { questionType } = props;
  const type = questionType?.toLowerCase() || '';

  // Multiple Choice - MUST be handled first before other types
  if (type.includes('multiple choice') || type.includes('multiple_choice')) {
    return <MultipleChoiceRenderer {...props} />;
  }

  // Diagram/Map/Plan labelling - simple image + inputs below
  if (type.includes('diagram') || type.includes('map') || type.includes('plan') || type.includes('label')) {
    return <DiagramLabellingRenderer {...props} />;
  }

  if (type.includes('form')) {
    return <FormCompletionRenderer {...props} />;
  }

  if (type.includes('table')) {
    return <TableCompletionRenderer {...props} />;
  }

  if (type.includes('note') || type.includes('completion') || type.includes('summary') || type.includes('sentence')) {
    return <NoteCompletionRenderer {...props} />;
  }

  // Default to note completion for fill-in-the-blank style
  return <NoteCompletionRenderer {...props} />;
};

export default NoteCompletionRenderer;

