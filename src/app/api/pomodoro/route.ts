import { NextResponse } from 'next/server';
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from '@/db/schema';
import { and, desc, eq, gte, inArray } from 'drizzle-orm';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getDb(): NeonHttpDatabase<typeof schema> {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL 未配置');
  const sql = neon(process.env.DATABASE_URL);
  return drizzle(sql, { schema });
}

function mapSession(s: (typeof schema.pomodoro_sessions.$inferSelect) | null) {
  if (!s) return null;
  return {
    id: s.id,
    status: s.status,
    presetMinutes: s.preset_minutes,
    startTime: s.start_time instanceof Date ? s.start_time.toISOString() : s.start_time,
    elapsedSeconds: s.elapsed_seconds,
    actualMinutes: s.actual_minutes,
    projectName: s.project_name,
    createdAt: s.created_at instanceof Date ? s.created_at.toISOString() : s.created_at,
  };
}

async function getActiveSession(db: NeonHttpDatabase<typeof schema>) {
  const rows = await db
    .select()
    .from(schema.pomodoro_sessions)
    .where(inArray(schema.pomodoro_sessions.status, ['running', 'paused']))
    .orderBy(desc(schema.pomodoro_sessions.created_at));
  return rows[0] ?? null;
}

export async function GET() {
  try {
    const db = getDb();
    const session = await getActiveSession(db);

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const completedToday = await db
      .select()
      .from(schema.pomodoro_sessions)
      .where(and(eq(schema.pomodoro_sessions.status, 'completed'), gte(schema.pomodoro_sessions.created_at, startOfToday)));

    return NextResponse.json({
      success: true,
      session: mapSession(session),
      todayCompleted: completedToday.length,
    });
  } catch (error) {
    console.error('[pomodoro GET] 失败:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const db = getDb();
    const b = await request.json();
    const presetMinutes = Number(b.presetMinutes) || 25;

    const inserted = await db
      .insert(schema.pomodoro_sessions)
      .values({
        status: 'running',
        preset_minutes: presetMinutes,
        start_time: new Date(),
        elapsed_seconds: 0,
      })
      .returning();

    return NextResponse.json({ success: true, session: mapSession(inserted[0]) }, { status: 201 });
  } catch (error) {
    console.error('[pomodoro POST] 失败:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const db = getDb();
    const b = await request.json();
    const action = b.action;

    const session = await getActiveSession(db);
    if (!session) {
      return NextResponse.json({ success: false, error: '无活跃会话' }, { status: 400 });
    }

    if (action === 'pause' && session.status === 'running') {
      const startMs = session.start_time ? new Date(session.start_time).getTime() : Date.now();
      const elapsed = (session.elapsed_seconds ?? 0) + Math.max(0, Math.floor((Date.now() - startMs) / 1000));
      await db
        .update(schema.pomodoro_sessions)
        .set({ status: 'paused', elapsed_seconds: elapsed, updated_at: new Date() })
        .where(eq(schema.pomodoro_sessions.id, session.id));
    } else if (action === 'resume' && session.status === 'paused') {
      await db
        .update(schema.pomodoro_sessions)
        .set({ status: 'running', start_time: new Date(), updated_at: new Date() })
        .where(eq(schema.pomodoro_sessions.id, session.id));
    } else {
      return NextResponse.json({ success: false, error: '无效的操作' }, { status: 400 });
    }

    const updated = await getActiveSession(db);
    return NextResponse.json({ success: true, session: mapSession(updated) });
  } catch (error) {
    console.error('[pomodoro PUT] 失败:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const db = getDb();
    const session = await getActiveSession(db);
    if (!session) {
      return NextResponse.json({ success: false, error: '无活跃会话' }, { status: 400 });
    }

    await db
      .update(schema.pomodoro_sessions)
      .set({ status: 'cancelled', updated_at: new Date() })
      .where(eq(schema.pomodoro_sessions.id, session.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[pomodoro DELETE] 失败:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const db = getDb();
    const b = await request.json();
    const projectName = String(b.projectName ?? '').trim();
    const actualMinutes = Number(b.actualMinutes) || 0;

    const session = await getActiveSession(db);
    if (!session) {
      return NextResponse.json({ success: false, error: '无活跃会话' }, { status: 400 });
    }

    await db
      .update(schema.pomodoro_sessions)
      .set({
        status: 'completed',
        project_name: projectName || null,
        actual_minutes: actualMinutes,
        updated_at: new Date(),
      })
      .where(eq(schema.pomodoro_sessions.id, session.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[pomodoro PATCH] 失败:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
