import { NextResponse } from 'next/server';
import { db, schema } from '@/db';

// 避免该路由在构建时被静态化，确保每次请求都真实查询数据库
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  console.log('[test-db] GET', request.url);
  try {
    const results = await db.select().from(schema.projects);
    return NextResponse.json({ success: true, count: results.length });
  } catch (error) {
    console.error('[test-db] 查询失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
