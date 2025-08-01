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
      console.log('🤖 Starting comprehensive audio-first analysis...');
      console.log('📊 Input data:', { testData: !!testData, recordingsCount: recordings.length });

      // Prepare all recordings for batch analysis
      const recordingsWithDetails = await Promise.all(recordings.map(async (recording: any) => {
        const response = await fetch(recording.audio_url);
        const blob = await response.blob();
        
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

        const reader = new FileReader();
        
        return new Promise((resolve) => {
          reader.onloadend = () => {
            const base64Audio = reader.result?.toString().split(',')[1];
            resolve({
              part: `Part ${partNumber}`,
              partNum: partNumber,
              questionIndex,
              questionTranscription: questionText,
              audio_base64: base64Audio,
              audio_url: recording.audio_url
            });
          };
          reader.readAsDataURL(blob);
        });
      }));

      const allRecordings = await Promise.all(recordingsWithDetails);

      // Send all recordings for comprehensive analysis
      const { data: result, error } = await supabase.functions.invoke('enhanced-speech-analysis', {
        body: {
          allRecordings,
          testData,
          analysisType: 'comprehensive'
        }
      });

      if (error) throw error;

      console.log('📈 Analysis result:', {
        hasIndividualAnalyses: !!result?.individualAnalyses,
        individualAnalysesCount: result?.individualAnalyses?.length || 0,
        hasOverallAnalysis: !!result?.analysis,
        success: result?.success
      });

      if (result.individualAnalyses) {
        console.log('✅ Setting individual analyses:', result.individualAnalyses.length);
        setQuestionAnalyses(result.individualAnalyses);
      } else {
        console.warn('⚠️ No individual analyses received');
      }

      if (result.analysis) {
        const overallData = parseOverallAnalysis(result.analysis);
        console.log('✅ Setting overall feedback:', overallData);
        setOverallFeedback(overallData);
      } else {
        console.warn('⚠️ No overall analysis received');
      }

    } catch (error) {
      console.error('Error analyzing test results:', error);
      toast({
        title: "Analysis Error",
        description: "Failed to analyze your test results. Please try again.",
        variant: "destructive"
      });
      
      // Fallback data
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
    } finally {
      setIsLoading(false);
    }
  };

  const parseOverallAnalysis = (analysisText: string): OverallFeedback => {
    // Parse the structured response from the AI
    const fluencyMatch = analysisText.match(/\*\*FLUENCY & COHERENCE\*\*:\s*(\d(?:\.\d)?)\s*-\s*([^*]+)/);
    const lexicalMatch = analysisText.match(/\*\*LEXICAL RESOURCE\*\*:\s*(\d(?:\.\d)?)\s*-\s*([^*]+)/);
    const grammarMatch = analysisText.match(/\*\*GRAMMATICAL RANGE & ACCURACY\*\*:\s*(\d(?:\.\d)?)\s*-\s*([^*]+)/);
    const pronunciationMatch = analysisText.match(/\*\*PRONUNCIATION\*\*:\s*(\d(?:\.\d)?)\s*-\s*([^*]+)/);
    const overallMatch = analysisText.match(/\*\*OVERALL BAND SCORE\*\*:\s*(\d(?:\.\d)?)/);
    const feedbackMatch = analysisText.match(/\*\*COMPREHENSIVE FEEDBACK\*\*:\s*([^$]+)/);

    return {
      overall_band_score: overallMatch ? parseFloat(overallMatch[1]) : 6.5,
      fluency_coherence: {
        score: fluencyMatch ? parseFloat(fluencyMatch[1]) : 6,
        feedback: fluencyMatch ? fluencyMatch[2].trim() : "Good overall fluency with room for improvement."
      },
      lexical_resource: {
        score: lexicalMatch ? parseFloat(lexicalMatch[1]) : 6,
        feedback: lexicalMatch ? lexicalMatch[2].trim() : "Adequate vocabulary range demonstrated."
      },
      grammatical_range: {
        score: grammarMatch ? parseFloat(grammarMatch[1]) : 6,
        feedback: grammarMatch ? grammarMatch[2].trim() : "Mixed use of grammatical structures."
      },
      pronunciation: {
        score: pronunciationMatch ? parseFloat(pronunciationMatch[1]) : 6,
        feedback: pronunciationMatch ? pronunciationMatch[2].trim() : "Generally clear pronunciation."
      },
      path_to_higher_score: feedbackMatch ? 
        feedbackMatch[1].trim().split(/\d+\.|\n-|\n•/).filter(tip => tip.trim().length > 0).map(tip => tip.trim()).slice(0, 4) :
        [
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
              <Volume2 className="w-5 h-5 text-primary" />
              Audio-First Question Analysis
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Advanced AI examiner feedback based on your actual speech patterns, fluency, and pronunciation
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {questionAnalyses.map((analysis, index) => (
              <div key={index} className="border border-border rounded-lg p-6 space-y-4 bg-card">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold">
                    {analysis.part} - Question {analysis.questionIndex + 1}
                  </h3>
                </div>
                
                {/* Official Question Text */}
                <div>
                  <h4 className="font-medium text-primary mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Official Question:
                  </h4>
                  <div className="p-4 bg-primary/5 rounded-lg text-sm border border-primary/20">
                    {analysis.questionText || "Question text not available"}
                  </div>
                </div>

                {/* Interactive Audio Player */}
                <div className="bg-muted/50 rounded-lg p-4">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Volume2 className="w-4 h-4" />
                    Your Audio Response:
                  </h4>
                  <div className="flex items-center gap-3">
                    <Button
                      onClick={() => playAudio(analysis.audio_url, `${analysis.part}_${analysis.questionIndex}`)}
                      variant={playingAudio === `${analysis.part}_${analysis.questionIndex}` ? "default" : "outline"}
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
                      {playingAudio === `${analysis.part}_${analysis.questionIndex}` ? 
                        'Now playing: Listen to your speech patterns and delivery...' : 
                        'Click to hear your complete response for this question'
                      }
                    </span>
                  </div>
                </div>

                {/* Advanced AI Feedback */}
                <div>
                  <h4 className="font-medium text-green-700 mb-3 flex items-center gap-2">
                    <Award className="w-4 h-4" />
                    Advanced AI Examiner Feedback:
                  </h4>
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="prose prose-sm max-w-none">
                      {analysis.feedback.split('\n').map((line, lineIndex) => (
                        <p key={lineIndex} className="mb-2 last:mb-0 text-sm leading-relaxed">
                          {line}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Transcription in collapsible section */}
                <details className="group">
                  <summary className="cursor-pointer font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2">
                    <span>View Speech Transcription</span>
                    <span className="text-xs opacity-70">(Click to expand)</span>
                  </summary>
                  <div className="mt-3 p-3 bg-muted rounded-lg text-sm max-h-32 overflow-y-auto border">
                    {analysis.transcription}
                  </div>
                </details>
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