import { NextResponse } from 'next/server';
import { db, schema } from '@/db';
import { asc, eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
    const date = new URL(request.url).searchParams.get('date');
    if (!date) return NextResponse.json({ success: false, error: 'date 必填' }, { status: 400 });

    const rows = await db
      .select()
      .from(schema.training_logs)
      .where(eq(schema.training_logs.date, date))
      .orderBy(asc(schema.training_logs.id));

    return NextResponse.json({
      success: true,
      trainings: rows.map((r) => ({
        id: r.id,
        date: r.date,
        sessionType: r.session_type,
        totalDurationMin: r.total_duration_min,
        exerciseName: r.exercise_name,
        sets: r.sets,
        reps: r.reps,
        loadKg: r.load_kg,
        volumeLoad: r.volume_load,
        rpeLastSet: r.rpe_last_set,
        rpeTrapRhomboid: r.rpe_trap_rhomboid,
        isBodyweight: r.is_bodyweight,
      })),
    });
  } catch (error) {
    console.error('[training GET] 失败:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const b = await request.json();
    const date = b.date ? String(b.date) : null;
    if (!date) return NextResponse.json({ success: false, error: 'date 必填' }, { status: 400 });
    const exerciseName = String(b.exerciseName ?? '').trim();
    if (!exerciseName) {
      return NextResponse.json({ success: false, error: 'exerciseName 必填' }, { status: 400 });
    }

    const sets = int(b.sets) ?? 0;
    const reps = num(b.reps) ?? 0;
    const loadKg = num(b.loadKg) ?? 0;
    const isBodyweight = !!b.isBodyweight;
    const volumeLoad = isBodyweight ? 0 : Math.round(sets * reps * loadKg);

    const inserted = await db
      .insert(schema.training_logs)
      .values({
        date,
        session_type: b.sessionType ? String(b.sessionType) : null,
        total_duration_min: int(b.totalDurationMin),
        exercise_name: exerciseName,
        sets,
        reps,
        load_kg: loadKg,
        volume_load: volumeLoad,
        rpe_last_set: num(b.rpeLastSet),
        rpe_trap_rhomboid: int(b.rpeTrapRhomboid),
        is_bodyweight: isBodyweight,
      })
      .returning();

    return NextResponse.json({ success: true, training: inserted[0] }, { status: 201 });
  } catch (error) {
    console.error('[training POST] 失败:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'id 必填' }, { status: 400 });

    await db.delete(schema.training_logs).where(eq(schema.training_logs.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[training DELETE] 失败:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
