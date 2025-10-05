import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Plan } from '@/lib/plans/templates';

const PlanPage = () => {
  const [plan, setPlan] = useState<Plan | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (!profile?.current_plan_id) return;
      const { data: planRow } = await supabase.from('study_plans').select('*').eq('id', profile.current_plan_id).single();
      if (planRow?.plan) setPlan(planRow.plan as Plan);
    })();
  }, []);

  if (!plan) return <div className="max-w-3xl mx-auto p-6">No plan yet.</div>;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Your 2‑Week General Study Plan</h1>
      <div>
        <h2 className="text-lg font-medium mb-2">Highlights</h2>
        <ul className="list-disc pl-5 space-y-1">
          {plan.highlights.map((h, i) => (<li key={i}>{h}</li>))}
        </ul>
      </div>
      <div>
        <h2 className="text-lg font-medium mb-2">Quick Wins</h2>
        <ul className="list-disc pl-5 space-y-1">
          {plan.quickWins.map((h, i) => (<li key={i}>{h}</li>))}
        </ul>
      </div>
      {plan.weekly.map((w) => (
        <div key={w.week} className="border rounded-lg p-4">
          <h3 className="font-semibold mb-2">Week {w.week}</h3>
          <div className="space-y-3">
            {w.days.map((d) => (
              <div key={d.day} className="">
                <div className="font-medium">Day {d.day}</div>
                <ul className="list-disc pl-5">
                  {d.tasks.map((t, i) => (
                    <li key={i}>{t.title} · {t.minutes} min</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default PlanPage;


