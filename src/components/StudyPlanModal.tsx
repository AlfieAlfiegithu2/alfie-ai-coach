import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import i18n from '@/lib/i18n';
// Removed TTSTestButton (debug control)

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

const LANGS = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' }
] as const;

const StudyPlanModal = ({ children }: StudyPlanModalProps) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<PlanData | null>(null);
  const [lang, setLang] = useState<string>(() => i18n.language || 'en');
  const [aiOpen, setAiOpen] = useState(false);
  const [aiProvider, setAiProvider] = useState<'deepseek' | 'gemini'>('gemini');
  const [aiTarget, setAiTarget] = useState<number>(7.0);
  const [aiDeadline, setAiDeadline] = useState<string>('');
  const [aiMinutes, setAiMinutes] = useState<number>(60);
  const [aiDays, setAiDays] = useState<Set<number>>(new Set([1,2,3,4,5]));
  const [aiFirstLang, setAiFirstLang] = useState<string>(() => i18n.language || 'en');
  const [aiBilingual, setAiBilingual] = useState<boolean>(() => (i18n.language && i18n.language !== 'en'));
  const [aiWeak, setAiWeak] = useState<Set<string>>(new Set());
  const [aiNotes, setAiNotes] = useState<string>('');
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [confirmNewPlan, setConfirmNewPlan] = useState<boolean>(false);
  const [newPlanData, setNewPlanData] = useState<PlanData | null>(null);

  useEffect(() => {
    if (!open) return;
    const normalizeLang = (l: string) => {
      const s = (l || '').toLowerCase();
      const map: Record<string, string> = {
        'zh-cn': 'zh', 'zh-hans': 'zh', 'zh-hant': 'zh', 'cn': 'zh', 'chinese': 'zh', '中文': 'zh', 'zh': 'zh',
        'ko-kr': 'ko', 'korean': 'ko', '한국어': 'ko', 'ko': 'ko',
        'ja-jp': 'ja', 'japanese': 'ja', '日本語': 'ja', 'ja': 'ja',
        'es-es': 'es', 'spanish': 'es', 'español': 'es', 'es': 'es',
        'pt-pt': 'pt', 'portuguese': 'pt', 'português': 'pt', 'pt': 'pt',
        'fr-fr': 'fr', 'french': 'fr', 'français': 'fr', 'fr': 'fr',
        'de-de': 'de', 'german': 'de', 'deutsch': 'de', 'de': 'de',
        'ru-ru': 'ru', 'russian': 'ru', 'русский': 'ru', 'ru': 'ru',
        'hi-in': 'hi', 'hindi': 'hi', 'हिन्दी': 'hi', 'hi': 'hi',
        'vi-vn': 'vi', 'vietnamese': 'vi', 'tiếng việt': 'vi', 'vi': 'vi'
      };
      return map[s] || s || 'en';
    };
    // Load student's saved native language and set defaults
    (async () => {
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: profile } = await supabase
          .from('profiles')
          .select('native_language')
          .eq('id', user.id)
          .single();
        if (profile?.native_language) {
          const norm = normalizeLang(profile.native_language);
          setAiFirstLang(norm);
          setAiBilingual(norm !== 'en');
        }
      } catch {}
    })();
    // Instant seed from local cache for fast paint
    try {
      const cached = JSON.parse(localStorage.getItem('latest_plan') || 'null');
      if (cached?.plan) setPlan(cached.plan as PlanData);
    } catch {}
    void loadPlan();
  }, [open]);

  useEffect(() => {
    const handler = () => { if (open) void loadPlan(); };
    window.addEventListener('focus', handler);
    return () => window.removeEventListener('focus', handler);
  }, [open]);

  // Changing UI language shouldn't refetch plan; the plan content is already bilingual where relevant

  const loadPlan = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      // Single round-trip: embed study_plans via FK
      const { data: profJoin } = await (supabase as any)
        .from('profiles')
        .select('current_plan_id, study_plans!profiles_current_plan_id_fkey(id, plan, updated_at)')
        .eq('id', user.id)
        .single();
      const joined = profJoin?.['study_plans'];
      const planRow = Array.isArray(joined) ? joined[0] : joined;
      if (planRow?.plan) setPlan(planRow.plan as PlanData);
    } finally {
      setLoading(false);
    }
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm" className="bg-white/10 border-white/20 text-slate-800 hover:bg-white/20">
      Study Plan
    </Button>
  );

  const getNextActions = () => {
    if (!plan?.weekly?.length) return [] as PlanTask[];
    const firstWeek = plan.weekly[0];
    const firstDay = firstWeek?.days?.[0];
    return firstDay?.tasks?.slice(0, 5) || [];
  };

  const buildCalendarPreview = () => {
    if (!plan?.weekly?.length) return { headers: [], cells: [] as Array<{ label: string; hasTasks: boolean }> };
    const startISO = (plan as any).meta?.startDateISO || new Date().toISOString();
    const startDate = new Date(startISO);
    const headers = ['Su','Mo','Tu','We','Th','Fr','Sa'];
    const cells: Array<{ label: string; hasTasks: boolean; week: number; day: number } > = [];
    const monthStart = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const offset = monthStart.getDay();
    for (let i = 0; i < offset; i++) cells.push({ label: '', hasTasks: false, week: 0, day: 0 });
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
    while (cells.length % 7 !== 0) cells.push({ label: '', hasTasks: false, week: 0, day: 0 });
    return { headers, cells };
  };
  const calendar = buildCalendarPreview();

  const switchLang = async (target: string) => {
    if (lang === target) return;
    await i18n.changeLanguage(target);
    setLang(target);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto bg-white/95 backdrop-blur-xl border-white/20">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-slate-800">Your Study Plan</DialogTitle>
            <div className="flex items-center gap-2 text-xs">
              <select value={lang} onChange={(e)=>switchLang(e.target.value)} className="rounded-md border px-2 py-1">
                {LANGS.map(l => (<option key={l.code} value={l.code}>{l.flag} {l.name}</option>))}
              </select>
            </div>
          </div>
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
              <div className="my-3 text-center text-slate-500 text-xs">or</div>
              <Button
                variant="outline"
                className="border-slate-300"
                onClick={() => setAiOpen(true)}
              >
                Quick AI Plan (no assessment)
              </Button>
            </div>
          )}
          {loading && (
            <div className="text-slate-600">Loading your plan…</div>
          )}
          {plan && (
            <div className="space-y-6">
              <TodayQuickTodo plan={plan} />
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
                    <li key={i}>{t.title}</li>
                  ))}
                </ul>
              </div>
            <div>
              <h3 className="text-slate-800 font-semibold mb-2">This month</h3>
              <ScrollableMiniCalendar plan={plan} onOpenFull={() => navigate('/plan')} />
            </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white"
                  onClick={() => {
                    setOpen(false);
                    navigate('/onboarding/assessment');
                  }}
                >
                  Retake Level Assessment
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setAiOpen(true)}
                >
                  Quick AI Plan (no assessment)
                </Button>
              </div>
              {/* Debug controls removed */}
            </div>
          )}
        </div>
        {aiOpen && (
          <div className="fixed inset-0 bg-black/30 flex items-end sm:items-center justify-center p-4 z-50">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="text-lg font-semibold text-slate-900">Quick AI Plan</div>
                <button className="text-slate-500" onClick={()=>setAiOpen(false)}>Close</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="text-sm text-slate-700">
                  Target IELTS
                  <select value={aiTarget} onChange={(e)=>setAiTarget(Number(e.target.value))} className="mt-1 w-full rounded-md border px-2 py-2">
                    {[5.0,5.5,6.0,6.5,7.0,7.5,8.0].map(n=> (
                      <option key={n} value={n}>{n.toFixed(1)}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm text-slate-700">
                  AI Provider
                  <select value={aiProvider} onChange={(e)=>setAiProvider(e.target.value as any)} className="mt-1 w-full rounded-md border px-2 py-2">
                    <option value="gemini">Gemini 2.5 Flash (fast)</option>
                    <option value="deepseek">DeepSeek (alt)</option>
                  </select>
                </label>
                <label className="text-sm text-slate-700">
                  Deadline (optional)
                  <input type="date" value={aiDeadline} onChange={(e)=>setAiDeadline(e.target.value)} className="mt-1 w-full rounded-md border px-2 py-2" />
                </label>
                <label className="text-sm text-slate-700">
                  Minutes per day
                  <input type="number" min={20} max={180} value={aiMinutes} onChange={(e)=>setAiMinutes(Number(e.target.value)||60)} className="mt-1 w-full rounded-md border px-2 py-2" />
                </label>
                <label className="text-sm text-slate-700">
                  First language
                  <select value={aiFirstLang} onChange={(e)=>setAiFirstLang(e.target.value)} className="mt-1 w-full rounded-md border px-2 py-2">
                    {LANGS.map(l => (<option key={l.code} value={l.code}>{l.flag} {l.name}</option>))}
                  </select>
                </label>
                <div className="sm:col-span-2">
                  <div className="text-sm text-slate-700 mb-1">Study days</div>
                  <div className="flex flex-wrap gap-2">
                    {['Su','Mo','Tu','We','Th','Fr','Sa'].map((d, i) => {
                      const active = aiDays.has(i);
                      return (
                        <button key={d} type="button" onClick={()=>{
                          const next = new Set(aiDays); next.has(i) ? next.delete(i) : next.add(i); setAiDays(next);
                        }} className={`px-3 py-1 rounded-md border ${active ? 'bg-black text-white border-black' : 'bg-white border-slate-300'}`}>
                          {d}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <div className="text-sm text-slate-700 mb-1">Weak areas (optional)</div>
                  <div className="flex flex-wrap gap-2 text-sm">
                    {['vocab','listening','reading','grammar','writing','speaking'].map(w => {
                      const sel = aiWeak.has(w);
                      return (
                        <button key={w} type="button" onClick={()=>{
                          const next = new Set(aiWeak); sel ? next.delete(w) : next.add(w); setAiWeak(next);
                        }} className={`px-3 py-1 rounded-full border ${sel ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-slate-300'}`}>
                          {w}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
                  <input type="checkbox" checked={aiBilingual} onChange={(e)=>setAiBilingual((e.target as HTMLInputElement).checked)} />
                  Show plan in first language (keep IELTS keywords in English)
                </label>
                <label className="text-sm text-slate-700 sm:col-span-2">
                  Anything else to consider? (schedule limits, modules, focus)
                  <textarea value={aiNotes} onChange={(e)=>setAiNotes(e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2 min-h-[60px]" placeholder="e.g., Academic module, weak in Task 1 charts, only study Mon/Wed/Fri" />
                </label>
              </div>
              <div className="mt-4 flex gap-3 justify-end">
                <Button variant="outline" onClick={()=>setAiOpen(false)}>Cancel</Button>
                <Button className="bg-slate-900 text-white" disabled={aiLoading} onClick={async ()=>{
                  setAiLoading(true);
                  try {
                    const days = Array.from(aiDays).sort((a,b)=>a-b);
                    const { data, error } = await supabase.functions.invoke('plan-ai-generator', {
                      body: {
                        targetScore: aiTarget,
                        targetDeadline: aiDeadline || null,
                        minutesPerDay: aiMinutes,
                        studyDays: days,
                        firstLanguage: aiFirstLang,
                        planNativeLanguage: aiBilingual ? 'yes' : 'no',
                        weakAreas: Array.from(aiWeak),
                        notes: aiNotes || '',
                        provider: aiProvider
                      }
                    });
                    if (error || !data?.success) throw error || new Error(data?.error || 'Failed');
                    const planJson = data.plan as PlanData;
                    // persist as current plan when signed in
                    try {
                      const { data: { user } } = await supabase.auth.getUser();
                      if (user) {
                        const { data: planRow, error: planErr } = await (supabase as any)
                          .from('study_plans')
                          .insert({ user_id: user.id, plan: planJson, goal: 'ielts', source: 'ai' })
                          .select('*')
                          .single();
                        if (planErr) throw planErr;
                        await (supabase as any).from('profiles').update({ current_plan_id: planRow.id }).eq('id', user.id);
                      }
                    } catch {}
                    setNewPlanData(planJson);
                    setConfirmNewPlan(true);
                    setAiOpen(false);
                  } catch (e) {
                    alert('Could not generate plan. Please try again.');
                  } finally {
                    setAiLoading(false);
                  }
                }}>{aiLoading ? 'Generating…' : 'Generate Plan'}</Button>
              </div>
            </div>
          </div>
        )}
        
        {confirmNewPlan && newPlanData && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={()=>setConfirmNewPlan(false)}>
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6" onClick={(e)=>e.stopPropagation()}>
              <div className="text-lg font-semibold text-slate-900 mb-3">New Plan Generated!</div>
              <div className="text-sm text-slate-600 mb-4">
                You have a new AI-generated study plan. Would you like to keep this new plan or continue with your current one?
              </div>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    setConfirmNewPlan(false);
                    setNewPlanData(null);
                  }}
                >
                  Keep Current Plan
                </Button>
                <Button 
                  className="flex-1 bg-slate-900 text-white"
                  onClick={async () => {
                    try { localStorage.setItem('latest_plan', JSON.stringify({ plan: newPlanData, ts: Date.now() })); } catch {}
                    setPlan(newPlanData);
                    // Ensure profile points to new plan if saved earlier
                    try {
                      const { data: { user } } = await supabase.auth.getUser();
                      if (user) {
                        // No-op here; insertion already done before confirmation in generator. This ensures modal state persists.
                      }
                    } catch {}
                    setConfirmNewPlan(false);
                    setNewPlanData(null);
                  }}
                >
                  Use New Plan
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default StudyPlanModal;


// Lightweight components appended for modal UX
function TodayQuickTodo({ plan }: { plan: any }) {
  const today = new Date();
  const start = plan?.meta?.startDateISO ? new Date(plan.meta.startDateISO) : new Date();
  const diffDays = Math.max(0, Math.floor((today.getTime() - start.getTime()) / (24*60*60*1000)));
  const w = Math.floor(diffDays / 7);
  const d = diffDays % 7;
  
  // Find today's tasks or next available study day
  let day = plan?.weekly?.[w]?.days?.[d];
  if (!day || day.tasks.length === 0) {
    // Look for next study day within the next 7 days
    for (let offset = 1; offset <= 7; offset++) {
      const nextD = (d + offset) % 7;
      const nextW = w + Math.floor((d + offset) / 7);
      const nextDay = plan?.weekly?.[nextW]?.days?.[nextD];
      if (nextDay && nextDay.tasks.length > 0) {
        day = nextDay;
        break;
      }
    }
  }
  // Fallback to first available day
  if (!day || day.tasks.length === 0) {
    day = plan?.weekly?.[0]?.days?.find((d: any) => d.tasks.length > 0) || plan?.weekly?.[0]?.days?.[0];
  }
  
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
              <div className="text-xs text-slate-500 flex items-center gap-2 whitespace-nowrap">
                <button aria-label="Remove" title="Remove" className="h-5 w-5 rounded-full border border-red-300 text-red-600 flex items-center justify-center hover:bg-red-50" onClick={() => hideAi(i)}>
                  ×
                </button>
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
              <button aria-label='Remove' title='Remove' className="h-5 w-5 rounded-full border border-red-300 text-red-600 flex items-center justify-center hover:bg-red-50" onClick={() => removeCustom(i)}>×</button>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex gap-2">
        <input value={custom.title} onChange={(e)=>setCustom(c=>({...c,title:e.target.value}))} placeholder="Add a task" className="flex-1 rounded-md border px-3 py-2" />
        <button className="rounded-md bg-black text-white px-3 py-2" onClick={addCustom}>Add</button>
      </div>
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

