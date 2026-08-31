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

export async function GET(request: Request) {
  try {
    const db = getDb();
    const date = new URL(request.url).searchParams.get('date');
    if (!date) return NextResponse.json({ success: false, error: 'date 必填' }, { status: 400 });

    const rows = await db
      .select()
      .from(schema.daily_flags)
      .where(eq(schema.daily_flags.date, date));
    const f = rows[0];

    return NextResponse.json({ success: true, isCarbCutDay: f?.is_carb_cut_day ?? false });
  } catch (error) {
    console.error('[carb-cut GET] 失败:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const db = getDb();
    const b = await request.json();
    const date = b.date ? String(b.date) : null;
    if (!date) return NextResponse.json({ success: false, error: 'date 必填' }, { status: 400 });
    const isCarbCutDay = !!b.isCarbCutDay;

    await db
      .insert(schema.daily_flags)
      .values({ date, is_carb_cut_day: isCarbCutDay })
      .onConflictDoUpdate({
        target: schema.daily_flags.date,
        set: { is_carb_cut_day: isCarbCutDay },
      });

    return NextResponse.json({ success: true, isCarbCutDay });
  } catch (error) {
    console.error('[carb-cut POST] 失败:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
