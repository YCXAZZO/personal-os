import { NextResponse } from 'next/server';
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from '@/db/schema';
import { asc, eq } from 'drizzle-orm';
import { normDate } from '@/lib/dates';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getDb(): NeonHttpDatabase<typeof schema> {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL 未配置');
  const sql = neon(process.env.DATABASE_URL);
  return drizzle(sql, { schema });
}

const toNullableInt = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : null;
};

function mapTask(t: typeof schema.tasks.$inferSelect) {
  return {
    id: t.id,
    title: t.title,
    projectName: t.project_name,
    defaultDuration: t.default_duration,
    dueDate: normDate(t.due_date),
    status: t.status,
    repeatType: t.repeat_type,
    repeatDays: Array.isArray(t.repeat_days) ? t.repeat_days.map(Number) : null,
    parentTaskId: t.parent_task_id,
    completedAt: t.completed_at instanceof Date ? t.completed_at.toISOString() : t.completed_at,
    createdAt: t.created_at instanceof Date ? t.created_at.toISOString() : t.created_at,
    updatedAt: t.updated_at instanceof Date ? t.updated_at.toISOString() : t.updated_at,
  };
}

export async function GET(request: Request) {
  try {
    const db = getDb();
    const status = new URL(request.url).searchParams.get('status');

    const rows = status
      ? await db
          .select()
          .from(schema.tasks)
          .where(eq(schema.tasks.status, status))
          .orderBy(asc(schema.tasks.due_date))
      : await db.select().from(schema.tasks).orderBy(asc(schema.tasks.due_date));

    return NextResponse.json({ success: true, tasks: rows.map(mapTask) });
  } catch (error) {
    console.error('[tasks GET] 失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const db = getDb();
    const b = await request.json();

    const title = String(b.title ?? '').trim();
    if (!title) {
      return NextResponse.json({ success: false, error: 'title 必填' }, { status: 400 });
    }

    const repeatType = b.repeat_type === 'daily' || b.repeat_type === 'weekly' ? b.repeat_type : 'none';
    const repeatDays =
      repeatType === 'weekly' && Array.isArray(b.repeat_days)
        ? b.repeat_days.map(Number).filter((n: number) => Number.isInteger(n) && n >= 0 && n <= 6)
        : null;

    const values = {
      title,
      project_name: b.project_name ? String(b.project_name) : null,
      default_duration: toNullableInt(b.default_duration),
      due_date: b.due_date ? String(b.due_date) : null,
      status: 'pending' as const,
      repeat_type: repeatType,
      repeat_days: repeatDays,
    };

    const inserted = await db.insert(schema.tasks).values(values).returning();

    return NextResponse.json({ success: true, task: mapTask(inserted[0]) }, { status: 201 });
  } catch (error) {
    console.error('[tasks POST] 失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const db = getDb();
    const id = new URL(request.url).searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'id 必填' }, { status: 400 });
    }
    const b = await request.json();

    const updates: Record<string, unknown> = {};
    if (b.title !== undefined) {
      const title = String(b.title ?? '').trim();
      if (!title) return NextResponse.json({ success: false, error: 'title 不能为空' }, { status: 400 });
      updates.title = title;
    }
    if (b.project_name !== undefined) updates.project_name = b.project_name ? String(b.project_name) : null;
    if (b.default_duration !== undefined) updates.default_duration = toNullableInt(b.default_duration);
    if (b.due_date !== undefined) updates.due_date = b.due_date ? String(b.due_date) : null;
    if (b.status !== undefined) updates.status = b.status === 'completed' ? 'completed' : 'pending';
    if (b.repeat_type !== undefined)
      updates.repeat_type = b.repeat_type === 'daily' || b.repeat_type === 'weekly' ? b.repeat_type : 'none';
    if (b.repeat_days !== undefined)
      updates.repeat_days = Array.isArray(b.repeat_days)
        ? b.repeat_days.map(Number).filter((n: number) => Number.isInteger(n) && n >= 0 && n <= 6)
        : null;
    if (b.completed_at !== undefined)
      updates.completed_at = b.completed_at ? new Date(String(b.completed_at)) : null;
    updates.updated_at = new Date();

    const updated = await db
      .update(schema.tasks)
      .set(updates)
      .where(eq(schema.tasks.id, id))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({ success: false, error: '任务不存在' }, { status: 404 });
    }

    return NextResponse.json({ success: true, task: mapTask(updated[0]) });
  } catch (error) {
    console.error('[tasks PUT] 失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const db = getDb();
    const id = new URL(request.url).searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'id 必填' }, { status: 400 });
    }
    await db.delete(schema.tasks).where(eq(schema.tasks.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[tasks DELETE] 失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
