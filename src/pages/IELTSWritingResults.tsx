import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, Star, ArrowLeft, Download, Share2, Trophy, Target, Book, MessageSquare, Edit3 } from "lucide-react";
import CelebrationLottieAnimation from "@/components/animations/CelebrationLottieAnimation";
import LightRays from "@/components/animations/LightRays";

const IELTSWritingResults = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const {
    testName,
    task1Answer,
    task2Answer,
    feedback,
    task1Data,
    task2Data,
    task1WordCount,
    task2WordCount,
    structured
  } = location.state || {};

  if (!feedback) {
    navigate('/dashboard');
    return null;
  }

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
                <p className="text-caption">{testName}</p>
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
        <Card className="card-elevated mb-8 overflow-hidden">
          <CardHeader className="text-center bg-gradient-to-r from-brand-blue/10 to-brand-purple/10">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="p-2 rounded-xl bg-brand-blue/10">
                <Trophy className="w-6 h-6 text-brand-blue" />
              </div>
              <CardTitle className="text-heading-3">Your IELTS Writing Band Score</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-center py-8">
            <div className="flex items-center justify-center mb-6">
              <CelebrationLottieAnimation size="md" />
            </div>
            <div className="text-6xl font-bold mb-4 bg-gradient-to-r from-brand-blue to-brand-purple bg-clip-text text-transparent">
              {overallBand.toFixed(1)}
            </div>
            <Badge variant="outline" className={`${getBandColor(overallBand)} text-lg px-4 py-2 rounded-2xl`}>
              {getBandDescription(overallBand)} Performance
            </Badge>
            <p className="text-caption mt-4">
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

        {/* Criteria Breakdown - Task 2 */}
        <Card className="mb-8 card-elevated border-2 border-brand-purple/20">
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
        <Card className="mb-8 card-elevated border-2 border-brand-blue/20">
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
                __html: feedback
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

        {/* Your Answers */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="card-modern">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-brand-blue">
                <div className="p-2 rounded-xl bg-brand-blue/10">
                  <Target className="w-4 h-4" />
                </div>
                Your Task 1 Answer
              </CardTitle>
              <p className="text-caption">{task1Data?.title}</p>
            </CardHeader>
            <CardContent>
              <div className="bg-surface-3 p-4 rounded-2xl text-sm max-h-60 overflow-y-auto text-text-secondary leading-relaxed">
                {task1Answer}
              </div>
            </CardContent>
          </Card>

          <Card className="card-modern">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-brand-purple">
                <div className="p-2 rounded-xl bg-brand-purple/10">
                  <Edit3 className="w-4 h-4" />
                </div>
                Your Task 2 Answer
              </CardTitle>
              <p className="text-caption">{task2Data?.title}</p>
            </CardHeader>
            <CardContent>
              <div className="bg-surface-3 p-4 rounded-2xl text-sm max-h-60 overflow-y-auto text-text-secondary leading-relaxed">
                {task2Answer}
              </div>
            </CardContent>
          </Card>
        </div>

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