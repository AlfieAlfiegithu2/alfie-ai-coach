import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Plan } from '@/lib/plans/templates';
import { useLocation } from 'react-router-dom';

const PlanPage = () => {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [openDayKey, setOpenDayKey] = useState<string | null>(null);
  const location = useLocation() as any;

  useEffect(() => {
    (async () => {
      // 1) Fallback: plan passed via navigation state
      const navPlan = location?.state?.plan as Plan | undefined;
      if (navPlan) {
        setPlan(navPlan);
        return;
      }

      // 2) Fallback: plan saved locally (offline mode)
      try {
        const cached = localStorage.getItem('latest_plan');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed?.plan) {
            setPlan(parsed.plan as Plan);
            return;
          }
          // some callers may store the plan directly
          if (parsed && typeof parsed === 'object') {
            setPlan(parsed as Plan);
            return;
          }
        }
      } catch {}

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await (supabase as any).from('profiles').select('*, current_plan_id').eq('id', user.id).single();
      if (!profile?.current_plan_id) return;
      const { data: planRow } = await (supabase as any).from('study_plans').select('*').eq('id', profile.current_plan_id).single();
      if ((planRow as any)?.plan) setPlan((planRow as any).plan as Plan);
    })();
  }, [location?.state]);

  if (!plan) return <div className="max-w-3xl mx-auto p-6">No plan yet.</div>;
  const [openIso, setOpenIso] = useState<string | null>(null);
  const getDay = (key: string | null) => {
    if (!key) return null;
    const [w, d] = key.split('-').map(Number);
    return plan.weekly.find(x => x.week === w)?.days.find(x => x.day === d) || null;
  };

  const formatBand = (n: number | undefined | null) => {
    return typeof n === 'number' && isFinite(n) ? n.toFixed(1) : '-';
  };

  // Calendar helpers
  const startDate = (() => {
    const base = plan.meta?.startDateISO ? new Date(plan.meta.startDateISO) : new Date();
    return new Date(base.getFullYear(), base.getMonth(), base.getDate());
  })();

  const toISO = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  type DayEntry = { date: Date; week: number; day: number; tasks: { title: string; minutes: number }[] };
  const allDays: DayEntry[] = (() => {
    const arr: DayEntry[] = [];
    plan.weekly.forEach((w, wi) => {
      w.days.forEach((d, di) => {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + wi * 7 + di);
        arr.push({ date, week: w.week, day: d.day, tasks: d.tasks });
      });
    });
    return arr;
  })();

  const months = (() => {
    const map = new Map<string, DayEntry[]>();
    allDays.forEach((de) => {
      const key = `${de.date.getFullYear()}-${String(de.date.getMonth() + 1).padStart(2, '0')}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(de);
    });
    return Array.from(map.entries()).sort((a,b) => a[0].localeCompare(b[0]));
  })();

  // Per-day local state (custom tasks and completion)
  type CustomTask = { title: string; minutes: number };
  const [customTasks, setCustomTasks] = useState<CustomTask[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskMinutes, setNewTaskMinutes] = useState<number>(20);

  const loadDayState = (iso: string) => {
    try {
      const ct = JSON.parse(localStorage.getItem(`plan-custom-tasks-${iso}`) || '[]');
      const comp = JSON.parse(localStorage.getItem(`plan-completed-${iso}`) || '[]');
      setCustomTasks(Array.isArray(ct) ? ct : []);
      setCompletedIds(new Set(Array.isArray(comp) ? comp : []));
    } catch {
      setCustomTasks([]);
      setCompletedIds(new Set());
    }
  };
  const saveCustomTasks = (iso: string, tasks: CustomTask[]) => {
    try { localStorage.setItem(`plan-custom-tasks-${iso}`, JSON.stringify(tasks)); } catch {}
  };
  const saveCompleted = (iso: string, ids: Set<string>) => {
    try { localStorage.setItem(`plan-completed-${iso}`, JSON.stringify(Array.from(ids))); } catch {}
  };
  const openDay = (w: number, d: number) => {
    const entry = allDays.find(e => e.week === w && e.day === d);
    const iso = entry ? toISO(entry.date) : null;
    setOpenIso(iso);
    if (iso) loadDayState(iso);
    setOpenDayKey(`${w}-${d}`);
  };
  const toggleTaskDone = (id: string) => {
    const next = new Set(completedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setCompletedIds(next);
    if (openIso) saveCompleted(openIso, next);
  };
  const addCustomTask = () => {
    if (!openIso || !newTaskTitle.trim()) return;
    const t = { title: newTaskTitle.trim(), minutes: Math.max(5, Math.min(180, Number(newTaskMinutes) || 20)) };
    const next = [...customTasks, t];
    setCustomTasks(next);
    saveCustomTasks(openIso, next);
    setNewTaskTitle('');
    setNewTaskMinutes(20);
  };
  const removeCustomTask = (index: number) => {
    if (!openIso) return;
    const next = customTasks.slice();
    next.splice(index, 1);
    setCustomTasks(next);
    saveCustomTasks(openIso, next);
    const id = `custom-${index}`;
    if (completedIds.has(id)) {
      const set = new Set(completedIds);
      set.delete(id);
      setCompletedIds(set);
      saveCompleted(openIso, set);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 lg:p-10">
      <div className="bg-white/70 backdrop-blur-xl border border-white/30 rounded-2xl shadow-sm p-6 lg:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
      <div>
            <h1 className="text-2xl lg:text-3xl font-semibold text-slate-900">Your Personalized IELTS Study Plan</h1>
            <p className="text-slate-600 mt-1">Designed from your quick assessment</p>
          </div>
          {plan.meta && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded-xl border border-white/40 bg-white/60 px-4 py-3 text-center">
                <div className="text-xs text-slate-500">Current Level</div>
                <div className="text-lg font-semibold text-slate-900">{plan.meta.currentLevel}</div>
              </div>
              <div className="rounded-xl border border-white/40 bg-white/60 px-4 py-3 text-center">
                <div className="text-xs text-slate-500">Now (IELTS)</div>
                <div className="text-lg font-semibold text-slate-900">{formatBand(plan.meta.currentApproxIELTS as number)}</div>
              </div>
              <div className="rounded-xl border border-white/40 bg-white/60 px-4 py-3 text-center">
                <div className="text-xs text-slate-500">Target</div>
                <div className="text-lg font-semibold text-slate-900">{formatBand(plan.meta?.targetIELTS as number | undefined)}</div>
              </div>
              <div className="rounded-xl border border-white/40 bg-white/60 px-4 py-3 text-center">
                <div className="text-xs text-slate-500">ETA</div>
                <div className="text-lg font-semibold text-slate-900">~{plan.meta?.estimatedMonths} mo</div>
              </div>
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <div className="rounded-2xl border border-white/40 bg-white/60 p-5">
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Highlights</h2>
            <ul className="list-disc pl-5 space-y-1 text-slate-700">
          {plan.highlights.map((h, i) => (<li key={i}>{h}</li>))}
        </ul>
      </div>
          <div className="rounded-2xl border border-white/40 bg-white/60 p-5">
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Quick Wins</h2>
            <ul className="list-disc pl-5 space-y-1 text-slate-700">
          {plan.quickWins.map((h, i) => (<li key={i}>{h}</li>))}
        </ul>
      </div>
          <div className="rounded-2xl border border-white/40 bg-white/60 p-5">
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Study Pacing</h2>
            <ul className="list-disc pl-5 space-y-1 text-slate-700">
              <li>Recommended daily study: {plan.meta?.dailyMinutes || 60} min</li>
              <li>Weekly checkpoint: mini‑mock and review</li>
              <li>Deadline‑aligned schedule</li>
            </ul>
          </div>
        </div>

        <div className="space-y-8">
          {months.map(([key, monthDays]) => {
            const year = Number(key.split('-')[0]);
            const monthIdx = Number(key.split('-')[1]) - 1;
            const firstOfMonth = new Date(year, monthIdx, 1);
            const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
            const offset = firstOfMonth.getDay(); // 0=Sun
            const cells: (DayEntry | null)[] = [];
            for (let i = 0; i < offset; i++) cells.push(null);
            for (let d = 1; d <= daysInMonth; d++) {
              const found = monthDays.find(md => md.date.getDate() === d) || null;
              if (found) cells.push(found); else cells.push(null);
            }
            const monthLabel = firstOfMonth.toLocaleString(undefined, { month: 'long', year: 'numeric' });
            return (
              <div key={key} className="rounded-2xl border border-white/40 bg-white/60 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold text-slate-900">{monthLabel}</h2>
                  <div className="text-xs text-slate-500">Daily ~{plan.meta?.dailyMinutes || plan.meta?.dailyMinutes === 0 ? plan.meta?.dailyMinutes : 60} min</div>
                </div>
                <div className="grid grid-cols-7 gap-2 text-xs text-slate-500 mb-1">
                  <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
                </div>
                <div className="grid grid-cols-7 gap-2 rounded-2xl p-2 bg-white/50 border border-white/40">
                  {cells.map((cell, idx) => {
                    if (!cell) return <div key={idx} className="h-24 rounded-xl bg-transparent" />;
                    const iso = toISO(cell.date);
                    const completeKey = `plan-date-complete-${iso}`;
                    const completed = typeof window !== 'undefined' && localStorage.getItem(completeKey) === '1';
                    return (
                      <button key={iso} className={`h-24 rounded-2xl border p-2 text-left shadow-sm ${cell.tasks.length ? 'bg-white/80 border-white/60 hover:bg-white' : 'bg-white/40 border-white/40'} transition`} onClick={() => openDay(cell.week, cell.day)}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-slate-900">{cell.date.getDate()}</span>
                          <input type="checkbox" aria-label={`Mark ${iso} complete`} onChange={(e) => {
                            if ((e.target as HTMLInputElement).checked) localStorage.setItem(completeKey, '1'); else localStorage.removeItem(completeKey);
                          }} defaultChecked={completed} onClick={(e) => e.stopPropagation()} />
                        </div>
                        <ul className="space-y-1 text-slate-700 text-xs">
                          {cell.tasks.slice(0,2).map((t,i) => (
                            <li key={i} className="flex items-center justify-between">
                              <span className="truncate max-w-[120px]">{t.title}</span>
                              <span className="text-[10px] text-slate-500">{t.minutes}m</span>
                            </li>
                          ))}
                          {cell.tasks.length > 2 && <li className="text-[10px] text-slate-500">+{cell.tasks.length-2} more</li>}
                        </ul>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {openDayKey && openIso && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => { setOpenDayKey(null); setOpenIso(null); }}>
            <div className="bg-white rounded-2xl shadow-xl w-[90%] max-w-xl p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">{openIso} • {openDayKey.replace('-', ' • Day ')}</h3>
                <button className="text-slate-500 hover:text-slate-700" onClick={() => { setOpenDayKey(null); setOpenIso(null); }}>Close</button>
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-slate-800 mb-2">AI Tasks</h4>
                  <ul className="space-y-2 text-slate-800">
                    {(getDay(openDayKey)?.tasks || []).map((t, i) => {
                      const id = `ai-${i}`;
                      return (
                        <li key={id} className="flex items-center justify-between rounded-lg border p-3">
                          <label className="flex items-center gap-3">
                            <input type="checkbox" checked={completedIds.has(id)} onChange={() => toggleTaskDone(id)} />
                            <span>{t.title}</span>
                          </label>
                          <span className="text-xs text-slate-500">{t.minutes} min</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-800 mb-2">Your Tasks</h4>
                  <div className="flex gap-2 mb-2">
                    <input value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder="Add a task (e.g., Writing Task 2 intro)" className="flex-1 rounded-md border px-3 py-2" />
                    <input type="number" value={newTaskMinutes} onChange={(e) => setNewTaskMinutes(Number(e.target.value))} className="w-24 rounded-md border px-3 py-2" />
                    <button className="rounded-md bg-black text-white px-3 py-2" onClick={addCustomTask}>Add</button>
                  </div>
                  <ul className="space-y-2">
                    {customTasks.map((t, i) => {
                      const id = `custom-${i}`;
                      return (
                        <li key={id} className="flex items-center justify-between rounded-lg border p-3">
                          <label className="flex items-center gap-3">
                            <input type="checkbox" checked={completedIds.has(id)} onChange={() => toggleTaskDone(id)} />
                            <span>{t.title}</span>
                          </label>
                          <div className="flex items-center gap-3 text-xs text-slate-500">
                            <span>{t.minutes} min</span>
                            <button className="text-red-500" onClick={() => removeCustomTask(i)}>Remove</button>
                          </div>
                        </li>
                      );
                    })}
                    {customTasks.length === 0 && <li className="text-sm text-slate-500">No custom tasks yet.</li>}
                </ul>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
    </div>
  );
};

export default PlanPage;


