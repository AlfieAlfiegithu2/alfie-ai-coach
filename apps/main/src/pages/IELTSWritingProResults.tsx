import { useEffect, useState, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import LightRays from "@/components/animations/LightRays";
import { ArrowLeft, CheckCircle, Target, Edit3, Palette } from "lucide-react";
import PenguinClapAnimation from "@/components/animations/PenguinClapAnimation";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useThemeStyles } from "@/hooks/useThemeStyles";
import { themes, ThemeName } from "@/lib/themes";
import ScoreSpiderChart from "@/components/ScoreSpiderChart";
import WritingComparisonView from "@/components/WritingComparisonView";

interface Criterion {
  band: number;
  justification?: string;
}

interface ImprovementExample {
  issue: string;
  sentence_quote: string;
  improved_version: string;
  explanation?: string;
}

interface TaskFeedback {
  strengths?: string[];
  improvements?: (string | {
    issue?: string;
    original?: string;
    sentence_quote?: string;
    improved?: string;
    improved_version?: string;
    explanation?: string;
  })[];
  improvements_detailed?: ImprovementExample[];
}

interface TaskAssessment {
  criteria: {
    task_achievement?: Criterion;
    task_response?: Criterion;
    coherence_and_cohesion?: Criterion;
    lexical_resource?: Criterion;
    grammatical_range_and_accuracy?: Criterion;
  };
  overall_band?: number;
  overall_reason?: string;
  feedback?: TaskFeedback;
  feedback_markdown?: string;
  original_spans?: Array<{
    text: string;
    status: "error" | "neutral";
  }>;
  corrected_spans?: Array<{
    text: string;
    status: "improvement" | "neutral";
  }>;
  sentence_comparisons?: Array<{
    original_spans?: Array<{
      text: string;
      status: "error" | "neutral";
    }>;
    corrected_spans?: Array<{
      text: string;
      status: "improvement" | "neutral";
    }>;
    original?: string;
    improved?: string;
    issue?: string;
    explanation?: string;
  }>;
}

interface StructuredResult {
  task1?: TaskAssessment;
  task2?: TaskAssessment;
  overall?: {
    band?: number;
    calculation?: string;
    feedback_markdown?: string;
  };
  full_report_markdown?: string;
}

// Theme selection for IELTS writing results
const getThemeOptions = () => [
  { value: "note", label: "Note", description: "Warm paper-like appearance" }
];

// IELTS rounding helpers
const roundIELTS = (n: number): number => {
  if (typeof n !== 'number' || Number.isNaN(n)) return NaN as unknown as number;
  // Round to nearest 0.5; .25 and .75 round up naturally
  return Math.min(9, Math.max(0, Math.round(n * 2) / 2));
};

const computeTaskOverall = (task?: TaskAssessment, type?: 'task1' | 'task2'): number => {
  if (!task) return NaN as unknown as number;
  const c = task.criteria || {};
  const vals: number[] = [];
  if (type === 'task1') {
    if (typeof c.task_achievement?.band === 'number') vals.push(c.task_achievement.band);
  } else {
    if (typeof c.task_response?.band === 'number') vals.push(c.task_response.band);
  }
  if (typeof c.coherence_and_cohesion?.band === 'number') vals.push(c.coherence_and_cohesion.band);
  if (typeof c.lexical_resource?.band === 'number') vals.push(c.lexical_resource.band);
  if (typeof c.grammatical_range_and_accuracy?.band === 'number') vals.push(c.grammatical_range_and_accuracy.band);
  if (vals.length === 0) return typeof task.overall_band === 'number' ? roundIELTS(task.overall_band) : NaN as unknown as number;
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  return roundIELTS(avg);
};

