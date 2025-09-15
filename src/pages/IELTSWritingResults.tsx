import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, Star, ArrowLeft, Download, Share2, Trophy, Target, Book, MessageSquare, Edit3, BookOpen } from "lucide-react";
import CelebrationLottieAnimation from "@/components/animations/CelebrationLottieAnimation";
import LightRays from "@/components/animations/LightRays";
import AnnotatedWritingText from "@/components/AnnotatedWritingText";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const IELTSWritingResults = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const {
    testName,
    task1Answer,
    task2Answer,
    feedback,
    task1Data,
    task2Data,
    task1WordCount,
    task2WordCount,
    structured,
    testId // Added testId to get model answers
  } = location.state || {};

  const [modelAnswers, setModelAnswers] = useState<{
    task1: string | null;
    task2: string | null;
  }>({ task1: null, task2: null });

  useEffect(() => {
    // Fetch model answers if testId is available
    const fetchModelAnswers = async () => {
      if (testId) {
        try {
          const { data, error } = await supabase
            .from('questions')
            .select('part_number, transcription')
            .eq('test_id', testId)
            .in('question_type', ['Task 1', 'Task 2']);

          if (error) {
            console.error('Error fetching model answers:', error);
            return;
          }

          const task1Model = data?.find(q => q.part_number === 1)?.transcription;
          const task2Model = data?.find(q => q.part_number === 2)?.transcription;

          setModelAnswers({
            task1: task1Model || null,
            task2: task2Model || null
          });
        } catch (error) {
          console.error('Error fetching model answers:', error);
        }
      }
    };

    fetchModelAnswers();
  }, [testId]);

  // Fallback loader: if opened without navigation state, fetch latest writing result
  const [fallback, setFallback] = useState<{
    feedback?: string;
    structured?: any;
    task1Answer?: string;
    task2Answer?: string;
    task1Data?: any;
    task2Data?: any;
    testName?: string;
  } | null>(null);

  useEffect(() => {
    const loadLatest = async () => {
      if (feedback || !user) return;
      try {
        const { data: tests } = await supabase
          .from('test_results')
          .select('*')
          .eq('user_id', user.id)
          .ilike('test_type', '%writing%')
          .order('created_at', { ascending: false })
          .limit(1);
        const latest = tests?.[0];
        if (!latest) return;

        const { data: writingRows } = await supabase
          .from('writing_test_results')
          .select('*')
          .eq('user_id', user.id)
          .eq('test_result_id', latest.id)
          .order('task_number');
        const t1 = writingRows?.find(r => r.task_number === 1);
        const t2 = writingRows?.find(r => r.task_number === 2);

        const toNum = (n: any) => typeof n === 'number' ? n : Number(n);
        const safe = (n: any, d = 6.5) => Number.isFinite(toNum(n)) ? toNum(n) : d;

        const t1c: any = {
          task_achievement: { band: safe(t1?.band_scores?.task_achievement) },
          coherence_and_cohesion: { band: safe(t1?.band_scores?.coherence_and_cohesion) },
          lexical_resource: { band: safe(t1?.band_scores?.lexical_resource) },
          grammatical_range_and_accuracy: { band: safe(t1?.band_scores?.grammatical_range_and_accuracy) },
        };
        const t2c: any = {
          task_response: { band: safe(t2?.band_scores?.task_response) },
          coherence_and_cohesion: { band: safe(t2?.band_scores?.coherence_and_cohesion) },
          lexical_resource: { band: safe(t2?.band_scores?.lexical_resource) },
          grammatical_range_and_accuracy: { band: safe(t2?.band_scores?.grammatical_range_and_accuracy) },
        };
        const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / (arr.length || 1);
        const t1Overall = Math.round(avg(Object.values(t1c).map((x: any) => x.band)) * 2) / 2;
        const t2Overall = Math.round(avg(Object.values(t2c).map((x: any) => x.band)) * 2) / 2;
        const overall = Math.round(((t1Overall + 2 * t2Overall) / 3) * 2) / 2;

        const structuredLatest = {
          task1: { criteria: t1c, overall_band: t1Overall },
          task2: { criteria: t2c, overall_band: t2Overall },
          overall: { band: overall }
        };

        const combinedFeedback = `TASK 1 ASSESSMENT\nBand Score: ${t1Overall}\n\n${t1?.detailed_feedback || ''}\n\nTASK 2 ASSESSMENT\nBand Score: ${t2Overall}\n\n${t2?.detailed_feedback || ''}\n\nOVERALL WRITING ASSESSMENT\nOverall Writing Band Score: ${overall}`;

        setFallback({
          feedback: combinedFeedback,
          structured: structuredLatest,
          task1Answer: t1?.user_response || '',
          task2Answer: t2?.user_response || '',
          task1Data: { title: 'Task 1', instructions: t1?.prompt_text || '' },
          task2Data: { title: 'Task 2', instructions: t2?.prompt_text || '' },
          testName: latest.test_type || 'IELTS Writing Test',
        });
      } catch (e) {
        // ignore
      }
    };
    loadLatest();
  }, [feedback, user]);

  const effFeedback = feedback || fallback?.feedback;
  const effStructured = structured || fallback?.structured;
  const effTask1Answer = task1Answer || fallback?.task1Answer;
  const effTask2Answer = task2Answer || fallback?.task2Answer;
  const effTask1Data = task1Data || fallback?.task1Data;
  const effTask2Data = task2Data || fallback?.task2Data;
  const effTestName = testName || fallback?.testName;

  const roundToValidBandScore = (score: number) => {
    return Math.round(score * 2) / 2; // Rounds to nearest 0.5
  };

  const extractBandScore = (feedbackText: string, scoreType: string = 'overall') => {
    const regex = new RegExp(`${scoreType}.*?band.*?score.*?(\\d+(?:\\.\\d+)?)`, 'i');
    const match = feedbackText.match(regex);
    return match ? roundToValidBandScore(parseFloat(match[1])) : 7.0;
  };

  const extractCriteriaScores = (feedbackText: string) => {
    // Try both formats - new format without ## and old format with ##
    let task1Match = feedbackText.match(/TASK 1 ASSESSMENT([\s\S]*?)(?=TASK 2 ASSESSMENT)/);
    let task2Match = feedbackText.match(/TASK 2 ASSESSMENT([\s\S]*?)(?=OVERALL WRITING ASSESSMENT)/);
    
    // Fallback to old format if new format not found
    if (!task1Match || !task2Match) {
      task1Match = feedbackText.match(/## TASK 1 ASSESSMENT([\s\S]*?)(?=## TASK 2 ASSESSMENT)/);
      task2Match = feedbackText.match(/## TASK 2 ASSESSMENT([\s\S]*?)(?=## OVERALL WRITING ASSESSMENT)/);
    }
    
    if (!task1Match || !task2Match) {
      return { task1: [], task2: [], overall: 7.0, task1Overall: 7.0, task2Overall: 7.0 };
    }

    const extractScoresFromSection = (section: string) => {
      const scores = [];
      // Try new format first, then fallback to old format
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
    
    // Extract individual task overall scores
    const task1OverallMatch = task1Match[1].match(/Task 1 Overall Band Score: (\d+(?:\.\d+)?)/);
    const task2OverallMatch = task2Match[1].match(/Task 2 Overall Band Score: (\d+(?:\.\d+)?)/);
    
    const task1Overall = task1OverallMatch ? roundToValidBandScore(parseFloat(task1OverallMatch[1])) : 
                        (task1Scores.length > 0 ? roundToValidBandScore(task1Scores.reduce((a, b) => a + b, 0) / task1Scores.length) : 7.0);
    const task2Overall = task2OverallMatch ? roundToValidBandScore(parseFloat(task2OverallMatch[1])) : 
                        (task2Scores.length > 0 ? roundToValidBandScore(task2Scores.reduce((a, b) => a + b, 0) / task2Scores.length) : 7.0);
    
    // Try new format first, then fallback to old format
    let overallMatch = feedbackText.match(/Overall Writing Band Score: (\d+(?:\.\d+)?)/);
    if (!overallMatch) {
      overallMatch = feedbackText.match(/\*\*Overall Writing Band Score: (\d+(?:\.\d+)?)\*\*/);
    }
    
    // If no overall match found, calculate using correct weighting
    let overall = 7.0;
    if (overallMatch) {
      overall = roundToValidBandScore(parseFloat(overallMatch[1]));
    } else {
      // Apply correct IELTS weighting: Task 1 = 33%, Task 2 = 67%
      const weightedAverage = ((task1Overall * 1) + (task2Overall * 2)) / 3;
      overall = roundToValidBandScore(weightedAverage);
    }

    return { task1: task1Scores, task2: task2Scores, overall, task1Overall, task2Overall };
  };

  const mapFromStructured = (s: any) => {
    try {
      const t1 = s?.task1;
      const t2 = s?.task2;
      const toNumber = (v: any) => typeof v === 'number' ? v : parseFloat(v);
      const t1Arr = t1 ? [
        toNumber(t1.criteria?.task_achievement?.band),
        toNumber(t1.criteria?.coherence_and_cohesion?.band),
        toNumber(t1.criteria?.lexical_resource?.band),
        toNumber(t1.criteria?.grammatical_range_and_accuracy?.band),
      ].filter(n => !isNaN(n)) : [];
      const t2Arr = t2 ? [
        toNumber(t2.criteria?.task_response?.band),
        toNumber(t2.criteria?.coherence_and_cohesion?.band),
        toNumber(t2.criteria?.lexical_resource?.band),
        toNumber(t2.criteria?.grammatical_range_and_accuracy?.band),
      ].filter(n => !isNaN(n)) : [];
      return {
        task1: t1Arr,
        task2: t2Arr,
        task1Overall: toNumber(t1?.overall_band) || (t1Arr.length ? roundToValidBandScore(t1Arr.reduce((a,b)=>a+b,0)/t1Arr.length) : 7.0),
        task2Overall: toNumber(t2?.overall_band) || (t2Arr.length ? roundToValidBandScore(t2Arr.reduce((a,b)=>a+b,0)/t2Arr.length) : 7.0),
        overall: toNumber(s?.overall?.band) || 7.0,
      };
    } catch { return null; }
  };

  const structuredScores = structured ? mapFromStructured(structured) : null;
  const scores = structuredScores || extractCriteriaScores(feedback);
  const overallBand = scores.overall;

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
                onClick={() => navigate('/dashboard')}
                className="hover:bg-surface-3"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-heading-2">Test Results</h1>
                <p className="text-caption">{fallback?.testName || testName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  const element = document.createElement('a');
                  const file = new Blob([feedback], { type: 'text/plain' });
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
                <h2 className="text-heading-3 text-brand-green">Test Completed Successfully!</h2>
                <p className="text-body">Your IELTS Writing test has been evaluated by our AI examiner.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Overall Score */}
        <Card className="bg-surface-1 rounded-3xl shadow-lg mb-6 overflow-hidden">
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
                {task1WordCount || task1Answer?.trim().split(/\s+/).filter(word => word.length > 0).length || 0} words
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
                {task2WordCount || task2Answer?.trim().split(/\s+/).filter(word => word.length > 0).length || 0} words
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* Criteria Breakdown - Task 1 */}
        <Card className="mb-6 card-elevated border-2 border-brand-blue/20">
          <CardHeader className="bg-gradient-to-r from-brand-blue/10 to-brand-blue/5">
            <CardTitle className="flex items-center gap-2 text-brand-blue">
              <div className="p-2 rounded-xl bg-brand-blue/10">
                <Target className="w-5 h-5" />
              </div>
              Task 1 - Criteria Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="p-4 rounded-2xl bg-brand-green/10 mb-2">
                  <Target className="w-6 h-6 text-brand-green mx-auto mb-1" />
                  <div className="text-2xl font-bold text-brand-green">
                    {scores.task1.length > 0 ? scores.task1[0]?.toFixed(1) : '7.0'}
                  </div>
                </div>
                <p className="text-sm font-medium text-text-primary">Task Achievement</p>
              </div>
              
              <div className="text-center">
                <div className="p-4 rounded-2xl bg-brand-blue/10 mb-2">
                  <MessageSquare className="w-6 h-6 text-brand-blue mx-auto mb-1" />
                  <div className="text-2xl font-bold text-brand-blue">
                    {scores.task1.length > 1 ? scores.task1[1]?.toFixed(1) : '7.0'}
                  </div>
                </div>
                <p className="text-sm font-medium text-text-primary">Coherence & Cohesion</p>
              </div>
              
              <div className="text-center">
                <div className="p-4 rounded-2xl bg-brand-purple/10 mb-2">
                  <Book className="w-6 h-6 text-brand-purple mx-auto mb-1" />
                  <div className="text-2xl font-bold text-brand-purple">
                    {scores.task1.length > 2 ? scores.task1[2]?.toFixed(1) : '7.0'}
                  </div>
                </div>
                <p className="text-sm font-medium text-text-primary">Lexical Resource</p>
              </div>
              
              <div className="text-center">
                <div className="p-4 rounded-2xl bg-brand-orange/10 mb-2">
                  <Edit3 className="w-6 h-6 text-brand-orange mx-auto mb-1" />
                  <div className="text-2xl font-bold text-brand-orange">
                    {scores.task1.length > 3 ? scores.task1[3]?.toFixed(1) : '7.0'}
                  </div>
                </div>
                <p className="text-sm font-medium text-text-primary">Grammar Range</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Task 2 Question */}
        {task2Data && (
          <Card className="mb-6 bg-surface-1 rounded-3xl shadow-lg border-2 border-brand-purple/20">
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
                <h4 className="font-semibold text-text-primary mb-3">{task2Data.title}</h4>
                <div className="text-text-secondary leading-relaxed whitespace-pre-wrap">
                  {task2Data.prompt_text || task2Data.instructions}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Criteria Breakdown - Task 2 */}
        <Card className="mb-8 bg-surface-1 rounded-3xl shadow-lg border-2 border-brand-purple/20">
          <CardHeader className="bg-gradient-to-r from-brand-purple/10 to-brand-purple/5">
            <CardTitle className="flex items-center gap-2 text-brand-purple">
              <div className="p-2 rounded-xl bg-brand-purple/10">
                <Edit3 className="w-5 h-5" />
              </div>
              Task 2 - Criteria Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="p-4 rounded-2xl bg-brand-green/10 mb-2">
                  <Target className="w-6 h-6 text-brand-green mx-auto mb-1" />
                  <div className="text-2xl font-bold text-brand-green">
                    {scores.task2.length > 0 ? scores.task2[0]?.toFixed(1) : '7.0'}
                  </div>
                </div>
                <p className="text-sm font-medium text-text-primary">Task Response</p>
              </div>
              
              <div className="text-center">
                <div className="p-4 rounded-2xl bg-brand-blue/10 mb-2">
                  <MessageSquare className="w-6 h-6 text-brand-blue mx-auto mb-1" />
                  <div className="text-2xl font-bold text-brand-blue">
                    {scores.task2.length > 1 ? scores.task2[1]?.toFixed(1) : '7.0'}
                  </div>
                </div>
                <p className="text-sm font-medium text-text-primary">Coherence & Cohesion</p>
              </div>
              
              <div className="text-center">
                <div className="p-4 rounded-2xl bg-brand-purple/10 mb-2">
                  <Book className="w-6 h-6 text-brand-purple mx-auto mb-1" />
                  <div className="text-2xl font-bold text-brand-purple">
                    {scores.task2.length > 2 ? scores.task2[2]?.toFixed(1) : '7.0'}
                  </div>
                </div>
                <p className="text-sm font-medium text-text-primary">Lexical Resource</p>
              </div>
              
              <div className="text-center">
                <div className="p-4 rounded-2xl bg-brand-orange/10 mb-2">
                  <Edit3 className="w-6 h-6 text-brand-orange mx-auto mb-1" />
                  <div className="text-2xl font-bold text-brand-orange">
                    {scores.task2.length > 3 ? scores.task2[3]?.toFixed(1) : '7.0'}
                  </div>
                </div>
                <p className="text-sm font-medium text-text-primary">Grammar Range</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Examiner Report */}
        <Card className="mb-8 bg-surface-1 rounded-3xl shadow-lg border-2 border-brand-blue/20">
          <CardHeader className="bg-gradient-to-r from-brand-blue/10 to-brand-purple/10">
            <CardTitle className="flex items-center gap-2 text-brand-blue">
              <div className="p-2 rounded-xl bg-brand-blue/10">
                <Star className="w-5 h-5" />
              </div>
              AI Examiner Report - Professional IELTS Assessment
            </CardTitle>
            <p className="text-body">
              Comprehensive analysis based on official IELTS band descriptors
            </p>
          </CardHeader>
          <CardContent className="p-6">
            <div 
              className="prose prose-lg max-w-none text-text-primary"
              dangerouslySetInnerHTML={{
                __html: (fallback?.feedback || feedback)
                  .replace(/^(TASK [12] ASSESSMENT)$/gm, '<h2 class="text-2xl font-bold text-brand-blue mt-8 mb-6 border-b-2 border-brand-blue/20 pb-3">$1</h2>')
                  .replace(/^(OVERALL WRITING ASSESSMENT)$/gm, '<h2 class="text-2xl font-bold text-brand-purple mt-8 mb-6 border-b-2 border-brand-purple/20 pb-3">$1</h2>')
                  .replace(/^(Task Achievement|Task Response|Coherence and Cohesion|Lexical Resource|Grammatical Range and Accuracy|Your Path to a Higher Score)$/gm, '<h3 class="text-xl font-semibold text-text-primary mt-6 mb-4 bg-surface-3 p-3 rounded-xl">$1</h3>')
                  .replace(/^Band Score: (\d+(?:\.\d+)?)$/gm, '<div class="text-lg font-bold text-brand-green mb-3 bg-brand-green/10 p-2 rounded-lg inline-block">Band Score: $1</div>')
                  .replace(/^(Positive Feedback|Areas for Improvement):$/gm, '<h4 class="text-lg font-semibold text-text-primary mt-4 mb-2">$1:</h4>')
                  .replace(/^• (.*)$/gm, '<li class="mb-2 text-text-secondary">$1</li>')
                  .replace(/(<li>.*?<\/li>(?:\s*<li>.*?<\/li>)*)/gs, '<ul class="list-disc pl-6 mb-4 space-y-1">$1</ul>')
                  .replace(/^Overall Writing Band Score: (.*)$/gm, '<div class="text-2xl font-bold text-brand-purple mt-6 mb-4 bg-brand-purple/10 p-4 rounded-xl text-center">Overall Writing Band Score: $1</div>')
                  .replace(/\n/g, '<br>')
                  .replace(/---/g, '<hr class="my-8 border-border">')
              }}
            />
          </CardContent>
        </Card>

        {/* Your Answers with Corrections */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <AnnotatedWritingText
            taskTitle="Your Task 1 Answer"
            originalText={task1Answer || ""}
            annotatedOriginal={structured?.task1?.annotated_original}
            annotatedCorrected={structured?.task1?.annotated_corrected}
            corrections={structured?.task1?.corrections}
            icon={Target}
            colorScheme="text-brand-blue"
          />

          <AnnotatedWritingText
            taskTitle="Your Task 2 Answer"
            originalText={task2Answer || ""}
            annotatedOriginal={structured?.task2?.annotated_original}
            annotatedCorrected={structured?.task2?.annotated_corrected}
            corrections={structured?.task2?.corrections}
            icon={Edit3}
            colorScheme="text-brand-purple"
          />
        </div>

        {/* Model Answers Section */}
        {(modelAnswers.task1 || modelAnswers.task2) && (
          <div className="mb-8">
            <Card className="border-2 border-brand-green/20 bg-surface-1 rounded-3xl shadow-lg">
              <CardHeader className="bg-gradient-to-r from-brand-green/10 to-brand-blue/10">
                <CardTitle className="flex items-center gap-2 text-brand-green">
                  <div className="p-2 rounded-xl bg-brand-green/10">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  High-Band Model Answers
                </CardTitle>
                <p className="text-body">
                  Study these exemplar responses to understand what high-scoring answers look like
                </p>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {modelAnswers.task1 && (
                    <div>
                      <h3 className="text-xl font-semibold text-brand-blue mb-4 flex items-center gap-2">
                        <Target className="w-5 h-5" />
                        Task 1 Model Answer
                      </h3>
                      <div className="bg-surface-3 rounded-xl p-4 border-l-4 border-brand-blue">
                        <div className="prose prose-sm max-w-none text-text-secondary whitespace-pre-wrap">
                          {modelAnswers.task1}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {modelAnswers.task2 && (
                    <div>
                      <h3 className="text-xl font-semibold text-brand-purple mb-4 flex items-center gap-2">
                        <Edit3 className="w-5 h-5" />
                        Task 2 Model Answer
                      </h3>
                      <div className="bg-surface-3 rounded-xl p-4 border-l-4 border-brand-purple">
                        <div className="prose prose-sm max-w-none text-text-secondary whitespace-pre-wrap">
                          {modelAnswers.task2}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="mt-6 p-4 bg-brand-green/5 rounded-xl border border-brand-green/20">
                  <p className="text-sm text-text-secondary">
                    <strong>Study Tip:</strong> Compare your answers with these model responses. Notice the structure, 
                    vocabulary choices, and how ideas are developed and connected. This will help you understand 
                    what examiners look for in high-band responses.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-center gap-4">
          <Button 
            onClick={() => navigate('/ielts-portal')}
            className="btn-primary hover-lift"
          >
            Take Another Test
          </Button>
          <Button 
            variant="outline"
            onClick={() => navigate('/dashboard')}
            className="hover-lift"
          >
            Return to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};

export default IELTSWritingResults;