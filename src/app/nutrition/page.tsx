'use client';

import { useCallback, useEffect, useState } from 'react';
import MainLayout from '@/components/Layout/MainLayout';
import { todayStr } from '@/lib/dates';

type Recipe = {
  id: string;
  name: string;
  category: string | null;
  ingredients: string[] | null;
  steps: string[] | null;
  notes: string | null;
};

type MealLog = {
  id: string;
  date: string;
  mealType: string | null;
  recipeId: string | null;
  name: string | null;
  category: string | null;
  notes: string | null;
  createdAt: string | null;
};

const CATEGORIES = ['减脂餐', '增肌餐', '日常', '放纵餐', '加餐', '其他'];

const inputCls =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800';

const emptyRecipeForm = { name: '', category: '日常', ingredients: '', steps: '', notes: '' };

const categoryPill = (c: string | null) => {
  const color =
    c === '放纵餐' ? '#EF4444' : c === '减脂餐' ? '#10B981' : c === '增肌餐' ? '#8B5CF6' : c === '日常' ? '#4A8FE4' : '#F59E0B';
  return { color };
};

export default function NutritionPage() {
  const [today, setToday] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  // 随机推荐
  const [randomCat, setRandomCat] = useState('');
  const [randomRecipe, setRandomRecipe] = useState<Recipe | null>(null);
  const [randomBusy, setRandomBusy] = useState(false);
  const [pickKey, setPickKey] = useState(0);

  // 今日日记
  const [logs, setLogs] = useState<MealLog[] | null>(null);

  // 菜谱管理
  const [manageOpen, setManageOpen] = useState(false);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [recipeFormOpen, setRecipeFormOpen] = useState(false);
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);
  const [recipeForm, setRecipeForm] = useState(emptyRecipeForm);
  const [expandedRecipe, setExpandedRecipe] = useState<string | null>(null);
  const [recipeBusy, setRecipeBusy] = useState(false);

  // 快速录入
  const [quickName, setQuickName] = useState('');
  const [quickCat, setQuickCat] = useState('日常');
  const [quickNotes, setQuickNotes] = useState('');
  const [quickBusy, setQuickBusy] = useState(false);

  const showToast = (msg: string) => setToast(msg);

  const loadDiary = useCallback(async (date: string) => {
    try {
      const res = await fetch(`/api/meal-logs?date=${date}`);
      const d = await res.json();
      setLogs(d.logs ?? []);
    } catch {
      setLogs([]);
    }
  }, []);

  const loadRecipes = useCallback(async () => {
    try {
      const res = await fetch('/api/recipes');
      const d = await res.json();
      setRecipes(d.recipes ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const t = todayStr();
    setToday(t);
    loadDiary(t);
    loadRecipes();
  }, [loadDiary, loadRecipes]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  // ---- 随机推荐 ----
  async function pickRandom() {
    setRandomBusy(true);
    try {
      const q = randomCat ? `?category=${encodeURIComponent(randomCat)}` : '';
      const res = await fetch(`/api/recipes/random${q}`);
      const d = await res.json();
      if (!d.success) throw new Error(d.error ?? '获取失败');
      setRandomRecipe(d.recipe);
      setPickKey((k) => k + 1);
      if (!d.recipe) showToast('该分类下暂无菜谱，先去添加吧');
    } catch (err) {
      showToast(`❌ ${err instanceof Error ? err.message : '获取失败'}`);
    } finally {
      setRandomBusy(false);
    }
  }

  // ---- 确认吃了随机菜谱 ----
  async function confirmEat(recipe: Recipe) {
    setRandomBusy(true);
    try {
      const res = await fetch('/api/meal-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: today,
          recipe_id: recipe.id,
          custom_name: recipe.name,
          category: recipe.category ?? '日常',
        }),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.error ?? '记录失败');
      setRandomRecipe(null);
      showToast(`✅ 已记录：${recipe.name}`);
      loadDiary(today);
    } catch (err) {
      showToast(`❌ ${err instanceof Error ? err.message : '记录失败'}`);
    } finally {
      setRandomBusy(false);
    }
  }

  // ---- 快速录入 ----
  async function quickLog(e: React.FormEvent) {
    e.preventDefault();
    if (!quickName.trim()) {
      showToast('❌ 请输入吃了什么');
      return;
    }
    setQuickBusy(true);
    try {
      const res = await fetch('/api/meal-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: today,
          custom_name: quickName.trim(),
          category: quickCat,
          notes: quickNotes.trim() || null,
        }),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.error ?? '记录失败');
      setQuickName('');
      setQuickNotes('');
      showToast('✅ 已记入今日饮食');
      loadDiary(today);
    } catch (err) {
      showToast(`❌ ${err instanceof Error ? err.message : '记录失败'}`);
    } finally {
      setQuickBusy(false);
    }
  }

  async function deleteLog(log: MealLog) {
    if (!window.confirm(`删除饮食记录「${log.name ?? '未知'}」？（总览摘要同步保留或忽略，仅删除日记）`)) return;
    try {
      const res = await fetch(`/api/meal-logs/${log.id}`, { method: 'DELETE' });
      const d = await res.json();
      if (!d.success) throw new Error(d.error ?? '删除失败');
      showToast('🗑️ 已删除');
      loadDiary(today);
    } catch (err) {
      showToast(`❌ ${err instanceof Error ? err.message : '删除失败'}`);
    }
  }

  // ---- 菜谱管理 ----
  function openAddRecipe() {
    setEditingRecipeId(null);
    setRecipeForm(emptyRecipeForm);
    setRecipeFormOpen(true);
  }

  function openEditRecipe(r: Recipe) {
    setEditingRecipeId(r.id);
    setRecipeForm({
      name: r.name,
      category: r.category ?? '日常',
      ingredients: (r.ingredients ?? []).join('\n'),
      steps: (r.steps ?? []).join('\n'),
      notes: r.notes ?? '',
    });
    setRecipeFormOpen(true);
  }

  async function submitRecipe(e: React.FormEvent) {
    e.preventDefault();
    if (!recipeForm.name.trim()) {
      showToast('❌ 请输入菜谱名称');
      return;
    }
    setRecipeBusy(true);
    try {
      const body = {
        name: recipeForm.name.trim(),
        category: recipeForm.category,
        ingredients: recipeForm.ingredients,
        steps: recipeForm.steps,
        notes: recipeForm.notes.trim() || null,
      };
      const res = await fetch(
        editingRecipeId ? `/api/recipes/${editingRecipeId}` : '/api/recipes',
        {
          method: editingRecipeId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      );
      const d = await res.json();
      if (!d.success) throw new Error(d.error ?? '保存失败');
      setRecipeFormOpen(false);
      setEditingRecipeId(null);
      showToast('✅ 菜谱已保存');
      loadRecipes();
    } catch (err) {
      showToast(`❌ ${err instanceof Error ? err.message : '保存失败'}`);
    } finally {
      setRecipeBusy(false);
    }
  }

  async function deleteRecipe(r: Recipe) {
    if (!window.confirm(`确定删除菜谱「${r.name}」吗？`)) return;
    try {
      const res = await fetch(`/api/recipes/${r.id}`, { method: 'DELETE' });
      const d = await res.json();
      if (!d.success) throw new Error(d.error ?? '删除失败');
      showToast('🗑️ 已删除');
      if (expandedRecipe === r.id) setExpandedRecipe(null);
      loadRecipes();
    } catch (err) {
      showToast(`❌ ${err instanceof Error ? err.message : '删除失败'}`);
    }
  }

  const timeOf = (iso: string | null) => {
    if (!iso) return '';
    try {
      return new Date(iso).toTimeString().slice(0, 5);
    } catch {
      return '';
    }
  };

  const recipeView = (r: Recipe) => (
    <div key={r.id} className="rounded-xl border border-white/20 bg-white/10 p-4 backdrop-blur dark:border-white/10 dark:bg-black/10">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">{r.name}</span>
        {r.category && (
          <span
            className="rounded px-2 py-0.5 text-xs"
            style={{ backgroundColor: `${categoryPill(r.category).color}22`, color: categoryPill(r.category).color }}
          >
            {r.category}
          </span>
        )}
      </div>
      {(r.ingredients?.length || r.steps?.length) && (
        <button
          onClick={() => setExpandedRecipe(expandedRecipe === r.id ? null : r.id)}
          className="mt-1 text-xs text-blue-500 hover:underline"
        >
          {expandedRecipe === r.id ? '收起 ▼' : '查看配料与做法 ▼'}
        </button>
      )}
      {expandedRecipe === r.id && (
        <div className="mt-2 space-y-2 text-sm">
          {r.ingredients && r.ingredients.length > 0 && (
            <div>
              <p className="font-medium text-gray-500 dark:text-gray-400">🧂 配料</p>
              <ul className="mt-1 list-inside list-disc space-y-0.5 text-gray-700 dark:text-gray-300">
                {r.ingredients.map((ing, i) => (
                  <li key={i}>{ing}</li>
                ))}
              </ul>
            </div>
          )}
          {r.steps && r.steps.length > 0 && (
            <div>
              <p className="font-medium text-gray-500 dark:text-gray-400">👨‍🍳 做法</p>
              <ol className="mt-1 list-inside list-decimal space-y-0.5 text-gray-700 dark:text-gray-300">
                {r.steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            </div>
          )}
          {r.notes && <p className="text-gray-500 dark:text-gray-400">💡 {r.notes}</p>}
        </div>
      )}
      <div className="mt-2 flex gap-3 text-sm">
        <button onClick={() => openEditRecipe(r)} className="text-blue-500 hover:underline">✏️ 编辑</button>
        <button onClick={() => deleteRecipe(r)} className="text-red-500 hover:underline">🗑️ 删除</button>
      </div>
    </div>
  );

  return (
    <MainLayout>
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .slide-up { animation: slideUp 0.35s ease-out; }
      `}</style>

      <h1 className="text-2xl font-bold">🥗 饮食管理</h1>

      {toast && (
        <div className="mt-4 rounded-lg bg-blue-500/10 px-4 py-2 text-sm text-blue-600 dark:text-blue-300">{toast}</div>
      )}

      {/* 顶部：随机推荐 */}
      <section className="mt-6 rounded-xl border border-white/20 bg-white/10 p-5 backdrop-blur dark:border-white/10 dark:bg-black/10">
        <h2 className="font-semibold">🎲 今天吃什么？</h2>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <select
            className={inputCls + ' w-auto'}
            value={randomCat}
            onChange={(e) => setRandomCat(e.target.value)}
          >
            <option value="">全部分类</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button
            onClick={pickRandom}
            disabled={randomBusy}
            className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
          >
            {randomBusy ? '抽选中…' : '🎲 随机一道菜'}
          </button>
        </div>

        {randomRecipe && (
          <div key={pickKey} className="slide-up mt-4 rounded-xl border border-white/20 bg-white/10 p-4 backdrop-blur dark:border-white/10 dark:bg-black/10">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-lg font-bold">{randomRecipe.name}</span>
              {randomRecipe.category && (
                <span
                  className="rounded px-2 py-0.5 text-xs"
                  style={{ backgroundColor: `${categoryPill(randomRecipe.category).color}22`, color: categoryPill(randomRecipe.category).color }}
                >
                  {randomRecipe.category}
                </span>
              )}
            </div>
            {randomRecipe.ingredients && randomRecipe.ingredients.length > 0 && (
              <div className="mt-3 text-sm">
                <p className="font-medium text-gray-500 dark:text-gray-400">🧂 配料</p>
                <ul className="mt-1 list-inside list-disc space-y-0.5 text-gray-700 dark:text-gray-300">
                  {randomRecipe.ingredients.map((ing, i) => (
                    <li key={i}>{ing}</li>
                  ))}
                </ul>
              </div>
            )}
            {randomRecipe.steps && randomRecipe.steps.length > 0 && (
              <div className="mt-2 text-sm">
                <p className="font-medium text-gray-500 dark:text-gray-400">👨‍🍳 做法</p>
                <ol className="mt-1 list-inside list-decimal space-y-0.5 text-gray-700 dark:text-gray-300">
                  {randomRecipe.steps.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ol>
              </div>
            )}
            {randomRecipe.notes && (
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">💡 {randomRecipe.notes}</p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => confirmEat(randomRecipe)}
                disabled={randomBusy}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
              >
                🍽️ 确认·今天吃这个
              </button>
              <button
                onClick={pickRandom}
                disabled={randomBusy}
                className="rounded-lg border border-white/20 px-4 py-2 text-sm text-gray-500 transition-colors hover:bg-white/10 dark:text-gray-400"
              >
                🔀 换一道
              </button>
            </div>
          </div>
        )}
      </section>

      {/* 今日饮食日记 */}
      <section className="mt-6">
        <h2 className="font-semibold">📒 今日饮食日记（{today}）</h2>
        <div className="mt-3 space-y-2">
          {logs === null ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">加载中…</p>
          ) : logs.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">今天还没有记录，试试随机推荐或快速录入吧</p>
          ) : (
            logs.map((l) => (
              <div
                key={l.id}
                className="flex items-center gap-3 rounded-xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur dark:border-white/10 dark:bg-black/10"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{l.name ?? '未知'}</span>
                    {l.category && (
                      <span
                        className="rounded px-2 py-0.5 text-xs"
                        style={{ backgroundColor: `${categoryPill(l.category).color}22`, color: categoryPill(l.category).color }}
                      >
                        {l.category}
                      </span>
                    )}
                    <span className="text-xs text-gray-400 dark:text-gray-500">🕐 {timeOf(l.createdAt)}</span>
                  </div>
                  {l.notes && <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">📝 {l.notes}</p>}
                </div>
                <button onClick={() => deleteLog(l)} className="shrink-0 text-sm text-gray-400 hover:text-red-500 dark:text-gray-500">
                  🗑️
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      {/* 菜谱管理 */}
      <section className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">📚 菜谱管理（{recipes.length}）</h2>
          <div className="flex gap-2">
            {manageOpen && (
              <button
                onClick={recipeFormOpen ? () => { setRecipeFormOpen(false); setEditingRecipeId(null); } : openAddRecipe}
                className="rounded-lg bg-blue-500 px-3 py-1.5 text-sm text-white transition-colors hover:bg-blue-600"
              >
                {recipeFormOpen ? '取消' : '➕ 新增菜谱'}
              </button>
            )}
            <button
              onClick={() => setManageOpen((o) => !o)}
              className="rounded-lg border border-white/20 px-3 py-1.5 text-sm text-gray-500 transition-colors hover:bg-white/10 dark:text-gray-400"
            >
              {manageOpen ? '收起 ▲' : '展开 ▼'}
            </button>
          </div>
        </div>

        {manageOpen && (
          <div className="mt-3 space-y-4">
            {recipeFormOpen && (
              <form onSubmit={submitRecipe} className="rounded-xl border border-white/20 bg-white/10 p-4 backdrop-blur dark:border-white/10 dark:bg-black/10">
                <p className="mb-3 text-sm font-semibold">{editingRecipeId ? '✏️ 编辑菜谱' : '➕ 新增菜谱'}</p>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm text-gray-500 dark:text-gray-400">名称 *</label>
                    <input
                      className={inputCls}
                      value={recipeForm.name}
                      onChange={(e) => setRecipeForm({ ...recipeForm, name: e.target.value })}
                      placeholder="如：鸡胸沙拉"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-gray-500 dark:text-gray-400">分类</label>
                    <select
                      className={inputCls}
                      value={recipeForm.category}
                      onChange={(e) => setRecipeForm({ ...recipeForm, category: e.target.value })}
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-gray-500 dark:text-gray-400">配料（每行一种）</label>
                    <textarea
                      className={inputCls}
                      rows={3}
                      value={recipeForm.ingredients}
                      onChange={(e) => setRecipeForm({ ...recipeForm, ingredients: e.target.value })}
                      placeholder={'鸡胸肉 200g\n生菜 半颗\n橄榄油 1勺'}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-gray-500 dark:text-gray-400">做法（每行一步）</label>
                    <textarea
                      className={inputCls}
                      rows={3}
                      value={recipeForm.steps}
                      onChange={(e) => setRecipeForm({ ...recipeForm, steps: e.target.value })}
                      placeholder={'鸡胸肉煎熟\n与生菜拌匀'}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm text-gray-500 dark:text-gray-400">备注（可选）</label>
                    <input
                      className={inputCls}
                      value={recipeForm.notes}
                      onChange={(e) => setRecipeForm({ ...recipeForm, notes: e.target.value })}
                      placeholder="如：蛋白质约 40g"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={recipeBusy}
                  className="mt-3 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
                >
                  {recipeBusy ? '保存中…' : '💾 保存菜谱'}
                </button>
              </form>
            )}
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {recipes.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">暂无菜谱，点击「➕ 新增菜谱」添加</p>
              ) : (
                recipes.map((r) => recipeView(r))
              )}
            </div>
          </div>
        )}
      </section>

      {/* 快速录入 */}
      <section className="mt-6 rounded-xl border border-white/20 bg-white/10 p-5 backdrop-blur dark:border-white/10 dark:bg-black/10">
        <h2 className="font-semibold">⚡ 快速录入</h2>
        <form onSubmit={quickLog} className="mt-3 flex flex-wrap items-end gap-3">
          <div className="min-w-[12rem] flex-1">
            <label className="mb-1 block text-sm text-gray-500 dark:text-gray-400">今天吃了什么？</label>
            <input
              className={inputCls}
              value={quickName}
              onChange={(e) => setQuickName(e.target.value)}
              placeholder="如：中午吃了炒饭"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-500 dark:text-gray-400">分类</label>
            <select className={inputCls + ' w-36'} value={quickCat} onChange={(e) => setQuickCat(e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[10rem] flex-1">
            <label className="mb-1 block text-sm text-gray-500 dark:text-gray-400">备注（可选）</label>
            <input
              className={inputCls}
              value={quickNotes}
              onChange={(e) => setQuickNotes(e.target.value)}
              placeholder="如：食堂 / 外卖"
            />
          </div>
          <button
            type="submit"
            disabled={quickBusy}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
          >
            {quickBusy ? '保存中…' : '✅ 记录'}
          </button>
        </form>
      </section>
    </MainLayout>
  );
}
