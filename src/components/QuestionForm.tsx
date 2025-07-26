import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Save, X } from "lucide-react";

interface Question {
  id?: string;
  question_number: number;
  question_text: string;
  question_type: string;
  options?: string[];
  correct_answer: string;
  explanation: string;
}

interface QuestionFormProps {
  questions: Question[];
  onQuestionsChange: (questions: Question[]) => void;
  type: 'reading' | 'listening';
}

const QuestionForm = ({ questions, onQuestionsChange, type }: QuestionFormProps) => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const questionTypes = [
    { value: 'multiple_choice', label: 'Multiple Choice' },
    { value: 'fill_in_blank', label: 'Fill in the Blank' },
    { value: 'short_answer', label: 'Short Answer' },
    { value: 'matching', label: 'Matching' },
    { value: 'true_false_not_given', label: 'True/False/Not Given' }
  ];

  const addQuestion = () => {
    const newQuestion: Question = {
      question_number: questions.length + 1,
      question_text: '',
      question_type: 'multiple_choice',
      options: ['', '', '', ''],
      correct_answer: '',
      explanation: ''
    };
    onQuestionsChange([...questions, newQuestion]);
    setEditingIndex(questions.length);
  };

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    const updatedQuestions = [...questions];
    updatedQuestions[index] = { ...updatedQuestions[index], [field]: value };
    onQuestionsChange(updatedQuestions);
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    const updatedQuestions = [...questions];
    const options = [...(updatedQuestions[questionIndex].options || [])];
    options[optionIndex] = value;
    updatedQuestions[questionIndex] = { ...updatedQuestions[questionIndex], options };
    onQuestionsChange(updatedQuestions);
  };

  const addOption = (questionIndex: number) => {
    const updatedQuestions = [...questions];
    const options = [...(updatedQuestions[questionIndex].options || [])];
    options.push('');
    updatedQuestions[questionIndex] = { ...updatedQuestions[questionIndex], options };
    onQuestionsChange(updatedQuestions);
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const updatedQuestions = [...questions];
    const options = [...(updatedQuestions[questionIndex].options || [])];
    options.splice(optionIndex, 1);
    updatedQuestions[questionIndex] = { ...updatedQuestions[questionIndex], options };
    onQuestionsChange(updatedQuestions);
  };

  const removeQuestion = (index: number) => {
    const updatedQuestions = questions.filter((_, i) => i !== index);
    // Renumber questions
    updatedQuestions.forEach((q, i) => {
      q.question_number = i + 1;
    });
    onQuestionsChange(updatedQuestions);
    setEditingIndex(null);
  };

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === questions.length - 1)) {
      return;
    }

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const updatedQuestions = [...questions];
    [updatedQuestions[index], updatedQuestions[newIndex]] = [updatedQuestions[newIndex], updatedQuestions[index]];
    
    // Update question numbers
    updatedQuestions.forEach((q, i) => {
      q.question_number = i + 1;
    });
    
    onQuestionsChange(updatedQuestions);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-georgia font-bold text-foreground">Questions ({questions.length})</h3>
        <Button 
          onClick={addQuestion}
          className="rounded-xl"
          style={{ background: 'var(--gradient-button)', border: 'none' }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Question
        </Button>
      </div>

      {questions.length === 0 ? (
        <Card className="rounded-2xl border-light-border" style={{ background: 'var(--gradient-card)' }}>
          <CardContent className="p-8 text-center">
            <p className="text-warm-gray">No questions added yet. Click "Add Question" to start.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {questions.map((question, index) => (
            <Card key={index} className="rounded-2xl border-light-border shadow-soft" style={{ background: 'var(--gradient-card)' }}>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-sm">Q{question.question_number}</Badge>
                    <Badge variant="outline" className="text-xs">{questionTypes.find(t => t.value === question.question_type)?.label}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    {index > 0 && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => moveQuestion(index, 'up')}
                        className="rounded-xl border-light-border text-xs"
                      >
                        ↑
                      </Button>
                    )}
                    {index < questions.length - 1 && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => moveQuestion(index, 'down')}
                        className="rounded-xl border-light-border text-xs"
                      >
                        ↓
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => setEditingIndex(editingIndex === index ? null : index)}
                      className="rounded-xl border-light-border"
                    >
                      {editingIndex === index ? <X className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive" 
                      onClick={() => removeQuestion(index)}
                      className="rounded-xl"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {editingIndex === index ? (
                  <>
                    {/* Question Text */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Question Text</label>
                      <Textarea
                        value={question.question_text}
                        onChange={(e) => updateQuestion(index, 'question_text', e.target.value)}
                        placeholder="Enter the question..."
                        rows={3}
                        className="rounded-xl border-light-border"
                      />
                    </div>

                    {/* Question Type */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Question Type</label>
                      <Select 
                        value={question.question_type} 
                        onValueChange={(value) => updateQuestion(index, 'question_type', value)}
                      >
                        <SelectTrigger className="rounded-xl border-light-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-light-border bg-card">
                          {questionTypes.map(type => (
                            <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Options (for multiple choice) */}
                    {question.question_type === 'multiple_choice' && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium text-foreground">Answer Options</label>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => addOption(index)}
                            className="rounded-xl border-light-border text-xs"
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Add Option
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {(question.options || []).map((option, optionIndex) => (
                            <div key={optionIndex} className="flex items-center gap-2">
                              <span className="text-sm text-warm-gray w-8">{String.fromCharCode(65 + optionIndex)}.</span>
                              <Input
                                value={option}
                                onChange={(e) => updateOption(index, optionIndex, e.target.value)}
                                placeholder={`Option ${String.fromCharCode(65 + optionIndex)}`}
                                className="flex-1 rounded-xl border-light-border"
                              />
                              {(question.options || []).length > 2 && (
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => removeOption(index, optionIndex)}
                                  className="rounded-xl border-light-border"
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Correct Answer */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Correct Answer</label>
                      {question.question_type === 'multiple_choice' ? (
                        <Select 
                          value={question.correct_answer} 
                          onValueChange={(value) => updateQuestion(index, 'correct_answer', value)}
                        >
                          <SelectTrigger className="rounded-xl border-light-border">
                            <SelectValue placeholder="Select correct option" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-light-border bg-card">
                            {(question.options || []).map((option, optionIndex) => (
                              <SelectItem key={optionIndex} value={option}>
                                {String.fromCharCode(65 + optionIndex)}. {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          value={question.correct_answer}
                          onChange={(e) => updateQuestion(index, 'correct_answer', e.target.value)}
                          placeholder="Enter the correct answer"
                          className="rounded-xl border-light-border"
                        />
                      )}
                    </div>

                    {/* Explanation */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Explanation</label>
                      <Textarea
                        value={question.explanation}
                        onChange={(e) => updateQuestion(index, 'explanation', e.target.value)}
                        placeholder="Explain why this is the correct answer..."
                        rows={3}
                        className="rounded-xl border-light-border"
                      />
                    </div>
                  </>
                ) : (
                  // Display mode
                  <div className="space-y-3">
                    <div>
                      <p className="font-medium text-foreground">{question.question_text || 'No question text'}</p>
                    </div>
                    
                    {question.question_type === 'multiple_choice' && question.options && (
                      <div className="space-y-1">
                        {question.options.map((option, optionIndex) => (
                          <div key={optionIndex} className={`flex items-center gap-2 p-2 rounded-lg ${option === question.correct_answer ? 'bg-green-50 border border-green-200' : 'bg-background/50'}`}>
                            <span className="text-sm text-warm-gray w-6">{String.fromCharCode(65 + optionIndex)}.</span>
                            <span className={`text-sm ${option === question.correct_answer ? 'text-green-800 font-medium' : 'text-foreground'}`}>
                              {option || `Option ${String.fromCharCode(65 + optionIndex)}`}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {question.question_type !== 'multiple_choice' && (
                      <div className="p-2 bg-green-50 border border-green-200 rounded-lg">
                        <span className="text-sm text-green-800 font-medium">Answer: {question.correct_answer || 'No answer set'}</span>
                      </div>
                    )}
                    
                    {question.explanation && (
                      <div className="p-3 bg-gentle-blue/10 rounded-lg">
                        <span className="text-sm text-foreground">
                          <strong>Explanation:</strong> {question.explanation}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default QuestionForm;