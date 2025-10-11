// Small timezone-safe date helpers shared across study plan UI

export function formatLocalISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function normalizeToLocalMidnight(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

// Map a local date to plan.weekly[w].days[d]
export function getPlanDayForLocalDate(plan: any, localDate: Date) {
  if (!plan?.weekly?.length) return null;
  const start = (() => {
    if (plan?.meta?.startDateISO) {
      const sd = new Date(plan.meta.startDateISO);
      return new Date(sd.getFullYear(), sd.getMonth(), sd.getDate());
    }
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  })();
  const normalized = normalizeToLocalMidnight(localDate);
  const diffDays = Math.max(0, Math.floor((normalized.getTime() - start.getTime()) / (24*60*60*1000)));
  const w = Math.floor(diffDays / 7);
  const d = diffDays % 7;
  return plan?.weekly?.[w]?.days?.[d] || null;
}


