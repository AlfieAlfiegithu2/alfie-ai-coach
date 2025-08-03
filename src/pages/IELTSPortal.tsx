import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Volume2, PenTool, MessageSquare, Target, Award, Clock, TrendingUp, Calendar, CheckCircle2, BarChart3 } from 'lucide-react';
import StudentLayout from '@/components/StudentLayout';
import { supabase } from '@/integrations/supabase/client';

const IELTSPortal = () => {
  const navigate = useNavigate();
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);

  const skills = [
    {
      id: 'reading',
      name: 'Reading',
      icon: BookOpen,
      description: 'Academic and General Training passages with question types',
      sections: ['Multiple Choice', 'True/False/Not Given', 'Matching Headings'],
      difficulty: 'Band 4.0-9.0',
      timeLimit: '60 minutes',
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
    {
      id: 'listening',
      name: 'Listening',
      icon: Volume2,
      description: 'Four sections covering social and academic contexts',
      sections: ['Multiple Choice', 'Form Completion', 'Map/Plan Labelling'],
      difficulty: 'Band 4.0-9.0',
      timeLimit: '30 minutes',
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
    {
      id: 'writing',
      name: 'Writing',
      icon: PenTool,
      description: 'Task 1 (charts/graphs) and Task 2 (essay writing)',
      sections: ['Task 1: Data Description', 'Task 2: Essay Writing'],
      difficulty: 'Band 4.0-9.0',
      timeLimit: '60 minutes',
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
    {
      id: 'speaking',
      name: 'Speaking',
      icon: MessageSquare,
      description: 'Face-to-face interview with examiner in three parts',
      sections: ['Personal Questions', 'Individual Presentation', 'Discussion'],
      difficulty: 'Band 4.0-9.0',
      timeLimit: '11-14 minutes',
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    }
  ];

  const [availableTests, setAvailableTests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAvailableTests();
  }, []);

  const loadAvailableTests = async () => {
    setIsLoading(true);
    try {
      // Fetch all IELTS tests from admin (case insensitive)
      const { data: testsData, error: testsError } = await supabase
        .from('tests')
        .select('*')
        .ilike('test_type', 'IELTS')
        .order('created_at', { ascending: true });

      if (testsError) {
        console.error('Error fetching tests:', testsError);
        throw testsError;
      }

      // Fetch questions to check test completion status
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('test_id, part_number, id');

      if (questionsError) {
        console.error('Error fetching questions:', questionsError);
        throw questionsError;
      }

      // Fetch speaking prompts to check speaking tests
      const { data: speakingData, error: speakingError } = await supabase
        .from('speaking_prompts')
        .select('test_number, cambridge_book, id');

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
        const matchingTest = testsData?.find(t => 
          t.test_name === sp.test_number?.toString() || 
          t.test_name.includes(sp.test_number?.toString() || '') ||
          sp.cambridge_book?.includes(t.test_name)
        );
        
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
        const speakingCount = speakingData?.filter(sp => 
          sp.test_number?.toString() === test.test_name || 
          sp.cambridge_book?.includes(test.test_name)
        ).length || 0;
        
        const totalContent = questionCount + speakingCount;
        
        return {
          id: test.id,
          test_name: test.test_name, // Use exact test name from admin
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
      // Show writing tests section instead of generic practice
      document.getElementById('writing-tests')?.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate(`/${skillId}`);
    }
  };

  const handleTestClick = (testId: string) => {
    console.log(`🧪 Opening IELTS test ${testId}`);
    navigate(`/ielts-test-modules/${testId}`);
  };

  return (
    <StudentLayout title="My IELTS Dashboard" showBackButton>
      <div className="space-y-8">
        {/* Dashboard Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Welcome back!</h1>
              <p className="text-gray-600">Track your IELTS preparation progress</p>
            </div>
            <Badge variant="outline" className="px-3 py-1 text-blue-600 border-blue-200 bg-blue-50">
              Target: Band 7.5
            </Badge>
          </div>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-700">6.5</div>
              <div className="text-sm text-green-600">Current Band</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Calendar className="w-6 h-6 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-700">45</div>
              <div className="text-sm text-blue-600">Days Left</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <CheckCircle2 className="w-6 h-6 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-purple-700">12</div>
              <div className="text-sm text-purple-600">Tests Completed</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <BarChart3 className="w-6 h-6 text-orange-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-orange-700">85%</div>
              <div className="text-sm text-orange-600">Progress</div>
            </div>
          </div>
        </div>

        {/* Skills Dashboard */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Skills Progress</h2>
            <Button variant="outline" size="sm">View All</Button>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {skills.map((skill) => {
              const Icon = skill.icon;
              return (
                <Card 
                  key={skill.id} 
                  className="bg-white border border-gray-200 hover:shadow-md transition-all duration-200 cursor-pointer"
                  onClick={() => setSelectedSkill(skill.id)}
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-12 h-12 rounded-xl ${skill.bgColor} flex items-center justify-center`}>
                        <Icon className={`w-6 h-6 ${skill.color}`} />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{skill.name}</CardTitle>
                        <div className="text-sm text-gray-500">Band 6.8</div>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{width: '68%'}}></div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-text-secondary">Difficulty:</span>
                        <Badge variant="secondary">{skill.difficulty}</Badge>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-text-secondary">Duration:</span>
                        <span className="font-medium">{skill.timeLimit}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-text-primary">Question Types:</p>
                      <div className="space-y-1">
                        {skill.sections.slice(0, 2).map((section, index) => (
                          <p key={index} className="text-xs text-text-secondary">• {section}</p>
                        ))}
                        {skill.sections.length > 2 && (
                          <p className="text-xs text-text-tertiary">+ {skill.sections.length - 2} more</p>
                        )}
                      </div>
                    </div>

                    <Button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSkillPractice(skill.id);
                      }}
                      className="w-full btn-primary"
                      size="sm"
                    >
                      Practice {skill.name}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Practice Tests Dashboard */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Recent Practice Tests</h2>
            <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">
              {availableTests.length} Available
            </Badge>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableTests.slice(0, 6).map((test) => (
              <Card key={test.test_number || test.id} className="bg-white border border-gray-200 hover:shadow-md transition-all duration-200">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{test.test_name}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-primary" />
                      {test.status === 'complete' && (
                        <Badge variant="default" className="text-xs">Available</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                   <Button 
                    onClick={() => handleTestClick(test.id)}
                     className="w-full btn-primary"
                     size="sm"
                     disabled={test.comingSoon}
                   >
                     {test.comingSoon ? (
                       <span className="flex items-center gap-2">
                         <Clock className="w-4 h-4" />
                         Coming Soon
                       </span>
                     ) : (
                       'Enter Test'
                     )}
                   </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Quick Actions */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <Button 
              onClick={() => navigate('/tests')}
              className="flex items-center gap-2 justify-start p-4 h-auto bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
              variant="outline"
            >
              <Target className="w-5 h-5" />
              <div className="text-left">
                <div className="font-medium">Take Practice Test</div>
                <div className="text-sm opacity-75">Full IELTS simulation</div>
              </div>
            </Button>
            <Button 
              onClick={() => navigate('/speaking')}
              className="flex items-center gap-2 justify-start p-4 h-auto bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
              variant="outline"
            >
              <MessageSquare className="w-5 h-5" />
              <div className="text-left">
                <div className="font-medium">Speaking Practice</div>
                <div className="text-sm opacity-75">AI-powered feedback</div>
              </div>
            </Button>
            <Button 
              onClick={() => navigate('/writing')}
              className="flex items-center gap-2 justify-start p-4 h-auto bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200"
              variant="outline"
            >
              <PenTool className="w-5 h-5" />
              <div className="text-left">
                <div className="font-medium">Writing Tasks</div>
                <div className="text-sm opacity-75">Essay & reports</div>
              </div>
            </Button>
          </div>
        </section>
      </div>
    </StudentLayout>
  );
};

export default IELTSPortal;