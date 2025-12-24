import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Headphones, PenTool, Mic, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StudentLayout from '@/components/StudentLayout';
import { supabase } from '@/integrations/supabase/client';
import LoadingAnimation from '@/components/animations/LoadingAnimation';
import { useAuth } from '@/hooks/useAuth';

const skillCategories = [
  {
    skill: 'Listening',
    icon: Headphones,
    path: '/ielts/listening',
    description: 'Practice IELTS listening comprehension',
    color: 'from-blue-500 to-blue-600'
  },
  {
    skill: 'Reading',
    icon: BookOpen,
    path: '/ielts/reading',
    description: 'Master IELTS reading passages',
    color: 'from-green-500 to-green-600'
  },
  {
    skill: 'Writing',
    icon: PenTool,
    path: '/ielts/writing',
    description: 'Improve your IELTS writing skills',
    color: 'from-purple-500 to-purple-600'
  },
  {
    skill: 'Speaking',
    icon: Mic,
    path: '/ielts/speaking',
    description: 'Practice IELTS speaking tasks',
    color: 'from-red-500 to-red-600'
  }
];

const IELTSSkillHub = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [skillStats, setSkillStats] = useState<Record<string, { tests: number; lastScore?: string }>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSkillStats();
  }, [user]);

  const loadSkillStats = async () => {
    setIsLoading(true);
    try {
      // Load test counts per skill
      const { data: tests, error: testsError } = await supabase
        .from('tests')
        .select('module')
        .eq('test_type', 'IELTS');

      if (testsError) throw testsError;

      // Count tests by skill
      const counts: Record<string, { tests: number; lastScore?: string }> = {};
      skillCategories.forEach(skill => {
        counts[skill.skill] = {
          tests: tests?.filter(t => t.module === skill.skill).length || 0
        };
      });

      // Load user's latest scores if authenticated
      if (user) {
        for (const skill of skillCategories) {
          const { data: results, error: resultsError } = await supabase
            .from('test_results')
            .select('score_percentage, created_at')
            .eq('user_id', user.id)
            .ilike('test_type', `%${skill.skill}%`)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (!resultsError && results?.score_percentage != null) {
            const band = percentageToIELTSBand(results.score_percentage);
            counts[skill.skill].lastScore = `Band ${band}`;
          }
        }
      }

      setSkillStats(counts);
    } catch (error) {
      console.error('Error loading skill stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const percentageToIELTSBand = (percentage: number): number => {
    if (percentage >= 95) return 9;
    if (percentage >= 90) return 8.5;
    if (percentage >= 85) return 8;
    if (percentage >= 80) return 7.5;
    if (percentage >= 75) return 7;
    if (percentage >= 70) return 6.5;
    if (percentage >= 65) return 6;
    if (percentage >= 60) return 5.5;
    if (percentage >= 55) return 5;
    if (percentage >= 50) return 4.5;
    if (percentage >= 45) return 4;
    if (percentage >= 40) return 3.5;
    if (percentage >= 35) return 3;
    if (percentage >= 30) return 2.5;
    if (percentage >= 25) return 2;
    if (percentage >= 20) return 1.5;
    if (percentage >= 15) return 1;
    if (percentage >= 10) return 0.5;
    return 0;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingAnimation />
      </div>
    );
  }

  return (
    <StudentLayout title="IELTS Practice Tests" showBackButton>
      <div className="space-y-6 max-w-6xl mx-auto px-4 font-nunito">
        {/* Breadcrumb */}
        <div className="flex items-center mb-4">
          <Button variant="ghost" onClick={() => navigate('/')} className="text-muted-foreground px-2 py-1 h-8">
            <Home className="mr-2 h-4 w-4" /> Home
          </Button>
        </div>

        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            IELTS Practice Tests
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Choose your skill focus and practice with authentic IELTS test materials
          </p>
        </div>

        {/* Skills Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {skillCategories.map((category) => {
            const stats = skillStats[category.skill] || { tests: 0 };
            const Icon = category.icon;

            return (
              <Card
                key={category.skill}
                className="cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:scale-105 border-2 hover:border-primary/20"
                onClick={() => navigate(category.path)}
              >
                <CardHeader className="text-center pb-4">
                  <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${category.color} mx-auto mb-4 flex items-center justify-center`}>
                    <Icon className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="text-2xl font-bold">{category.skill}</CardTitle>
                  <p className="text-muted-foreground">{category.description}</p>
                </CardHeader>
                <CardContent className="text-center space-y-3">
                  <div className="flex justify-center items-center space-x-4">
                    <Badge variant="secondary" className="text-sm">
                      {stats.tests} tests available
                    </Badge>
                    {stats.lastScore && (
                      <Badge variant="outline" className="text-sm">
                        Last: {stats.lastScore}
                      </Badge>
                    )}
                  </div>
                  <Button
                    className="w-full"
                    size="lg"
                    disabled={stats.tests === 0}
                  >
                    {stats.tests === 0 ? 'Coming Soon' : `Practice ${category.skill}`}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Info Section */}
        <div className="bg-muted/50 rounded-lg p-6 text-center">
          <h3 className="text-lg font-semibold mb-2">Complete IELTS Preparation</h3>
          <p className="text-muted-foreground">
            Each skill category contains authentic IELTS practice tests with detailed feedback and scoring.
            Track your progress and identify areas for improvement across all four skills.
          </p>
        </div>
      </div>
    </StudentLayout>
  );
};

export default IELTSSkillHub;