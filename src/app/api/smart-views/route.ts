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

export async function GET() {
  try {
    const db = getDb();
    const views = await db.select().from(schema.smart_views).orderBy(asc(schema.smart_views.name));
    return NextResponse.json({
      success: true,
      views: views.map((v) => ({
        id: v.id,
        name: v.name,
        tagFilters: v.tag_filters ?? [],
      })),
    });
  } catch (error) {
    console.error('[smart-views GET] 失败:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const db = getDb();
    const b = await request.json();
    const name = String(b.name ?? '').trim();
    if (!name) return NextResponse.json({ success: false, error: 'name 必填' }, { status: 400 });

    const dup = await db.select().from(schema.smart_views).where(eq(schema.smart_views.name, name));
    if (dup.length > 0) {
      return NextResponse.json({ success: false, error: '视图名称已存在' }, { status: 400 });
    }

    const tagFilters = Array.isArray(b.tagFilters) ? b.tagFilters.map(String).filter(Boolean) : [];

    const inserted = await db
      .insert(schema.smart_views)
      .values({ name, tag_filters: tagFilters })
      .returning();

    return NextResponse.json({ success: true, view: inserted[0] }, { status: 201 });
  } catch (error) {
    console.error('[smart-views POST] 失败:', error);
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

    const dup = await db.select().from(schema.smart_views).where(eq(schema.smart_views.name, name));
    if (dup.length > 0 && dup[0].id !== id) {
      return NextResponse.json({ success: false, error: '视图名称已存在' }, { status: 400 });
    }

    const tagFilters = Array.isArray(b.tagFilters) ? b.tagFilters.map(String).filter(Boolean) : [];

    const updated = await db
      .update(schema.smart_views)
      .set({ name, tag_filters: tagFilters })
      .where(eq(schema.smart_views.id, id))
      .returning();

    return NextResponse.json({ success: true, view: updated[0] });
  } catch (error) {
    console.error('[smart-views PUT] 失败:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const db = getDb();
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'id 必填' }, { status: 400 });
    await db.delete(schema.smart_views).where(eq(schema.smart_views.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[smart-views DELETE] 失败:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
