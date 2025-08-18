import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import StudentLayout from '@/components/StudentLayout';
import { supabase } from '@/integrations/supabase/client';
import LoadingAnimation from '@/components/animations/LoadingAnimation';
import { useAuth } from '@/hooks/useAuth';
import { Home, BookOpen, Headphones, PenTool, Mic, Brain, Zap, Repeat, Volume2, Shuffle, Search, Link, Target } from 'lucide-react';
import { SKILLS } from '@/lib/skills';

// IELTS Core Skills
const IELTS_SKILLS = [
  { 
    id: 'reading', 
    title: 'Reading', 
    description: 'Academic & General texts',
    icon: BookOpen 
  },
  { 
    id: 'listening', 
    title: 'Listening', 
    description: 'Audio comprehension',
    icon: Headphones 
  },
  { 
    id: 'writing', 
    title: 'Writing', 
    description: 'Task 1 & Task 2',
    icon: PenTool 
  },
  { 
    id: 'speaking', 
    title: 'Speaking', 
    description: 'Interview & presentation',
    icon: Mic 
  }
];

// Skill Practice Icons Map
const SKILL_ICONS = {
  'vocabulary-builder': Brain,
  'grammar-fix-it': Zap,
  'paraphrasing-challenge': Repeat,
  'pronunciation-repeat-after-me': Volume2,
  'sentence-structure-scramble': Shuffle,
  'listening-for-details': Search,
  'synonym-match': Link,
  'collocation-connect': Target
};

