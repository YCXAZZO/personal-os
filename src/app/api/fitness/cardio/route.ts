import { NextResponse } from 'next/server';
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getDb(): NeonHttpDatabase<typeof schema> {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL 未配置');
  const sql = neon(process.env.DATABASE_URL);
  return drizzle(sql, { schema });
}

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const int = (v: unknown): number | null => {
  const n = num(v);
  return n === null ? null : Math.round(n);
};

export async function GET(request: Request) {
  try {
    const db = getDb();
    const date = new URL(request.url).searchParams.get('date');
    if (!date) return NextResponse.json({ success: false, error: 'date 必填' }, { status: 400 });

    const rows = await db
      .select()
      .from(schema.cardio_logs)
      .where(eq(schema.cardio_logs.date, date));
    const c = rows[0];
    if (!c) return NextResponse.json({ success: true, cardio: null });

    return NextResponse.json({
      success: true,
      cardio: {
        date: c.date,
        cardioType: c.cardio_type,
        durationMin: c.duration_min,
        avgHr: c.avg_hr,
        peakHr: c.peak_hr,
        hrZonePrimary: c.hr_zone_primary,
        distanceKm: c.distance_km,
        perceivedSweat: c.perceived_sweat,
      },
    });
  } catch (error) {
    console.error('[cardio GET] 失败:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const db = getDb();
    const b = await request.json();
    const date = b.date ? String(b.date) : null;
    if (!date) return NextResponse.json({ success: false, error: 'date 必填' }, { status: 400 });

    const values = {
      date,
      cardio_type: b.cardioType ? String(b.cardioType) : null,
      duration_min: int(b.durationMin),
      avg_hr: int(b.avgHr),
      peak_hr: int(b.peakHr),
      hr_zone_primary: b.hrZonePrimary ? String(b.hrZonePrimary) : null,
      distance_km: num(b.distanceKm),
      perceived_sweat: int(b.perceivedSweat),
    };

    await db
      .insert(schema.cardio_logs)
      .values(values)
      .onConflictDoUpdate({
        target: schema.cardio_logs.date,
        set: {
          cardio_type: values.cardio_type,
          duration_min: values.duration_min,
          avg_hr: values.avg_hr,
          peak_hr: values.peak_hr,
          hr_zone_primary: values.hr_zone_primary,
          distance_km: values.distance_km,
          perceived_sweat: values.perceived_sweat,
        },
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[cardio POST] 失败:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
