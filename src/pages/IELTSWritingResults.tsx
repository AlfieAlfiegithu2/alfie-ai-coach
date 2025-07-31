import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, Star, ArrowLeft, Download, Share2 } from "lucide-react";

const IELTSWritingResults = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const {
    testName,
    task1Answer,
    task2Answer,
    feedback,
    task1Data,
    task2Data
  } = location.state || {};

  if (!feedback) {
    navigate('/dashboard');
    return null;
  }

  const extractBandScore = (feedbackText: string) => {
    const bandMatch = feedbackText.match(/overall.*?band.*?score.*?(\d+(?:\.\d+)?)/i) || 
                     feedbackText.match(/band.*?score.*?(\d+(?:\.\d+)?)/i);
    return bandMatch ? parseFloat(bandMatch[1]) : 7.0;
  };

  const overallBand = extractBandScore(feedback);

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
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className={`border-2 ${getBandColor(overallBand)}`}>
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                <Star className="w-5 h-5" />
                Overall Writing Band Score
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-4xl font-bold mb-2">{overallBand.toFixed(1)}</div>
              <Badge variant="outline" className={getBandColor(overallBand)}>
                {getBandDescription(overallBand)}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-center">Task 1 Performance</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-2xl font-semibold mb-2">Data Description</div>
              <p className="text-sm text-muted-foreground">
                Word count: {task1Answer?.trim().split(/\s+/).filter(word => word.length > 0).length || 0}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-center">Task 2 Performance</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-2xl font-semibold mb-2">Essay Writing</div>
              <p className="text-sm text-muted-foreground">
                Word count: {task2Answer?.trim().split(/\s+/).filter(word => word.length > 0).length || 0}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Feedback */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Detailed Assessment Report</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none">
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {feedback}
              </div>
            </div>
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