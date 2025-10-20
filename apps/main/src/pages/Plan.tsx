import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Plan } from '@/lib/plans/templates';
import { useLocation, useNavigate } from 'react-router-dom';
import { TASK_BANK, type TaskBankItem, SKILLS, LEVELS, filterTaskBank } from '@/lib/plans/taskBank';
import { formatLocalISO, normalizeToLocalMidnight } from '@/lib/date';

const PlanPage = () => {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [openDayKey, setOpenDayKey] = useState<string | null>(null);
  const [openIso, setOpenIso] = useState<string | null>(null);
  // Per-day local state (custom tasks and completion)
  type CustomTask = { title: string; minutes: number };
  const [customTasks, setCustomTasks] = useState<CustomTask[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskMinutes, setNewTaskMinutes] = useState<number>(20);
  const [hiddenAiIds, setHiddenAiIds] = useState<Set<string>>(new Set());
  const [dayNotes, setDayNotes] = useState<string>('');
  const [showTodosOnly, setShowTodosOnly] = useState<boolean>(true);
  const [focusText, setFocusText] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const location = useLocation() as any;
  const navigate = useNavigate();

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
// moved openIso useState to top-level
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

  const generateTodosFromFocus = async () => {
    if (!focusText.trim()) return;
    setIsGenerating(true);
    try {
      const minutes = plan?.meta?.dailyMinutes || 45;
      const firstLang = (plan?.meta as any)?.firstLanguage || 'en';
      const level = plan?.meta?.currentLevel || 'B1';
      const { data, error } = await supabase.functions.invoke('plan-focus-to-todos', {
        body: { focusText, minutesPerDay: minutes, days: 7, firstLanguage: firstLang, level }
      });
      if (error || !data?.success) throw error || new Error(data?.error || 'Failed to generate');
      // Target TODAY by default (timezone-safe)
      const todayLocal = normalizeToLocalMidnight(new Date());
      const iso = formatLocalISO(todayLocal);
      const existing = JSON.parse(localStorage.getItem(`plan-custom-tasks-${iso}`) || '[]');
      const pack = Array.isArray(data.days) && data.days.length > 0 ? (data.days[0]?.tasks || []) : [];
      const merged = Array.isArray(existing) ? [...existing, ...pack] : pack;
      localStorage.setItem(`plan-custom-tasks-${iso}`, JSON.stringify(merged));
      setFocusText('');
      alert('A to‑do pack has been generated for tomorrow. You can move/edit them in the day view.');
    } catch (e: any) {
      alert('Could not generate tasks: ' + (e.message || e));
    } finally {
      setIsGenerating(false);
    }
  };

  // Per-day local state (custom tasks and completion)
// moved day state hooks to top-level

  const loadDayState = (iso: string) => {
    try {
      const ct = JSON.parse(localStorage.getItem(`plan-custom-tasks-${iso}`) || '[]');
      const comp = JSON.parse(localStorage.getItem(`plan-completed-${iso}`) || '[]');
      const hidden = JSON.parse(localStorage.getItem(`plan-hidden-ai-${iso}`) || '[]');
      const notes = localStorage.getItem(`plan-notes-${iso}`) || '';
      setCustomTasks(Array.isArray(ct) ? ct : []);
      setCompletedIds(new Set(Array.isArray(comp) ? comp : []));
      setHiddenAiIds(new Set(Array.isArray(hidden) ? hidden : []));
      setDayNotes(notes);
    } catch {
      setCustomTasks([]);
      setCompletedIds(new Set());
      setHiddenAiIds(new Set());
      setDayNotes('');
    }
  };
  const saveCustomTasks = (iso: string, tasks: CustomTask[]) => {
    try { localStorage.setItem(`plan-custom-tasks-${iso}`, JSON.stringify(tasks)); } catch {}
  };
  const saveCompleted = (iso: string, ids: Set<string>) => {
    try { localStorage.setItem(`plan-completed-${iso}`, JSON.stringify(Array.from(ids))); } catch {}
  };
  const saveHiddenAi = (iso: string, ids: Set<string>) => {
    try { localStorage.setItem(`plan-hidden-ai-${iso}`, JSON.stringify(Array.from(ids))); } catch {}
  };
  const saveNotes = (iso: string, text: string) => {
    try { localStorage.setItem(`plan-notes-${iso}`, text); } catch {}
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
  const moveTask = (index: number, dir: -1 | 1) => {
    if (!openIso) return;
    const next = customTasks.slice();
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= next.length) return;
    const [t] = next.splice(index, 1);
    next.splice(newIndex, 0, t);
    setCustomTasks(next);
    saveCustomTasks(openIso, next);
  };
  const hideAiTask = (i: number) => {
    const id = `ai-${i}`;
    const next = new Set(hiddenAiIds);
    next.add(id);
    setHiddenAiIds(next);
    if (openIso) saveHiddenAi(openIso, next);
  };
  const hideAllAiTasks = () => {
    const total = (getDay(openDayKey)?.tasks || []).length;
    const next = new Set<string>();
    for (let i = 0; i < total; i++) next.add(`ai-${i}`);
    setHiddenAiIds(next);
    if (openIso) saveHiddenAi(openIso, next);
  };
  const restoreAllAiTasks = () => {
    const next = new Set<string>();
    setHiddenAiIds(next);
    if (openIso) saveHiddenAi(openIso, next);
  };
  const duplicateToTomorrow = () => {
    if (!openIso) return;
    const date = new Date(openIso);
    date.setDate(date.getDate() + 1);
    const iso = toISO(date);
    const aiTasks = (getDay(openDayKey)?.tasks || []).map(t => ({ title: t.title, minutes: t.minutes }));
    const existing = JSON.parse(localStorage.getItem(`plan-custom-tasks-${iso}`) || '[]');
    const merged = Array.isArray(existing) ? [...existing, ...customTasks, ...aiTasks] : [...customTasks, ...aiTasks];
    try { localStorage.setItem(`plan-custom-tasks-${iso}`, JSON.stringify(merged)); } catch {}
  };
  const resetDay = () => {
    if (!openIso) return;
    setCustomTasks([]);
    setCompletedIds(new Set());
    setDayNotes('');
    saveCustomTasks(openIso, []);
    saveCompleted(openIso, new Set());
    saveNotes(openIso, '');
  };

  const resetAllLocalPlanData = () => {
    const confirmReset = window.confirm('Reset all local study plan data (completions, custom tasks, notes)?');
    if (!confirmReset) return;
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i) as string;
      if (!k) continue;
      if (k.startsWith('plan-') || k.startsWith('quicktodo-')) keysToRemove.push(k);
    }
    keysToRemove.forEach((k) => { try { localStorage.removeItem(k); } catch {} });
    // reset current view state
    setCompletedIds(new Set());
    setCustomTasks([]);
    setHiddenAiIds(new Set());
    setDayNotes('');
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
        {/* Focus → To‑dos generator */}
        <div className="rounded-xl border border-slate-200 bg-white/70 p-4 mb-6">
          <div className="text-sm font-medium text-slate-800 mb-2">Generate tasks from your focus (write in any language)</div>
          <textarea value={focusText} onChange={(e)=>setFocusText(e.target.value)} className="w-full rounded-md border px-3 py-2 min-h-[80px]" placeholder="예: 그래프 비교 쓰기(Task 1)와 cohesion 연결어 연습" />
          <div className="mt-2">
            <button onClick={generateTodosFromFocus} disabled={isGenerating || !focusText.trim()} className="px-4 py-2 rounded-md bg-black text-white disabled:opacity-50">
              {isGenerating ? 'Generating…' : 'Generate To‑dos'}
            </button>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-800 transition-colors"
          >
            Go to Dashboard
          </button>
          <button
            onClick={() => navigate('/onboarding/assessment')}
            className="px-4 py-2 rounded-lg bg-black text-white hover:bg-black/90 transition-colors"
          >
            New Assessment
          </button>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-slate-600">View mode</div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-700">Todo list focus</label>
            <input type="checkbox" checked={showTodosOnly} onChange={(e) => setShowTodosOnly((e.target as HTMLInputElement).checked)} />
          </div>
        </div>

        {/* Highlights / Quick Wins removed; keep only essential pacing if needed */}

        {/* Today's Tasks Section */}
        {(() => {
          const today = new Date();
          const todayEntry = allDays.find(d => d.date.toDateString() === today.toDateString());
          if (!todayEntry || todayEntry.tasks.length === 0) return null;
          
          return (
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6 mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-blue-900">Today's Study Tasks</h2>
                <button 
                  onClick={() => openDay(todayEntry.week, todayEntry.day)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  View Details
                </button>
              </div>
              <div className="grid gap-3">
                {todayEntry.tasks.map((task, i) => (
                  <label key={i} className="flex items-center justify-between bg-white rounded-lg p-3 border border-blue-100">
                    <div className="flex items-center gap-3">
                      <input type="checkbox" />
                      <span className="font-medium text-slate-800">{task.title}</span>
                    </div>
                    <span className="text-sm text-blue-600 bg-blue-100 px-2 py-1 rounded">
                      {task.minutes} min
                    </span>
                  </label>
                ))}
                <div className="text-sm text-blue-700 mt-2">
                  Total: {todayEntry.tasks.reduce((sum, task) => sum + task.minutes, 0)} minutes
                </div>
              </div>
            </div>
          );
        })()}

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
          <div className="flex items-center gap-3">
            <button className="text-xs underline" onClick={resetAllLocalPlanData}>Reset all</button>
            <div className="text-xs text-slate-500">Daily ~{plan.meta?.dailyMinutes || plan.meta?.dailyMinutes === 0 ? plan.meta?.dailyMinutes : 60} min</div>
          </div>
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
                    const isToday = new Date().toDateString() === cell.date.toDateString();
                    const isSelected = openDayKey === `${cell.week}-${cell.day}`;
                    const totalMinutes = cell.tasks.reduce((sum, task) => sum + task.minutes, 0);
                    
                    return (
                      <button 
                        key={iso} 
                        className={`h-24 rounded-2xl border p-2 text-left shadow-sm transition-all duration-200 ${
                          cell.tasks.length 
                            ? isSelected 
                              ? 'bg-blue-100 border-blue-300 ring-2 ring-blue-200' 
                              : completed
                                ? 'bg-green-100 border-green-300 hover:bg-green-200'
                                : 'bg-white/80 border-white/60 hover:bg-white hover:border-blue-200'
                            : 'bg-white/40 border-white/40 hover:bg-white/60'
                        } ${isToday ? 'ring-2 ring-orange-200' : ''}`} 
                        onClick={() => openDay(cell.week, cell.day)}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1">
                            <span className={`text-sm font-medium ${isToday ? 'text-orange-600' : 'text-slate-900'}`}>
                              {cell.date.getDate()}
                            </span>
                            {isToday && <span className="text-xs text-orange-500">Today</span>}
                          </div>
                          <div className="flex items-center gap-1">
                            {cell.tasks.length > 0 && (
                              <span className="text-xs text-slate-500 bg-slate-100 px-1 rounded">
                                {totalMinutes}m
                              </span>
                            )}
                            <input 
                              type="checkbox" 
                              aria-label={`Mark ${iso} complete`} 
                              onChange={(e) => {
                                if ((e.target as HTMLInputElement).checked) localStorage.setItem(completeKey, '1'); 
                                else localStorage.removeItem(completeKey);
                              }} 
                              defaultChecked={completed} 
                              onClick={(e) => e.stopPropagation()}
                              className="w-3 h-3"
                            />
                          </div>
                        </div>
                        <ul className="space-y-1 text-slate-700 text-xs">
                          {cell.tasks.slice(0,2).map((t,i) => (
                            <li key={i} className="flex items-center justify-between">
                              <span className="truncate max-w-[120px]">{t.title}</span>
                              {!showTodosOnly && <span className="text-[10px] text-slate-500">{t.minutes}m</span>}
                            </li>
                          ))}
                          {cell.tasks.length > 2 && <li className="text-[10px] text-slate-500">+{cell.tasks.length-2} more</li>}
                          {cell.tasks.length === 0 && (
                            <li className="text-[10px] text-slate-400 italic">No tasks</li>
                          )}
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
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-800 mb-2">AI Tasks</h4>
                <div className="flex items-center gap-2 text-xs">
                    <button className="rounded-md border px-2 py-1" onClick={duplicateToTomorrow}>Duplicate to tomorrow</button>
                    <button className="rounded-md border px-2 py-1" onClick={hideAllAiTasks}>Remove all AI tasks</button>
                    <button className="rounded-md border px-2 py-1" onClick={restoreAllAiTasks}>Restore AI tasks</button>
                    <button className="rounded-md border px-2 py-1" onClick={resetDay}>Reset day</button>
                  </div>
                </div>
                  <ul className="space-y-2 text-slate-800">
                    {(getDay(openDayKey)?.tasks || []).map((t, i) => {
                    const id = `ai-${i}`;
                      if (hiddenAiIds.has(id)) return null;
                    return (
                      <li key={id} className="flex items-center justify-between rounded-lg border p-3">
                        <label className="flex items-center gap-3">
                          <input type="checkbox" checked={completedIds.has(id)} onChange={() => toggleTaskDone(id)} />
                          <span>{t.title}</span>
                        </label>
                          <div className="flex items-center gap-3 text-xs text-slate-500">
                            <span>{t.minutes} min</span>
                            <button className="text-red-500" onClick={() => hideAiTask(i)}>Remove</button>
                          </div>
                      </li>
                    );
                  })}
                </ul>
                <div>
                  <h4 className="text-sm font-semibold text-slate-800 mb-2">Your Tasks</h4>
                  <div className="flex gap-2 mb-2">
                    <input value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder="Add a task (e.g., Writing Task 2 intro)" className="flex-1 rounded-md border px-3 py-2" />
                    <input type="number" value={newTaskMinutes} onChange={(e) => setNewTaskMinutes(Number(e.target.value))} className="w-24 rounded-md border px-3 py-2" />
                    <button className="rounded-md bg-black text-white px-3 py-2" onClick={addCustomTask}>Add</button>
                  </div>
                  {/* Quick add from curated Task Bank */}
                  <details className="mb-2">
                    <summary className="cursor-pointer text-sm text-slate-700">Add from Task Bank</summary>
                    <BankPicker onPick={(t)=>{
                      setNewTaskTitle(t.label);
                      setNewTaskMinutes(t.minutes);
                    }} />
                  </details>
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
                            <button className="border rounded px-2 py-1" onClick={() => moveTask(i, -1)}>Up</button>
                            <button className="border rounded px-2 py-1" onClick={() => moveTask(i, 1)}>Down</button>
                            <button className="text-red-500" onClick={() => removeCustomTask(i)}>Remove</button>
                          </div>
                        </li>
                      );
                    })}
                    {customTasks.length === 0 && <li className="text-sm text-slate-500">No custom tasks yet.</li>}
                  </ul>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-800 mb-2">Notes</h4>
                  <textarea value={dayNotes} onChange={(e) => { setDayNotes(e.target.value); if (openIso) saveNotes(openIso, e.target.value); }} className="w-full rounded-md border px-3 py-2 min-h-[80px]" placeholder="Key mistakes, time spent, reflections..." />
                  <div className="mt-2 text-xs text-slate-500">Total planned minutes: {((getDay(openDayKey)?.tasks || []).reduce((s,t)=>s+t.minutes,0) + customTasks.reduce((s,t)=>s+t.minutes,0))} min</div>
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

