import { NextResponse } from 'next/server';
import { db, schema } from '@/db';
import { asc, desc } from 'drizzle-orm';
import { minusDays, mondayStr, normDate, todayStr } from '@/lib/dates';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function parseNum(s: string | null): number {
  if (!s) return 0;
  const m = String(s).replace(/[^\d.]/g, '');
  const n = parseFloat(m);
  return Number.isFinite(n) ? n : 0;
}

export async function GET(request: Request) {
  // 消费 request 强制动态执行（Next.js 14 会缓存未使用 request 的 GET 路由）
  console.log('[stats] GET', request.url);
  try {
    // 注意：bare select（无 where/orderBy）在 neon-http 驱动下会异常返回空，
    // 所以这里统一显式加 orderBy 规避（不要使用无任何子句的 select）。
    const records = await db
      .select()
      .from(schema.records)
      .orderBy(desc(schema.records.timestamp));
    const projects = await db
      .select()
      .from(schema.projects)
      .orderBy(asc(schema.projects.name));

    const today = todayStr();
    const monday = mondayStr();

    let todayMinutes = 0;
    let weekMinutes = 0;
    const datesWithRecords = new Set<string>();

    for (const r of records) {
      const d = normDate(r.date);
      const dur = r.duration_minutes ?? 0;
      if (d) {
        datesWithRecords.add(d);
        if (d === today) todayMinutes += dur;
        if (d >= monday && d <= today) weekMinutes += dur;
      }
    }

    // 连续打卡天数：从今天（若今天未打卡则从昨天）向前倒推
    let streak = 0;
    let cursor = today;
    if (!datesWithRecords.has(cursor)) {
      cursor = minusDays(cursor, 1);
    }
    while (datesWithRecords.has(cursor)) {
      streak += 1;
      cursor = minusDays(cursor, 1);
    }

    const progress = projects
      .filter((p) => p.total_target)
      .map((p) => {
        const total = parseNum(p.total_target);
        const current = parseNum(p.current_progress);
        const percent =
          total > 0 ? Math.min(100, Math.max(0, Math.round((current / total) * 100))) : 0;
        return {
          id: p.id,
          name: p.name,
          color: p.color,
          totalTarget: p.total_target,
          currentProgress: p.current_progress,
          percent,
        };
      });

    return NextResponse.json({
      success: true,
      todayMinutes,
      weekMinutes,
      streakDays: streak,
      progress,
    });
  } catch (error) {
    console.error('[stats GET] 失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
