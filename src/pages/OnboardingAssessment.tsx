import { useMemo, useState } from 'react';
import { universalAssessmentItems } from '@/lib/assessment/items';
import { scoreAnswers, type Answers } from '@/lib/assessment/scoring';
import { generatePlan } from '@/lib/plans/generateFromTemplate';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Calendar } from '@/components/ui/calendar';

const OnboardingAssessment = () => {
  const [answers, setAnswers] = useState<Answers>({});
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();

  const items = useMemo(() => {
    const base = universalAssessmentItems as any[];
    const personalOrder = ['goal','study_days','first_language','plan_native_language','target_deadline','target_score'];
    const personal = personalOrder.map(id => base.find(i => i.id === id)).filter(Boolean);
    const english = base.filter(i => !personalOrder.includes(i.id));
    return [...personal, ...english] as typeof universalAssessmentItems;
  }, []);
  const targetScoreIndex = useMemo(() => items.findIndex((i) => i.id === 'target_score'), [items]);

  const setAnswer = (id: string, value: string) => setAnswers((a) => ({ ...a, [id]: value }));
  const toggleMulti = (id: string, val: string) => {
    try {
      const cur = aJson(answers[id]);
      const next = cur.includes(val) ? cur.filter((v: string) => v !== val) : [...cur, val];
      setAnswer(id, JSON.stringify(next));
    } catch {
      setAnswer(id, JSON.stringify([val]));
    }
  };
  const aJson = (v?: string) => {
    try { return JSON.parse(v || '[]'); } catch { return []; }
  };

  const goNext = () => setStep((s) => Math.min(s + 1, items.length - 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const goal = answers['goal'] || 'ielts';
      const score = scoreAnswers(items, answers);
      const self_level = score.band; // infer instead of asking
      const targetDeadline = (answers['target_deadline'] as any) || null;
      const targetScore = parseFloat((answers['target_score'] as any) || '7.0');
      const studyDaysJson = answers['study_days'];
      const firstLanguage = answers['first_language'];
      const planNativeLanguage = (answers['plan_native_language'] as any) as 'yes' | 'no' | undefined;
      const plan = generatePlan(score, goal, { targetScore, targetDeadline, studyDaysJson, firstLanguage, planNativeLanguage });
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not signed in');

        const { error: assessErr } = await (supabase as any)
          .from('user_assessments')
          .insert({ user_id: user.id, goal, self_level, answers, score });
        if (assessErr) throw assessErr;

        // Always persist the latest plan for the profile
        const { data: planRow, error: planErr } = await (supabase as any)
          .from('study_plans')
          .insert({ user_id: user.id, band: score.band, goal, plan, source: 'template' })
          .select('*')
          .single();
        if (planErr) throw planErr;

        await (supabase as any).from('profiles').update({ current_plan_id: planRow.id }).eq('id', user.id);
        // Invalidate cached modal by bumping a client-side flag
        try { localStorage.setItem('latest_plan', JSON.stringify({ plan, ts: Date.now() })); } catch {}
        // Cache locally as well
        try { localStorage.setItem('latest_plan', JSON.stringify({ plan })); } catch {}
        toast({ title: 'Plan ready', description: 'Your personalized plan was generated.' });
        navigate('/plan', { state: { plan } });
      } catch (dbErr) {
        // Fallback: store plan locally and navigate
        try { localStorage.setItem('latest_plan', JSON.stringify({ plan })); } catch {}
        toast({ title: 'Plan ready', description: 'Opening your plan (offline mode).' });
        navigate('/plan', { state: { plan } });
      }
    } catch (err) {
      console.error(err);
      toast({ title: 'Could not generate plan', description: 'Please try again.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const item = items[step];
  const onSelect = async (choiceId: string) => {
    setAnswer(item.id, choiceId);
    // For plan_native_language we show a start notice instead of auto-advance
    if (item.id === 'plan_native_language') return;
    // Move to next after a short tick so state updates apply
    setTimeout(async () => {
      if (step === items.length - 1) {
        await handleSubmit({ preventDefault: () => {} } as unknown as React.FormEvent);
      } else {
        goNext();
      }
    }, 0);
  };

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-6">Quick Study Plan Assessment</h1>
      {/* Progress text removed per request */}
      <div className="space-y-4">
        {item.passage && (
          <div className="rounded-lg border border-slate-200 bg-white/70 p-4 text-slate-800 whitespace-pre-line">
            {item.passage}
          </div>
        )}
        <div className="text-lg font-medium">{item.prompt}</div>
        <div className="grid gap-3">
          {item.type === 'multi' && !item.multiSelect && item.choices?.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              className={`text-left px-4 py-3 rounded-md border ${answers[item.id] === c.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}
            >
              {c.label}
            </button>
          ))}
          {item.type === 'multi' && item.multiSelect && (
            <div className="flex flex-wrap gap-3">
              {item.choices?.map((c) => {
                const selected = aJson(answers[item.id]).includes(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => toggleMulti(item.id, c.id)}
                    className={`px-5 py-3 rounded-full border ${selected ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          )}
          {/* Start notice after personal info */}
          {item.id === 'plan_native_language' && (
            <div className="rounded-xl border border-slate-200 bg-white/70 p-4 text-slate-700">
              We’ll now run a short skills check to tailor your plan precisely. It takes about 10–12 minutes.
            </div>
          )}
          {/* Inline audio for listening items */}
          {item.audio && (
            <div className="space-y-2">
              <audio controls className="w-full">
                <source src={item.audio} type="audio/mpeg" />
                Your browser does not support the audio element.
              </audio>
              {item['transcript' as any] && (
                <details className="text-sm text-slate-600">
                  <summary className="cursor-pointer hover:text-slate-800">Show transcript</summary>
                  <p className="mt-2 pl-4 border-l-2 border-slate-300">{(item as any).transcript}</p>
                </details>
              )}
            </div>
          )}
          {item.type === 'date' && (
            <div className="rounded-2xl border border-slate-200 bg-white/70 p-2 w-full">
              <Calendar
                className="w-full"
                mode="single"
                selected={answers[item.id] ? new Date(answers[item.id] + 'T12:00:00') : undefined}
                onSelect={(d: Date | undefined) => {
                  if (!d) return;
                  // Normalize to local date to avoid off-by-one due to TZ
                  const local = new Date(d.getFullYear(), d.getMonth(), d.getDate());
                  const iso = new Date(local.getTime() - local.getTimezoneOffset()*60000).toISOString().slice(0,10);
                  setAnswer(item.id, iso);
                }}
                showOutsideDays
                classNames={{
                  month: "w-full",
                  table: "w-full border-collapse",
                  row: "flex w-full mt-2 justify-between",
                  head_cell: "w-12 text-center text-slate-500",
                  cell: "h-12 w-12 text-center text-sm p-0 relative",
                  day: "h-12 w-12 p-0 font-medium rounded-full hover:bg-black/5",
                  day_selected: "bg-black text-white hover:bg-black rounded-full",
                  day_today: "ring-2 ring-black/20 rounded-full",
                }}
                style={{
                  ['--rdp-cell-size' as any]: 'calc((100% - 2rem) / 7)'
                }}
              />
            </div>
          )}
        </div>
      </div>
      <div className="flex justify-between items-center mt-6">
        {step > 0 ? (
          <button onClick={goBack} className="px-4 py-2 rounded-md border border-slate-300 hover:bg-slate-50">Back</button>
        ) : <span />}

        {step === items.length - 1 ? (
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => handleSubmit(e as any)}
              disabled={submitting}
              className="px-4 py-2 rounded-md bg-black text-white disabled:opacity-50"
            >
              {submitting ? 'Generating…' : 'Get My Study Plan'}
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 rounded-md border border-slate-300 hover:bg-slate-50 text-slate-800"
            >
              Go to Dashboard
            </button>
          </div>
        ) : item.type === 'date' ? (
          <button
            onClick={() => onSelect(answers[item.id])}
            disabled={!answers[item.id]}
            className="px-4 py-2 rounded-md bg-black text-white disabled:opacity-50"
          >
            Continue
          </button>
        ) : item.id === 'study_days' || item.id === 'first_language' || item.id === 'plan_native_language' ? (
          <button
            onClick={() => {
              if (item.multiSelect) {
                if (!answers[item.id]) return; // require at least one day
              } else if (!answers[item.id]) return;
              goNext();
            }}
            disabled={!answers[item.id]}
            className="px-4 py-2 rounded-md bg-black text-white disabled:opacity-50"
          >
            Next
          </button>
        ) : null}
      </div>
      {step >= 0 && step >= (targetScoreIndex >= 0 ? targetScoreIndex + 1 : 0) && (
        <div className="mt-4">
          <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-black rounded-full" style={{ width: `${Math.round(((step + 1) / items.length) * 100)}%` }} />
          </div>
          <div className="mt-2 text-xs text-slate-500 flex justify-end">{Math.round(((step + 1) / items.length) * 100)}% complete</div>
        </div>
      )}
    </div>
  );
};

export default OnboardingAssessment;


