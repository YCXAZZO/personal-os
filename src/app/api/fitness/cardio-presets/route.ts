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

export async function GET() {
  try {
    const rows = await db
      .select()
      .from(schema.cardio_presets)
      .orderBy(asc(schema.cardio_presets.cardio_type));

    return NextResponse.json({
      success: true,
      presets: rows.map((r) => ({
        id: r.id,
        cardioType: r.cardio_type,
        durationMin: r.duration_min,
        hrZonePrimary: r.hr_zone_primary,
      })),
    });
  } catch (error) {
    console.error('[cardio-presets GET] 失败:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const b = await request.json();
    const cardioType = String(b.cardioType ?? '').trim();
    if (!cardioType) return NextResponse.json({ success: false, error: 'cardioType 必填' }, { status: 400 });

    const dup = await db
      .select()
      .from(schema.cardio_presets)
      .where(eq(schema.cardio_presets.cardio_type, cardioType));
    if (dup.length > 0) {
      return NextResponse.json({ success: false, error: '预设名称已存在' }, { status: 400 });
    }

    const inserted = await db
      .insert(schema.cardio_presets)
      .values({
        cardio_type: cardioType,
        duration_min: int(b.durationMin),
        hr_zone_primary: b.hrZonePrimary ? String(b.hrZonePrimary) : null,
      })
      .returning();

    return NextResponse.json({ success: true, preset: inserted[0] }, { status: 201 });
  } catch (error) {
    console.error('[cardio-presets POST] 失败:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'id 必填' }, { status: 400 });
    const b = await request.json();
    const cardioType = String(b.cardioType ?? '').trim();
    if (!cardioType) return NextResponse.json({ success: false, error: 'cardioType 必填' }, { status: 400 });

    const dup = await db
      .select()
      .from(schema.cardio_presets)
      .where(eq(schema.cardio_presets.cardio_type, cardioType));
    if (dup.length > 0 && dup[0].id !== id) {
      return NextResponse.json({ success: false, error: '预设名称已存在' }, { status: 400 });
    }

    await db
      .update(schema.cardio_presets)
      .set({
        cardio_type: cardioType,
        duration_min: int(b.durationMin),
        hr_zone_primary: b.hrZonePrimary ? String(b.hrZonePrimary) : null,
      })
      .where(eq(schema.cardio_presets.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[cardio-presets PUT] 失败:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'id 必填' }, { status: 400 });
    await db.delete(schema.cardio_presets).where(eq(schema.cardio_presets.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[cardio-presets DELETE] 失败:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
