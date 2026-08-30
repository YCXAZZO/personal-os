import { NextResponse } from 'next/server';
import { db, schema } from '@/db';
import { and, asc, gte, lte } from 'drizzle-orm';
import { minusDays, normDate, todayStr } from '@/lib/dates';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const days = Math.max(1, Number(url.searchParams.get('days')) || 30);

    const today = todayStr();
    const start3 = minusDays(today, 2);
    const start7 = minusDays(today, 6);
    const startN = minusDays(today, days - 1);

    // ---- 1. 疲劳-负荷比（近3天）----
    const morning3 = await db
      .select()
      .from(schema.morning_snapshots)
      .where(and(gte(schema.morning_snapshots.date, start3), lte(schema.morning_snapshots.date, today)))
      .orderBy(asc(schema.morning_snapshots.date));

    const training3 = await db
      .select()
      .from(schema.training_logs)
      .where(and(gte(schema.training_logs.date, start3), lte(schema.training_logs.date, today)));

    const cardio3 = await db
      .select()
      .from(schema.cardio_logs)
      .where(and(gte(schema.cardio_logs.date, start3), lte(schema.cardio_logs.date, today)));

    const hrValues = morning3.map((m) => m.morning_hr_rest).filter((v): v is number => v != null);
    const sleepValues = morning3.map((m) => m.sleep_quality).filter((v): v is number => v != null);

    let fatigueRatio: number | null = null;
    let fatigueStatus: 'ok' | 'warning' | 'danger' = 'ok';

    if (hrValues.length > 0 && sleepValues.length > 0) {
      const avgHr = hrValues.reduce((a, b) => a + b, 0) / hrValues.length;
      const avgSleep = sleepValues.reduce((a, b) => a + b, 0) / sleepValues.length;
      const totalVolume = training3.reduce((s, t) => s + (t.volume_load ?? 0), 0);
      const highCardio = cardio3
        .filter((c) => c.hr_zone_primary === '无氧')
        .reduce((s, c) => s + (c.duration_min ?? 0), 0);
      const denom = avgHr * avgSleep;
      if (denom > 0) {
        fatigueRatio = (totalVolume + highCardio) / denom;
        fatigueStatus = fatigueRatio < 30 ? 'ok' : fatigueRatio < 50 ? 'warning' : 'danger';
      }
    }

    // ---- 2. 体脂趋势（近 days 天）----
    const morningN = await db
      .select()
      .from(schema.morning_snapshots)
      .where(and(gte(schema.morning_snapshots.date, startN), lte(schema.morning_snapshots.date, today)))
      .orderBy(asc(schema.morning_snapshots.date));

    const caliperN = await db
      .select()
      .from(schema.caliper_measurements)
      .where(and(gte(schema.caliper_measurements.date, startN), lte(schema.caliper_measurements.date, today)))
      .orderBy(asc(schema.caliper_measurements.date));

    const morningMap = new Map<string, (typeof morningN)[number]>();
    for (const m of morningN) {
      const d = normDate(m.date);
      if (d) morningMap.set(d, m);
    }
    const caliperMap = new Map<string, (typeof caliperN)[number]>();
    for (const c of caliperN) {
      const d = normDate(c.date);
      if (d) caliperMap.set(d, c);
    }

    const dateSet = new Set<string>([
      ...Array.from(morningMap.keys()),
      ...Array.from(caliperMap.keys())
    ]);
    const allDates = Array.from(dateSet).sort();

    const bodyFatTrend: { date: string; value: number }[] = [];
    for (const d of allDates) {
      const caliper = caliperMap.get(d);
      const morning = morningMap.get(d);
      let value: number | null = null;

      if (caliper && caliper.caliper_bodyfat_pct != null) {
        value = caliper.caliper_bodyfat_pct;
      } else if (morning && morning.waist_cm != null && morning.weight_kg != null && morning.weight_kg > 0) {
        value = ((morning.waist_cm * 0.74 - morning.weight_kg * 0.082 - 34.89) / morning.weight_kg) * 100;
      } else if (morning && morning.bf_scale_pct != null) {
        value = morning.bf_scale_pct;
      }

      if (value != null) {
        bodyFatTrend.push({ date: d, value: Math.round(value * 100) / 100 });
      }
    }

    // ---- 3 & 4. 近7天训练容量 / 有氧时长 ----
    const training7 = await db
      .select()
      .from(schema.training_logs)
      .where(and(gte(schema.training_logs.date, start7), lte(schema.training_logs.date, today)));

    const cardio7 = await db
      .select()
      .from(schema.cardio_logs)
      .where(and(gte(schema.cardio_logs.date, start7), lte(schema.cardio_logs.date, today)));

    const volumeByDate = new Map<string, number>();
    for (const t of training7) {
      const d = normDate(t.date);
      if (d) volumeByDate.set(d, (volumeByDate.get(d) ?? 0) + (t.volume_load ?? 0));
    }
    const cardioByDate = new Map<string, number>();
    for (const c of cardio7) {
      const d = normDate(c.date);
      if (d) cardioByDate.set(d, (cardioByDate.get(d) ?? 0) + (c.duration_min ?? 0));
    }

    const weeklyVolume: { date: string; value: number }[] = [];
    const weeklyCardio: { date: string; value: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = minusDays(today, i);
      weeklyVolume.push({ date: d, value: volumeByDate.get(d) ?? 0 });
      weeklyCardio.push({ date: d, value: cardioByDate.get(d) ?? 0 });
    }

    return NextResponse.json({
      success: true,
      fatigueRatio,
      fatigueStatus,
      bodyFatTrend,
      weeklyVolume,
      weeklyCardio,
    });
  } catch (error) {
    console.error('[fitness stats GET] 失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
