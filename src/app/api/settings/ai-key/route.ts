import { NextResponse } from 'next/server';
import { db, schema } from '@/db';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
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
