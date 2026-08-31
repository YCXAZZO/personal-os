import { NextResponse } from 'next/server';
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from '@/db/schema';
import { and, arrayContains, desc, eq } from 'drizzle-orm';
import { todayStr } from '@/lib/dates';

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
    const url = new URL(request.url);
    const all = url.searchParams.get('all') === '1';
    const tag = url.searchParams.get('tag');

    const conditions = [];
    if (!all) conditions.push(eq(schema.records.date, todayStr()));
    if (tag) conditions.push(arrayContains(schema.records.tags, [tag]));

    const records = conditions.length
      ? await db
          .select()
          .from(schema.records)
          .where(and(...conditions))
          .orderBy(desc(schema.records.timestamp))
      : await db.select().from(schema.records).orderBy(desc(schema.records.timestamp));

    const projects = await db.select().from(schema.projects);
    const colorMap = new Map(projects.map((p) => [p.name, p.color]));

    const mapped = records.map((r) => ({
      id: r.id,
      projectName: r.project_name,
      durationMinutes: r.duration_minutes,
      rating: r.rating,
      tags: r.tags,
      note: r.note,
      date: r.date,
      timestamp: r.timestamp instanceof Date ? r.timestamp.toISOString() : r.timestamp,
      color: colorMap.get(r.project_name) ?? null,
    }));

    return NextResponse.json({ success: true, records: mapped });
  } catch (error) {
    console.error('[records GET] 失败:', error);
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
    const projectName = String(body.projectName ?? '').trim();
    if (!projectName) {
      return NextResponse.json({ success: false, error: 'projectName 必填' }, { status: 400 });
    }

    let duration = Number(body.durationMinutes);
    if (!Number.isFinite(duration)) duration = 15;

    let rating = Number(body.rating ?? 3);
    if (!Number.isFinite(rating)) rating = 3;
    rating = Math.min(5, Math.max(1, Math.round(rating)));

    const tags = Array.isArray(body.tags) ? body.tags.map(String) : [];
    const note = body.note ? String(body.note) : null;
    const date = body.date ? String(body.date) : todayStr();

    const inserted = await db
      .insert(schema.records)
      .values({
        project_name: projectName,
        duration_minutes: Math.round(duration),
        rating,
        tags,
        note,
        date,
      })
      .returning();

    return NextResponse.json({ success: true, record: inserted[0] }, { status: 201 });
  } catch (error) {
    console.error('[records POST] 失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
