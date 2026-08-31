import { NextResponse } from 'next/server';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from '@/db/schema';
import { desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function GET(_request: Request) {
  try {
    const url = process.env.DATABASE_URL;
    if (!url) {
      return NextResponse.json({ success: false, error: 'DATABASE_URL not set' }, { status: 500 });
    }
    const sql = neon(url);
    const db = drizzle(sql, { schema });

    const history = await db
      .select()
      .from(schema.ai_analysis_history)
      .orderBy(desc(schema.ai_analysis_history.created_at))
      .limit(5);

    return NextResponse.json({ success: true, history });
  } catch (error) {
    console.error('[history] 获取失败:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}