import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StudentLayout from '@/components/StudentLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, ArrowRight } from 'lucide-react';

const SentenceMastery = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if we have a valid session
    const sessionData = sessionStorage.getItem('sentence_mastery_auth');
    
    if (sessionData) {
      try {
        const context = JSON.parse(sessionData);
        if (context?.token && context?.userId) {
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('Error parsing session data:', error);
      }
    }
  }, []);

  if (!isAuthenticated) {
    return (
      <StudentLayout title="Sentence Mastery" showBackButton backPath="/ielts-portal">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle>Authentication Required</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Please log in to access Sentence Mastery
              </p>
              <Button onClick={() => navigate('/auth')} className="w-full">
                Log In
              </Button>
              <Button variant="outline" onClick={() => navigate('/ielts-portal')} className="w-full">
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout title="Sentence Mastery" showBackButton backPath="/ielts-portal">
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-4 bg-primary/10 rounded-full">
              <BookOpen className="w-12 h-12 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold">Sentence Mastery</h1>
          <p className="text-lg text-muted-foreground">
            Master the art of constructing perfect English sentences
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>What You'll Learn</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">✓</div>
              <p>Sentence structure and grammar patterns</p>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">✓</div>
              <p>Common sentence patterns in English</p>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">✓</div>
              <p>Practice with interactive exercises</p>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">✓</div>
              <p>Real-time feedback and corrections</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-primary">Coming Soon</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Sentence Mastery is currently in development. We're building the most effective sentence construction learning system powered by AI.
            </p>
            <p className="text-sm font-medium">
              Expected launch: Early 2025
            </p>
            <div className="flex gap-2">
              <Button onClick={() => navigate('/ielts-portal')} variant="outline" className="flex-1">
                Back to Dashboard
              </Button>
              <Button onClick={() => navigate('/practice')} className="flex-1">
                Practice Now <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </StudentLayout>
  );
};

export default SentenceMastery;
