import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  BookOpen, 
  Clock, 
  ArrowLeft,
  Trophy,
  Target,
  BarChart3,
  Eye,
  X
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getBandScore } from '@/lib/ielts-scoring';
import Header from '@/components/Header';
import LoadingAnimation from '@/components/animations/LoadingAnimation';

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

const ReadingResults = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [results, setResults] = useState<ReadingResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuestion, setSelectedQuestion] = useState<any>(null);
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

  const getWrongAnswers = (result: ReadingResult) => {
    if (!result.questions_data || !result.user_answers) return [];
    
    const wrongAnswers = [];
    const questions = result.questions_data.questions || result.questions_data;
    const userAnswers = result.user_answers;
    
    if (Array.isArray(questions)) {
      questions.forEach((question: any, index: number) => {
        const userAnswer = userAnswers[index] || userAnswers[question.id];
        const correctAnswer = question.correct_answer || question.answer;
        
        if (userAnswer !== correctAnswer) {
          wrongAnswers.push({
            ...question,
            questionNumber: index + 1,
            userAnswer,
            correctAnswer
          });
        }
      });
    }
    
    return wrongAnswers;
  };

  const handleQuestionClick = (question: any, passage: string) => {
    setSelectedQuestion(question);
    setSelectedPassage(passage);
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
              <h1 className="text-3xl font-bold text-foreground">Reading Test Results</h1>
              <p className="text-muted-foreground">Detailed analysis of your reading performance</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Overview */}
        <div className="grid gap-6 md:grid-cols-4 mb-8">
          <Card className="bg-gradient-to-br from-card to-card/80 border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Tests</CardTitle>
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Trophy className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats.totalTests}</div>
              <p className="text-xs text-muted-foreground">Reading tests completed</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-card to-card/80 border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Average Band Score</CardTitle>
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Target className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats.averageBandScore}</div>
              <p className="text-xs text-muted-foreground">
                {stats.averageScore}/40 questions correct
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-card to-card/80 border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Time Spent</CardTitle>
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Clock className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats.totalTimeSpent}m</div>
              <p className="text-xs text-muted-foreground">Total reading time</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-card to-card/80 border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Performance</CardTitle>
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <BarChart3 className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{Math.round((stats.averageScore / 40) * 100)}%</div>
              <p className="text-xs text-muted-foreground">Average accuracy</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Tests */}
        <Card className="bg-gradient-to-br from-card to-card/80 border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-foreground">Recent Reading Tests</CardTitle>
          </CardHeader>
          <CardContent>
            {results.length > 0 ? (
              <div className="space-y-6">
                {results.map((result) => {
                  const wrongAnswers = getWrongAnswers(result);
                  return (
                    <div key={result.id} className="bg-background/50 rounded-xl p-6 border border-border/50">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-foreground">{result.passage_title || 'Reading Test'}</h3>
                        <Badge variant="outline" className="text-primary border-primary/20 bg-primary/5">
                          Band {getBandScore(result.comprehension_score || 0, 'academic-reading')}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="text-center p-3 bg-background/80 rounded-lg">
                          <div className="text-sm text-muted-foreground">Score</div>
                          <div className="text-lg font-bold text-foreground">{result.comprehension_score || 0}/40</div>
                        </div>
                        <div className="text-center p-3 bg-background/80 rounded-lg">
                          <div className="text-sm text-muted-foreground">Time</div>
                          <div className="text-lg font-bold text-foreground">{formatTime(result.reading_time_seconds || 0)}</div>
                        </div>
                        <div className="text-center p-3 bg-background/80 rounded-lg">
                          <div className="text-sm text-muted-foreground">Date</div>
                          <div className="text-lg font-bold text-foreground">{new Date(result.created_at).toLocaleDateString()}</div>
                        </div>
                        <div className="text-center p-3 bg-background/80 rounded-lg">
                          <div className="text-sm text-muted-foreground">Accuracy</div>
                          <div className="text-lg font-bold text-foreground">{Math.round(((result.comprehension_score || 0) / 40) * 100)}%</div>
                        </div>
                      </div>

                      {wrongAnswers.length > 0 && (
                        <div className="mt-4">
                          <h4 className="text-md font-semibold text-foreground mb-3">Wrong Answers (Click to Review)</h4>
                          <div className="grid gap-2">
                            {wrongAnswers.map((question: any, index: number) => (
                              <button
                                key={index}
                                onClick={() => handleQuestionClick(question, result.passage_text || '')}
                                className="text-left p-3 bg-destructive/5 border border-destructive/20 rounded-lg hover:bg-destructive/10 transition-colors group"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <span className="text-sm font-medium text-foreground">
                                      Question {question.questionNumber}: {question.question || question.text}
                                    </span>
                                    <div className="text-xs text-muted-foreground mt-1">
                                      Your answer: <span className="text-destructive">{question.userAnswer}</span> | 
                                      Correct: <span className="text-green-600">{question.correctAnswer}</span>
                                    </div>
                                  </div>
                                  <Eye className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {result.detailed_feedback && (
                        <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                          <h4 className="text-sm font-semibold text-foreground mb-2">Feedback</h4>
                          <p className="text-sm text-muted-foreground">{result.detailed_feedback}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No reading test results yet</h3>
                <p className="text-muted-foreground mb-4">Start practicing to see your progress here</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Question Detail Modal */}
        <Dialog open={!!selectedQuestion} onOpenChange={() => setSelectedQuestion(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="text-xl font-bold">
                  Question {selectedQuestion?.questionNumber} Review
                </DialogTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedQuestion(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </DialogHeader>
            
            {selectedQuestion && (
              <div className="space-y-6">
                {/* Passage */}
                {selectedPassage && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-foreground">Passage</h3>
                    <div className="bg-muted/50 p-4 rounded-lg text-sm text-foreground leading-relaxed max-h-60 overflow-y-auto">
                      {selectedPassage}
                    </div>
                  </div>
                )}
                
                {/* Question */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-foreground">Question</h3>
                  <div className="bg-background border border-border rounded-lg p-4">
                    <p className="text-foreground font-medium">
                      {selectedQuestion.question || selectedQuestion.text}
                    </p>
                    
                    {/* Answer Options */}
                    {selectedQuestion.options && (
                      <div className="mt-4 space-y-2">
                        {selectedQuestion.options.map((option: string, index: number) => (
                          <div
                            key={index}
                            className={`p-2 rounded border text-sm ${
                              option === selectedQuestion.correctAnswer
                                ? 'bg-green-50 border-green-200 text-green-700'
                                : option === selectedQuestion.userAnswer
                                ? 'bg-red-50 border-red-200 text-red-700'
                                : 'bg-background border-border text-foreground'
                            }`}
                          >
                            {String.fromCharCode(65 + index)}. {option}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Answer Analysis */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h4 className="font-semibold text-red-700 mb-2">Your Answer</h4>
                    <p className="text-red-600">{selectedQuestion.userAnswer}</p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-semibold text-green-700 mb-2">Correct Answer</h4>
                    <p className="text-green-600">{selectedQuestion.correctAnswer}</p>
                  </div>
                </div>
                
                {/* Explanation */}
                {selectedQuestion.explanation && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-foreground">Explanation</h3>
                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                      <p className="text-foreground">{selectedQuestion.explanation}</p>
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