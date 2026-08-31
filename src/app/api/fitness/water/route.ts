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

export async function GET(request: Request) {
  try {
    const db = getDb();
    const date = new URL(request.url).searchParams.get('date');
    if (!date) return NextResponse.json({ success: false, error: 'date 必填' }, { status: 400 });

    const rows = await db
      .select()
      .from(schema.water_intake)
      .where(eq(schema.water_intake.date, date))
      .orderBy(asc(schema.water_intake.time));

    return NextResponse.json({
      success: true,
      records: rows.map((r) => ({
        id: r.id,
        date: r.date,
        time: r.time,
        amountMl: r.amount_ml,
      })),
    });
  } catch (error) {
    console.error('[water GET] 失败:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const db = getDb();
    const b = await request.json();
    const date = b.date ? String(b.date) : null;
    const amountMl = Number(b.amountMl);
    if (!date) return NextResponse.json({ success: false, error: 'date 必填' }, { status: 400 });
    if (!Number.isFinite(amountMl) || amountMl <= 0) {
      return NextResponse.json({ success: false, error: 'amountMl 必须为正数' }, { status: 400 });
    }

    const time =
      b.time && String(b.time).trim()
        ? String(b.time).trim()
        : new Date().toTimeString().slice(0, 5);

    const inserted = await db
      .insert(schema.water_intake)
      .values({ date, time, amount_ml: Math.round(amountMl) })
      .returning();

    return NextResponse.json({ success: true, record: inserted[0] }, { status: 201 });
  } catch (error) {
    console.error('[water POST] 失败:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const db = getDb();
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'id 必填' }, { status: 400 });

    await db.delete(schema.water_intake).where(eq(schema.water_intake.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[water DELETE] 失败:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const db = getDb();
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'id 必填' }, { status: 400 });
    const b = await request.json();
    const amountMl = Number(b.amountMl);
    if (!Number.isFinite(amountMl) || amountMl <= 0) {
      return NextResponse.json({ success: false, error: 'amountMl 必须为正数' }, { status: 400 });
    }

    await db
      .update(schema.water_intake)
      .set({ amount_ml: Math.round(amountMl) })
      .where(eq(schema.water_intake.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[water PUT] 失败:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
