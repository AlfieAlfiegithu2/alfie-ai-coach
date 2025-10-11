import { supabase } from '@/integrations/supabase/client';

export type Rating = 1 | 2 | 3 | 4; // Again, Hard, Good, Easy

export interface SrsState {
  ease: number; // SM2-like ease factor
  intervalDays: number;
  stability?: number;
  difficulty?: number;
  lastReviewedAt?: string | null;
  nextDueAt?: string | null;
}

// Simple FSRS/SM2 hybrid update
export function scheduleNext(state: SrsState, rating: Rating): SrsState {
  const now = new Date();
  let ease = state.ease ?? 2.5;
  if (rating === 1) ease = Math.max(1.3, ease - 0.2);
  if (rating === 2) ease = Math.max(1.3, ease - 0.1);
  if (rating === 4) ease = ease + 0.1;

  let interval = state.intervalDays ?? 0;
  if (rating === 1) interval = 0; // relearn
  else if (interval === 0) interval = rating === 4 ? 4 : 1;
  else interval = Math.max(1, Math.round(interval * ease * (rating === 2 ? 0.8 : rating === 4 ? 1.3 : 1)));

  const next = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);
  return { ...state, ease, intervalDays: interval, lastReviewedAt: now.toISOString(), nextDueAt: next.toISOString() };
}

export async function saveReview(cardId: string, rating: Rating) {
  const { data: existing } = await supabase
    .from('vocab_srs_state')
    .select('*')
    .eq('card_id', cardId)
    .maybeSingle();
  const before = (existing || { ease: 2.5, interval_days: 0 }) as any;
  const after = scheduleNext({ ease: before.ease ?? 2.5, intervalDays: before.interval_days ?? 0 }, rating);
  const { error } = await supabase.from('vocab_srs_state').upsert({
    card_id: cardId,
    ease: after.ease,
    interval_days: after.intervalDays,
    last_reviewed_at: after.lastReviewedAt,
    next_due_at: after.nextDueAt
  });
  if (error) throw error;
  await supabase.from('vocab_reviews').insert({
    card_id: cardId,
    rating,
    next_due_at_before: before.next_due_at || null,
    next_due_at_after: after.nextDueAt,
    interval_days_before: before.interval_days || 0,
    interval_days_after: after.intervalDays,
    ease_before: before.ease || 2.5,
    ease_after: after.ease
  });
}

export async function loadDue(limit = 50) {
  const { data, error } = await supabase
    .from('vocab_cards')
    .select('id, term, translation, pos, context_sentence, examples_json, ipa, frequency_rank, suspended')
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw error;
  const ids = data.map((c: any) => c.id);
  if (ids.length === 0) return [] as any[];
  const { data: states } = await supabase
    .from('vocab_srs_state')
    .select('card_id, next_due_at')
    .in('card_id', ids);
  const due = new Date();
  const map = new Map(states?.map((s: any) => [s.card_id, s.next_due_at]));
  return data
    .filter((c: any) => !c.suspended && (!map.get(c.id) || new Date(map.get(c.id)) <= due))
    .slice(0, limit);
}


