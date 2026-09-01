import { NextResponse } from 'next/server';
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import { todayStr, toDateStr } from '@/lib/dates';
import { addDays, parseISO } from 'date-fns';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getDb(): NeonHttpDatabase<typeof schema> {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL 未配置');
  const sql = neon(process.env.DATABASE_URL);
  return drizzle(sql, { schema });
}

function nextDueDate(current: string | null, repeatType: string, repeatDays: number[] | null): string {
  const base = current ? parseISO(current) : new Date();
  if (repeatType === 'daily') {
    return toDateStr(addDays(base, 1));
  }
  // weekly：找到下一个命中的星期几
  const days = repeatDays && repeatDays.length > 0 ? repeatDays : [base.getDay()];
  for (let i = 1; i <= 7; i++) {
    const d = addDays(base, i);
    if (days.includes(d.getDay())) return toDateStr(d);
  }
  return toDateStr(addDays(base, 7));
}

export async function POST(request: Request) {
  try {
    const db = getDb();
    const b = await request.json();
    const taskId = b.taskId ? String(b.taskId) : null;
    if (!taskId) {
      return NextResponse.json({ success: false, error: 'taskId 必填' }, { status: 400 });
    }

    const rows = await db.select().from(schema.tasks).where(eq(schema.tasks.id, taskId));
    const task = rows[0];
    if (!task) {
      return NextResponse.json({ success: false, error: '任务不存在' }, { status: 404 });
    }

    // 幂等：已完成的重复点击不重复生成记录/下个实例
    if (task.status === 'completed') {
      return NextResponse.json({ success: true, recordCreated: false, nextTaskCreated: false });
    }

    // 1) 标记完成
    await db
      .update(schema.tasks)
      .set({ status: 'completed', completed_at: new Date(), updated_at: new Date() })
      .where(eq(schema.tasks.id, taskId));

    // 2) 生成打卡记录（仅当绑定了项目）
    let recordCreated = false;
    if (task.project_name) {
      const duration = task.default_duration != null ? task.default_duration : 25;
      await db.insert(schema.records).values({
        project_name: task.project_name,
        duration_minutes: duration,
        rating: 3,
        tags: ['#任务'],
        note: `通过任务清单完成: ${task.title}`,
        date: todayStr(),
      });
      recordCreated = true;
    }

    // 3) 重复任务：生成下一个实例
    let nextTaskCreated = false;
    if (task.repeat_type === 'daily' || task.repeat_type === 'weekly') {
      const parentTaskId = task.parent_task_id ?? task.id;
      const repeatDays = Array.isArray(task.repeat_days) ? task.repeat_days.map(Number) : null;
      await db.insert(schema.tasks).values({
        title: task.title,
        project_name: task.project_name,
        default_duration: task.default_duration,
        due_date: nextDueDate(task.due_date ? String(task.due_date) : null, task.repeat_type, repeatDays),
        status: 'pending',
        repeat_type: task.repeat_type,
        repeat_days: repeatDays,
        parent_task_id: parentTaskId,
      });
      nextTaskCreated = true;
    }

    return NextResponse.json({ success: true, recordCreated, nextTaskCreated });
  } catch (error) {
    console.error('[tasks complete] 失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
