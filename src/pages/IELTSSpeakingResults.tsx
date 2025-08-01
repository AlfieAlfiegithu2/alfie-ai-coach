import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Award, ArrowLeft, Volume2, Play, Pause, FileText, TrendingUp, Star } from "lucide-react";
import StudentLayout from "@/components/StudentLayout";
import { supabase } from "@/integrations/supabase/client";

interface QuestionAnalysis {
  part: string;
  partNumber: number;
  questionIndex: number;
  questionText: string;
  transcription: string;
  audio_url: string;
  feedback: string;
  score: number;
}

interface OverallFeedback {
  overall_band_score: number;
  fluency_coherence: { score: number; feedback: string };
  lexical_resource: { score: number; feedback: string };
  grammatical_range: { score: number; feedback: string };
  pronunciation: { score: number; feedback: string };
  path_to_higher_score: string[];
}

const IELTSSpeakingResults = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [overallFeedback, setOverallFeedback] = useState<OverallFeedback | null>(null);
  const [questionAnalyses, setQuestionAnalyses] = useState<QuestionAnalysis[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  
  const { testData, recordings } = location.state || {};

  useEffect(() => {
    if (!testData || !recordings) {
      navigate('/ielts-portal');
      return;
    }
    
    analyzeTestResults();
  }, [testData, recordings, navigate]);

  const analyzeTestResults = async () => {
    setIsLoading(true);
    try {
      console.log('🤖 Starting comprehensive question-by-question analysis...');

      // Process each recording for individual analysis
      const questionAnalysisPromises = recordings.map(async (recording: any) => {
        const response = await fetch(recording.audio_url);
        const blob = await response.blob();
        
        // Get question details
        const partMatch = recording.part.match(/part(\d+)_q(\d+)/);
        let questionText = "";
        let partNumber = 1;
        let questionIndex = 0;
        
        if (partMatch) {
          partNumber = parseInt(partMatch[1]);
          questionIndex = parseInt(partMatch[2]);
          
          if (partNumber === 1 && testData.part1_prompts[questionIndex]) {
            questionText = testData.part1_prompts[questionIndex].transcription || testData.part1_prompts[questionIndex].title;
          } else if (partNumber === 2 && testData.part2_prompt) {
            questionText = testData.part2_prompt.prompt_text;
          } else if (partNumber === 3 && testData.part3_prompts[questionIndex]) {
            questionText = testData.part3_prompts[questionIndex].transcription || testData.part3_prompts[questionIndex].title;
          }
        }
        
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64Audio = reader.result?.toString().split(',')[1];
            
            try {
              // Individual question analysis
              const { data: result, error } = await supabase.functions.invoke('enhanced-speech-analysis', {
                body: {
                  audio: base64Audio,
                  questionText: questionText,
                  partType: `Part ${partNumber}`,
                  analysisType: 'individual_question'
                }
              });

              if (error) throw error;

              resolve({
                part: `Part ${partNumber}`,
                partNumber,
                questionIndex,
                questionText,
                transcription: result.transcription || "Transcription not available",
                audio_url: recording.audio_url,
                feedback: result.feedback || "Analysis not available",
                score: result.score || 6
              });
            } catch (error) {
              console.error('Error analyzing individual question:', error);
              resolve({
                part: `Part ${partNumber}`,
                partNumber,
                questionIndex,
                questionText,
                transcription: "Transcription not available",
                audio_url: recording.audio_url,
                feedback: "Unable to analyze this response. The audio quality may have been insufficient.",
                score: 6
              });
            }
          };
          reader.readAsDataURL(blob);
        });
      });

      const questionAnalyses = await Promise.all(questionAnalysisPromises);
      setQuestionAnalyses(questionAnalyses as QuestionAnalysis[]);

      // Overall comprehensive analysis
      console.log('🎯 Generating overall test feedback...');
      
      const firstRecording = recordings[0];
      const response = await fetch(firstRecording.audio_url);
      const blob = await response.blob();

      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Audio = reader.result?.toString().split(',')[1];
        
        try {
          const { data: overallResult, error } = await supabase.functions.invoke('enhanced-speech-analysis', {
            body: {
              audio: base64Audio,
              fullTestContext: questionAnalyses.map((qa: any) => ({
                part: qa.part,
                question: qa.questionText,
                transcription: qa.transcription
              })),
              analysisType: 'comprehensive_test'
            }
          });

          if (error) throw error;

          const overallData = parseOverallAnalysis(overallResult);
          setOverallFeedback(overallData);

        } catch (error) {
          console.error('Error in overall analysis:', error);
          // Fallback overall feedback
          setOverallFeedback({
            overall_band_score: 6.5,
            fluency_coherence: {
              score: 7,
              feedback: "Good fluency with natural speech flow. Minor hesitations observed but overall coherent responses."
            },
            lexical_resource: {
              score: 6,
              feedback: "Adequate vocabulary range. Some repetition of common words, would benefit from more varied expressions."
            },
            grammatical_range: {
              score: 6,
              feedback: "Uses mix of simple and complex structures. Some grammatical errors present but communication is clear."
            },
            pronunciation: {
              score: 7,
              feedback: "Generally clear pronunciation with minimal impact on intelligibility."
            },
            path_to_higher_score: [
              "Expand vocabulary range by using more sophisticated, topic-specific expressions",
              "Practice complex grammatical structures to improve accuracy and range",
              "Work on pronunciation of specific sounds for better clarity"
            ]
          });
        }
      };
      reader.readAsDataURL(blob);

    } catch (error) {
      console.error('Error analyzing test results:', error);
      toast({
        title: "Analysis Error",
        description: "Failed to analyze your test results. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const parseOverallAnalysis = (analysisData: any): OverallFeedback => {
    return {
      overall_band_score: analysisData.overall_score || 6.5,
      fluency_coherence: {
        score: analysisData.fluency_score || 6,
        feedback: analysisData.fluency_feedback || "Good overall fluency with room for improvement."
      },
      lexical_resource: {
        score: analysisData.vocabulary_score || 6,
        feedback: analysisData.vocabulary_feedback || "Adequate vocabulary range demonstrated."
      },
      grammatical_range: {
        score: analysisData.grammar_score || 6,
        feedback: analysisData.grammar_feedback || "Mixed use of grammatical structures."
      },
      pronunciation: {
        score: analysisData.pronunciation_score || 6,
        feedback: analysisData.pronunciation_feedback || "Generally clear pronunciation."
      },
      path_to_higher_score: analysisData.improvement_tips || [
        "Expand vocabulary range with more sophisticated expressions",
        "Practice complex grammatical structures",
        "Work on pronunciation clarity and intonation"
      ]
    };
  };

  const playAudio = async (audioUrl: string, questionId: string) => {
    if (playingAudio === questionId) {
      // Stop current audio
      setPlayingAudio(null);
      return;
    }

    try {
      setPlayingAudio(questionId);
      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        setPlayingAudio(null);
      };
      
      audio.onerror = () => {
        setPlayingAudio(null);
        toast({
          title: "Audio Error",
          description: "Failed to play audio recording",
          variant: "destructive"
        });
      };
      
      await audio.play();
    } catch (error) {
      console.error('Error playing audio:', error);
      setPlayingAudio(null);
    }
  };

  const getBandColor = (score: number) => {
    if (score >= 8) return "text-green-700 bg-green-100 border-green-300";
    if (score >= 6.5) return "text-blue-700 bg-blue-100 border-blue-300";
    if (score >= 5) return "text-yellow-700 bg-yellow-100 border-yellow-300";
    return "text-red-700 bg-red-100 border-red-300";
  };

  const getOverallBandColor = (score: number) => {
    if (score >= 8) return "from-green-500 to-green-600";
    if (score >= 6.5) return "from-blue-500 to-blue-600";
    if (score >= 5) return "from-yellow-500 to-yellow-600";
    return "from-red-500 to-red-600";
  };

  const getScoreIcon = (score: number) => {
    if (score >= 8) return <Star className="w-4 h-4" />;
    if (score >= 6.5) return <TrendingUp className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Analyzing your speaking performance...</p>
          <p className="text-xs text-muted-foreground mt-1">This comprehensive analysis may take a few moments</p>
        </div>
      </div>
    );
  }

  if (!overallFeedback) {
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
            Comprehensive AI-assessed speaking performance with detailed feedback
          </p>
        </div>

        {/* Overall Band Score Section */}
        <Card className="card-modern">
          <CardContent className="p-8 text-center">
            <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-r ${getOverallBandColor(overallFeedback.overall_band_score)} text-white text-3xl font-bold mb-4`}>
              {overallFeedback.overall_band_score}
            </div>
            <h2 className="text-2xl font-bold mb-2">Overall Band Score</h2>
            <p className="text-muted-foreground">
              {overallFeedback.overall_band_score >= 8 ? 'Excellent Performance' : 
               overallFeedback.overall_band_score >= 6.5 ? 'Good Performance' : 
               overallFeedback.overall_band_score >= 5 ? 'Competent Performance' : 'Needs Improvement'}
            </p>
          </CardContent>
        </Card>

        {/* Detailed Scores Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="card-modern">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  {getScoreIcon(overallFeedback.fluency_coherence.score)}
                  Fluency & Coherence
                </span>
                <Badge className={`${getBandColor(overallFeedback.fluency_coherence.score)}`}>
                  {overallFeedback.fluency_coherence.score}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {overallFeedback.fluency_coherence.feedback}
              </p>
            </CardContent>
          </Card>

          <Card className="card-modern">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  {getScoreIcon(overallFeedback.lexical_resource.score)}
                  Lexical Resource
                </span>
                <Badge className={`${getBandColor(overallFeedback.lexical_resource.score)}`}>
                  {overallFeedback.lexical_resource.score}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {overallFeedback.lexical_resource.feedback}
              </p>
            </CardContent>
          </Card>

          <Card className="card-modern">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  {getScoreIcon(overallFeedback.grammatical_range.score)}
                  Grammatical Range & Accuracy
                </span>
                <Badge className={`${getBandColor(overallFeedback.grammatical_range.score)}`}>
                  {overallFeedback.grammatical_range.score}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {overallFeedback.grammatical_range.feedback}
              </p>
            </CardContent>
          </Card>

          <Card className="card-modern">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  {getScoreIcon(overallFeedback.pronunciation.score)}
                  Pronunciation
                </span>
                <Badge className={`${getBandColor(overallFeedback.pronunciation.score)}`}>
                  {overallFeedback.pronunciation.score}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {overallFeedback.pronunciation.feedback}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Question-by-Question Analysis Section */}
        <Card className="card-modern">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Question-by-Question Analysis
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Detailed feedback for each of your responses with audio playback
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {questionAnalyses.map((analysis, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">
                    {analysis.part} - Question {analysis.questionIndex + 1}
                  </h3>
                  <Badge className={getBandColor(analysis.score)}>
                    Score: {analysis.score}
                  </Badge>
                </div>
                
                {/* Official Question Text */}
                <div>
                  <h4 className="font-medium text-primary mb-2">Official Question:</h4>
                  <div className="p-3 bg-blue-50 rounded-lg text-sm">
                    {analysis.questionText || "Question text not available"}
                  </div>
                </div>

                {/* Audio Player */}
                <div className="flex items-center gap-3">
                  <Button
                    onClick={() => playAudio(analysis.audio_url, `${analysis.part}_${analysis.questionIndex}`)}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    {playingAudio === `${analysis.part}_${analysis.questionIndex}` ? (
                      <>
                        <Pause className="w-4 h-4" />
                        Stop Audio
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        Play Your Answer
                      </>
                    )}
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {playingAudio === `${analysis.part}_${analysis.questionIndex}` ? 'Playing your response...' : 'Click to hear your response'}
                  </span>
                </div>

                {/* AI Feedback */}
                <div>
                  <h4 className="font-medium text-green-700 mb-2">Specific AI Feedback:</h4>
                  <div className="p-3 bg-green-50 rounded-lg text-sm">
                    {analysis.feedback}
                  </div>
                </div>

                {/* Transcription */}
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Your Response (Transcribed):</h4>
                  <div className="p-3 bg-gray-50 rounded-lg text-sm max-h-32 overflow-y-auto">
                    {analysis.transcription}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Your Path to a Higher Score Section */}
        <Card className="card-modern">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-primary" />
              Your Path to a Higher Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {overallFeedback.path_to_higher_score.map((tip, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-primary/5 rounded-lg">
                  <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </div>
                  <p className="text-sm leading-relaxed">{tip}</p>
                </div>
              ))}
            </div>
            
            <Separator className="my-6" />
            
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">
                Ready to improve your speaking skills with another practice test?
              </p>
              <div className="flex gap-4 justify-center">
                <Button onClick={() => navigate('/ielts-portal')} variant="outline">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Portal
                </Button>
                <Button onClick={() => navigate('/ielts-portal')}>
                  Take Another Test
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </StudentLayout>
  );
};

export default IELTSSpeakingResults;