// Lightweight picker of curated tasks for quick adding
function BankPicker({ onPick }: { onPick: (t: TaskBankItem) => void }) {
  const [skill, setSkill] = useState<typeof SKILLS[number]>('all');
  const [level, setLevel] = useState<typeof LEVELS[number]>('any');
  const [q, setQ] = useState('');
  const groups = useMemo(() => {
    const items = filterTaskBank({ skill, level, query: q });
    const map = new Map<string, TaskBankItem[]>();
    for (const item of items) {
      if (!map.has(item.skill)) map.set(item.skill, []);
      map.get(item.skill)!.push(item);
    }
    return Array.from(map.entries());
  }, [skill, level, q]);
  return (
    <div className="mt-2 border rounded-lg p-3 bg-white/70">
      <div className="flex gap-2 items-center mb-2">
        <select value={skill} onChange={(e)=>setSkill(e.target.value as any)} className="rounded border px-2 py-1 text-sm">
          {SKILLS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={level} onChange={(e)=>setLevel(e.target.value as any)} className="rounded border px-2 py-1 text-sm">
          {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        <input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Search (e.g., inference)" className="flex-1 rounded border px-2 py-1 text-sm" />
      </div>
      <div className="max-h-64 overflow-auto">
      {groups.map(([skill, items]) => (
        <div key={skill} className="mb-2">
          <div className="text-xs font-semibold text-slate-700 mb-1 uppercase">{skill}</div>
          <div className="grid gap-2">
            {items.map((t) => (
              <button key={t.id} onClick={() => onPick(t)} className="text-left text-sm px-2 py-1 rounded border hover:bg-slate-50">
                {t.label} <span className="text-xs text-slate-500">• {t.minutes} min</span>
              </button>
            ))}
          </div>
        </div>
      ))}
      </div>
    </div>
  );
}
