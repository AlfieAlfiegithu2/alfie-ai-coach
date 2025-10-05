import type { Score } from '../assessment/scoring';
import { generateTemplatePlan, type Plan } from './templates';

export function generatePlan(score: Score, goal: string): Plan {
  return generateTemplatePlan(score, goal);
}


