import type { Score } from '../assessment/scoring';
import { generateTemplatePlan, type Plan } from './templates';

// We derive required daily minutes from target score and deadline; no timePerDay arg
type Context = { 
  targetScore?: number | null; 
  targetDeadline?: string | null;
  studyDaysJson?: string;
  firstLanguage?: string;
  planNativeLanguage?: 'yes' | 'no';
};

export function generatePlan(score: Score, goal: string, ctx: Context = {}): Plan {
  return generateTemplatePlan(score, goal, ctx);
}


