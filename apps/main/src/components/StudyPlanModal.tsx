import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import i18n from '@/lib/i18n';
import { formatLocalISO, getPlanDayForLocalDate, normalizeToLocalMidnight } from '@/lib/date';
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
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<PlanData | null>(null);
  const [planId, setPlanId] = useState<string | null>(null);
  // Removed per UX request: in-modal language switcher
  const [aiOpen, setAiOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [miniDate, setMiniDate] = useState<Date | null>(null);
  // Provider choice removed; default server logic picks the best available
  const [aiTarget, setAiTarget] = useState<number>(7.0);
  const [aiDeadline, setAiDeadline] = useState<string>('');
  const [aiMinutes, setAiMinutes] = useState<number>(60);
  const [aiDays, setAiDays] = useState<Set<number>>(new Set([1,2,3,4,5]));
  const [aiFirstLang, setAiFirstLang] = useState<string>(() => i18n.language || 'en');
  // Plan language: choose explicit language for plan content
  const [aiBilingual, setAiBilingual] = useState<boolean>(true);
  const [aiWeak, setAiWeak] = useState<Set<string>>(new Set());
  const [aiNotes, setAiNotes] = useState<string>('');
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  // Confirmation removed: new plans replace current immediately

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
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        // Pull dashboard/user preferences deadline for default sync
        const { data: prefs } = await (supabase as any)
          .from('user_preferences')
          .select('target_deadline')
          .eq('user_id', user.id)
          .maybeSingle();
        if (prefs?.target_deadline) {
          setAiDeadline(String(prefs.target_deadline));
        }
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
    // Load latest plan from DB (fallback to local cache inside loadPlan)
    // Cache-first: if local cache exists, show it immediately and refresh in background
    try {
      const cached = JSON.parse(localStorage.getItem('latest_plan') || 'null');
      if (cached?.plan) setPlan(cached.plan as any);
    } catch {}
    void loadPlan();
  }, [open]);

  useEffect(() => {
    let t: any;
    const handler = () => {
      if (!open) return;
      clearTimeout(t);
      t = setTimeout(() => void loadPlan(), 250);
    };
    window.addEventListener('focus', handler);
    return () => window.removeEventListener('focus', handler);
  }, [open]);

  // Changing UI language shouldn't refetch plan; the plan content is already bilingual where relevant

  const loadPlan = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // Check local cache first - if we have a recent plan, don't overwrite it with stale DB data
      let localCache: any = null;
      try {
        const cached = JSON.parse(localStorage.getItem('latest_plan') || 'null');
        if (cached?.plan && cached?.ts) {
          localCache = cached;
          // If it's marked as fresh, prioritize it heavily
          if (cached.fresh) {
            console.log('🔄 Using fresh local plan (marked as fresh)');
            setPlan(cached.plan as PlanData);
            setLoading(false);
            return;
          }
        }
      } catch {}
      
      // Single round-trip: embed study_plans via FK
      const { data: profJoin } = await (supabase as any)
        .from('profiles')
        .select('current_plan_id, study_plans!profiles_current_plan_id_fkey(id, plan, updated_at)')
        .eq('id', user.id)
        .single();
      const joined = profJoin?.['study_plans'];
      const planRow = Array.isArray(joined) ? joined[0] : joined;
      
      if (planRow?.plan) {
        try { setPlanId(planRow.id as string); } catch {}
        // Recency guard: only use DB plan if it's newer than local cache (within 30 seconds tolerance)
        const dbTime = new Date(planRow.updated_at).getTime();
        const localTime = localCache?.ts || 0;
        const timeDiff = Math.abs(dbTime - localTime);
        
        if (!localCache || timeDiff > 30000) { // 30 seconds tolerance
          setPlan(planRow.plan as PlanData);
          try { localStorage.setItem('latest_plan', JSON.stringify({ plan: planRow.plan, ts: Date.now() })); } catch {}
        } else {
          // Keep the local cache if it's recent enough
          setPlan(localCache.plan as PlanData);
          // Clear the fresh flag after 5 minutes to allow normal DB updates
          if (localCache.fresh && (Date.now() - localCache.ts) > 300000) {
            try {
              localStorage.setItem('latest_plan', JSON.stringify({ 
                plan: localCache.plan, 
                ts: localCache.ts 
              }));
            } catch {}
          }
        }
      } else if (localCache?.plan) {
        // Fallback to local cache
        setPlan(localCache.plan as PlanData);
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

  // Language switching is handled globally; no per-modal selector

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] min-h-[400px] overflow-y-auto bg-white/95 backdrop-blur-xl border-white/20 z-[58]">
        <DialogHeader>
      <DialogTitle className="text-slate-800">{t('studyPlan.title', { defaultValue: 'Your Study Plan' })}</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {!loading && !plan && (
            <div className="text-slate-700">
              <p className="mb-3">{t('studyPlan.noPlanYet', { defaultValue: "You don't have a plan yet." })}</p>
              <Button
                variant="outline"
                className="border-slate-300"
                onClick={() => { setMiniDate(null); setAiOpen(true); }}
              >
                {t('studyPlan.quickAIPlanNoAssessment', { defaultValue: 'Create Study Plan' })}
              </Button>
            </div>
          )}
          {loading && (
            <div className="text-slate-600">{t('studyPlan.loadingPlan', { defaultValue: 'Loading your plan…' })}</div>
          )}
          {plan && (
            <div className="space-y-6">
              <TodayQuickTodo plan={plan} />
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs text-slate-500">{t('studyPlan.status', { defaultValue: 'Loaded' })}</div>
                  <button
                    className="text-xs underline"
                    onClick={() => setMiniDate(normalizeToLocalMidnight(new Date()))}
                  >
                    {t('studyPlan.goToToday', { defaultValue: 'Go to Today' })}
                  </button>
                </div>
                <ScrollableMiniCalendar plan={plan} onOpenDay={(date: Date) => setMiniDate(date)} />
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => { setMiniDate(null); setAiOpen(true); }}
                >
                  {t('studyPlan.quickAIPlanNoAssessment', { defaultValue: 'Create Plan' })}
                </Button>
              </div>
              {/* Debug controls removed */}
            </div>
          )}
        </div>
        {aiOpen && (
          <Dialog open={aiOpen} onOpenChange={setAiOpen}>
            <DialogContent className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-5 z-[61] sm:max-w-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="text-lg font-semibold text-slate-900">{t('studyPlan.quickAIPlan', { defaultValue: 'Quick AI Plan' })}</div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="text-sm text-slate-700">
                  {t('studyPlan.targetIELTS', { defaultValue: 'Target IELTS' })}
                  <select value={aiTarget} onChange={(e)=>setAiTarget(Number(e.target.value))} className="mt-1 w-full rounded-md border px-2 py-2">
                    {[5.0,5.5,6.0,6.5,7.0,7.5,8.0].map(n=> (
                      <option key={n} value={n}>{n.toFixed(1)}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm text-slate-700">
                  {t('studyPlan.deadline', { defaultValue: 'Deadline' })}
                  <div className="flex gap-2 mt-1">
                    <input type="date" min={new Date().toISOString().slice(0,10)} value={aiDeadline} onChange={(e)=>setAiDeadline(e.target.value)} className="flex-1 rounded-md border px-2 py-2" />
                  </div>
                </label>
                <label className="text-sm text-slate-700">
                  {t('studyPlan.minutesPerDay', { defaultValue: 'Minutes per day' })}
                  <input type="number" min={20} max={180} value={aiMinutes} onChange={(e)=>setAiMinutes(Number(e.target.value)||60)} className="mt-1 w-full rounded-md border px-2 py-2" />
                </label>
                <label className="text-sm text-slate-700">
                  {t('studyPlan.planLanguage', { defaultValue: 'Plan language' })}
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
                {/* Bilingual option removed; language is chosen explicitly */}
                <label className="text-sm text-slate-700 sm:col-span-2">
                  {t('studyPlan.optional', { defaultValue: 'Anything else to consider? (schedule limits, modules, focus)' })}
                  <textarea value={aiNotes} onChange={(e)=>setAiNotes(e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2 min-h-[60px]" placeholder={t('studyPlan.placeholder', { defaultValue: 'e.g., Academic module, weak in Task 1 charts, only study Mon/Wed/Fri' })} />
                </label>
              </div>
              <div className="mt-4 flex gap-3 justify-end">
                <Button variant="outline" onClick={()=>setAiOpen(false)}>{t('common.cancel', { defaultValue: 'Cancel' })}</Button>
                <Button className="bg-slate-900 text-white" disabled={aiLoading} onClick={async ()=>{
                  setAiLoading(true);
                  try {
                    const days = Array.from(aiDays).filter((n)=>n>=0 && n<=6).sort((a,b)=>a-b);
                    const { data, error } = await supabase.functions.invoke('plan-ai-generator', {
                      body: {
                        targetScore: aiTarget,
                        targetDeadline: aiDeadline || null,
                        minutesPerDay: aiMinutes,
                        studyDays: days,
                        firstLanguage: aiFirstLang,
                        planNativeLanguage: aiFirstLang !== 'en' ? 'yes' : 'no',
                        weakAreas: Array.from(aiWeak),
                        notes: aiNotes || ''
                      }
                    });
                    if (error || !data?.success) throw error || new Error(data?.error || 'Failed to generate plan');
                    const planJson = data.plan as PlanData;
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
                    const freshTimestamp = Date.now();
                    try { localStorage.setItem('latest_plan', JSON.stringify({ plan: planJson, ts: freshTimestamp, fresh: true })); } catch {}
                    setPlan(planJson);
                    setAiOpen(false);
                  } catch (e) {
                    alert('Failed to generate plan. Please try again.');
                  } finally {
                    setAiLoading(false);
                  }
                }}>{aiLoading ? t('studyPlan.generating', { defaultValue: 'Generating…' }) : t('studyPlan.generateButton', { defaultValue: 'Generate Plan' })}</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
        
        {/* Day popup inside modal */}
        {miniDate && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setMiniDate(null)}>
            <div className="bg-white rounded-2xl shadow-xl w-[90%] max-w-xl min-h-[400px] p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">{new Date(miniDate.getFullYear(), miniDate.getMonth(), miniDate.getDate()).toLocaleDateString('en-CA')}</h3>
                <button className="text-slate-500 hover:text-slate-700" onClick={() => setMiniDate(null)}>Close</button>
              </div>
              <DayQuickTodo plan={plan} date={miniDate} />
              <div className="mt-4 flex justify-end">
                <button
                  className="text-xs text-red-600 underline"
                  onClick={() => {
                    // Close first to avoid trapping focus; then clear in background
                    setMiniDate(null);
                    setTimeout(async () => {
                      try {
                        const keysToRemove: string[] = [];
                        for (let i = 0; i < localStorage.length; i++) {
                          const k = localStorage.key(i) as string;
                          if (!k) continue;
                          if (k.startsWith('quicktodo-') || k.startsWith('plan-') || k === 'latest_plan') keysToRemove.push(k);
                        }
                        keysToRemove.forEach((k) => { try { localStorage.removeItem(k); } catch {} });
                      } catch {}
                      try {
                        const { data: { user } } = await supabase.auth.getUser();
                        if (user) {
                          await (supabase as any).from('study_plans').delete().eq('user_id', user.id);
                          await (supabase as any).from('profiles').update({ current_plan_id: null }).eq('id', user.id);
                        }
                      } catch {}
                      setPlan(null);
                      setRefreshKey((v)=>v+1);
                    }, 0);
                  }}
                >
                  {t('studyPlan.resetAllPlans', { defaultValue: 'Reset All Plans' })}
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Confirmation step removed */}
      </DialogContent>
    </Dialog>
  );
};

export default StudyPlanModal;


// Lightweight components appended for modal UX
// moved to shared helper in '@/lib/date'
function TodayQuickTodo({ plan }: { plan: any }) {
  // helper imported from '@/lib/date'
  const { t } = useTranslation();
  const today = new Date();
  const day = getPlanDayForLocalDate(plan, today);
  
  // Use local midnight for consistency with calendar/day view keys
  const todayLocal = normalizeToLocalMidnight(today);
  const key = formatLocalISO(todayLocal);
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
  const toggleCustom = (i: number) => {
    const customKey = `c${i}`;
    const next = { ...checked, [customKey]: !checked[customKey] };
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
            <li key={i} className="flex items-center justify-between rounded-lg border p-3 cursor-pointer hover:bg-gray-50" onClick={() => toggle(i)}>
              <div className="flex items-center gap-3">
                <input type="checkbox" checked={!!checked[i]} onChange={() => {}} className="pointer-events-none" />
                <span>{t.title}</span>
              </div>
              <div className="text-xs text-slate-500 flex items-center gap-2 whitespace-nowrap">
                <button aria-label="Remove" title="Remove" className="h-5 w-5 rounded-full border border-red-300 text-red-600 flex items-center justify-center hover:bg-red-50" onClick={(e) => { e.stopPropagation(); hideAi(i); }}>
                  ×
                </button>
              </div>
            </li>
          );
        })}
        {customTasks.map((t, i) => (
          <li key={`c${i}`} className="flex items-center justify-between rounded-lg border p-3 cursor-pointer hover:bg-gray-50" onClick={() => toggleCustom(i)}>
            <div className="flex items-center gap-3">
              <input type="checkbox" checked={!!checked[`c${i}`]} onChange={() => {}} className="pointer-events-none" />
              <span>{t.title}</span>
            </div>
            <div className="text-xs text-slate-500 flex items-center gap-2">
              <button aria-label='Remove' title='Remove' className="h-5 w-5 rounded-full border border-red-300 text-red-600 flex items-center justify-center hover:bg-red-50" onClick={(e) => { e.stopPropagation(); removeCustom(i); }}>×</button>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex gap-2">
        <input 
          value={custom.title} 
          onChange={(e)=>setCustom(c=>({...c,title:e.target.value}))} 
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
          placeholder={t('studyPlan.addTask', { defaultValue: 'Add a task' })} 
          className="flex-1 rounded-md border px-3 py-2" 
        />
        <button className="rounded-md bg-black text-white px-3 py-2" onClick={addCustom}>{t('studyPlan.add', { defaultValue: 'Add' })}</button>
      </div>
    </div>
  );
}

function ScrollableMiniCalendar({ plan, onOpenDay }: { plan: any; onOpenDay: (date: Date) => void }) {
  const startISO = plan?.meta?.startDateISO || new Date().toISOString();
  const _sd = new Date(startISO);
  const startDate = new Date(_sd.getFullYear(), _sd.getMonth(), _sd.getDate());
  const [offset, setOffset] = React.useState(0); // months from start
  const headers = ['Su','Mo','Tu','We','Th','Fr','Sa'];
  const first = new Date(startDate.getFullYear(), startDate.getMonth() + offset, 1);
  const daysInMonth = new Date(first.getFullYear(), first.getMonth()+1, 0).getDate();
  const label = first.toLocaleString(undefined, { month: 'long', year: 'numeric' });
  const leading = first.getDay();
  const blanks = Array.from({length: leading}).map((_,i)=>i);
  const days: Array<{ date: Date; hasTasks: boolean; allCompleted: boolean }> = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(first.getFullYear(), first.getMonth(), d);
    // Only consider it has tasks if there are tasks and at least one is not hidden in local quicktodo
    let hasTasks = false;
    let allCompleted = false;
    try {
      const dayObj = getPlanDayForLocalDate(plan, date);
      const tasks = dayObj?.tasks;
      if (Array.isArray(tasks) && tasks.length > 0) {
        const key = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
        const hidden = new Set(JSON.parse(localStorage.getItem(`quicktodo-hidden-ai-${key}`) || '[]'));
        const visibleTasks = tasks.filter((_, idx) => !hidden.has(String(idx)));
        hasTasks = visibleTasks.length > 0;
        
        if (hasTasks) {
          // Check if all visible tasks are completed
          const checked = JSON.parse(localStorage.getItem(`quicktodo-${key}`) || '{}');
          const customTasks = JSON.parse(localStorage.getItem(`quicktodo-custom-${key}`) || '[]');
          const allAiTasksCompleted = visibleTasks.every((_, idx) => checked[idx] === true);
          const allCustomTasksCompleted = customTasks.every((_, idx) => checked[`c${idx}`] === true);
          allCompleted = allAiTasksCompleted && allCustomTasksCompleted;
        }
      }
    } catch { hasTasks = false; allCompleted = false; }
    days.push({ date, hasTasks, allCompleted });
  }
  return (
    <div className="rounded-2xl border border-white/40 bg-white/60 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium text-slate-800">{label}</div>
        <div className="flex items-center gap-2">
          <button aria-label="Previous" className="rounded-md border px-2 py-1 text-xs" onClick={() => setOffset(o=>o-1)}>
            ←
          </button>
          <button aria-label="Next" className="rounded-md border px-2 py-1 text-xs" onClick={() => setOffset(o=>o+1)}>
            →
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-2 text-xs text-slate-500 mb-2">
        {headers.map(h => (<div key={h} className="text-center">{h}</div>))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {blanks.map(b => (<div key={`b${b}`} className="h-12" />))}
        {days.map((d, di) => {
          const now=new Date();
          const isToday = now.getFullYear()===d.date.getFullYear() && now.getMonth()===d.date.getMonth() && now.getDate()===d.date.getDate();
          return (
            <button key={di} onClick={() => onOpenDay(new Date(d.date.getFullYear(), d.date.getMonth(), d.date.getDate()))} className={`relative h-12 rounded-xl border text-sm ${d.hasTasks ? 'bg-white hover:bg-white/90 border-slate-300' : 'bg-white/40 border-white/40'}`}>
              <span className="text-slate-900">{d.date.getDate()}</span>
              {d.allCompleted ? (
                <div className="mt-1 text-yellow-500 text-xs">⭐</div>
              ) : d.hasTasks && (
                <div className="mt-1 h-1.5 w-1.5 rounded-full bg-black mx-auto" />
              )}
              {isToday && (
                <div className="absolute inset-0 rounded-xl ring-2 ring-blue-400 pointer-events-none"></div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  );
}

// Tasks for an arbitrary date within the plan; supports local per-day check, custom tasks and hide/remove AI items
function DayQuickTodo({ plan, date }: { plan: any; date: Date }) {
  const formatLocalISO = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const { t } = useTranslation();
  const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  let day = getPlanDayForLocalDate(plan, localDate) || plan?.weekly?.[0]?.days?.[0];

  const key = formatLocalISO(localDate);
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
  const toggleCustom = (i: number) => {
    const customKey = `c${i}`;
    const next = { ...checked, [customKey]: !checked[customKey] };
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
    const next = new Set(hiddenAi); next.add(String(idx)); setHiddenAi(next);
    try { localStorage.setItem(`quicktodo-hidden-ai-${key}`, JSON.stringify(Array.from(next))); } catch {}
  };
  const hideAllAi = () => {
    const total = (day?.tasks||[]).length; const next = new Set<string>();
    for (let i=0;i<total;i++) next.add(String(i)); setHiddenAi(next);
    try { localStorage.setItem(`quicktodo-hidden-ai-${key}`, JSON.stringify(Array.from(next))); } catch {}
  };
  const restoreAi = () => { const next = new Set<string>(); setHiddenAi(next); try { localStorage.setItem(`quicktodo-hidden-ai-${key}`, JSON.stringify([])); } catch {} };
  const resetDay = () => {
    try {
      localStorage.removeItem(`quicktodo-${key}`);
      localStorage.removeItem(`quicktodo-custom-${key}`);
      localStorage.removeItem(`quicktodo-hidden-ai-${key}`);
    } catch {}
    setChecked({}); setCustomTasks([]); setHiddenAi(new Set());
  };
  const totalMinutes = (day?.tasks||[]).slice(0,5).filter((_,i)=>!hiddenAi.has(String(i))).reduce((s: number,t: any)=>s+t.minutes,0) + customTasks.reduce((s,t)=>s+t.minutes,0);
  return (
    <div>
      <ul className="space-y-2">
        {(day?.tasks || []).slice(0,5).map((t: any, i: number) => {
          if (hiddenAi.has(String(i))) return null;
          return (
            <li key={`ai-${i}`} className="flex items-center justify-between rounded-lg border p-3 cursor-pointer hover:bg-gray-50" onClick={() => toggle(i)}>
              <div className="flex items-center gap-3">
                <input type="checkbox" checked={!!checked[i]} onChange={() => {}} className="pointer-events-none" />
                <span>{t.title}</span>
              </div>
              <div className="text-xs text-slate-500 flex items-center gap-2 whitespace-nowrap">
                <span>{t.minutes} min</span>
                <button className="h-5 w-5 rounded-full border border-red-300 text-red-600 flex items-center justify-center hover:bg-red-50" onClick={(e) => { e.stopPropagation(); hideAi(i); }}>×</button>
              </div>
            </li>
          );
        })}
        {customTasks.map((t, i) => (
          <li key={`c${i}`} className="flex items-center justify-between rounded-lg border p-3 cursor-pointer hover:bg-gray-50" onClick={() => toggleCustom(i)}>
            <div className="flex items-center gap-3">
              <input type="checkbox" checked={!!checked[`c${i}`]} onChange={() => {}} className="pointer-events-none" />
              <span>{t.title}</span>
            </div>
            <div className="text-xs text-slate-500 flex items-center gap-2">
              <button className="h-5 w-5 rounded-full border border-red-300 text-red-600 flex items-center justify-center hover:bg-red-50" onClick={(e) => { e.stopPropagation(); removeCustom(i); }}>×</button>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex gap-2">
        <input 
          value={custom.title} 
          onChange={(e)=>setCustom(c=>({...c,title:e.target.value}))} 
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
          placeholder={t('studyPlan.addTask', { defaultValue: 'Add a task' })} 
          className="flex-1 rounded-md border px-3 py-2" 
        />
        <button className="rounded-md bg-black text-white px-3 py-2" onClick={addCustom}>{t('studyPlan.add', { defaultValue: 'Add' })}</button>
      </div>
      {/* Total planned minutes removed per UX request */}
    </div>
  );
}
