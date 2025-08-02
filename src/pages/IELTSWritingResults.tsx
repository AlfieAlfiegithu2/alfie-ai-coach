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
    task2WordCount
  } = location.state || {};

  if (!feedback) {
    navigate('/dashboard');
    return null;
  }

  const extractBandScore = (feedbackText: string, scoreType: string = 'overall') => {
    const regex = new RegExp(`${scoreType}.*?band.*?score.*?(\\d+(?:\\.\\d+)?)`, 'i');
    const match = feedbackText.match(regex);
    return match ? parseFloat(match[1]) : 7.0;
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
      return { task1: [], task2: [], overall: 7.0 };
    }

    const extractScoresFromSection = (section: string) => {
      const scores = [];
      // Try new format first, then fallback to old format
      let scoreMatches = section.match(/Band Score: (\d+(?:\.\d+)?)/g);
      if (!scoreMatches) {
        scoreMatches = section.match(/\*\*Band Score: (\d+(?:\.\d+)?)\*\*/g);
      }
      if (scoreMatches) {
        scores.push(...scoreMatches.map(match => parseFloat(match.match(/(\d+(?:\.\d+)?)/)?.[1] || '7')));
      }
      return scores;
    };

    const task1Scores = extractScoresFromSection(task1Match[1]);
    const task2Scores = extractScoresFromSection(task2Match[1]);
    
    // Try new format first, then fallback to old format
    let overallMatch = feedbackText.match(/Overall Writing Band Score: (\d+(?:\.\d+)?)/);
    if (!overallMatch) {
      overallMatch = feedbackText.match(/\*\*Overall Writing Band Score: (\d+(?:\.\d+)?)\*\*/);
    }
    const overall = overallMatch ? parseFloat(overallMatch[1]) : 7.0;

    return { task1: task1Scores, task2: task2Scores, overall };
  };

  const scores = extractCriteriaScores(feedback);
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
              <Button variant="outline" size="sm">
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
                {scores.task1.length > 0 ? (scores.task1.reduce((a, b) => a + b, 0) / scores.task1.length).toFixed(1) : '7.0'}
              </div>
              <p className="text-caption mb-2">Average Band Score</p>
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
                {scores.task2.length > 0 ? (scores.task2.reduce((a, b) => a + b, 0) / scores.task2.length).toFixed(1) : '7.0'}
              </div>
              <p className="text-caption mb-2">Average Band Score</p>
              <Badge variant="outline" className="text-brand-purple border-brand-purple/30 rounded-full">
                {task2WordCount || task2Answer?.trim().split(/\s+/).filter(word => word.length > 0).length || 0} words
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* Criteria Breakdown */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card className="card-modern border border-brand-green/20 bg-gradient-to-br from-brand-green/5 to-brand-green/10">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-sm flex items-center justify-center gap-1 text-brand-green">
                <Target className="w-4 h-4" />
                Task Achievement
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-2xl font-bold text-brand-green">
                {scores.task1.length > 0 ? scores.task1[0]?.toFixed(1) : '7.0'}
              </div>
            </CardContent>
          </Card>

          <Card className="card-modern border border-brand-blue/20 bg-gradient-to-br from-brand-blue/5 to-brand-blue/10">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-sm flex items-center justify-center gap-1 text-brand-blue">
                <MessageSquare className="w-4 h-4" />
                Coherence & Cohesion
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-2xl font-bold text-brand-blue">
                {scores.task1.length > 1 ? scores.task1[1]?.toFixed(1) : '7.0'}
              </div>
            </CardContent>
          </Card>

          <Card className="card-modern border border-brand-purple/20 bg-gradient-to-br from-brand-purple/5 to-brand-purple/10">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-sm flex items-center justify-center gap-1 text-brand-purple">
                <Book className="w-4 h-4" />
                Lexical Resource
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-2xl font-bold text-brand-purple">
                {scores.task1.length > 2 ? scores.task1[2]?.toFixed(1) : '7.0'}
              </div>
            </CardContent>
          </Card>

          <Card className="card-modern border border-brand-orange/20 bg-gradient-to-br from-brand-orange/5 to-brand-orange/10">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-sm flex items-center justify-center gap-1 text-brand-orange">
                <Edit3 className="w-4 h-4" />
                Grammar Range
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-2xl font-bold text-brand-orange">
                {scores.task1.length > 3 ? scores.task1[3]?.toFixed(1) : '7.0'}
              </div>
            </CardContent>
          </Card>
        </div>

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