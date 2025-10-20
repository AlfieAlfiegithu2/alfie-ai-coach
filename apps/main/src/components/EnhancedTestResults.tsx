import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Trophy, 
  TrendingUp, 
  Clock, 
  Target, 
  BarChart3, 
  CheckCircle2, 
  XCircle, 
  Eye,
  ArrowRight,
  BookOpen,
  Volume2,
  PenTool,
  Mic
} from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { getBandScore } from '@/lib/ielts-scoring';

interface EnhancedTestResultsProps {
  testType: 'reading' | 'listening' | 'writing' | 'speaking';
  score: number;
  totalQuestions: number;
  timeTaken: number;
  testData?: any;
  onRetakeTest?: () => void;
  onBackToPortal?: () => void;
}

const EnhancedTestResults: React.FC<EnhancedTestResultsProps> = ({
  testType,
  score,
  totalQuestions,
  timeTaken,
  testData,
  onRetakeTest,
  onBackToPortal
}) => {
  const navigate = useNavigate();
  const [detailedResults, setDetailedResults] = useState<any>(null);
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const percentage = Math.round((score / totalQuestions) * 100);
  const getBandScoreForType = () => {
    if (testType === 'reading') return getBandScore(score, 'academic-reading');
    if (testType === 'listening') return getBandScore(score, 'listening');
    return 7.0; // Default score for writing/speaking (subjectively marked)
  };
  const bandScore = getBandScoreForType();

  useEffect(() => {
    loadDetailedResults();
    loadHistoricalData();
  }, [testType]);

  const loadDetailedResults = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load the most recent detailed result for this test type
      let data: any = null;
      
      if (testType === 'reading') {
        const result = await supabase
          .from('reading_test_results')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);
        data = result.data;
      } else if (testType === 'listening') {
        const result = await supabase
          .from('listening_test_results')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);
        data = result.data;
      } else if (testType === 'writing') {
        const result = await supabase
          .from('writing_test_results')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);
        data = result.data;
      } else if (testType === 'speaking') {
        const result = await supabase
          .from('speaking_test_results')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);
        data = result.data;
      }

      if (data && data.length > 0) {
        setDetailedResults(data[0]);
      }
    } catch (error) {
      console.error('Error loading detailed results:', error);
    }
  };

  const loadHistoricalData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('test_results')
        .select('*')
        .eq('user_id', user.id)
        .eq('test_type', testType)
        .order('created_at', { ascending: false })
        .limit(10);

      setHistoricalData(data || []);
    } catch (error) {
      console.error('Error loading historical data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTestTypeIcon = () => {
    switch (testType) {
      case 'reading': return <BookOpen className="w-6 h-6" />;
      case 'listening': return <Volume2 className="w-6 h-6" />;
      case 'writing': return <PenTool className="w-6 h-6" />;
      case 'speaking': return <Mic className="w-6 h-6" />;
      default: return <BookOpen className="w-6 h-6" />;
    }
  };

  const getPerformanceLevel = (percentage: number) => {
    if (percentage >= 90) return { level: 'Excellent', color: 'text-green-600 bg-green-50 border-green-200' };
    if (percentage >= 80) return { level: 'Very Good', color: 'text-blue-600 bg-blue-50 border-blue-200' };
    if (percentage >= 70) return { level: 'Good', color: 'text-purple-600 bg-purple-50 border-purple-200' };
    if (percentage >= 60) return { level: 'Satisfactory', color: 'text-yellow-600 bg-yellow-50 border-yellow-200' };
    return { level: 'Needs Improvement', color: 'text-red-600 bg-red-50 border-red-200' };
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    return `${minutes}m ${secs}s`;
  };

  const performanceLevel = getPerformanceLevel(percentage);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          
          {/* Header with Celebration */}
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-4 rounded-full bg-white shadow-lg border border-primary/20">
                {getTestTypeIcon()}
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                {testType.charAt(0).toUpperCase() + testType.slice(1)} Test Results
              </h1>
              <p className="text-muted-foreground">
                Your performance summary and detailed analysis
              </p>
            </div>
          </div>

          {/* Main Results Card */}
          <Card className="card-modern border-2 border-primary/20">
            <CardContent className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Score Display */}
                <div className="text-center space-y-3">
                  <div className="relative">
                    <div className="w-32 h-32 mx-auto">
                      <svg className="w-32 h-32 transform -rotate-90">
                        <circle
                          cx="64"
                          cy="64"
                          r="56"
                          stroke="currentColor"
                          strokeWidth="8"
                          fill="none"
                          className="text-muted/20"
                        />
                        <circle
                          cx="64"
                          cy="64"
                          r="56"
                          stroke="currentColor"
                          strokeWidth="8"
                          fill="none"
                          strokeDasharray={`${2 * Math.PI * 56}`}
                          strokeDashoffset={`${2 * Math.PI * 56 * (1 - percentage / 100)}`}
                          className="text-primary transition-all duration-1000"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-primary">{score}</div>
                          <div className="text-sm text-muted-foreground">/{totalQuestions}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-foreground">{percentage}%</div>
                    <Badge className={`px-3 py-1 border ${performanceLevel.color}`}>
                      {performanceLevel.level}
                    </Badge>
                  </div>
                </div>

                {/* Band Score */}
                <div className="text-center space-y-3">
                  <Trophy className="w-12 h-12 mx-auto text-yellow-500" />
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">IELTS Band Score</div>
                    <div className="text-4xl font-bold text-primary">{bandScore}</div>
                    <div className="text-sm text-muted-foreground">
                      {bandScore >= 8 ? 'Very Good User' : 
                       bandScore >= 7 ? 'Good User' :
                       bandScore >= 6 ? 'Competent User' :
                       bandScore >= 5 ? 'Modest User' : 'Limited User'}
                    </div>
                  </div>
                </div>

                {/* Time & Stats */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-primary" />
                    <div>
                      <div className="text-sm text-muted-foreground">Time Taken</div>
                      <div className="font-semibold">{formatTime(timeTaken)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Target className="w-5 h-5 text-primary" />
                    <div>
                      <div className="text-sm text-muted-foreground">Accuracy</div>
                      <div className="font-semibold">{percentage}%</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    <div>
                      <div className="text-sm text-muted-foreground">Performance</div>
                      <div className="font-semibold">{performanceLevel.level}</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Analysis Tabs */}
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="detailed">Detailed</TabsTrigger>
              <TabsTrigger value="progress">Progress</TabsTrigger>
              <TabsTrigger value="feedback">Feedback</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Performance Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="card-modern">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      Question Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        Correct
                      </span>
                      <span className="font-semibold">{score}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-red-600" />
                        Incorrect
                      </span>
                      <span className="font-semibold">{totalQuestions - score}</span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </CardContent>
                </Card>

                <Card className="card-modern">
                  <CardHeader>
                    <CardTitle>Recent Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {historicalData.length > 0 ? (
                      <div className="space-y-3">
                        {historicalData.slice(0, 5).map((test, index) => (
                          <div key={test.id} className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">
                              {new Date(test.created_at).toLocaleDateString()}
                            </span>
                            <Badge variant="outline">
                              {Math.round(test.score_percentage)}%
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No previous tests found</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="detailed" className="space-y-6">
              <Card className="card-modern">
                <CardHeader>
                  <CardTitle>Detailed Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  {detailedResults ? (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Detailed feedback and analysis based on your performance
                      </p>
                      {detailedResults.detailed_feedback && (
                        <div className="p-4 bg-muted/50 rounded-lg">
                          <p className="text-sm">{detailedResults.detailed_feedback}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Detailed analysis is being processed. Check back later for comprehensive feedback.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="progress" className="space-y-6">
              <Card className="card-modern">
                <CardHeader>
                  <CardTitle>Progress Tracking</CardTitle>
                </CardHeader>
                <CardContent>
                  {historicalData.length > 1 ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-primary">
                            {historicalData.length}
                          </div>
                          <div className="text-sm text-muted-foreground">Tests Taken</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-primary">
                            {Math.round(historicalData.reduce((acc, test) => acc + test.score_percentage, 0) / historicalData.length)}%
                          </div>
                          <div className="text-sm text-muted-foreground">Average Score</div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <h4 className="font-semibold">Recent Progress</h4>
                        {historicalData.slice(0, 5).map((test, index) => (
                          <div key={test.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-2 h-2 bg-primary rounded-full"></div>
                              <span className="text-sm">
                                {new Date(test.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <Badge variant="outline">
                              {Math.round(test.score_percentage)}%
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center space-y-4">
                      <TrendingUp className="w-12 h-12 mx-auto text-muted-foreground" />
                      <div>
                        <h3 className="font-semibold mb-2">Start Your Progress Journey</h3>
                        <p className="text-sm text-muted-foreground">
                          Take more tests to track your improvement over time
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="feedback" className="space-y-6">
              <Card className="card-modern">
                <CardHeader>
                  <CardTitle>Feedback & Recommendations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="font-semibold text-blue-900 mb-2">Strengths</h4>
                      <p className="text-sm text-blue-800">
                        You performed well with {percentage}% accuracy. Keep practicing to maintain this level!
                      </p>
                    </div>
                    
                    {percentage < 80 && (
                      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <h4 className="font-semibold text-yellow-900 mb-2">Areas for Improvement</h4>
                        <p className="text-sm text-yellow-800">
                          Focus on question types where you scored lower. Consider taking additional practice tests.
                        </p>
                      </div>
                    )}
                    
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <h4 className="font-semibold text-green-900 mb-2">Next Steps</h4>
                      <ul className="text-sm text-green-800 space-y-1">
                        <li>• Review incorrect answers to understand patterns</li>
                        <li>• Practice similar question types</li>
                        <li>• Take regular practice tests to track progress</li>
                        <li>• Focus on time management strategies</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {onRetakeTest && (
              <Button 
                onClick={onRetakeTest}
                variant="outline"
                size="lg"
                className="rounded-xl border-primary text-primary hover:bg-primary/10"
              >
                <Eye className="w-4 h-4 mr-2" />
                Retake Test
              </Button>
            )}
            
            <Button 
              onClick={() => navigate('/dashboard')}
              size="lg"
              className="rounded-xl bg-primary hover:bg-primary/90"
            >
              <ArrowRight className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            
            {onBackToPortal && (
              <Button 
                onClick={onBackToPortal}
                variant="outline"
                size="lg"
                className="rounded-xl"
              >
                Take Another Test
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedTestResults;