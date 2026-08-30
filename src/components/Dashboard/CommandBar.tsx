'use client';

import { useEffect, useRef, useState } from 'react';

type Project = {
  id: string;
  name: string;
  color: string | null;
  total_target: string | null;
  progress_unit: string | null;
};

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default function CommandBar({ onRecorded }: { onRecorded: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tagNames, setTagNames] = useState<string[]>([]);
  const [recentTags, setRecentTags] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    inputRef.current?.focus();
    fetch('/api/projects')
      .then((r) => r.json())
      .then((d) => setProjects(d.projects ?? []))
      .catch(() => {});
    fetch('/api/tags')
      .then((r) => r.json())
      .then((d) => setTagNames((d.tags ?? []).map((t: { name: string }) => t.name)))
      .catch(() => {});
    try {
      const saved = localStorage.getItem('recent-tags');
      if (saved) setRecentTags(JSON.parse(saved));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const findProject = (name: string) =>
    projects.find((p) => p.name.trim().toLowerCase() === name.trim().toLowerCase());

  // 只取配置了进度符号的项目，构建 name -> symbol 映射
  const progressMap: Record<string, string> = {};
  for (const p of projects) {
    if (p.progress_unit) progressMap[p.name] = p.progress_unit;
  }

  const progressNames = Object.keys(progressMap)
    .sort((a, b) => b.length - a.length)
    .map(escapeRegex);
  const progressSymbols = [...new Set(Object.values(progressMap))]
    .sort((a, b) => b.length - a.length)
    .map(escapeRegex);

  const progressRegex = progressNames.length
    ? new RegExp(`^(${progressNames.join('|')})\\s*(${progressSymbols.join('|')})(\\d+)$`, 'i')
    : null;
  const comboRegex = progressNames.length
    ? new RegExp(
        `^(${progressNames.join('|')})\\s*(${progressSymbols.join('|')})(\\d+)\\s+([\\d.]+)\\s*(h|小时)?$`,
        'i',
      )
    : null;
  const genericSymbolRegex = progressSymbols.length
    ? new RegExp(`^(.+?)(${progressSymbols.join('|')})(\\d+)$`, 'i')
    : null;
  const durationRegex = /^(.+?)\s*([\d.]+)\s*(h|小时)?$/i;

  async function patchProgress(project: Project, value: string) {
    await fetch('/api/projects', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: project.id, currentProgress: value }),
    });
  }

  async function postRecord(name: string, duration: number, note?: string, tags: string[] = []) {
    await fetch('/api/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectName: name, durationMinutes: duration, ...(note ? { note } : {}), tags }),
    });
  }

  function requireProject(name: string): Project | null {
    const p = findProject(name);
    if (!p) {
      setToast(`未找到项目「${name}」，请先在设置中创建`);
      return null;
    }
    return p;
  }

  function rememberTags(tags: string[]) {
    if (tags.length === 0) return;
    setRecentTags((prev) => {
      const next = [...tags, ...prev.filter((t) => !tags.includes(t))].slice(0, 3);
      try {
        localStorage.setItem('recent-tags', JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const raw = input.trim();
    if (!raw) return;

    // 提取标签并清理输入
    const extractedTags = [...new Set(raw.match(/#[^\s#]+/g) ?? [])];
    const cleanedInput = raw.replace(/#[^\s#]+/g, '').trim();

    // 标签验证：存在的标签保留，不存在的跳过并提示
    const validTags = extractedTags.filter((t) => tagNames.includes(t));
    const invalidTags = extractedTags.filter((t) => !tagNames.includes(t));

    const tagSuffix = () => {
      let s = '';
      if (validTags.length > 0) s += `，标签：${validTags.join(' ')}`;
      if (invalidTags.length > 0) s += `（⚠️ ${invalidTags.join(' ')} 尚未创建，已跳过）`;
      return s;
    };

    // 优先级 1：进度更新（带符号）"英语L5" / "英语 L5"
    const pm = progressRegex ? cleanedInput.match(progressRegex) : null;
    if (pm) {
      const name = pm[1].trim();
      const symbol = pm[2];
      const num = pm[3];
      const project = requireProject(name);
      if (!project) return;
      if (!project.total_target) {
        setToast('该项目未设置总目标，无法更新进度');
        return;
      }
      const value = `${symbol}${num}`;
      setBusy(true);
      try {
        await patchProgress(project, value);
        setToast(`✅ ${name} 进度已更新至 ${value}${tagSuffix()}`);
        setInput('');
        onRecorded();
      } catch {
        setToast('❌ 提交失败');
      } finally {
        setBusy(false);
      }
      return;
    }

    // 优先级 2：组合技（进度 + 时长）"英语L5 45"
    const cm = comboRegex ? cleanedInput.match(comboRegex) : null;
    if (cm) {
      const name = cm[1].trim();
      const symbol = cm[2];
      const num = cm[3];
      const durStr = cm[4];
      const unit = cm[5];
      const project = requireProject(name);
      if (!project) return;
      if (!project.total_target) {
        setToast('该项目未设置总目标，无法更新进度');
        return;
      }
      const duration = unit ? Math.round(parseFloat(durStr) * 60) : Math.round(parseFloat(durStr));
      const value = `${symbol}${num}`;
      setBusy(true);
      try {
        await patchProgress(project, value);
        await postRecord(name, duration, undefined, validTags);
        rememberTags(validTags);
        setToast(`✅ ${name} 进度已更新至 ${value}，并记录 ${duration}分钟${tagSuffix()}`);
        setInput('');
        onRecorded();
      } catch {
        setToast('❌ 提交失败');
      } finally {
        setBusy(false);
      }
      return;
    }

    // 优先级 3：时长记录（纯数字）"英语 30" / "德语 1.5h"
    const dm = cleanedInput.match(durationRegex);
    if (dm) {
      const name = dm[1].trim();
      const num = dm[2];
      const unit = dm[3];
      const project = findProject(name);
      if (!project) {
        const gm = genericSymbolRegex ? cleanedInput.match(genericSymbolRegex) : null;
        if (gm) {
          setToast(`未找到项目「${gm[1].trim()}」，请先在设置中创建`);
        } else {
          setToast(`未找到项目「${name}」，请先在设置中创建`);
        }
        return;
      }
      const duration = unit ? Math.round(parseFloat(num) * 60) : Math.round(parseFloat(num));
      setBusy(true);
      try {
        await postRecord(name, duration, undefined, validTags);
        rememberTags(validTags);
        setToast(`✅ 已记录 ${name} ${duration}分钟${tagSuffix()}`);
        setInput('');
        onRecorded();
      } catch {
        setToast('❌ 提交失败');
      } finally {
        setBusy(false);
      }
      return;
    }

    // 优先级 4：微习惯（纯文本）
    const project = requireProject(cleanedInput);
    if (!project) return;
    setBusy(true);
    try {
      await postRecord(cleanedInput, 15, undefined, validTags);
      rememberTags(validTags);
      setToast(`✅ 已记录 ${cleanedInput} 15分钟（微习惯）${tagSuffix()}`);
      setInput('');
      onRecorded();
    } catch {
      setToast('❌ 提交失败');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder='输入项目名 + 时长/进度 + #标签，如"吉他 30 #爱好"、"英语L5 #学习"'
          className="flex-1 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-base outline-none backdrop-blur placeholder:text-gray-400 focus:border-blue-500 dark:border-white/10 dark:bg-black/10"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-blue-500 px-5 py-3 font-medium text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
        >
          {busy ? '提交中…' : '提交'}
        </button>
      </form>

      {/* 快速标签：最近使用 3 个标签 */}
      {recentTags.length > 0 && (
        <div className="mt-2 flex items-center gap-2 overflow-x-auto">
          <span className="shrink-0 text-xs text-gray-400">📌</span>
          {recentTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setInput((prev) => (prev.trim() ? `${prev.trim()} ${tag}` : tag))}
              className="shrink-0 rounded-full bg-blue-500/20 px-3 py-1.5 text-xs text-blue-600 dark:text-blue-300"
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {toast && (
        <div className="fixed bottom-20 left-1/2 z-[60] -translate-x-1/2 rounded-lg bg-gray-900 px-3 py-2 text-sm text-white shadow-lg dark:bg-white dark:text-gray-900">
          {toast}
        </div>
      )}
    </div>
  );
}
