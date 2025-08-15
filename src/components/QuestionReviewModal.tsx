import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, CheckCircle, XCircle } from "lucide-react";

interface QuestionReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  question: {
    questionNumber: number;
    question: string;
    text?: string;
    userAnswer: string;
    correctAnswer: string;
    explanation?: string;
    options?: string[];
    type?: string;
  } | null;
  passage: string;
}

const QuestionReviewModal: React.FC<QuestionReviewModalProps> = ({
  isOpen,
  onClose,
  question,
  passage
}) => {
  if (!question) return null;

  const highlightAnswerInPassage = (passageText: string, explanation?: string) => {
    // Simple highlighting logic - could be enhanced with more sophisticated text matching
    if (!explanation) return passageText;
    
    // Look for quoted text or key phrases in explanation that might reference passage content
    const quotedMatches = explanation.match(/"([^"]+)"/g);
    let highlightedText = passageText;
    
    if (quotedMatches) {
      quotedMatches.forEach(match => {
        const cleanMatch = match.slice(1, -1); // Remove quotes
        const regex = new RegExp(`(${cleanMatch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        highlightedText = highlightedText.replace(regex, '<mark class="bg-primary/20 px-1 rounded">$1</mark>');
      });
    }
    
    return highlightedText;
  };

  const isCorrect = question.userAnswer === question.correctAnswer;
  const highlightedPassage = highlightAnswerInPassage(passage, question.explanation);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden">
        <DialogHeader className="border-b border-border pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold text-foreground flex items-center gap-3">
              Question {question.questionNumber} Review
              {isCorrect ? (
                <CheckCircle className="w-6 h-6 text-green-600" />
              ) : (
                <XCircle className="w-6 h-6 text-red-600" />
              )}
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="flex gap-6 h-[calc(95vh-120px)] overflow-hidden">
          {/* Left Pane - Reading Passage */}
          <div className="flex-1 flex flex-col">
            <h3 className="text-lg font-semibold mb-3 text-foreground border-b border-border pb-2">
              Reading Passage
            </h3>
            <div 
              className="flex-1 bg-muted/30 p-6 rounded-lg text-sm text-foreground leading-relaxed overflow-y-auto"
              dangerouslySetInnerHTML={{ __html: highlightedPassage }}
            />
          </div>
          
          {/* Right Pane - Question Details */}
          <div className="flex-1 flex flex-col">
            <div className="flex-1 overflow-y-auto space-y-6">
              {/* Question Type */}
              {question.type && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                  <span className="text-sm font-medium text-primary">{question.type}</span>
                </div>
              )}
              
              {/* Question Text */}
              <div>
                <h3 className="text-lg font-semibold mb-3 text-foreground">Question</h3>
                <div className="bg-background border border-border rounded-lg p-4">
                  <p className="text-foreground font-medium">
                    {question.question || question.text}
                  </p>
                </div>
              </div>
              
              {/* Answer Options */}
              {question.options && question.options.length > 0 && (
                <div>
                  <h4 className="text-md font-semibold mb-3 text-foreground">Answer Options</h4>
                  <div className="space-y-2">
                    {question.options.map((option: string, index: number) => {
                      const isUserAnswer = option === question.userAnswer;
                      const isCorrectAnswer = option === question.correctAnswer;
                      
                      let bgClass = 'bg-background border-border';
                      let textClass = 'text-foreground';
                      
                      if (isCorrectAnswer) {
                        bgClass = 'bg-green-50 border-green-200';
                        textClass = 'text-green-700';
                      } else if (isUserAnswer && !isCorrect) {
                        bgClass = 'bg-red-50 border-red-200';
                        textClass = 'text-red-700';
                      }
                      
                      return (
                        <div
                          key={index}
                          className={`p-3 rounded border text-sm flex items-center gap-2 ${bgClass} ${textClass}`}
                        >
                          <span className="font-medium">
                            {String.fromCharCode(65 + index)}.
                          </span>
                          <span className="flex-1">{option}</span>
                          {isCorrectAnswer && <CheckCircle className="w-4 h-4 text-green-600" />}
                          {isUserAnswer && !isCorrect && <XCircle className="w-4 h-4 text-red-600" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Answer Comparison */}
              <div>
                <h4 className="text-md font-semibold mb-3 text-foreground">Answer Summary</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className={`rounded-lg p-4 border ${
                    isCorrect 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <h5 className={`font-semibold mb-2 ${
                      isCorrect ? 'text-green-700' : 'text-red-700'
                    }`}>
                      Your Answer
                    </h5>
                    <p className={`font-medium ${
                      isCorrect ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {question.userAnswer}
                    </p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h5 className="font-semibold text-green-700 mb-2">Correct Answer</h5>
                    <p className="text-green-600 font-medium">{question.correctAnswer}</p>
                  </div>
                </div>
              </div>
              
              {/* Explanation */}
              {question.explanation && (
                <div>
                  <h4 className="text-md font-semibold mb-3 text-foreground">Explanation</h4>
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                    <p className="text-foreground leading-relaxed">{question.explanation}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuestionReviewModal;