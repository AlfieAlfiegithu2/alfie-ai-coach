import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface PlanTask {
  title: string;
  minutes: number;
}

interface PlanDay {
  day: number;
  tasks: PlanTask[];
}

interface PlanWeek {
  week: number;
  days: PlanDay[];
}

interface PlanData {
  durationWeeks: number;
  highlights: string[];
  quickWins: string[];
  weekly: PlanWeek[];
  meta?: {
    currentLevel: string;
    currentApproxIELTS: number;
    targetIELTS?: number | null;
    dailyMinutes?: number;
    estimatedMonths?: number;
    rationale?: string;
    targetDeadline?: string | null;
    startDateISO?: string;
  };
}

interface StudyPlanModalProps {
  children?: React.ReactNode;
}

const StudyPlanModal = ({ children }: StudyPlanModalProps) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<PlanData | null>(null);

  useEffect(() => {
    if (open) {
      void loadPlan();
    }
  }, [open]);

  const loadPlan = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('current_plan_id')
        .eq('id', user.id)
        .single();
      if (!profile?.current_plan_id) {
        setPlan(null);
        return;
      }
      const { data: planRow } = await (supabase as any)
        .from('study_plans')
        .select('plan')
        .eq('id', profile.current_plan_id)
        .single();
      if (planRow?.plan) {
        setPlan(planRow.plan as any as PlanData);
      } else {
        setPlan(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm" className="bg-white/10 border-white/20 text-slate-800 hover:bg-white/20">
      Study Plan
    </Button>
  );

  // Derive a concise next-actions block
  const getNextActions = () => {
    if (!plan?.weekly?.length) return [] as PlanTask[];
    const firstWeek = plan.weekly[0];
    const firstDay = firstWeek?.days?.[0];
    return firstDay?.tasks?.slice(0, 5) || [];
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl bg-white/95 backdrop-blur-xl border-white/20">
        <DialogHeader>
          <DialogTitle className="text-slate-800">Your Study Plan</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {!loading && !plan && (
            <div className="text-slate-700">
              <p className="mb-3">You don't have a plan yet.</p>
              <Button
                className="bg-slate-800 hover:bg-slate-700 text-white"
                onClick={() => {
                  setOpen(false);
                  navigate('/onboarding/assessment');
                }}
              >
                Take 5‑Minute Assessment to Generate Plan
              </Button>
            </div>
          )}
          {loading && (
            <div className="text-slate-600">Loading your plan…</div>
          )}
          {plan && (
            <div className="space-y-6">
              {plan.highlights?.length > 0 && (
                <div>
                  <h3 className="text-slate-800 font-semibold mb-2">Highlights</h3>
                  <ul className="list-disc pl-5 space-y-1 text-slate-700">
                    {plan.highlights.slice(0, 5).map((h, i) => (
                      <li key={i}>{h}</li>
                    ))}
                  </ul>
                </div>
              )}
              {plan.quickWins?.length > 0 && (
                <div>
                  <h3 className="text-slate-800 font-semibold mb-2">Quick Wins</h3>
                  <ul className="list-disc pl-5 space-y-1 text-slate-700">
                    {plan.quickWins.slice(0, 5).map((q, i) => (
                      <li key={i}>{q}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div>
                <h3 className="text-slate-800 font-semibold mb-2">What to do next</h3>
                <ul className="list-disc pl-5 space-y-1 text-slate-700">
                  {getNextActions().map((t, i) => (
                    <li key={i}>{t.title} · {t.minutes} min</li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="outline"
                  className="flex-1 border-slate-300"
                  onClick={() => {
                    setOpen(false);
                    navigate('/plan');
                  }}
                >
                  View Full Plan
                </Button>
                <Button
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white"
                  onClick={() => {
                    setOpen(false);
                    navigate('/onboarding/assessment');
                  }}
                >
                  Retake Level Assessment
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StudyPlanModal;


