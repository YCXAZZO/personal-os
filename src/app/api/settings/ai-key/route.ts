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

export async function GET() {
  try {
    const db = getDb();
    const rows = await db
      .select()
      .from(schema.api_keys)
      .where(eq(schema.api_keys.provider, 'deepseek'));
    return NextResponse.json({ success: true, hasKey: rows.length > 0 && !!rows[0].key });
  } catch (error) {
    console.error('[ai-key GET] 失败:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const db = getDb();
    const b = await request.json();
    const apiKey = String(b.apiKey ?? '').trim();
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'apiKey 必填' }, { status: 400 });
    }

    const existing = await db
      .select()
      .from(schema.api_keys)
      .where(eq(schema.api_keys.provider, 'deepseek'));

    if (existing.length > 0) {
      await db
        .update(schema.api_keys)
        .set({ key: apiKey, updated_at: new Date() })
        .where(eq(schema.api_keys.provider, 'deepseek'));
    } else {
      await db.insert(schema.api_keys).values({ provider: 'deepseek', key: apiKey });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[ai-key POST] 失败:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
