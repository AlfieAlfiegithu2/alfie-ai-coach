import React, { useState, useEffect } from 'react';
import { getBandScore } from '@/lib/ielts-scoring';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BookOpen,
  Headphones,
  PenTool,
  Mic,
  TrendingUp,
  Target,
  Calendar,
  Trophy,
  User,
  Settings,
  Globe
} from "lucide-react";
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import LanguagePicker from '@/components/LanguagePicker';
import { normalizeLanguageCode } from '@/lib/languageUtils';

interface TestResult {
  id: string;
  test_type: string;
  score_percentage: number;
  completed_at: string;
  cambridge_book?: string;
  section_number?: number;
}

interface DashboardStats {
  totalTests: number;
  averageScore: number;
  streakDays: number;
  targetBand: number;
  currentLevel: string;
  testsThisWeek: number;
}

const PersonalPage = () => {
  const { user, profile, loading } = useAuth();
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalTests: 0,
    averageScore: 0,
    streakDays: 0,
    targetBand: 7.0,
    currentLevel: 'Intermediate',
    testsThisWeek: 0
  });
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [nativeLanguage, setNativeLanguage] = useState<string>('en');

  // This effect must be before any conditional returns (React Hooks rules)
  useEffect(() => {
    if (user) {
      loadDashboardData();
      loadNativeLanguage();
    }
  }, [user]);

  // Redirect if not authenticated
  if (!loading && !user) {
    return <Navigate to="/auth" replace />;
  }

  const loadNativeLanguage = async () => {
    try {
      const { data } = await supabase
        .from('user_preferences')
        .select('native_language')
        .eq('user_id', user?.id)
        .single();

      if (data?.native_language) {
        setNativeLanguage(normalizeLanguageCode(data.native_language));
      }
    } catch (error) {
      console.error('Error loading native language:', error);
    }
  };

  const handleLanguageChange = async (language: string) => {
    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user?.id,
          native_language: language,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      setNativeLanguage(language);
    } catch (error) {
      console.error('Error updating language:', error);
    }
  };

  const loadDashboardData = async () => {
    try {
      // Fetch test results
      const { data: results, error } = await supabase
        .from('test_results')
        .select('*')
        .eq('user_id', user?.id)
        .order('completed_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching test results:', error);
      } else {
        setTestResults(results || []);

        // Calculate stats
        const totalTests = results?.length || 0;
        const averageScore = totalTests > 0
          ? results.reduce((sum, test) => sum + (test.score_percentage || 0), 0) / totalTests
          : 0;

        // Get tests from this week
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const testsThisWeek = results?.filter(test =>
          new Date(test.completed_at) > weekAgo
        ).length || 0;

        setStats(prev => ({
          ...prev,
          totalTests,
          averageScore: Math.round(averageScore),
          testsThisWeek
        }));
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const getBandScoreFromPercentage = (percentage: number): number => {
    // Convert percentage back to approximate correct answers for band score calculation
    // This is for display purposes when we only have percentage data
    const approximateCorrectAnswers = Math.round((percentage / 100) * 40);
    return getBandScore(approximateCorrectAnswers, 'academic-reading');
  };

  const skillAreas = [
    {
      id: 'reading',
      title: 'Reading',
      icon: BookOpen,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      description: 'Comprehension & analysis',
      progress: 75,
      recentScore: 7.5
    },
    {
      id: 'listening',
      title: 'Listening',
      icon: Headphones,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      description: 'Audio comprehension',
      progress: 68,
      recentScore: 6.5
    },
    {
      id: 'writing',
      title: 'Writing',
      icon: PenTool,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      description: 'Essay & task response',
      progress: 60,
      recentScore: 6.0
    },
    {
      id: 'speaking',
      title: 'Speaking',
      icon: Mic,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      description: 'Fluency & pronunciation',
      progress: 72,
      recentScore: 7.0
    }
  ];

  if (loading || isLoadingData) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-sm text-muted-foreground">Loading your dashboard...</p>
          </div>
        </div>
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
              <div className="w-12 h-12 bg-gradient-to-br from-electric-blue to-neon-green rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Welcome back, {profile?.full_name || 'Student'}!
                </h1>
                <p className="text-muted-foreground">
                  Track your progress and continue your IELTS journey
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="text-sm">
                {stats.currentLevel}
              </Badge>
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
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
              <p className="text-xs text-muted-foreground">
                +{stats.testsThisWeek} this week
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Score</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.averageScore}%</div>
              <p className="text-xs text-muted-foreground">
                Band {getBandScoreFromPercentage(stats.averageScore)} equivalent
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Target Band</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.targetBand}</div>
              <p className="text-xs text-muted-foreground">
                Current goal
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Study Streak</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.streakDays}</div>
              <p className="text-xs text-muted-foreground">
                Days in a row
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
            <TabsTrigger value="study-plan">Study Plan</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Skill Areas */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Skill Areas</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {skillAreas.map((skill) => {
                  const Icon = skill.icon;
                  return (
                    <Card key={skill.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className={`w-10 h-10 rounded-lg ${skill.bgColor} flex items-center justify-center`}>
                            <Icon className={`w-5 h-5 ${skill.color}`} />
                          </div>
                          <Badge variant="outline" className="text-xs">
                            Band {skill.recentScore}
                          </Badge>
                        </div>
                        <CardTitle className="text-base">{skill.title}</CardTitle>
                        <CardDescription className="text-sm">
                          {skill.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Progress</span>
                            <span>{skill.progress}%</span>
                          </div>
                          <Progress value={skill.progress} className="h-2" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Recent Activity */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Recent Test Results</h2>
              <Card>
                <CardContent className="p-0">
                  {testResults.length > 0 ? (
                    <div className="divide-y">
                      {testResults.slice(0, 5).map((test) => (
                        <div key={test.id} className="p-4 flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                              <BookOpen className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{test.test_type}</p>
                              <p className="text-sm text-muted-foreground">
                                {test.cambridge_book} - Section {test.section_number}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{test.score_percentage}%</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(test.completed_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-muted-foreground">
                      <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No test results yet</p>
                      <p className="text-sm">Start practicing to see your progress here</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="progress" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Progress Analytics</CardTitle>
                <CardDescription>
                  Detailed breakdown of your performance over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Progress analytics coming soon</p>
                  <p className="text-sm">Track your improvement across all skills</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="study-plan" className="space-y-6">
            {/* Language Preference */}
            <LanguagePicker
              selectedLanguage={nativeLanguage}
              onLanguageChange={handleLanguageChange}
            />

            <Card>
              <CardHeader>
                <CardTitle>AI-Powered Study Plan</CardTitle>
                <CardDescription>
                  Personalized recommendations based on your performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>AI study plan coming soon</p>
                  <p className="text-sm">Get personalized recommendations for your target band</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default PersonalPage;