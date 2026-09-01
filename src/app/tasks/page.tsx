'use client';

import { useCallback, useEffect, useState } from 'react';
import MainLayout from '@/components/Layout/MainLayout';
import { todayStr } from '@/lib/dates';

type Project = { id: string; name: string; color: string | null };

type Task = {
  id: string;
  title: string;
  projectName: string | null;
  defaultDuration: number | null;
  dueDate: string | null;
  status: 'pending' | 'completed';
  repeatType: 'none' | 'daily' | 'weekly';
  repeatDays: number[] | null;
  parentTaskId: string | null;
  completedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

const WEEKDAYS = [
  { value: 1, label: '周一' },
  { value: 2, label: '周二' },
  { value: 3, label: '周三' },
  { value: 4, label: '周四' },
  { value: 5, label: '周五' },
  { value: 6, label: '周六' },
  { value: 0, label: '周日' },
];

const ALL_DAYS = WEEKDAYS.map((d) => d.value);

const inputCls =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800';

const emptyForm = {
  title: '',
  projectName: '',
  defaultDuration: '',
  dueDate: '',
  repeatType: 'none' as 'none' | 'daily' | 'weekly',
  repeatDays: ALL_DAYS as number[],
};

type FormState = typeof emptyForm;

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [today, setToday] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(true);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(emptyForm);
  const [completedOpen, setCompletedOpen] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [t, p] = await Promise.all([
        fetch('/api/tasks').then((r) => r.json()),
        fetch('/api/projects').then((r) => r.json()),
      ]);
      setTasks(t.tasks ?? []);
      setProjects(p.projects ?? []);
    } catch {
      setToast('❌ 加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setToday(todayStr());
    setForm((f) => (f.dueDate ? f : { ...f, dueDate: todayStr() }));
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const showToast = (msg: string) => setToast(msg);

  // ---- 新建任务 ----
  async function submitTask(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      showToast('❌ 请输入任务标题');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          project_name: form.projectName || null,
          default_duration: form.projectName ? form.defaultDuration : null,
          due_date: form.dueDate || null,
          repeat_type: form.repeatType,
          repeat_days: form.repeatType === 'weekly' ? form.repeatDays : null,
        }),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.error ?? '保存失败');
      setForm({ ...emptyForm, dueDate: today });
      showToast('✅ 任务已创建');
      refresh();
    } catch (err) {
      showToast(`❌ ${err instanceof Error ? err.message : '保存失败'}`);
    } finally {
      setSaving(false);
    }
  }

  // ---- 切换完成状态 ----
  async function toggleComplete(task: Task) {
    try {
      if (task.status === 'pending') {
        const res = await fetch('/api/tasks/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskId: task.id }),
        });
        const d = await res.json();
        if (!d.success) throw new Error(d.error ?? '操作失败');
        const parts = ['✅ 已完成'];
        if (d.recordCreated) parts.push('已生成打卡记录');
        if (d.nextTaskCreated) parts.push('已生成下一个重复任务');
        showToast(parts.join('，'));
      } else {
        const res = await fetch(`/api/tasks?id=${task.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'pending', completed_at: null }),
        });
        const d = await res.json();
        if (!d.success) throw new Error(d.error ?? '操作失败');
        showToast('↩️ 已标记为未完成');
      }
      refresh();
    } catch (err) {
      showToast(`❌ ${err instanceof Error ? err.message : '操作失败'}`);
    }
  }

  // ---- 删除任务 ----
  async function deleteTask(task: Task) {
    if (!window.confirm(`确定删除任务「${task.title}」吗？（不会删除任何打卡记录）`)) return;
    try {
      const res = await fetch(`/api/tasks?id=${task.id}`, { method: 'DELETE' });
      const d = await res.json();
      if (!d.success) throw new Error(d.error ?? '删除失败');
      showToast('🗑️ 已删除');
      refresh();
    } catch (err) {
      showToast(`❌ ${err instanceof Error ? err.message : '删除失败'}`);
    }
  }

  // ---- 编辑 ----
  function openEdit(task: Task) {
    setEditingId(task.id);
    setEditForm({
      title: task.title,
      projectName: task.projectName ?? '',
      defaultDuration: task.defaultDuration != null ? String(task.defaultDuration) : '',
      dueDate: task.dueDate ?? '',
      repeatType: task.repeatType ?? 'none',
      repeatDays: task.repeatDays && task.repeatDays.length > 0 ? task.repeatDays : ALL_DAYS,
    });
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    if (!editForm.title.trim()) {
      showToast('❌ 请输入任务标题');
      return;
    }
    try {
      const res = await fetch(`/api/tasks?id=${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editForm.title,
          project_name: editForm.projectName || null,
          default_duration: editForm.projectName ? editForm.defaultDuration : null,
          due_date: editForm.dueDate || null,
          repeat_type: editForm.repeatType,
          repeat_days: editForm.repeatType === 'weekly' ? editForm.repeatDays : null,
        }),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.error ?? '保存失败');
      setEditingId(null);
      showToast('✅ 已更新');
      refresh();
    } catch (err) {
      showToast(`❌ ${err instanceof Error ? err.message : '保存失败'}`);
    }
  }

  function toggleRepeatDay(target: 'form' | 'edit', day: number) {
    const set = target === 'form' ? setForm : setEditForm;
    set((f) => ({
      ...f,
      repeatDays: f.repeatDays.includes(day) ? f.repeatDays.filter((d) => d !== day) : [...f.repeatDays, day],
    }));
  }

  // ---- 分组 ----
  const pending = tasks.filter((t) => t.status === 'pending');
  const todayTasks = pending
    .filter((t) => t.dueDate === today)
    .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''));
  const overdueTasks = pending
    .filter((t) => t.dueDate && t.dueDate < today)
    .sort((a, b) => (b.dueDate ?? '').localeCompare(a.dueDate ?? ''));
  const backlogTasks = pending
    .filter((t) => !t.dueDate || t.dueDate > today)
    .sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    });
  const completedTasks = tasks
    .filter((t) => t.status === 'completed')
    .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))
    .slice(0, 10);

  const repeatLabel = (t: Task) => {
    if (t.repeatType === 'daily') return '🔄 每日';
    if (t.repeatType === 'weekly') {
      const days = t.repeatDays && t.repeatDays.length > 0 ? t.repeatDays : [];
      const labels = WEEKDAYS.filter((w) => days.includes(w.value)).map((w) => w.label.replace('周', ''));
      return days.length > 0 ? `🔄 每周${labels.join('')}` : '🔄 每周';
    }
    return null;
  };

  const renderCard = (task: Task, overdue: boolean) => {
    const project = projects.find((p) => p.name === task.projectName);
    const done = task.status === 'completed';
    return (
      <div
        key={task.id}
        className={`flex items-center gap-3 rounded-xl border bg-white/10 px-4 py-3 backdrop-blur dark:bg-black/10 ${
          overdue ? 'border-red-400/60 dark:border-red-500/50' : 'border-white/20 dark:border-white/10'
        }`}
      >
        {/* 状态圆圈 */}
        <button
          onClick={() => toggleComplete(task)}
          aria-label={done ? '标记为未完成' : '标记为完成'}
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
            done
              ? 'border-green-500 bg-green-500 text-white'
              : overdue
                ? 'border-red-400 hover:bg-red-400/20 dark:border-red-500'
                : 'border-gray-400 hover:bg-gray-400/20 dark:border-gray-500'
          }`}
        >
          {done ? '✓' : ''}
        </button>

        {/* 内容区（点击展开编辑） */}
        <button onClick={() => openEdit(task)} className="min-w-0 flex-1 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`font-semibold ${done ? 'text-gray-400 line-through dark:text-gray-500' : overdue ? 'text-red-600 dark:text-red-400' : ''}`}>
              {task.title}
            </span>
            {project && (
              <span
                className="inline-block rounded px-2 py-0.5 text-xs"
                style={{ backgroundColor: `${project.color ?? '#888888'}22`, color: project.color ?? '#888888' }}
              >
                {project.name}
              </span>
            )}
            {task.projectName && task.defaultDuration != null && (
              <span className="text-xs text-gray-500 dark:text-gray-400">{task.defaultDuration}min</span>
            )}
            {task.dueDate && (
              <span className="text-xs text-gray-500 dark:text-gray-400">📅 {task.dueDate}</span>
            )}
            {repeatLabel(task) && <span className="text-xs text-gray-500 dark:text-gray-400">{repeatLabel(task)}</span>}
          </div>
        </button>

        <button
          onClick={() => deleteTask(task)}
          aria-label="删除任务"
          className="shrink-0 text-sm text-gray-400 transition-colors hover:text-red-500 dark:text-gray-500"
        >
          🗑️
        </button>
      </div>
    );
  };

  return (
    <MainLayout>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">📋 任务清单</h1>
        <button
          onClick={() => setFormOpen((o) => !o)}
          className="rounded-lg bg-blue-500 px-3 py-1.5 text-sm text-white transition-colors hover:bg-blue-600"
        >
          {formOpen ? '收起表单' : '➕ 新建任务'}
        </button>
      </div>

      {toast && (
        <div className="mt-4 rounded-lg bg-blue-500/10 px-4 py-2 text-sm text-blue-600 dark:text-blue-300">{toast}</div>
      )}

      {loading && tasks.length === 0 && (
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">加载中…</p>
      )}

      {/* 新建任务表单 */}
      {formOpen && (
        <form onSubmit={submitTask} className="mt-6 rounded-xl border border-white/20 bg-white/10 p-5 backdrop-blur dark:border-white/10 dark:bg-black/10">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm text-gray-500 dark:text-gray-400">任务标题 *</label>
              <input
                className={inputCls}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="如：学习英语"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-gray-500 dark:text-gray-400">绑定项目</label>
              <select
                className={inputCls}
                value={form.projectName}
                onChange={(e) => setForm({ ...form, projectName: e.target.value })}
              >
                <option value="">不绑定项目（纯任务）</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {form.projectName && (
              <div>
                <label className="mb-1 block text-sm text-gray-500 dark:text-gray-400">默认时长（分钟）</label>
                <input
                  className={inputCls}
                  type="number"
                  value={form.defaultDuration}
                  onChange={(e) => setForm({ ...form, defaultDuration: e.target.value })}
                  placeholder="如 45"
                />
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm text-gray-500 dark:text-gray-400">截止日期</label>
              <input
                className={inputCls}
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-gray-500 dark:text-gray-400">重复设置</label>
              <select
                className={inputCls}
                value={form.repeatType}
                onChange={(e) => setForm({ ...form, repeatType: e.target.value as FormState['repeatType'] })}
              >
                <option value="none">不重复</option>
                <option value="daily">每天</option>
                <option value="weekly">每周</option>
              </select>
            </div>
          </div>

          {form.repeatType === 'weekly' && (
            <div className="mt-3 flex flex-wrap gap-2">
              {WEEKDAYS.map((w) => (
                <label key={w.value} className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    checked={form.repeatDays.includes(w.value)}
                    onChange={() => toggleRepeatDay('form', w.value)}
                    className="accent-blue-500"
                  />
                  {w.label}
                </label>
              ))}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="mt-4 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
          >
            {saving ? '保存中…' : '💾 保存任务'}
          </button>
        </form>
      )}

      {/* 今日任务 */}
      <section className="mt-6">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400">📌 今日任务（{todayTasks.length}）</h2>
        <div className="mt-2 space-y-2">
          {todayTasks.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">暂无今日任务</p>
          ) : (
            todayTasks.map((t) => renderCard(t, false))
          )}
        </div>
      </section>

      {/* 过期任务 */}
      <section className="mt-6">
        <h2 className="text-sm font-semibold text-red-500">⚠️ 过期任务（{overdueTasks.length}）</h2>
        <div className="mt-2 space-y-2">
          {overdueTasks.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">暂无过期任务</p>
          ) : (
            overdueTasks.map((t) => renderCard(t, true))
          )}
        </div>
      </section>

      {/* 待办池 */}
      <section className="mt-6">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400">🗂️ 待办池（{backlogTasks.length}）</h2>
        <div className="mt-2 space-y-2">
          {backlogTasks.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">暂无待办任务</p>
          ) : (
            backlogTasks.map((t) => renderCard(t, false))
          )}
        </div>
      </section>

      {/* 已完成（可折叠） */}
      <section className="mt-6">
        <button
          onClick={() => setCompletedOpen((o) => !o)}
          className="flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400"
        >
          <span>✅ 已完成（{completedTasks.length}）</span>
          <span className="text-xs">{completedOpen ? '▲' : '▼'}</span>
        </button>
        {completedOpen && (
          <div className="mt-2 space-y-2">
            {completedTasks.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">暂无已完成任务</p>
            ) : (
              completedTasks.map((t) => renderCard(t, false))
            )}
          </div>
        )}
      </section>

      {/* 编辑模态框 */}
      {editingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setEditingId(null)}>
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={saveEdit}
            className="w-full max-w-md rounded-xl border border-white/20 bg-white/95 p-5 backdrop-blur dark:bg-gray-900/95"
          >
            <h2 className="mb-4 font-semibold">✏️ 编辑任务</h2>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm text-gray-500 dark:text-gray-400">任务标题 *</label>
                <input
                  className={inputCls}
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-500 dark:text-gray-400">绑定项目</label>
                <select
                  className={inputCls}
                  value={editForm.projectName}
                  onChange={(e) => setEditForm({ ...editForm, projectName: e.target.value })}
                >
                  <option value="">不绑定项目（纯任务）</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              {editForm.projectName && (
                <div>
                  <label className="mb-1 block text-sm text-gray-500 dark:text-gray-400">默认时长（分钟）</label>
                  <input
                    className={inputCls}
                    type="number"
                    value={editForm.defaultDuration}
                    onChange={(e) => setEditForm({ ...editForm, defaultDuration: e.target.value })}
                    placeholder="如 45"
                  />
                </div>
              )}
              <div>
                <label className="mb-1 block text-sm text-gray-500 dark:text-gray-400">截止日期</label>
                <input
                  className={inputCls}
                  type="date"
                  value={editForm.dueDate}
                  onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-500 dark:text-gray-400">重复设置</label>
                <select
                  className={inputCls}
                  value={editForm.repeatType}
                  onChange={(e) => setEditForm({ ...editForm, repeatType: e.target.value as FormState['repeatType'] })}
                >
                  <option value="none">不重复</option>
                  <option value="daily">每天</option>
                  <option value="weekly">每周</option>
                </select>
              </div>
              {editForm.repeatType === 'weekly' && (
                <div className="flex flex-wrap gap-2">
                  {WEEKDAYS.map((w) => (
                    <label key={w.value} className="flex items-center gap-1 text-sm">
                      <input
                        type="checkbox"
                        checked={editForm.repeatDays.includes(w.value)}
                        onChange={() => toggleRepeatDay('edit', w.value)}
                        className="accent-blue-500"
                      />
                      {w.label}
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingId(null)}
                className="rounded-lg px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-200"
              >
                取消
              </button>
              <button type="submit" className="rounded-lg bg-blue-500 px-4 py-1.5 text-sm text-white hover:bg-blue-600">
                保存
              </button>
            </div>
          </form>
        </div>
      )}
    </MainLayout>
  );
}
