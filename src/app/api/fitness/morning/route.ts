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
      .from(schema.morning_snapshots)
      .where(eq(schema.morning_snapshots.date, date));
    const m = rows[0];
    if (!m) return NextResponse.json({ success: true, morning: null });

    return NextResponse.json({
      success: true,
      morning: {
        date: m.date,
        weightKg: m.weight_kg,
        bfScalePct: m.bf_scale_pct,
        waistCm: m.waist_cm,
        visceralFatScore: m.visceral_fat_score,
        morningHrRest: m.morning_hr_rest,
        orthostaticSymptom: m.orthostatic_symptom,
        sleepQuality: m.sleep_quality,
        muscleSorenessGlobal: m.muscle_soreness_global,
        morningErectionLengthCm: m.morning_erection_length_cm,
        morningErectionDiameterCm: m.morning_erection_diameter_cm,
      },
    });
  } catch (error) {
    console.error('[morning GET] 失败:', error);
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
      weight_kg: num(b.weightKg),
      bf_scale_pct: num(b.bfScalePct),
      waist_cm: num(b.waistCm),
      visceral_fat_score: int(b.visceralFatScore),
      morning_hr_rest: int(b.morningHrRest),
      orthostatic_symptom: int(b.orthostaticSymptom),
      sleep_quality: int(b.sleepQuality),
      muscle_soreness_global: int(b.muscleSorenessGlobal),
      morning_erection_length_cm: num(b.morningErectionLengthCm),
      morning_erection_diameter_cm: num(b.morningErectionDiameterCm),
    };

    await db
      .insert(schema.morning_snapshots)
      .values(values)
      .onConflictDoUpdate({
        target: schema.morning_snapshots.date,
        set: {
          weight_kg: values.weight_kg,
          bf_scale_pct: values.bf_scale_pct,
          waist_cm: values.waist_cm,
          visceral_fat_score: values.visceral_fat_score,
          morning_hr_rest: values.morning_hr_rest,
          orthostatic_symptom: values.orthostatic_symptom,
          sleep_quality: values.sleep_quality,
          muscle_soreness_global: values.muscle_soreness_global,
          morning_erection_length_cm: values.morning_erection_length_cm,
          morning_erection_diameter_cm: values.morning_erection_diameter_cm,
        },
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[morning POST] 失败:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
