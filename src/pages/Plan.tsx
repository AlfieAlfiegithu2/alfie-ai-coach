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
  const getDay = (key: string | null) => {
    if (!key) return null;
    const [w, d] = key.split('-').map(Number);
    return plan.weekly.find(x => x.week === w)?.days.find(x => x.day === d) || null;
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
                <div className="text-lg font-semibold text-slate-900">{plan.meta.currentApproxIELTS.toFixed(1)}</div>
              </div>
              <div className="rounded-xl border border-white/40 bg-white/60 px-4 py-3 text-center">
                <div className="text-xs text-slate-500">Target</div>
                <div className="text-lg font-semibold text-slate-900">{plan.meta?.targetIELTS?.toFixed(1)}</div>
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

        <div className="space-y-3">
          {plan.weekly.map((w) => (
            <details key={w.week} className="rounded-2xl border border-white/40 bg-white/60">
              <summary className="cursor-pointer list-none p-5 flex items-center justify-between">
                <div className="text-base lg:text-lg font-semibold text-slate-900">Week {w.week}</div>
                <span className="text-xs text-slate-500">Daily ~{plan.meta?.dailyMinutes || 60} min</span>
              </summary>
              <div className="p-5 pt-0">
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {w.days.map((d) => (
                    <button key={d.day} className="text-left rounded-xl border border-white/40 bg-white/70 p-4 hover:bg-white/80 transition" onClick={() => setOpenDayKey(`${w.week}-${d.day}`)}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium text-slate-900">Day {d.day}</div>
                        <input type="checkbox" aria-label={`Mark day ${d.day} complete`} onChange={(e) => {
                          const key = `plan-day-complete-${w.week}-${d.day}`;
                          if ((e.target as HTMLInputElement).checked) localStorage.setItem(key, '1'); else localStorage.removeItem(key);
                        }} defaultChecked={typeof window !== 'undefined' && localStorage.getItem(`plan-day-complete-${w.week}-${d.day}`) === '1'} onClick={(e) => e.stopPropagation()} />
                      </div>
                      <ul className="space-y-1 text-slate-700">
                        {d.tasks.slice(0,2).map((t, i) => (
                          <li key={i} className="flex items-center justify-between">
                            <span className="truncate max-w-[220px]">{t.title}</span>
                            <span className="text-xs text-slate-500">{t.minutes}m</span>
                          </li>
                        ))}
                        {d.tasks.length > 2 && <li className="text-xs text-slate-500">+{d.tasks.length-2} more</li>}
                      </ul>
                    </button>
                  ))}
                </div>
              </div>
            </details>
          ))}
        </div>

        {openDayKey && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setOpenDayKey(null)}>
            <div className="bg-white rounded-2xl shadow-xl w-[90%] max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">Plan for {openDayKey.replace('-', ' • Day ')}</h3>
                <button className="text-slate-500 hover:text-slate-700" onClick={() => setOpenDayKey(null)}>Close</button>
              </div>
              <ul className="space-y-2 text-slate-800">
                {(getDay(openDayKey)?.tasks || []).map((t, i) => (
                  <li key={i} className="flex items-center justify-between rounded-lg border p-3">
                    <span>{t.title}</span>
                    <span className="text-xs text-slate-500">{t.minutes} min</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlanPage;


