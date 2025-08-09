import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import LightRays from "@/components/animations/LightRays";
import { ArrowLeft } from "lucide-react";
import PenguinClapAnimation from "@/components/animations/PenguinClapAnimation";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Criterion {
  band: number;
  justification?: string;
}

interface TaskFeedback {
  strengths?: string[];
  improvements?: string[];
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

  const overallBand = structured.overall?.band ?? 7.0;
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
    const abbr = (label: string) =>
      label.startsWith("Task Achievement") ? "TA" :
      label.startsWith("Task Response") ? "TR" :
      label.startsWith("Coherence") ? "C&C" :
      label.startsWith("Lexical") ? "LR" :
      "GRA";
    const [showMoreStrengths, setShowMoreStrengths] = useState(false);
    const [showMoreImprovements, setShowMoreImprovements] = useState(false);
    const strengthsList = task.feedback?.strengths ?? [];
    const improvementsList = task.feedback?.improvements ?? [];
    return (
      <Card className="card-elevated border-2 border-brand-blue/20 mb-6">
        <CardHeader className="bg-gradient-to-r from-brand-blue/10 to-brand-purple/10">
          <CardTitle className="text-heading-3 flex items-center justify-between">
            <span>{title}</span>
            {typeof task.overall_band === "number" && (
              <Badge variant="outline" className="rounded-2xl text-sm">
                Overall: {task.overall_band.toFixed(1)}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2">
            <TooltipProvider>
              {items.map((it) => {
                const val = typeof it.value === "number" ? it.value.toFixed(1) : "-";
                return (
                  <Tooltip key={it.label}>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className="rounded-full px-3 py-1 bg-surface-3 border-border text-sm">
                        {abbr(it.label)} {val}
                      </Badge>
                    </TooltipTrigger>
                    {it.just ? (
                      <TooltipContent className="max-w-sm">
                        <p className="text-sm text-text-secondary">{it.just}</p>
                      </TooltipContent>
                    ) : null}
                  </Tooltip>
                );
              })}
            </TooltipProvider>
          </div>

          {(task.feedback?.strengths?.length || task.feedback?.improvements?.length) && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {strengthsList.length ? (
                <div>
                  <h4 className="text-heading-4 mb-2">Key strengths</h4>
                  <ul className="list-disc pl-5 space-y-1 text-text-secondary">
                    {(showMoreStrengths ? strengthsList : strengthsList.slice(0, 3)).map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                  {strengthsList.length > 3 && (
                    <Button variant="ghost" size="sm" className="mt-2" onClick={() => setShowMoreStrengths(v => !v)}>
                      {showMoreStrengths ? "Show less" : "Show more"}
                    </Button>
                  )}
                </div>
              ) : null}
              {improvementsList.length ? (
                <div>
                  <h4 className="text-heading-4 mb-2">Specific, actionable improvements</h4>
                  <p className="text-caption text-text-secondary mb-2">Include concrete examples, target structures, and one improved sentence.</p>
                  <ul className="list-disc pl-5 space-y-1 text-text-secondary">
                    {(showMoreImprovements ? improvementsList : improvementsList.slice(0, 3)).map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                  {improvementsList.length > 3 && (
                    <Button variant="ghost" size="sm" className="mt-2" onClick={() => setShowMoreImprovements(v => !v)}>
                      {showMoreImprovements ? "Show less" : "Show more"}
                    </Button>
                  )}
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
        <Card className="card-elevated mb-6 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-brand-blue/10 to-brand-purple/10">
            <CardTitle className="text-heading-3">Overall Writing Band Score</CardTitle>
          </CardHeader>
          <CardContent className="py-6">
            <div className="flex items-center justify-between gap-6">
              <div>
                <div className="text-5xl font-bold mb-2 bg-gradient-to-r from-brand-blue to-brand-purple bg-clip-text text-transparent">
                  {overallBand.toFixed(1)}
                </div>
                <Badge variant="outline" className={`text-base px-3 py-1.5 rounded-2xl ${overallMeta.color}`}>
                  {overallMeta.label} Performance
                </Badge>
              </div>
              <PenguinClapAnimation size="sm" />
            </div>
          </CardContent>
        </Card>

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
