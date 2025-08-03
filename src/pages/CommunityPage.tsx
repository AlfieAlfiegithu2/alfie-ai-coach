import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BookOpen, Headphones, PenTool, Mic, Target, TrendingUp, Calendar, Award } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import StudentLayout from '@/components/StudentLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { logUserAction, logPageVisit } from '@/utils/analytics';
const CommunityPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Dashboard data
  const [dashboardData] = useState({
    overallProgress: 72,
    targetBand: 7.5,
    currentBand: 6.5,
    testsCompleted: 12,
    studyStreak: 15,
    nextTest: "Reading Practice Test 3",
    weakestSkill: "Writing",
    strongestSkill: "Listening"
  });

  const skillProgress = [
    { name: "Reading", score: 7.0, progress: 80, icon: BookOpen, color: "bg-blue-500" },
    { name: "Listening", score: 7.5, progress: 90, icon: Headphones, color: "bg-green-500" },
    { name: "Writing", score: 6.0, progress: 60, icon: PenTool, color: "bg-orange-500" },
    { name: "Speaking", score: 6.5, progress: 70, icon: Mic, color: "bg-purple-500" }
  ];

  // Load analytics on page visit
  useEffect(() => {
    logPageVisit('ielts-dashboard');
  }, []);
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Professional Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-100 via-blue-50 to-slate-50 -z-10" />
      
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My IELTS Dashboard</h1>
            <p className="text-sm text-slate-600">Track your progress towards Band {dashboardData.targetBand}</p>
          </div>
          <Button onClick={() => navigate('/ielts-portal')} variant="outline" className="bg-white/80">
            Back to Portal
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Progress Overview */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Overall Progress Card */}
            <Card className="bg-white/90 backdrop-blur-sm border-slate-200/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-blue-600" />
                  Overall Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Progress to Band {dashboardData.targetBand}</span>
                    <span className="text-sm font-semibold">{dashboardData.overallProgress}%</span>
                  </div>
                  <Progress value={dashboardData.overallProgress} className="h-3" />
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Current: Band {dashboardData.currentBand}</span>
                    <span className="text-slate-600">Target: Band {dashboardData.targetBand}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Skills Progress */}
            <Card className="bg-white/90 backdrop-blur-sm border-slate-200/50">
              <CardHeader>
                <CardTitle>Skills Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {skillProgress.map((skill) => (
                    <div key={skill.name} className="p-4 rounded-lg bg-slate-50/80">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <skill.icon className="w-5 h-5 text-slate-600" />
                          <span className="font-medium">{skill.name}</span>
                        </div>
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                          Band {skill.score}
                        </Badge>
                      </div>
                      <Progress value={skill.progress} className="h-2" />
                      <p className="text-xs text-slate-500 mt-1">{skill.progress}% to target</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="bg-white/90 backdrop-blur-sm border-slate-200/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50">
                    <BookOpen className="w-4 h-4 text-green-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Completed Reading Practice Test 2</p>
                      <p className="text-xs text-slate-500">Score: 7.5 • 2 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50">
                    <Headphones className="w-4 h-4 text-blue-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Listening Exercise Session</p>
                      <p className="text-xs text-slate-500">Duration: 45 min • Yesterday</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-orange-50">
                    <PenTool className="w-4 h-4 text-orange-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Writing Task 1 Practice</p>
                      <p className="text-xs text-slate-500">Score: 6.0 • 2 days ago</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            
            {/* Quick Stats */}
            <Card className="bg-white/90 backdrop-blur-sm border-slate-200/50">
              <CardHeader>
                <CardTitle className="text-lg">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Tests Completed</span>
                  <span className="font-bold text-lg">{dashboardData.testsCompleted}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Study Streak</span>
                  <Badge className="bg-orange-100 text-orange-700">
                    {dashboardData.studyStreak} days
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Strongest Skill</span>
                  <Badge className="bg-green-100 text-green-700">
                    {dashboardData.strongestSkill}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Focus Area</span>
                  <Badge variant="destructive" className="bg-red-100 text-red-700">
                    {dashboardData.weakestSkill}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Next Recommended */}
            <Card className="bg-white/90 backdrop-blur-sm border-slate-200/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-purple-600" />
                  Next Recommended
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-purple-50 border border-purple-200">
                    <p className="font-medium text-sm">{dashboardData.nextTest}</p>
                    <p className="text-xs text-slate-500 mt-1">Recommended based on your weak areas</p>
                    <Button size="sm" className="mt-2 w-full bg-purple-600 hover:bg-purple-700">
                      Start Test
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Achievement */}
            <Card className="bg-white/90 backdrop-blur-sm border-slate-200/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-yellow-600" />
                  Recent Achievement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center p-4">
                  <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Award className="w-6 h-6 text-yellow-600" />
                  </div>
                  <p className="font-medium text-sm">15-Day Streak!</p>
                  <p className="text-xs text-slate-500">Keep up the great work!</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};
export default CommunityPage;