import { NextResponse } from 'next/server';
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { normDate, todayStr } from '@/lib/dates';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getDb(): NeonHttpDatabase<typeof schema> {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL 未配置');
  const sql = neon(process.env.DATABASE_URL);
  return drizzle(sql, { schema });
}

function mapLog(l: typeof schema.meal_logs.$inferSelect) {
  return {
    id: l.id,
    date: normDate(l.date),
    mealType: l.meal_type,
    recipeId: l.recipe_id,
    name: l.custom_name,
    category: l.category,
    notes: l.notes,
    createdAt: l.created_at instanceof Date ? l.created_at.toISOString() : l.created_at,
  };
}

export async function GET(request: Request) {
  try {
    const db = getDb();
    const date = new URL(request.url).searchParams.get('date') || todayStr();

    const rows = await db
      .select()
      .from(schema.meal_logs)
      .where(eq(schema.meal_logs.date, date))
      .orderBy(desc(schema.meal_logs.created_at));

    return NextResponse.json({ success: true, logs: rows.map(mapLog) });
  } catch (error) {
    console.error('[meal-logs GET] 失败:', error);
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
    const date = b.date ? String(b.date) : todayStr();

    // recipe_id 存在时校验菜谱并自动补全名称/分类
    let recipe: typeof schema.recipes.$inferSelect | null = null;
    if (b.recipe_id) {
      const rows = await db
        .select()
        .from(schema.recipes)
        .where(eq(schema.recipes.id, String(b.recipe_id)));
      if (rows.length === 0) {
        return NextResponse.json({ success: false, error: '菜谱不存在' }, { status: 404 });
      }
      recipe = rows[0];
    }

    const name = (b.custom_name ? String(b.custom_name) : recipe?.name ?? '').trim();
    if (!name) {
      return NextResponse.json({ success: false, error: 'custom_name 必填或需关联菜谱' }, { status: 400 });
    }
    const category = b.category ? String(b.category) : (recipe?.category ?? null);

    const values = {
      date,
      meal_type: b.meal_type ? String(b.meal_type) : null,
      recipe_id: recipe?.id ?? null,
      custom_name: name,
      category,
      notes: b.notes ? String(b.notes) : null,
    };

    const inserted = await db.insert(schema.meal_logs).values(values).returning();

    // 联动总览「今日流」：写入 records（project_name='饮食', tags=['#饮食']）
    const recordNote = `饮食: ${name}${category ? `（${category}）` : ''}`;
    await db.insert(schema.records).values({
      project_name: '饮食',
      duration_minutes: null,
      rating: null,
      tags: ['#饮食'],
      note: recordNote,
      date,
    });

    return NextResponse.json({ success: true, log: mapLog(inserted[0]) }, { status: 201 });
  } catch (error) {
    console.error('[meal-logs POST] 失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
