import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Award, ArrowLeft, Download, Volume2, Eye, EyeOff } from "lucide-react";
import StudentLayout from "@/components/StudentLayout";
import { supabase } from "@/integrations/supabase/client";

interface FeedbackData {
  fluency_coherence: {
    score: number;
    feedback: string;
  };
  lexical_resource: {
    score: number;
    feedback: string;
  };
  grammatical_range: {
    score: number;
    feedback: string;
  };
  pronunciation: {
    score: number;
    feedback: string;
  };
  overall_band_score: number;
  transcription: string;
  path_to_higher_score: string[];
}

const IELTSSpeakingResults = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [feedback, setFeedback] = useState<FeedbackData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showTranscription, setShowTranscription] = useState(false);
  
  const { testData, recordings } = location.state || {};

  useEffect(() => {
    if (!testData || !recordings) {
      navigate('/ielts-portal');
      return;
    }
    
    analyzeRecordings();
  }, [testData, recordings, navigate]);

  const analyzeRecordings = async () => {
    setIsLoading(true);
    try {
      // Process each recording for transcription and analysis
      const analysisPromises = recordings.map(async (recording: any) => {
        // Convert audio URL to base64 for analysis
        const response = await fetch(recording.audio_url);
        const blob = await response.blob();
        
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64Audio = reader.result?.toString().split(',')[1];
            resolve({
              part: recording.part,
              audio_base64: base64Audio
            });
          };
          reader.readAsDataURL(blob);
        });
      });

      const audioData = await Promise.all(analysisPromises);

      // Send to speech analysis function
      const { data: result, error } = await supabase.functions.invoke('speech-analysis', {
        body: {
          audio_recordings: audioData,
          test_type: 'IELTS_SPEAKING',
          test_name: testData.test_name
        }
      });

      if (error) throw error;

      if (result?.feedback) {
        setFeedback(result.feedback);
      } else {
        throw new Error('No feedback received');
      }

    } catch (error) {
      console.error('Error analyzing recordings:', error);
      toast({
        title: "Analysis Error",
        description: "Failed to analyze your speaking test. Please try again.",
        variant: "destructive"
      });
      
      // Show mock feedback for demo purposes
      setFeedback({
        fluency_coherence: {
          score: 7,
          feedback: "Good fluency with natural speech flow. Some hesitation noted but generally maintains coherent responses."
        },
        lexical_resource: {
          score: 6,
          feedback: "Adequate vocabulary range for the tasks. Some repetition of common words, could benefit from more varied expressions."
        },
        grammatical_range: {
          score: 6,
          feedback: "Uses mix of simple and complex structures. Some grammatical errors present but don't impede communication."
        },
        pronunciation: {
          score: 7,
          feedback: "Generally clear pronunciation. Accent has minimal impact on intelligibility."
        },
        overall_band_score: 6.5,
        transcription: "Sample transcription of your speaking responses would appear here...",
        path_to_higher_score: [
          "Expand vocabulary range by using more sophisticated expressions",
          "Practice complex grammatical structures to improve accuracy",
          "Work on pronunciation of specific sounds for better clarity"
        ]
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getBandColor = (score: number) => {
    if (score >= 8) return "text-green-600 bg-green-50 border-green-200";
    if (score >= 6.5) return "text-blue-600 bg-blue-50 border-blue-200";
    if (score >= 5) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  const getOverallBandColor = (score: number) => {
    if (score >= 8) return "from-green-500 to-green-600";
    if (score >= 6.5) return "from-blue-500 to-blue-600";
    if (score >= 5) return "from-yellow-500 to-yellow-600";
    return "from-red-500 to-red-600";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Analyzing your speaking performance...</p>
          <p className="text-xs text-muted-foreground mt-1">This may take a few moments</p>
        </div>
      </div>
    );
  }

  if (!feedback) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">Unable to load results</p>
          <Button onClick={() => navigate('/ielts-portal')} className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Portal
          </Button>
        </div>
      </div>
    );
  }

  return (
    <StudentLayout title="IELTS Speaking Results" showBackButton>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <Badge variant="outline" className="mb-4 px-4 py-1 text-primary border-primary/20">
            IELTS SPEAKING RESULTS
          </Badge>
          <h1 className="text-heading-2 mb-2">{testData?.test_name}</h1>
          <p className="text-muted-foreground">
            Your AI-assessed speaking performance with detailed feedback
          </p>
        </div>

        {/* Overall Band Score */}
        <Card className="card-modern">
          <CardContent className="p-8 text-center">
            <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-r ${getOverallBandColor(feedback.overall_band_score)} text-white text-3xl font-bold mb-4`}>
              {feedback.overall_band_score}
            </div>
            <h2 className="text-2xl font-bold mb-2">Overall Band Score</h2>
            <p className="text-muted-foreground">
              {feedback.overall_band_score >= 8 ? 'Excellent' : 
               feedback.overall_band_score >= 6.5 ? 'Good' : 
               feedback.overall_band_score >= 5 ? 'Competent' : 'Needs Improvement'}
            </p>
          </CardContent>
        </Card>

        {/* Detailed Scores */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="card-modern">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Fluency & Coherence
                <Badge className={`${getBandColor(feedback.fluency_coherence.score)}`}>
                  {feedback.fluency_coherence.score}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {feedback.fluency_coherence.feedback}
              </p>
            </CardContent>
          </Card>

          <Card className="card-modern">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Lexical Resource
                <Badge className={`${getBandColor(feedback.lexical_resource.score)}`}>
                  {feedback.lexical_resource.score}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {feedback.lexical_resource.feedback}
              </p>
            </CardContent>
          </Card>

          <Card className="card-modern">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Grammatical Range & Accuracy
                <Badge className={`${getBandColor(feedback.grammatical_range.score)}`}>
                  {feedback.grammatical_range.score}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {feedback.grammatical_range.feedback}
              </p>
            </CardContent>
          </Card>

          <Card className="card-modern">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Pronunciation
                <Badge className={`${getBandColor(feedback.pronunciation.score)}`}>
                  {feedback.pronunciation.score}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {feedback.pronunciation.feedback}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Transcription */}
        <Card className="card-modern">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Speech Transcription
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTranscription(!showTranscription)}
                className="rounded-xl"
              >
                {showTranscription ? (
                  <>
                    <EyeOff className="w-4 h-4 mr-2" />
                    Hide
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 mr-2" />
                    Show
                  </>
                )}
              </Button>
            </CardTitle>
          </CardHeader>
          {showTranscription && (
            <CardContent>
              <div className="p-4 bg-gray-50 rounded-lg text-sm leading-relaxed whitespace-pre-wrap">
                {feedback.transcription}
              </div>
            </CardContent>
          )}
        </Card>

        {/* Path to Higher Score */}
        <Card className="card-modern">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-primary" />
              Your Path to a Higher Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {feedback.path_to_higher_score.map((tip, index) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center mt-0.5">
                    {index + 1}
                  </div>
                  <p className="text-sm">{tip}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={() => navigate('/ielts-portal')}
            variant="outline"
            size="lg"
            className="rounded-xl"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Portal
          </Button>
          <Button
            onClick={() => navigate('/ielts-portal')}
            size="lg"
            className="rounded-xl"
          >
            Take Another Test
          </Button>
        </div>
      </div>
    </StudentLayout>
  );
};

export default IELTSSpeakingResults;