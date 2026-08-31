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

const PALETTE = ['#E8795C', '#4A9E6E', '#4A8FE4', '#C084FC', '#F59E0B', '#EF4444', '#10B981', '#8B5CF6', '#EC4899', '#14B8A6'];

function randomColor(): string {
  return PALETTE[Math.floor(Math.random() * PALETTE.length)];
}

function toNullableNum(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : null;
}

export async function GET(request: Request) {
  console.log('[projects] GET', request.url);
  try {
    const db = getDb();
    const projects = await db
      .select()
      .from(schema.projects)
      .orderBy(asc(schema.projects.name));
    return NextResponse.json({ success: true, projects });
  } catch (error) {
    console.error('[projects GET] 失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const db = getDb();
    const body = await request.json();
    const name = String(body.name ?? '').trim();
    if (!name) {
      return NextResponse.json({ success: false, error: 'name 必填' }, { status: 400 });
    }

    // 名称唯一性校验
    const dup = await db.select().from(schema.projects).where(eq(schema.projects.name, name));
    if (dup.length > 0) {
      return NextResponse.json({ success: false, error: '项目名称已存在' }, { status: 400 });
    }

    const color = body.color ? String(body.color) : randomColor();

    const inserted = await db
      .insert(schema.projects)
      .values({
        name,
        color,
        progress_unit: body.progress_unit ? String(body.progress_unit) : null,
        total_target: body.total_target ? String(body.total_target) : null,
        daily_goal_minutes: toNullableNum(body.daily_goal_minutes),
      })
      .returning();

    return NextResponse.json({ success: true, project: inserted[0] }, { status: 201 });
  } catch (error) {
    console.error('[projects POST] 失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

// PATCH：命令栏的进度更新（保留兼容）
export async function PATCH(request: Request) {
  try {
    const db = getDb();
    const body = await request.json();
    const id = body.id;
    if (!id) {
      return NextResponse.json({ success: false, error: 'id 必填' }, { status: 400 });
    }
    const currentProgress = body.currentProgress ? String(body.currentProgress) : null;

    const updated = await db
      .update(schema.projects)
      .set({ current_progress: currentProgress })
      .where(eq(schema.projects.id, id))
      .returning();

    return NextResponse.json({ success: true, project: updated[0] });
  } catch (error) {
    console.error('[projects PATCH] 失败:', error);
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
    const body = await request.json();

    // 名称冲突校验（排除自身）
    if (body.name !== undefined) {
      const name = String(body.name ?? '').trim();
      if (name) {
        const dup = await db.select().from(schema.projects).where(eq(schema.projects.name, name));
        if (dup.length > 0 && dup[0].id !== id) {
          return NextResponse.json({ success: false, error: '项目名称已存在' }, { status: 400 });
        }
      }
    }

    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = String(body.name ?? '').trim();
    if (body.color !== undefined) updates.color = body.color ? String(body.color) : null;
    if (body.progress_unit !== undefined) updates.progress_unit = body.progress_unit ? String(body.progress_unit) : null;
    if (body.total_target !== undefined) updates.total_target = body.total_target ? String(body.total_target) : null;
    if (body.daily_goal_minutes !== undefined) updates.daily_goal_minutes = toNullableNum(body.daily_goal_minutes);
    if (body.currentProgress !== undefined) updates.current_progress = body.currentProgress ? String(body.currentProgress) : null;

    const updated = await db
      .update(schema.projects)
      .set(updates)
      .where(eq(schema.projects.id, id))
      .returning();

    return NextResponse.json({ success: true, project: updated[0] });
  } catch (error) {
    console.error('[projects PUT] 失败:', error);
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
    await db.delete(schema.projects).where(eq(schema.projects.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[projects DELETE] 失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
