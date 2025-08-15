import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  BookOpen, 
  Clock, 
  CheckCircle, 
  XCircle, 
  ArrowLeft,
  Trophy,
  Target,
  BarChart3,
  Eye
} from "lucide-react";
import { getBandScore } from '@/lib/ielts-scoring';
import Header from '@/components/Header';
import LoadingAnimation from '@/components/animations/LoadingAnimation';

interface ReadingResult {
  id: string;
  created_at: string;
  passage_title: string;
  passage_text: string;
  questions_data: any;
  reading_time_seconds: number;
  comprehension_score: number;
  question_type_performance: any;
  detailed_feedback: string;
}

interface QuestionDetail {
  question: string;
  userAnswer: string;
  correctAnswer: string;
  explanation?: string;
  isCorrect: boolean;
  questionType: string;
}

const ReadingResults = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [results, setResults] = useState<ReadingResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionDetail | null>(null);
  const [selectedPassage, setSelectedPassage] = useState<string>('');
  const [stats, setStats] = useState({
    totalTests: 0,
    averageScore: 0,
    averageBandScore: 0,
    totalTimeSpent: 0
  });

  useEffect(() => {
    if (user) {
      loadReadingResults();
    }
  }, [user]);

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

      // Calculate statistics
      if (readingResults && readingResults.length > 0) {
        const totalTests = readingResults.length;
        const totalScore = readingResults.reduce((sum, result) => 
          sum + (result.comprehension_score || 0), 0);
        const averageScore = totalScore / totalTests;
        const averageBandScore = getBandScore(Math.round(averageScore), 'academic-reading');
        
        const totalTime = readingResults.reduce((sum, result) => 
          sum + (result.reading_time_seconds || 0), 0);

        setStats({
          totalTests,
          averageScore: Math.round(averageScore),
          averageBandScore,
          totalTimeSpent: Math.round(totalTime / 60) // Convert to minutes
        });
      }
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

  const parseQuestions = (questionsData: any): QuestionDetail[] => {
    if (!questionsData || !Array.isArray(questionsData)) return [];
    
    return questionsData.map((q: any) => ({
      question: q.question || q.question_text || '',
      userAnswer: q.userAnswer || q.user_answer || '',
      correctAnswer: q.correctAnswer || q.correct_answer || '',
      explanation: q.explanation || '',
      isCorrect: q.isCorrect !== undefined ? q.isCorrect : (q.userAnswer === q.correctAnswer),
      questionType: q.questionType || q.question_type || 'Unknown'
    }));
  };

  const handleQuestionClick = (question: QuestionDetail, passageText: string) => {
    setSelectedQuestion(question);
    setSelectedPassage(passageText);
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
      <div className="border-b border-border/40 bg-background/95 backdrop-blur">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <BookOpen className="w-6 h-6 text-blue-600" />
                  Reading Test Results
                </h1>
                <p className="text-muted-foreground">
                  Detailed analysis of your reading performance
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Stats Overview */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tests</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTests}</div>
              <p className="text-xs text-muted-foreground">Reading tests completed</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Band Score</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.averageBandScore}</div>
              <p className="text-xs text-muted-foreground">
                {stats.averageScore}/40 questions correct
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Time Spent</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTimeSpent}m</div>
              <p className="text-xs text-muted-foreground">Total reading time</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Performance</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.round((stats.averageScore / 40) * 100)}%</div>
              <p className="text-xs text-muted-foreground">Average accuracy</p>
            </CardContent>
          </Card>
        </div>


        {/* Recent Tests */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Reading Tests</CardTitle>
          </CardHeader>
          <CardContent>
            {results.length > 0 ? (
              <div className="space-y-4">
                {results.map((result) => {
                  const questions = parseQuestions(result.questions_data);
                  const incorrectQuestions = questions.filter(q => !q.isCorrect);
                  
                  return (
                    <div key={result.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium">{result.passage_title || 'Reading Test'}</h3>
                        <Badge variant="outline">
                          Band {getBandScore(result.comprehension_score || 0, 'academic-reading')}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                        <div>
                          <span className="text-muted-foreground">Score:</span>
                          <span className="ml-2 font-medium">{result.comprehension_score || 0}/40</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Time:</span>
                          <span className="ml-2 font-medium">
                            {formatTime(result.reading_time_seconds || 0)}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Date:</span>
                          <span className="ml-2 font-medium">
                            {new Date(result.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Accuracy:</span>
                          <span className="ml-2 font-medium">
                            {Math.round(((result.comprehension_score || 0) / 40) * 100)}%
                          </span>
                        </div>
                      </div>
                      
                      {/* Wrong Questions Section */}
                      {incorrectQuestions.length > 0 && (
                        <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                          <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2 flex items-center gap-2">
                            <XCircle className="w-4 h-4" />
                            Incorrect Answers ({incorrectQuestions.length})
                          </h4>
                          <div className="space-y-2">
                            {incorrectQuestions.map((question, index) => (
                              <button
                                key={index}
                                onClick={() => handleQuestionClick(question, result.passage_text || '')}
                                className="w-full text-left p-2 rounded bg-white dark:bg-gray-800 border border-red-200 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-gray-700 dark:text-gray-300">
                                    Question {index + 1}: {question.question.substring(0, 50)}...
                                  </span>
                                  <Eye className="w-4 h-4 text-red-600 dark:text-red-400" />
                                </div>
                                <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                                  Your answer: {question.userAnswer} • Correct: {question.correctAnswer}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {result.detailed_feedback && (
                        <div className="mt-3 p-3 bg-muted/50 rounded">
                          <p className="text-sm text-muted-foreground">{result.detailed_feedback}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No reading test results yet</p>
                <p className="text-sm">Start practicing to see your progress here</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Question Detail Modal */}
        <Dialog open={!!selectedQuestion} onOpenChange={() => setSelectedQuestion(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-600" />
                Question Review
              </DialogTitle>
            </DialogHeader>
            
            {selectedQuestion && (
              <div className="space-y-6">
                {/* Passage */}
                {selectedPassage && (
                  <div className="space-y-2">
                    <h3 className="font-medium text-lg">Reading Passage</h3>
                    <div className="p-4 bg-muted/50 rounded-lg max-h-64 overflow-y-auto">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{selectedPassage}</p>
                    </div>
                  </div>
                )}
                
                {/* Question */}
                <div className="space-y-2">
                  <h3 className="font-medium text-lg">Question</h3>
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm">{selectedQuestion.question}</p>
                    <Badge variant="secondary" className="mt-2">
                      {selectedQuestion.questionType}
                    </Badge>
                  </div>
                </div>
                
                {/* Answers */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <h4 className="font-medium text-red-600 dark:text-red-400">Your Answer</h4>
                    <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded border border-red-200 dark:border-red-800">
                      <p className="text-sm">{selectedQuestion.userAnswer || 'No answer provided'}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium text-green-600 dark:text-green-400">Correct Answer</h4>
                    <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded border border-green-200 dark:border-green-800">
                      <p className="text-sm">{selectedQuestion.correctAnswer}</p>
                    </div>
                  </div>
                </div>
                
                {/* Explanation */}
                {selectedQuestion.explanation && (
                  <div className="space-y-2">
                    <h3 className="font-medium text-lg">Explanation</h3>
                    <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                      <p className="text-sm leading-relaxed">{selectedQuestion.explanation}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default ReadingResults;