import { useState } from 'react';
import { universalAssessmentItems } from '@/lib/assessment/items';
import { scoreAnswers, type Answers } from '@/lib/assessment/scoring';
import { generatePlan } from '@/lib/plans/generateFromTemplate';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

const OnboardingAssessment = () => {
  const [answers, setAnswers] = useState<Answers>({});
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const setAnswer = (id: string, value: string) => setAnswers((a) => ({ ...a, [id]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const goal = answers['goal'] || 'general';
      const self_level = answers['self_level'] || 'A2';
      const score = scoreAnswers(universalAssessmentItems, answers);
      const plan = generatePlan(score, goal);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed in');

      const { data: assessmentRow, error: assessErr } = await supabase
        .from('user_assessments')
        .insert({ user_id: user.id, goal, self_level, answers, score })
        .select('*')
        .single();
      if (assessErr) throw assessErr;

      const { data: planRow, error: planErr } = await supabase
        .from('study_plans')
        .insert({ user_id: user.id, band: score.band, goal, plan, source: 'template' })
        .select('*')
        .single();
      if (planErr) throw planErr;

      await supabase.from('profiles').update({ current_plan_id: planRow.id }).eq('id', user.id);
      navigate('/plan');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Quick English Assessment (5 min)</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        {universalAssessmentItems.map((item) => (
          <div key={item.id}>
            <label className="block font-medium mb-2">{item.prompt}</label>
            <div className="space-y-2">
              {item.type === 'multi' && item.choices?.map((c) => (
                <label key={c.id} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={item.id}
                    value={c.id}
                    checked={answers[item.id] === c.id}
                    onChange={(e) => setAnswer(item.id, e.target.value)}
                  />
                  <span>{c.label}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 rounded-md bg-black text-white disabled:opacity-50"
        >
          {submitting ? 'Generating plan…' : 'Finish and get my plan'}
        </button>
      </form>
    </div>
  );
};

export default OnboardingAssessment;


