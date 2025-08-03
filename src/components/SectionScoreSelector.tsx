import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface SectionScores {
  reading: number;
  listening: number;
  writing: number;
  speaking: number;
  overall: number;
}

interface SectionScoreSelectorProps {
  onScoresUpdate?: (scores: SectionScores) => void;
}

const SectionScoreSelector = ({ onScoresUpdate }: SectionScoreSelectorProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [scores, setScores] = useState<SectionScores>({
    reading: 7.0,
    listening: 7.0,
    writing: 7.0,
    speaking: 7.0,
    overall: 7.0
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadUserScores();
    }
  }, [user]);

  const loadUserScores = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('target_scores')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading user scores:', error);
        return;
      }

      if (data?.target_scores) {
        const targetScores = data.target_scores as unknown as SectionScores;
        setScores(targetScores);
        onScoresUpdate?.(targetScores);
      }
    } catch (error) {
      console.error('Error loading user scores:', error);
    }
  };

  const updateScore = (section: keyof SectionScores, score: number) => {
    const newScores = { ...scores, [section]: score };
    setScores(newScores);
    onScoresUpdate?.(newScores);
  };

  const saveScores = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          target_scores: scores as any,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        throw error;
      }

      toast({
        title: "Target scores saved",
        description: "Your section target scores have been updated successfully."
      });
    } catch (error) {
      console.error('Error saving scores:', error);
      toast({
        title: "Error",
        description: "Failed to save target scores. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const bandScores = [4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0];

  return (
    <Card className="bg-white/10 border-white/20 backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="text-slate-800 text-lg">Section Target Scores</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {Object.entries(scores).map(([section, score]) => (
            <div key={section} className="space-y-2">
              <label className="text-sm font-medium text-slate-700 capitalize">
                {section}
              </label>
              <Select
                value={score.toString()}
                onValueChange={(value) => updateScore(section as keyof SectionScores, parseFloat(value))}
              >
                <SelectTrigger className="bg-white/50 border-white/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white/95 backdrop-blur-xl border-white/20">
                  {bandScores.map((bandScore) => (
                    <SelectItem key={bandScore} value={bandScore.toString()}>
                      {bandScore}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
        <Button 
          onClick={saveScores} 
          disabled={loading}
          className="w-full bg-slate-800/80 hover:bg-slate-700/80 text-white"
        >
          {loading ? 'Saving...' : 'Save Target Scores'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default SectionScoreSelector;