import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Volume2, PenTool, MessageSquare, Clock, ArrowLeft } from 'lucide-react';
import StudentLayout from '@/components/StudentLayout';
import { supabase } from '@/integrations/supabase/client';

const IELTSTestModules = () => {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const [test, setTest] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const modules = [
    {
      id: 'reading',
      name: 'Reading',
      icon: BookOpen,
      description: 'Academic passages with comprehensive questions',
      duration: '60 minutes',
      sections: '3 passages',
      questions: '40 questions',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      buttonColor: 'bg-blue-600 hover:bg-blue-700'
    },
    {
      id: 'listening',
      name: 'Listening',
      icon: Volume2,
      description: 'Audio recordings with various question types',
      duration: '30 minutes',
      sections: '4 sections',
      questions: '40 questions',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      buttonColor: 'bg-purple-600 hover:bg-purple-700'
    },
    {
      id: 'writing',
      name: 'Writing',
      icon: PenTool,
      description: 'Task 1 data description and Task 2 essay',
      duration: '60 minutes',
      sections: '2 tasks',
      questions: '2 essays',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      buttonColor: 'bg-green-600 hover:bg-green-700'
    },
    {
      id: 'speaking',
      name: 'Speaking',
      icon: MessageSquare,
      description: 'Interactive speaking assessment with AI examiner',
      duration: '11-14 minutes',
      sections: '3 parts',
      questions: '3 sections',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      buttonColor: 'bg-orange-600 hover:bg-orange-700'
    }
  ];

  useEffect(() => {
    if (testId) {
      loadTest();
    }
  }, [testId]);

  const loadTest = async () => {
    setIsLoading(true);
    try {
      const { data: testData, error } = await supabase
        .from('tests')
        .select('*')
        .eq('id', testId)
        .single();

      if (error) throw error;
      setTest(testData);
    } catch (error) {
      console.error('Error loading test:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleModuleSelect = (moduleId: string) => {
    if (moduleId === 'writing') {
      navigate(`/ielts-writing-test/${testId}`);
    } else if (moduleId === 'reading') {
      navigate(`/enhanced-reading-test/${testId}`);
    } else {
      // For listening and speaking, show coming soon or implement later
      console.log(`${moduleId} module coming soon`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading test...</p>
        </div>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">Test not found</p>
          <Button onClick={() => navigate('/ielts-portal')} className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to IELTS Portal
          </Button>
        </div>
      </div>
    );
  }

  return (
    <StudentLayout title={test.test_name} showBackButton backPath="/ielts-portal">
      <div className="space-y-8">
        <div className="text-center">
          <Badge variant="outline" className="mb-4 px-4 py-1 text-primary border-primary/20">
            IELTS TEST MODULES
          </Badge>
          <h1 className="text-heading-2 mb-4">{test.test_name}</h1>
          <p className="text-body-large max-w-3xl mx-auto">
            Choose which module you'd like to practice. Each module tests different English language skills.
          </p>
        </div>

        <section>
          <h2 className="text-heading-3 mb-6 text-center">Select a Module</h2>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {modules.map((module) => {
              const Icon = module.icon;
              const isAvailable = module.id === 'writing' || module.id === 'reading';
              
              return (
                <Card 
                  key={module.id} 
                  className={`card-interactive hover:scale-105 transition-all duration-300 ${module.borderColor} ${module.bgColor}/50`}
                >
                  <CardHeader className="text-center pb-4">
                    <div className={`w-16 h-16 mx-auto rounded-2xl ${module.bgColor} flex items-center justify-center mb-4 border ${module.borderColor}`}>
                      <Icon className={`w-8 h-8 ${module.color}`} />
                    </div>
                    <CardTitle className="text-xl flex items-center justify-center gap-2">
                      {module.name}
                      {isAvailable && (
                        <Badge variant="default" className="text-xs bg-green-600">Available</Badge>
                      )}
                      {!isAvailable && (
                        <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
                      )}
                    </CardTitle>
                    <p className="text-text-secondary text-sm">{module.description}</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 gap-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Duration:</span>
                        <span className="font-medium">{module.duration}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Sections:</span>
                        <span className="font-medium">{module.sections}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Content:</span>
                        <span className="font-medium">{module.questions}</span>
                      </div>
                    </div>

                    <Button 
                      onClick={() => handleModuleSelect(module.id)}
                      className={`w-full text-white ${isAvailable ? module.buttonColor : 'bg-gray-400 cursor-not-allowed'}`}
                      size="sm"
                      disabled={!isAvailable}
                    >
                      {isAvailable ? `Start ${module.name}` : 'Coming Soon'}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="bg-surface-1 rounded-3xl p-8 max-w-4xl mx-auto">
          <div className="text-center">
            <h3 className="text-heading-3 mb-4">Test Information</h3>
            <div className="grid md:grid-cols-2 gap-6 text-left">
              <div>
                <h4 className="font-semibold mb-2">Test Format</h4>
                <ul className="text-sm text-text-secondary space-y-1">
                  <li>• Each module can be taken independently</li>
                  <li>• AI-powered feedback and scoring</li>
                  <li>• Realistic IELTS test conditions</li>
                  <li>• Immediate results and analysis</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Preparation Tips</h4>
                <ul className="text-sm text-text-secondary space-y-1">
                  <li>• Review the test format beforehand</li>
                  <li>• Ensure a quiet testing environment</li>
                  <li>• Have writing materials ready</li>
                  <li>• Check your internet connection</li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </div>
    </StudentLayout>
  );
};

export default IELTSTestModules;