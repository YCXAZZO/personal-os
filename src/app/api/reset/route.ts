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

    // 顺序删除（neon-http 不支持事务，任一步失败即抛错并停止后续删除）
    await db.delete(schema.records);
    await db.delete(schema.morning_snapshots);
    await db.delete(schema.training_logs);
    await db.delete(schema.cardio_logs);
    await db.delete(schema.water_intake);
    await db.delete(schema.body_signals);
    await db.delete(schema.caliper_measurements);
    await db.delete(schema.daily_flags);
    await db.delete(schema.pomodoro_sessions);
    await db.delete(schema.ai_analysis_history);

    return NextResponse.json({ success: true, message: '所有数据已清空' });
  } catch (error) {
    console.error('[reset DELETE] 失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
