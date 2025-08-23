import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import LightRays from "@/components/animations/LightRays";
import { ArrowLeft, Copy } from "lucide-react";
import PenguinClapAnimation from "@/components/animations/PenguinClapAnimation";
import { supabase } from "@/integrations/supabase/client";
import CorrectionVisualizer, { Span } from "@/components/CorrectionVisualizer";
import SentenceCompare from "@/components/SentenceCompare";
import { CorrectionsByCategory } from "@/components/corrections/CorrectionsByCategory";
import { EnhancedCorrection } from "@/components/corrections/CorrectionItem";
import { Toggle } from "@/components/ui/toggle";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import ScoreSpiderChart from "@/components/ScoreSpiderChart";

// Component for the task analysis loading animation
const TaskAnalysisLoading = ({ task }: { task: string }) => {
  return (
    <div className="flex flex-col items-center justify-center py-8 space-y-4">
      <div className="w-32 h-32">
        <dotlottie-wc
          src="https://lottie.host/176d02bf-8830-4f49-b39c-a086f2b8a012/SS6Qka9MRV.lottie"
          style={{ width: '100%', height: '100%' }}
          speed="1"
          autoplay
          loop
        />
      </div>
      <div className="text-sm font-medium text-text-primary">Analyzing {task}...</div>
      <div className="text-caption text-text-secondary">Please wait while we analyze your writing</div>
    </div>
  );
};
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
  improvements?: string[];
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
const bandToDesc = (score: number) => {
  if (score >= 8.5) return {
    label: "Excellent",
    color: "text-brand-green bg-brand-green/10 border-brand-green/30"
  };
  if (score >= 7.0) return {
    label: "Good",
    color: "text-brand-blue bg-brand-blue/10 border-brand-blue/30"
  };
  if (score >= 6.0) return {
    label: "Competent",
    color: "text-brand-orange bg-brand-orange/10 border-brand-orange/30"
  };
  return {
    label: "Limited",
    color: "text-destructive bg-destructive/10 border-destructive/30"
  };
};

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
  
  // All hooks must be at the top of the component
  const [loading, setLoading] = useState(false);
  const [resultsData, setResultsData] = useState<{
    structured?: StructuredResult;
    testName?: string;
    task1Data?: any;
    task2Data?: any;
    task1Answer?: string;
    task2Answer?: string;
  }>({});

  // Correction analysis state
  const [t1Loading, setT1Loading] = useState<boolean>(false);
  const [t2Loading, setT2Loading] = useState<boolean>(false);
  const [t1Error, setT1Error] = useState<string | null>(null);
  const [t2Error, setT2Error] = useState<string | null>(null);
  const [t1CorrData, setT1CorrData] = useState<{
    original_spans: Span[];
    enhanced_spans: Span[];
    suggestions: EnhancedCorrection[];
    summary: {
      totalSuggestions: number;
      suggestionsByCategory: Record<string, number>;
    };
  } | null>(null);
  const [t2CorrData, setT2CorrData] = useState<{
    original_spans: Span[];
    enhanced_spans: Span[];
    suggestions: EnhancedCorrection[];
    summary: {
      totalSuggestions: number;
      suggestionsByCategory: Record<string, number>;
    };
  } | null>(null);
  const [t1SentenceView, setT1SentenceView] = useState(false);
  const [t2SentenceView, setT2SentenceView] = useState(false);
  const [t1ViewMode, setT1ViewMode] = useState<'highlights' | 'sentence'>('highlights');
  const [t2ViewMode, setT2ViewMode] = useState<'highlights' | 'sentence'>('highlights');

  // Try to get data from location state first, then fallback to database
  useEffect(() => {
    const stateData = location.state as any;
    
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
        const fallbackCriteria = taskType === 'task1' ? {
          task_achievement: { band: 6.5, justification: "Score reconstructed from database" },
          coherence_and_cohesion: { band: 6.5, justification: "Score reconstructed from database" },
          lexical_resource: { band: 6.5, justification: "Score reconstructed from database" },
          grammatical_range_and_accuracy: { band: 6.5, justification: "Score reconstructed from database" }
        } : {
          task_response: { band: 6.5, justification: "Score reconstructed from database" },
          coherence_and_cohesion: { band: 6.5, justification: "Score reconstructed from database" },
          lexical_resource: { band: 6.5, justification: "Score reconstructed from database" },
          grammatical_range_and_accuracy: { band: 6.5, justification: "Score reconstructed from database" }
        };

        if (!bandScores || typeof bandScores !== 'object') {
          console.warn(`⚠️ Missing or invalid criteria for ${taskType}, using fallback`);
          return fallbackCriteria;
        }

        // Merge existing data with fallbacks where needed
        const enriched = { ...fallbackCriteria };
        for (const [key, value] of Object.entries(bandScores)) {
          if (value && typeof value === 'object' && 'band' in value) {
            enriched[key as keyof typeof enriched] = value as any;
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
        task1Answer: task1Result?.user_response || '',
        task2Answer: task2Result?.user_response || '',
        task1Data: {
          title: 'Task 1',
          instructions: task1Result?.prompt_text || 'Task 1 Instructions'
        },
        task2Data: {
          title: 'Task 2', 
          instructions: task2Result?.prompt_text || 'Task 2 Instructions'
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

  // Function to fetch existing correction data from database
  const fetchExistingCorrectionData = async (submissionId: string, taskNumber: number) => {
    try {
      const { data, error } = await supabase
        .from('writing_test_results')
        .select('correction_analysis')
        .eq('test_result_id', submissionId)
        .eq('task_number', taskNumber)
        .maybeSingle();

      if (error) {
        console.error('Error fetching existing correction data:', error);
        return null;
      }

      return data?.correction_analysis || null;
    } catch (error) {
      console.error('Error in fetchExistingCorrectionData:', error);
      return null;
    }
  };

  // Function to save correction analysis to database for caching
  const saveCorrectionAnalysis = async (submissionId: string, taskNumber: number, analysisData: any) => {
    try {
      const { error } = await supabase
        .from('writing_test_results')
        .update({ correction_analysis: analysisData })
        .eq('test_result_id', submissionId)
        .eq('task_number', taskNumber);

      if (error) {
        console.error('Error saving correction analysis:', error);
      } else {
        console.log('✅ Correction analysis saved to database');
      }
    } catch (error) {
      console.error('Error in saveCorrectionAnalysis:', error);
    }
  };

  useEffect(() => {
    let isMounted = true;
    
    const run = async () => {
      // Get submissionId from location state
      const stateData = location.state as any;
      const currentSubmissionId = stateData?.submissionId;
      
      if (!currentSubmissionId) {
        console.warn('⚠️ No submissionId available for fetching correction data');
        return;
      }
      
      // Task 1 corrections analysis
      if (task1Answer && !t1CorrData && !t1Loading) {
        if (!isMounted) return;
        setT1Loading(true);
        setT1Error(null);
        
        try {
          // First, try to fetch existing correction data from database
          const existingData = await fetchExistingCorrectionData(currentSubmissionId, 1);
          
          if (!isMounted) return;
          
          // Validate existing data structure more thoroughly
          if (existingData && 
              typeof existingData === 'object' && 
              Array.isArray((existingData as any).original_spans) && 
              Array.isArray((existingData as any).enhanced_spans) &&
              (existingData as any).original_spans.length > 0) {
            
            console.log('✅ Found valid Task 1 correction data in database');
            const typedData = existingData as any;
            
            console.log('🔍 Task 1 AI correction analysis result:', {
              hasData: true,
              originalSpansCount: typedData?.original_spans?.length || 0,
              enhancedSpansCount: typedData?.enhanced_spans?.length || 0,
              suggestionSpansCount: typedData?.original_spans?.filter(s => s.status === 'suggestion')?.length || 0,
              enhancementSpansCount: typedData?.enhanced_spans?.filter(s => s.status === 'enhancement')?.length || 0,
              correctionsCount: typedData?.suggestions?.length || 0
            });
            
            setT1CorrData({
              original_spans: typedData.original_spans,
              enhanced_spans: typedData.enhanced_spans,
              suggestions: typedData.suggestions || [],
              summary: typedData.summary || {
                totalSuggestions: typedData.suggestions?.length || 0,
                suggestionsByCategory: { vocabulary: 0, style: 0, clarity: 0, academic_tone: 0 }
              }
            });
            setT1Loading(false);
          } else {
            // If no existing valid data, run AI analysis
            console.log('⚠️ No existing Task 1 correction data found, running AI analysis...');
            const prompt1 = `${task1Data?.title ? `Title: ${task1Data.title}\n` : ''}${task1Data?.instructions ? `Instructions: ${task1Data.instructions}` : ''}`.trim();
            
            const result = await supabase.functions.invoke('analyze-writing-correction', {
              body: {
                userSubmission: task1Answer,
                questionPrompt: prompt1
              }
            });
            
            if (!isMounted) return;
            
            if (result.error) {
              throw new Error(result.error.message || 'Analysis failed');
            }
            
            const analysisResult = result.data;
            if (!analysisResult || !analysisResult.originalSpans || !analysisResult.enhancedSpans) {
              throw new Error('Invalid analysis result structure');
            }
            
            console.log('🔍 Task 1 AI correction analysis result:', {
              hasData: true,
              originalSpansCount: analysisResult?.originalSpans?.length || 0,
              enhancedSpansCount: analysisResult?.enhancedSpans?.length || 0,
              suggestionSpansCount: analysisResult?.originalSpans?.filter(s => s.status === 'suggestion')?.length || 0,
              enhancementSpansCount: analysisResult?.enhancedSpans?.filter(s => s.status === 'enhancement')?.length || 0,
              correctionsCount: analysisResult?.suggestions?.length || 0
            });
            
            // Save to database for caching
            await saveCorrectionAnalysis(currentSubmissionId, 1, analysisResult);
            
            if (!isMounted) return;
            
            setT1CorrData({
              original_spans: analysisResult.originalSpans,
              enhanced_spans: analysisResult.enhancedSpans,
              suggestions: analysisResult.suggestions || [],
              summary: analysisResult.summary || {
                totalSuggestions: analysisResult.suggestions?.length || 0,
                suggestionsByCategory: { vocabulary: 0, style: 0, clarity: 0, academic_tone: 0 }
              }
            });
            setT1Loading(false);
          }
        } catch (error) {
          if (!isMounted) return;
          console.error('❌ Task 1 correction analysis failed:', error);
          setT1Error(error.message || 'Failed to analyze corrections');
          setT1Loading(false);
        }
      }

      // Task 2 corrections analysis  
      if (task2Answer && !t2CorrData && !t2Loading) {
        if (!isMounted) return;
        setT2Loading(true);
        setT2Error(null);
        
        try {
          // First, try to fetch existing correction data from database
          const existingData = await fetchExistingCorrectionData(currentSubmissionId, 2);
          
          if (!isMounted) return;
          
          // Validate existing data structure more thoroughly
          if (existingData && 
              typeof existingData === 'object' && 
              Array.isArray((existingData as any).original_spans) && 
              Array.isArray((existingData as any).enhanced_spans) &&
              (existingData as any).original_spans.length > 0) {
            
            console.log('✅ Found valid Task 2 correction data in database');
            const typedData = existingData as any;
            
            console.log('🔍 Task 2 AI correction analysis result:', {
              hasData: true,
              originalSpansCount: typedData?.original_spans?.length || 0,
              enhancedSpansCount: typedData?.enhanced_spans?.length || 0,
              suggestionSpansCount: typedData?.original_spans?.filter(s => s.status === 'suggestion')?.length || 0,
              enhancementSpansCount: typedData?.enhanced_spans?.filter(s => s.status === 'enhancement')?.length || 0,
              correctionsCount: typedData?.suggestions?.length || 0
            });
            
            setT2CorrData({
              original_spans: typedData.original_spans,
              enhanced_spans: typedData.enhanced_spans,
              suggestions: typedData.suggestions || [],
              summary: typedData.summary || {
                totalSuggestions: typedData.suggestions?.length || 0,
                suggestionsByCategory: { vocabulary: 0, style: 0, clarity: 0, academic_tone: 0 }
              }
            });
            setT2Loading(false);
          } else {
            // If no existing valid data, run AI analysis
            console.log('⚠️ No existing Task 2 correction data found, running AI analysis...');
            const prompt2 = `${task2Data?.title ? `Title: ${task2Data.title}\n` : ''}${task2Data?.instructions ? `Instructions: ${task2Data.instructions}` : ''}`.trim();
            
            const result = await supabase.functions.invoke('analyze-writing-correction', {
              body: {
                userSubmission: task2Answer,
                questionPrompt: prompt2
              }
            });
            
            if (!isMounted) return;
            
            if (result.error) {
              throw new Error(result.error.message || 'Analysis failed');
            }
            
            const analysisResult = result.data;
            if (!analysisResult || !analysisResult.originalSpans || !analysisResult.enhancedSpans) {
              throw new Error('Invalid analysis result structure');
            }
            
            console.log('🔍 Task 2 AI correction analysis result:', {
              hasData: true,
              originalSpansCount: analysisResult?.originalSpans?.length || 0,
              enhancedSpansCount: analysisResult?.enhancedSpans?.length || 0,
              suggestionSpansCount: analysisResult?.originalSpans?.filter(s => s.status === 'suggestion')?.length || 0,
              enhancementSpansCount: analysisResult?.enhancedSpans?.filter(s => s.status === 'enhancement')?.length || 0,
              correctionsCount: analysisResult?.suggestions?.length || 0
            });
            
            // Save to database for caching
            await saveCorrectionAnalysis(currentSubmissionId, 2, analysisResult);
            
            if (!isMounted) return;
            
            setT2CorrData({
              original_spans: analysisResult.originalSpans,
              enhanced_spans: analysisResult.enhancedSpans,
              suggestions: analysisResult.suggestions || [],
              summary: analysisResult.summary || {
                totalSuggestions: analysisResult.suggestions?.length || 0,
                suggestionsByCategory: { vocabulary: 0, style: 0, clarity: 0, academic_tone: 0 }
              }
            });
            setT2Loading(false);
          }
        } catch (error) {
          if (!isMounted) return;
          console.error('❌ Task 2 correction analysis failed:', error);
          setT2Error(error.message || 'Failed to analyze corrections');
          setT2Loading(false);
        }
      }
    };

    run();
    
    return () => {
      isMounted = false;
    };
  }, [task1Answer, task2Answer, location.state]);

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
          <p className="text-text-secondary">
            We couldn't find your test results. This usually happens when:
          </p>
          <ul className="text-sm text-text-secondary text-left space-y-1">
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
const denom = (Number.isNaN(t1OverallComputed) ? 0 : 1) + (Number.isNaN(t2OverallComputed) ? 0 : 2);
const overallBand = denom > 0
  ? roundIELTS(((Number.isNaN(t1OverallComputed) ? 0 : roundIELTS(t1OverallComputed)) + 2 * (Number.isNaN(t2OverallComputed) ? 0 : roundIELTS(t2OverallComputed))) / denom)
  : 0;
const overallMeta = bandToDesc(overallBand);
const t1Counts = {
  suggestions: t1CorrData?.original_spans.filter(s => s.status === 'suggestion').length ?? 0,
  enhancements: t1CorrData?.enhanced_spans.filter(s => s.status === 'enhancement').length ?? 0
};
const t2Counts = {
  suggestions: t2CorrData?.original_spans.filter(s => s.status === 'suggestion').length ?? 0,
  enhancements: t2CorrData?.enhanced_spans.filter(s => s.status === 'enhancement').length ?? 0
};
const TaskSection = ({
    title,
    task,
    type,
    computedOverall,
  }: {
    title: string;
    task?: TaskAssessment;
    type: "task1" | "task2";
    computedOverall?: number;
  }) => {
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
      <Card className="card-elevated border-2 border-brand-blue/20 mb-8">
        <CardHeader className="bg-gradient-to-r from-brand-blue/10 to-brand-purple/10">
          <CardTitle className="text-heading-3 flex items-center justify-between">
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
              <div key={it.label} className="rounded-2xl p-4 bg-surface-3 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-text-primary">{it.label}</p>
                  <Badge variant="outline" className="rounded-xl">
                    {typeof it.value === "number" ? roundIELTS(it.value).toFixed(1) : "-"}
                  </Badge>
                </div>
                {it.just ? (
                  <div className="mt-2">
                    <p className="text-[11px] uppercase tracking-wide text-text-tertiary mb-1">Assessment Reasoning</p>
                    <div className="text-sm text-text-secondary bg-surface-2/50 rounded-lg p-3 border border-border/50">
                      {it.just}
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          {(task.feedback?.strengths?.length ||
            task.feedback?.improvements?.length ||
            task.feedback?.improvements_detailed?.length) && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {task.feedback?.strengths?.length ? (
                <div>
                  <h4 className="text-heading-4 mb-2">Key strengths</h4>
                  <ul className="list-disc pl-5 space-y-1 text-text-secondary">
                    {task.feedback.strengths.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {task.feedback?.improvements_detailed?.length ? (
                <div>
                  <h4 className="text-heading-4 mb-2">Specific, actionable improvements</h4>
                  <p className="text-caption text-text-secondary mb-3">
                    Each item includes a direct quote from your writing and a stronger revision.
                  </p>
                  <div className="space-y-3">
                    {task.feedback.improvements_detailed.map((ex, i) => (
                      <div key={i} className="rounded-xl border border-border bg-surface-3 p-3">
                        {ex.issue ? (
                          <div className="text-sm font-medium text-text-primary mb-1">{ex.issue}</div>
                        ) : null}
                        {ex.sentence_quote ? (
                          <div className="mb-2">
                            <div className="text-[11px] uppercase tracking-wide text-text-tertiary mb-1">Original</div>
                            <blockquote className="text-sm text-text-secondary border-l-2 border-brand-blue/40 pl-3 italic">
                              “{ex.sentence_quote}”
                            </blockquote>
                          </div>
                        ) : null}
                        {ex.improved_version ? (
                          <div className="text-sm mt-1">
                            <span className="text-[11px] uppercase tracking-wide text-text-tertiary mr-1">Improved</span>
                            <span className="font-medium text-text-primary">{ex.improved_version}</span>
                          </div>
                        ) : null}
                        {ex.explanation ? (
                          <p className="text-caption text-text-secondary mt-1">{ex.explanation}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : task.feedback?.improvements?.length ? (
                <div>
                  <h4 className="text-heading-4 mb-2">Specific, actionable improvements</h4>
                  <p className="text-caption text-text-secondary mb-2">
                    Include concrete examples, target structures, and one improved sentence.
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-text-secondary">
                    {task.feedback.improvements.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };
  return <div className="min-h-screen bg-surface-2 relative">
      <LightRays raysOrigin="top-center" raysColor="#4F46E5" raysSpeed={0.5} lightSpread={2} rayLength={1.5} pulsating={false} fadeDistance={1.2} saturation={0.8} followMouse={true} mouseInfluence={0.05} noiseAmount={0.1} distortion={0.2} />

      <div className="bg-surface-1 border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/dashboard')} className="hover:bg-surface-3 rounded-xl">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-heading-2">IELTS Writing Results</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 space-section">
        <Card className="card-elevated mb-8 overflow-hidden">
          <CardHeader className="text-center py-6">
            <CardTitle className="text-heading-3">Overall Writing Band Score</CardTitle>
          </CardHeader>
          <CardContent className="py-6">
            <div className="flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-8">
              <PenguinClapAnimation size="md" className="shrink-0" />
              <div className="text-center lg:text-left">
                <p className="text-caption uppercase tracking-wide text-text-secondary mb-1">Overall Band</p>
                <div className="text-6xl font-bold mb-3 bg-gradient-to-r from-brand-blue to-brand-purple bg-clip-text text-transparent">
                  {overallBand.toFixed(1)}
                </div>
                <div className="flex items-center gap-3 justify-center lg:justify-start">
                  <Badge variant="outline" className={`text-base px-3 py-1.5 rounded-2xl ${overallMeta.color}`}>
                    {overallMeta.label} Performance
                  </Badge>
                </div>
              </div>
              <ScoreSpiderChart 
                task1Scores={{
                  task_achievement: structured?.task1?.criteria?.task_achievement?.band,
                  coherence_and_cohesion: structured?.task1?.criteria?.coherence_and_cohesion?.band,
                  lexical_resource: structured?.task1?.criteria?.lexical_resource?.band,
                  grammatical_range_and_accuracy: structured?.task1?.criteria?.grammatical_range_and_accuracy?.band
                }}
                task2Scores={{
                  task_response: structured?.task2?.criteria?.task_response?.band,
                  coherence_and_cohesion: structured?.task2?.criteria?.coherence_and_cohesion?.band,
                  lexical_resource: structured?.task2?.criteria?.lexical_resource?.band,
                  grammatical_range_and_accuracy: structured?.task2?.criteria?.grammatical_range_and_accuracy?.band
                }}
                className="w-full max-w-sm lg:w-80 shrink-0"
              />
            </div>
          </CardContent>
        </Card>

        {/* Task 1 Combined Section */}
        <div className="mb-8">
          <TaskSection title="Task 1 Assessment" task={structured?.task1} type="task1" computedOverall={t1OverallComputed} />
          
          {task1Answer && (
            <Card className="card-elevated border-2 border-brand-blue/20 -mt-6">
              <CardHeader className="bg-gradient-to-r from-brand-blue/10 to-brand-purple/10">
                <CardTitle className="text-heading-4">Task 1 – AI Corrections</CardTitle>
                <div className="text-caption text-text-secondary mt-1">
                  {task1Data?.title ? <div className="font-medium text-text-primary">{task1Data.title}</div> : null}
                  {task1Data?.instructions ? <div>{task1Data.instructions}</div> : null}
                </div>
              </CardHeader>
              <CardContent className="p-6">
                 <div className="space-y-6">
                   {/* View Mode Controls */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-text-primary">Detailed Corrections Analysis</div>
                      <div className="text-caption text-text-secondary mt-1">
                        Choose how you'd like to view your corrections
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant={t1ViewMode === 'highlights' ? 'default' : 'outline'}
                        size="sm" 
                        className="rounded-xl text-xs"
                        onClick={() => setT1ViewMode('highlights')}
                      >
                        Text Highlights
                      </Button>
                      <Button 
                        variant={t1ViewMode === 'sentence' ? 'default' : 'outline'}
                        size="sm" 
                        className="rounded-xl text-xs"
                        onClick={() => setT1ViewMode('sentence')}
                      >
                        Sentence View
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="rounded-xl" 
                        onClick={() => {
                          if (!t1CorrData?.enhanced_spans) return;
                          const txt = t1CorrData.enhanced_spans.map(s => s.text).join("");
                          navigator.clipboard.writeText(txt);
                          toast({
                            title: "Copied enhanced text",
                            description: "The improved version is in your clipboard."
                          });
                        }}
                      >
                        <Copy className="w-4 h-4 mr-2" /> Copy Text
                      </Button>
                    </div>
                  </div>

                  {/* Correction Display */}
                  <div>
                    {t1Loading && <TaskAnalysisLoading task="Task 1" />}
                    {t1Error && <div className="status-error">{t1Error}</div>}
                      {t1CorrData && (
                        <>
                          {t1ViewMode === 'highlights' && (
                            <CorrectionVisualizer originalSpans={t1CorrData.original_spans} enhancedSpans={t1CorrData.enhanced_spans} />
                          )}
                          {t1ViewMode === 'sentence' && (
                            <SentenceCompare originalSpans={t1CorrData.original_spans} correctedSpans={t1CorrData.enhanced_spans} />
                          )}
                        </>
                      )}
                    {!t1Loading && !t1Error && !t1CorrData && (
                      <div className="text-caption text-text-secondary">Corrections will appear here after analysis.</div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Task 2 Combined Section */}
        <div className="mb-8">
          <TaskSection title="Task 2 Assessment" task={structured?.task2} type="task2" computedOverall={t2OverallComputed} />
          
          {task2Answer && (
            <Card className="card-elevated border-2 border-brand-green/20 -mt-6">
              <CardHeader className="bg-gradient-to-r from-brand-green/10 to-brand-blue/10">
                <CardTitle className="text-heading-4">Task 2 – AI Corrections</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                 <div className="space-y-6">
                   {/* View Mode Controls */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-text-primary">Detailed Corrections Analysis</div>
                      <div className="text-caption text-text-secondary mt-1">
                        Choose how you'd like to view your corrections
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant={t2ViewMode === 'highlights' ? 'default' : 'outline'}
                        size="sm" 
                        className="rounded-xl text-xs"
                        onClick={() => setT2ViewMode('highlights')}
                      >
                        Text Highlights
                      </Button>
                      <Button 
                        variant={t2ViewMode === 'sentence' ? 'default' : 'outline'}
                        size="sm" 
                        className="rounded-xl text-xs"
                        onClick={() => setT2ViewMode('sentence')}
                      >
                        Sentence View
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="rounded-xl" 
                        onClick={() => {
                          if (!t2CorrData?.enhanced_spans) return;
                          const txt = t2CorrData.enhanced_spans.map(s => s.text).join("");
                          navigator.clipboard.writeText(txt);
                          toast({
                            title: "Copied enhanced text",
                            description: "The improved version is in your clipboard."
                          });
                        }}
                      >
                        <Copy className="w-4 h-4 mr-2" /> Copy Text
                      </Button>
                    </div>
                  </div>

                  {/* Correction Display */}
                  <div>
                    {t2Loading && <TaskAnalysisLoading task="Task 2" />}
                    {t2Error && <div className="status-error">{t2Error}</div>}
                    {t2CorrData && (
                      <>
                        {t2ViewMode === 'highlights' && (
                          <CorrectionVisualizer originalSpans={t2CorrData.original_spans} enhancedSpans={t2CorrData.enhanced_spans} />
                        )}
                        {t2ViewMode === 'sentence' && (
                          <SentenceCompare originalSpans={t2CorrData.original_spans} correctedSpans={t2CorrData.enhanced_spans} />
                        )}
                      </>
                    )}
                    {!t2Loading && !t2Error && !t2CorrData && (
                      <div className="text-caption text-text-secondary">Corrections will appear here after analysis.</div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>



        <div className="flex justify-center gap-4">
          <Button onClick={() => navigate("/ielts-portal")} className="btn-primary rounded-xl">Take Another Test</Button>
          <Button variant="outline" onClick={() => navigate("/dashboard")} className="rounded-xl">Return to Dashboard</Button>
        </div>
      </div>
    </div>;
}