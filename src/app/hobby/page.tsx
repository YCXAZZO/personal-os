import MainLayout from '@/components/Layout/MainLayout';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from '@/db/schema';
import { arrayContains } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export default async function HobbyPage() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    return <div>数据库连接配置缺失</div>;
  }
  const sql = neon(url);
  const db = drizzle(sql, { schema });

  const projects = await db
    .select()
    .from(schema.projects)
    .where(arrayContains(schema.projects.tags, ['#爱好']));

  return (
    <MainLayout>
      <h1 className="text-2xl font-bold">🎨 爱好模块 · 开发中</h1>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">
            暂无 #爱好 标签的项目（先访问 /api/seed 初始化数据）
          </p>
        ) : (
          projects.map((p) => (
            <div
              key={p.id}
              className="rounded-xl border border-white/20 bg-white/10 p-5 backdrop-blur dark:border-white/10 dark:bg-black/10"
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: p.color ?? '#888888' }}
                />
                <h2 className="font-semibold">{p.name}</h2>
              </div>
              {p.total_target && (
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  目标：{p.total_target}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </MainLayout>
  );
}
