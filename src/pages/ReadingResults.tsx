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
  TrendingUp, 
  Clock, 
  CheckCircle, 
  XCircle, 
  ArrowLeft,
  Trophy,
  Target,
  BarChart3
} from "lucide-react";
import { getBandScore } from '@/lib/ielts-scoring';
import Header from '@/components/Header';
import LoadingAnimation from '@/components/animations/LoadingAnimation';

interface ReadingResult {
  id: string;
  created_at: string;
  passage_title: string;
  questions_data: any;
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
  const [stats, setStats] = useState({
    totalTests: 0,
    averageScore: 0,
    averageBandScore: 0,
    totalTimeSpent: 0,
    strongestSkills: [] as string[],
    weakestSkills: [] as string[]
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

        // Analyze question type performance
        const questionTypeStats: { [key: string]: { correct: number, total: number } } = {};
        
        readingResults.forEach(result => {
          if (result.question_type_performance) {
            Object.entries(result.question_type_performance).forEach(([type, performance]: [string, any]) => {
              if (!questionTypeStats[type]) {
                questionTypeStats[type] = { correct: 0, total: 0 };
              }
              questionTypeStats[type].correct += performance.correct || 0;
              questionTypeStats[type].total += performance.total || 0;
            });
          }
        });

        // Find strongest and weakest skills
        const skillPerformances = Object.entries(questionTypeStats)
          .map(([type, stats]) => ({
            type,
            percentage: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0
          }))
          .sort((a, b) => b.percentage - a.percentage);

        const strongestSkills = skillPerformances.slice(0, 2).map(s => s.type);
        const weakestSkills = skillPerformances.slice(-2).map(s => s.type);

        setStats({
          totalTests,
          averageScore: Math.round(averageScore),
          averageBandScore,
          totalTimeSpent: Math.round(totalTime / 60), // Convert to minutes
          strongestSkills,
          weakestSkills
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

        {/* Skills Analysis */}
        {stats.strongestSkills.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Strongest Skills
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.strongestSkills.map((skill, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-green-50 text-green-700">
                        {skill.replace('_', ' ')}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-red-600" />
                  Areas for Improvement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.weakestSkills.map((skill, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-red-50 text-red-700">
                        {skill.replace('_', ' ')}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Recent Tests */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Reading Tests</CardTitle>
          </CardHeader>
          <CardContent>
            {results.length > 0 ? (
              <div className="space-y-4">
                {results.map((result) => (
                  <div key={result.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">{result.passage_title || 'Reading Test'}</h3>
                      <Badge variant="outline">
                        Band {getBandScore(result.comprehension_score || 0, 'academic-reading')}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
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
                    {result.detailed_feedback && (
                      <div className="mt-3 p-3 bg-muted/50 rounded">
                        <p className="text-sm text-muted-foreground">{result.detailed_feedback}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No reading test results yet</p>
                <p className="text-sm">Start practicing to see your progress here</p>
                <Button 
                  onClick={() => navigate('/ielts-portal')} 
                  className="mt-4"
                >
                  Take a Reading Test
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ReadingResults;