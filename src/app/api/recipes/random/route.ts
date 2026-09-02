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
    const category = new URL(request.url).searchParams.get('category') || null;

    const rows = category
      ? await db
          .select()
          .from(schema.recipes)
          .where(eq(schema.recipes.category, category))
          .orderBy(asc(schema.recipes.name))
      : await db.select().from(schema.recipes).orderBy(asc(schema.recipes.name));

    if (rows.length === 0) {
      return NextResponse.json({ success: true, recipe: null });
    }

    const pick = rows[Math.floor(Math.random() * rows.length)];
    return NextResponse.json({ success: true, recipe: mapRecipe(pick) });
  } catch (error) {
    console.error('[recipes random] 失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
