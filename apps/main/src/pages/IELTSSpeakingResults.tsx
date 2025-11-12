import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Award,
  ArrowLeft,
  Volume2,
  Play,
  Pause,
  FileText,
  TrendingUp,
  Star,
  Sparkles,
} from "lucide-react";
import StudentLayout from "@/components/StudentLayout";
import { supabase } from "@/integrations/supabase/client";
import LottieLoadingAnimation from "@/components/animations/LottieLoadingAnimation";
import SuggestionVisualizer, { type Span } from "@/components/SuggestionVisualizer";
import { ElevenLabsVoiceOptimized } from "@/components/ElevenLabsVoiceOptimized";

interface QuestionAnalysis {
  part: string;
  partNumber: number;
  questionIndex: number;
  questionText: string;
  transcription: string;
  audio_url: string;
  feedback: string;
}

interface AISuggestion {
  original_spans: Span[];
  suggested_spans: Span[];
}

interface OverallFeedback {
  overall_band_score: number;
  fluency_coherence: { score: number; feedback: string };
  lexical_resource: { score: number; feedback: string };
  grammatical_range: { score: number; feedback: string };
  pronunciation: { score: number; feedback: string };
  path_to_higher_score: string[];
  stress_patterns_to_improve?: string[];
  intonation_recommendations?: string[];
  phonetic_focus_areas?: string[];
  word_stress_issues?: string[];
}

