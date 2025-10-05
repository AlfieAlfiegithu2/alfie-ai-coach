import type { Score } from '../assessment/scoring';
import { generateTemplatePlan, type Plan } from './templates';

type Context = { targetScore?: number | null; targetDeadline?: string | null };

export function generatePlan(score: Score, goal: string, ctx: Context = {}): Plan {
  return generateTemplatePlan(score, goal, ctx);
}


