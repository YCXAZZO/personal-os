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

// 归一化数组字段：接受数组或按行分隔的文本
function strArr(v: unknown): string[] | null {
  if (v === null || v === undefined) return null;
  const arr = Array.isArray(v)
    ? v.map(String)
    : typeof v === 'string'
      ? v.split('\n')
      : [];
  const cleaned = arr.map((s) => s.trim()).filter(Boolean);
  return cleaned.length ? cleaned : null;
}

function mapRecipe(r: typeof schema.recipes.$inferSelect) {
  return {
    id: r.id,
    name: r.name,
    category: r.category,
    ingredients: Array.isArray(r.ingredients) ? r.ingredients : null,
    steps: Array.isArray(r.steps) ? r.steps : null,
    notes: r.notes,
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
    updatedAt: r.updated_at instanceof Date ? r.updated_at.toISOString() : r.updated_at,
  };
}

export async function GET(request: Request) {
  try {
    const db = getDb();
    const category = new URL(request.url).searchParams.get('category');

    const rows = category
      ? await db
          .select()
          .from(schema.recipes)
          .where(eq(schema.recipes.category, category))
          .orderBy(asc(schema.recipes.name))
      : await db.select().from(schema.recipes).orderBy(asc(schema.recipes.name));

    return NextResponse.json({ success: true, recipes: rows.map(mapRecipe) });
  } catch (error) {
    console.error('[recipes GET] 失败:', error);
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
    const name = String(b.name ?? '').trim();
    if (!name) {
      return NextResponse.json({ success: false, error: 'name 必填' }, { status: 400 });
    }

    const values = {
      name,
      category: b.category ? String(b.category) : null,
      ingredients: strArr(b.ingredients),
      steps: strArr(b.steps),
      notes: b.notes ? String(b.notes) : null,
    };

    const inserted = await db.insert(schema.recipes).values(values).returning();
    return NextResponse.json({ success: true, recipe: mapRecipe(inserted[0]) }, { status: 201 });
  } catch (error) {
    console.error('[recipes POST] 失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
