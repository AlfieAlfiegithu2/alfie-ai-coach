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
  const {
    testId
  } = useParams<{
    testId: string;
  }>();
  const navigate = useNavigate();
  const [test, setTest] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);
  const modules = [{
    id: 'reading',
    name: 'Reading',
    description: 'Academic passages with comprehensive questions',
    duration: '60 minutes',
    sections: '3 passages',
    questions: '40 questions'
  }, {
    id: 'listening',
    name: 'Listening',
    description: 'Audio recordings with various question types',
    duration: '30 minutes',
    sections: '4 sections',
    questions: '40 questions'
  }, {
    id: 'writing',
    name: 'Writing',
    description: 'Task 1 data description and Task 2 essay',
    duration: '60 minutes',
    sections: '2 tasks',
    questions: '2 essays'
  }, {
    id: 'speaking',
    name: 'Speaking',
    description: 'Interactive speaking assessment with AI examiner',
    duration: '11-14 minutes',
    sections: '3 parts',
    questions: '3 sections'
  }];
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
      const {
        data: testData,
        error
      } = await supabase.from('tests').select('*').eq('id', testId).single();
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
      // For reading, navigate to reading test with current test ID
      navigate(`/reading/${testId}`);
    } else if (moduleId === 'listening') {
      // For listening, navigate to listening test with current test ID
      navigate(`/listening/${testId}`);
    } else if (moduleId === 'speaking') {
      // For speaking, navigate to speaking test with current test ID
      navigate(`/ielts-speaking-test/${testId}`);
    } else {
      console.log(`${moduleId} module not implemented yet`);
    }
  };
  if (isLoading || !imageLoaded) {
    return <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <LoadingAnimation />
      </div>;
  }
  if (!test) {
    return <div className="min-h-screen relative">
        <div className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed" style={{
        backgroundImage: `url('/lovable-uploads/38d81cb0-fd21-4737-b0f5-32bc5d0ae774.png')`,
        backgroundColor: '#f3f4f6'
      }} />
        <div className="relative z-10 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg text-white">Test not found</p>
            <Button onClick={() => navigate('/ielts-portal')} className="mt-4 rounded-2xl bg-white text-black border-2 border-black hover:bg-black hover:text-white">
              Back to IELTS Portal
            </Button>
          </div>
        </div>
      </div>;
  }
  return <div className="min-h-screen relative">
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed" style={{
      backgroundImage: `url('/lovable-uploads/38d81cb0-fd21-4737-b0f5-32bc5d0ae774.png')`,
      backgroundColor: '#f3f4f6'
    }} />
      <div className="relative z-10">
        <StudentLayout title={test.test_name} showBackButton backPath="/ielts-portal">
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center mb-2">
          <Button variant="ghost" onClick={() => navigate(-1)} className="text-text-secondary px-2 py-1 h-8">
            Go Back
          </Button>
        </div>
        <div className="text-center">
          
          <h1 className="text-3xl font-bold mb-3 text-foreground">{test.test_name}</h1>
          
        </div>

        <section>
          
          <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
            {modules.map(module => {
                const isAvailable = module.id === 'writing' || module.id === 'reading' || module.id === 'speaking';
                return <Card key={module.id} className="rounded-2xl border-light-border shadow-soft hover:scale-105 transition-all duration-200" style={{
                  background: 'var(--gradient-card)'
                }}>
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

                    <Button onClick={() => handleModuleSelect(module.id)} className="w-full rounded-2xl font-semibold bg-white text-black border-2 border-black hover:bg-black hover:text-white" size="sm" disabled={!isAvailable} style={{
                      border: isAvailable ? '2px solid black' : '2px solid #d1d5db',
                      background: isAvailable ? 'white' : '#f3f4f6',
                      color: isAvailable ? 'black' : '#9ca3af'
                    }}>
                      {isAvailable ? `Start ${module.name}` : 'Coming Soon'}
                    </Button>
                  </CardContent>
                </Card>;
              })}
          </div>
        </section>

        
      </div>
      </StudentLayout>
      </div>
    </div>;
};
export default IELTSTestModules;