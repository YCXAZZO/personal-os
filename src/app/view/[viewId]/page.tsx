import MainLayout from '@/components/Layout/MainLayout';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from '@/db/schema';
import { arrayContains, desc, eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export default async function ViewPage({ params }: { params: { viewId: string } }) {
  const url = process.env.DATABASE_URL;
  if (!url) {
    return <div>数据库连接配置缺失</div>;
  }
  const sql = neon(url);
  const db = drizzle(sql, { schema });

  const viewRows = await db
    .select()
    .from(schema.smart_views)
    .where(eq(schema.smart_views.id, params.viewId));
  const view = viewRows[0];
  const tagFilters = view?.tag_filters ?? [];

  let records: (typeof schema.records.$inferSelect)[] = [];
  if (view && tagFilters.length > 0) {
    records = await db
      .select()
      .from(schema.records)
      .where(arrayContains(schema.records.tags, tagFilters))
      .orderBy(desc(schema.records.timestamp));
  }

  const projects = await db
    .select()
    .from(schema.projects)
    .orderBy(desc(schema.projects.name));
  const colorMap = new Map(projects.map((p) => [p.name, p.color]));

  return (
    <MainLayout>
      <h1 className="text-2xl font-bold">🔍 {view?.name ?? '视图'}</h1>

      {view && tagFilters.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {tagFilters.map((t) => (
            <span
              key={t}
              className="rounded-full bg-blue-500/20 px-2 py-0.5 text-xs text-blue-600 dark:text-blue-300"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      {!view || records.length === 0 ? (
        <p className="mt-6 text-gray-500">该视图暂无记录</p>
      ) : (
        <div className="mt-6 space-y-3">
          {records.map((r) => (
            <div
              key={r.id}
              className="rounded-xl border border-white/20 bg-white/10 p-4 backdrop-blur dark:border-white/10 dark:bg-black/10"
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: colorMap.get(r.project_name) ?? '#888888' }}
                />
                <span className="font-semibold">{r.project_name}</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {r.duration_minutes ?? 0} 分钟
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-sm tracking-wider text-yellow-500">
                  {'★'.repeat(Math.min(5, Math.max(0, r.rating ?? 0)))}
                  {'☆'.repeat(Math.max(0, 5 - Math.min(5, Math.max(0, r.rating ?? 0))))}
                </span>
                {r.tags?.map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-blue-500/20 px-2 py-0.5 text-xs text-blue-600 dark:text-blue-300"
                  >
                    {t}
                  </span>
                ))}
              </div>
              {r.note && (
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">📝 {r.note}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </MainLayout>
  );
}
