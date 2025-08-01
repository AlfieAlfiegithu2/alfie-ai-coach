import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, Star, ArrowLeft, Download, Share2, Trophy, Target, Book, MessageSquare, Edit3 } from "lucide-react";

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
    const task1Match = feedbackText.match(/## TASK 1 ASSESSMENT([\s\S]*?)(?=## TASK 2 ASSESSMENT)/);
    const task2Match = feedbackText.match(/## TASK 2 ASSESSMENT([\s\S]*?)(?=## OVERALL WRITING ASSESSMENT)/);
    
    if (!task1Match || !task2Match) {
      return { task1: [], task2: [], overall: 7.0 };
    }

    const extractScoresFromSection = (section: string) => {
      const scores = [];
      const scoreMatches = section.match(/\*\*Band Score: (\d+(?:\.\d+)?)\*\*/g);
      if (scoreMatches) {
        scores.push(...scoreMatches.map(match => parseFloat(match.match(/(\d+(?:\.\d+)?)/)?.[1] || '7')));
      }
      return scores;
    };

    const task1Scores = extractScoresFromSection(task1Match[1]);
    const task2Scores = extractScoresFromSection(task2Match[1]);
    const overallMatch = feedbackText.match(/\*\*Overall Writing Band Score: (\d+(?:\.\d+)?)\*\*/);
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-white border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/dashboard')}
                className="hover:bg-muted"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Test Results</h1>
                <p className="text-sm text-muted-foreground">{testName}</p>
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

      <div className="container mx-auto px-6 py-8">
        {/* Success Message */}
        <Card className="mb-8 border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div>
                <h2 className="text-xl font-semibold text-green-800">Test Completed Successfully!</h2>
                <p className="text-green-700">Your IELTS Writing test has been evaluated by our AI examiner.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Overall Score */}
        <Card className={`border-2 ${getBandColor(overallBand)} mb-8`}>
          <CardHeader className="text-center bg-gradient-to-r from-blue-50 to-purple-50">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Trophy className="w-6 h-6 text-yellow-600" />
              <CardTitle className="text-2xl">Your IELTS Writing Band Score</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-center py-8">
            <div className="text-6xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {overallBand.toFixed(1)}
            </div>
            <Badge variant="outline" className={`${getBandColor(overallBand)} text-lg px-4 py-2`}>
              {getBandDescription(overallBand)} Performance
            </Badge>
            <p className="text-sm text-muted-foreground mt-4">
              Based on official IELTS assessment criteria
            </p>
          </CardContent>
        </Card>

        {/* Task Performance Summary */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2 text-blue-800">
                <Target className="w-5 h-5" />
                Task 1 - Data Description
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-3xl font-bold mb-2 text-blue-700">
                {scores.task1.length > 0 ? (scores.task1.reduce((a, b) => a + b, 0) / scores.task1.length).toFixed(1) : '7.0'}
              </div>
              <p className="text-sm text-blue-600 mb-2">Average Band Score</p>
              <Badge variant="outline" className="text-blue-600 border-blue-300">
                {task1WordCount || task1Answer?.trim().split(/\s+/).filter(word => word.length > 0).length || 0} words
              </Badge>
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-purple-50">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2 text-purple-800">
                <Edit3 className="w-5 h-5" />
                Task 2 - Essay Writing
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-3xl font-bold mb-2 text-purple-700">
                {scores.task2.length > 0 ? (scores.task2.reduce((a, b) => a + b, 0) / scores.task2.length).toFixed(1) : '7.0'}
              </div>
              <p className="text-sm text-purple-600 mb-2">Average Band Score</p>
              <Badge variant="outline" className="text-purple-600 border-purple-300">
                {task2WordCount || task2Answer?.trim().split(/\s+/).filter(word => word.length > 0).length || 0} words
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* Criteria Breakdown */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card className="border-green-200 bg-green-50">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-sm flex items-center justify-center gap-1 text-green-800">
                <Target className="w-4 h-4" />
                Task Achievement
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-2xl font-bold text-green-700">
                {scores.task1.length > 0 ? scores.task1[0]?.toFixed(1) : '7.0'}
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-sm flex items-center justify-center gap-1 text-blue-800">
                <MessageSquare className="w-4 h-4" />
                Coherence & Cohesion
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-2xl font-bold text-blue-700">
                {scores.task1.length > 1 ? scores.task1[1]?.toFixed(1) : '7.0'}
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-purple-50">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-sm flex items-center justify-center gap-1 text-purple-800">
                <Book className="w-4 h-4" />
                Lexical Resource
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-2xl font-bold text-purple-700">
                {scores.task1.length > 2 ? scores.task1[2]?.toFixed(1) : '7.0'}
              </div>
            </CardContent>
          </Card>

          <Card className="border-orange-200 bg-orange-50">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-sm flex items-center justify-center gap-1 text-orange-800">
                <Edit3 className="w-4 h-4" />
                Grammar Range
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-2xl font-bold text-orange-700">
                {scores.task1.length > 3 ? scores.task1[3]?.toFixed(1) : '7.0'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Examiner Report */}
        <Card className="mb-8 border-2 border-blue-200">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <Star className="w-5 h-5" />
              AI Examiner Report - Professional IELTS Assessment
            </CardTitle>
            <p className="text-sm text-blue-600">
              Comprehensive analysis based on official IELTS band descriptors
            </p>
          </CardHeader>
          <CardContent className="p-6">
            <div 
              className="prose prose-lg max-w-none"
              dangerouslySetInnerHTML={{
                __html: feedback
                  .replace(/## (.*)/g, '<h2 class="text-xl font-bold text-gray-800 mt-6 mb-4 border-b-2 border-blue-200 pb-2">$1</h2>')
                  .replace(/### (.*)/g, '<h3 class="text-lg font-semibold text-gray-700 mt-4 mb-3">$1</h3>')
                  .replace(/\*\*(.*?)\*\*/g, '<strong class="text-gray-800">$1</strong>')
                  .replace(/^• (.*)$/gm, '<li class="mb-1">$1</li>')
                  .replace(/(<li>.*<\/li>)/s, '<ul class="list-disc pl-6 mb-4">$1</ul>')
                  .replace(/\n/g, '<br>')
                  .replace(/---/g, '<hr class="my-6 border-gray-300">')
              }}
            />
          </CardContent>
        </Card>

        {/* Your Answers */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Your Task 1 Answer</CardTitle>
              <p className="text-sm text-muted-foreground">{task1Data?.title}</p>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/30 p-4 rounded-lg text-sm max-h-60 overflow-y-auto">
                {task1Answer}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Your Task 2 Answer</CardTitle>
              <p className="text-sm text-muted-foreground">{task2Data?.title}</p>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/30 p-4 rounded-lg text-sm max-h-60 overflow-y-auto">
                {task2Answer}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4">
          <Button 
            onClick={() => navigate('/ielts-portal')}
            className="bg-primary hover:bg-primary/90"
          >
            Take Another Test
          </Button>
          <Button 
            variant="outline"
            onClick={() => navigate('/dashboard')}
          >
            Return to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};

export default IELTSWritingResults;