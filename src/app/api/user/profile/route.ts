import { NextResponse } from 'next/server';
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from '@/db/schema';
import { desc, eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getDb(): NeonHttpDatabase<typeof schema> {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL 未配置');
  const sql = neon(process.env.DATABASE_URL);
  return drizzle(sql, { schema });
}

export async function GET() {
  try {
    const db = getDb();
    const profileRows = await db
      .select()
      .from(schema.user_profile)
      .orderBy(desc(schema.user_profile.updated_at));
    const age = profileRows[0]?.age ?? null;

    const morningRows = await db
      .select()
      .from(schema.morning_snapshots)
      .orderBy(desc(schema.morning_snapshots.date));
    const latestRestHr = morningRows[0]?.morning_hr_rest ?? null;

    return NextResponse.json({ success: true, age, latestRestHr });
  } catch (error) {
    console.error('[user profile GET] 失败:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const db = getDb();
    const b = await request.json();
    const age = Number(b.age);
    if (!Number.isFinite(age) || age <= 0) {
      return NextResponse.json({ success: false, error: '年龄必须是正数' }, { status: 400 });
    }

    const rounded = Math.round(age);
    const profileRows = await db
      .select()
      .from(schema.user_profile)
      .orderBy(desc(schema.user_profile.updated_at));

    if (profileRows.length > 0) {
      await db
        .update(schema.user_profile)
        .set({ age: rounded, updated_at: new Date() })
        .where(eq(schema.user_profile.id, profileRows[0].id));
    } else {
      await db.insert(schema.user_profile).values({ age: rounded });
    }

    return NextResponse.json({ success: true, age: rounded });
  } catch (error) {
    console.error('[user profile POST] 失败:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
