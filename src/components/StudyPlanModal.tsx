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

  // Build a small calendar preview for the first 5 weeks
  const buildCalendarPreview = () => {
    if (!plan?.weekly?.length) return { headers: [], cells: [] as Array<{ label: string; hasTasks: boolean }> };
    const startISO = (plan as any).meta?.startDateISO || new Date().toISOString();
    const startDate = new Date(startISO);
    const headers = ['Su','Mo','Tu','We','Th','Fr','Sa'];
    const cells: Array<{ label: string; hasTasks: boolean; week: number; day: number } > = [];
    // Start from the first day of the start month for a consistent grid
    const monthStart = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const offset = monthStart.getDay();
    for (let i = 0; i < offset; i++) cells.push({ label: '', hasTasks: false, week: 0, day: 0 });
    // Map plan days onto dates (up to ~35 days)
    const allDays: Array<{ date: Date; week: number; day: number; tasks: PlanTask[] }> = [];
    plan.weekly.forEach((w, wi) => {
      w.days.forEach((d, di) => {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + wi * 7 + di);
        allDays.push({ date, week: w.week, day: d.day, tasks: d.tasks });
      });
    });
    const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      const thisDate = new Date(monthStart.getFullYear(), monthStart.getMonth(), dayNum);
      const found = allDays.find(d => d.date.toDateString() === thisDate.toDateString());
      cells.push({ label: String(dayNum), hasTasks: !!found, week: found?.week || 0, day: found?.day || 0 });
    }
    // pad to full rows (5 or 6 weeks)
    while (cells.length % 7 !== 0) cells.push({ label: '', hasTasks: false, week: 0, day: 0 });
    return { headers, cells };
  };
  const calendar = buildCalendarPreview();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto bg-white/95 backdrop-blur-xl border-white/20">
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
              {/* Today's quick to‑do */}
              <TodayQuickTodo plan={plan} onOpenFull={() => { setOpen(false); navigate('/plan'); }} />
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
            {/* Mini Calendar Preview */}
            <div>
              <h3 className="text-slate-800 font-semibold mb-2">This month</h3>
              <ScrollableMiniCalendar plan={plan} onOpenFull={() => { setOpen(false); navigate('/plan'); }} />
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


