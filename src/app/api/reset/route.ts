import { NextResponse } from 'next/server';
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from '@/db/schema';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getDb(): NeonHttpDatabase<typeof schema> {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL 未配置');
  const sql = neon(process.env.DATABASE_URL);
  return drizzle(sql, { schema });
}

export async function DELETE() {
  try {
    const db = getDb();

    // 事务性清空：任一删除失败则整体回滚
    await db.transaction(async (tx) => {
      await tx.delete(schema.records);
      await tx.delete(schema.morning_snapshots);
      await tx.delete(schema.training_logs);
      await tx.delete(schema.cardio_logs);
      await tx.delete(schema.water_intake);
      await tx.delete(schema.body_signals);
      await tx.delete(schema.caliper_measurements);
      await tx.delete(schema.daily_flags);
      await tx.delete(schema.pomodoro_sessions);
      await tx.delete(schema.ai_analysis_history);
    });

    return NextResponse.json({ success: true, message: '所有业务数据已清空' });
  } catch (error) {
    console.error('[reset DELETE] 失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
