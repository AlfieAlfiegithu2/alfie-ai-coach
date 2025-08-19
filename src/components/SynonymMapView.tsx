import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface SkillTest {
  id: string;
  title: string;
  test_order: number;
}

const SynonymMapView = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tests, setTests] = useState<SkillTest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadMapData();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadMapData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const testsResponse = await supabase
        .from('skill_tests')
        .select('id, title, test_order')
        .eq('skill_slug', 'synonym-match')
        .order('test_order', { ascending: true });

      if (testsResponse.error) throw testsResponse.error;
      setTests(testsResponse.data || []);
    } catch (error) {
      console.error('Error loading map data:', error);
      toast.error('Failed to load synonym match data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center">
          <CardContent>
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-lg">Loading synonym match...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center">
          <CardContent>
            <p className="text-lg mb-4">Please sign in to access synonym match.</p>
            <Button onClick={() => navigate('/auth')} className="bg-primary text-primary-foreground hover:bg-primary/90">
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-emerald-50 to-green-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Synonym Match Journey
          </h1>
          <p className="text-muted-foreground">Coming soon! This skill is under development.</p>
        </div>

        <Card className="bg-white/60 backdrop-blur-sm border-2 border-white/80 shadow-xl">
          <CardContent className="p-8 text-center">
            <div className="space-y-6">
              <div className="w-32 h-32 mx-auto bg-gradient-to-br from-teal-400 to-emerald-500 rounded-full flex items-center justify-center">
                <div className="text-4xl">🔄</div>
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">Under Construction</h2>
                <p className="text-muted-foreground mb-4">
                  We're working hard to bring you an amazing Synonym Match experience!
                </p>
                <p className="text-sm text-muted-foreground">
                  This feature will help you master synonyms and expand your vocabulary.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-8">
          <Button variant="outline" onClick={() => navigate('/ielts-portal')} className="bg-white/80 backdrop-blur-sm hover:bg-white">
            Back to IELTS Portal
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SynonymMapView;