const IELTSSpeakingResults = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [overallFeedback, setOverallFeedback] = useState<OverallFeedback | null>(null);
  const [questionAnalyses, setQuestionAnalyses] = useState<QuestionAnalysis[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<Record<string, AISuggestion>>({});

  // Get test_result_id from location state or URL query
  const searchParams = new URLSearchParams(location.search);
  const testResultIdFromUrl = searchParams.get("test_result_id") || searchParams.get("id");
  const testResultId =
    (location.state as any)?.testResultId ||
    (location.state as any)?.test_result_id ||
    testResultIdFromUrl ||
    null;

  useEffect(() => {
    const loadAnalysis = async () => {
      try {
        if (!testResultId) {
          navigate("/ielts-portal");
          return;
        }

        setIsLoading(true);

        // Load speaking test results from database
        const { data: speakingRows, error } = await supabase
          .from("speaking_test_results")
          .select("*")
          .eq("test_result_id", testResultId)
          .order("part_number", { ascending: true })
          .order("id", { ascending: true });

        if (error) {
          throw error;
        }

        if (!speakingRows || speakingRows.length === 0) {
          toast({
            title: "No Speaking Data",
            description: "We could not find your speaking responses for this attempt.",
            variant: "destructive",
          });
          navigate("/ielts-portal");
          return;
        }

        // Normalize recordings for edge function
        const allRecordings = speakingRows.map((row, idx) => {
          const partNumber = Number(row.part_number) || 1;
          return {
            part: `part${partNumber}_q${idx}`,
            partNumber,
            questionIndex: idx,
            questionText: row.question_text || `Part ${partNumber} Question ${idx + 1}`,
            audio_url: row.audio_url || null,
          };
        });

        // Call edge function for analysis
        const { data: result, error: analysisError } = await supabase.functions.invoke(
          "enhanced-speech-analysis",
          {
            body: {
              allRecordings,
              testData: null,
              analysisType: "comprehensive",
            },
          }
        );

        if (analysisError) {
          throw analysisError;
        }

        if (!result) {
          throw new Error("No response from analysis service");
        }

        // Process individual question analyses
        const rawAnalyses = Array.isArray(result.individualAnalyses)
          ? result.individualAnalyses
          : Array.isArray((result as any).per_question)
          ? (result as any).per_question
          : [];

        const normalizedQuestions: QuestionAnalysis[] = rawAnalyses.map((a: any, idx: number) => {
          const base = allRecordings[idx] || allRecordings[0];
          return {
            part: `Part ${a.partNumber || base?.partNumber || 1}`,
            partNumber: a.partNumber || base?.partNumber || 1,
            questionIndex: typeof a.questionIndex === "number" ? a.questionIndex : base?.questionIndex || 0,
            questionText: a.questionText || base?.questionText || `Question ${idx + 1}`,
            transcription: a.transcription || "",
            audio_url: a.audio_url || base?.audio_url || "",
            feedback: a.feedback || "Keep developing your ideas with clearer structure and richer vocabulary.",
          };
        });

        setQuestionAnalyses(normalizedQuestions);

        // Extract AI suggestions
        const suggestions: Record<string, AISuggestion> = {};
        rawAnalyses.forEach((a: any, idx: number) => {
          if (a.original_spans && a.suggested_spans) {
            const nq = normalizedQuestions[idx];
            if (nq) {
              const key = `${nq.part}_${nq.questionIndex}`;
              suggestions[key] = {
                original_spans: a.original_spans,
                suggested_spans: a.suggested_spans,
              };
            }
          }
        });
        setAiSuggestions(suggestions);

        // Process overall feedback
        const overall = (result as any).overall || result;
        const criteria = overall.criteria || result.criteria || {};

        // Scoring helper functions (preserved from original)
        const roundBand = (score: number | undefined, fallback: number): number => {
          if (typeof score !== "number") return fallback;
          if (score < 0) return 0;
          if (score > 9) return 9;
          const decimal = score - Math.floor(score);
          if (decimal === 0 || decimal === 0.5) return score;
          if (decimal === 0.25) return Math.floor(score) + 0.5;
          if (decimal === 0.75) return Math.ceil(score);
          return Math.round(score * 2) / 2;
        };

        const getCriterion = (
          key: string,
          defaultScore: number,
          defaultFeedback: string
        ): { score: number; feedback: string } => {
          const c = criteria[key];
          if (c && typeof c === "object" && c.score !== undefined) {
            return {
              score: roundBand(c.score, defaultScore),
              feedback: c.feedback || c.feedbackText || defaultFeedback,
            };
          }
          if (typeof c === "number") {
            return {
              score: roundBand(c, defaultScore),
              feedback: criteria[`${key}Feedback`] || criteria[`${key}_feedback`] || defaultFeedback,
            };
          }
          return {
            score: defaultScore,
            feedback: defaultFeedback,
          };
        };

        const overallBand = roundBand(
          overall.overallBandScore || result.overallBandScore,
          5
        );

        const pathToHigherScore = Array.isArray(overall.path_to_higher_score || result.path_to_higher_score)
          ? (overall.path_to_higher_score || result.path_to_higher_score)
          : [
              "Speak for the full time and fully develop each answer.",
              "Use a wider range of topic-specific vocabulary.",
              "Reduce hesitations and self-corrections.",
            ];

        setOverallFeedback({
          overall_band_score: overallBand,
          fluency_coherence: getCriterion("fluency", 5, "Fluency feedback not provided."),
          lexical_resource: getCriterion("lexical", 5, "Lexical feedback not provided."),
          grammatical_range: getCriterion("grammar", 5, "Grammar feedback not provided."),
          pronunciation: getCriterion("pronunciation", 5, "Pronunciation feedback not provided."),
          path_to_higher_score: pathToHigherScore,
          stress_patterns_to_improve: overall.stress_patterns_to_improve || [],
          intonation_recommendations: overall.intonation_recommendations || [],
          phonetic_focus_areas: overall.phonetic_focus_areas || [],
          word_stress_issues: overall.word_stress_issues || [],
        });
      } catch (err: any) {
        console.error("Error loading analysis:", err);
        toast({
          title: "Analysis Error",
          description: err.message || "Failed to analyze your speaking test. Please try again later.",
          variant: "destructive",
        });
        navigate("/ielts-portal");
      } finally {
        setIsLoading(false);
      }
    };

    loadAnalysis();
  }, [testResultId, navigate, toast]);

  const playAudio = async (audioUrl: string, questionId: string) => {
    if (playingAudio === questionId) {
      setPlayingAudio(null);
      return;
    }

    if (!audioUrl || audioUrl.startsWith('https://mock-r2-fallback.local') || audioUrl.startsWith('https://placeholder-r2')) {
      toast({
        title: "Audio Not Available",
        description: "The audio recording is not available or could not be loaded.",
        variant: "destructive",
      });
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
          description: "Failed to play audio recording. The audio may be inaudible or corrupted.",
          variant: "destructive",
        });
      };

      await audio.play();
    } catch (error) {
      console.error("Error playing audio:", error);
      setPlayingAudio(null);
      toast({
        title: "Audio Playback Failed",
        description: "Could not play the audio recording. It may be inaudible or unavailable.",
        variant: "destructive",
      });
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
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#eff6ff,_#f9fafb)] flex items-center justify-center">
        <LottieLoadingAnimation
          size="lg"
          message="Analyzing your IELTS Speaking performance..."
        />
      </div>
    );
  }

  if (!overallFeedback) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#eff6ff,_#f9fafb)] flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-slate-600">
            Unable to load your IELTS Speaking results.
          </p>
          <Button
            onClick={() => navigate("/ielts-portal")}
            className="mt-4 rounded-xl px-5 py-2.5 text-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to IELTS Portal
          </Button>
        </div>
      </div>
    );
  }

  const renderQuestionCard = (analysis: QuestionAnalysis, index: number) => {
    const key = `${analysis.part}_${analysis.questionIndex}`;
    const suggestion = aiSuggestions[key];
    const isPlaying = playingAudio === key;

    return (
      <div
        key={`${analysis.part}-${index}`}
        className="border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4 bg-white"
      >
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base sm:text-lg font-semibold text-slate-900">
            {analysis.part === "Part 2" ? "Cue Card Response" : `Question ${analysis.questionIndex + 1}`}
          </h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white text-slate-500 border border-slate-200">
            IELTS Speaking Practice
          </span>
        </div>

        <div>
          <h4 className="font-medium text-[11px] text-blue-700 mb-1 uppercase tracking-wide">
            {analysis.part === "Part 2" ? "Cue card" : "Question"}
          </h4>
          <div className="p-3 sm:p-4 bg-white rounded-xl text-xs sm:text-sm border border-slate-200/80 text-slate-800 leading-relaxed">
            {analysis.questionText || "Question text not available"}
          </div>
        </div>

        <div className="bg-slate-50 rounded-xl p-3 sm:p-4 space-y-3">
          <h4 className="font-medium mb-2 flex items-center gap-2 text-xs text-slate-800">
            <Volume2 className="w-3 h-3" />
            Your recorded answer
          </h4>
          {analysis.transcription && analysis.transcription.trim() ? (
            <div className="bg-white rounded-lg p-3 border border-slate-200">
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed italic">
                "{analysis.transcription}"
              </p>
            </div>
          ) : (
            <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
              <p className="text-xs sm:text-sm text-yellow-800 leading-relaxed italic">
                <span className="font-medium">Inaudible:</span> No audio was recorded or the audio could not be understood. Please ensure your microphone is working and try recording again.
              </p>
            </div>
          )}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {analysis.audio_url ? (
              <Button
                onClick={() => playAudio(analysis.audio_url, key)}
                variant={isPlaying ? "default" : "outline"}
                size="sm"
                className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs"
              >
                {isPlaying ? (
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
            ) : (
              <div className="text-xs text-slate-500 italic">
                Audio recording not available
              </div>
            )}
          </div>
        </div>

        {suggestion && suggestion.original_spans && suggestion.suggested_spans && (
          <div className="bg-white rounded-xl p-3 mt-4 border border-slate-200/80">
            <h4 className="font-medium mb-2 flex items-center gap-2 text-xs text-slate-900">
              <TrendingUp className="w-3 h-3 text-blue-600" />
              Improved version of your answer
            </h4>
            <SuggestionVisualizer
              originalSpans={suggestion.original_spans}
              suggestedSpans={suggestion.suggested_spans}
              dimNeutral={false}
              hideOriginal={false}
            />
            <div className="mt-3 flex justify-end">
              <ElevenLabsVoiceOptimized
                text={
                  suggestion.suggested_spans
                    ?.map((span) => span?.text || "")
                    .filter(Boolean)
                    .join("") || ""
                }
                className="text-xs"
                questionId={`suggestion_${key}`}
              />
            </div>
          </div>
        )}

        <div>
          <h4 className="font-medium text-xs sm:text-sm text-blue-900 mb-2 flex items-center gap-2">
            <Sparkles className="w-3 h-3 text-blue-600" />
            Feedback for your response
          </h4>
          <div className="rounded-xl p-4 bg-white border border-slate-200/80">
            <p className="text-xs sm:text-sm leading-relaxed text-slate-800 whitespace-pre-wrap">
              {analysis.feedback
                ? analysis.feedback.replace(/\*\*/g, "").replace(/###/g, "").replace(/\*/g, "")
                : "Feedback analysis in progress..."}
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.06),_#f9fafb)]">
      <StudentLayout title="IELTS Speaking Results" showBackButton>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-0 py-8 space-y-8">
          {/* Header */}
          <div className="text-center space-y-3">
            <Badge
              variant="outline"
              className="mb-2 px-4 py-1 text-[10px] tracking-[0.18em] uppercase text-blue-700 border-blue-200 bg-white/70 rounded-full"
            >
              IELTS SPEAKING • OFFICIAL-STYLE REPORT
            </Badge>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900">
              IELTS Speaking Practice Test
            </h1>
            <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto">
              AI examiner-style evaluation aligned with IELTS band descriptors
              for Fluency & Coherence, Lexical Resource, Grammatical Range
              & Accuracy, and Pronunciation.
            </p>
          </div>

          {/* Overall Band Score */}
          <Card className="border border-slate-200/80 rounded-3xl bg-white">
            <CardContent className="px-6 sm:px-10 py-7 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div
                  className={`flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br ${getOverallBandColor(
                    overallFeedback.overall_band_score
                  )} text-white text-4xl font-semibold shadow-lg`}
                >
                  {overallFeedback.overall_band_score}
                </div>
                <div className="text-left space-y-1">
                  <div className="text-xs font-semibold tracking-[0.16em] text-blue-600 uppercase">
                    Overall Speaking Band
                  </div>
                  <div className="text-sm text-slate-600">
                    {overallFeedback.overall_band_score >= 8
                      ? "Excellent: ready for high-stakes academic/professional use."
                      : overallFeedback.overall_band_score >= 6.5
                      ? "Good: functional command with some gaps."
                      : overallFeedback.overall_band_score >= 5
                      ? "Modest: partial command; noticeable limitations."
                      : "Needs improvement: below target; focus on fundamentals."}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-start sm:items-end gap-2 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-blue-500" />
                  <span>
                    Analysis generated by enhanced-speech-analysis
                    (AI examiner-style)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500" />
                  <span>Scores derived from four official IELTS criteria</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Criteria Scores */}
          <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
            <Card className="rounded-2xl border border-slate-200 bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    {getScoreIcon(overallFeedback.fluency_coherence.score)}
                    Fluency & Coherence
                  </span>
                  <Badge
                    className={`${getBandColor(
                      overallFeedback.fluency_coherence.score
                    )} border text-[10px] px-2 py-0.5`}
                  >
                    Band {overallFeedback.fluency_coherence.score}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-1">
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {overallFeedback.fluency_coherence.feedback}
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-slate-200 bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    {getScoreIcon(overallFeedback.lexical_resource.score)}
                    Lexical Resource
                  </span>
                  <Badge
                    className={`${getBandColor(
                      overallFeedback.lexical_resource.score
                    )} border text-[10px] px-2 py-0.5`}
                  >
                    Band {overallFeedback.lexical_resource.score}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-1">
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {overallFeedback.lexical_resource.feedback}
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-slate-200 bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    {getScoreIcon(overallFeedback.grammatical_range.score)}
                    Grammatical Range & Accuracy
                  </span>
                  <Badge
                    className={`${getBandColor(
                      overallFeedback.grammatical_range.score
                    )} border text-[10px] px-2 py-0.5`}
                  >
                    Band {overallFeedback.grammatical_range.score}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-1">
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {overallFeedback.grammatical_range.feedback}
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-slate-200 bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    {getScoreIcon(overallFeedback.pronunciation.score)}
                    Pronunciation
                  </span>
                  <Badge
                    className={`${getBandColor(
                      overallFeedback.pronunciation.score
                    )} border text-[10px] px-2 py-0.5`}
                  >
                    Band {overallFeedback.pronunciation.score}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-1">
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {overallFeedback.pronunciation.feedback}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Enhanced Pronunciation Analysis */}
          {(overallFeedback.stress_patterns_to_improve?.length ||
            overallFeedback.intonation_recommendations?.length ||
            overallFeedback.phonetic_focus_areas?.length ||
            overallFeedback.word_stress_issues?.length) && (
            <Card className="rounded-3xl border border-slate-200/80 bg-white">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-blue-50">
                    <Volume2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Enhanced Pronunciation Analysis</h3>
                    <p className="text-sm text-slate-600">Detailed feedback on speech patterns and sounds</p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {overallFeedback.stress_patterns_to_improve?.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm text-slate-900 mb-2 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      Word Stress Patterns to Improve
                    </h4>
                    <div className="grid gap-2">
                      {overallFeedback.stress_patterns_to_improve.map((pattern, index) => (
                        <div key={index} className="text-xs text-slate-600 bg-blue-50 rounded-lg px-3 py-2 font-mono">
                          {pattern}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {overallFeedback.intonation_recommendations?.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm text-slate-900 mb-2 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                      Intonation Recommendations
                    </h4>
                    <div className="grid gap-2">
                      {overallFeedback.intonation_recommendations.map((rec, index) => (
                        <div key={index} className="text-xs text-slate-600 bg-green-50 rounded-lg px-3 py-2">
                          {rec}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {overallFeedback.phonetic_focus_areas?.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm text-slate-900 mb-2 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                      Phonetic Sounds to Focus On
                    </h4>
                    <div className="grid gap-2">
                      {overallFeedback.phonetic_focus_areas.map((sound, index) => (
                        <div key={index} className="text-xs text-slate-600 bg-orange-50 rounded-lg px-3 py-2 font-mono">
                          {sound}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {overallFeedback.word_stress_issues?.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm text-slate-900 mb-2 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                      Word Stress Corrections
                    </h4>
                    <div className="grid gap-2">
                      {overallFeedback.word_stress_issues.map((issue, index) => (
                        <div key={index} className="text-xs text-slate-600 bg-purple-50 rounded-lg px-3 py-2">
                          {issue}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Part 1 */}
          {questionAnalyses.some((a) => a.part === "Part 1") && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">
                Part 1 – Introduction and Interview
              </h2>
              {questionAnalyses
                .filter((a) => a.part === "Part 1")
                .sort((a, b) => a.questionIndex - b.questionIndex)
                .map((analysis, index) => renderQuestionCard(analysis, index))}
            </div>
          )}

          {/* Part 2 */}
          {questionAnalyses.some((a) => a.part === "Part 2") && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">
                Part 2 – Long Turn (Cue Card)
              </h2>
              {questionAnalyses
                .filter((a) => a.part === "Part 2")
                .map((analysis, index) => renderQuestionCard(analysis, index))}
            </div>
          )}

          {/* Part 3 */}
          {questionAnalyses.some((a) => a.part === "Part 3") && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">
                Part 3 – Discussion
              </h2>
              {questionAnalyses
                .filter((a) => a.part === "Part 3")
                .sort((a, b) => a.questionIndex - b.questionIndex)
                .map((analysis, index) => renderQuestionCard(analysis, index))}
            </div>
          )}

          {/* Path to higher score */}
          <Card className="rounded-3xl bg-gradient-to-br from-blue-50 via-slate-50 to-emerald-50 border border-blue-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                Your path to a higher band score
              </CardTitle>
              <p className="text-xs text-slate-600">
                Prioritized, examiner-aligned actions generated from your
                performance.
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {overallFeedback.path_to_higher_score.map((tip, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 sm:p-4 bg-white/95 rounded-2xl border border-blue-100/80 shadow-sm"
                  >
                    <div className="flex-shrink-0 w-7 h-7 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full text-[10px] font-semibold text-white flex items-center justify-center">
                      {index + 1}
                    </div>
                    <p className="text-xs sm:text-sm text-slate-800 leading-relaxed">
                      {tip.replace(/\*\*/g, "").replace(/###/g, "").replace(/\*/g, "")}
                    </p>
                  </div>
                ))}
              </div>

              <Separator className="my-5" />

              <div className="text-center space-y-3">
                <p className="text-xs sm:text-sm text-slate-600">
                  Ready to immediately apply this feedback in another IELTS
                  Speaking simulation?
                </p>
                <div className="flex flex-wrap gap-3 justify-center">
                  <Button
                    onClick={() => navigate("/ielts-portal")}
                    variant="outline"
                    className="rounded-xl px-4 py-2 text-xs sm:text-sm border-slate-300"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to IELTS Portal
                  </Button>
                  <Button
                    onClick={() => navigate("/ielts-portal")}
                    className="rounded-xl px-5 py-2 text-xs sm:text-sm bg-blue-600 shadow-md"
                  >
                    Take Another Speaking Test
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
