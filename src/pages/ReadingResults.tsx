import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, 
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  Trash2,
  Eye
} from "lucide-react";
import Header from '@/components/Header';
import LoadingAnimation from '@/components/animations/LoadingAnimation';
import QuestionReviewModal from '@/components/QuestionReviewModal';

interface ReadingResult {
  id: string;
  created_at: string;
  passage_title: string;
  passage_text?: string;
  questions_data: any;
  user_answers?: any;
  reading_time_seconds: number;
  comprehension_score: number;
  question_type_performance: any;
  detailed_feedback: string;
}

interface ProcessedQuestion {
  questionNumber: number;
  question: string;
  text?: string;
  userAnswer: string;
  correctAnswer: string;
  explanation?: string;
  options?: string[];
  type?: string;
  isCorrect: boolean;
}

const ReadingResults = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [results, setResults] = useState<ReadingResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuestion, setSelectedQuestion] = useState<ProcessedQuestion | null>(null);
  const [selectedPassage, setSelectedPassage] = useState<string>('');
  const [removedQuestions, setRemovedQuestions] = useState<Set<string>>(new Set());
  const [processedResultsMap, setProcessedResultsMap] = useState<{ [key: string]: ProcessedQuestion[] }>({});

  useEffect(() => {
    if (user) {
      loadReadingResults();
    }
  }, [user]);

  useEffect(() => {
    // Process questions when results change
    const processAllResults = async () => {
      const newProcessedMap: { [key: string]: ProcessedQuestion[] } = {};
      
      for (const result of results) {
        newProcessedMap[result.id] = await processQuestions(result);
      }
      
      setProcessedResultsMap(newProcessedMap);
    };

    if (results.length > 0) {
      processAllResults();
    }
  }, [results]);

  const loadReadingResults = async () => {
    try {
      // Fetch reading test results
      const { data: readingResults, error } = await supabase
        .from('reading_test_results')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching reading results:', error);
        return;
      }

      setResults(readingResults || []);
    } catch (error) {
      console.error('Error loading reading results:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const processQuestions = async (result: ReadingResult): Promise<ProcessedQuestion[]> => {
    if (!result.questions_data) return [];
    
    const processedQuestions: ProcessedQuestion[] = [];
    const questions = result.questions_data.questions || result.questions_data;
    
    if (Array.isArray(questions)) {
      // Extract question IDs to fetch full question data with options
      const questionIds = questions
        .map((q: any) => q.id || q.question_id)
        .filter(Boolean);
      
      console.log('Extracted question IDs:', questionIds);
      
      let questionDetailsMap: { [key: string]: any } = {};
      
      if (questionIds.length > 0) {
        try {
          // Fetch question details including choices from the questions table
          const { data: questionDetails, error } = await supabase
            .from('questions')
            .select('id, choices, question_type, question_text')
            .in('id', questionIds);
          
          console.log('Fetched question details:', questionDetails);
          console.log('Query error:', error);
          
          if (questionDetails) {
            questionDetailsMap = questionDetails.reduce((acc: any, q: any) => {
              acc[q.id] = q;
              return acc;
            }, {});
          }
        } catch (error) {
          console.error('Error fetching question details:', error);
        }
      }
      
      questions.forEach((question: any, index: number) => {
        // Extract data from the question object itself
        const userAnswer = question.user_answer || '';
        const correctAnswer = question.correct_answer || question.answer || '';
        const isCorrect = question.is_correct !== undefined ? question.is_correct : (userAnswer === correctAnswer);
        
        // Only include incorrect answers for this "Incorrect Answer Notes" page
        if (!isCorrect) {
          const questionId = question.id || question.question_id;
          const questionDetails = questionDetailsMap[questionId];
          let options: string[] = [];
          
          console.log(`Processing question ${index + 1}:`, {
            questionId,
            questionDetails,
            correctAnswer,
            userAnswer,
            rawChoices: questionDetails?.choices
          });
          
          // Parse choices if available
          if (questionDetails?.choices && questionDetails.choices.trim() !== '') {
            console.log('Parsing choices for question:', questionId, 'Raw choices:', questionDetails.choices);
            
            // Split choices by semicolon and clean up
            const rawChoices = questionDetails.choices
              .split(';')
              .map((choice: string) => choice.trim())
              .filter((choice: string) => choice.length > 0);
            
            // Determine the format and parse accordingly
            if (rawChoices.length > 0) {
              const firstChoice = rawChoices[0];
              
              if (firstChoice.match(/^[ivxlc]+\.\s*/i)) {
                // Roman numeral format (i., ii., iii.) - convert to A, B, C format
                options = rawChoices.map((choice: string, index: number) => {
                  const cleanText = choice.replace(/^[ivxlc]+\.\s*/i, '').trim();
                  const letter = String.fromCharCode(65 + index); // A, B, C, etc.
                  return `${letter}. ${cleanText}`;
                });
                console.log('Parsed roman numeral format to:', options);
              } else if (firstChoice.match(/^[A-Z]\)\s*/)) {
                // Letter format with parentheses (A), B), C)) - keep as is but standardize
                options = rawChoices.map((choice: string) => {
                  // Convert A) format to A. format for consistency
                  return choice.replace(/^([A-Z])\)\s*/, '$1. ');
                });
                console.log('Parsed letter format to:', options);
              } else {
                // Fallback - add letters if no format detected
                options = rawChoices.map((choice: string, index: number) => {
                  const letter = String.fromCharCode(65 + index);
                  return `${letter}. ${choice}`;
                });
                console.log('Used fallback format to:', options);
              }
            }
          } else {
            // Check if this appears to be a multiple choice question based on the answer format
            const answerPattern = /^[A-Z]$/;
            if (answerPattern.test(correctAnswer) || answerPattern.test(userAnswer)) {
              console.log('Question appears to be multiple choice but has no stored options:', questionId);
              // This is likely a multiple choice question missing its options
              options = [`Missing option data - this appears to be a multiple choice question with answer: ${correctAnswer}`];
            }
            console.log('No choices found for question:', questionId, 'Question details:', questionDetails);
          }
          
          processedQuestions.push({
            questionNumber: index + 1,
            question: question.question_text || question.question || question.text || '',
            text: question.question_text || question.text,
            userAnswer: userAnswer,
            correctAnswer: correctAnswer,
            explanation: question.explanation || '',
            options: options,
            type: question.type || question.question_type || questionDetails?.question_type || '',
            isCorrect: isCorrect
          });
        }
      });
    }
    
    return processedQuestions;
  };

  const handleQuestionClick = (question: ProcessedQuestion, passage: string) => {
    setSelectedQuestion(question);
    setSelectedPassage(passage);
  };

  const removeQuestion = (resultId: string, questionNumber: number) => {
    const questionKey = `${resultId}-${questionNumber}`;
    setRemovedQuestions(prev => new Set([...prev, questionKey]));
  };

  const removeAllIncorrectAnswers = (resultId: string, questions: ProcessedQuestion[]) => {
    const incorrectQuestionKeys = questions
      .filter(q => !q.isCorrect)
      .map(q => `${resultId}-${q.questionNumber}`);
    
    setRemovedQuestions(prev => {
      const newSet = new Set(prev);
      incorrectQuestionKeys.forEach(key => newSet.add(key));
      return newSet;
    });
  };

  const isQuestionRemoved = (resultId: string, questionNumber: number) => {
    return removedQuestions.has(`${resultId}-${questionNumber}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingAnimation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-background border-b border-border/20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-4 mb-2">
            <Button variant="ghost" onClick={() => navigate('/dashboard')} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Incorrect Answer Notes</h1>
              <p className="text-muted-foreground">Review and manage your incorrect answers to improve learning</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Test Results List */}
        <div className="space-y-8">
          {results.length > 0 ? (
            results.map((result) => {
              const questions = processedResultsMap[result.id];
              
              // Add debugging and safety checks
              console.log('Processing result:', result.id, 'Questions from map:', questions);
              
              // Ensure questions is always an array
              const safeQuestions = Array.isArray(questions) ? questions : [];
              const allQuestions = result.questions_data.questions || result.questions_data || [];
              const totalQuestions = Array.isArray(allQuestions) ? allQuestions.length : 0;
              const incorrectCount = safeQuestions.length;
              const visibleQuestions = safeQuestions.filter(q => !isQuestionRemoved(result.id, q.questionNumber));
              // Only show result if there are visible questions remaining
              if (visibleQuestions.length === 0) {
                return null; // Hide the entire result card when no questions remain
              }

              return (
                <Card key={result.id} className="bg-gradient-to-br from-card to-card/80 border-0 shadow-lg">
                  <CardHeader className="border-b border-border/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-xl font-bold text-foreground">
                          {result.passage_title || 'Reading Test'}
                        </CardTitle>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {formatTime(result.reading_time_seconds || 0)}
                          </span>
                          <span>{new Date(result.created_at).toLocaleDateString()}</span>
                          <span className="text-foreground font-medium">
                            {totalQuestions - incorrectCount}/{totalQuestions} correct
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-foreground">
                        Incorrect Answer Notes ({visibleQuestions.length} remaining)
                      </h3>
                      {visibleQuestions.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeAllIncorrectAnswers(result.id, visibleQuestions)}
                          className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Clear All Incorrect
                        </Button>
                      )}
                    </div>
                    
                    {visibleQuestions.length > 0 ? (
                      <div className="space-y-3">
                        {visibleQuestions.map((question, index) => (
                          <div
                            key={index}
                            className={`p-4 border rounded-lg transition-all ${
                              question.isCorrect 
                                ? 'bg-green-50 border-green-200' 
                                : 'bg-red-50 border-red-200'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-muted-foreground">
                                    Q{question.questionNumber}
                                  </span>
                                  {question.isCorrect ? (
                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                  ) : (
                                    <XCircle className="w-5 h-5 text-red-600" />
                                  )}
                                </div>
                                
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-foreground line-clamp-1">
                                    {question.question}
                                  </p>
                                  {question.type && (
                                    <span className="text-xs text-muted-foreground">
                                      {question.type}
                                    </span>  
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <div className="text-xs text-muted-foreground">Your answer</div>
                                  <div className={`text-sm font-medium ${
                                    question.isCorrect ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                    {question.userAnswer}
                                  </div>
                                </div>
                                {!question.isCorrect && (
                                  <div className="text-right">
                                    <div className="text-xs text-muted-foreground">Correct</div>
                                    <div className="text-sm font-medium text-green-600">
                                      {question.correctAnswer}
                                    </div>
                                  </div>
                                )}
                                
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleQuestionClick(question, result.passage_text || '')}
                                    className="text-blue-600 hover:text-blue-700"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  {!question.isCorrect && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeQuestion(result.id, question.questionNumber)}
                                      className="text-red-600 hover:text-red-700"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-600" />
                        <p>All incorrect answers have been noted and removed!</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <div className="text-center py-12">
              <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No reading test results yet</h3>
              <p className="text-muted-foreground mb-4">Start practicing to see your progress here</p>
            </div>
          )}
        </div>

        {/* Question Review Modal */}
        <QuestionReviewModal
          isOpen={!!selectedQuestion}
          onClose={() => setSelectedQuestion(null)}
          question={selectedQuestion}
          passage={selectedPassage}
        />
      </div>
    </div>
  );
};

export default ReadingResults;