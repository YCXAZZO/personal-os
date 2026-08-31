'use client';

import { useEffect, useState } from 'react';

type Project = { id: string; name: string };

export default function CompleteModal({
  presetMinutes,
  defaultMinutes,
  onConfirm,
  onCancel,
}: {
  presetMinutes: number;
  defaultMinutes?: number;
  onConfirm: (projectName: string, actualMinutes: number) => void;
  onCancel: () => void;
}) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectName, setProjectName] = useState('');
  const [actualMinutes, setActualMinutes] = useState(defaultMinutes ?? presetMinutes);

  useEffect(() => {
    fetch('/api/projects')
      .then((r) => r.json())
      .then((d) => setProjects(d.projects ?? []))
      .catch(() => {});
  }, []);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-white/20 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-gray-900">
        <h2 className="text-xl font-bold">🍅 专注完成！</h2>

        <label className="mt-4 block text-sm text-gray-600 dark:text-gray-400">
          关联项目
          <select
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
          >
            <option value="">选择项目</option>
            {projects.map((p) => (
              <option key={p.id} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
        </label>

        <label className="mt-3 block text-sm text-gray-600 dark:text-gray-400">
          专注时长（分钟）
          <input
            type="number"
            min="1"
            value={actualMinutes}
            onChange={(e) => setActualMinutes(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
          />
        </label>

        <div className="mt-6 flex gap-2">
          <button
            onClick={() => onConfirm(projectName, actualMinutes)}
            className="flex-1 rounded-lg bg-red-500 py-2.5 font-medium text-white transition-colors hover:bg-red-600"
          >
            确认
          </button>
          <button
            onClick={onCancel}
            className="rounded-lg px-4 py-2.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}
