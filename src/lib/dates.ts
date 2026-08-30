import { format, parseISO, startOfWeek, subDays } from 'date-fns';

export function toDateStr(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

export function todayStr(): string {
  return toDateStr(new Date());
}

export function mondayStr(): string {
  return toDateStr(startOfWeek(new Date(), { weekStartsOn: 1 }));
}

export function minusDays(dateStr: string, n: number): string {
  return toDateStr(subDays(parseISO(dateStr), n));
}

// 把 drizzle 读回的 date 字段（可能是 string 或 Date）统一成 'YYYY-MM-DD'
export function normDate(v: unknown): string | null {
  if (!v) return null;
  if (typeof v === 'string') return v.slice(0, 10);
  if (v instanceof Date) return toDateStr(v);
  return null;
}
