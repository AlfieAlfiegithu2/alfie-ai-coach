import { useMemo, useState } from 'react';
import { universalAssessmentItems } from '@/lib/assessment/items';
import { scoreAnswers, type Answers } from '@/lib/assessment/scoring';
import { generatePlan } from '@/lib/plans/generateFromTemplate';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

const OnboardingAssessment = () => {
  const [answers, setAnswers] = useState<Answers>({});
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();

  const items = useMemo(() => universalAssessmentItems, []);

  const setAnswer = (id: string, value: string) => setAnswers((a) => ({ ...a, [id]: value }));

  const goNext = () => setStep((s) => Math.min(s + 1, items.length - 1));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const goal = answers['goal'] || 'ielts';
      const score = scoreAnswers(items, answers);
      const self_level = score.band; // infer instead of asking
      const timePerDay = (answers['time_per_day'] as any) || '1_hour';
      const targetDeadline = (answers['target_deadline'] as any) || null;
      const targetScore = parseFloat((answers['target_score'] as any) || '7.0');
      const plan = generatePlan(score, goal, { timePerDay, targetScore, targetDeadline });
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not signed in');

        const { error: assessErr } = await supabase
          .from('user_assessments')
          .insert({ user_id: user.id, goal, self_level, answers, score });
        if (assessErr) throw assessErr;

        // Always persist the latest plan for the profile
        const { data: planRow, error: planErr } = await supabase
          .from('study_plans')
          .insert({ user_id: user.id, band: score.band, goal, plan, source: 'template' })
          .select('*')
          .single();
        if (planErr) throw planErr;

        await supabase.from('profiles').update({ current_plan_id: planRow.id }).eq('id', user.id);
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
      <div className="mb-4 text-sm text-slate-600">Question {step + 1} of {items.length}</div>
      <div className="space-y-4">
        {item.passage && (
          <div className="rounded-lg border border-slate-200 bg-white/70 p-4 text-slate-800 whitespace-pre-line">
            {item.passage}
          </div>
        )}
        <div className="text-lg font-medium">{item.prompt}</div>
        <div className="grid gap-3">
          {item.type === 'multi' && item.choices?.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              className={`text-left px-4 py-3 rounded-md border ${answers[item.id] === c.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}
            >
              {c.label}
            </button>
          ))}
          {item.type === 'date' && (
            <div className="flex items-center gap-3">
              <input
                type="date"
                className="px-4 py-3 rounded-md border border-slate-200"
                onChange={(e) => setAnswer(item.id, e.target.value)}
                value={answers[item.id] || ''}
              />
              <button
                onClick={() => onSelect(answers[item.id])}
                disabled={!answers[item.id]}
                className="px-4 py-3 rounded-md border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="flex justify-between items-center mt-6 text-sm text-slate-500">
        <div>{Math.round(((step + 1) / items.length) * 100)}% complete</div>
        {step === items.length - 1 && (
          <button
            onClick={(e) => handleSubmit(e as any)}
            disabled={submitting}
            className="px-4 py-2 rounded-md bg-black text-white disabled:opacity-50"
          >
            {submitting ? 'Generating…' : 'Get My Study Plan'}
          </button>
        )}
      </div>
    </div>
  );
};

export default OnboardingAssessment;


