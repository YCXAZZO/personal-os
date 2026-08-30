import { NextResponse } from 'next/server';
import { db, schema } from '@/db';
import { desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const limit = Math.max(1, Number(new URL(request.url).searchParams.get('limit')) || 5);
    const rows = await db
      .select()
      .from(schema.ai_analysis_history)
      .orderBy(desc(schema.ai_analysis_history.created_at));

    const history = rows.slice(0, limit).map((r) => ({
      id: r.id,
      date: r.date,
      stateSummary: r.state_summary,
      aiResponse: r.ai_response,
      createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
    }));

    return NextResponse.json({ success: true, history });
  } catch (error) {
    console.error('[ai history GET] 失败:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
