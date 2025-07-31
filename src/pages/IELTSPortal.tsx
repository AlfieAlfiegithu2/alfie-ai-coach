import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Volume2, PenTool, MessageSquare, Target, Award, Clock } from 'lucide-react';
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
      // Fetch from universal tests table
      const { data: testsData, error: testsError } = await supabase
        .from('tests')
        .select('*')
        .eq('test_type', 'ielts')
        .eq('module', 'reading')
        .order('created_at', { ascending: true });

      if (testsError) {
        console.error('Error fetching tests:', testsError);
        throw testsError;
      }

      // Fetch questions from universal table only
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('test_id, id');

      if (questionsError) {
        console.error('Error fetching questions:', questionsError);
        throw questionsError;
      }

      // Count questions per test
      const questionCounts = new Map();
      questionsData?.forEach(q => {
        if (q.test_id) {
          const count = questionCounts.get(q.test_id) || 0;
          questionCounts.set(q.test_id, count + 1);
        }
      });

      const transformedTests = testsData?.map(test => {
        const questionCount = questionCounts.get(test.id) || 0;
        return {
          id: test.id,
          test_name: test.test_name,
          test_number: parseInt(test.test_name.match(/\d+/)?.[0] || '1'),
          status: questionCount > 0 ? 'complete' : 'incomplete',
          parts_completed: questionCount > 0 ? 3 : 0,
          total_questions: questionCount,
          comingSoon: questionCount === 0
        };
      }) || [];

      // Only show tests that actually exist in the admin panel
      setAvailableTests(transformedTests);
    } catch (error) {
      console.error('Error loading tests:', error);
      // Show empty array if error occurs
      setAvailableTests([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkillPractice = (skillId: string) => {
    console.log(`🚀 Starting IELTS ${skillId} practice`);
    navigate(`/${skillId}`);
  };

  const handleMockTest = (testId: number) => {
    console.log(`🧪 Starting IELTS mock test ${testId}`);
    navigate(`/enhanced-reading-test/${testId}`);
  };

  return (
    <StudentLayout title="IELTS Portal" showBackButton>
      <div className="space-y-8">
        <div className="text-center">
          <Badge variant="outline" className="mb-4 px-4 py-1 text-primary border-primary/20">
            IELTS ACADEMIC & GENERAL
          </Badge>
          <h1 className="text-heading-2 mb-4">IELTS Test Preparation</h1>
          <p className="text-body-large max-w-3xl mx-auto">
            Master the International English Language Testing System with comprehensive practice materials, 
            expert feedback, and realistic mock tests for Academic and General Training.
          </p>
        </div>

        <section>
          <h2 className="text-heading-3 mb-6">IELTS Skills Practice</h2>
          <p className="text-text-secondary mb-6">Select a skill to practice specific IELTS question types</p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {skills.map((skill) => {
              const Icon = skill.icon;
              return (
                <Card 
                  key={skill.id} 
                  className={`card-interactive hover:scale-105 transition-all duration-300 ${
                    selectedSkill === skill.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedSkill(skill.id)}
                >
                  <CardHeader className="text-center pb-4">
                    <div className={`w-16 h-16 mx-auto rounded-2xl ${skill.bgColor} flex items-center justify-center mb-4`}>
                      <Icon className={`w-8 h-8 ${skill.color}`} />
                    </div>
                    <CardTitle className="text-xl">{skill.name}</CardTitle>
                    <p className="text-text-secondary text-sm">{skill.description}</p>
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

        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-heading-3">IELTS Mock Tests</h2>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
              Band Score Prediction
            </Badge>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availableTests.map((test) => (
              <Card key={test.test_number || test.id} className="card-modern hover-lift">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{test.test_name || test.title || `IELTS Test ${test.test_number || test.id}`}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-primary" />
                      {test.status === 'complete' && (
                        <Badge variant="default" className="text-xs">Complete</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-text-secondary" />
                      <span>Band 4.0-9.0</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-text-secondary" />
                      <span>60 minutes</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-text-secondary" />
                      <span>{test.parts_completed || 0}/3 parts</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-text-secondary" />
                      <span>{test.total_questions || 0} questions</span>
                    </div>
                  </div>

                   <Button 
                     onClick={() => handleMockTest(test.test_number || test.id)}
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
                       'Start Reading Test'
                     )}
                   </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="bg-surface-1 rounded-3xl p-8">
          <div className="text-center">
            <h3 className="text-heading-3 mb-4">Ready to Begin?</h3>
            <p className="text-body mb-6">
              Start with a diagnostic test or jump into skill-specific practice
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={() => navigate('/tests')}
                className="btn-gradient px-8"
                size="lg"
              >
                Take Diagnostic Test
              </Button>
              <Button 
                onClick={() => navigate('/dashboard')}
                variant="outline"
                size="lg"
              >
                My Dashboard
              </Button>
            </div>
          </div>
        </section>
      </div>
    </StudentLayout>
  );
};

export default IELTSPortal;