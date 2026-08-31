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

export async function GET(request: Request) {
  console.log('[seed] GET', request.url);
  try {
    const db = getDb();
    let seeded = 0;

    // 项目 + 标签
    const existingProjects = await db.select().from(schema.projects);
    if (existingProjects.length === 0) {
      await db.insert(schema.projects).values([
        { name: '吉他', color: '#E8795C', total_target: '30首', tags: ['#爱好'], progress_unit: '首' },
        { name: '德语', color: '#4A9E6E', total_target: 'B2', tags: ['#学习'], progress_unit: 'L' },
        { name: '英语', color: '#4A8FE4', total_target: '144课', tags: ['#学习'], progress_unit: 'L' },
        { name: '阅读', color: '#C084FC', tags: ['#学习', '#爱好'] },
      ]);
      await db
        .insert(schema.tags)
        .values([{ name: '#学习' }, { name: '#爱好' }, { name: '#输出型' }, { name: '#输入型' }])
        .onConflictDoNothing();
      seeded += 4;
    }

    // 抗阻预设
    const existingExercise = await db.select().from(schema.exercise_presets);
    if (existingExercise.length === 0) {
      await db.insert(schema.exercise_presets).values([
        { name: '杠铃卧推', body_part: '推', sets: 4, reps: 8, load_kg: 60, is_bodyweight: false },
        { name: '哑铃推举', body_part: '推', sets: 3, reps: 10, load_kg: 30, is_bodyweight: false },
        { name: '引体向上', body_part: '拉', sets: 3, reps: 8, load_kg: 0, is_bodyweight: true },
        { name: '杠铃划船', body_part: '拉', sets: 4, reps: 8, load_kg: 50, is_bodyweight: false },
        { name: '深蹲', body_part: '腿', sets: 4, reps: 8, load_kg: 80, is_bodyweight: false },
        { name: '硬拉', body_part: '腿', sets: 3, reps: 5, load_kg: 100, is_bodyweight: false },
        { name: '卷腹', body_part: '腹', sets: 3, reps: 15, load_kg: 0, is_bodyweight: true },
        { name: '悬垂举腿', body_part: '腹', sets: 3, reps: 10, load_kg: 0, is_bodyweight: true },
      ]);
      seeded += 8;
    }

    // 有氧预设
    const existingCardio = await db.select().from(schema.cardio_presets);
    if (existingCardio.length === 0) {
      await db.insert(schema.cardio_presets).values([
        { cardio_type: '划船', duration_min: 20, hr_zone_primary: '有氧耐力' },
        { cardio_type: '爬坡', duration_min: 30, hr_zone_primary: '燃脂' },
        { cardio_type: '散步', duration_min: 45, hr_zone_primary: '燃脂' },
        { cardio_type: '骑行', duration_min: 40, hr_zone_primary: '有氧耐力' },
      ]);
      seeded += 4;
    }

    return NextResponse.json({
      success: true,
      seeded,
      message: seeded === 0 ? 'already seeded' : `seeded ${seeded} items`,
    });
  } catch (error) {
    console.error('[seed] 失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
