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

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const db = getDb();
    const b = await request.json();

    const updates: Record<string, unknown> = {};
    if (b.name !== undefined) {
      const name = String(b.name ?? '').trim();
      if (!name) return NextResponse.json({ success: false, error: 'name 不能为空' }, { status: 400 });
      updates.name = name;
    }
    if (b.category !== undefined) updates.category = b.category ? String(b.category) : null;
    if (b.ingredients !== undefined) updates.ingredients = strArr(b.ingredients);
    if (b.steps !== undefined) updates.steps = strArr(b.steps);
    if (b.notes !== undefined) updates.notes = b.notes ? String(b.notes) : null;
    updates.updated_at = new Date();

    const updated = await db
      .update(schema.recipes)
      .set(updates)
      .where(eq(schema.recipes.id, params.id))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({ success: false, error: '菜谱不存在' }, { status: 404 });
    }
    return NextResponse.json({ success: true, recipe: mapRecipe(updated[0]) });
  } catch (error) {
    console.error('[recipes PUT] 失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const db = getDb();
    await db.delete(schema.recipes).where(eq(schema.recipes.id, params.id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[recipes DELETE] 失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
