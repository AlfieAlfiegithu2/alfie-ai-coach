import type { Score } from '../assessment/scoring';
import { generateTemplatePlan, type Plan } from './templates';

type Context = { targetScore?: number | null; timePerDay?: 'under_30' | '1_hour' | '2_hours' | 'more' };

export function generatePlan(score: Score, goal: string, ctx: Context = {}): Plan {
  return generateTemplatePlan(score, goal, ctx);
}


