import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  BookOpen, 
  Headphones, 
  PenTool, 
  Mic, 
  TrendingUp, 
  Target,
  Calendar,
  Award,
  Clock,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  Star,
  Brain,
  Users,
  FileText,
  Download,
  Settings,
  Trophy,
  Zap,
  ChevronRight,
  Flame,
  BookMarked,
  History,
  TrendingDown
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import StudentLayout from '@/components/StudentLayout';
import VocabularyList from '@/components/VocabularyList';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SkillData {
  name: string;
  score: number;
  target: number;
  improvement: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  weakAreas: string[];
  suggestions: string[];
  recentTests: TestResult[];
  strongPoints: string[];
  trend: 'up' | 'down' | 'stable';
}

interface TestResult {
  id: string;
  date: string;
  testType: string;
  section: string;
  score: number;
  band: number;
  percentage: number;
  totalQuestions: number;
  correctAnswers: number;
  timeTaken: string;
  cambridgeBook?: string;
  sectionNumber?: number;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  earnedDate: string;
  isNew?: boolean;
}

interface WeeklyGoal {
  skill: string;
  target: number;
  current: number;
  description: string;
}

const PersonalPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [skillsData, setSkillsData] = useState<SkillData[]>([]);
  const [testHistory, setTestHistory] = useState<TestResult[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [weeklyGoals, setWeeklyGoals] = useState<WeeklyGoal[]>([]);
  const [currentStreak, setCurrentStreak] = useState(7);
  const [totalTestsTaken, setTotalTestsTaken] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('30days');
  const [goalTestDate, setGoalTestDate] = useState('2024-08-15');
  const [targetOverallBand, setTargetOverallBand] = useState(7.5);

  const overallBand = 6.5;
  const overallProgress = 68;

  useEffect(() => {
    loadDashboardData();
  }, [selectedPeriod]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load test results
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: testResults, error } = await supabase
          .from('test_results')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (!error && testResults) {
          const formattedResults: TestResult[] = testResults.map(result => ({
            id: result.id,
            date: new Date(result.completed_at).toLocaleDateString(),
            testType: result.test_type || 'Reading',
            section: result.test_type || 'Reading',
            score: result.correct_answers || 0,
            band: calculateIELTSBand(result.score_percentage || 0),
            percentage: result.score_percentage || 0,
            totalQuestions: result.total_questions || 0,
            correctAnswers: result.correct_answers || 0,
            timeTaken: formatTime(result.time_taken || 0),
            cambridgeBook: result.cambridge_book,
            sectionNumber: result.section_number
          }));
          
          setTestHistory(formattedResults);
          setTotalTestsTaken(formattedResults.length);
          
          // Calculate skill-specific data
          const skillsAnalysis = calculateSkillsData(formattedResults);
          setSkillsData(skillsAnalysis);
        }
      } else {
        // Load mock data for demo if no user
        loadMockData();
      }
      
      // Load achievements and goals
      loadAchievements();
      loadWeeklyGoals();
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      loadMockData(); // Fallback to mock data
    } finally {
      setLoading(false);
    }
  };

  const loadMockData = () => {
    // Mock test results for demo
    const mockResults: TestResult[] = [
      {
        id: '1',
        date: '2024-01-20',
        testType: 'Reading',
        section: 'Reading',
        score: 28,
        band: 7.0,
        percentage: 70,
        totalQuestions: 40,
        correctAnswers: 28,
        timeTaken: '58m',
        cambridgeBook: 'C19',
        sectionNumber: 1
      },
      {
        id: '2',
        date: '2024-01-18',
        testType: 'Listening',
        section: 'Listening',
        score: 32,
        band: 7.5,
        percentage: 80,
        totalQuestions: 40,
        correctAnswers: 32,
        timeTaken: '30m',
        cambridgeBook: 'C19',
        sectionNumber: 2
      },
      {
        id: '3',
        date: '2024-01-15',
        testType: 'Writing',
        section: 'Writing',
        score: 6,
        band: 6.0,
        percentage: 60,
        totalQuestions: 2,
        correctAnswers: 1,
        timeTaken: '60m',
        cambridgeBook: 'C19',
        sectionNumber: 1
      }
    ];
    
    setTestHistory(mockResults);
    setTotalTestsTaken(mockResults.length);
    
    const skillsAnalysis = calculateSkillsData(mockResults);
    setSkillsData(skillsAnalysis);
  };

  const calculateIELTSBand = (percentage: number): number => {
    // Accurate IELTS Reading band conversion
    if (percentage >= 89) return 9.0;
    if (percentage >= 82) return 8.5;
    if (percentage >= 75) return 8.0;
    if (percentage >= 68) return 7.5;
    if (percentage >= 60) return 7.0;
    if (percentage >= 50) return 6.5;
    if (percentage >= 40) return 6.0;
    if (percentage >= 30) return 5.5;
    if (percentage >= 23) return 5.0;
    if (percentage >= 15) return 4.5;
    return 4.0;
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const calculateSkillsData = (results: TestResult[]): SkillData[] => {
    const skills = ['Reading', 'Listening', 'Writing', 'Speaking'];
    
    return skills.map(skill => {
      const skillResults = results.filter(r => r.section.toLowerCase() === skill.toLowerCase());
      const recentResults = skillResults.slice(0, 10);
      const averageBand = recentResults.length > 0 
        ? recentResults.reduce((sum, r) => sum + r.band, 0) / recentResults.length 
        : getDefaultScore(skill);
      
      const trend = calculateTrend(recentResults);
      const weakAreas = analyzeWeakAreas(skill, recentResults);
      const strongPoints = analyzeStrongPoints(skill, recentResults);
      
      return {
        name: skill,
        score: Math.round(averageBand * 2) / 2, // Round to nearest 0.5
        target: targetOverallBand,
        improvement: Math.max(0, Math.round(((averageBand - 5.5) / (targetOverallBand - 5.5)) * 100)),
        icon: skill === 'Reading' ? BookOpen : skill === 'Listening' ? Headphones : skill === 'Writing' ? PenTool : Mic,
        color: skill === 'Reading' ? 'text-brand-blue' : skill === 'Listening' ? 'text-brand-green' : skill === 'Writing' ? 'text-brand-orange' : 'text-brand-purple',
        weakAreas,
        strongPoints,
        suggestions: generateSuggestions(skill, weakAreas),
        recentTests: recentResults,
        trend
      };
    });
  };

  const getDefaultScore = (skill: string): number => {
    // Default scores for demo
    const defaults = {
      'Reading': 7.0,
      'Listening': 7.5,
      'Writing': 6.0,
      'Speaking': 6.5
    };
    return defaults[skill as keyof typeof defaults] || 6.0;
  };

  const calculateTrend = (results: TestResult[]): 'up' | 'down' | 'stable' => {
    if (results.length < 2) return 'stable';
    const recent = results.slice(0, 3);
    const older = results.slice(3, 6);
    if (older.length === 0) return 'stable';
    
    const recentAvg = recent.reduce((sum, r) => sum + r.band, 0) / recent.length;
    const olderAvg = older.reduce((sum, r) => sum + r.band, 0) / older.length;
    
    if (recentAvg > olderAvg + 0.2) return 'up';
    if (recentAvg < olderAvg - 0.2) return 'down';
    return 'stable';
  };

  const analyzeWeakAreas = (skill: string, results: TestResult[]): string[] => {
    // Mock analysis - in production, this would analyze actual question types and errors
    const weakAreasBySkill = {
      'Reading': ['Academic vocabulary', 'Inference questions', 'Time management', 'True/False/Not Given'],
      'Listening': ['Note-taking', 'Multiple speakers', 'Section 3 discussions', 'Spelling accuracy'],
      'Writing': ['Task 1 data description', 'Cohesion and coherence', 'Grammar accuracy', 'Word count management'],
      'Speaking': ['Fluency and coherence', 'Pronunciation', 'Lexical resource', 'Complex ideas expression']
    };
    
    return weakAreasBySkill[skill as keyof typeof weakAreasBySkill] || [];
  };

  const analyzeStrongPoints = (skill: string, results: TestResult[]): string[] => {
    const strongPointsBySkill = {
      'Reading': ['Scanning for details', 'Main idea identification'],
      'Listening': ['Basic conversations', 'Number and date recognition'],
      'Writing': ['Task response', 'Basic grammar structures'],
      'Speaking': ['Personal topics', 'Simple descriptions']
    };
    
    return strongPointsBySkill[skill as keyof typeof strongPointsBySkill] || [];
  };

  const generateSuggestions = (skill: string, weakAreas: string[]): string[] => {
    const suggestionMap: Record<string, string[]> = {
      'Academic vocabulary': ['Study academic word lists daily', 'Use vocabulary in writing practice'],
      'Inference questions': ['Practice reading between the lines', 'Focus on implied meanings'],
      'Time management': ['Take timed practice tests', 'Learn skimming techniques'],
      'Note-taking': ['Practice Cornell note-taking method', 'Use abbreviations and symbols'],
      'Multiple speakers': ['Listen to group discussions', 'Practice with British Council materials'],
      'Task 1 data description': ['Master trend vocabulary', 'Practice describing charts daily'],
      'Cohesion and coherence': ['Learn transition words', 'Practice paragraph structure'],
      'Fluency and coherence': ['Record yourself speaking', 'Practice topic development'],
      'Pronunciation': ['Use IPA symbols', 'Practice word stress patterns']
    };
    
    return weakAreas.flatMap(area => suggestionMap[area] || [`Improve ${area.toLowerCase()}`]).slice(0, 3);
  };

  const loadAchievements = () => {
    const mockAchievements: Achievement[] = [
      {
        id: '1',
        title: '7-Day Streak',
        description: 'Practiced for 7 consecutive days',
        icon: Flame,
        color: 'text-brand-orange',
        earnedDate: '2024-01-15',
        isNew: true
      },
      {
        id: '2',
        title: 'Reading Master',
        description: 'Achieved Band 7+ in Reading',
        icon: BookOpen,
        color: 'text-brand-blue',
        earnedDate: '2024-01-10'
      },
      {
        id: '3',
        title: 'First Century',
        description: 'Completed 100 practice questions',
        icon: Trophy,
        color: 'text-brand-green',
        earnedDate: '2024-01-05'
      }
    ];
    setAchievements(mockAchievements);
  };

  const loadWeeklyGoals = () => {
    const mockGoals: WeeklyGoal[] = [
      { skill: 'Reading', target: 5, current: 3, description: 'Complete 5 reading tests' },
      { skill: 'Writing', target: 3, current: 1, description: 'Write 3 essays' },
      { skill: 'Vocabulary', target: 50, current: 32, description: 'Learn 50 new words' },
      { skill: 'Speaking', target: 7, current: 5, description: 'Practice speaking 7 days' }
    ];
    setWeeklyGoals(mockGoals);
  };

  const handlePracticeSkill = (skillName: string) => {
    const route = skillName.toLowerCase();
    navigate(`/${route}`);
  };

  const handleDownloadReport = () => {
    toast({
      title: "Report Generated",
      description: "Your progress report has been generated and will be downloaded shortly.",
    });
  };

  if (loading) {
    return (
      <StudentLayout title="Personal Progress" showBackButton={false}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue mx-auto mb-4"></div>
            <p className="text-text-secondary">Loading your progress...</p>
          </div>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout title="Personal Progress" showBackButton={false}>
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header with Goal Setting */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
          <div>
            <h1 className="text-heading-1 mb-2">Your Learning Journey</h1>
            <p className="text-body">Track your progress and achieve your English proficiency goals</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleDownloadReport} className="hover-lift">
              <Download className="w-4 h-4 mr-2" />
              Download Report
            </Button>
            <Button variant="outline" onClick={() => navigate('/settings')} className="hover-lift">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>

        {/* Goal & Overall Performance */}
        <Card className="card-modern mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Target className="w-6 h-6 text-brand-blue" />
                Goal Progress
              </CardTitle>
              <Badge variant="secondary" className="px-3 py-1">
                <Calendar className="w-3 h-3 mr-1" />
                Target: {goalTestDate}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-brand-blue mb-2">{overallBand}</div>
                <p className="text-text-secondary">Current Band</p>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-brand-green mb-2">{targetOverallBand}</div>
                <p className="text-text-secondary">Target Band</p>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-brand-purple mb-2">{overallProgress}%</div>
                <p className="text-text-secondary">Progress</p>
                <Progress value={overallProgress} className="mt-2" />
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-brand-orange mb-2">{Math.max(0, Math.ceil((new Date(goalTestDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))}</div>
                <p className="text-text-secondary">Days Remaining</p>
              </div>
            </div>
            
            {/* Progress Alert */}
            <Alert className="mt-6">
              <TrendingUp className="w-4 h-4" />
              <AlertDescription>
                <strong>You're on track!</strong> Maintain your current pace to reach Band {targetOverallBand} by {goalTestDate}. 
                Focus on Writing and Speaking for the biggest improvement.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Main Dashboard Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Left Column - Skills Analysis */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Skills Breakdown */}
            <div className="grid md:grid-cols-2 gap-6">
              {skillsData.map((skill) => {
                const Icon = skill.icon;
                const trendIcon = skill.trend === 'up' ? TrendingUp : skill.trend === 'down' ? TrendingDown : Target;
                const trendColor = skill.trend === 'up' ? 'text-brand-green' : skill.trend === 'down' ? 'text-brand-red' : 'text-text-secondary';
                
                return (
                  <Card key={skill.name} className="card-interactive">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <Icon className={`w-5 h-5 ${skill.color}`} />
                          {skill.name}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <div className={`flex items-center gap-1 ${trendColor}`}>
                            {React.createElement(trendIcon, { className: 'w-3 h-3' })}
                            <span className="text-xs font-medium">{skill.trend}</span>
                          </div>
                          <Badge className="bg-brand-blue text-white">
                            Band {skill.score}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between text-sm">
                        <span>Current: {skill.score}</span>
                        <span>Target: {skill.target}</span>
                      </div>
                      <div className="progress-bar h-3">
                        <div 
                          className="progress-fill"
                          style={{ width: `${Math.min(100, (skill.score / skill.target) * 100)}%` }}
                        />
                      </div>
                      
                      {/* Strong Points */}
                      <div>
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-brand-green" />
                          Your Strengths
                        </h4>
                        <ul className="text-sm text-text-secondary space-y-1">
                          {skill.strongPoints.slice(0, 2).map((point, index) => (
                            <li key={index} className="flex items-center gap-2">
                              <div className="w-1 h-1 bg-brand-green rounded-full"></div>
                              {point}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Weak Areas */}
                      <div>
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-brand-red" />
                          Focus Areas
                        </h4>
                        <ul className="text-sm text-text-secondary space-y-1">
                          {skill.weakAreas.slice(0, 2).map((area, index) => (
                            <li key={index} className="flex items-center gap-2">
                              <div className="w-1 h-1 bg-brand-red rounded-full"></div>
                              {area}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* AI Suggestions */}
                      <div>
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <Brain className="w-4 h-4 text-brand-purple" />
                          AI Recommendations
                        </h4>
                        <ul className="text-sm text-text-secondary space-y-1">
                          {skill.suggestions.slice(0, 2).map((suggestion, index) => (
                            <li key={index} className="flex items-center gap-2">
                              <div className="w-1 h-1 bg-brand-purple rounded-full"></div>
                              {suggestion}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <Button 
                        onClick={() => handlePracticeSkill(skill.name)}
                        className="w-full btn-primary"
                      >
                        Practice {skill.name}
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Test History */}
            <Card className="card-modern">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5 text-brand-blue" />
                  Recent Test Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                {testHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-text-tertiary mx-auto mb-3" />
                    <p className="text-text-secondary">No test results yet.</p>
                    <Button 
                      onClick={() => navigate('/tests')} 
                      className="mt-4 btn-primary"
                    >
                      Take Your First Test
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {testHistory.slice(0, 5).map((test) => (
                      <div key={test.id} className="flex items-center justify-between p-3 glass-effect rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-brand-blue/10 flex items-center justify-center">
                            <BookOpen className="w-5 h-5 text-brand-blue" />
                          </div>
                          <div>
                            <p className="font-medium">{test.section}</p>
                            <p className="text-sm text-text-secondary">
                              {test.cambridgeBook && `${test.cambridgeBook} • `}
                              {test.date}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="secondary" className="mb-1">
                            Band {test.band}
                          </Badge>
                          <p className="text-sm text-text-secondary">
                            {test.correctAnswers}/{test.totalQuestions}
                          </p>
                        </div>
                      </div>
                    ))}
                    
                    {testHistory.length > 5 && (
                      <Button variant="ghost" className="w-full">
                        View All Results
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            
            {/* Current Streak & Stats */}
            <Card className="card-modern">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-brand-orange" />
                  Your Statistics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-brand-orange mb-1">{currentStreak}</div>
                  <p className="text-sm text-text-secondary">Day Streak</p>
                </div>
                
                <Separator />
                
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-brand-blue">{totalTestsTaken}</div>
                    <p className="text-xs text-text-secondary">Tests Taken</p>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-brand-green">
                      {Math.round(testHistory.reduce((sum, test) => sum + test.percentage, 0) / Math.max(1, testHistory.length))}%
                    </div>
                    <p className="text-xs text-text-secondary">Average Score</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Weekly Goals */}
            <Card className="card-modern">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-brand-green" />
                  Weekly Goals
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {weeklyGoals.map((goal, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{goal.skill}</span>
                      <span className="text-text-secondary">{goal.current}/{goal.target}</span>
                    </div>
                    <div className="progress-bar h-2">
                      <div 
                        className="progress-fill"
                        style={{ width: `${Math.min(100, (goal.current / goal.target) * 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-text-secondary">{goal.description}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Achievements */}
            <Card className="card-modern">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-brand-purple" />
                  Recent Achievements
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {achievements.map((achievement) => {
                  const Icon = achievement.icon;
                  return (
                    <div key={achievement.id} className="flex items-center gap-3 p-3 glass-effect rounded-xl">
                      <div className={`p-2 rounded-lg bg-surface-1 ${achievement.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{achievement.title}</p>
                          {achievement.isNew && (
                            <Badge variant="secondary" className="text-xs">New!</Badge>
                          )}
                        </div>
                        <p className="text-xs text-text-secondary">{achievement.description}</p>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Vocabulary Collection */}
            <VocabularyList />
          </div>
        </div>

        {/* Quick Actions */}
        <Card className="card-modern">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-brand-orange" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-4">
              <Button 
                onClick={() => navigate('/tests')}
                className="btn-primary h-auto py-4 flex-col gap-2"
              >
                <FileText className="w-6 h-6" />
                Take Practice Test
              </Button>
              <Button 
                onClick={() => navigate('/reading')}
                className="btn-success h-auto py-4 flex-col gap-2"
              >
                <BookOpen className="w-6 h-6" />
                Reading Practice
              </Button>
              <Button 
                onClick={() => navigate('/speaking')}
                className="bg-brand-purple text-white h-auto py-4 flex-col gap-2 hover:bg-brand-purple/90"
              >
                <Mic className="w-6 h-6" />
                Speaking Session
              </Button>
              <Button 
                onClick={() => navigate('/community')}
                className="bg-brand-orange text-white h-auto py-4 flex-col gap-2 hover:bg-brand-orange/90"
              >
                <Users className="w-6 h-6" />
                Study Group
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* AI-Powered Study Plan */}
        <Card className="card-modern">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-brand-purple" />
              AI-Powered Study Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Alert>
                <Lightbulb className="w-4 h-4" />
                <AlertDescription>
                  <strong>This Week's AI Recommendations:</strong> Focus on Writing Task 1 data description and Speaking Part 2 fluency. 
                  Your Reading scores are consistently strong - maintain momentum with academic vocabulary expansion.
                </AlertDescription>
              </Alert>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 glass-effect rounded-xl">
                  <h4 className="font-semibold mb-2 text-brand-blue">Daily Focus (15 min)</h4>
                  <ul className="text-sm space-y-1">
                    <li>• 10 academic vocabulary words</li>
                    <li>• 1 Writing Task 1 graph description</li>
                    <li>• 3 minutes pronunciation drills</li>
                  </ul>
                </div>
                <div className="p-4 glass-effect rounded-xl">
                  <h4 className="font-semibold mb-2 text-brand-green">Weekly Targets</h4>
                  <ul className="text-sm space-y-1">
                    <li>• Complete 4 full Reading tests</li>
                    <li>• Record 3 Speaking Part 2 responses</li>
                    <li>• Write 2 Task 1 + 1 Task 2 essays</li>
                  </ul>
                </div>
                <div className="p-4 glass-effect rounded-xl">
                  <h4 className="font-semibold mb-2 text-brand-purple">Priority Skills</h4>
                  <ul className="text-sm space-y-1">
                    <li>• Data description vocabulary</li>
                    <li>• Speaking fluency exercises</li>
                    <li>• Grammar: Complex sentences</li>
                  </ul>
                </div>
              </div>

              <div className="flex gap-3">
                <Button className="btn-primary">
                  <Star className="w-4 h-4 mr-2" />
                  Start Today's Session
                </Button>
                <Button variant="outline">
                  <Settings className="w-4 h-4 mr-2" />
                  Customize Plan
                </Button>
                <Button variant="outline">
                  <BookMarked className="w-4 h-4 mr-2" />
                  View Full Calendar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </StudentLayout>
  );
};

export default PersonalPage;