// Lightweight components appended for modal UX
function TodayQuickTodo({ plan, onOpenFull }: { plan: any; onOpenFull: () => void }) {
  const today = new Date();
  const start = plan?.meta?.startDateISO ? new Date(plan.meta.startDateISO) : new Date();
  const diffDays = Math.max(0, Math.floor((today.getTime() - start.getTime()) / (24*60*60*1000)));
  const w = Math.floor(diffDays / 7);
  const d = diffDays % 7;
  const day = plan?.weekly?.[w]?.days?.[d] || plan?.weekly?.[0]?.days?.[0];
  const key = today.toISOString().slice(0,10);
  const [checked, setChecked] = React.useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem(`quicktodo-${key}`) || '{}'); } catch { return {}; }
  });
  const [custom, setCustom] = React.useState<{ title: string; minutes: number }>({ title: "", minutes: 15 });
  const [customTasks, setCustomTasks] = React.useState<Array<{ title: string; minutes: number }>>(() => {
    try { return JSON.parse(localStorage.getItem(`quicktodo-custom-${key}`) || '[]'); } catch { return []; }
  });
  const [hiddenAi, setHiddenAi] = React.useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem(`quicktodo-hidden-ai-${key}`) || '[]')); } catch { return new Set(); }
  });
  const toggle = (i: number) => {
    const next = { ...checked, [i]: !checked[i] };
    setChecked(next);
    try { localStorage.setItem(`quicktodo-${key}`, JSON.stringify(next)); } catch {}
  };
  const addCustom = () => {
    if (!custom.title.trim()) return;
    const next = [...customTasks, { title: custom.title.trim(), minutes: Math.max(5, Math.min(180, Number(custom.minutes)||15)) }];
    setCustomTasks(next);
    setCustom({ title: "", minutes: 15 });
    try { localStorage.setItem(`quicktodo-custom-${key}`, JSON.stringify(next)); } catch {}
  };
  const removeCustom = (idx: number) => {
    const next = customTasks.slice(); next.splice(idx,1); setCustomTasks(next);
    try { localStorage.setItem(`quicktodo-custom-${key}`, JSON.stringify(next)); } catch {}
  };
  const hideAi = (idx: number) => {
    const next = new Set(hiddenAi);
    next.add(String(idx));
    setHiddenAi(next);
    try { localStorage.setItem(`quicktodo-hidden-ai-${key}`, JSON.stringify(Array.from(next))); } catch {}
  };
  const totalMinutes = (day?.tasks||[]).slice(0,5).filter((_,i)=>!hiddenAi.has(String(i))).reduce((s: number,t: any)=>s+t.minutes,0) + customTasks.reduce((s,t)=>s+t.minutes,0);
  return (
    <div className="rounded-2xl border border-white/40 bg-white/60 p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-slate-800 font-semibold">Today</h3>
        <button className="text-xs underline text-slate-600" onClick={onOpenFull}>Open full plan</button>
      </div>
      <ul className="space-y-2">
        {(day?.tasks || []).slice(0,5).map((t: any, i: number) => {
          if (hiddenAi.has(String(i))) return null;
          return (
            <li key={i} className="flex items-center justify-between rounded-lg border p-3">
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={!!checked[i]} onChange={() => toggle(i)} />
                <span>{t.title}</span>
              </label>
              <div className="text-xs text-slate-500 flex items-center gap-2">
                <span>{t.minutes} min</span>
                <button className="text-red-500" onClick={() => hideAi(i)}>Remove</button>
              </div>
            </li>
          );
        })}
        {customTasks.map((t, i) => (
          <li key={`c${i}`} className="flex items-center justify-between rounded-lg border p-3">
            <label className="flex items-center gap-3">
              <input type="checkbox" />
              <span>{t.title}</span>
            </label>
            <div className="text-xs text-slate-500 flex items-center gap-2">
              <span>{t.minutes} min</span>
              <button className="text-red-500" onClick={() => removeCustom(i)}>Remove</button>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex gap-2">
        <input value={custom.title} onChange={(e)=>setCustom(c=>({...c,title:e.target.value}))} placeholder="Add a task (e.g., Review mistakes)" className="flex-1 rounded-md border px-3 py-2" />
        <input type="number" value={custom.minutes} onChange={(e)=>setCustom(c=>({...c,minutes:Number(e.target.value)}))} className="w-20 rounded-md border px-3 py-2" />
        <button className="rounded-md bg-black text-white px-3 py-2" onClick={addCustom}>Add</button>
      </div>
      <div className="mt-2 text-xs text-slate-500">Total today: {totalMinutes} min</div>
    </div>
  );
}

function ScrollableMiniCalendar({ plan, onOpenFull }: { plan: any; onOpenFull: () => void }) {
  const startISO = plan?.meta?.startDateISO || new Date().toISOString();
  const startDate = new Date(startISO);
  const [offset, setOffset] = React.useState(0); // months from start
  const headers = ['Su','Mo','Tu','We','Th','Fr','Sa'];
  const first = new Date(startDate.getFullYear(), startDate.getMonth() + offset, 1);
  const daysInMonth = new Date(first.getFullYear(), first.getMonth()+1, 0).getDate();
  const label = first.toLocaleString(undefined, { month: 'long', year: 'numeric' });
  const leading = first.getDay();
  const blanks = Array.from({length: leading}).map((_,i)=>i);
  const days: Array<{ date: Date; hasTasks: boolean }> = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(first.getFullYear(), first.getMonth(), d);
    const diff = Math.floor((date.getTime() - startDate.getTime())/(24*60*60*1000));
    const weekIdx = Math.floor(diff/7);
    const dayIdx = diff%7;
    const hasTasks = !!plan.weekly?.[weekIdx]?.days?.[dayIdx];
    days.push({ date, hasTasks });
  }
  return (
    <div className="rounded-2xl border border-white/40 bg-white/60 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium text-slate-800">{label}</div>
        <div className="flex items-center gap-2">
          <button className="rounded-md border px-2 py-1 text-xs" onClick={() => setOffset(o=>o-1)}>Prev</button>
          <button className="rounded-md border px-2 py-1 text-xs" onClick={() => setOffset(o=>o+1)}>Next</button>
          <button className="text-xs underline text-slate-600" onClick={onOpenFull}>Open full plan</button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-2 text-xs text-slate-500 mb-2">
        {headers.map(h => (<div key={h}>{h}</div>))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {blanks.map(b => (<div key={`b${b}`} className="h-12" />))}
        {days.map((d, di) => (
          <button key={di} onClick={onOpenFull} className={`h-12 rounded-xl border text-sm ${d.hasTasks ? 'bg-white hover:bg-white/90 border-slate-300' : 'bg-white/40 border-white/40'}`}>
            <span className="text-slate-900">{d.date.getDate()}</span>
            {d.hasTasks && <div className="mt-1 h-1.5 w-1.5 rounded-full bg-black mx-auto" />}
          </button>
        ))}
      </div>
    </div>
  );
}

