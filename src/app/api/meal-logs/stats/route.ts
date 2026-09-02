import { NextResponse } from 'next/server';
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from '@/db/schema';
import { and, desc, gte, lte } from 'drizzle-orm';
import { minusDays, normDate, todayStr } from '@/lib/dates';

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
    const endDate = url.searchParams.get('date') || todayStr();
    const daysRaw = Number(url.searchParams.get('days') ?? 7);
    const days = Number.isFinite(daysRaw) && daysRaw >= 1 ? Math.floor(daysRaw) : 7;
    const startDate = minusDays(endDate, days - 1);

    const rows = await db
      .select()
      .from(schema.meal_logs)
      .where(and(gte(schema.meal_logs.date, startDate), lte(schema.meal_logs.date, endDate)))
      .orderBy(desc(schema.meal_logs.date));

    const byCategory = new Map<string, number>();
    let indulgence = 0;
    for (const l of rows) {
      const c = l.category || '未分类';
      byCategory.set(c, (byCategory.get(c) ?? 0) + 1);
      if (c === '放纵餐') indulgence += 1;
    }

    const total = rows.length;
    const categories = Array.from(byCategory.entries())
      .map(([category, count]) => ({
        category,
        count,
        percent: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      success: true,
      range: { startDate, endDate },
      stats: {
        total,
        byCategory: categories,
        indulgence,
        indulgencePercent: total > 0 ? Math.round((indulgence / total) * 1000) / 10 : 0,
      },
      logs: rows.map((l) => ({
        id: l.id,
        date: normDate(l.date),
        mealType: l.meal_type,
        name: l.custom_name,
        category: l.category,
        notes: l.notes,
      })),
    });
  } catch (error) {
    console.error('[meal-logs stats] 失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
