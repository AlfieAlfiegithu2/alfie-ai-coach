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
  const [analysisCompleted, setAnalysisCompleted] = useState(false);

  const { testData, recordings, audioBlobs } = (location.state as any) || {};

  // NEW: allow both in-memory state (ideal) and direct-load via test_result_id in URL
  const searchParams = new URLSearchParams(location.search);
  const testResultIdFromUrl = searchParams.get("test_result_id") || searchParams.get("id");
  const testResultId = (location.state as any)?.testResultId || (location.state as any)?.test_result_id || testResultIdFromUrl || null;

  useEffect(() => {
    // Prevent multiple analysis calls
    if (analysisCompleted) return;

    // If we have full state from IELTSSpeakingTest, use it (existing behavior)
    if (testData && Array.isArray(recordings) && audioBlobs) {
      setAnalysisCompleted(true);
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      analyzeTestResults(recordings, testData, audioBlobs);
      return;
    }

    // Fallback: if we at least have a testResultId (via state or URL), try load from Supabase
    if (testResultId) {
      setAnalysisCompleted(true);
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      analyzeFromSupabase(testResultId);
      return;
    }

    // If nothing available, redirect as before
    navigate("/ielts-portal");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testData, recordings, audioBlobs, testResultId, analysisCompleted]);

  // Helper functions for analysis
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
      /FLUENCY & COHERENCE:\s*\[?(\d(?:\.\d)?)\]?\s*-\s*([^A-Z]*)/
    );
    const lexicalMatch = cleanText.match(
      /LEXICAL RESOURCE:\s*\[?(\d(?:\.\d)?)\]?\s*-\s*([^A-Z]*)/
    );
    const grammarMatch = cleanText.match(
      /GRAMMATICAL RANGE & ACCURACY:\s*\[?(\d(?:\.\d)?)\]?\s*-\s*([^A-Z]*)/
    );
    const pronunciationMatch = cleanText.match(
      /PRONUNCIATION:\s*\[?(\d(?:\.\d)?)\]?\s*-\s*([^A-Z]*)/
    );
    const overallMatch = cleanText.match(
      /OVERALL BAND SCORE:\s*\[?(\d(?:\.\d)?)\]?/
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

  // NEW: fallback loader using stored speaking_test_results
  const analyzeFromSupabase = async (id: string) => {
    try {
      setIsLoading(true);
      console.log("[IELTSSpeakingResults] Fallback load for test_result_id:", id);

      const { data: testResult, error: trError } = await supabase
        .from("test_results")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (trError) {
        console.error("[IELTSSpeakingResults] Error loading test_results:", trError);
      }

      const { data: speakingRows, error: srError } = await supabase
        .from("speaking_test_results")
        .select("*")
        .eq("test_result_id", id)
        .order("part_number", { ascending: true });

      if (srError) {
        console.error("[IELTSSpeakingResults] Error loading speaking_test_results:", srError);
      }

      const safeRows = Array.isArray(speakingRows) ? speakingRows : [];
      if (!safeRows.length) {
        console.warn("[IELTSSpeakingResults] No speaking_test_results for test_result_id:", id);
        setIsLoading(false);
        return;
      }

      // Reconstruct a minimal recordings array compatible with analyzer
      const reconstructed = safeRows.map((row, idx) => {
        const partNumber = row.part_number || 1;
        const questionIndex = 0;
        const partKey = `part${partNumber}_q${questionIndex}`;
        return {
          part: partKey,
          partNumber,
          questionIndex,
          questionText: row.question_text || "",
          audio_url: row.audio_url || "",
        };
      });

      const effectiveTestData =
        ((testResult?.test_data as any)?.testData || (testResult?.test_data as any)) || {};

      await analyzeTestResults(reconstructed, effectiveTestData, {});
    } catch (error) {
      console.error("[IELTSSpeakingResults] analyzeFromSupabase error:", error);
      setIsLoading(false);
    }
  };

  const analyzeTestResults = async (
    incomingRecordings: any[],
    incomingTestData: any,
    incomingAudioBlobs: Record<string, Blob>
  ) => {
    setIsLoading(true);
    try {
      console.log('🔍 analyzeTestResults called with:', {
        recordingsCount: incomingRecordings?.length || 0,
        testDataKeys: incomingTestData ? Object.keys(incomingTestData) : [],
        hasPart1Prompts: !!incomingTestData?.part1_prompts,
        part1PromptsCount: incomingTestData?.part1_prompts?.length || 0,
        hasPart2Prompt: !!incomingTestData?.part2_prompt,
        hasPart3Prompts: !!incomingTestData?.part3_prompts,
        part3PromptsCount: incomingTestData?.part3_prompts?.length || 0,
        audioBlobsKeys: incomingAudioBlobs ? Object.keys(incomingAudioBlobs) : []
      });

      if (!Array.isArray(incomingRecordings) || incomingRecordings.length === 0) {
        throw new Error("No recordings provided to analysis page");
      }

      // Helper function to convert blob to base64
      const blobToBase64 = (blob: Blob): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = reader.result as string;
            // Remove data URL prefix if present
            const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
            resolve(base64Data);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      };

      // Helper function to fetch audio from URL and convert to base64.
      // IMPORTANT: This is OPTIONAL - the edge function will fetch audio server-side if this fails.
      // R2 CORS issue: Browser fetch() may be blocked, but edge function can fetch server-side.
      // This is a best-effort optimization to avoid extra server-side fetches when possible.
      const fetchAudioAsBase64 = async (url: string): Promise<string | null> => {
        try {
          console.log(`🔄 Attempting to fetch audio for AI analysis (optional optimization): ${url}`);
          const response = await fetch(url, {
            method: 'GET',
            mode: 'cors', // Explicitly request CORS mode
            headers: {
              'Accept': 'audio/*',
              'Cache-Control': 'no-cache'
            },
            // Add timeout to prevent hanging
            signal: AbortSignal.timeout(5000) // 5 second timeout
          });

          if (!response.ok) {
            throw new Error(`Failed to fetch audio: ${response.status} ${response.statusText}`);
          }

          const blob = await response.blob();
          console.log(`📦 Successfully fetched audio blob, size: ${blob.size} bytes`);
          return await blobToBase64(blob);
        } catch (error) {
          console.log(`ℹ️ Browser fetch failed (expected due to CORS) - edge function will fetch audio server-side instead: ${url}`);
          // Returning null is fine - the edge function will fetch from audio_url server-side
          return null;
        }
      };

      const recordingsWithDetails = await Promise.all(incomingRecordings.map(async (recording: any) => {
        // Robustly parse keys like "part1_q0", "part2_q0", etc.
        const match = typeof recording.part === "string"
          ? recording.part.match(/^part(\d+)_q(\d+)$/i)
          : null;

        const partNumber = match ? parseInt(match[1], 10) : 0;
        const questionIndex = match ? parseInt(match[2], 10) : 0;

        // Derive question text safely so we never end up with "Part NaN / Question NaN"
        // Priority: Use question_text from recording (saved during test) > admin prompt > fallback
        // This ensures we show the exact question the student saw, not admin metadata
        let questionText = recording.question_text || recording.questionText || "";
        
        // If no question_text from recording, fall back to admin prompt
        if (!questionText || questionText === "Audio prompt") {
          if (partNumber === 1 && incomingTestData?.part1_prompts?.[questionIndex]) {
            const p = incomingTestData.part1_prompts[questionIndex];
            questionText =
              p.prompt_text ||
              p.transcription ||
              p.title ||
              "";
            // Skip if it's just "Audio prompt" placeholder
            if (questionText === "Audio prompt") {
              questionText = p.title || `Part 1 Question ${questionIndex + 1}`;
            }
            console.log(
              `📝 Part 1 Q${questionIndex} text from admin prompt: "${questionText}"`,
              p
            );
          } else if (partNumber === 2 && incomingTestData?.part2_prompt) {
            const p = incomingTestData.part2_prompt;
            questionText =
              p.prompt_text ||
              p.transcription ||
              p.title ||
              "";
            if (questionText === "Audio prompt") {
              questionText = p.title || "Part 2 Cue Card";
            }
            console.log(
              `📝 Part 2 cue card text from admin prompt: "${questionText}"`,
              p
            );
          } else if (partNumber === 3 && incomingTestData?.part3_prompts?.[questionIndex]) {
            const p = incomingTestData.part3_prompts[questionIndex];
            questionText =
              p.prompt_text ||
              p.transcription ||
              p.title ||
              "";
            if (questionText === "Audio prompt") {
              questionText = p.title || `Part 3 Question ${questionIndex + 1}`;
            }
            console.log(
              `📝 Part 3 Q${questionIndex} text from admin prompt: "${questionText}"`,
              p
            );
          }
        } else {
          console.log(
            `📝 Using saved question_text from test submission: "${questionText}"`
          );
        }

        // Fallback text for malformed keys or missing mapping
        if (!questionText) {
          console.log(`⚠️ No question text found for ${recording.part}, using fallback`);
          if (partNumber === 1) questionText = "Part 1 question";
          else if (partNumber === 2) questionText = "Part 2 question";
          else if (partNumber === 3) questionText = "Part 3 question";
          else questionText = "Question";
        }

        const audioKey = recording.part;
        const audioBlob = audioBlobs?.[audioKey];
        
        // Convert audio to base64 (best-effort). If unavailable, we still keep audio_url.
        let audioBase64: string | undefined = undefined;
        let hasAudioData = false;
        if (recording.audio_url && recording.audio_url.startsWith("https://")) {
          console.log(`📥 Fetching audio from R2 URL for ${audioKey}: ${recording.audio_url}`);
          const fetchedBase64 = await fetchAudioAsBase64(recording.audio_url);
          if (fetchedBase64) {
            audioBase64 = fetchedBase64;
            hasAudioData = true;
            console.log(`✅ Fetched and converted audio to base64 for ${audioKey}`);
          } else {
            console.log(`ℹ️ Browser fetch failed for ${audioKey} - edge function will fetch server-side from audio_url`);
          }
        } else if (audioBlob) {
          audioBase64 = await blobToBase64(audioBlob);
          hasAudioData = true;
          console.log(`✅ Converted audio blob to base64 for ${audioKey}`);
        } else {
          console.warn(`⚠️ No audio available for ${audioKey} (no URL or blob)`);
        }

        // Always return a well-formed QuestionAnalysis, even if blob is missing or key malformed.
        // This prevents "Part NaN / Question NaN" issues.
        if (!match || !partNumber || isNaN(partNumber)) {
          console.warn("Invalid recording.part key format for speaking result:", {
            part: recording.part,
          });
          return {
            part: "Part 1",
            partNumber: 1,
            questionIndex: 0,
            questionText,
            transcription: "",
            audio_url: recording.audio_url,
            audio_base64: audioBase64,
            hasAudioData,
            partNum: 1,
            questionTranscription: questionText,
            feedback: "",
          };
        }

        return {
          part: `Part ${partNumber}`,
          partNumber,
          questionIndex: isNaN(questionIndex) ? 0 : questionIndex,
          questionText,
          transcription: "",
          audio_url: recording.audio_url,
          audio_base64: audioBase64,
          hasAudioData,
          partNum: partNumber,
          questionTranscription: questionText,
          feedback: "",
        };
      }));

      const baseAnalyses = recordingsWithDetails;

      // Filter out any obviously invalid entries before calling AI, to avoid NaN parts
      const sanitizedAnalyses = baseAnalyses.filter((a) => {
        if (!a) return false;
        if (!a.partNumber || isNaN(a.partNumber)) return false;
        if (typeof a.questionIndex !== "number" || isNaN(a.questionIndex)) return false;
        if (!a.audio_url && !a.hasAudioData) {
          console.warn(`⚠️ Skipping recording without any audio data: ${a.part} Q${a.questionIndex}`);
          return false;
        }
        return true;
      });

      if (!sanitizedAnalyses.length) {
        throw new Error("No valid recordings available for AI analysis");
      }

      console.log(`📊 Sending ${sanitizedAnalyses.length} recordings to enhanced-speech-analysis:`,
        sanitizedAnalyses.map(a => ({
          part: a.part,
          hasAudioData: a.hasAudioData,
          hasAudioBase64: !!a.audio_base64,
          audioBase64Type: typeof a.audio_base64,
          audioBase64Length: a.audio_base64?.length || 0,
          hasAudioUrl: !!a.audio_url
        }))
      );

      // IMPORTANT:
      // Supabase Edge Function "enhanced-speech-analysis" (supabase/functions/enhanced-speech-analysis/index.ts)
      // expects lightweight metadata (no mandatory audio_base64) and returns:
      // - success: boolean
      // - analysis: string (overall analysis text) OR structured fields
      // - overallBandScore?: number
      // - criteria?: { fluency, lexical, grammar, pronunciation }
      // - path_to_higher_score?: string[]
      // - individualAnalyses: per-question feedback array
      //
      // Some older/local implementations required audio_base64 and would break when R2 fetch failed.
      // To keep behaviour consistent and robust (especially when R2 URLs intermittently fail),
      // we:
      // 1) Send sanitizedAnalyses (metadata + any available audio_base64) but do NOT depend on audio_base64.
      // 2) Tolerate partial audio failures (net::ERR_CONNECTION_RESET etc.).
      // 3) Parse both the new structured response and the legacy text-only response.
      const { data: result, error } = await supabase.functions.invoke(
        "enhanced-speech-analysis",
        {
          body: {
            allRecordings: sanitizedAnalyses,
            testData: incomingTestData,
            analysisType: "comprehensive",
          },
        }
      );

      if (error) {
        console.error("❌ enhanced-speech-analysis error:", error);
        throw error;
      }

      if (!result) {
        console.warn("⚠️ No response from enhanced-speech-analysis");
        setIsLoading(false);
        return;
      }

      console.log("📊 Full result from enhanced-speech-analysis:", {
        hasSuccessFlag: typeof result?.success === "boolean",
        hasIndividualAnalyses: Array.isArray(result?.individualAnalyses),
        individualAnalysesCount: result?.individualAnalyses?.length || 0,
        hasAnalysis: !!result?.analysis,
        hasOverallBandScore: !!result?.overallBandScore,
        hasCriteria: !!result?.criteria,
        resultKeys: Object.keys(result || {})
      });

      // 1) Per-question analyses
      // 1) Per-question analyses (support new structured schema)
      const rawIndividualAnalyses: any[] = Array.isArray(result?.individualAnalyses)
        ? result.individualAnalyses
        : Array.isArray((result as any)?.per_question)
        ? (result as any).per_question
        : [];

      if (rawIndividualAnalyses.length) {
        console.log("📝 Processing individual analyses:", result.individualAnalyses.map((a: any) => ({
          part: a.part,
          partNumber: a.partNumber,
          questionIndex: a.questionIndex,
          hasFeedback: !!a.feedback,
          feedbackLength: a.feedback?.length || 0,
          hasTranscription: !!a.transcription
        })));

        const normalized: QuestionAnalysis[] = rawIndividualAnalyses.map((a: any, idx: number) => {
          const safePartNumber =
            typeof a.partNumber === "number"
              ? a.partNumber
              : typeof a.partNum === "number"
              ? a.partNum
              : parseInt(String(a.part || ""), 10) || sanitizedAnalyses[idx]?.partNumber || 1;

          const safeQuestionIndex =
            typeof a.questionIndex === "number" && !isNaN(a.questionIndex)
              ? a.questionIndex
              : typeof a.qIndex === "number"
              ? a.qIndex
              : sanitizedAnalyses[idx]?.questionIndex || 0;

          // Try multiple feedback field names and provide meaningful fallback
          let feedback = a.feedback || 
                          a.overall_feedback || 
                          (Array.isArray(a.feedback_bullets) ? a.feedback_bullets.join('\n') : '') ||
                          "";
          
          // If still empty, create feedback from available metrics
          if (!feedback && a.metrics) {
            const metrics = a.metrics;
            const scores = [];
            if (metrics.pronunciation_score) scores.push(`Pronunciation: ${metrics.pronunciation_score}/9`);
            if (metrics.fluency_score) scores.push(`Fluency: ${metrics.fluency_score}/9`);
            if (metrics.grammar_score) scores.push(`Grammar: ${metrics.grammar_score}/9`);
            if (metrics.vocabulary_score) scores.push(`Vocabulary: ${metrics.vocabulary_score}/9`);
            
            if (scores.length > 0) {
              feedback = `Performance scores: ${scores.join(', ')}. `;
              if (metrics.minimal) {
                feedback += "Your response was quite brief. Try to expand your answers with more detail and examples.";
              } else if (metrics.word_count) {
                feedback += `You provided ${metrics.word_count} words. Continue practicing to develop longer, more detailed responses.`;
              }
            }
          }
          
          // Final fallback if everything is empty
          if (!feedback) {
            if (a.transcription && a.transcription.trim() && !a.transcription.toLowerCase().includes('inaudible') && !a.transcription.toLowerCase().includes('no audio')) {
              feedback = `Your response: "${a.transcription.substring(0, 100)}${a.transcription.length > 100 ? '...' : ''}". Continue practicing to improve your speaking skills.`;
            } else {
              feedback = "Inaudible: No audio was recorded or the audio could not be understood. Please ensure your microphone is working properly and try recording again with clear speech.";
            }
          }

          return {
            part: `Part ${safePartNumber}`,
            partNumber: safePartNumber,
            questionIndex: safeQuestionIndex,
            questionText:
              sanitizedAnalyses[idx]?.questionText ||
              a.questionText ||
              a.question ||
              a.questionTranscription ||
              "Question",
            transcription: a.transcription || "",
            audio_url: a.audio_url || sanitizedAnalyses[idx]?.audio_url || "",
            feedback: feedback,
          };
        });

        console.log("✅ Normalized analyses:", normalized.map(a => ({
          part: a.part,
          questionIndex: a.questionIndex,
          feedbackLength: a.feedback?.length || 0
        })));

        setQuestionAnalyses(normalized);

        // Map AI suggestions by part/questionIndex
        const suggestions: Record<string, AISuggestion> = {};
        for (const a of normalized) {
          const src = rawIndividualAnalyses.find(
            (orig: any) =>
              (orig.partNumber === a.partNumber ||
                orig.partNum === a.partNumber ||
                String(orig.part || "").includes(String(a.partNumber))) &&
              (orig.questionIndex === a.questionIndex ||
                orig.qIndex === a.questionIndex)
          );
          if (src?.original_spans && src?.suggested_spans) {
            const key = `${a.part}_${a.questionIndex}`;
            suggestions[key] = {
              original_spans: src.original_spans,
              suggested_spans: src.suggested_spans,
            };
          }
        }
        setAiSuggestions(suggestions);
      } else {
        console.warn("⚠️ No individual analyses received from enhanced-speech-analysis");
      }

      // 2) Overall analysis (band scores etc.)
      // Helper to extract JSON from markdown code blocks
      const extractJsonFromMarkdown = (text: string): any | null => {
        try {
          // First, try to find JSON wrapped in ```json ... ``` or ``` ... ```
          const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
          if (codeBlockMatch && codeBlockMatch[1]) {
            const jsonText = codeBlockMatch[1].trim();
            // Try to find the JSON object within the code block
            const jsonObjMatch = jsonText.match(/\{[\s\S]*\}/);
            if (jsonObjMatch) {
              return JSON.parse(jsonObjMatch[0]);
            }
            // If no object found, try parsing the whole code block content
            return JSON.parse(jsonText);
          }
          
          // If no code blocks, try to find JSON object directly
          const directJsonMatch = text.match(/\{[\s\S]*\}/);
          if (directJsonMatch && directJsonMatch[0]) {
            return JSON.parse(directJsonMatch[0]);
          }
          
          return null;
        } catch (e) {
          console.warn("⚠️ Failed to extract JSON from markdown:", e);
          return null;
        }
      };

      if (typeof result?.analysis === "string" && result.analysis.trim().length > 0) {
        console.log("📊 Parsing overall analysis text:", result.analysis.substring(0, 200) + "...");
        
        // First, try to extract JSON from markdown code blocks
        const extractedJson = extractJsonFromMarkdown(result.analysis);
        console.log("🔍 Extracted JSON:", extractedJson ? Object.keys(extractedJson) : "null");
        
        // Check if JSON has 'overall' property or if it's at root level
        if (extractedJson) {
          const overall = extractedJson.overall || extractedJson;
          const hasOverallProperty = !!extractedJson.overall;
          
          if (overall && (overall.overallBandScore !== undefined || overall.criteria)) {
            console.log("✅ Found JSON in markdown code blocks, using structured format", {
              hasOverallProperty,
              overallBandScore: overall.overallBandScore,
              hasCriteria: !!overall.criteria,
              criteriaKeys: overall.criteria ? Object.keys(overall.criteria) : [],
              extractedJsonKeys: Object.keys(extractedJson)
            });
            const criteria = overall.criteria || {};
            
            const overallBand = typeof overall.overallBandScore === "number" ? overall.overallBandScore : 5;
            const pathToHigherScore = Array.isArray(overall.path_to_higher_score) ? overall.path_to_higher_score : [];
            
            // Extract score and feedback - handle both new format (object with score/feedback) and legacy format (just number)
            const getCriterionData = (key: string, defaultScore: number, defaultFeedback: string) => {
              const criterion = criteria[key];
              if (criterion && typeof criterion === "object" && criterion.score !== undefined) {
                // New format: { score: number, feedback: string }
                return {
                  score: roundToIELTSBandScore(typeof criterion.score === "number" ? criterion.score : defaultScore),
                  feedback: criterion.feedback || criterion.feedbackText || defaultFeedback
                };
              } else if (typeof criterion === "number") {
                // Legacy format: just a number
                return {
                  score: roundToIELTSBandScore(criterion),
                  feedback: criteria[`${key}Feedback`] || 
                           criteria[`${key}_feedback`] || 
                           criteria[`${key}FeedbackText`] ||
                           criteria[`${key}_feedback_text`] ||
                           defaultFeedback
                };
              } else {
                // Fallback
                return {
                  score: roundToIELTSBandScore(defaultScore),
                  feedback: defaultFeedback
                };
              }
            };
            
            const fluencyData = getCriterionData("fluency", 5, "Fluency feedback not provided.");
            const lexicalData = getCriterionData("lexical", 5, "Lexical feedback not provided.");
            const grammarData = getCriterionData("grammar", 5, "Grammar feedback not provided.");
            const pronunciationData = getCriterionData("pronunciation", 5, "Pronunciation feedback not provided.");
            
            setOverallFeedback({
              overall_band_score: roundToIELTSBandScore(overallBand),
              fluency_coherence: fluencyData,
              lexical_resource: lexicalData,
              grammatical_range: grammarData,
              pronunciation: pronunciationData,
              path_to_higher_score: pathToHigherScore.length > 0 ? pathToHigherScore : [
                "Speak for the full time and fully develop each answer.",
                "Use a wider range of topic-specific vocabulary.",
                "Reduce hesitations and self-corrections.",
              ],
              stress_patterns_to_improve: overall.stress_patterns_to_improve || [],
              intonation_recommendations: overall.intonation_recommendations || [],
              phonetic_focus_areas: overall.phonetic_focus_areas || [],
              word_stress_issues: overall.word_stress_issues || [],
            });
            console.log("✅ Set overall feedback with band score:", roundToIELTSBandScore(overallBand));
          }
        } else {
          // If JSON extraction failed or didn't have the right structure
          if (extractedJson) {
            console.warn("⚠️ Extracted JSON but missing required fields, falling back to text parsing");
          } else {
            console.log("ℹ️ No JSON found in markdown, using text parsing");
          }
          
          // Fall back to text parsing
          const overallData = parseOverallAnalysis(result.analysis as string);
          console.log("✅ Parsed overall feedback:", {
            overallBand: overallData.overall_band_score,
            hasFluencyFeedback: !!overallData.fluency_coherence.feedback,
            hasLexicalFeedback: !!overallData.lexical_resource.feedback
          });
          setOverallFeedback(overallData);
        }
      } else if (result?.overallBandScore || result?.criteria || (result as any)?.overall) {
        // 2) Overall analysis: support structured responses from the new Edge Function
        console.log("📊 Using structured overall response format");

        const overall = (result as any).overall || result;
        const criteria = overall.criteria || result.criteria || {};

        const overallBandRaw =
          typeof overall.overallBandScore === "number"
            ? overall.overallBandScore
            : typeof result.overallBandScore === "number"
            ? result.overallBandScore
            : undefined;

        const overallBand =
          typeof overallBandRaw === "number" ? overallBandRaw : 5;

        const pathToHigherScore =
          (overall.path_to_higher_score ||
            result.path_to_higher_score ||
            []) as string[];

        // Extract score and feedback - handle both new format (object with score/feedback) and legacy format (just number)
        const getCriterionData = (key: string, defaultScore: number, defaultFeedback: string) => {
          const criterion = criteria[key];
          if (criterion && typeof criterion === "object" && criterion.score !== undefined) {
            // New format: { score: number, feedback: string }
            return {
              score: roundToIELTSBandScore(typeof criterion.score === "number" ? criterion.score : defaultScore),
              feedback: criterion.feedback || criterion.feedbackText || defaultFeedback
            };
          } else if (typeof criterion === "number") {
            // Legacy format: just a number
            return {
              score: roundToIELTSBandScore(criterion),
              feedback: criteria[`${key}Feedback`] || 
                       criteria[`${key}_feedback`] || 
                       criteria[`${key}FeedbackText`] ||
                       criteria[`${key}_feedback_text`] ||
                       defaultFeedback
            };
          } else {
            // Fallback
            return {
              score: roundToIELTSBandScore(defaultScore),
              feedback: defaultFeedback
            };
          }
        };

        const fluencyData = getCriterionData("fluency", 5, "Fluency feedback not provided.");
        const lexicalData = getCriterionData("lexical", 5, "Lexical feedback not provided.");
        const grammarData = getCriterionData("grammar", 5, "Grammar feedback not provided.");
        const pronunciationData = getCriterionData("pronunciation", 5, "Pronunciation feedback not provided.");

        setOverallFeedback({
          overall_band_score: roundToIELTSBandScore(overallBand),
          fluency_coherence: fluencyData,
          lexical_resource: lexicalData,
          grammatical_range: grammarData,
          pronunciation: pronunciationData,
          path_to_higher_score:
            Array.isArray(pathToHigherScore) && pathToHigherScore.length > 0
              ? pathToHigherScore
              : [
                  "Speak for the full time and fully develop each answer.",
                  "Use a wider range of topic-specific vocabulary.",
                  "Reduce hesitations and self-corrections.",
                ],
          // The current structured Edge Function can be extended to return these;
          // keep arrays present so UI sections render cleanly if provided.
          stress_patterns_to_improve:
            overall.stress_patterns_to_improve || [],
          intonation_recommendations:
            overall.intonation_recommendations || [],
          phonetic_focus_areas: overall.phonetic_focus_areas || [],
          word_stress_issues: overall.word_stress_issues || [],
        });
      } else {
        console.warn("⚠️ No overall analysis received from enhanced-speech-analysis");
        console.warn("⚠️ Result structure:", JSON.stringify(result, null, 2).substring(0, 500));
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
                .sort((a, b) => a.questionIndex - b.questionIndex)
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
                        ) : (
                          <div className="text-xs text-slate-500 italic">
                            Audio recording not available
                          </div>
                        )}
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
                        ) : (
                          <div className="text-xs text-slate-500 italic">
                            Audio recording not available
                          </div>
                        )}
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

          {/* Part 3 */}
          {questionAnalyses.some((a) => a.part === "Part 3") && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">
                Part 3 – Discussion
              </h2>
              {questionAnalyses
                .filter((a) => a.part === "Part 3")
                .sort((a, b) => a.questionIndex - b.questionIndex)
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
                        ) : (
                          <div className="text-xs text-slate-500 italic">
                            Audio recording not available
                          </div>
                        )}
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