import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import StudentLayout from '@/components/StudentLayout';
import { supabase } from '@/integrations/supabase/client';
import LoadingAnimation from '@/components/animations/LoadingAnimation';

// IELTS Test Modules Component - Updated with consistent styling
const IELTSTestModules = () => {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const [test, setTest] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);

  const modules = [
    {
      id: 'reading',
      name: 'Reading',
      description: 'Academic passages with comprehensive questions',
      duration: '60 minutes',
      sections: '3 passages',
      questions: '40 questions'
    },
    {
      id: 'listening',
      name: 'Listening',
      description: 'Audio recordings with various question types',
      duration: '30 minutes',
      sections: '4 sections',
      questions: '40 questions'
    },
    {
      id: 'writing',
      name: 'Writing',
      description: 'Task 1 data description and Task 2 essay',
      duration: '60 minutes',
      sections: '2 tasks',
      questions: '2 essays'
    },
    {
      id: 'speaking',
      name: 'Speaking',
      description: 'Interactive speaking assessment with AI examiner',
      duration: '11-14 minutes',
      sections: '3 parts',
      questions: '3 sections'
    }
  ];

  useEffect(() => {
    if (testId) {
      loadTest();
    }
    
    // Preload the background image
    const img = new Image();
    img.onload = () => setImageLoaded(true);
    img.src = '/lovable-uploads/38d81cb0-fd21-4737-b0f5-32bc5d0ae774.png';
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

  const handleModuleSelect = async (moduleId: string) => {
    console.log(`🧪 Opening IELTS ${moduleId} for test ${testId}`);
    
    if (moduleId === 'writing') {
      // For writing, navigate to the current test ID
      navigate(`/ielts-writing-test/${testId}`);
    } else if (moduleId === 'reading') {
      // For reading, use the current test ID directly
      // Check if this test has reading questions first
      try {
        const { data: questions } = await supabase
          .from('questions')
          .select('test_id, question_type')
          .eq('test_id', testId)
          .in('question_type', ['true_false_not_given', 'multiple_choice', 'short_answer', 'matching', 'title'])
          .limit(1);
        
        if (questions && questions.length > 0) {
          console.log(`📚 Found reading questions for test ${testId}`);
          navigate(`/enhanced-reading-test/${testId}`);
        } else {
          console.log(`❌ No reading questions found for test ${testId}`);
          // Fallback: find any test with reading questions
          const { data: fallbackQuestions } = await supabase
            .from('questions')
            .select('test_id, question_type')
            .in('question_type', ['true_false_not_given', 'multiple_choice', 'short_answer', 'matching', 'title'])
            .limit(1);
          
          if (fallbackQuestions && fallbackQuestions.length > 0) {
            const readingTestId = fallbackQuestions[0].test_id;
            console.log(`📚 Using fallback reading test ${readingTestId}`);
            navigate(`/enhanced-reading-test/${readingTestId}`);
          }
        }
      } catch (error) {
        console.error('Error finding reading test:', error);
      }
    } else if (moduleId === 'speaking') {
      // For speaking, check if this test has speaking prompts
      try {
        console.log(`🔍 Looking for speaking prompts for test: ${test.test_name}`);
        
        // Try multiple query patterns to find speaking content
        const queries = [
          supabase.from('speaking_prompts').select('*').eq('cambridge_book', `Test ${test.test_name}`),
          supabase.from('speaking_prompts').select('*').eq('test_number', parseInt(test.test_name.match(/\d+/)?.[0] || '1')),
          supabase.from('speaking_prompts').select('*').ilike('cambridge_book', `%${test.test_name}%`)
        ];

        let prompts = null;
        for (const query of queries) {
          const { data } = await query.limit(1);
          if (data && data.length > 0) {
            prompts = data;
            break;
          }
        }
        
        if (prompts && prompts.length > 0) {
          console.log(`🎤 Found speaking prompts for test ${test.test_name}`);
          navigate(`/ielts-speaking-test/${test.test_name}`);
        } else {
          console.log(`❌ No speaking prompts found for test ${test.test_name}`);
          console.log(`🔄 Redirecting to new IELTS speaking interface with test name: ${test.test_name}`);
          // Always use the new interface, even if no content found yet
          navigate(`/ielts-speaking-test/${test.test_name}`);
        }
      } catch (error) {
        console.error('Error finding speaking test:', error);
        // Still redirect to new interface on error
        navigate(`/ielts-speaking-test/${test.test_name}`);
      }
    } else {
      // For listening, show coming soon or implement later
      console.log(`${moduleId} module coming soon`);
    }
  };

  if (isLoading || !imageLoaded) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <LoadingAnimation />
      </div>
    );
  }

  if (!test) {
    return (
      <div className="min-h-screen relative">
        <div 
          className="absolute inset-0 bg-contain bg-center bg-no-repeat bg-fixed"
          style={{
            backgroundImage: `url('/lovable-uploads/38d81cb0-fd21-4737-b0f5-32bc5d0ae774.png')`,
            backgroundColor: '#f3f4f6'
          }}
        />
        <div className="relative z-10 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg text-white">Test not found</p>
            <Button onClick={() => navigate('/ielts-portal')} className="mt-4 rounded-2xl" style={{ background: 'var(--gradient-button)', border: 'none' }}>
              Back to IELTS Portal
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      <div 
        className="absolute inset-0 bg-contain bg-center bg-no-repeat bg-fixed"
        style={{
          backgroundImage: `url('/lovable-uploads/38d81cb0-fd21-4737-b0f5-32bc5d0ae774.png')`,
          backgroundColor: '#f3f4f6'
        }}
      />
      <div className="relative z-10">
        <StudentLayout title={test.test_name} showBackButton backPath="/ielts-portal">
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center mb-2">
          <Button variant="ghost" onClick={() => navigate(-1)} className="text-text-secondary px-2 py-1 h-8">
            Go Back
          </Button>
        </div>
        <div className="text-center">
          <Badge variant="outline" className="mb-3 px-4 py-1 text-text-secondary border-light-border">
            IELTS TEST MODULES
          </Badge>
          <h1 className="text-3xl font-bold mb-3 text-foreground">{test.test_name}</h1>
          <p className="text-lg max-w-3xl mx-auto text-warm-gray">
            Choose which module you'd like to practice. Each module tests different English language skills.
          </p>
        </div>

        <section>
          <h2 className="text-xl font-semibold mb-6 text-center text-white">Select a Module</h2>
          <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
            {modules.map((module) => {
              const isAvailable = module.id === 'writing' || module.id === 'reading' || module.id === 'speaking';
              
              return (
                <Card 
                  key={module.id} 
                  className="rounded-2xl border-light-border shadow-soft hover:scale-105 transition-all duration-200"
                  style={{ background: 'var(--gradient-card)' }}
                >
                  <CardHeader className="text-center pb-3">
                    <CardTitle className="text-xl text-foreground">
                      {module.name}
                    </CardTitle>
                    <p className="text-sm text-warm-gray">{module.description}</p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 gap-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-warm-gray">Duration:</span>
                        <span className="font-medium text-foreground">{module.duration}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-warm-gray">Sections:</span>
                        <span className="font-medium text-foreground">{module.sections}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-warm-gray">Content:</span>
                        <span className="font-medium text-foreground">{module.questions}</span>
                      </div>
                    </div>

                    <Button 
                      onClick={() => handleModuleSelect(module.id)}
                      className="w-full rounded-2xl font-semibold"
                      size="sm"
                      disabled={!isAvailable}
                      style={{ background: isAvailable ? 'var(--gradient-button)' : 'var(--warm-gray)', border: 'none' }}
                    >
                      {isAvailable ? `Start ${module.name}` : 'Coming Soon'}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 max-w-4xl mx-auto">
          <div className="text-center">
            <h3 className="text-xl font-semibold mb-4 text-white">Test Information</h3>
            <div className="grid md:grid-cols-2 gap-6 text-left">
              <div>
                <h4 className="font-semibold mb-2 text-white">Test Format</h4>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Each module can be taken independently</li>
                  <li>• AI-powered feedback and scoring</li>
                  <li>• Realistic IELTS test conditions</li>
                  <li>• Immediate results and analysis</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2 text-white">Preparation Tips</h4>
                <ul className="text-sm text-gray-300 space-y-1">
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
      </div>
    </div>
  );
};

export default IELTSTestModules;