export default function IELTSWritingProResults() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const themeStyles = useThemeStyles();

  const [loading, setLoading] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<string>("note");
  const [resultsData, setResultsData] = useState<{
    structured?: StructuredResult;
    testName?: string;
    task1Data?: any;
    task2Data?: any;
    task1Answer?: string;
    task2Answer?: string;
    task1Skipped?: boolean;
    task2Skipped?: boolean;
  }>({});
  const hasGeneratedRef = useRef<string | null>(null); // Track submissionId that has been processed

  // Try to get data from location state first, then fallback to database
  useEffect(() => {
    const stateData = location.state as any;
    
    // Reset generation flag when submission changes
    const submissionId = stateData?.submissionId;
    if (submissionId && hasGeneratedRef.current !== submissionId) {
      hasGeneratedRef.current = null; // Reset when new submission loads
    }
    
    if (stateData && stateData.structured) {
      // Use data from navigation state
      setResultsData(stateData);
    } else if (stateData?.submissionId && user) {
      // Fetch from database using submission ID
      fetchResultsFromDatabase(stateData.submissionId);
    } else {
      // No valid data source
      setResultsData({});
    }
  }, [location.state, user]);

  const fetchResultsFromDatabase = async (submissionId: string) => {
    setLoading(true);
    try {
      console.log('🔍 Fetching results from database for submission:', submissionId);
      
      // Get test result
      const { data: testResult, error: testError } = await supabase
        .from('test_results')
        .select('*')
        .eq('id', submissionId)
        .eq('user_id', user?.id)
        .single();

      if (testError) {
        console.error('❌ Error fetching test result:', testError);
        throw testError;
      }

      console.log('✅ Test result fetched:', testResult);

      // Get writing results
      const { data: writingResults, error: writingError } = await supabase
        .from('writing_test_results')
        .select('*')
        .eq('test_result_id', submissionId)
        .eq('user_id', user?.id)
        .order('task_number');

      if (writingError) {
        console.error('❌ Error fetching writing results:', writingError);
        throw writingError;
      }

      console.log('✅ Writing results fetched:', writingResults);

      if (!writingResults || writingResults.length < 2) {
        console.warn('⚠️ Incomplete writing results found:', writingResults?.length || 0);
        throw new Error('Incomplete test results found');
      }

      const task1Result = writingResults.find(r => r.task_number === 1);
      const task2Result = writingResults.find(r => r.task_number === 2);

      // Helper to extract band score from criteria or provide fallback
      const extractBandFromCriteria = (bandScores: any): number => {
        if (!bandScores || typeof bandScores !== 'object') return 6.5;
        
        // Try to get band values from criteria
        const criteriaValues = [];
        for (const [key, value] of Object.entries(bandScores)) {
          if (value && typeof value === 'object' && 'band' in value) {
            const band = (value as any).band;
            if (typeof band === 'number' && band >= 0 && band <= 9) {
              criteriaValues.push(band);
            }
          }
        }
        
        if (criteriaValues.length > 0) {
          return Math.round((criteriaValues.reduce((a, b) => a + b, 0) / criteriaValues.length) * 2) / 2;
        }
        
        return 6.5; // Fallback
      };

      // Validate and enrich criteria data
      const enrichCriteria = (bandScores: any, taskType: 'task1' | 'task2') => {
        const incompleteJustification = "Original analysis incomplete - criterion score not provided in assessment";
        const fallbackCriteria = taskType === 'task1' ? {
          task_achievement: { band: 0, justification: incompleteJustification },
          coherence_and_cohesion: { band: 0, justification: incompleteJustification },
          lexical_resource: { band: 0, justification: incompleteJustification },
          grammatical_range_and_accuracy: { band: 0, justification: incompleteJustification }
        } : {
          task_response: { band: 0, justification: incompleteJustification },
          coherence_and_cohesion: { band: 0, justification: incompleteJustification },
          lexical_resource: { band: 0, justification: incompleteJustification },
          grammatical_range_and_accuracy: { band: 0, justification: incompleteJustification }
        };

        if (!bandScores || typeof bandScores !== 'object') {
          console.warn(`⚠️ Missing or invalid criteria for ${taskType} - analysis incomplete`);
          return fallbackCriteria;
        }

        // Only use existing data - don't fill missing criteria with fallbacks
        const enriched: any = {};
        for (const [key, value] of Object.entries(bandScores)) {
          if (value && typeof value === 'object' && 'band' in value) {
            enriched[key] = value;
          }
        }

        // If any criteria are missing, mark them as incomplete
        const requiredKeys = taskType === 'task1' 
          ? ['task_achievement', 'coherence_and_cohesion', 'lexical_resource', 'grammatical_range_and_accuracy']
          : ['task_response', 'coherence_and_cohesion', 'lexical_resource', 'grammatical_range_and_accuracy'];
        
        for (const key of requiredKeys) {
          if (!enriched[key]) {
            enriched[key] = { band: 0, justification: incompleteJustification };
          }
        }

        return enriched;
      };

      // Get overall band from test_data if available
      const testData = testResult.test_data as any;
      const savedOverallBand = testData?.overall_band || 
                              (testResult as any).overall_score || 
                              extractBandFromCriteria(task1Result?.band_scores) * 0.33 + 
                              extractBandFromCriteria(task2Result?.band_scores) * 0.67;

      // Reconstruct structured data from database with validation
      const reconstructedData = {
        structured: {
          task1: {
            criteria: enrichCriteria(task1Result?.band_scores, 'task1'),
            overall_band: extractBandFromCriteria(task1Result?.band_scores),
            feedback_markdown: task1Result?.detailed_feedback || '### Task 1 Assessment\n\nDetailed feedback was not available for this task.',
            feedback: {
              strengths: ["Response was submitted successfully"],
              improvements: task1Result?.improvement_suggestions || ["Retake test for detailed feedback"]
            }
          },
          task2: {
            criteria: enrichCriteria(task2Result?.band_scores, 'task2'),
            overall_band: extractBandFromCriteria(task2Result?.band_scores),
            feedback_markdown: task2Result?.detailed_feedback || '### Task 2 Assessment\n\nDetailed feedback was not available for this task.',
            feedback: {
              strengths: ["Response was submitted successfully"],
              improvements: task2Result?.improvement_suggestions || ["Retake test for detailed feedback"]
            }
          },
          overall: {
            band: savedOverallBand,
            calculation: `Database reconstruction: Task 1 + Task 2 weighted average`,
            feedback_markdown: `### Overall IELTS Writing Band Score: ${savedOverallBand}\n\nThis score was reconstructed from saved test data.`
          },
          full_report_markdown: `# IELTS Writing Assessment Results\n\n## Overall Band Score: ${savedOverallBand}\n\nThis assessment was reconstructed from your saved test results. For the most accurate and detailed feedback, please take a new test.`
        },
        testName: testResult.test_type || 'IELTS Writing Test',
        task1Answer: task1Result?.user_response || null,
        task2Answer: task2Result?.user_response || null,
        task1Skipped: !task1Result,
        task2Skipped: !task2Result,
        task1Data: {
          title: testData?.task1Data?.title || 'Task 1',
          instructions: task1Result?.prompt_text || testData?.task1Data?.instructions || 'Task 1 Instructions',
          imageUrl: testData?.task1Data?.imageUrl || null,
          imageContext: testData?.task1Data?.imageContext || null
        },
        task2Data: {
          title: testData?.task2Data?.title || 'Task 2', 
          instructions: task2Result?.prompt_text || testData?.task2Data?.instructions || 'Task 2 Instructions'
        }
      };

      console.log('✅ Reconstructed data:', reconstructedData);
      setResultsData(reconstructedData);
    } catch (error) {
      console.error('❌ Error fetching results:', error);
      toast({
        title: "Error",
        description: "Failed to load test results. Please try taking the test again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // On-demand feedback generation if missing in DB/response (fallback only)
  useEffect(() => {
    const generateIfMissing = async () => {
      if (!resultsData || !user) return;
      
      const submissionId = (location.state as any)?.submissionId || (resultsData as any)?.submissionId;
      
      // CRITICAL: Prevent re-generation if this submission has already been processed
      if (hasGeneratedRef.current === submissionId) {
        console.log('✅ Submission already processed, skipping generation');
        return;
      }
      
      // If no submissionId, use a fallback key based on answers
      const fallbackKey = submissionId || `${resultsData.task1Answer?.slice(0, 50)}_${resultsData.task2Answer?.slice(0, 50)}`;
      if (hasGeneratedRef.current === fallbackKey) {
        console.log('✅ Content already processed, skipping generation');
        return;
      }
      
      const current = resultsData.structured;
      if (!current) return;

      // Check if sentence_comparisons already exist
      const hasTask1Spans = current?.task1?.sentence_comparisons && 
                          Array.isArray(current.task1.sentence_comparisons) && 
                          current.task1.sentence_comparisons.length > 0 &&
                          current.task1.original_spans &&
                          current.task1.corrected_spans;
      const hasTask2Spans = current?.task2?.sentence_comparisons && 
                          Array.isArray(current.task2.sentence_comparisons) && 
                          current.task2.sentence_comparisons.length > 0 &&
                          current.task2.original_spans &&
                          current.task2.corrected_spans;
      
      // If both tasks have spans, mark as processed and skip
      if (hasTask1Spans && hasTask2Spans) {
        hasGeneratedRef.current = submissionId || fallbackKey;
        return;
      }
      
      // If task1 has spans and no task2 answer, or vice versa, mark as processed
      if ((hasTask1Spans && !resultsData.task2Answer) || (hasTask2Spans && !resultsData.task1Answer)) {
        hasGeneratedRef.current = submissionId || fallbackKey;
        return;
      }

      // Generate sentence_comparisons on-demand
      const needsTask1 = !!resultsData.task1Answer && !hasTask1Spans;
      const needsTask2 = !!resultsData.task2Answer && !hasTask2Spans;
      
      if (!needsTask1 && !needsTask2) {
        hasGeneratedRef.current = submissionId || fallbackKey;
        return;
      }
      
      console.log('🔄 Generating sentence_comparisons on-demand (ONE TIME ONLY)...');
      // Mark as processing IMMEDIATELY to prevent any duplicate calls
      hasGeneratedRef.current = submissionId || fallbackKey;

      try {
        setLoading(true);
        const updates: Partial<StructuredResult> = { ...current };

        const toText = (spans?: Array<{ text: string }>) => (spans || []).map(s => s.text).join("");
        const buildImprovementsFromComparisons = (comparisons: any[] = []) => {
          return comparisons.map((c) => ({
            issue: "Rewrite for clarity and accuracy",
            sentence_quote: toText(c.original_spans),
            improved_version: toText(c.corrected_spans),
            explanation: "This rewrite improves grammar, vocabulary, and cohesion while preserving your original meaning."
          }));
        };

        if (needsTask1 && resultsData.task1Answer) {
          const { data, error } = await supabase.functions.invoke('writing-feedback', {
            body: {
              writing: resultsData.task1Answer,
              prompt: resultsData.task1Data?.title || resultsData.task1Data?.instructions,
              taskType: 'Task 1'
            }
          });
          if (!error && data?.structured) {
            updates.task1 = updates.task1 || { criteria: {} } as any;
            updates.task1.feedback = updates.task1.feedback || {} as any;
            updates.task1.sentence_comparisons = data.structured.sentence_comparisons || [];
            const synthesized = buildImprovementsFromComparisons(updates.task1.sentence_comparisons as any[]);
            updates.task1.feedback.improvements_detailed = data.structured.improvements_detailed || synthesized;
            updates.task1.feedback.improvements = data.structured.improvements || synthesized;
            updates.task1.feedback_markdown = data.structured.feedback_markdown || updates.task1.feedback_markdown;

            // Persist to DB if we have a submissionId
            if (submissionId) {
              await supabase.from('writing_test_results')
                .update({
                  detailed_feedback: updates.task1.feedback_markdown || '',
                  improvement_suggestions: (updates.task1.feedback?.improvements || []).filter((imp: any) => typeof imp === 'string')
                })
                .eq('test_result_id', submissionId)
                .eq('user_id', user.id)
                .eq('task_number', 1);
            }
          }
        }

        if (needsTask2 && resultsData.task2Answer) {
          const { data, error } = await supabase.functions.invoke('writing-feedback', {
            body: {
              writing: resultsData.task2Answer,
              prompt: resultsData.task2Data?.title || resultsData.task2Data?.instructions,
              taskType: 'Task 2'
            }
          });
          if (!error && data?.structured) {
            updates.task2 = updates.task2 || { criteria: {} } as any;
            updates.task2.feedback = updates.task2.feedback || {} as any;
            updates.task2.sentence_comparisons = data.structured.sentence_comparisons || [];
            const synthesized2 = buildImprovementsFromComparisons(updates.task2.sentence_comparisons as any[]);
            updates.task2.feedback.improvements_detailed = data.structured.improvements_detailed || synthesized2;
            updates.task2.feedback.improvements = data.structured.improvements || synthesized2;
            updates.task2.feedback_markdown = data.structured.feedback_markdown || updates.task2.feedback_markdown;

            if (submissionId) {
              await supabase.from('writing_test_results')
                .update({
                  detailed_feedback: updates.task2.feedback_markdown || '',
                  improvement_suggestions: (updates.task2.feedback?.improvements || []).filter((imp: any) => typeof imp === 'string')
                })
                .eq('test_result_id', submissionId)
                .eq('user_id', user.id)
                .eq('task_number', 2);
            }
          }
        }

        // Only update if there are actual changes to prevent unnecessary re-renders
        const hasChanges = 
          (needsTask1 && updates.task1?.sentence_comparisons && updates.task1.sentence_comparisons.length > 0) ||
          (needsTask2 && updates.task2?.sentence_comparisons && updates.task2.sentence_comparisons.length > 0);
        
        if (hasChanges) {
          setResultsData(prev => ({ ...prev, structured: updates }));
          console.log('✅ sentence_comparisons generated and updated (ONE TIME)');
        } else {
          console.log('✅ No changes needed, skipping state update');
        }
      } catch (e) {
        console.error('⚠️ On-demand feedback generation failed:', e);
        // Reset on error to allow retry, but only if it's a different submission
        const currentSubmissionId = (location.state as any)?.submissionId || (resultsData as any)?.submissionId;
        if (hasGeneratedRef.current === currentSubmissionId) {
          hasGeneratedRef.current = null;
        }
      } finally {
        setLoading(false);
      }
    };

    generateIfMissing();
    // CRITICAL: Only depend on submissionId and user, NOT on resultsData properties that change
    // This ensures the effect only runs once per submission
  }, [(location.state as any)?.submissionId, (resultsData as any)?.submissionId, user?.id]);

  const {
    structured,
    testName,
    task1Data,
    task2Data,
    task1Answer,
    task2Answer
  } = resultsData;
  
  useEffect(() => {
    document.title = `IELTS Writing Results – ${testName || "Assessment"}`;
    const meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (meta) {
      meta.content = "Professional IELTS Writing assessment with detailed per-criterion bands and feedback.";
    } else {
      const m = document.createElement("meta");
      m.name = "description";
      m.content = "Professional IELTS Writing assessment with detailed per-criterion bands and feedback.";
      document.head.appendChild(m);
    }
  }, [testName]);

  // Add validation for structured data with fallback
  const hasValidData = structured && (structured.task1 || structured.task2);

  // Add fallback structured data if needed
  if (!hasValidData && structured) {
    console.warn('⚠️ Structured data exists but lacks task data, creating minimal fallback');
    structured.task1 = structured.task1 || {
      criteria: {
        task_achievement: { band: 6.5, justification: "Minimal assessment available" },
        coherence_and_cohesion: { band: 6.5, justification: "Minimal assessment available" },
        lexical_resource: { band: 6.5, justification: "Minimal assessment available" },
        grammatical_range_and_accuracy: { band: 6.5, justification: "Minimal assessment available" }
      },
      overall_band: 6.5,
      feedback: {
        strengths: ["Response provided"],
        improvements: ["Retake for detailed feedback"]
      },
      feedback_markdown: "Assessment data incomplete."
    };
    structured.task2 = structured.task2 || {
      criteria: {
        task_response: { band: 6.5, justification: "Minimal assessment available" },
        coherence_and_cohesion: { band: 6.5, justification: "Minimal assessment available" },
        lexical_resource: { band: 6.5, justification: "Minimal assessment available" },
        grammatical_range_and_accuracy: { band: 6.5, justification: "Minimal assessment available" }
      },
      overall_band: 6.5,
      feedback: {
        strengths: ["Response provided"],
        improvements: ["Retake for detailed feedback"]
      },
      feedback_markdown: "Assessment data incomplete."
    };
  }

  const finalHasValidData = structured && (structured.task1 || structured.task2);

  // Early return with error UI if no structured data
  if (!finalHasValidData) {
    return (
      <div className="min-h-screen bg-surface-2 flex items-center justify-center">
        <Card className="max-w-md mx-4">
          <CardHeader className="text-center">
            <CardTitle className="text-heading-3 text-destructive">Results Not Available</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p style={{ color: '#8B6914' }}>
              We couldn't find your test results. This usually happens when:
            </p>
            <ul className="text-sm text-left space-y-1" style={{ color: '#8B6914' }}>
              <li>• You navigated directly to this page</li>
              <li>• You refreshed the page</li>
              <li>• The test session expired</li>
            </ul>
            <div className="flex flex-col gap-2 pt-4">
              <Button onClick={() => navigate('/ielts-portal')} className="w-full">
                Take New Test
              </Button>
              <Button variant="outline" onClick={() => navigate('/dashboard')} className="w-full">
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const t1OverallComputed = computeTaskOverall(structured?.task1, 'task1');
  const t2OverallComputed = computeTaskOverall(structured?.task2, 'task2');
  
  // Check if tasks are skipped
  const task1Skipped = resultsData.task1Skipped || !resultsData.task1Answer || !resultsData.task1Answer.trim();
  const task2Skipped = resultsData.task2Skipped || !resultsData.task2Answer || !resultsData.task2Answer.trim();
  
  // Only include non-skipped tasks in the calculation
  const hasTask1 = !task1Skipped && !Number.isNaN(t1OverallComputed);
  const hasTask2 = !task2Skipped && !Number.isNaN(t2OverallComputed);
  
  // Calculate denominator based on which tasks are actually completed (not skipped)
  // Task 1 = 1/3 weight, Task 2 = 2/3 weight
  const denom = (hasTask1 ? 1 : 0) + (hasTask2 ? 2 : 0);
  
  // Validate scores are within valid IELTS range (0-9)
  const validateScore = (score: number): number => {
    if (Number.isNaN(score) || score < 0) return 0;
    if (score > 9) return 9;
    return score;
  };
  
  const t1Valid = hasTask1 ? validateScore(t1OverallComputed) : 0;
  const t2Valid = hasTask2 ? validateScore(t2OverallComputed) : 0;
  
  // Calculate overall band only from completed (non-skipped) tasks
  const overallBand = denom > 0
    ? roundIELTS((t1Valid + 2 * t2Valid) / denom)
    : (hasTask1 ? roundIELTS(t1Valid) : (hasTask2 ? roundIELTS(t2Valid) : 0));

  // Use selected theme or default to 'note'
  const currentTheme = themes[selectedTheme as ThemeName] || themes.note;

  const TaskSection = ({
    title,
    task,
    type,
    computedOverall,
    userAnswer,
    isSkipped,
  }: {
    title: string;
    task?: TaskAssessment;
    type: "task1" | "task2";
    computedOverall?: number;
    userAnswer?: string;
    isSkipped?: boolean;
  }) => {
    // Show skipped message if task is skipped or has no answer
    if (isSkipped || !userAnswer || !userAnswer.trim()) {
      return (
        <Card className="rounded-3xl shadow-lg mb-8" style={{
          backgroundColor: currentTheme.colors.cardBackground,
          borderColor: currentTheme.colors.cardBorder,
          ...currentTheme.styles.cardStyle
        }}>
          <CardHeader className="bg-gradient-to-r from-amber-50 to-amber-100">
            <CardTitle className="flex items-center gap-2 text-amber-700">
              <div className="p-2 rounded-xl bg-amber-200">
                {type === "task1" ? "Task 1" : "Task 2"}
              </div>
              {title} - Skipped
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 text-center">
            <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 rounded-full px-4 py-2 mb-2">
              This task was skipped
            </Badge>
            <p className="text-sm mt-2" style={{ color: '#8B6914' }}>No assessment available for this task</p>
          </CardContent>
        </Card>
      );
    }
    
    if (!task) return null;
    const crit = task.criteria || {};
    const items = [
      type === "task1"
        ? {
            label: "Task Achievement",
            value: crit.task_achievement?.band,
            just: crit.task_achievement?.justification,
          }
        : {
            label: "Task Response",
            value: crit.task_response?.band,
            just: crit.task_response?.justification,
          },
      {
        label: "Coherence & Cohesion",
        value: crit.coherence_and_cohesion?.band,
        just: crit.coherence_and_cohesion?.justification,
      },
      {
        label: "Lexical Resource",
        value: crit.lexical_resource?.band,
        just: crit.lexical_resource?.justification,
      },
      {
        label: "Grammar Range & Accuracy",
        value: crit.grammatical_range_and_accuracy?.band,
        just: crit.grammatical_range_and_accuracy?.justification,
      },
    ];

    const overallForTask =
      typeof computedOverall === "number" && !Number.isNaN(computedOverall)
        ? roundIELTS(computedOverall)
        : typeof task.overall_band === "number"
        ? roundIELTS(task.overall_band)
        : (NaN as unknown as number);

    return (
      <Card className="rounded-3xl shadow-lg mb-8" style={{
        backgroundColor: currentTheme.colors.cardBackground,
        borderColor: currentTheme.colors.cardBorder,
        ...currentTheme.styles.cardStyle
      }}>
        <CardHeader style={{
          backgroundColor: currentTheme.colors.cardBackground,
          borderBottom: `1px solid ${currentTheme.colors.border}`
        }}>
          <CardTitle className="text-heading-3 flex items-center justify-between" style={{ color: '#5D4E37' }}>
            <span>{title}</span>
            {!Number.isNaN(overallForTask) && (
              <Badge variant="outline" className="rounded-2xl text-sm">
                Overall: {overallForTask.toFixed(1)}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {items.map((it) => (
              <div key={it.label} className="rounded-2xl p-4 border" style={{
                backgroundColor: currentTheme.colors.hoverBackground,
                borderColor: currentTheme.colors.border,
                color: currentTheme.colors.textPrimary
              }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium" style={{ color: currentTheme.colors.textPrimary }}>{it.label}</p>
                  <Badge variant="outline" className="rounded-xl" style={{
                    borderColor: currentTheme.colors.buttonPrimary,
                    color: currentTheme.colors.buttonPrimary
                  }}>
                    {typeof it.value === "number" ? roundIELTS(it.value).toFixed(1) : "-"}
                  </Badge>
                </div>
                {it.just ? (
                  <div className="mt-2 text-sm" style={{
                    color: currentTheme.colors.textSecondary
                  }}>
                    {it.just}
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          {(task.feedback?.strengths?.length ||
            task.feedback?.improvements?.length ||
            task.feedback?.improvements_detailed?.length) && (
            <div className="mt-6 space-y-6">
              {task.feedback?.strengths?.length ? (
                <div>
                  <h4 className="text-heading-4 mb-2" style={{ color: '#5D4E37' }}>Key strengths</h4>
                  <ul className="list-disc pl-5 space-y-1 text-sm" style={{ color: currentTheme.colors.textSecondary }}>
                    {task.feedback.strengths.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {/* Specific actionable improvements intentionally removed per request */}
            </div>
          )}

          {/* Writing Comparison View */}
           {userAnswer && (
             <WritingComparisonView
               originalText={userAnswer}
               improvementSuggestions={task.feedback?.improvements?.map((improvement) => {
                 // Handle both string improvements and object improvements
                 if (typeof improvement === 'string') {
                   return {
                     issue: "General Improvement",
                     sentence_quote: "",
                     improved_version: improvement,
                     explanation: improvement
                   };
                 } else if (improvement && typeof improvement === 'object') {
                   // If it's already an object, use it directly
                   return {
                     issue: improvement.issue || "Improvement",
                     sentence_quote: improvement.original || improvement.sentence_quote || "",
                     improved_version: improvement.improved || improvement.improved_version || "",
                     explanation: improvement.explanation || "Suggested improvement"
                   };
                 }
                 return {
                   issue: "Improvement",
                   sentence_quote: "",
                   improved_version: String(improvement || ""),
                   explanation: String(improvement || "")
                 };
               }) || task.feedback?.improvements_detailed || []}
               originalSpans={task.original_spans}
               correctedSpans={task.corrected_spans}
               sentenceComparisons={task.sentence_comparisons}
               title={title}
               currentTheme={currentTheme}
             />
           )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div
      className="min-h-screen relative"
      style={{
        backgroundColor: 'transparent'
      }}
    >
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed"
           style={{
             backgroundImage: 'none',
             backgroundColor: '#F5E6D3'
           }} />
      <LightRays raysOrigin="top-center" raysColor="#4F46E5" raysSpeed={0.5} lightSpread={2} rayLength={1.5} pulsating={false} fadeDistance={1.2} saturation={0.8} followMouse={true} mouseInfluence={0.05} noiseAmount={0.1} distortion={0.2} />
      <div className="relative z-10">

      <div className="border-b sticky top-0 z-10" style={{
        backgroundColor: currentTheme.colors.cardBackground,
        borderColor: currentTheme.colors.border
      }}>
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/dashboard')} className="hover:bg-surface-3 rounded-xl">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-heading-2" style={{ color: '#5D4E37' }}>IELTS Writing Results</h1>
            </div>
          </div>

          {/* Theme Selector */}
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4" style={{ color: '#8B6914' }} />
            <Select value={selectedTheme} onValueChange={setSelectedTheme}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="Theme" />
              </SelectTrigger>
              <SelectContent>
                {getThemeOptions().map((theme) => (
                  <SelectItem key={theme.value} value={theme.value}>
                    {theme.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 space-section">
        <Card className="rounded-3xl mb-8 overflow-hidden" style={{
          backgroundColor: currentTheme.colors.cardBackground,
          borderColor: currentTheme.colors.cardBorder,
          ...currentTheme.styles.cardStyle
        }}>
          <CardHeader className="text-center py-6" style={{
            backgroundColor: currentTheme.colors.cardBackground,
            borderBottom: `1px solid ${currentTheme.colors.border}`
          }}>
            <CardTitle className="text-heading-3" style={{ color: '#5D4E37' }}>Overall Writing Band Score</CardTitle>
          </CardHeader>
          <CardContent className="py-6">
            <div className="flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-8">
              <PenguinClapAnimation size="md" className="shrink-0" />
              <div className="text-center lg:text-left">
                <p className="text-caption uppercase tracking-wide mb-1" style={{ color: '#8B6914' }}>Overall Band</p>
                <div className="text-6xl font-bold mb-3" style={{
                  background: `linear-gradient(to right, ${currentTheme.colors.buttonPrimary}, ${currentTheme.colors.buttonPrimaryHover})`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}>
                  {overallBand.toFixed(1)}
                </div>
                <div className="flex items-center gap-3 justify-center lg:justify-start">
                  <Badge variant="outline" className="text-base px-3 py-1.5 rounded-2xl" style={{
                    color: currentTheme.colors.buttonPrimary,
                    borderColor: currentTheme.colors.buttonPrimary,
                    backgroundColor: currentTheme.colors.hoverBackground
                  }}>
                    Performance
                  </Badge>
                </div>
              </div>
              <ScoreSpiderChart 
                task1Scores={!task1Skipped && structured?.task1 ? {
                  task_achievement: structured.task1.criteria?.task_achievement?.band,
                  coherence_and_cohesion: structured.task1.criteria?.coherence_and_cohesion?.band,
                  lexical_resource: structured.task1.criteria?.lexical_resource?.band,
                  grammatical_range_and_accuracy: structured.task1.criteria?.grammatical_range_and_accuracy?.band
                } : undefined}
                task2Scores={!task2Skipped && structured?.task2 ? {
                  task_response: structured.task2.criteria?.task_response?.band,
                  coherence_and_cohesion: structured.task2.criteria?.coherence_and_cohesion?.band,
                  lexical_resource: structured.task2.criteria?.lexical_resource?.band,
                  grammatical_range_and_accuracy: structured.task2.criteria?.grammatical_range_and_accuracy?.band
                } : undefined}
                className="w-full max-w-sm lg:w-80 shrink-0"
              />
            </div>
          </CardContent>
        </Card>

        {/* Task 1 Section */}
        <TaskSection 
          title="Task 1 Assessment" 
          task={structured?.task1} 
          type="task1" 
          computedOverall={t1OverallComputed}
          userAnswer={resultsData.task1Answer}
          isSkipped={resultsData.task1Skipped || !resultsData.task1Answer || !resultsData.task1Answer.trim()}
        />
        {(task1Data?.instructions || task1Data?.imageUrl) && (
          <Card className="rounded-3xl shadow-lg mb-8" style={{
            backgroundColor: currentTheme.colors.cardBackground,
            borderColor: currentTheme.colors.cardBorder,
            ...currentTheme.styles.cardStyle
          }}>
            <CardHeader>
              <CardTitle className="text-heading-4" style={{ color: '#5D4E37' }}>Task 1 Instruction</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {task1Data?.imageUrl && (
                  <div className="rounded-xl overflow-hidden border border-border bg-white p-2 flex items-center justify-center">
                    <img src={task1Data.imageUrl} alt="Task 1 visual" className="max-h-64 object-contain" />
                  </div>
                )}
                {task1Data?.instructions && (
                  <div className="text-sm p-4 rounded-lg whitespace-pre-wrap" style={{
                    color: currentTheme.colors.textSecondary,
                    backgroundColor: currentTheme.colors.cardBackground,
                    border: `1px solid ${currentTheme.colors.border}`
                  }}>
                    {task1Data.instructions}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Task 2 Instruction - moved to top */}
        {task2Data?.instructions && (
          <Card className="rounded-3xl shadow-lg mb-8" style={{
            backgroundColor: currentTheme.colors.cardBackground,
            borderColor: currentTheme.colors.cardBorder,
            ...currentTheme.styles.cardStyle
          }}>
            <CardHeader>
              <CardTitle className="text-heading-4" style={{ color: '#5D4E37' }}>Task 2 Instruction</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm p-4 rounded-lg whitespace-pre-wrap" style={{
                color: currentTheme.colors.textSecondary,
                backgroundColor: currentTheme.colors.cardBackground,
                border: `1px solid ${currentTheme.colors.border}`
              }}>
                {task2Data.instructions}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Task 2 Assessment - moved below instruction */}
        <TaskSection
          title="Task 2 Assessment"
          task={structured?.task2}
          type="task2"
          computedOverall={t2OverallComputed}
          userAnswer={resultsData.task2Answer}
          isSkipped={resultsData.task2Skipped || !resultsData.task2Answer || !resultsData.task2Answer.trim()}
        />

        <div className="flex justify-center gap-4">
          <Button onClick={() => navigate("/ielts-portal")} className="rounded-xl" style={{
            backgroundColor: currentTheme.colors.buttonPrimary,
            color: '#ffffff',
            borderColor: currentTheme.colors.buttonPrimary
          }}>Take Another Test</Button>
          <Button onClick={() => navigate("/dashboard")} variant="outline" className="rounded-xl" style={{
            borderColor: currentTheme.colors.buttonPrimary,
            color: currentTheme.colors.buttonPrimary
          }}>Return to Dashboard</Button>
        </div>
      </div>
      </div>
    </div>
  );
}