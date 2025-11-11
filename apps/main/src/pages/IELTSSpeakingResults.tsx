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
  part: string; // "Part 1", "Part 2", "Part 3"
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

  const { testData, recordings, audioBlobs } = (location.state as any) || {};

  useEffect(() => {
    if (!testData || !recordings || !audioBlobs) {
      navigate("/ielts-portal");
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    analyzeTestResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testData, recordings, audioBlobs]);

  const analyzeTestResults = async () => {
    setIsLoading(true);
    try {
      const recordingsWithDetails = recordings.map((recording: any) => {
        // Expect keys like "part1_q0", "part2_q0", etc.
        const match = recording.part.match(/^part(\d+)_q(\d+)/i);
        const partNumber = match ? parseInt(match[1], 10) : 0;
        const questionIndex = match ? parseInt(match[2], 10) : 0;

        let questionText = "";
        if (partNumber === 1 && testData.part1_prompts?.[questionIndex]) {
          questionText =
            testData.part1_prompts[questionIndex].prompt_text ||
            testData.part1_prompts[questionIndex].transcription ||
            testData.part1_prompts[questionIndex].title ||
            "";
        } else if (partNumber === 2 && testData.part2_prompt) {
          questionText =
            testData.part2_prompt.prompt_text ||
            testData.part2_prompt.transcription ||
            testData.part2_prompt.title ||
            "";
        } else if (partNumber === 3 && testData.part3_prompts?.[questionIndex]) {
          questionText =
            testData.part3_prompts[questionIndex].prompt_text ||
            testData.part3_prompts[questionIndex].transcription ||
            testData.part3_prompts[questionIndex].title ||
            "";
        }

        const audioKey = recording.part;
        const audioBlob = audioBlobs?.[audioKey];

        // If blob missing, still return a sane analysis entry without NaN
        if (!audioBlob || !match) {
          console.warn("Missing audio blob or invalid key for speaking result:", {
            key: recording.part,
            hasBlob: !!audioBlob,
          });
          return {
            part: partNumber ? `Part ${partNumber}` : "Part 1",
            partNumber: partNumber || 1,
            questionIndex: isNaN(questionIndex) ? 0 : questionIndex,
            questionText: questionText || "Question",
            transcription: "",
            audio_url: recording.audio_url,
            feedback: "",
          } as QuestionAnalysis;
        }

        const reader = new FileReader();
        return new Promise<QuestionAnalysis>((resolve) => {
          reader.onloadend = () => {
            resolve({
              part: `Part ${partNumber}`,
              partNumber,
              questionIndex,
              questionText: questionText || "Question",
              transcription: "",
              audio_url: recording.audio_url,
              feedback: "",
            });
          };
          reader.readAsDataURL(audioBlob);
        });
      });

      const baseAnalyses = await Promise.all(recordingsWithDetails);

      const { data: result, error } = await supabase.functions.invoke(
        "enhanced-speech-analysis",
        {
          body: {
            allRecordings: baseAnalyses,
            testData,
            analysisType: "comprehensive",
          },
        }
      );

      if (error) throw error;

      if (result?.individualAnalyses?.length) {
        // Trust edge function structure for per-question analyses
        setQuestionAnalyses(result.individualAnalyses as QuestionAnalysis[]);
      } else {
        console.warn("⚠️ No individual analyses received");
      }

      if (result?.analysis) {
        const overallData = parseOverallAnalysis(result.analysis as string);
        setOverallFeedback(overallData);
      } else {
        console.warn("⚠️ No overall analysis received");
      }

      if (result?.individualAnalyses?.length) {
        const suggestions: Record<string, AISuggestion> = {};
        for (const a of result.individualAnalyses) {
          const key = `${a.part}_${a.questionIndex}`;
          if (a.original_spans && a.suggested_spans) {
            suggestions[key] = {
              original_spans: a.original_spans,
              suggested_spans: a.suggested_spans,
            };
          }
        }
        setAiSuggestions(suggestions);
      }
    } catch (err) {
      console.error("Error analyzing test results:", err);
      toast({
        title: "Analysis Error",
        description: "Failed to analyze your test results. Please try again.",
        variant: "destructive",
      });

      // Safe fallback so UI still renders
      setOverallFeedback({
        overall_band_score: 1.0,
        fluency_coherence: {
          score: 1,
          feedback:
            "Unable to assess due to technical issues. Please retake the test to receive proper evaluation.",
        },
        lexical_resource: {
          score: 1,
          feedback:
            "Unable to assess due to technical issues. Please retake the test to receive proper evaluation.",
        },
        grammatical_range: {
          score: 1,
          feedback:
            "Unable to assess due to technical issues. Please retake the test to receive proper evaluation.",
        },
        pronunciation: {
          score: 1,
          feedback:
            "Unable to assess due to technical issues. Please retake the test to receive proper evaluation.",
        },
        path_to_higher_score: [
          "Technical error occurred during analysis. Please retake the test for accurate assessment.",
          "Ensure you speak clearly and provide substantial responses to each question.",
          "Practice speaking for the full allocated time with relevant content.",
        ],
      });
    } finally {
      setIsLoading(false);
    }
  };

  const roundToIELTSBandScore = (score: number): number => {
    if (score < 0) return 0;
    if (score > 9) return 9;
    const decimal = score - Math.floor(score);
    if (decimal === 0 || decimal === 0.5) return score;
    if (decimal === 0.25) return Math.floor(score) + 0.5;
    if (decimal === 0.75) return Math.ceil(score);
    return Math.round(score * 2) / 2;
  };

  const parseOverallAnalysis = (analysisText: string): OverallFeedback => {
    const cleanText = analysisText.replace(/\*\*/g, "");

    const fluencyMatch = cleanText.match(
      /FLUENCY & COHERENCE:\s*(\d(?:\.\d)?)\s*-\s*([^A-Z]*)/
    );
    const lexicalMatch = cleanText.match(
      /LEXICAL RESOURCE:\s*(\d(?:\.\d)?)\s*-\s*([^A-Z]*)/
    );
    const grammarMatch = cleanText.match(
      /GRAMMATICAL RANGE & ACCURACY:\s*(\d(?:\.\d)?)\s*-\s*([^A-Z]*)/
    );
    const pronunciationMatch = cleanText.match(
      /PRONUNCIATION:\s*(\d(?:\.\d)?)\s*-\s*([^A-Z]*)/
    );
    const overallMatch = cleanText.match(
      /OVERALL BAND SCORE:\s*(\d(?:\.\d)?)/
    );
    const feedbackMatch = cleanText.match(
      /COMPREHENSIVE FEEDBACK:\s*([^E]+?)(?=ENHANCED|$)/
    );

    // Extract enhanced analysis fields
    const stressPatternsMatch = cleanText.match(
      /STRESS PATTERNS TO IMPROVE:\s*([^\n]*(?:\n(?!\w+:\s*)[^\n]*)*)/
    );
    const intonationMatch = cleanText.match(
      /INTONATION RECOMMENDATIONS:\s*([^\n]*(?:\n(?!\w+:\s*)[^\n]*)*)/
    );
    const phoneticMatch = cleanText.match(
      /PHONETIC FOCUS AREAS:\s*([^\n]*(?:\n(?!\w+:\s*)[^\n]*)*)/
    );
    const wordStressMatch = cleanText.match(
      /WORD STRESS ISSUES:\s*([^\n]*(?:\n(?!\w+:\s*)[^\n]*)*)/
    );

    const defaultScore = 1;
    const defaultFeedback =
      "Unable to properly assess. Please retake the test with substantive responses.";

    const fluencyScore = roundToIELTSBandScore(
      fluencyMatch ? parseFloat(fluencyMatch[1]) : defaultScore
    );
    const lexicalScore = roundToIELTSBandScore(
      lexicalMatch ? parseFloat(lexicalMatch[1]) : defaultScore
    );
    const grammarScore = roundToIELTSBandScore(
      grammarMatch ? parseFloat(grammarMatch[1]) : defaultScore
    );
    const pronunciationScore = roundToIELTSBandScore(
      pronunciationMatch ? parseFloat(pronunciationMatch[1]) : defaultScore
    );

    const averageScore =
      (fluencyScore + lexicalScore + grammarScore + pronunciationScore) / 4;
    const overallBandScore = roundToIELTSBandScore(averageScore);

    // Helper function to parse enhanced analysis fields
    const parseEnhancedField = (match: RegExpMatchArray | null): string[] => {
      if (!match) return [];
      return match[1]
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0 && !line.match(/^\w+:\s*$/))
        .slice(0, 5); // Limit to 5 items
    };

    return {
      overall_band_score: overallBandScore,
      fluency_coherence: {
        score: fluencyScore,
        feedback: fluencyMatch ? fluencyMatch[2].trim() : defaultFeedback,
      },
      lexical_resource: {
        score: lexicalScore,
        feedback: lexicalMatch ? lexicalMatch[2].trim() : defaultFeedback,
      },
      grammatical_range: {
        score: grammarScore,
        feedback: grammarMatch ? grammarMatch[2].trim() : defaultFeedback,
      },
      pronunciation: {
        score: pronunciationScore,
        feedback: pronunciationMatch
          ? pronunciationMatch[2].trim()
          : defaultFeedback,
      },
      path_to_higher_score: feedbackMatch
        ? feedbackMatch[1]
            .trim()
            .split(/\d+\.|\n-|\n•/)
            .filter((tip) => tip.trim().length > 0)
            .map((tip) => tip.trim())
            .slice(0, 4)
        : [
            "Provide substantive responses to all questions instead of silence or minimal words.",
            "Practice speaking for the full allocated time with relevant content.",
            "Work on developing complete thoughts and explanations for each question.",
          ],
      stress_patterns_to_improve: parseEnhancedField(stressPatternsMatch),
      intonation_recommendations: parseEnhancedField(intonationMatch),
      phonetic_focus_areas: parseEnhancedField(phoneticMatch),
      word_stress_issues: parseEnhancedField(wordStressMatch),
    };
  };

  const playAudio = async (audioUrl: string, questionId: string) => {
    if (playingAudio === questionId) {
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
          variant: "destructive",
        });
      };

      await audio.play();
    } catch (error) {
      console.error("Error playing audio:", error);
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
              {testData?.test_name || "IELTS Speaking Practice Test"}
            </h1>
            <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto">
              AI examiner-style evaluation aligned with IELTS band descriptors
              for Fluency & Coherence, Lexical Resource, Grammatical Range
              & Accuracy, and Pronunciation.
            </p>
          </div>

          {/* Overall Band Score (static, no hover animation) */}
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

          {/* Criteria Scores (static cards, no hover/scale) */}
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
                .map((analysis, index) => (
                  <div
                    key={`p1-${index}`}
                    className="border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4 bg-white"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-base sm:text-lg font-semibold text-slate-900">
                        Question {analysis.questionIndex + 1}
                      </h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white text-slate-500 border border-slate-200">
                        IELTS Speaking Practice
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium text-[11px] text-blue-700 mb-1 uppercase tracking-wide">
                        Question
                      </h4>
                      <div className="p-3 sm:p-4 bg-white rounded-xl text-xs sm:text-sm border border-slate-200/80 text-slate-800 leading-relaxed">
                        {analysis.questionText || "Question text not available"}
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3 sm:p-4">
                      <h4 className="font-medium mb-2 flex items-center gap-2 text-xs text-slate-800">
                        <Volume2 className="w-3 h-3" />
                        Your recorded answer
                      </h4>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        <Button
                          onClick={() =>
                            playAudio(
                              analysis.audio_url,
                              `${analysis.part}_${analysis.questionIndex}`
                            )
                          }
                          variant={
                            playingAudio ===
                            `${analysis.part}_${analysis.questionIndex}`
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs"
                        >
                          {playingAudio ===
                          `${analysis.part}_${analysis.questionIndex}` ? (
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
                      </div>
                    </div>
                    {(() => {
                      const key = `${analysis.part}_${analysis.questionIndex}`;
                      const suggestion = aiSuggestions[key];
                      if (
                        suggestion &&
                        suggestion.original_spans &&
                        suggestion.suggested_spans
                      ) {
                        return (
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
                        );
                      }
                      return null;
                    })()}
                    <div>
                      <h4 className="font-medium text-xs sm:text-sm text-blue-900 mb-2 flex items-center gap-2">
                        <Sparkles className="w-3 h-3 text-blue-600" />
                        Feedback for your response
                      </h4>
                      <div className="rounded-xl p-4 bg-white border border-slate-200/80">
                        <p className="text-xs sm:text-sm leading-relaxed text-slate-800 whitespace-pre-wrap">
                          {analysis.feedback
                            ? analysis.feedback
                                .replace(/\*\*/g, "")
                                .replace(/###/g, "")
                                .replace(/\*/g, "")
                            : "Feedback analysis in progress..."}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
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
                .map((analysis, index) => (
                  <div
                    key={`p2-${index}`}
                    className="border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4 bg-white"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-base sm:text-lg font-semibold text-slate-900">
                        Cue Card Response
                      </h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white text-slate-500 border border-slate-200">
                        IELTS Speaking Practice
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium text-[11px] text-blue-700 mb-1 uppercase tracking-wide">
                        Cue card
                      </h4>
                      <div className="p-3 sm:p-4 bg-white rounded-xl text-xs sm:text-sm border border-slate-200/80 text-slate-800 leading-relaxed">
                        {analysis.questionText || "Question text not available"}
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3 sm:p-4">
                      <h4 className="font-medium mb-2 flex items-center gap-2 text-xs text-slate-800">
                        <Volume2 className="w-3 h-3" />
                        Your recorded answer
                      </h4>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        <Button
                          onClick={() =>
                            playAudio(
                              analysis.audio_url,
                              `${analysis.part}_${analysis.questionIndex}`
                            )
                          }
                          variant={
                            playingAudio ===
                            `${analysis.part}_${analysis.questionIndex}`
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs"
                        >
                          {playingAudio ===
                          `${analysis.part}_${analysis.questionIndex}` ? (
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
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-xs sm:text-sm text-blue-900 mb-2 flex items-center gap-2">
                        <Sparkles className="w-3 h-3 text-blue-600" />
                        Feedback for your response
                      </h4>
                      <div className="rounded-xl p-4 bg-white border border-slate-200/80">
                        <p className="text-xs sm:text-sm leading-relaxed text-slate-800 whitespace-pre-wrap">
                          {analysis.feedback
                            ? analysis.feedback
                                .replace(/\*\*/g, "")
                                .replace(/###/g, "")
                                .replace(/\*/g, "")
                            : "Feedback analysis in progress..."}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
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
                .map((analysis, index) => (
                  <div
                    key={`p3-${index}`}
                    className="border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4 bg-white"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-base sm:text-lg font-semibold text-slate-900">
                        Question {analysis.questionIndex + 1}
                      </h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white text-slate-500 border border-slate-200">
                        IELTS Speaking Practice
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium text-[11px] text-blue-700 mb-1 uppercase tracking-wide">
                        Question
                      </h4>
                      <div className="p-3 sm:p-4 bg-white rounded-xl text-xs sm:text-sm border border-slate-200/80 text-slate-800 leading-relaxed">
                        {analysis.questionText || "Question text not available"}
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3 sm:p-4">
                      <h4 className="font-medium mb-2 flex items-center gap-2 text-xs text-slate-800">
                        <Volume2 className="w-3 h-3" />
                        Your recorded answer
                      </h4>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        <Button
                          onClick={() =>
                            playAudio(
                              analysis.audio_url,
                              `${analysis.part}_${analysis.questionIndex}`
                            )
                          }
                          variant={
                            playingAudio ===
                            `${analysis.part}_${analysis.questionIndex}`
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs"
                        >
                          {playingAudio ===
                          `${analysis.part}_${analysis.questionIndex}` ? (
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
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-xs sm:text-sm text-blue-900 mb-2 flex items-center gap-2">
                        <Sparkles className="w-3 h-3 text-blue-600" />
                        Feedback for your response
                      </h4>
                      <div className="rounded-xl p-4 bg-white border border-slate-200/80">
                        <p className="text-xs sm:text-sm leading-relaxed text-slate-800 whitespace-pre-wrap">
                          {analysis.feedback
                            ? analysis.feedback
                                .replace(/\*\*/g, "")
                                .replace(/###/g, "")
                                .replace(/\*/g, "")
                            : "Feedback analysis in progress..."}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* Path to higher score */}
          {/* Path to higher score (static) */}
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
                      {tip
                        .replace(/\*\*/g, "")
                        .replace(/###/g, "")
                        .replace(/\*/g, "")}
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