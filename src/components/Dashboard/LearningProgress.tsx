'use client';

import { useEffect, useState } from 'react';

type ProgressItem = {
  id: string;
  name: string;
  color: string | null;
  totalTarget: string | null;
  currentProgress: string | null;
  percent: number;
};

export default function LearningProgress({ refreshKey }: { refreshKey: number }) {
  const [items, setItems] = useState<ProgressItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setItems(null);
    setError(null);
    fetch('/api/stats')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setItems(d.progress ?? []);
        else setError(d.error ?? '加载失败');
      })
      .catch(() => setError('加载失败'));
  }, [refreshKey]);

  if (error) return <p className="text-red-500">❌ {error}</p>;
  if (!items) {
    return (
      <div className="space-y-4">
        {[0, 1, 2].map((i) => (
          <div key={i}>
            <div className="flex items-center justify-between">
              <div className="h-4 w-20 animate-pulse rounded bg-gray-400/40 dark:bg-gray-500/40" />
              <div className="h-4 w-24 animate-pulse rounded bg-gray-400/40 dark:bg-gray-500/40" />
            </div>
            <div className="mt-2 h-2 w-full animate-pulse rounded-full bg-gray-400/40 dark:bg-gray-500/40" />
          </div>
        ))}
      </div>
    );
  }
  if (items.length === 0) return <p className="text-gray-500">暂无教学进度</p>;

  return (
    <div className="space-y-4">
      {items.map((it) => (
        <div key={it.id}>
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{it.name}</span>
            <span className="text-gray-500 dark:text-gray-400">
              {it.currentProgress ?? 0} / {it.totalTarget} · {it.percent}%
            </span>
          </div>
          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${it.percent}%`, backgroundColor: it.color ?? '#3b82f6' }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
