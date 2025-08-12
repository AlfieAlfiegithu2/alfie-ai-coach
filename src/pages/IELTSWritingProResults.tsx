import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import LightRays from "@/components/animations/LightRays";
import { ArrowLeft, Copy } from "lucide-react";
import PenguinClapAnimation from "@/components/animations/PenguinClapAnimation";
import { supabase } from "@/integrations/supabase/client";
import CorrectionVisualizer, { Span as CorrectionSpan } from "@/components/CorrectionVisualizer";
import SentenceCompare from "@/components/SentenceCompare";
import { Toggle } from "@/components/ui/toggle";
import { useToast } from "@/hooks/use-toast";
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
export default function IELTSWritingProResults() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    structured,
    testName,
    task1Data,
    task2Data,
    task1Answer,
    task2Answer
  } = (location.state || {}) as {
    structured?: StructuredResult;
    testName?: string;
    task1Data?: any;
    task2Data?: any;
    task1Answer?: string;
    task2Answer?: string;
  };
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

  // Parallel correction analysis for Task 1 and Task 2
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
  const overallBand = Math.min(9.0, Math.max(0.0, structured.overall?.band ?? 7.0));
  const overallMeta = bandToDesc(overallBand);
  const {
    toast
  } = useToast();
  const [t1SentenceView, setT1SentenceView] = useState(false);
  const [t2SentenceView, setT2SentenceView] = useState(false);
  const t1Counts = {
    errors: t1CorrData?.original_spans.filter(s => s.status === 'error').length ?? 0,
    improvements: t1CorrData?.corrected_spans.filter(s => s.status === 'improvement').length ?? 0
  };
  const t2Counts = {
    errors: t2CorrData?.original_spans.filter(s => s.status === 'error').length ?? 0,
    improvements: t2CorrData?.corrected_spans.filter(s => s.status === 'improvement').length ?? 0
  };
  const TaskSection = ({
    title,
    task,
    type
  }: {
    title: string;
    task?: TaskAssessment;
    type: "task1" | "task2";
  }) => {
    if (!task) return null;
    const crit = task.criteria || {};
    const items = [type === "task1" ? {
      label: "Task Achievement",
      value: crit.task_achievement?.band,
      just: crit.task_achievement?.justification
    } : {
      label: "Task Response",
      value: crit.task_response?.band,
      just: crit.task_response?.justification
    }, {
      label: "Coherence & Cohesion",
      value: crit.coherence_and_cohesion?.band,
      just: crit.coherence_and_cohesion?.justification
    }, {
      label: "Lexical Resource",
      value: crit.lexical_resource?.band,
      just: crit.lexical_resource?.justification
    }, {
      label: "Grammar Range & Accuracy",
      value: crit.grammatical_range_and_accuracy?.band,
      just: crit.grammatical_range_and_accuracy?.justification
    }];
    return <Card className="card-elevated border-2 border-brand-blue/20 mb-8">
        <CardHeader className="bg-gradient-to-r from-brand-blue/10 to-brand-purple/10">
          <CardTitle className="text-heading-3 flex items-center justify-between">
            <span>{title}</span>
            {typeof task.overall_band === "number" && <Badge variant="outline" className="rounded-2xl text-sm">
                Overall: {Math.min(9.0, Math.max(0.0, task.overall_band)).toFixed(1)}
              </Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {items.map(it => <div key={it.label} className="rounded-2xl p-4 bg-surface-3 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-text-primary">{it.label}</p>
                  <Badge variant="outline" className="rounded-xl">
                    {typeof it.value === "number" ? Math.min(9.0, Math.max(0.0, it.value)).toFixed(1) : "-"}
                  </Badge>
                </div>
                {it.just ? <div className="mt-2">
                    <p className="text-[11px] uppercase tracking-wide text-text-tertiary mb-1">Criterion-specific feedback</p>
                    <p className="text-sm text-text-secondary">{it.just}</p>
                  </div> : null}
              </div>)}
          </div>

          {(task.feedback?.strengths?.length || task.feedback?.improvements?.length || task.feedback?.improvements_detailed?.length) && <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {task.feedback?.strengths?.length ? <div>
                  <h4 className="text-heading-4 mb-2">Key strengths</h4>
                  <ul className="list-disc pl-5 space-y-1 text-text-secondary">
                    {task.feedback.strengths.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div> : null}
              {task.feedback?.improvements_detailed?.length ? <div>
                  <h4 className="text-heading-4 mb-2">Specific, actionable improvements</h4>
                  <p className="text-caption text-text-secondary mb-3">Each item includes a direct quote from your writing and a stronger revision.</p>
                  <div className="space-y-3">
                    {task.feedback.improvements_detailed.map((ex, i) => <div key={i} className="rounded-xl border border-border bg-surface-3 p-3">
                        {ex.issue ? <div className="text-sm font-medium text-text-primary mb-1">{ex.issue}</div> : null}
                        {ex.sentence_quote ? <div className="mb-2">
                            <div className="text-[11px] uppercase tracking-wide text-text-tertiary mb-1">Original</div>
                            <blockquote className="text-sm text-text-secondary border-l-2 border-brand-blue/40 pl-3 italic">“{ex.sentence_quote}”</blockquote>
                          </div> : null}
                        {ex.improved_version ? <div className="text-sm mt-1">
                            <span className="text-[11px] uppercase tracking-wide text-text-tertiary mr-1">Improved</span>
                            <span className="font-medium text-text-primary">{ex.improved_version}</span>
                          </div> : null}
                        {ex.explanation ? <p className="text-caption text-text-secondary mt-1">{ex.explanation}</p> : null}
                      </div>)}
                  </div>
                </div> : task.feedback?.improvements?.length ? <div>
                  <h4 className="text-heading-4 mb-2">Specific, actionable improvements</h4>
                  <p className="text-caption text-text-secondary mb-2">Include concrete examples, target structures, and one improved sentence.</p>
                  <ul className="list-disc pl-5 space-y-1 text-text-secondary">
                    {task.feedback.improvements.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div> : null}
            </div>}
        </CardContent>
      </Card>;
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
                <div className="text-6xl font-bold mb-3 bg-gradient-to-r from-brand-blue to-brand-purple bg-clip-text text-transparent">
                  {overallBand.toFixed(1)}
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

        <TaskSection title="Task 1 Assessment" task={structured.task1} type="task1" />
        <TaskSection title="Task 2 Assessment" task={structured.task2} type="task2" />

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