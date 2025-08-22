import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import LightRays from "@/components/animations/LightRays";
import { ArrowLeft, Copy, HelpCircle } from "lucide-react";
import PenguinClapAnimation from "@/components/animations/PenguinClapAnimation";
import { supabase } from "@/integrations/supabase/client";
import CorrectionVisualizer, { Span as CorrectionSpan } from "@/components/CorrectionVisualizer";
import SentenceCompare from "@/components/SentenceCompare";
import { Toggle } from "@/components/ui/toggle";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
    original_spans: CorrectionSpan[];
    corrected_spans: CorrectionSpan[];
  } | null>(null);
  const [t2CorrData, setT2CorrData] = useState<{
    original_spans: CorrectionSpan[];
    corrected_spans: CorrectionSpan[];
  } | null>(null);
  const [t1SentenceView, setT1SentenceView] = useState(false);
  const [t2SentenceView, setT2SentenceView] = useState(false);
  const [learnMoreModal, setLearnMoreModal] = useState<{
    open: boolean;
    criterion: string;
    title: string;
  }>({ open: false, criterion: '', title: '' });

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
      // Get test result
      const { data: testResult, error: testError } = await supabase
        .from('test_results')
        .select('*')
        .eq('id', submissionId)
        .eq('user_id', user?.id)
        .single();

      if (testError) throw testError;

      // Get writing results
      const { data: writingResults, error: writingError } = await supabase
        .from('writing_test_results')
        .select('*')
        .eq('test_result_id', submissionId)
        .eq('user_id', user?.id)
        .order('task_number');

      if (writingError) throw writingError;

      if (!writingResults || writingResults.length !== 2) {
        throw new Error('Incomplete test results found');
      }

      const task1Result = writingResults.find(r => r.task_number === 1);
      const task2Result = writingResults.find(r => r.task_number === 2);

      // Reconstruct structured data from database
      const reconstructedData = {
        structured: {
          task1: {
            criteria: (task1Result?.band_scores as any) || {},
            feedback_markdown: task1Result?.detailed_feedback || '',
            feedback: {
              improvements: task1Result?.improvement_suggestions || []
            }
          },
          task2: {
            criteria: (task2Result?.band_scores as any) || {},
            feedback_markdown: task2Result?.detailed_feedback || '',
            feedback: {
              improvements: task2Result?.improvement_suggestions || []
            }
          },
          overall: {
            band: (testResult as any).overall_score || 7.0
          }
        },
        testName: testResult.test_type || 'IELTS Writing Test',
        task1Answer: task1Result?.user_response || '',
        task2Answer: task2Result?.user_response || '',
        task1Data: {
          title: 'Task 1',
          instructions: task1Result?.prompt_text || ''
        },
        task2Data: {
          title: 'Task 2', 
          instructions: task2Result?.prompt_text || ''
        }
      };

      setResultsData(reconstructedData);
    } catch (error) {
      console.error('Error fetching results:', error);
      toast({
        title: "Error",
        description: "Failed to load test results",
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

  useEffect(() => {
    const run = async () => {
      const tasks: Promise<any>[] = [];
      if (task1Answer && !t1CorrData && !t1Loading) {
        setT1Loading(true);
        setT1Error(null);
        const prompt1 = `${task1Data?.title ? `Title: ${task1Data.title}\n` : ''}${task1Data?.instructions ? `Instructions: ${task1Data.instructions}` : ''}`.trim();
        tasks.push(supabase.functions.invoke('analyze-writing-correction', {
          body: {
            userSubmission: task1Answer,
            questionPrompt: prompt1
          }
        }).then(({
          data,
          error
        }) => {
          if (error) throw error;
          if (data && Array.isArray(data.original_spans) && Array.isArray(data.corrected_spans)) {
            setT1CorrData({
              original_spans: data.original_spans,
              corrected_spans: data.corrected_spans
            });
          } else {
            setT1Error('No correction data returned for Task 1.');
          }
        }).catch((e: any) => setT1Error(e?.message || 'Failed to analyze Task 1')).finally(() => setT1Loading(false)));
      }
      if (task2Answer && !t2CorrData && !t2Loading) {
        setT2Loading(true);
        setT2Error(null);
        const prompt2 = `${task2Data?.title ? `Title: ${task2Data.title}\n` : ''}${task2Data?.instructions ? `Instructions: ${task2Data.instructions}` : ''}`.trim();
        tasks.push(supabase.functions.invoke('analyze-writing-correction', {
          body: {
            userSubmission: task2Answer,
            questionPrompt: prompt2
          }
        }).then(({
          data,
          error
        }) => {
          if (error) throw error;
          if (data && Array.isArray(data.original_spans) && Array.isArray(data.corrected_spans)) {
            setT2CorrData({
              original_spans: data.original_spans,
              corrected_spans: data.corrected_spans
            });
          } else {
            setT2Error('No correction data returned for Task 2.');
          }
        }).catch((e: any) => setT2Error(e?.message || 'Failed to analyze Task 2')).finally(() => setT2Loading(false)));
      }
      if (tasks.length) {
        await Promise.allSettled(tasks);
      }
    };
    run();
  }, [task1Answer, task2Answer, task1Data, task2Data, t1CorrData, t2CorrData, t1Loading, t2Loading]);

// Add validation for structured data
const hasValidData = structured && (structured.task1 || structured.task2);

// Early return with error UI if no structured data
if (!hasValidData) {
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
  errors: t1CorrData?.original_spans.filter(s => s.status === 'error').length ?? 0,
  improvements: t1CorrData?.corrected_spans.filter(s => s.status === 'improvement').length ?? 0
};
const t2Counts = {
  errors: t2CorrData?.original_spans.filter(s => s.status === 'error').length ?? 0,
  improvements: t2CorrData?.corrected_spans.filter(s => s.status === 'improvement').length ?? 0
};

// Helper function to copy highlighted text as HTML
const copyWithHighlights = (correctedSpans: CorrectionSpan[], taskNumber: number) => {
  const html = correctedSpans.map(span => {
    if (span.status === 'improvement') {
      return `<strong style="background-color: #22c55e; color: white; padding: 2px 4px; border-radius: 4px;">${span.text}</strong>`;
    }
    return span.text;
  }).join('');

  const htmlContent = `<!DOCTYPE html><html><body>${html}</body></html>`;
  
  if (navigator.clipboard && navigator.clipboard.write) {
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const clipboardItem = new ClipboardItem({ 'text/html': blob });
    navigator.clipboard.write([clipboardItem]).then(() => {
      toast({
        title: "Copied with highlights",
        description: `Task ${taskNumber} text copied with improvements highlighted. Paste into Google Docs, Word, or Notion to see highlights.`
      });
    }).catch(() => {
      // Fallback to plain text
      const plainText = correctedSpans.map(s => s.text).join('');
      navigator.clipboard.writeText(plainText);
      toast({
        title: "Copied as plain text",
        description: "Highlights not supported on this device. Plain text copied instead."
      });
    });
  }
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
                  <div className="flex items-center gap-2">
                    <Dialog open={learnMoreModal.open && learnMoreModal.criterion === it.label} onOpenChange={(open) => setLearnMoreModal(prev => ({ ...prev, open }))}>
                      <DialogTrigger asChild>
                        <button 
                          className="font-medium text-text-primary hover:text-primary transition-colors underline decoration-dotted cursor-pointer flex items-center gap-1"
                          onClick={() => setLearnMoreModal({ open: true, criterion: it.label, title: it.label })}
                        >
                          {it.label}
                          <HelpCircle className="w-3 h-3 opacity-60" />
                        </button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle className="text-xl">{it.label} - Learning Guide</DialogTitle>
                        </DialogHeader>
                        <div className="mt-4 space-y-6">
                          {it.label === "Task Achievement" && (
                            <>
                              <div>
                                <h3 className="text-lg font-semibold mb-3 text-primary">What is Task Achievement?</h3>
                                <p className="text-text-secondary mb-4">
                                  Task Achievement measures how well you address the specific requirements of Task 1. This includes accurately describing visual information, identifying key trends, and presenting data clearly and logically.
                                </p>
                              </div>

                              <div>
                                <h3 className="text-lg font-semibold mb-3 text-primary">Band Score Criteria</h3>
                                <div className="space-y-3">
                                  <div className="bg-green-50 p-3 rounded-lg border-l-4 border-green-500">
                                    <strong className="text-green-800">Band 9-8:</strong> Fully satisfies all requirements, clearly presents and highlights key features with relevant, extended and supported ideas
                                  </div>
                                  <div className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-500">
                                    <strong className="text-blue-800">Band 7-6:</strong> Covers requirements adequately, presents key features clearly with some extension and support
                                  </div>
                                  <div className="bg-orange-50 p-3 rounded-lg border-l-4 border-orange-500">
                                    <strong className="text-orange-800">Band 5-4:</strong> Generally addresses requirements, presents but inadequately covers key features
                                  </div>
                                </div>
                              </div>

                              <div>
                                <h3 className="text-lg font-semibold mb-3 text-primary">Key Improvement Strategies</h3>
                                <ul className="list-disc pl-6 space-y-2 text-text-secondary">
                                  <li><strong>Identify the main trends:</strong> Always start by identifying the most significant patterns or changes in the data</li>
                                  <li><strong>Use specific data:</strong> Include precise figures, percentages, and dates from the visual</li>
                                  <li><strong>Group similar information:</strong> Organize data logically rather than describing every detail</li>
                                  <li><strong>Write a clear overview:</strong> Summarize 2-3 main features in your overview paragraph</li>
                                  <li><strong>Stay objective:</strong> Describe what you see without giving opinions or explanations</li>
                                </ul>
                              </div>

                              <div>
                                <h3 className="text-lg font-semibold mb-3 text-primary">Common Mistakes to Avoid</h3>
                                <ul className="list-disc pl-6 space-y-2 text-text-secondary">
                                  <li>Copying the question word-for-word in your introduction</li>
                                  <li>Including irrelevant information not shown in the visual</li>
                                  <li>Describing every single detail instead of focusing on key features</li>
                                  <li>Adding personal opinions or explanations for the data</li>
                                  <li>Writing under 150 words or significantly over 200 words</li>
                                </ul>
                              </div>
                            </>
                          )}

                          {it.label === "Task Response" && (
                            <>
                              <div>
                                <h3 className="text-lg font-semibold mb-3 text-primary">What is Task Response?</h3>
                                <p className="text-text-secondary mb-4">
                                  Task Response evaluates how well you address the Task 2 question. This includes presenting a clear position, developing arguments with relevant examples, and covering all parts of the question appropriately.
                                </p>
                              </div>

                              <div>
                                <h3 className="text-lg font-semibold mb-3 text-primary">Band Score Criteria</h3>
                                <div className="space-y-3">
                                  <div className="bg-green-50 p-3 rounded-lg border-l-4 border-green-500">
                                    <strong className="text-green-800">Band 9-8:</strong> Fully addresses all parts with well-developed response, clear position throughout, relevant and extended ideas
                                  </div>
                                  <div className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-500">
                                    <strong className="text-blue-800">Band 7-6:</strong> Addresses all parts, clear position and main ideas, mostly relevant ideas with some development
                                  </div>
                                  <div className="bg-orange-50 p-3 rounded-lg border-l-4 border-orange-500">
                                    <strong className="text-orange-800">Band 5-4:</strong> Addresses the task partially, unclear position, limited development of ideas
                                  </div>
                                </div>
                              </div>

                              <div>
                                <h3 className="text-lg font-semibold mb-3 text-primary">Key Improvement Strategies</h3>
                                <ul className="list-disc pl-6 space-y-2 text-text-secondary">
                                  <li><strong>Analyze the question carefully:</strong> Identify exactly what you're being asked to do (discuss, agree/disagree, advantages/disadvantages, etc.)</li>
                                  <li><strong>Take a clear position:</strong> State your opinion clearly in the introduction and maintain it throughout</li>
                                  <li><strong>Address all parts:</strong> Make sure you respond to every aspect of the question</li>
                                  <li><strong>Develop your ideas:</strong> Support each main point with explanations, examples, or evidence</li>
                                  <li><strong>Use relevant examples:</strong> Include specific, realistic examples that support your arguments</li>
                                  <li><strong>Write 250+ words:</strong> Ensure you meet the minimum word requirement with well-developed content</li>
                                </ul>
                              </div>

                              <div>
                                <h3 className="text-lg font-semibold mb-3 text-primary">Question Types & Approaches</h3>
                                <div className="space-y-3">
                                  <div className="bg-surface-3 p-3 rounded-lg">
                                    <strong>Opinion Essays:</strong> State your position clearly and provide 2-3 supporting arguments
                                  </div>
                                  <div className="bg-surface-3 p-3 rounded-lg">
                                    <strong>Discussion Essays:</strong> Present both sides fairly, then give your own view
                                  </div>
                                  <div className="bg-surface-3 p-3 rounded-lg">
                                    <strong>Advantage/Disadvantage:</strong> Discuss both sides with specific examples
                                  </div>
                                  <div className="bg-surface-3 p-3 rounded-lg">
                                    <strong>Problem/Solution:</strong> Identify causes clearly, then propose realistic solutions
                                  </div>
                                </div>
                              </div>
                            </>
                          )}

                          {it.label === "Coherence & Cohesion" && (
                            <>
                              <div>
                                <h3 className="text-lg font-semibold mb-3 text-primary">What is Coherence & Cohesion?</h3>
                                <p className="text-text-secondary mb-4">
                                  Coherence refers to how logically your ideas flow and connect, while cohesion involves the language devices (linking words, pronouns, etc.) that bind your text together. Together, they make your writing easy to follow and understand.
                                </p>
                              </div>

                              <div>
                                <h3 className="text-lg font-semibold mb-3 text-primary">Band Score Criteria</h3>
                                <div className="space-y-3">
                                  <div className="bg-green-50 p-3 rounded-lg border-l-4 border-green-500">
                                    <strong className="text-green-800">Band 9-8:</strong> Logically sequences information, uses cohesive devices effectively, clear paragraphing
                                  </div>
                                  <div className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-500">
                                    <strong className="text-blue-800">Band 7-6:</strong> Information logically arranged, good use of cohesive devices, clear central topic in paragraphs
                                  </div>
                                  <div className="bg-orange-50 p-3 rounded-lg border-l-4 border-orange-500">
                                    <strong className="text-orange-800">Band 5-4:</strong> Some organization present, limited cohesive devices, unclear paragraphing
                                  </div>
                                </div>
                              </div>

                              <div>
                                <h3 className="text-lg font-semibold mb-3 text-primary">Essential Linking Words & Phrases</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="bg-surface-3 p-3 rounded-lg">
                                    <strong className="text-primary">Addition:</strong>
                                    <p className="text-sm">Furthermore, Moreover, Additionally, In addition, Also</p>
                                  </div>
                                  <div className="bg-surface-3 p-3 rounded-lg">
                                    <strong className="text-primary">Contrast:</strong>
                                    <p className="text-sm">However, Nevertheless, On the other hand, Conversely, Despite</p>
                                  </div>
                                  <div className="bg-surface-3 p-3 rounded-lg">
                                    <strong className="text-primary">Examples:</strong>
                                    <p className="text-sm">For instance, For example, Such as, Namely, Particularly</p>
                                  </div>
                                  <div className="bg-surface-3 p-3 rounded-lg">
                                    <strong className="text-primary">Conclusion:</strong>
                                    <p className="text-sm">Therefore, Consequently, As a result, In conclusion, Overall</p>
                                  </div>
                                </div>
                              </div>

                              <div>
                                <h3 className="text-lg font-semibold mb-3 text-primary">Paragraph Structure Tips</h3>
                                <ul className="list-disc pl-6 space-y-2 text-text-secondary">
                                  <li><strong>Clear topic sentences:</strong> Start each paragraph with a sentence that introduces the main idea</li>
                                  <li><strong>Logical progression:</strong> Arrange supporting sentences in a logical order</li>
                                  <li><strong>Use pronouns effectively:</strong> Replace repeated nouns with appropriate pronouns (this, these, they, it)</li>
                                  <li><strong>Vary your transitions:</strong> Don't overuse the same linking words; use a variety</li>
                                  <li><strong>Reference previous ideas:</strong> Connect new information to what you've already discussed</li>
                                </ul>
                              </div>

                              <div>
                                <h3 className="text-lg font-semibold mb-3 text-primary">Common Coherence Issues</h3>
                                <ul className="list-disc pl-6 space-y-2 text-text-secondary">
                                  <li>Ideas that don't connect logically to each other</li>
                                  <li>Overusing simple connectors like "and," "but," "so"</li>
                                  <li>Paragraphs without clear central ideas</li>
                                  <li>Jumping between topics without smooth transitions</li>
                                  <li>Unclear pronoun references</li>
                                </ul>
                              </div>
                            </>
                          )}

                          {it.label === "Lexical Resource" && (
                            <>
                              <div>
                                <h3 className="text-lg font-semibold mb-3 text-primary">What is Lexical Resource?</h3>
                                <p className="text-text-secondary mb-4">
                                  Lexical Resource evaluates your vocabulary range, accuracy, and appropriateness. This includes using varied vocabulary, precise word choices, correct collocations, and appropriate formal/informal register.
                                </p>
                              </div>

                              <div>
                                <h3 className="text-lg font-semibold mb-3 text-primary">Band Score Criteria</h3>
                                <div className="space-y-3">
                                  <div className="bg-green-50 p-3 rounded-lg border-l-4 border-green-500">
                                    <strong className="text-green-800">Band 9-8:</strong> Wide range of vocabulary, natural and sophisticated usage, rare minor errors
                                  </div>
                                  <div className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-500">
                                    <strong className="text-blue-800">Band 7-6:</strong> Good range of vocabulary, some awareness of style and collocation, occasional errors
                                  </div>
                                  <div className="bg-orange-50 p-3 rounded-lg border-l-4 border-orange-500">
                                    <strong className="text-orange-800">Band 5-4:</strong> Limited range, errors in word choice and formation may impede meaning
                                  </div>
                                </div>
                              </div>

                              <div>
                                <h3 className="text-lg font-semibold mb-3 text-primary">Improvement Strategies</h3>
                                <ul className="list-disc pl-6 space-y-2 text-text-secondary">
                                  <li><strong>Learn collocations:</strong> Study word combinations (make progress, take measures, strong possibility)</li>
                                  <li><strong>Use synonyms appropriately:</strong> Avoid repeating key words, but ensure synonyms fit the context</li>
                                  <li><strong>Learn topic-specific vocabulary:</strong> Build vocabulary around common IELTS topics (environment, technology, education)</li>
                                  <li><strong>Practice paraphrasing:</strong> Rephrase ideas using different vocabulary and structures</li>
                                  <li><strong>Use precise word forms:</strong> Ensure correct noun/adjective/verb forms (economy/economic/economical)</li>
                                  <li><strong>Avoid overly complex words:</strong> Use sophisticated vocabulary only when you're confident it's correct</li>
                                </ul>
                              </div>

                              <div>
                                <h3 className="text-lg font-semibold mb-3 text-primary">Useful Academic Vocabulary</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="bg-surface-3 p-3 rounded-lg">
                                    <strong className="text-primary">Trend Description:</strong>
                                    <p className="text-sm">Increase: surge, soar, climb, escalate</p>
                                    <p className="text-sm">Decrease: plummet, decline, drop, diminish</p>
                                  </div>
                                  <div className="bg-surface-3 p-3 rounded-lg">
                                    <strong className="text-primary">Opinion Expression:</strong>
                                    <p className="text-sm">Assert, contend, maintain, advocate, propose</p>
                                  </div>
                                  <div className="bg-surface-3 p-3 rounded-lg">
                                    <strong className="text-primary">Cause & Effect:</strong>
                                    <p className="text-sm">Trigger, generate, stem from, result in, contribute to</p>
                                  </div>
                                  <div className="bg-surface-3 p-3 rounded-lg">
                                    <strong className="text-primary">Emphasis:</strong>
                                    <p className="text-sm">Particularly, notably, significantly, considerably, substantially</p>
                                  </div>
                                </div>
                              </div>

                              <div>
                                <h3 className="text-lg font-semibold mb-3 text-primary">Common Lexical Errors</h3>
                                <ul className="list-disc pl-6 space-y-2 text-text-secondary">
                                  <li><strong>Word formation errors:</strong> "Increasement" instead of "increase"</li>
                                  <li><strong>Wrong collocations:</strong> "Do a mistake" instead of "make a mistake"</li>
                                  <li><strong>Inappropriate register:</strong> Using informal words in formal essays</li>
                                  <li><strong>Overusing basic words:</strong> "Good," "bad," "big" instead of precise alternatives</li>
                                  <li><strong>Incorrect prepositions:</strong> "Depend from" instead of "depend on"</li>
                                </ul>
                              </div>
                            </>
                          )}

                          {it.label === "Grammar Range & Accuracy" && (
                            <>
                              <div>
                                <h3 className="text-lg font-semibold mb-3 text-primary">What is Grammatical Range & Accuracy?</h3>
                                <p className="text-text-secondary mb-4">
                                  This criterion evaluates both the variety of grammatical structures you use and how accurately you use them. Higher bands require complex structures used correctly, while lower bands may have simpler structures with more errors.
                                </p>
                              </div>

                              <div>
                                <h3 className="text-lg font-semibold mb-3 text-primary">Band Score Criteria</h3>
                                <div className="space-y-3">
                                  <div className="bg-green-50 p-3 rounded-lg border-l-4 border-green-500">
                                    <strong className="text-green-800">Band 9-8:</strong> Wide range of structures, majority error-free, errors are rare and minor
                                  </div>
                                  <div className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-500">
                                    <strong className="text-blue-800">Band 7-6:</strong> Good range of complex structures, many error-free sentences, good control overall
                                  </div>
                                  <div className="bg-orange-50 p-3 rounded-lg border-l-4 border-orange-500">
                                    <strong className="text-orange-800">Band 5-4:</strong> Limited range, attempts complex structures, errors may impede communication
                                  </div>
                                </div>
                              </div>

                              <div>
                                <h3 className="text-lg font-semibold mb-3 text-primary">Essential Complex Structures</h3>
                                <div className="space-y-4">
                                  <div className="bg-surface-3 p-4 rounded-lg">
                                    <strong className="text-primary">Conditional Sentences:</strong>
                                    <p className="text-sm mt-1">"If governments invested more in education, literacy rates would improve significantly."</p>
                                  </div>
                                  <div className="bg-surface-3 p-4 rounded-lg">
                                    <strong className="text-primary">Relative Clauses:</strong>
                                    <p className="text-sm mt-1">"People who work from home often report higher job satisfaction."</p>
                                  </div>
                                  <div className="bg-surface-3 p-4 rounded-lg">
                                    <strong className="text-primary">Passive Voice:</strong>
                                    <p className="text-sm mt-1">"The data was collected over a five-year period by researchers."</p>
                                  </div>
                                  <div className="bg-surface-3 p-4 rounded-lg">
                                    <strong className="text-primary">Participle Clauses:</strong>
                                    <p className="text-sm mt-1">"Having analyzed the trends, we can conclude that technology usage is increasing."</p>
                                  </div>
                                </div>
                              </div>

                              <div>
                                <h3 className="text-lg font-semibold mb-3 text-primary">Grammar Improvement Tips</h3>
                                <ul className="list-disc pl-6 space-y-2 text-text-secondary">
                                  <li><strong>Master tense consistency:</strong> Keep tenses logical and consistent throughout your essay</li>
                                  <li><strong>Use a variety of sentence lengths:</strong> Mix simple, compound, and complex sentences</li>
                                  <li><strong>Practice advanced structures:</strong> Incorporate conditionals, relative clauses, and passive voice naturally</li>
                                  <li><strong>Check subject-verb agreement:</strong> Ensure singular/plural agreement, especially with complex subjects</li>
                                  <li><strong>Use modal verbs effectively:</strong> Should, could, might, may for expressing probability and necessity</li>
                                  <li><strong>Proofread carefully:</strong> Check for articles (a, an, the), prepositions, and word order</li>
                                </ul>
                              </div>

                              <div>
                                <h3 className="text-lg font-semibold mb-3 text-primary">Common Grammar Errors to Avoid</h3>
                                <div className="space-y-3">
                                  <div className="bg-red-50 p-3 rounded-lg border-l-4 border-red-400">
                                    <strong className="text-red-800">Article Errors:</strong> Missing "the" before specific nouns, unnecessary articles
                                  </div>
                                  <div className="bg-red-50 p-3 rounded-lg border-l-4 border-red-400">
                                    <strong className="text-red-800">Subject-Verb Agreement:</strong> "The number of students are" should be "The number of students is"
                                  </div>
                                  <div className="bg-red-50 p-3 rounded-lg border-l-4 border-red-400">
                                    <strong className="text-red-800">Incomplete Sentences:</strong> Fragments without main verbs or subjects
                                  </div>
                                  <div className="bg-red-50 p-3 rounded-lg border-l-4 border-red-400">
                                    <strong className="text-red-800">Run-on Sentences:</strong> Multiple ideas without proper punctuation or conjunctions
                                  </div>
                                </div>
                              </div>

                              <div>
                                <h3 className="text-lg font-semibold mb-3 text-primary">Practice Exercises</h3>
                                <ul className="list-disc pl-6 space-y-2 text-text-secondary">
                                  <li>Write sentences using different conditional forms (first, second, third conditional)</li>
                                  <li>Practice combining simple sentences into complex ones using relative pronouns</li>
                                  <li>Convert active sentences to passive voice and vice versa</li>
                                  <li>Write paragraphs focusing on one grammar structure at a time</li>
                                  <li>Use grammar checking tools to identify patterns in your errors</li>
                                </ul>
                              </div>
                            </>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <div className="bg-primary/10 text-primary font-bold text-lg px-3 py-1.5 rounded-full border border-primary/20">
                    {typeof it.value === "number" ? roundIELTS(it.value).toFixed(1) : "-"}
                  </div>
                </div>
                {it.just ? (
                  <div className="mt-2">
                    <p className="text-[11px] uppercase tracking-wide text-text-tertiary mb-1">Criteria-specific feedback</p>
                    <p className="text-sm text-text-secondary">{it.just}</p>
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
              <p className="text-caption">{testName}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 space-section">
        <Card className="card-elevated mb-8 overflow-hidden">
          <CardHeader className="text-center bg-gradient-to-r from-brand-blue/10 to-brand-purple/10 py-4">
            <CardTitle className="text-heading-3">Overall Writing Band Score</CardTitle>
          </CardHeader>
          <CardContent className="py-6">
            <div className="flex flex-col md:flex-row items-center md:items-center justify-center gap-6 md:gap-10">
              <PenguinClapAnimation size="md" className="shrink-0" />
              <div className="text-center md:text-left">
                <p className="text-caption uppercase tracking-wide text-text-secondary mb-1">Overall Band</p>
                <div className="text-6xl font-bold mb-2 bg-gradient-to-r from-brand-blue to-brand-purple bg-clip-text text-transparent">
                  {overallBand.toFixed(1)}
                </div>
                <div className="text-sm text-text-secondary mb-3">
                  Task 1: {!Number.isNaN(t1OverallComputed) ? roundIELTS(t1OverallComputed).toFixed(1) : "N/A"} | Task 2: {!Number.isNaN(t2OverallComputed) ? roundIELTS(t2OverallComputed).toFixed(1) : "N/A"}
                </div>
                <div className="flex items-center gap-3 justify-center md:justify-start">
                  <Badge variant="outline" className={`text-base px-3 py-1.5 rounded-2xl ${overallMeta.color}`}>
                    {overallMeta.label} Performance
                  </Badge>
                  {testName ? <span className="text-caption text-text-secondary">{testName}</span> : null}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <TaskSection title="Task 1 Assessment" task={structured?.task1} type="task1" computedOverall={t1OverallComputed} />
        <TaskSection title="Task 2 Assessment" task={structured?.task2} type="task2" computedOverall={t2OverallComputed} />

        {task1Answer ? <Card className="card-elevated mb-8 border-2 border-brand-blue/20">
            <CardHeader className="bg-gradient-to-r from-brand-blue/10 to-brand-purple/10">
              <CardTitle className="text-heading-3">Task 1 – AI Corrections</CardTitle>
              <div className="text-caption text-text-secondary mt-1">
                {task1Data?.title ? <div className="font-medium text-text-primary">{task1Data.title}</div> : null}
                {task1Data?.instructions ? <div>{task1Data.instructions}</div> : null}
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="mb-4 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-text-primary">Your Answer (AI corrections)</div>
                    <div className="text-caption text-text-secondary flex flex-wrap items-center gap-3 mt-1">
                      
                      
                      
                      
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Toggle pressed={t1SentenceView} onPressedChange={setT1SentenceView} className="rounded-xl data-[state=on]:bg-brand-blue/20 data-[state=on]:text-brand-blue" aria-label="Toggle sentence-by-sentence view">
                      Sentence-by-sentence view
                    </Toggle>
                    <Button variant="outline" size="sm" className="rounded-xl" onClick={() => {
                  if (!t1CorrData?.corrected_spans) return;
                  const txt = t1CorrData.corrected_spans.map(s => s.text).join("");
                  navigator.clipboard.writeText(txt);
                  toast({
                    title: "Copied corrected text",
                    description: "The improved version is in your clipboard."
                  });
                }}>
                      <Copy className="w-4 h-4 mr-2" /> Copy corrected text
                    </Button>
                    <Button variant="outline" size="sm" className="rounded-xl" onClick={() => {
                  if (!t1CorrData?.corrected_spans) return;
                  copyWithHighlights(t1CorrData.corrected_spans, 1);
                }}>
                      <Copy className="w-4 h-4 mr-2" /> Copy with Highlights
                    </Button>
                  </div>
                </div>
                <div>
                  {t1Loading && <div className="status-warning">Analyzing Task 1…</div>}
                  {t1Error && <div className="status-error">{t1Error}</div>}
                  {t1CorrData && (t1SentenceView ? <SentenceCompare originalSpans={t1CorrData.original_spans} correctedSpans={t1CorrData.corrected_spans} /> : <CorrectionVisualizer originalSpans={t1CorrData.original_spans} correctedSpans={t1CorrData.corrected_spans} />)}
                  {!t1Loading && !t1Error && !t1CorrData && <div className="text-caption text-text-secondary">Corrections will appear here after analysis.</div>}
                </div>
              </div>
            </CardContent>
          </Card> : null}

        {task2Answer ? <Card className="card-elevated mb-8 border-2 border-brand-green/20">
            <CardHeader className="bg-gradient-to-r from-brand-green/10 to-brand-blue/10">
              <CardTitle className="text-heading-3">Task 2 – AI Corrections</CardTitle>
              
            </CardHeader>
            <CardContent className="p-6">
              <div className="mb-4 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-text-primary">Your Answer (AI corrections)</div>
                    <div className="text-caption text-text-secondary flex flex-wrap items-center gap-3 mt-1">
                      <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-brand-red/40 border border-brand-red/60" /> Error</span>
                      <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-brand-green/40 border border-brand-green/60" /> Improvement</span>
                      <Badge variant="outline" className="rounded-xl">{t2Counts.improvements} improvements</Badge>
                      <Badge variant="outline" className="rounded-xl">{t2Counts.errors} errors</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Toggle pressed={t2SentenceView} onPressedChange={setT2SentenceView} className="rounded-xl data-[state=on]:bg-brand-blue/20 data-[state=on]:text-brand-blue" aria-label="Toggle sentence-by-sentence view">
                      Sentence-by-sentence view
                    </Toggle>
                     <Button variant="outline" size="sm" className="rounded-xl" onClick={() => {
                  if (!t2CorrData?.corrected_spans) return;
                  const txt = t2CorrData.corrected_spans.map(s => s.text).join("");
                  navigator.clipboard.writeText(txt);
                  toast({
                    title: "Copied corrected text",
                    description: "The improved version is in your clipboard."
                  });
                }}>
                      <Copy className="w-4 h-4 mr-2" /> Copy corrected text
                    </Button>
                    <Button variant="outline" size="sm" className="rounded-xl" onClick={() => {
                  if (!t2CorrData?.corrected_spans) return;
                  copyWithHighlights(t2CorrData.corrected_spans, 2);
                }}>
                      <Copy className="w-4 h-4 mr-2" /> Copy with Highlights
                    </Button>
                  </div>
                </div>
                <div>
                  {t2Loading && <div className="status-warning">Analyzing Task 2…</div>}
                  {t2Error && <div className="status-error">{t2Error}</div>}
                  {t2CorrData && (t2SentenceView ? <SentenceCompare originalSpans={t2CorrData.original_spans} correctedSpans={t2CorrData.corrected_spans} /> : <CorrectionVisualizer originalSpans={t2CorrData.original_spans} correctedSpans={t2CorrData.corrected_spans} />)}
                  {!t2Loading && !t2Error && !t2CorrData && <div className="text-caption text-text-secondary">Corrections will appear here after analysis.</div>}
                </div>
              </div>
            </CardContent>
          </Card> : null}



        <div className="flex justify-center gap-4">
          <Button onClick={() => navigate("/ielts-portal")} className="btn-primary rounded-xl">Take Another Test</Button>
          <Button variant="outline" onClick={() => navigate("/dashboard")} className="rounded-xl">Return to Dashboard</Button>
        </div>
      </div>
    </div>;
}