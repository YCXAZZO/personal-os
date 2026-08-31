import { NextResponse } from 'next/server';
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from '@/db/schema';
import { asc, eq } from 'drizzle-orm';

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

export async function GET() {
  try {
    const db = getDb();
    const rows = await db
      .select()
      .from(schema.exercise_presets)
      .orderBy(asc(schema.exercise_presets.body_part));

    return NextResponse.json({
      success: true,
      presets: rows.map((r) => ({
        id: r.id,
        name: r.name,
        bodyPart: r.body_part,
        sets: r.sets,
        reps: r.reps,
        loadKg: r.load_kg,
        isBodyweight: r.is_bodyweight,
      })),
    });
  } catch (error) {
    console.error('[exercise-presets GET] 失败:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const db = getDb();
    const b = await request.json();
    const name = String(b.name ?? '').trim();
    if (!name) return NextResponse.json({ success: false, error: 'name 必填' }, { status: 400 });

    const dup = await db
      .select()
      .from(schema.exercise_presets)
      .where(eq(schema.exercise_presets.name, name));
    if (dup.length > 0) {
      return NextResponse.json({ success: false, error: '预设名称已存在' }, { status: 400 });
    }

    const isBodyweight = !!b.isBodyweight;
    const inserted = await db
      .insert(schema.exercise_presets)
      .values({
        name,
        body_part: b.bodyPart ? String(b.bodyPart) : null,
        sets: int(b.sets),
        reps: num(b.reps),
        load_kg: isBodyweight ? 0 : num(b.loadKg),
        is_bodyweight: isBodyweight,
      })
      .returning();

    return NextResponse.json({ success: true, preset: inserted[0] }, { status: 201 });
  } catch (error) {
    console.error('[exercise-presets POST] 失败:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const db = getDb();
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'id 必填' }, { status: 400 });
    const b = await request.json();
    const name = String(b.name ?? '').trim();
    if (!name) return NextResponse.json({ success: false, error: 'name 必填' }, { status: 400 });

    const dup = await db
      .select()
      .from(schema.exercise_presets)
      .where(eq(schema.exercise_presets.name, name));
    if (dup.length > 0 && dup[0].id !== id) {
      return NextResponse.json({ success: false, error: '预设名称已存在' }, { status: 400 });
    }

    const isBodyweight = !!b.isBodyweight;
    await db
      .update(schema.exercise_presets)
      .set({
        name,
        body_part: b.bodyPart ? String(b.bodyPart) : null,
        sets: int(b.sets),
        reps: num(b.reps),
        load_kg: isBodyweight ? 0 : num(b.loadKg),
        is_bodyweight: isBodyweight,
      })
      .where(eq(schema.exercise_presets.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[exercise-presets PUT] 失败:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const db = getDb();
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'id 必填' }, { status: 400 });
    await db.delete(schema.exercise_presets).where(eq(schema.exercise_presets.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[exercise-presets DELETE] 失败:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
