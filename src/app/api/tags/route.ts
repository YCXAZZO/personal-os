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
    const tags = await db.select().from(schema.tags).orderBy(asc(schema.tags.name));
    return NextResponse.json({ success: true, tags });
  } catch (error) {
    console.error('[tags GET] 失败:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const db = getDb();
    const b = await request.json();
    const name = String(b.name ?? '').trim();
    if (!name) return NextResponse.json({ success: false, error: 'name 必填' }, { status: 400 });

    const dup = await db.select().from(schema.tags).where(eq(schema.tags.name, name));
    if (dup.length > 0) {
      return NextResponse.json({ success: false, error: '标签已存在' }, { status: 400 });
    }

    const inserted = await db.insert(schema.tags).values({ name }).returning();
    return NextResponse.json({ success: true, tag: inserted[0] }, { status: 201 });
  } catch (error) {
    console.error('[tags POST] 失败:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const db = getDb();
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'id 必填' }, { status: 400 });
    await db.delete(schema.tags).where(eq(schema.tags.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[tags DELETE] 失败:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
