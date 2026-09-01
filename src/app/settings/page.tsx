'use client';

import { useCallback, useEffect, useState } from 'react';
import MainLayout from '@/components/Layout/MainLayout';

type Project = {
  id: string;
  name: string;
  color: string | null;
  progress_unit: string | null;
  total_target: string | null;
  current_progress: string | null;
  daily_goal_minutes: number | null;
};

type Tag = { id: string; name: string };
type View = { id: string; name: string; tagFilters: string[] };

const PALETTE = ['#E8795C', '#4A9E6E', '#4A8FE4', '#C084FC', '#F59E0B', '#EF4444', '#10B981', '#8B5CF6', '#EC4899', '#14B8A6'];
const randomColor = () => PALETTE[Math.floor(Math.random() * PALETTE.length)];

const inputCls =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800';

const emptyForm = { name: '', color: '#4A8FE4', progress_unit: '', total_target: '', daily_goal_minutes: '' };

export default function SettingsPage() {
  // ---- 项目管理 ----
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [pmMsg, setPmMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // ---- 标签管理 ----
  const [tags, setTags] = useState<Tag[]>([]);
  const [newTag, setNewTag] = useState('');
  const [tagMsg, setTagMsg] = useState<string | null>(null);

  // ---- 智能视图 ----
  const [views, setViews] = useState<View[]>([]);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editingViewId, setEditingViewId] = useState<string | null>(null);
  const [viewForm, setViewForm] = useState<{ name: string; tagFilters: string[] }>({ name: '', tagFilters: [] });
  const [viewMsg, setViewMsg] = useState<string | null>(null);
  const [viewSaving, setViewSaving] = useState(false);

  // ---- AI 配置 ----
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [hasKey, setHasKey] = useState(false);
  const [aiKeyMsg, setAiKeyMsg] = useState<string | null>(null);
  const [aiKeyBusy, setAiKeyBusy] = useState(false);

  // ---- 重置数据 ----
  const [resetMsg, setResetMsg] = useState<string | null>(null);
  const [resetBusy, setResetBusy] = useState(false);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/projects');
      const d = await res.json();
      if (d.success) setProjects(d.projects ?? []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  const loadTags = useCallback(async () => {
    try {
      const res = await fetch('/api/tags');
      const d = await res.json();
      if (d.success) setTags(d.tags ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  const loadViews = useCallback(async () => {
    try {
      const res = await fetch('/api/smart-views');
      const d = await res.json();
      if (d.success) setViews(d.views ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadProjects();
    loadTags();
    loadViews();
    fetch('/api/settings/ai-key')
      .then((r) => r.json())
      .then((d) => setHasKey(!!d.hasKey))
      .catch(() => {});
  }, [loadTags, loadViews]);

  // ===== 项目管理 =====
  function openAdd() {
    setEditingId(null);
    setForm({ ...emptyForm, color: randomColor() });
    setPmMsg(null);
    setModalOpen(true);
  }

  function openEdit(p: Project) {
    setEditingId(p.id);
    setForm({
      name: p.name,
      color: p.color ?? '#4A8FE4',
      progress_unit: p.progress_unit ?? '',
      total_target: p.total_target ?? '',
      daily_goal_minutes: p.daily_goal_minutes != null ? String(p.daily_goal_minutes) : '',
    });
    setPmMsg(null);
    setModalOpen(true);
  }

  async function saveProject(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setPmMsg('❌ 项目名称不能为空');
      return;
    }
    setSaving(true);
    setPmMsg(null);
    try {
      const body = {
        name: form.name.trim(),
        color: form.color,
        progress_unit: form.progress_unit.trim() || null,
        total_target: form.total_target.trim() || null,
        daily_goal_minutes: form.daily_goal_minutes.trim() || null,
      };
      const res = await fetch(editingId ? `/api/projects?id=${editingId}` : '/api/projects', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (!d.success) {
        setPmMsg(`❌ ${d.error ?? '保存失败'}`);
      } else {
        setModalOpen(false);
        await loadProjects();
      }
    } catch {
      setPmMsg('❌ 保存失败');
    } finally {
      setSaving(false);
    }
  }

  async function deleteProject(p: Project) {
    if (!window.confirm(`确定要删除项目「${p.name}」吗？历史打卡记录将保留，但项目将从列表中移除。`)) return;
    try {
      await fetch(`/api/projects?id=${p.id}`, { method: 'DELETE' });
      await loadProjects();
    } catch {
      setPmMsg('❌ 删除失败');
    }
  }

  // ===== 标签管理 =====
  async function addTag(e: React.FormEvent) {
    e.preventDefault();
    const n = newTag.trim();
    if (!n) return;
    setTagMsg(null);
    try {
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: n }),
      });
      const d = await res.json();
      if (d.success) {
        setNewTag('');
        await loadTags();
      } else {
        setTagMsg(`❌ ${d.error ?? '添加失败'}`);
      }
    } catch {
      setTagMsg('❌ 添加失败');
    }
  }

  async function deleteTag(tag: Tag) {
    try {
      await fetch(`/api/tags?id=${tag.id}`, { method: 'DELETE' });
      await loadTags();
    } catch {
      setTagMsg('❌ 删除失败');
    }
  }

  // ===== 智能视图 =====
  function openAddView() {
    setEditingViewId(null);
    setViewForm({ name: '', tagFilters: [] });
    setViewMsg(null);
    setViewModalOpen(true);
  }

  function openEditView(v: View) {
    setEditingViewId(v.id);
    setViewForm({ name: v.name, tagFilters: [...v.tagFilters] });
    setViewMsg(null);
    setViewModalOpen(true);
  }

  function toggleViewTag(tagName: string) {
    setViewForm((prev) => {
      const has = prev.tagFilters.includes(tagName);
      return {
        ...prev,
        tagFilters: has ? prev.tagFilters.filter((t) => t !== tagName) : [...prev.tagFilters, tagName],
      };
    });
  }

  async function saveView(e: React.FormEvent) {
    e.preventDefault();
    if (!viewForm.name.trim()) {
      setViewMsg('❌ 视图名称不能为空');
      return;
    }
    setViewSaving(true);
    setViewMsg(null);
    try {
      const res = await fetch(editingViewId ? `/api/smart-views?id=${editingViewId}` : '/api/smart-views', {
        method: editingViewId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: viewForm.name.trim(), tagFilters: viewForm.tagFilters }),
      });
      const d = await res.json();
      if (!d.success) {
        setViewMsg(`❌ ${d.error ?? '保存失败'}`);
      } else {
        setViewModalOpen(false);
        window.dispatchEvent(new Event('smart-views-updated'));
        await loadViews();
      }
    } catch {
      setViewMsg('❌ 保存失败');
    } finally {
      setViewSaving(false);
    }
  }

  async function deleteView(v: View) {
    if (!window.confirm(`确定要删除视图「${v.name}」吗？`)) return;
    try {
      await fetch(`/api/smart-views?id=${v.id}`, { method: 'DELETE' });
      window.dispatchEvent(new Event('smart-views-updated'));
      await loadViews();
    } catch {
      setViewMsg('❌ 删除失败');
    }
  }

  // ===== AI 配置 =====
  async function saveApiKey(e: React.FormEvent) {
    e.preventDefault();
    const k = apiKey.trim();
    if (!k) return;
    setAiKeyBusy(true);
    setAiKeyMsg(null);
    try {
      const res = await fetch('/api/settings/ai-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: k }),
      });
      const d = await res.json();
      if (d.success) {
        setApiKey('');
        setHasKey(true);
        setAiKeyMsg('✅ 已保存 DeepSeek API Key');
      } else {
        setAiKeyMsg(`❌ ${d.error ?? '保存失败'}`);
      }
    } catch {
      setAiKeyMsg('❌ 保存失败');
    } finally {
      setAiKeyBusy(false);
    }
  }

  // ===== 重置数据 =====
  async function handleReset() {
    if (!window.confirm('确定要清空所有数据吗？此操作不可撤销！')) return;
    const input = window.prompt('此操作不可恢复。请输入"确认清空"以继续：');
    if (input !== '确认清空') {
      setResetMsg('❌ 输入不匹配，未清空');
      return;
    }
    setResetBusy(true);
    setResetMsg(null);
    try {
      const res = await fetch('/api/reset', { method: 'DELETE' });
      const d = await res.json();
      if (d.success) {
        setResetMsg('✅ 所有数据已清空');
        setTimeout(() => window.location.reload(), 1200);
      } else {
        setResetMsg(`❌ ${d.error ?? '清空失败'}`);
      }
    } catch {
      setResetMsg('❌ 清空失败');
    } finally {
      setResetBusy(false);
    }
  }

  return (
    <MainLayout>
      <h1 className="text-2xl font-bold">⚙️ 设置页</h1>

      {/* 项目管理 */}
      <div className="mt-6 rounded-xl border border-white/20 bg-white/10 p-5 backdrop-blur dark:border-white/10 dark:bg-black/10">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">📁 项目管理</h2>
          <button onClick={openAdd} className="rounded-lg bg-blue-500 px-3 py-1.5 text-sm text-white transition-colors hover:bg-blue-600">
            ➕ 新增项目
          </button>
        </div>
        {pmMsg && <p className="mt-3 text-sm">{pmMsg}</p>}
        {loading ? (
          <p className="mt-3 text-gray-500">加载中…</p>
        ) : projects.length === 0 ? (
          <p className="mt-3 text-gray-500">暂无项目</p>
        ) : (
          <div className="mt-4 space-y-2">
            {projects.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/5 px-4 py-3 dark:bg-black/5">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="inline-block h-4 w-4 shrink-0 rounded-full" style={{ backgroundColor: p.color ?? '#888888' }} />
                  <span className="font-medium">{p.name}</span>
                  {p.progress_unit && (
                    <span className="inline-block rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">{p.progress_unit}</span>
                  )}
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {p.total_target ? `目标 ${p.total_target}` : '无目标'}
                    {p.daily_goal_minutes != null ? ` · 每日 ${p.daily_goal_minutes}min` : ''}
                  </span>
                </div>
                <div className="flex shrink-0 gap-2 text-sm">
                  <button onClick={() => openEdit(p)} className="text-blue-500 hover:underline">✏️ 编辑</button>
                  <button onClick={() => deleteProject(p)} className="text-red-500 hover:underline">🗑️ 删除</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 标签管理 */}
      <div className="mt-4 rounded-xl border border-white/20 bg-white/10 p-5 backdrop-blur dark:border-white/10 dark:bg-black/10">
        <h2 className="font-semibold">🏷️ 标签管理</h2>
        {tagMsg && <p className="mt-2 text-sm">{tagMsg}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          {tags.length === 0 ? (
            <p className="text-sm text-gray-500">暂无标签</p>
          ) : (
            tags.map((tag) => (
              <span key={tag.id} className="inline-flex items-center gap-1 rounded-full bg-blue-500/20 px-3 py-1 text-sm text-blue-600 dark:text-blue-300">
                {tag.name}
                <button onClick={() => deleteTag(tag)} className="opacity-60 hover:opacity-100">×</button>
              </span>
            ))
          )}
        </div>
        <form onSubmit={addTag} className="mt-3 flex gap-2">
          <input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="新标签，如 #编程"
            className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
          />
          <button type="submit" className="rounded-lg bg-blue-500 px-4 py-2 text-sm text-white hover:bg-blue-600">添加</button>
        </form>
      </div>

      {/* 智能视图 */}
      <div className="mt-4 rounded-xl border border-white/20 bg-white/10 p-5 backdrop-blur dark:border-white/10 dark:bg-black/10">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">🔍 智能视图</h2>
          <button onClick={openAddView} className="rounded-lg bg-blue-500 px-3 py-1.5 text-sm text-white transition-colors hover:bg-blue-600">
            ➕ 新增视图
          </button>
        </div>
        {viewMsg && <p className="mt-3 text-sm">{viewMsg}</p>}
        {views.length === 0 ? (
          <p className="mt-3 text-gray-500">暂无视图</p>
        ) : (
          <div className="mt-4 space-y-2">
            {views.map((v) => (
              <div key={v.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/5 px-4 py-3 dark:bg-black/5">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="font-medium">{v.name}</span>
                  <span className="flex flex-wrap gap-1">
                    {v.tagFilters.map((t) => (
                      <span key={t} className="inline-block rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">{t}</span>
                    ))}
                  </span>
                </div>
                <div className="flex shrink-0 gap-2 text-sm">
                  <button onClick={() => openEditView(v)} className="text-blue-500 hover:underline">✏️ 编辑</button>
                  <button onClick={() => deleteView(v)} className="text-red-500 hover:underline">🗑️ 删除</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI 配置 */}
      <div className="mt-4 rounded-xl border border-white/20 bg-white/10 p-5 backdrop-blur dark:border-white/10 dark:bg-black/10">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">🤖 AI 配置</h2>
          <span className={`text-xs ${hasKey ? 'text-green-500' : 'text-gray-400'}`}>
            {hasKey ? '● 已配置' : '○ 未配置'}
          </span>
        </div>
        <form onSubmit={saveApiKey} className="mt-3">
          <div className="flex gap-2">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="DeepSeek API Key"
              className="flex-1 rounded-lg border border-white/20 bg-white/10 px-3 py-2 outline-none focus:border-blue-500 dark:border-white/10 dark:bg-black/10"
            />
            <button type="button" onClick={() => setShowKey((s) => !s)} className="rounded-lg bg-white/10 px-3 py-2 text-sm hover:bg-white/20 dark:bg-black/10 dark:hover:bg-white/10">
              {showKey ? '🙈' : '👁️'}
            </button>
            <button type="submit" disabled={aiKeyBusy} className="rounded-lg bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600 disabled:opacity-50">
              {aiKeyBusy ? '保存中…' : '保存'}
            </button>
          </div>
          {aiKeyMsg && <p className="mt-3 text-sm">{aiKeyMsg}</p>}
        </form>
      </div>

      {/* 重置数据 */}
      <div className="mt-4 rounded-xl border border-red-500/30 bg-red-50/10 p-5 backdrop-blur dark:bg-red-900/10">
        <h2 className="font-semibold text-red-600 dark:text-red-400">🗑️ 清空所有数据</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          将清空所有打卡记录、健身数据、AI历史、番茄记录。项目和标签配置将保留。
        </p>
        <button
          onClick={handleReset}
          disabled={resetBusy}
          className="mt-4 rounded-lg bg-red-500 px-4 py-2 text-white transition-colors hover:bg-red-600 disabled:opacity-50"
        >
          {resetBusy ? '清空中…' : '清空所有数据'}
        </button>
        {resetMsg && <p className="mt-3 text-sm">{resetMsg}</p>}
      </div>

      {/* 项目模态框 */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4" onClick={() => setModalOpen(false)}>
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-white/20 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-gray-900" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">{editingId ? '编辑项目' : '新增项目'}</h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">✕</button>
            </div>
            <form onSubmit={saveProject} className="space-y-4">
              <label className="block">
                <span className="mb-1 block text-sm text-gray-600 dark:text-gray-400">项目名称 *</span>
                <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="如 法语" />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-gray-600 dark:text-gray-400">颜色</span>
                <input type="color" className="h-10 w-16 cursor-pointer rounded border border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-gray-600 dark:text-gray-400">进度符号</span>
                <input className={inputCls} value={form.progress_unit} onChange={(e) => setForm({ ...form, progress_unit: e.target.value })} placeholder="如 L、Ch、首" />
                <span className="mt-1 block text-xs text-gray-400">用于命令栏识别进度更新，如输入 &quot;英语L5&quot;。留空则不支持进度更新。</span>
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-gray-600 dark:text-gray-400">总目标</span>
                <input className={inputCls} value={form.total_target} onChange={(e) => setForm({ ...form, total_target: e.target.value })} placeholder="如 144课、30首" />
                <span className="mt-1 block text-xs text-gray-400">留空则不显示进度条。</span>
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-gray-600 dark:text-gray-400">每日目标时长（分钟）</span>
                <input className={inputCls} type="number" min="0" value={form.daily_goal_minutes} onChange={(e) => setForm({ ...form, daily_goal_minutes: e.target.value })} placeholder="如 30" />
              </label>
              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={saving} className="flex-1 rounded-lg bg-blue-500 py-2 font-medium text-white transition-colors hover:bg-blue-600 disabled:opacity-50">
                  {saving ? '保存中…' : '保存'}
                </button>
                <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg px-4 py-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">取消</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 智能视图模态框 */}
      {viewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4" onClick={() => setViewModalOpen(false)}>
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-white/20 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-gray-900" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">{editingViewId ? '编辑视图' : '新增视图'}</h3>
              <button onClick={() => setViewModalOpen(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">✕</button>
            </div>
            <form onSubmit={saveView} className="space-y-4">
              <label className="block">
                <span className="mb-1 block text-sm text-gray-600 dark:text-gray-400">视图名称 *</span>
                <input className={inputCls} value={viewForm.name} onChange={(e) => setViewForm({ ...viewForm, name: e.target.value })} placeholder="如 编程、副业" />
              </label>
              <div>
                <span className="mb-1 block text-sm text-gray-600 dark:text-gray-400">过滤标签</span>
                {tags.length === 0 ? (
                  <p className="text-sm text-gray-400">暂无标签，请先在「标签管理」中添加。</p>
                ) : (
                  <div className="space-y-1 rounded-lg border border-gray-300 p-3 dark:border-gray-600">
                    {tags.map((tag) => (
                      <label key={tag.id} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={viewForm.tagFilters.includes(tag.name)} onChange={() => toggleViewTag(tag.name)} className="h-4 w-4" />
                        {tag.name}
                      </label>
                    ))}
                  </div>
                )}
                <span className="mt-1 block text-xs text-gray-400">选择该视图要包含的标签，记录需同时包含所有选中标签才会显示。</span>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={viewSaving} className="flex-1 rounded-lg bg-blue-500 py-2 font-medium text-white transition-colors hover:bg-blue-600 disabled:opacity-50">
                  {viewSaving ? '保存中…' : '保存'}
                </button>
                <button type="button" onClick={() => setViewModalOpen(false)} className="rounded-lg px-4 py-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">取消</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
