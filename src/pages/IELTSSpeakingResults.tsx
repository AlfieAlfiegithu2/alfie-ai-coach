import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Award, ArrowLeft, Volume2, Play, Pause, FileText, TrendingUp, Star, Sparkles } from "lucide-react";
import StudentLayout from "@/components/StudentLayout";
import { supabase } from "@/integrations/supabase/client";
import LottieLoadingAnimation from "@/components/animations/LottieLoadingAnimation";
import LightRays from "@/components/animations/LightRays";
import SentenceComparison, { type SentencePair } from "@/components/SentenceComparison";

interface QuestionAnalysis {
  part: string;
  partNumber: number;
  questionIndex: number;
  questionText: string;
  transcription: string;
  audio_url: string;
  feedback: string;
}

interface AISentenceSuggestion extends Array<SentencePair> {}


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
  const [aiSuggestions, setAiSuggestions] = useState<Record<string, AISentenceSuggestion>>({});
  const [playingAISuggestion, setPlayingAISuggestion] = useState<boolean>(false);
  
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

      // Generate AI suggestions for each question analysis
      if (result.individualAnalyses && result.individualAnalyses.length > 0) {
        console.log('🤖 Generating AI suggestions for questions...');
        await generateAISuggestions(result.individualAnalyses);
      }

    } catch (error) {
      console.error('Error analyzing test results:', error);
      toast({
        title: "Analysis Error",
        description: "Failed to analyze your test results. Please try again.",
        variant: "destructive"
      });
      
      // Fallback data for analysis failure - give low scores since we can't properly assess
      setOverallFeedback({
        overall_band_score: 1.0,
        fluency_coherence: {
          score: 1,
          feedback: "Unable to assess due to technical issues. Please retake the test to receive proper evaluation."
        },
        lexical_resource: {
          score: 1,
          feedback: "Unable to assess due to technical issues. Please retake the test to receive proper evaluation."
        },
        grammatical_range: {
          score: 1,
          feedback: "Unable to assess due to technical issues. Please retake the test to receive proper evaluation."
        },
        pronunciation: {
          score: 1,
          feedback: "Unable to assess due to technical issues. Please retake the test to receive proper evaluation."
        },
        path_to_higher_score: [
          "Technical error occurred during analysis. Please retake the test for accurate assessment.",
          "Ensure you speak clearly and provide substantial responses to each question.",
          "Practice speaking for the full allocated time with relevant content."
        ]
      });
    } finally {
      setIsLoading(false);
    }
  };

  // IELTS Band Score Rounding Rules
  const roundToIELTSBandScore = (score: number): number => {
    if (score < 0) return 0;
    if (score > 9) return 9;
    
    const decimal = score - Math.floor(score);
    
    // .00 or .50 stays as is
    if (decimal === 0 || decimal === 0.5) {
      return score;
    }
    
    // .25 rounds UP to next half band
    if (decimal === 0.25) {
      return Math.floor(score) + 0.5;
    }
    
    // .75 rounds UP to next whole band
    if (decimal === 0.75) {
      return Math.ceil(score);
    }
    
    // All other decimals round to nearest half band (traditional rounding)
    return Math.round(score * 2) / 2;
  };

  const parseOverallAnalysis = (analysisText: string): OverallFeedback => {
    // Parse the structured response from the AI - remove asterisks for cleaner parsing
    const cleanText = analysisText.replace(/\*\*/g, '');
    
    const fluencyMatch = cleanText.match(/FLUENCY & COHERENCE:\s*(\d(?:\.\d)?)\s*-\s*([^A-Z]*)/);
    const lexicalMatch = cleanText.match(/LEXICAL RESOURCE:\s*(\d(?:\.\d)?)\s*-\s*([^A-Z]*)/);
    const grammarMatch = cleanText.match(/GRAMMATICAL RANGE & ACCURACY:\s*(\d(?:\.\d)?)\s*-\s*([^A-Z]*)/);
    const pronunciationMatch = cleanText.match(/PRONUNCIATION:\s*(\d(?:\.\d)?)\s*-\s*([^A-Z]*)/);
    const overallMatch = cleanText.match(/OVERALL BAND SCORE:\s*(\d(?:\.\d)?)/);
    const feedbackMatch = cleanText.match(/COMPREHENSIVE FEEDBACK:\s*([^$]+)/);

    // Ensure scores are realistic - if parsing fails, use very low scores
    const defaultScore = 1;
    const defaultFeedback = "Unable to properly assess. Please retake the test with substantive responses.";

    // Calculate individual scores with rounding
    const fluencyScore = roundToIELTSBandScore(fluencyMatch ? parseFloat(fluencyMatch[1]) : defaultScore);
    const lexicalScore = roundToIELTSBandScore(lexicalMatch ? parseFloat(lexicalMatch[1]) : defaultScore);
    const grammarScore = roundToIELTSBandScore(grammarMatch ? parseFloat(grammarMatch[1]) : defaultScore);
    const pronunciationScore = roundToIELTSBandScore(pronunciationMatch ? parseFloat(pronunciationMatch[1]) : defaultScore);
    
    // Calculate overall band score from individual scores (not from AI response)
    const averageScore = (fluencyScore + lexicalScore + grammarScore + pronunciationScore) / 4;
    const overallBandScore = roundToIELTSBandScore(averageScore);

    return {
      overall_band_score: overallBandScore,
      fluency_coherence: {
        score: fluencyScore,
        feedback: fluencyMatch ? fluencyMatch[2].trim() : defaultFeedback
      },
      lexical_resource: {
        score: lexicalScore,
        feedback: lexicalMatch ? lexicalMatch[2].trim() : defaultFeedback
      },
      grammatical_range: {
        score: grammarScore,
        feedback: grammarMatch ? grammarMatch[2].trim() : defaultFeedback
      },
      pronunciation: {
        score: pronunciationScore,
        feedback: pronunciationMatch ? pronunciationMatch[2].trim() : defaultFeedback
      },
      path_to_higher_score: feedbackMatch ? 
        feedbackMatch[1].trim().split(/\d+\.|\n-|\n•/).filter(tip => tip.trim().length > 0).map(tip => tip.trim()).slice(0, 4) :
        [
          "Provide substantive responses to all questions instead of silence or minimal words",
          "Practice speaking for the full allocated time with relevant content", 
          "Work on developing complete thoughts and explanations for each question"
        ]
    };
  };

  const generateAISuggestions = async (analyses: QuestionAnalysis[]) => {
    const suggestions: Record<string, AISentenceSuggestion> = {};
    
    for (const analysis of analyses) {
      const questionKey = `${analysis.part}_${analysis.questionIndex}`;
      
      try {
        console.log(`🎯 Generating suggestion for ${questionKey}...`);
        
        const { data: suggestion, error } = await supabase.functions.invoke('analyze-speaking-suggestion', {
          body: {
            questionPrompt: analysis.questionText,
            studentTranscription: analysis.transcription
          }
        });

        if (error) {
          console.error(`Error generating suggestion for ${questionKey}:`, error);
          continue;
        }

        if (Array.isArray(suggestion)) {
          suggestions[questionKey] = suggestion as AISentenceSuggestion;
          console.log(`✅ Suggestion generated for ${questionKey}`);
        }
      } catch (error) {
        console.error(`Failed to generate suggestion for ${questionKey}:`, error);
      }
    }
    
    setAiSuggestions(suggestions);
    console.log('🎉 All AI suggestions generated:', Object.keys(suggestions).length);
  };

  const playAISuggestion = async (pairs: SentencePair[]) => {
    if (playingAISuggestion) {
      setPlayingAISuggestion(false);
      return;
    }

    try {
      setPlayingAISuggestion(true);
      
      const textToSpeak = pairs.map(p => p.suggested_sentence).join(' ');
      
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: {
          text: textToSpeak,
          voice: 'alloy'
        }
      });

      if (error) throw error;

      if (data && data.audioContent) {
        const audio = new Audio(`data:audio/mp3;base64,${data.audioContent}`);
        
        audio.onended = () => {
          setPlayingAISuggestion(false);
        };
        
        audio.onerror = () => {
          setPlayingAISuggestion(false);
          toast({
            title: "Audio Error",
            description: "Failed to play AI suggestion audio",
            variant: "destructive"
          });
        };
        
        await audio.play();
      } else {
        throw new Error('No audio content received');
      }
    } catch (error) {
      console.error('Error playing AI suggestion:', error);
      setPlayingAISuggestion(false);
      toast({
        title: "Audio Error",
        description: "Failed to generate audio for AI suggestion",
        variant: "destructive"
      });
    }
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
        <LottieLoadingAnimation size="lg" message="Analyzing your speaking performance..." />
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
    <div className="min-h-screen bg-background relative">
      <LightRays 
        raysOrigin="bottom-center"
        raysColor="#8B5CF6"
        raysSpeed={0.4}
        lightSpread={1.8}
        rayLength={1.8}
        pulsating={false}
        fadeDistance={1.3}
        saturation={0.7}
        followMouse={true}
        mouseInfluence={0.06}
        noiseAmount={0.08}
        distortion={0.15}
      />
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
            <div className="flex items-center justify-center gap-8">
              <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-r ${getOverallBandColor(overallFeedback.overall_band_score)} text-white text-3xl font-bold`}>
                {overallFeedback.overall_band_score}
              </div>
              <dotlottie-wc 
                src="https://lottie.host/0fe81d4c-ce6d-47ce-9f32-cbf478902f97/IONCXdpNpV.lottie" 
                style={{width: "300px", height: "300px"}} 
                speed="1" 
                autoplay 
                loop
              />
            </div>
            <h2 className="text-2xl font-bold mb-2 mt-4">Overall Band Score</h2>
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
              Your Audio Responses
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Play each answer and see sentence-by-sentence AI suggestions directly below
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
                  <h4 className="font-medium text-primary mb-2">
                    Official Question
                  </h4>
                  <div className="p-4 bg-primary/5 rounded-lg text-sm border border-primary/20">
                    {analysis.questionText || "Question text not available"}
                  </div>
                </div>

                {/* Interactive Audio Player */}
                <div className="bg-muted/50 rounded-lg p-4">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Volume2 className="w-4 h-4" />
                    Your Audio Response
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
                  
                  {/* AI Suggested Better Answer directly under audio */}
                  {(() => {
                    const questionKey = `${analysis.part}_${analysis.questionIndex}`;
                    const pairs = aiSuggestions[questionKey];
                    if (pairs && pairs.length) {
                      return (
                        <div className="mt-4">
                          <h4 className="font-medium mb-3 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4" />
                            AI Suggested Better Answer:
                          </h4>
                          <div className="flex items-center gap-3 mb-4">
                            <Button
                              onClick={() => playAISuggestion(pairs)}
                              variant={playingAISuggestion ? "default" : "outline"}
                              size="sm"
                              className="flex items-center gap-2"
                            >
                              {playingAISuggestion ? (
                                <>
                                  <Pause className="w-4 h-4" />
                                  Stop AI Audio
                                </>
                              ) : (
                                <>
                                  <Play className="w-4 h-4" />
                                  Play AI Answer
                                </>
                              )}
                            </Button>
                            <span className="text-sm text-muted-foreground">
                              {playingAISuggestion ? 'Playing improved version...' : 'Listen to the improved version of your response'}
                            </span>
                          </div>
                          <SentenceComparison pairs={pairs} />
                        </div>
                      );
                    }
                    return null;
                  })()}

                </div>


              </div>
            ))}
          </CardContent>
        </Card>

        {/* Your Path to a Higher Score Section */}
        <Card className="card-modern bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Path to Higher Score
            </CardTitle>
            <p className="text-sm text-muted-foreground">Actionable steps to improve your speaking performance</p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {overallFeedback.path_to_higher_score.map((tip, index) => (
                <div key={index} className="flex items-start gap-4 p-4 bg-card/80 rounded-xl border border-primary/10 shadow-soft backdrop-blur-sm">
                  <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-primary to-secondary rounded-full text-white text-sm font-bold flex items-center justify-center">
                    {index + 1}
                  </div>
                  <p className="text-sm text-foreground/90 leading-relaxed font-medium">
                    {tip.replace(/\*\*/g, '').replace(/###/g, '').replace(/\*/g, '')}
                  </p>
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
    </div>
  );
};

export default IELTSSpeakingResults;