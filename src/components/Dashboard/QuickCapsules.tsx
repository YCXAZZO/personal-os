'use client';

import { useEffect, useState } from 'react';

type Project = { id: string; name: string; color: string | null };
type Record = {
  id: string;
  projectName: string;
  durationMinutes: number | null;
  date: string | null;
};

function localTodayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function QuickCapsules({
  refreshKey,
  onRecorded,
}: {
  refreshKey: number;
  onRecorded: () => void;
}) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [records, setRecords] = useState<Record[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/projects').then((r) => r.json()),
      fetch('/api/records?all=1').then((r) => r.json()),
    ])
      .then(([p, r]) => {
        setProjects(p.projects ?? []);
        setRecords(r.records ?? []);
      })
      .catch(() => {});
  }, [refreshKey]);

  const today = localTodayStr();
  const todayRecords = records.filter((r) => r.date === today);

  // 今日频次统计
  const freq = new Map<string, number>();
  for (const r of todayRecords) freq.set(r.projectName, (freq.get(r.projectName) ?? 0) + 1);

  const top = projects
    .map((p) => ({ project: p, count: freq.get(p.name) ?? 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const lastRecord = records[0] ?? null;

  async function recordProject(name: string, duration: number) {
    setBusy(name);
    try {
      await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectName: name, durationMinutes: duration }),
      });
      onRecorded();
    } catch {
      // 忽略，刷新时自然体现失败
    } finally {
      setBusy(null);
    }
  }

  async function handleCapsule(name: string) {
    const durations = records
      .filter((r) => r.projectName === name)
      .map((r) => r.durationMinutes ?? 0);
    const avg = durations.length
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 20;
    await recordProject(name, avg);
  }

  return (
    <div className="flex flex-nowrap items-center gap-2 overflow-x-auto py-1">
      {top.map(({ project, count }) => (
        <button
          key={project.id}
          onClick={() => handleCapsule(project.name)}
          disabled={busy !== null}
          className="rounded-full border px-3 py-1.5 text-sm transition-colors disabled:opacity-50"
          style={{
            borderColor: project.color ?? '#3b82f6',
            color: project.color ?? '#3b82f6',
            backgroundColor: `${project.color ?? '#3b82f6'}1a`,
          }}
        >
          {project.name}
          {count > 0 && <span className="ml-1 text-xs opacity-70">×{count}</span>}
        </button>
      ))}

      <button
        onClick={() => lastRecord && recordProject(lastRecord.projectName, lastRecord.durationMinutes ?? 15)}
        disabled={!lastRecord || busy !== null}
        className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-sm transition-colors hover:bg-white/20 disabled:opacity-40 dark:border-white/10 dark:bg-black/10"
      >
        🔄 再来一次
      </button>
    </div>
  );
}
