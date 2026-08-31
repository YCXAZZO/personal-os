import { NextResponse } from 'next/server';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from '@/db/schema';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const url = process.env.DATABASE_URL;
    if (!url) {
      return NextResponse.json(
        { success: false, error: 'DATABASE_URL not set' },
        { status: 500 }
      );
    }

    const sqlNeon = neon(url);
    const db = drizzle(sqlNeon, { schema });

    // 简单查询测试连接
    const result = await db.execute(sql`SELECT 1 as connected`);

    return NextResponse.json({
      success: true,
      message: 'Database connected successfully',
      result: result.rows,
    });
  } catch (error) {
    console.error('[test-db] 连接失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}