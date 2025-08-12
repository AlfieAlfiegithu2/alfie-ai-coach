import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import LightRays from "@/components/animations/LightRays";
import { ArrowLeft, FileText, Edit } from "lucide-react";
import PenguinClapAnimation from "@/components/animations/PenguinClapAnimation";
import AnnotatedWritingText from "@/components/AnnotatedWritingText";

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
  overall?: { band?: number; calculation?: string; feedback_markdown?: string };
  full_report_markdown?: string;
  task1_annotated_original?: string;
  task1_annotated_corrected?: string;
  task1_corrections?: Array<{
    original_text: string;
    corrected_text: string;
    start_index: number;
    end_index: number;
    error_type: string;
    explanation: string;
  }>;
  task2_annotated_original?: string;
  task2_annotated_corrected?: string;
  task2_corrections?: Array<{
    original_text: string;
    corrected_text: string;
    start_index: number;
    end_index: number;
    error_type: string;
    explanation: string;
  }>;
}

const bandToDesc = (score: number) => {
  if (score >= 8.5) return { label: "Excellent", color: "text-brand-green bg-brand-green/10 border-brand-green/30" };
  if (score >= 7.0) return { label: "Good", color: "text-brand-blue bg-brand-blue/10 border-brand-blue/30" };
  if (score >= 6.0) return { label: "Competent", color: "text-brand-orange bg-brand-orange/10 border-brand-orange/30" };
  return { label: "Limited", color: "text-destructive bg-destructive/10 border-destructive/30" };
};

export default function IELTSWritingProResults() {
  const location = useLocation();
  const navigate = useNavigate();
  const { structured, testName, task1Data, task2Data } = (location.state || {}) as {
    structured?: StructuredResult;
    testName?: string;
    task1Data?: any;
    task2Data?: any;
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

  if (!structured) {
    navigate("/dashboard");
    return null;
  }

  const overallBand = Math.min(9.0, Math.max(0.0, structured.overall?.band ?? 7.0));
  const overallMeta = bandToDesc(overallBand);

  const TaskSection = ({ title, task, type }: { title: string; task?: TaskAssessment; type: "task1" | "task2" }) => {
    if (!task) return null;
    const crit = task.criteria || {};
    const items = [
      type === "task1"
        ? { label: "Task Achievement", value: crit.task_achievement?.band, just: crit.task_achievement?.justification }
        : { label: "Task Response", value: crit.task_response?.band, just: crit.task_response?.justification },
      { label: "Coherence & Cohesion", value: crit.coherence_and_cohesion?.band, just: crit.coherence_and_cohesion?.justification },
      { label: "Lexical Resource", value: crit.lexical_resource?.band, just: crit.lexical_resource?.justification },
      { label: "Grammar Range & Accuracy", value: crit.grammatical_range_and_accuracy?.band, just: crit.grammatical_range_and_accuracy?.justification },
    ];
    return (
      <Card className="card-elevated border-2 border-brand-blue/20 mb-8">
        <CardHeader className="bg-gradient-to-r from-brand-blue/10 to-brand-purple/10">
          <CardTitle className="text-heading-3 flex items-center justify-between">
            <span>{title}</span>
            {typeof task.overall_band === "number" && (
              <Badge variant="outline" className="rounded-2xl text-sm">
                Overall: {Math.min(9.0, Math.max(0.0, task.overall_band)).toFixed(1)}
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
                    {typeof it.value === "number" ? Math.min(9.0, Math.max(0.0, it.value)).toFixed(1) : "-"}
                  </Badge>
                </div>
                {it.just ? (
                  <div className="mt-2">
                    <p className="text-[11px] uppercase tracking-wide text-text-tertiary mb-1">Criterion-specific feedback</p>
                    <p className="text-sm text-text-secondary">{it.just}</p>
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          {(task.feedback?.strengths?.length || task.feedback?.improvements?.length || task.feedback?.improvements_detailed?.length) && (
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
                  <p className="text-caption text-text-secondary mb-3">Each item includes a direct quote from your writing and a stronger revision.</p>
                  <div className="space-y-3">
                    {task.feedback.improvements_detailed.map((ex, i) => (
                      <div key={i} className="rounded-xl border border-border bg-surface-3 p-3">
                        {ex.issue ? (
                          <div className="text-sm font-medium text-text-primary mb-1">{ex.issue}</div>
                        ) : null}
                        {ex.sentence_quote ? (
                          <div className="mb-2">
                            <div className="text-[11px] uppercase tracking-wide text-text-tertiary mb-1">Original</div>
                            <blockquote className="text-sm text-text-secondary border-l-2 border-brand-blue/40 pl-3 italic">“{ex.sentence_quote}”</blockquote>
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
                  <p className="text-caption text-text-secondary mb-2">Include concrete examples, target structures, and one improved sentence.</p>
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

  return (
    <div className="min-h-screen bg-surface-2 relative">
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
                  {testName ? (
                    <span className="text-caption text-text-secondary">{testName}</span>
                  ) : null}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Writing Samples with Corrections */}
        {(task1Data?.answer || task2Data?.answer) && (
          <div className="mb-8 space-y-6">
            <h2 className="text-heading-2 text-center mb-6">Your Writing with AI Corrections</h2>
            
            {task1Data?.answer && (
              <AnnotatedWritingText
                taskTitle="Task 1 - Academic Writing"
                originalText={task1Data.answer}
                annotatedOriginal={structured.task1_annotated_original}
                annotatedCorrected={structured.task1_annotated_corrected}
                corrections={structured.task1_corrections}
                icon={FileText}
                colorScheme="text-brand-blue"
              />
            )}
            
            {task2Data?.answer && (
              <AnnotatedWritingText
                taskTitle="Task 2 - Essay Writing"
                originalText={task2Data.answer}
                annotatedOriginal={structured.task2_annotated_original}
                annotatedCorrected={structured.task2_annotated_corrected}
                corrections={structured.task2_corrections}
                icon={Edit}
                colorScheme="text-brand-purple"
              />
            )}
          </div>
        )}

        <TaskSection title="Task 1 Assessment" task={structured.task1} type="task1" />
        <TaskSection title="Task 2 Assessment" task={structured.task2} type="task2" />

        <div className="flex justify-center gap-4">
          <Button onClick={() => navigate("/ielts-portal")} className="btn-primary rounded-xl">Take Another Test</Button>
          <Button variant="outline" onClick={() => navigate("/dashboard")} className="rounded-xl">Return to Dashboard</Button>
        </div>
      </div>
    </div>
  );
}
