import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Headphones, PenTool, Mic, Home, ArrowLeft } from 'lucide-react';
import StudentLayout from '@/components/StudentLayout';
import { supabase } from '@/integrations/supabase/client';
import LoadingAnimation from '@/components/animations/LoadingAnimation';
import { useAuth } from '@/hooks/useAuth';

const skillIcons = {
  listening: Headphones,
  reading: BookOpen,
  writing: PenTool,
  speaking: Mic
};

const skillColors = {
  listening: 'from-blue-500 to-blue-600',
  reading: 'from-green-500 to-green-600', 
  writing: 'from-purple-500 to-purple-600',
  speaking: 'from-red-500 to-red-600'
};

const IELTSSkillTests = () => {
  const { skill } = useParams<{ skill: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tests, setTests] = useState<any[]>([]);
  const [userResults, setUserResults] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);

  const skillName = skill ? skill.charAt(0).toUpperCase() + skill.slice(1) : "";
  const SkillIcon = skill ? skillIcons[skill as keyof typeof skillIcons] : BookOpen;
  const skillColor = skill ? skillColors[skill as keyof typeof skillColors] : 'from-gray-500 to-gray-600';

  useEffect(() => {
    if (skill) {
      loadSkillTests();
    }
  }, [skill, user]);

  const loadSkillTests = async () => {
    if (!skill) return;

    setIsLoading(true);
    try {
      let testsData = [];

      // Fetch from tests table - using new database structure
      console.log(`Loading IELTS ${skillName} tests...`);
      const { data, error } = await supabase
        .from('tests')
        .select('*')
        .eq('test_type', 'IELTS')
        .eq('module', skillName)
        .order('test_name', { ascending: true });

      if (error) {
        console.error('Error loading skill tests:', error);
        throw error;
      }
      testsData = data || [];

      // For writing tests, also get question count to show task info
      if (skill === 'writing' && testsData.length > 0) {
        for (const test of testsData) {
          const { count, error: questionsError } = await supabase
            .from('questions')
            .select('*', { count: 'exact', head: true })
            .eq('test_id', test.id);

          if (!questionsError) {
            test.questionsCount = count || 0;
          }
        }
      }

      // Load user's results for these tests if authenticated
      let results: Record<string, any> = {};
      if (user && testsData.length > 0) {
        const { data: resultsData, error: resultsError } = await supabase
          .from('test_results')
          .select('*')
          .eq('user_id', user.id)
          .ilike('test_type', `%${skill}%`)
          .order('created_at', { ascending: false });

        if (!resultsError && resultsData) {
          results = resultsData.reduce((acc, result) => {
            const key = result.cambridge_book || result.test_type;
            if (!acc[key] || new Date(result.created_at) > new Date(acc[key].created_at)) {
              acc[key] = result;
            }
            return acc;
          }, {});
        }
      }

      setTests(testsData);
      setUserResults(results);
    } catch (error) {
      console.error('Error loading skill tests:', error);
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

  const handleTestStart = (test: any) => {
    // Navigate to the appropriate test interface based on skill
    if (skill === 'reading') {
      navigate(`/reading-test/${test.id}`);
    } else if (skill === 'listening') {
      navigate(`/listening-test/${test.id}`);
    } else if (skill === 'writing') {
      // For writing, navigate to IELTS Writing Test interface
      navigate(`/ielts-writing-test/${test.id}`);
    } else if (skill === 'speaking') {
      navigate(`/ielts-speaking-test/${test.id}`);
    } else {
      // Fallback to general test modules
      navigate(`/ielts-test-modules/${test.id}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingAnimation />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed" 
           style={{
             backgroundImage: `url('/lovable-uploads/38d81cb0-fd21-4737-b0f5-32bc5d0ae774.png')`,
             backgroundColor: '#f3f4f6'
           }} />
      <div className="relative z-10">
        <StudentLayout title={`IELTS ${skillName} Tests`} showBackButton>
          <div className="space-y-3 md:space-y-4 max-w-6xl mx-auto px-3 md:px-4">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 mb-2">
              <Button variant="ghost" onClick={() => navigate('/hero')} className="text-text-secondary px-2 py-1 h-8">
                Home
              </Button>
              <Button variant="ghost" onClick={() => navigate('/ielts')} className="text-text-secondary px-2 py-1 h-8">
                IELTS Tests
              </Button>
            </div>

            {/* Header */}
            <div className="text-center space-y-4 mb-6">
              <h1 className="text-xl md:text-2xl font-bold text-foreground">
                IELTS {skillName} Tests
              </h1>
              <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
                Practice authentic IELTS {skillName.toLowerCase()} tests and track your progress
              </p>
            </div>

            {/* Tests Grid */}
            <div className="space-y-4">
              {tests.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                  {tests.map((test) => {
                    // Use test_name directly as display name
                    const displayName = test.test_name;
                    const result = userResults[displayName] || userResults[test.test_name];
                    const hasResult = !!result;
                    const band = hasResult ? percentageToIELTSBand(result.score_percentage) : null;

                    return (
                      <Card
                        key={test.id}
                        className="hover:shadow-lg transition-all duration-200 cursor-pointer bg-card/80 backdrop-blur-sm"
                        onClick={() => handleTestStart(test)}
                      >
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base md:text-lg flex items-center justify-between">
                            <span>{displayName}</span>
                            {hasResult && (
                              <Badge variant="secondary" className="text-xs">Band {band}</Badge>
                            )}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <Button 
                            className="w-full" 
                            size="sm"
                          >
                            {hasResult ? 'Retake Test' : 'Start Test'}
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <h3 className="text-lg font-semibold mb-2 text-foreground">No {skillName} Tests Available</h3>
                  <p className="text-muted-foreground mb-4">
                    {skillName} tests are being prepared. Check back soon!
                  </p>
                  <Button onClick={() => navigate('/ielts')} variant="outline">
                    Back to IELTS Hub
                  </Button>
                </div>
              )}
            </div>
          </div>
        </StudentLayout>
      </div>
    </div>
  );
};

export default IELTSSkillTests;