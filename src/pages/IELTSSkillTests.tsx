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
      // Load tests for this skill
      const { data: testsData, error: testsError } = await supabase
        .from('tests')
        .select('*')
        .eq('test_type', 'IELTS')
        .eq('skill_category', skillName)
        .order('created_at', { ascending: true });

      if (testsError) throw testsError;

      // Load user's results for these tests if authenticated
      let results: Record<string, any> = {};
      if (user && testsData) {
        const testIds = testsData.map(t => t.id);
        const { data: resultsData, error: resultsError } = await supabase
          .from('test_results')
          .select('*')
          .eq('user_id', user.id)
          .in('cambridge_book', testsData.map(t => t.test_name))
          .order('created_at', { ascending: false });

        if (!resultsError && resultsData) {
          results = resultsData.reduce((acc, result) => {
            if (!acc[result.cambridge_book] || new Date(result.created_at) > new Date(acc[result.cambridge_book].created_at)) {
              acc[result.cambridge_book] = result;
            }
            return acc;
          }, {});
        }
      }

      setTests(testsData || []);
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
      navigate(`/writing-test/${test.id}`);
    } else if (skill === 'speaking') {
      navigate(`/speaking-test/${test.id}`);
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
    <StudentLayout title={`IELTS ${skillName} Tests`} showBackButton>
      <div className="space-y-6 max-w-6xl mx-auto px-4">
        {/* Breadcrumb */}
        <div className="flex items-center space-x-2 mb-4">
          <Button variant="ghost" onClick={() => navigate('/')} className="text-muted-foreground px-2 py-1 h-8">
            <Home className="mr-2 h-4 w-4" /> Home
          </Button>
          <span className="text-muted-foreground">/</span>
          <Button variant="ghost" onClick={() => navigate('/ielts')} className="text-muted-foreground px-2 py-1 h-8">
            IELTS Tests
          </Button>
          <span className="text-muted-foreground">/</span>
          <span className="text-foreground font-medium">{skillName}</span>
        </div>

        {/* Header */}
        <div className="text-center space-y-4">
          <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${skillColor} mx-auto flex items-center justify-center`}>
            <SkillIcon className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            IELTS {skillName} Tests
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Practice authentic IELTS {skillName.toLowerCase()} tests and track your progress
          </p>
        </div>

        {/* Tests Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Available Tests</h2>
            <Badge variant="outline">{tests.length} tests available</Badge>
          </div>

          {tests.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tests.map((test) => {
                const result = userResults[test.test_name];
                const hasResult = !!result;
                const band = hasResult ? percentageToIELTSBand(result.score_percentage) : null;
                
                return (
                  <Card 
                    key={test.id}
                    className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-105"
                    onClick={() => handleTestStart(test)}
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center space-x-2">
                          <SkillIcon className="w-5 h-5 text-primary" />
                          <span>{test.test_name}</span>
                        </CardTitle>
                        {hasResult && (
                          <Badge variant="secondary">Band {band}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Created: {new Date(test.created_at).toLocaleDateString()}
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Type:</span>
                        <span className="font-medium">{test.test_type} {skillName}</span>
                      </div>
                      
                      {hasResult && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Last Score:</span>
                          <span className="font-medium">{result.score_percentage}%</span>
                        </div>
                      )}

                      <Button 
                        className="w-full" 
                        size="lg"
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
              <SkillIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No {skillName} Tests Available</h3>
              <p className="text-muted-foreground mb-4">
                {skillName} tests are being prepared. Check back soon!
              </p>
              <Button onClick={() => navigate('/ielts')} variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to IELTS Hub
              </Button>
            </div>
          )}
        </div>

        {/* Tips Section */}
        <div className="bg-muted/50 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-3">IELTS {skillName} Tips</h3>
          <ul className="space-y-2 text-muted-foreground">
            {skill === 'reading' && (
              <>
                <li>• Read the questions before reading the passage</li>
                <li>• Look for keywords and synonyms in the text</li>
                <li>• Practice skimming and scanning techniques</li>
              </>
            )}
            {skill === 'listening' && (
              <>
                <li>• Read the questions before the audio starts</li>
                <li>• Listen for keywords and context clues</li>
                <li>• Use the time between sections wisely</li>
              </>
            )}
            {skill === 'writing' && (
              <>
                <li>• Plan your essay structure before writing</li>
                <li>• Use a variety of vocabulary and grammar structures</li>
                <li>• Leave time to review and edit your work</li>
              </>
            )}
            {skill === 'speaking' && (
              <>
                <li>• Practice speaking clearly and at a natural pace</li>
                <li>• Extend your answers with examples and explanations</li>
                <li>• Use a range of vocabulary and expressions</li>
              </>
            )}
          </ul>
        </div>
      </div>
    </StudentLayout>
  );
};

export default IELTSSkillTests;