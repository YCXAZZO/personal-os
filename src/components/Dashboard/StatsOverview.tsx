'use client';

import { useEffect, useState } from 'react';

type Stats = { todayMinutes: number; weekMinutes: number; streakDays: number };

export default function StatsOverview({ refreshKey }: { refreshKey: number }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setStats(null);
    setError(null);
    fetch('/api/stats')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setStats(d);
        else setError(d.error ?? '加载失败');
      })
      .catch(() => setError('加载失败'));
  }, [refreshKey]);

  if (error) return <p className="text-red-500">❌ {error}</p>;
  if (!stats) {
    return (
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl border border-white/20 bg-white/10 p-4 text-center backdrop-blur dark:border-white/10 dark:bg-black/10"
          >
            <div className="mx-auto h-6 w-12 rounded bg-gray-400/40 dark:bg-gray-500/40" />
            <div className="mx-auto mt-2 h-3 w-16 rounded bg-gray-400/40 dark:bg-gray-500/40" />
          </div>
        ))}
      </div>
    );
  }

  const cards = [
    { label: '今日总时长', value: stats.todayMinutes, unit: '分钟' },
    { label: '本周总时长', value: stats.weekMinutes, unit: '分钟' },
    { label: '连续打卡', value: stats.streakDays, unit: '天' },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-xl border border-white/20 bg-white/10 p-4 text-center backdrop-blur dark:border-white/10 dark:bg-black/10"
        >
          <div className="text-2xl font-bold">{c.value}</div>
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {c.label}（{c.unit}）
          </div>
        </div>
      ))}
    </div>
  );
}
