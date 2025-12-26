import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Headphones, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  XCircle, 
  ArrowLeft,
  Trophy,
  Target,
  BarChart3,
  Play
} from "lucide-react";
import { getBandScore } from '@/lib/ielts-scoring';
import Header from '@/components/Header';
import LoadingAnimation from '@/components/animations/LoadingAnimation';

interface ListeningResult {
  id: string;
  created_at: string;
  section_title: string;
  section_number: number;
  questions_data: any;
  section_score: number;
  section_total: number;
  audio_url?: string;
  detailed_feedback?: string;
}

const ListeningResults = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [results, setResults] = useState<ListeningResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalTests: 0,
    averageScore: 0,
    averageBandScore: 0,
    totalSections: 0,
    bestSection: '',
    worstSection: ''
  });

  useEffect(() => {
    if (user) {
      loadListeningResults();
    }
  }, [user]);

  const loadListeningResults = async () => {
    try {
      // Fetch listening test results
      const { data: listeningResults, error } = await supabase
        .from('listening_test_results')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching listening results:', error);
        return;
      }

      setResults(listeningResults || []);

      // Calculate statistics
      if (listeningResults && listeningResults.length > 0) {
        const totalSections = listeningResults.length;
        const totalScore = listeningResults.reduce((sum, result) => 
          sum + (result.section_score || 0), 0);
        const totalPossible = listeningResults.reduce((sum, result) => 
          sum + (result.section_total || 10), 0);
        
        const averageScore = totalPossible > 0 ? Math.round((totalScore / totalPossible) * 40) : 0;
        const averageBandScore = getBandScore(averageScore, 'listening');

        // Find best and worst performing sections
        const sectionPerformance: { [key: string]: { correct: number, total: number } } = {};
        
        listeningResults.forEach(result => {
          const sectionKey = `Section ${result.section_number}`;
          if (!sectionPerformance[sectionKey]) {
            sectionPerformance[sectionKey] = { correct: 0, total: 0 };
          }
          sectionPerformance[sectionKey].correct += result.section_score || 0;
          sectionPerformance[sectionKey].total += result.section_total || 10;
        });

        const sectionScores = Object.entries(sectionPerformance)
          .map(([section, stats]) => ({
            section,
            percentage: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0
          }))
          .sort((a, b) => b.percentage - a.percentage);

        const bestSection = sectionScores.length > 0 ? sectionScores[0].section : '';
        const worstSection = sectionScores.length > 0 ? sectionScores[sectionScores.length - 1].section : '';

        setStats({
          totalTests: Math.ceil(totalSections / 4), // Assuming 4 sections per test
          averageScore,
          averageBandScore,
          totalSections,
          bestSection,
          worstSection
        });
      }
    } catch (error) {
      console.error('Error loading listening results:', error);
    } finally {
      setLoading(false);
    }
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
                  <Headphones className="w-6 h-6 text-green-600" />
                  Listening Test Results
                </h1>
                <p className="text-muted-foreground">
                  Detailed analysis of your listening performance
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
              <p className="text-xs text-muted-foreground">Listening tests completed</p>
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
              <CardTitle className="text-sm font-medium">Sections Completed</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSections}</div>
              <p className="text-xs text-muted-foreground">Individual sections</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Performance</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.round((stats.averageScore / 40) * 100)}%</div>
              <p className="text-xs text-muted-foreground">Average accuracy</p>
            </CardContent>
          </Card>
        </div>

        {/* Section Performance */}
        {stats.bestSection && (
          <div className="grid gap-6 md:grid-cols-2 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Best Performing Section
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-green-50 text-green-700">
                    {stats.bestSection}
                  </Badge>
                  <span className="text-sm text-muted-foreground">Keep up the great work!</span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-red-600" />
                  Area for Improvement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-red-50 text-red-700">
                    {stats.worstSection}
                  </Badge>
                  <span className="text-sm text-muted-foreground">Focus more practice here</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Recent Tests */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Listening Tests</CardTitle>
          </CardHeader>
          <CardContent>
            {results.length > 0 ? (
              <div className="space-y-4">
                {results.map((result) => (
                  <div key={result.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium flex items-center gap-2">
                        <Headphones className="w-4 h-4" />
                        {result.section_title || `Section ${result.section_number}`}
                      </h3>
                      <div className="flex items-center gap-2">
                        {result.audio_url && (
                          <Button variant="outline" size="sm">
                            <Play className="w-3 h-3 mr-1" />
                            Listen
                          </Button>
                        )}
                        <Badge variant="outline">
                          Band {getBandScore(Math.round((result.section_score / result.section_total) * 40), 'listening')}
                        </Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Score:</span>
                        <span className="ml-2 font-medium">
                          {result.section_score}/{result.section_total}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Accuracy:</span>
                        <span className="ml-2 font-medium">
                          {Math.round((result.section_score / result.section_total) * 100)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Date:</span>
                        <span className="ml-2 font-medium">
                          {new Date(result.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Section:</span>
                        <span className="ml-2 font-medium">{result.section_number}</span>
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
                <Headphones className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No listening test results yet</p>
                <p className="text-sm">Start practicing to see your progress here</p>
                <Button 
                  onClick={() => navigate('/exam-selection')} 
                  className="mt-4"
                >
                  Take a Listening Test
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ListeningResults;