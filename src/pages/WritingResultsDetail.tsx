import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client"; 
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, Star, Book, Edit3, Target, MessageSquare, Trophy, CheckCircle, Download, Share2 } from "lucide-react";
import CelebrationLottieAnimation from "@/components/animations/CelebrationLottieAnimation";
import LightRays from "@/components/animations/LightRays";
import AnnotatedWritingText from "@/components/AnnotatedWritingText";

interface WritingResultsDetailProps {
  submissionId?: string;
}

const WritingResultsDetail = () => {
  const { submissionId } = useParams<{ submissionId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [resultData, setResultData] = useState<any>(null);

  useEffect(() => {
    if (submissionId && user) {
      fetchSubmissionData();
    } else if (location.state) {
      // If data passed via state (from history page), use it directly
      setResultData(location.state);
      setLoading(false);
    }
  }, [submissionId, user, location.state]);

  const fetchSubmissionData = async () => {
    try {
      setLoading(true);

      // First try to get from test_results
      const { data: testResult, error: testError } = await supabase
        .from('test_results')
        .select('*')
        .eq('id', submissionId)
        .eq('user_id', user?.id)
        .single();

      if (testError && testError.code !== 'PGRST116') {
        throw testError;
      }

      // Get detailed writing results
      const { data: writingResults, error: writingError } = await supabase
        .from('writing_test_results')
        .select('*')
        .eq('test_result_id', submissionId)
        .eq('user_id', user?.id)
        .order('task_number');

      if (writingError) throw writingError;

      if (!writingResults || writingResults.length === 0) {
        toast({
          title: "Not Found",
          description: "Could not find the requested test results",
          variant: "destructive"
        });
        navigate('/dashboard/writing-history');
        return;
      }

      const task1Data = writingResults.find(r => r.task_number === 1);
      const task2Data = writingResults.find(r => r.task_number === 2);

      if (!task1Data || !task2Data) {
        toast({
          title: "Incomplete Data",
          description: "This test appears to be incomplete",
          variant: "destructive"
        });
        navigate('/dashboard/writing-history');
        return;
      }

      // Calculate overall band score
      const task1Band = extractBandFromResult(task1Data);
      const task2Band = extractBandFromResult(task2Data);
      const overallBand = Math.round(((task1Band * 1) + (task2Band * 2)) / 3 * 2) / 2;

      // Construct the result data in the format expected by IELTSWritingResults
      const constructedData = {
        testName: testResult?.test_type || 'IELTS Writing Test',
        task1Answer: task1Data.user_response,
        task2Answer: task2Data.user_response,
        feedback: constructCombinedFeedback(task1Data, task2Data, overallBand),
        task1Data: {
          title: 'Task 1',
          prompt_text: task1Data.prompt_text,
          instructions: task1Data.prompt_text
        },
        task2Data: {
          title: 'Task 2',
          prompt_text: task2Data.prompt_text,
          instructions: task2Data.prompt_text
        },
        task1WordCount: task1Data.word_count,
        task2WordCount: task2Data.word_count,
        structured: {
          task1: { overall_band: task1Band },
          task2: { overall_band: task2Band },
          overall: { band: overallBand }
        }
      };

      setResultData(constructedData);
    } catch (error) {
      console.error('Error fetching submission data:', error);
      toast({
        title: "Error",
        description: "Failed to load test results",
        variant: "destructive"
      });
      navigate('/dashboard/writing-history');
    } finally {
      setLoading(false);
    }
  };

  const extractBandFromResult = (result: any): number => {
    if (result.band_scores && typeof result.band_scores === 'object') {
      const bands = Object.values(result.band_scores).filter(v => typeof v === 'number') as number[];
      if (bands.length > 0) {
        return bands.reduce((a, b) => a + b, 0) / bands.length;
      }
    }
    return 7.0;
  };

  const constructCombinedFeedback = (task1Data: any, task2Data: any, overallBand: number): string => {
    return `TASK 1 ASSESSMENT

${task1Data.detailed_feedback || 'Task 1 feedback not available'}

Task 1 Overall Band Score: ${extractBandFromResult(task1Data)}

TASK 2 ASSESSMENT

${task2Data.detailed_feedback || 'Task 2 feedback not available'}

Task 2 Overall Band Score: ${extractBandFromResult(task2Data)}

OVERALL WRITING ASSESSMENT

Overall Writing Band Score: ${overallBand}

This assessment is based on your performance across both writing tasks, with Task 2 carrying more weight (67%) than Task 1 (33%) in the final calculation.`;
  };

  const roundToValidBandScore = (score: number) => {
    return Math.round(score * 2) / 2;
  };

  const extractCriteriaScores = (feedbackText: string) => {
    // Try both formats - new format without ## and old format with ##
    let task1Match = feedbackText.match(/TASK 1 ASSESSMENT([\s\S]*?)(?=TASK 2 ASSESSMENT)/);
    let task2Match = feedbackText.match(/TASK 2 ASSESSMENT([\s\S]*?)(?=OVERALL WRITING ASSESSMENT)/);
    
    if (!task1Match || !task2Match) {
      return { task1: [], task2: [], overall: 7.0, task1Overall: 7.0, task2Overall: 7.0 };
    }

    const extractScoresFromSection = (section: string) => {
      const scores = [];
      let scoreMatches = section.match(/Band Score: (\d+(?:\.\d+)?)/g);
      if (!scoreMatches) {
        scoreMatches = section.match(/\*\*Band Score: (\d+(?:\.\d+)?)\*\*/g);
      }
      if (scoreMatches) {
        scores.push(...scoreMatches.map(match => roundToValidBandScore(parseFloat(match.match(/(\d+(?:\.\d+)?)/)?.[1] || '7'))));
      }
      return scores;
    };

    const task1Scores = extractScoresFromSection(task1Match[1]);
    const task2Scores = extractScoresFromSection(task2Match[1]);
    
    const task1OverallMatch = task1Match[1].match(/Task 1 Overall Band Score: (\d+(?:\.\d+)?)/);
    const task2OverallMatch = task2Match[1].match(/Task 2 Overall Band Score: (\d+(?:\.\d+)?)/);
    
    const task1Overall = task1OverallMatch ? roundToValidBandScore(parseFloat(task1OverallMatch[1])) : 
                        (task1Scores.length > 0 ? roundToValidBandScore(task1Scores.reduce((a, b) => a + b, 0) / task1Scores.length) : 7.0);
    const task2Overall = task2OverallMatch ? roundToValidBandScore(parseFloat(task2OverallMatch[1])) : 
                        (task2Scores.length > 0 ? roundToValidBandScore(task2Scores.reduce((a, b) => a + b, 0) / task2Scores.length) : 7.0);
    
    let overallMatch = feedbackText.match(/Overall Writing Band Score: (\d+(?:\.\d+)?)/);
    
    let overall = 7.0;
    if (overallMatch) {
      overall = roundToValidBandScore(parseFloat(overallMatch[1]));
    } else {
      const weightedAverage = ((task1Overall * 1) + (task2Overall * 2)) / 3;
      overall = roundToValidBandScore(weightedAverage);
    }

    return { task1: task1Scores, task2: task2Scores, overall, task1Overall, task2Overall };
  };

  const getBandColor = (score: number) => {
    if (score >= 8.5) return "text-green-600 bg-green-50 border-green-200";
    if (score >= 7.0) return "text-blue-600 bg-blue-50 border-blue-200";
    if (score >= 6.0) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  const getBandDescription = (score: number) => {
    if (score >= 8.5) return "Excellent";
    if (score >= 7.0) return "Good";
    if (score >= 6.0) return "Competent";
    if (score >= 5.0) return "Modest";
    return "Limited";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-2 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading test results...</p>
        </div>
      </div>
    );
  }

  if (!resultData) {
    return (
      <div className="min-h-screen bg-surface-2 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-heading-2 mb-4">Test Not Found</h2>
          <p className="text-body mb-6">Could not load the requested test results.</p>
          <Button onClick={() => navigate('/dashboard/writing-history')}>
            Back to Writing History
          </Button>
        </div>
      </div>
    );
  }

  const scores = resultData.structured ? {
    task1: [],
    task2: [],
    overall: resultData.structured.overall.band,
    task1Overall: resultData.structured.task1.overall_band,
    task2Overall: resultData.structured.task2.overall_band
  } : extractCriteriaScores(resultData.feedback);

  const overallBand = scores.overall;

  return (
    <div className="min-h-screen bg-surface-2 relative">
      <LightRays 
        raysOrigin="top-center"
        raysColor="#4F46E5"
        raysSpeed={0.5}
        lightSpread={2}
        rayLength={1.5}
        pulsating={false}
        fadeDistance={1.2}
        saturation={0.8}
        followMouse={true}
        mouseInfluence={0.05}
        noiseAmount={0.1}
        distortion={0.2}
      />
      
      {/* Header */}
      <div className="bg-surface-1 border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/dashboard/writing-history')}
                className="hover:bg-surface-3"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to History
              </Button>
              <div>
                <h1 className="text-heading-2">Test Results</h1>
                <p className="text-caption">{resultData.testName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  const element = document.createElement('a');
                  const file = new Blob([resultData.feedback], { type: 'text/plain' });
                  element.href = URL.createObjectURL(file);
                  element.download = `IELTS-Writing-Report-${new Date().toISOString().split('T')[0]}.txt`;
                  document.body.appendChild(element);
                  element.click();
                  document.body.removeChild(element);
                }}
              >
                <Download className="w-4 h-4 mr-2" />
                Download Report
              </Button>
              <Button variant="outline" size="sm">
                <Share2 className="w-4 h-4 mr-2" />
                Share Results
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 space-section">
        {/* Success Message */}
        <Card className="mb-8 card-modern border-2 border-brand-green/20 bg-gradient-to-br from-brand-green/5 to-brand-green/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-brand-green/10">
                <CheckCircle className="w-8 h-8 text-brand-green" />
              </div>
              <div>
                <h2 className="text-heading-3 text-brand-green">Historical Test Results</h2>
                <p className="text-body">Reviewing your past IELTS Writing test performance.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Overall Score */}
        <Card className="card-elevated mb-6 overflow-hidden">
          <CardHeader className="text-center bg-gradient-to-r from-brand-blue/10 to-brand-purple/10 py-3">
            <div className="flex items-center justify-center gap-2">
              <div className="p-2 rounded-xl bg-brand-blue/10">
                <Trophy className="w-6 h-6 text-brand-blue" />
              </div>
              <CardTitle className="text-heading-3">Your IELTS Writing Band Score</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-center py-4">
            <div className="text-6xl font-bold mb-4 bg-gradient-to-r from-brand-blue to-brand-purple bg-clip-text text-transparent">
              {overallBand.toFixed(1)}
            </div>
            <Badge variant="outline" className={`${getBandColor(overallBand)} text-lg px-4 py-2 rounded-2xl mb-2`}>
              {getBandDescription(overallBand)} Performance
            </Badge>
            <p className="text-caption">
              Based on official IELTS assessment criteria
            </p>
          </CardContent>
        </Card>

        {/* Task Performance Summary */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="card-modern border-2 border-brand-blue/20 bg-gradient-to-br from-brand-blue/5 to-brand-blue/10">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2 text-brand-blue">
                <div className="p-2 rounded-xl bg-brand-blue/10">
                  <Target className="w-5 h-5" />
                </div>
                Task 1 - Data Description
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-3xl font-bold mb-2 text-brand-blue">
                {scores.task1Overall ? scores.task1Overall.toFixed(1) : '7.0'}
              </div>
              <p className="text-caption mb-2">Overall Band Score</p>
              <Badge variant="outline" className="text-brand-blue border-brand-blue/30 rounded-full">
                {resultData.task1WordCount || resultData.task1Answer?.trim().split(/\s+/).filter((word: string) => word.length > 0).length || 0} words
              </Badge>
            </CardContent>
          </Card>

          <Card className="card-modern border-2 border-brand-purple/20 bg-gradient-to-br from-brand-purple/5 to-brand-purple/10">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2 text-brand-purple">
                <div className="p-2 rounded-xl bg-brand-purple/10">
                  <Edit3 className="w-5 h-5" />
                </div>
                Task 2 - Essay Writing
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-3xl font-bold mb-2 text-brand-purple">
                {scores.task2Overall ? scores.task2Overall.toFixed(1) : '7.0'}
              </div>
              <p className="text-caption mb-2">Overall Band Score</p>
              <Badge variant="outline" className="text-brand-purple border-brand-purple/30 rounded-full">
                {resultData.task2WordCount || resultData.task2Answer?.trim().split(/\s+/).filter((word: string) => word.length > 0).length || 0} words
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* Task 2 Question */}
        {resultData.task2Data && (
          <Card className="mb-6 card-elevated border-2 border-brand-purple/20">
            <CardHeader className="bg-gradient-to-r from-brand-purple/10 to-brand-purple/5">
              <CardTitle className="flex items-center gap-2 text-brand-purple">
                <div className="p-2 rounded-xl bg-brand-purple/10">
                  <Edit3 className="w-5 h-5" />
                </div>
                Task 2 Question
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="bg-surface-1 rounded-xl p-6 border border-border">
                <h4 className="font-semibold text-text-primary mb-3">{resultData.task2Data.title}</h4>
                <div className="text-text-secondary leading-relaxed whitespace-pre-wrap">
                  {resultData.task2Data.prompt_text || resultData.task2Data.instructions}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* AI Examiner Report */}
        <Card className="mb-8 card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-brand-orange/10">
                <MessageSquare className="w-5 h-5 text-brand-orange" />
              </div>
              AI Examiner Detailed Report
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              className="prose prose-sm max-w-none text-text-secondary leading-relaxed"
              dangerouslySetInnerHTML={{ 
                __html: resultData.feedback.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') 
              }}
            />
          </CardContent>
        </Card>

        {/* Your Answers */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-brand-blue/10">
                  <Target className="w-5 h-5 text-brand-blue" />
                </div>
                Your Task 1 Answer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AnnotatedWritingText 
                taskTitle="Task 1"
                originalText={resultData.task1Answer}
                corrections={[]}
                icon={Target}
                colorScheme="brand-blue"
              />
            </CardContent>
          </Card>

          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-brand-purple/10">
                  <Edit3 className="w-5 h-5 text-brand-purple" />
                </div>
                Your Task 2 Answer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AnnotatedWritingText 
                taskTitle="Task 2"
                originalText={resultData.task2Answer}
                corrections={[]}
                icon={Edit3}
                colorScheme="brand-purple"
              />
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
          <Button 
            onClick={() => navigate('/ielts-portal')}
            className="button-primary flex-1 sm:flex-none"
          >
            Take Another Test
          </Button>
          <Button 
            variant="outline" 
            onClick={() => navigate('/dashboard')}
            className="flex-1 sm:flex-none"
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};

export default WritingResultsDetail;