const IELTSPortal = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [availableTests, setAvailableTests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [skillBands, setSkillBands] = useState<Record<string, string>>({});
  useEffect(() => {
    loadAvailableTests();

    if (user) {
      loadSkillBands();
    }

    // Preload the background image
    const img = new Image();
    img.onload = () => setImageLoaded(true);
    img.src = '/lovable-uploads/38d81cb0-fd21-4737-b0f5-32bc5d0ae774.png';
  }, [user]);

  const loadAvailableTests = async () => {
    setIsLoading(true);
    try {
      // Fetch all IELTS tests from admin (case insensitive)
      const {
        data: testsData,
        error: testsError
      } = await supabase.from('tests').select('*').ilike('test_type', 'IELTS').order('created_at', {
        ascending: true
      });
      if (testsError) {
        console.error('Error fetching tests:', testsError);
        throw testsError;
      }

      // Fetch questions to check test completion status
      const {
        data: questionsData,
        error: questionsError
      } = await supabase.from('questions').select('test_id, part_number, id');
      if (questionsError) {
        console.error('Error fetching questions:', questionsError);
        throw questionsError;
      }

      // Fetch speaking prompts to check speaking tests
      const {
        data: speakingData,
        error: speakingError
      } = await supabase.from('speaking_prompts').select('test_number, cambridge_book, id');
      if (speakingError) {
        console.error('Error fetching speaking prompts:', speakingError);
        throw speakingError;
      }

      // Group questions by test and check module availability
      const testModules = new Map();
      questionsData?.forEach(q => {
        if (q.test_id) {
          if (!testModules.has(q.test_id)) {
            testModules.set(q.test_id, new Set());
          }
          // Determine module based on question structure - this is a better approach
          if (q.part_number <= 3) {
            testModules.get(q.test_id).add('reading');
          } else {
            testModules.get(q.test_id).add('writing');
          }
        }
      });

      // Add speaking tests
      speakingData?.forEach(sp => {
        // Find corresponding test by name
        const matchingTest = testsData?.find(t => t.test_name === sp.test_number?.toString() || t.test_name.includes(sp.test_number?.toString() || '') || sp.cambridge_book?.includes(t.test_name));
        if (matchingTest) {
          if (!testModules.has(matchingTest.id)) {
            testModules.set(matchingTest.id, new Set());
          }
          testModules.get(matchingTest.id).add('speaking');
        }
      });

      const transformedTests = testsData?.map(test => {
        const availableModules = testModules.get(test.id) || new Set();
        const questionCount = questionsData?.filter(q => q.test_id === test.id).length || 0;
        const speakingCount = speakingData?.filter(sp => sp.test_number?.toString() === test.test_name || sp.cambridge_book?.includes(test.test_name)).length || 0;
        const totalContent = questionCount + speakingCount;
        return {
          id: test.id,
          test_name: test.test_name,
          test_number: parseInt(test.test_name.match(/\d+/)?.[0] || '1'),
          status: totalContent > 0 ? 'complete' : 'incomplete',
          modules: Array.from(availableModules),
          total_questions: questionCount,
          speaking_prompts: speakingCount,
          comingSoon: totalContent === 0
        };
      }) || [];
      setAvailableTests(transformedTests);
    } catch (error) {
      console.error('Error loading tests:', error);
      setAvailableTests([]);
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

  const loadSkillBands = async () => {
    if (!user) return;
    try {
      const skillsToFetch = ['reading', 'listening', 'writing', 'speaking'];
      const bands: Record<string, string> = {};

      for (const s of skillsToFetch) {
        const { data, error } = await supabase
          .from('test_results')
          .select('score_percentage, created_at, test_type')
          .eq('user_id', user.id)
          .ilike('test_type', `%${s}%`)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!error && data?.score_percentage != null) {
          const band = percentageToIELTSBand(data.score_percentage);
          bands[s] = `Band ${band}`;
        }
      }

      setSkillBands(bands);
    } catch (e) {
      console.error('Error loading skill bands:', e);
    }
  };

  const handleSkillPractice = (skillId: string) => {
    console.log(`🚀 Starting IELTS ${skillId} practice`);
    if (skillId === 'writing') {
      document.getElementById('writing-tests')?.scrollIntoView({
        behavior: 'smooth'
      });
    } else {
      navigate(`/${skillId}`);
    }
  };

  const handleTestClick = (testId: string) => {
    console.log(`🧪 Opening IELTS test ${testId}`);
    navigate(`/ielts-test-modules/${testId}`);
  };

  if (!imageLoaded) {
    return <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <LoadingAnimation />
      </div>;
  }

  return (
    <div className="min-h-screen relative">
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed" 
           style={{
             backgroundImage: `url('/lovable-uploads/38d81cb0-fd21-4737-b0f5-32bc5d0ae774.png')`,
             backgroundColor: '#f3f4f6'
           }} />
      <div className="relative z-10">
        <StudentLayout title="My IELTS Dashboard" showBackButton>
          <div className="space-y-3 md:space-y-4 max-w-6xl mx-auto px-3 md:px-4">
            <div className="flex items-center mb-2">
              <Button variant="ghost" onClick={() => navigate('/')} className="text-text-secondary px-2 py-1 h-8">
                <Home className="mr-2 h-4 w-4" /> Home
              </Button>
            </div>
            
            {/* Skill Practice Quick Links */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
              {IELTS_SKILLS.map((skill) => (
                <Card key={skill.id} className="hover:shadow-lg transition-all duration-200 cursor-pointer bg-card/80 backdrop-blur-sm" onClick={() => handleSkillPractice(skill.id)}>
                  <CardContent className="p-3 md:p-4 text-center">
                    <div className="mb-3">
                      <skill.icon className="h-8 w-8 md:h-10 md:w-10 mx-auto text-primary" />
                    </div>
                    <h3 className="font-semibold text-sm md:text-base mb-1">{skill.title}</h3>
                    <p className="text-xs text-muted-foreground mb-2">{skill.description}</p>
                    {skillBands[skill.id] && (
                      <div className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">
                        Last: {skillBands[skill.id]}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Sharpening Your Skills */}
            <div className="mb-6">
              <h2 className="text-xl md:text-2xl font-bold mb-4 text-foreground">Sharpening Your Skills</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                {SKILLS.map((skill) => {
                  const IconComponent = SKILL_ICONS[skill.slug as keyof typeof SKILL_ICONS];
                  return (
                    <Card key={skill.slug} className="hover:shadow-lg transition-all duration-200 cursor-pointer bg-card/80 backdrop-blur-sm" onClick={() => navigate(`/skill-practice/${skill.slug}`)}>
                      <CardContent className="p-3 md:p-4 text-center">
                        <div className="mb-3">
                          <IconComponent className="h-8 w-8 md:h-10 md:w-10 mx-auto text-primary" />
                        </div>
                        <h3 className="font-semibold text-xs md:text-sm mb-1">{skill.label}</h3>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Available IELTS Tests */}
            <div className="mb-6">
              <h2 className="text-xl md:text-2xl font-bold mb-4 text-foreground">Complete IELTS Tests</h2>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingAnimation />
                </div>
              ) : availableTests.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                  {availableTests.map((test) => (
                    <Card key={test.id} className="hover:shadow-lg transition-all duration-200 cursor-pointer bg-card/80 backdrop-blur-sm" onClick={() => handleTestClick(test.id)}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base md:text-lg flex justify-between items-center">
                          <span>Test {test.test_number}</span>
                          {test.comingSoon && (
                            <span className="text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded">
                              Coming Soon
                            </span>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="text-xs md:text-sm text-muted-foreground mb-3">
                          <p className="mb-1">{test.test_name}</p>
                          <div className="flex flex-wrap gap-1">
                            {['reading', 'listening', 'writing', 'speaking'].map((module) => {
                              const hasModule = test.modules.includes(module);
                              return (
                                <span key={module} className={`px-2 py-1 rounded text-xs capitalize ${
                                  hasModule 
                                    ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' 
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                                }`}>
                                  {module}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {test.total_questions > 0 && (
                            <p>Questions: {test.total_questions}</p>
                          )}
                          {test.speaking_prompts > 0 && (
                            <p>Speaking: {test.speaking_prompts} prompts</p>
                          )}
                        </div>
                        <Button 
                          className="w-full mt-3" 
                          size="sm" 
                          disabled={test.comingSoon}
                        >
                          {test.comingSoon ? 'Coming Soon' : 'Start Test'}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="bg-card/80 backdrop-blur-sm">
                  <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground">No IELTS tests available yet. Check back soon!</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </StudentLayout>
      </div>
    </div>
  );
};

export default IELTSPortal;
