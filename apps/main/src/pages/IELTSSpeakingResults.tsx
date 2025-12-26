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
  Activity,
  Mic,
  AlertCircle,
} from "lucide-react";
import StudentLayout from "@/components/StudentLayout";
import { supabase } from "@/integrations/supabase/client";
import LottieLoadingAnimation from "@/components/animations/LottieLoadingAnimation";
import SuggestionVisualizer, { type Span } from "@/components/SuggestionVisualizer";
import { ElevenLabsVoiceOptimized } from "@/components/ElevenLabsVoiceOptimized";
import { CustomAudioPlayer } from "@/components/CustomAudioPlayer";

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
          <h4 className="font-medium text-xs text-blue-600 mb-2 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
            {analysis.part === "Part 2" ? "Cue card" : "Question"}
          </h4>
          <div className="p-4 sm:p-5 bg-white rounded-2xl text-sm sm:text-base border border-slate-200 shadow-sm text-slate-800 leading-relaxed font-medium">
            {analysis.questionText || "Question text not available"}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-1 space-y-3 border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-4 pt-4 pb-2">
            <h4 className="font-medium flex items-center gap-2 text-xs text-slate-500 uppercase tracking-wider">
              <Volume2 className="w-3.5 h-3.5" />
              Your Response
            </h4>
          </div>

          <div className="px-4 pb-4">
            {/* Custom Audio Player */}
            {analysis.audio_url ? (
              <div className="bg-[#FAFAFA] rounded-xl p-1 border border-stone-100">
                <CustomAudioPlayer src={analysis.audio_url} />
              </div>
            ) : (
              <div className="text-xs text-slate-500 italic bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5" />
                Audio recording not available
              </div>
            )}

            {/* Transcription Display */}
            {analysis.transcription && analysis.transcription.trim() ? (
              <div className="mt-4">
                <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm relative group">
                  <div className="absolute top-3 right-3 opacity-30 group-hover:opacity-100 transition-opacity">
                    <FileText className="w-4 h-4 text-slate-400" />
                  </div>
                  <p className="text-sm text-slate-600 leading-7 italic">
                    "{analysis.transcription}"
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-orange-50/50 rounded-xl p-4 border border-orange-100 mt-4 flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
                <p className="text-sm text-orange-800 leading-relaxed">
                  <span className="font-semibold">Recording unclear:</span> No audio was recorded or the speech could not be transcribed.
                </p>
              </div>
            )}
          </div>
        </div>

        {suggestion && suggestion.original_spans && suggestion.suggested_spans && (
          <div className="bg-gradient-to-br from-white to-blue-50/20 rounded-2xl p-5 mt-6 border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-blue-100/20 rounded-full blur-2xl -mr-10 -mt-10"></div>

            <h4 className="font-semibold mb-6 flex items-center gap-2.5 text-sm text-slate-900 relative z-10">
              <div className="p-1.5 bg-blue-100 rounded-lg">
                <TrendingUp className="w-4 h-4 text-blue-600" />
              </div>
              Pronunciation Flow & Improvements
            </h4>

            {/* Pronunciation Flow Visualization */}
            <div className="space-y-8 relative z-10">
              {/* Original Flow */}
              <div className="relative group">
                <div className="absolute left-[3px] top-2 bottom-0 w-0.5 bg-slate-200 rounded-full group-hover:bg-slate-300 transition-colors"></div>
                <div className="pl-6 space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                    What you said
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {suggestion.original_spans.map((span, i) => (
                      <span
                        key={i}
                        className={`px-2.5 py-1.5 rounded-lg text-sm transition-all duration-300 ${span.status === 'suggestion'
                          ? 'bg-red-50 text-red-700 border border-red-100 font-medium ring-1 ring-red-100/50'
                          : 'bg-white text-slate-600 border border-slate-100 shadow-sm'
                          }`}
                      >
                        {span.text}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Improved Flow */}
              <div className="relative group">
                <div className="absolute left-[3px] top-2 bottom-0 w-0.5 bg-blue-200 rounded-full group-hover:bg-blue-300 transition-colors"></div>
                <div className="pl-6 space-y-2">
                  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                    Better Flow
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {suggestion.suggested_spans.map((span, i) => (
                      <span
                        key={i}
                        className={`px-2.5 py-1.5 rounded-lg text-sm transition-all duration-300 ${span.status === 'enhancement'
                          ? 'bg-blue-50 text-blue-700 border border-blue-100 font-semibold shadow-sm ring-1 ring-blue-100/50'
                          : 'bg-white text-slate-600 border border-slate-100 shadow-sm'
                          }`}
                      >
                        {span.text}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
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
          <div className="flex items-center gap-3 mb-3">
            <div className="relative">
              <img
                src="/1000031289.png"
                alt="Catie AI"
                className="w-12 h-12 rounded-full border-2 border-white shadow-md object-cover ring-2 ring-blue-50"
              />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                <Sparkles className="w-2.5 h-2.5 text-white" />
              </div>
            </div>
            <div>
              <h4 className="font-bold text-base text-slate-900">Catie's Feedback</h4>
              <p className="text-[11px] text-slate-500 font-medium bg-slate-100 inline-block px-2 py-0.5 rounded-full">AI Speaking Coach</p>
            </div>
          </div>
          <div className="rounded-2xl p-6 bg-gradient-to-br from-white to-blue-50/30 border border-blue-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Sparkles className="w-24 h-24 text-blue-600 rotate-12" />
            </div>
            <p className="text-sm sm:text-base leading-7 text-slate-700 whitespace-pre-wrap relative z-10 font-medium">
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-indigo-50">
      <StudentLayout title="IELTS Speaking Results" showBackButton>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
          {/* Header */}
          <div className="text-center space-y-4">
            <Badge
              variant="outline"
              className="mb-3 px-5 py-1.5 text-[11px] tracking-[0.2em] uppercase font-semibold text-blue-700 border-blue-200/60 bg-white/80 backdrop-blur-sm rounded-full shadow-sm"
            >
              IELTS SPEAKING • OFFICIAL-STYLE REPORT
            </Badge>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 bg-clip-text text-transparent">
              Speaking Test Results
            </h1>
            <p className="text-base sm:text-lg text-slate-600 max-w-3xl mx-auto leading-relaxed">
              AI examiner-style evaluation aligned with official IELTS band descriptors
              for Fluency & Coherence, Lexical Resource, Grammatical Range & Accuracy, and Pronunciation.
            </p>
          </div>

          {/* Overall Band Score - Enhanced Design */}
          <Card className="border-0 rounded-3xl bg-white shadow-xl shadow-blue-100/50">
            <CardContent className="px-8 sm:px-12 py-10">
              <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div
                    className={`relative flex items-center justify-center w-32 h-32 rounded-3xl bg-gradient-to-br ${getOverallBandColor(
                      overallFeedback.overall_band_score
                    )} text-white shadow-2xl shadow-blue-500/30`}
                  >
                    <div className="text-5xl font-bold">
                      {overallFeedback.overall_band_score}
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg">
                      <Award className="w-5 h-5 text-blue-600" />
                    </div>
                  </div>
                  <div className="text-center sm:text-left space-y-2">
                    <div className="text-sm font-bold tracking-[0.18em] text-blue-600 uppercase">
                      Overall Speaking Band
                    </div>
                    <div className="text-base text-slate-700 max-w-md">
                      {overallFeedback.overall_band_score >= 8
                        ? "🌟 Excellent: Ready for high-stakes academic/professional use"
                        : overallFeedback.overall_band_score >= 6.5
                          ? "✅ Good: Functional command with some gaps"
                          : overallFeedback.overall_band_score >= 5
                            ? "📚 Modest: Partial command with noticeable limitations"
                            : "⚠️ Needs improvement: Focus on fundamentals"}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-start sm:items-end gap-3 text-sm text-slate-500">
                  <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-full">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <span className="font-medium">AI-Powered Analysis</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-500" />
                    <span>Based on 4 official IELTS criteria</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Criteria Scores - Enhanced Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="rounded-2xl border-0 bg-white shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-3 text-base font-bold text-slate-900">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md">
                      {getScoreIcon(overallFeedback.fluency_coherence.score)}
                    </div>
                    Fluency & Coherence
                  </span>
                  <Badge
                    className={`${getBandColor(
                      overallFeedback.fluency_coherence.score
                    )} border-2 text-xs font-bold px-3 py-1 shadow-sm`}
                  >
                    Band {overallFeedback.fluency_coherence.score}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <p className="text-sm text-slate-600 leading-relaxed">
                  {overallFeedback.fluency_coherence.feedback}
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-0 bg-white shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-3 text-base font-bold text-slate-900">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-md">
                      {getScoreIcon(overallFeedback.lexical_resource.score)}
                    </div>
                    Lexical Resource
                  </span>
                  <Badge
                    className={`${getBandColor(
                      overallFeedback.lexical_resource.score
                    )} border-2 text-xs font-bold px-3 py-1 shadow-sm`}
                  >
                    Band {overallFeedback.lexical_resource.score}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <p className="text-sm text-slate-600 leading-relaxed">
                  {overallFeedback.lexical_resource.feedback}
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-0 bg-white shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-3 text-base font-bold text-slate-900">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-md">
                      {getScoreIcon(overallFeedback.grammatical_range.score)}
                    </div>
                    Grammar & Accuracy
                  </span>
                  <Badge
                    className={`${getBandColor(
                      overallFeedback.grammatical_range.score
                    )} border-2 text-xs font-bold px-3 py-1 shadow-sm`}
                  >
                    Band {overallFeedback.grammatical_range.score}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <p className="text-sm text-slate-600 leading-relaxed">
                  {overallFeedback.grammatical_range.feedback}
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-0 bg-white shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-3 text-base font-bold text-slate-900">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-md">
                      {getScoreIcon(overallFeedback.pronunciation.score)}
                    </div>
                    Pronunciation
                  </span>
                  <Badge
                    className={`${getBandColor(
                      overallFeedback.pronunciation.score
                    )} border-2 text-xs font-bold px-3 py-1 shadow-sm`}
                  >
                    Band {overallFeedback.pronunciation.score}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <p className="text-sm text-slate-600 leading-relaxed">
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
              <Card className="rounded-3xl border border-slate-200/80 bg-white overflow-hidden">
                <CardHeader className="pb-4 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 border-b border-slate-100">
                  <CardTitle className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-white shadow-sm border border-blue-100">
                      <Volume2 className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">Pronunciation Deep Dive</h3>
                      <p className="text-sm text-slate-500 font-normal">AI-powered analysis of your speech patterns</p>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-8">

                  {/* Visual Breakdown */}
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <TrendingUp className="w-4 h-4 text-blue-500" />
                        Intonation
                      </div>
                      <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${Math.max(20, 100 - (overallFeedback.intonation_recommendations?.length || 0) * 15)}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-500">
                        {overallFeedback.intonation_recommendations?.length
                          ? `${overallFeedback.intonation_recommendations.length} areas to improve`
                          : "Good variation detected"}
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <Activity className="w-4 h-4 text-purple-500" />
                        Stress & Rhythm
                      </div>
                      <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-500 rounded-full"
                          style={{ width: `${Math.max(20, 100 - ((overallFeedback.stress_patterns_to_improve?.length || 0) + (overallFeedback.word_stress_issues?.length || 0)) * 10)}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-500">
                        {(overallFeedback.stress_patterns_to_improve?.length || 0) + (overallFeedback.word_stress_issues?.length || 0) > 0
                          ? "Rhythm needs attention"
                          : "Natural rhythm detected"}
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <Mic className="w-4 h-4 text-emerald-500" />
                        Clarity
                      </div>
                      <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${Math.max(20, 100 - (overallFeedback.phonetic_focus_areas?.length || 0) * 10)}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-500">
                        {overallFeedback.phonetic_focus_areas?.length
                          ? `${overallFeedback.phonetic_focus_areas.length} sounds to practice`
                          : "Clear pronunciation"}
                      </p>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-6">
                    {overallFeedback.stress_patterns_to_improve?.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="font-medium text-sm text-slate-900 flex items-center gap-2">
                          <div className="p-1.5 rounded-md bg-blue-100 text-blue-600">
                            <Activity className="w-3.5 h-3.5" />
                          </div>
                          Stress Patterns
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {overallFeedback.stress_patterns_to_improve.map((pattern, index) => (
                            <div key={index} className="text-xs text-slate-700 bg-white border border-slate-200 shadow-sm rounded-lg px-3 py-1.5 font-mono">
                              {pattern}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {overallFeedback.intonation_recommendations?.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="font-medium text-sm text-slate-900 flex items-center gap-2">
                          <div className="p-1.5 rounded-md bg-purple-100 text-purple-600">
                            <TrendingUp className="w-3.5 h-3.5" />
                          </div>
                          Intonation Tips
                        </h4>
                        <div className="space-y-2">
                          {overallFeedback.intonation_recommendations.map((rec, index) => (
                            <div key={index} className="text-xs text-slate-600 bg-purple-50/50 border border-purple-100 rounded-lg px-3 py-2 flex items-start gap-2">
                              <span className="mt-0.5 block w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0" />
                              {rec}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {overallFeedback.phonetic_focus_areas?.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="font-medium text-sm text-slate-900 flex items-center gap-2">
                          <div className="p-1.5 rounded-md bg-emerald-100 text-emerald-600">
                            <Mic className="w-3.5 h-3.5" />
                          </div>
                          Target Sounds
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {overallFeedback.phonetic_focus_areas.map((sound, index) => (
                            <div key={index} className="text-xs text-slate-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-1.5 font-mono font-medium">
                              /{sound}/
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {overallFeedback.word_stress_issues?.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="font-medium text-sm text-slate-900 flex items-center gap-2">
                          <div className="p-1.5 rounded-md bg-orange-100 text-orange-600">
                            <AlertCircle className="w-3.5 h-3.5" />
                          </div>
                          Word Stress Fixes
                        </h4>
                        <div className="space-y-2">
                          {overallFeedback.word_stress_issues.map((issue, index) => (
                            <div key={index} className="text-xs text-slate-600 bg-orange-50/50 border border-orange-100 rounded-lg px-3 py-2">
                              {issue}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
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

