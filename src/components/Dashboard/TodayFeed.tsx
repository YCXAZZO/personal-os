'use client';

import { useEffect, useState } from 'react';

type FeedRecord = {
  id: string;
  projectName: string;
  durationMinutes: number | null;
  rating: number | null;
  tags: string[] | null;
  note: string | null;
  color: string | null;
};

function Stars({ rating }: { rating: number | null }) {
  const n = Math.min(5, Math.max(0, rating ?? 0));
  return (
    <span className="text-sm tracking-wider text-yellow-500">
      {'★'.repeat(n)}
      {'☆'.repeat(5 - n)}
    </span>
  );
}

export default function TodayFeed({ refreshKey }: { refreshKey: number }) {
  const [records, setRecords] = useState<FeedRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRecords(null);
    setError(null);
    fetch('/api/records')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setRecords(d.records ?? []);
        else setError(d.error ?? '加载失败');
      })
      .catch(() => setError('加载失败'));
  }, [refreshKey]);

  if (error) return <p className="text-red-500">❌ {error}</p>;
  if (!records) return <p className="text-gray-500">加载中…</p>;
  if (records.length === 0) {
    return <p className="text-gray-500">📭 今天还没有记录，开始打卡吧！</p>;
  }

  return (
    <div className="space-y-3">
      {records.map((r) => (
        <div
          key={r.id}
          className="rounded-xl border border-white/20 bg-white/10 p-4 backdrop-blur dark:border-white/10 dark:bg-black/10"
        >
          <div className="flex items-center gap-2">
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: r.color ?? '#888888' }}
            />
            <span className="font-semibold">{r.projectName}</span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {r.durationMinutes ?? 0} 分钟
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Stars rating={r.rating} />
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
  );
}
