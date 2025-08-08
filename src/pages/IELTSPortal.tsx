import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Volume2, PenTool, MessageSquare, Target, Award, Clock, TrendingUp, Calendar, CheckCircle2, BarChart3 } from 'lucide-react';
import StudentLayout from '@/components/StudentLayout';
import { supabase } from '@/integrations/supabase/client';
import LoadingAnimation from '@/components/animations/LoadingAnimation';

const IELTSPortal = () => {
  const navigate = useNavigate();
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const skills = [{
    id: 'reading',
    name: 'Reading',
    icon: BookOpen,
    description: 'Academic and General Training passages with question types',
    sections: ['Multiple Choice', 'True/False/Not Given', 'Matching Headings'],
    difficulty: 'Band 4.0-9.0',
    timeLimit: '60 minutes',
    color: 'text-primary',
    bgColor: 'bg-primary/10'
  }, {
    id: 'listening',
    name: 'Listening',
    icon: Volume2,
    description: 'Four sections covering social and academic contexts',
    sections: ['Multiple Choice', 'Form Completion', 'Map/Plan Labelling'],
    difficulty: 'Band 4.0-9.0',
    timeLimit: '30 minutes',
    color: 'text-primary',
    bgColor: 'bg-primary/10'
  }, {
    id: 'writing',
    name: 'Writing',
    icon: PenTool,
    description: 'Task 1 (charts/graphs) and Task 2 (essay writing)',
    sections: ['Task 1: Data Description', 'Task 2: Essay Writing'],
    difficulty: 'Band 4.0-9.0',
    timeLimit: '60 minutes',
    color: 'text-primary',
    bgColor: 'bg-primary/10'
  }, {
    id: 'speaking',
    name: 'Speaking',
    icon: MessageSquare,
    description: 'Face-to-face interview with examiner in three parts',
    sections: ['Personal Questions', 'Individual Presentation', 'Discussion'],
    difficulty: 'Band 4.0-9.0',
    timeLimit: '11-14 minutes',
    color: 'text-primary',
    bgColor: 'bg-primary/10'
  }];
  const [availableTests, setAvailableTests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAvailableTests();

    // Preload the background image
    const img = new Image();
    img.onload = () => setImageLoaded(true);
    img.src = '/lovable-uploads/38d81cb0-fd21-4737-b0f5-32bc5d0ae774.png';
  }, []);

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

  return <div className="min-h-screen relative">
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed" style={{
      backgroundImage: `url('/lovable-uploads/38d81cb0-fd21-4737-b0f5-32bc5d0ae774.png')`,
      backgroundColor: '#f3f4f6'
    }} />
      <div className="relative z-10">
        <StudentLayout title="My IELTS Dashboard" showBackButton>
      <div className="space-y-8">
        {/* Skills Dashboard */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-black">IELTS Practice</h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {skills.map(skill => {
                const Icon = skill.icon;
                return <Card key={skill.id} className="relative aspect-square bg-white/80 border-white/20 rounded-2xl p-4 backdrop-blur-xl hover:bg-white/90 hover:scale-105 hover:shadow-glow-blue transition-all duration-300 cursor-pointer group" onClick={() => handleSkillPractice(skill.id)}>
                  <CardHeader className="pb-2 p-0">
                    <div className="flex flex-col items-center justify-center h-full">
                      <Icon className="w-10 h-10 text-foreground mb-3 group-hover:scale-110 transition-transform duration-300" />
                      <CardTitle className="text-sm font-semibold text-foreground text-center">{skill.name.toUpperCase()}</CardTitle>
                    </div>
                  </CardHeader>
                </Card>;
              })}
          </div>
        </section>

        {/* Practice Tests Dashboard */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-black">IELTS Mock Test</h2>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
            {availableTests.slice(0, 6).map(test => <Card key={test.test_number || test.id} className="relative bg-white/80 border-white/20 rounded-2xl p-6 backdrop-blur-xl hover:bg-white/90 hover:scale-[1.03] hover:shadow-glow-blue transition-all duration-300 group">
                <CardHeader className="pb-4 p-0">
                  <div className="flex items-center justify-center mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-primary/20 rounded-lg">
                        <BarChart3 className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-semibold text-foreground">{test.test_name}</CardTitle>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Button 
                    onClick={() => handleTestClick(test.id)} 
                    size="sm" 
                    disabled={test.comingSoon} 
                    className={`w-full mt-4 transition-colors font-semibold ${
                      test.comingSoon 
                        ? 'bg-muted text-muted-foreground border-0 hover:bg-muted cursor-not-allowed' 
                        : 'bg-primary text-primary-foreground border-0 hover:bg-primary/90 hover:scale-105'
                    }`}
                  >
                    {test.comingSoon ? <span className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Coming Soon
                      </span> : <span className="flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        Start Test
                      </span>}
                  </Button>
                </CardContent>
              </Card>)}
          </div>
        </section>
        </div>
        </StudentLayout>
      </div>
    </div>;
};

export default IELTSPortal;
