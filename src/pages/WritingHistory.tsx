import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, Star, Book, Edit, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface WritingSubmission {
  id: string;
  created_at: string;
  overall_band?: number;
  task1_results?: any[];
  task2_results?: any[];
  test_name?: string;
}

const WritingHistory = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<WritingSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchWritingHistory();
    }
  }, [user]);

  const fetchWritingHistory = async () => {
    try {
      setLoading(true);

      // Fetch test results that have writing components
      const { data: testResults, error: testError } = await supabase
        .from('test_results')
        .select('*')
        .eq('user_id', user?.id)
        .like('test_type', '%writing%')
        .order('created_at', { ascending: false });

      if (testError) throw testError;

      // Fetch detailed writing results
      const { data: writingResults, error: writingError } = await supabase
        .from('writing_test_results')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (writingError) throw writingError;

      // Group writing results by test_result_id or date
      const groupedResults: WritingSubmission[] = [];
      
      if (testResults) {
        testResults.forEach(test => {
          const relatedWritingResults = writingResults?.filter(w => w.test_result_id === test.id) || [];
          
          // Calculate overall band from individual task results
          let overallBand = 7.0;
          if (relatedWritingResults.length > 0) {
            const task1Result = relatedWritingResults.find(r => r.task_number === 1);
            const task2Result = relatedWritingResults.find(r => r.task_number === 2);
            
            if (task1Result && task2Result) {
              // IELTS weighting: Task 1 = 33%, Task 2 = 67%
              const task1Band = extractBandFromResult(task1Result);
              const task2Band = extractBandFromResult(task2Result);
              overallBand = Math.round(((task1Band * 1) + (task2Band * 2)) / 3 * 2) / 2;
            }
          }

          groupedResults.push({
            id: test.id,
            created_at: test.created_at,
            overall_band: overallBand,
            task1_results: relatedWritingResults.filter(r => r.task_number === 1),
            task2_results: relatedWritingResults.filter(r => r.task_number === 2),
            test_name: getTestDisplayName(relatedWritingResults)
          });
        });
      }

      // Also include standalone writing results not linked to test results
      const standaloneWriting = writingResults?.filter(w => !w.test_result_id) || [];
      const standaloneByDate: { [key: string]: any[] } = {};
      
      standaloneWriting.forEach(result => {
        const dateKey = result.created_at?.split('T')[0] || 'unknown';
        if (!standaloneByDate[dateKey]) {
          standaloneByDate[dateKey] = [];
        }
        standaloneByDate[dateKey].push(result);
      });

      Object.entries(standaloneByDate).forEach(([date, results]) => {
        const task1Results = results.filter(r => r.task_number === 1);
        const task2Results = results.filter(r => r.task_number === 2);
        
        let overallBand = 7.0;
        if (task1Results.length > 0 && task2Results.length > 0) {
          const task1Band = extractBandFromResult(task1Results[0]);
          const task2Band = extractBandFromResult(task2Results[0]);
          overallBand = Math.round(((task1Band * 1) + (task2Band * 2)) / 3 * 2) / 2;
        }

        groupedResults.push({
          id: `standalone-${date}`,
          created_at: results[0].created_at || date,
          overall_band: overallBand,
          task1_results: task1Results,
          task2_results: task2Results,
          test_name: getTestDisplayName(results)
        });
      });

      // Sort by date (newest first)
      groupedResults.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setSubmissions(groupedResults);
    } catch (error) {
      console.error('Error fetching writing history:', error);
      toast({
        title: "Error",
        description: "Failed to load writing history",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const extractBandFromResult = (result: any): number => {
    if (result.band_scores && typeof result.band_scores === 'object') {
      // Try to extract overall band from structured data
      const bands = Object.values(result.band_scores).filter(v => typeof v === 'number') as number[];
      if (bands.length > 0) {
        return bands.reduce((a, b) => a + b, 0) / bands.length;
      }
    }
    return 7.0; // Default band score
  };

  const getTestDisplayName = (results: any[]): string => {
    if (!results || results.length === 0) return 'IELTS Writing Test';
    
    const task1 = results.find(r => r.task_number === 1);
    const task2 = results.find(r => r.task_number === 2);
    
    const task1Title = task1?.prompt_text?.substring(0, 30) + '...' || 'Task 1';
    const task2Title = task2?.prompt_text?.substring(0, 30) + '...' || 'Task 2';
    
    return `${task1Title} | ${task2Title}`;
  };

  const handleViewSubmission = async (submission: WritingSubmission) => {
    try {
      // Navigate with submissionId in URL parameter
      const submissionId = submission.id.startsWith('standalone-') 
        ? submission.id.replace('standalone-', '') 
        : submission.id;
      
      navigate(`/results/writing/${submissionId}`, {
        state: {
          submissionData: submission
        }
      });
    } catch (error) {
      console.error('Error viewing submission:', error);
      toast({
        title: "Error",
        description: "Failed to load test details",
        variant: "destructive"
      });
    }
  };

  const getBandColor = (score: number) => {
    if (score >= 8.5) return "text-green-600 bg-green-50 border-green-200";
    if (score >= 7.0) return "text-blue-600 bg-blue-50 border-blue-200";
    if (score >= 6.0) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-2 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading your writing history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-2">
      {/* Header */}
      <div className="bg-surface-1 border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/dashboard')}
                className="hover:bg-surface-3"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-heading-2">My Writing History</h1>
                <p className="text-caption">Review your past IELTS Writing submissions and progress</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {submissions.length === 0 ? (
          <Card className="card-modern text-center py-12">
            <CardContent>
              <Edit className="w-16 h-16 text-text-muted mx-auto mb-4" />
              <h3 className="text-heading-3 mb-2">No Writing History Found</h3>
              <p className="text-body mb-6">
                You haven't completed any IELTS Writing tests yet. Start practicing to build your history!
              </p>
              <Button 
                onClick={() => navigate('/ielts-portal')}
                className="button-primary"
              >
                Start Writing Practice
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-heading-3">Your Writing Submissions ({submissions.length})</h2>
              <Button 
                onClick={() => navigate('/ielts-portal')}
                className="button-primary"
              >
                Take New Test
              </Button>
            </div>

            {submissions.map((submission) => (
              <Card 
                key={submission.id} 
                className="card-modern hover:shadow-lg transition-all cursor-pointer"
                onClick={() => handleViewSubmission(submission)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Calendar className="w-4 h-4 text-brand-blue" />
                        <span className="text-sm text-text-secondary">
                          {new Date(submission.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      
                      <h3 className="font-semibold text-text-primary mb-2 line-clamp-2">
                        {submission.test_name}
                      </h3>
                      
                      <div className="flex items-center gap-4">
                        <Badge variant="outline" className={`${getBandColor(submission.overall_band || 7.0)} px-3 py-1`}>
                          <Star className="w-3 h-3 mr-1" />
                          Band {submission.overall_band?.toFixed(1) || '7.0'}
                        </Badge>
                        
                        <div className="flex items-center gap-2 text-sm text-text-secondary">
                          <Book className="w-4 h-4" />
                          <span>
                            {submission.task1_results?.length || 0} Task 1, {submission.task2_results?.length || 0} Task 2
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <ChevronRight className="w-5 h-5 text-text-muted" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WritingHistory;