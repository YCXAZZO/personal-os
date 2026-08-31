'use client';

import { useCallback, useEffect, useState } from 'react';
import MainLayout from '@/components/Layout/MainLayout';
import FatigueRatioCard from '@/components/Fitness/FatigueRatioCard';
import BodyFatTrendChart from '@/components/Fitness/BodyFatTrendChart';
import WeeklyVolumeChart from '@/components/Fitness/WeeklyVolumeChart';

type MorningData = {
  date: string;
  weightKg: number | null;
  bfScalePct: number | null;
  waistCm: number | null;
  visceralFatScore: number | null;
  morningHrRest: number | null;
  orthostaticSymptom: number | null;
  sleepQuality: number | null;
  muscleSorenessGlobal: number | null;
  morningErectionLengthCm: number | null;
  morningErectionDiameterCm: number | null;
};

type Training = {
  id: string;
  exerciseName: string;
  sessionType: string | null;
  totalDurationMin: number | null;
  sets: number | null;
  reps: number | null;
  loadKg: number | null;
  volumeLoad: number | null;
  rpeLastSet: number | null;
  rpeTrapRhomboid: number | null;
  isBodyweight: boolean | null;
};

type CardioData = {
  cardioType: string | null;
  durationMin: number | null;
  avgHr: number | null;
  peakHr: number | null;
  hrZonePrimary: string | null;
  distanceKm: number | null;
  perceivedSweat: number | null;
};

type WaterRecord = { id: string; time: string; amountMl: number };

type ExercisePreset = {
  id: string;
  name: string;
  bodyPart: string | null;
  sets: number | null;
  reps: number | null;
  loadKg: number | null;
  isBodyweight: boolean | null;
};

type CardioPreset = {
  id: string;
  cardioType: string;
  durationMin: number | null;
  hrZonePrimary: string | null;
};

type FitnessStats = {
  fatigueRatio: number | null;
  fatigueStatus: 'ok' | 'warning' | 'danger';
  bodyFatTrend: { date: string; value: number }[];
  weeklyVolume: { date: string; value: number }[];
  weeklyCardio: { date: string; value: number }[];
};

const inputCls =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800';

function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function shiftDate(dateStr: string, delta: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + delta);
  return localDateStr(d);
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/20 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-500 transition-colors hover:text-gray-700 dark:hover:text-gray-300"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-gray-600 dark:text-gray-400">{label}</span>
      {children}
    </label>
  );
}

const emptyMorning = {
  weightKg: '',
  bfScalePct: '',
  waistCm: '',
  visceralFatScore: '',
  morningHrRest: '',
  orthostaticSymptom: '',
  sleepQuality: '',
  muscleSorenessGlobal: '',
  morningErectionLengthCm: '',
  morningErectionDiameterCm: '',
};

const emptyTraining = {
  exerciseName: '',
  sessionType: '',
  totalDurationMin: '',
  sets: '',
  reps: '',
  loadKg: '',
  rpeLastSet: '',
  rpeTrapRhomboid: '',
  isBodyweight: false,
};

const emptyCardio = {
  cardioType: '',
  durationMin: '',
  avgHr: '',
  peakHr: '',
  hrZonePrimary: '',
  distanceKm: '',
  perceivedSweat: '',
};

const emptyExercisePreset = {
  id: null as string | null,
  name: '',
  bodyPart: '推',
  sets: '',
  reps: '',
  loadKg: '',
  isBodyweight: false,
};

const emptyCardioPreset = {
  id: null as string | null,
  cardioType: '',
  durationMin: '',
  hrZonePrimary: '有氧耐力',
};

export default function FitnessPage() {
  const [selectedDate, setSelectedDate] = useState(localDateStr(new Date()));
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const [morning, setMorning] = useState<MorningData | null>(null);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [cardio, setCardio] = useState<CardioData | null>(null);
  const [water, setWater] = useState<WaterRecord[]>([]);
  const [isCarbCut, setIsCarbCut] = useState(false);
  const [exercisePresets, setExercisePresets] = useState<ExercisePreset[]>([]);
  const [cardioPresets, setCardioPresets] = useState<CardioPreset[]>([]);

  const [morningOpen, setMorningOpen] = useState(false);
  const [trainingOpen, setTrainingOpen] = useState(false);
  const [cardioOpen, setCardioOpen] = useState(false);
  const [exercisePresetOpen, setExercisePresetOpen] = useState(false);
  const [cardioPresetOpen, setCardioPresetOpen] = useState(false);
  const [showExerciseForm, setShowExerciseForm] = useState(false);
  const [showCardioForm, setShowCardioForm] = useState(false);
  const [waterAmount, setWaterAmount] = useState('');

  const [morningForm, setMorningForm] = useState(emptyMorning);
  const [trainingForm, setTrainingForm] = useState(emptyTraining);
  const [cardioForm, setCardioForm] = useState(emptyCardio);
  const [exercisePresetForm, setExercisePresetForm] = useState(emptyExercisePreset);
  const [cardioPresetForm, setCardioPresetForm] = useState(emptyCardioPreset);
  const [selectedExercisePreset, setSelectedExercisePreset] = useState('');
  const [selectedCardioPreset, setSelectedCardioPreset] = useState('');
  const [stats, setStats] = useState<FitnessStats | null>(null);

  // 看板数据（全量趋势，不随单日切换变化，仅在挂载时加载一次）
  useEffect(() => {
    fetch('/api/fitness/stats?days=30')
      .then((r) => r.json())
      .then((d) => setStats(d))
      .catch(() => {});
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [m, t, c, w, cc, ep, cp] = await Promise.all([
        fetch(`/api/fitness/morning?date=${selectedDate}`).then((r) => r.json()),
        fetch(`/api/fitness/training?date=${selectedDate}`).then((r) => r.json()),
        fetch(`/api/fitness/cardio?date=${selectedDate}`).then((r) => r.json()),
        fetch(`/api/fitness/water?date=${selectedDate}`).then((r) => r.json()),
        fetch(`/api/fitness/carb-cut?date=${selectedDate}`).then((r) => r.json()),
        fetch('/api/fitness/exercise-presets').then((r) => r.json()),
        fetch('/api/fitness/cardio-presets').then((r) => r.json()),
      ]);
      setMorning(m.morning ?? null);
      setTrainings(t.trainings ?? []);
      setCardio(c.cardio ?? null);
      setWater(w.records ?? []);
      setIsCarbCut(cc.isCarbCutDay ?? false);
      setExercisePresets(ep.presets ?? []);
      setCardioPresets(cp.presets ?? []);
    } catch {
      setToast('❌ 加载失败');
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const showToast = (msg: string) => setToast(msg);

  async function toggleCarbCut() {
    const next = !isCarbCut;
    setIsCarbCut(next);
    try {
      await fetch('/api/fitness/carb-cut', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate, isCarbCutDay: next }),
      });
    } catch {
      showToast('❌ 断碳日更新失败');
    }
  }

  async function submitMorning(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch('/api/fitness/morning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate, ...morningForm }),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.error);
      setMorningOpen(false);
      setMorningForm(emptyMorning);
      showToast('✅ 晨起快照已保存');
      refresh();
    } catch (err) {
      showToast(`❌ ${err instanceof Error ? err.message : '保存失败'}`);
    }
  }

  async function submitTraining(e: React.FormEvent) {
    e.preventDefault();
    if (!trainingForm.exerciseName.trim()) {
      showToast('❌ 动作名不能为空');
      return;
    }
    try {
      const res = await fetch('/api/fitness/training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate, ...trainingForm }),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.error);
      setTrainingOpen(false);
      setTrainingForm(emptyTraining);
      showToast('✅ 训练组已添加');
      refresh();
    } catch (err) {
      showToast(`❌ ${err instanceof Error ? err.message : '保存失败'}`);
    }
  }

  async function deleteTraining(id: string, name: string) {
    if (!window.confirm(`确定删除训练组「${name}」吗？`)) return;
    try {
      await fetch(`/api/fitness/training?id=${id}`, { method: 'DELETE' });
      showToast('✅ 已删除');
      refresh();
    } catch {
      showToast('❌ 删除失败');
    }
  }

  async function submitCardio(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch('/api/fitness/cardio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate, ...cardioForm }),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.error);
      setCardioOpen(false);
      setCardioForm(emptyCardio);
      showToast('✅ 有氧已保存');
      refresh();
    } catch (err) {
      showToast(`❌ ${err instanceof Error ? err.message : '保存失败'}`);
    }
  }

  async function addWater(amountMl: number) {
    try {
      const res = await fetch('/api/fitness/water', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate, amountMl }),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.error);
      setWaterAmount('');
      showToast(`✅ 已记录饮水 ${amountMl}ml`);
      refresh();
    } catch (err) {
      showToast(`❌ ${err instanceof Error ? err.message : '记录失败'}`);
    }
  }

  async function deleteWater(id: string) {
    try {
      await fetch(`/api/fitness/water?id=${id}`, { method: 'DELETE' });
      showToast('✅ 已删除');
      refresh();
    } catch {
      showToast('❌ 删除失败');
    }
  }

  // ---- 预设相关 ----
  function applyExercisePreset(id: string) {
    const p = exercisePresets.find((x) => x.id === id);
    if (!p) return;
    setTrainingForm({
      exerciseName: p.name,
      sessionType: p.bodyPart ?? '',
      sets: p.sets != null ? String(p.sets) : '',
      reps: p.reps != null ? String(p.reps) : '',
      loadKg: p.loadKg != null ? String(p.loadKg) : '',
      totalDurationMin: '',
      rpeLastSet: '',
      rpeTrapRhomboid: '',
      isBodyweight: !!p.isBodyweight,
    });
    setTrainingOpen(true);
  }

  function applyCardioPreset(id: string) {
    const p = cardioPresets.find((x) => x.id === id);
    if (!p) return;
    setCardioForm({
      cardioType: p.cardioType,
      durationMin: p.durationMin != null ? String(p.durationMin) : '',
      hrZonePrimary: p.hrZonePrimary ?? '',
      avgHr: '',
      peakHr: '',
      distanceKm: '',
      perceivedSweat: '',
    });
    setCardioOpen(true);
  }

  async function saveExercisePreset(e: React.FormEvent) {
    e.preventDefault();
    if (!exercisePresetForm.name.trim()) {
      showToast('❌ 动作名不能为空');
      return;
    }
    try {
      const isEdit = !!exercisePresetForm.id;
      const res = await fetch(
        isEdit ? `/api/fitness/exercise-presets?id=${exercisePresetForm.id}` : '/api/fitness/exercise-presets',
        {
          method: isEdit ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: exercisePresetForm.name,
            bodyPart: exercisePresetForm.bodyPart,
            sets: exercisePresetForm.sets,
            reps: exercisePresetForm.reps,
            loadKg: exercisePresetForm.loadKg,
            isBodyweight: exercisePresetForm.isBodyweight,
          }),
        },
      );
      const d = await res.json();
      if (!d.success) throw new Error(d.error);
      setExercisePresetForm(emptyExercisePreset);
      setShowExerciseForm(false);
      showToast(isEdit ? '✅ 预设已更新' : '✅ 预设已新增');
      refresh();
    } catch (err) {
      showToast(`❌ ${err instanceof Error ? err.message : '保存失败'}`);
    }
  }

  async function deleteExercisePreset(id: string, name: string) {
    if (!window.confirm(`确定删除预设「${name}」吗？`)) return;
    try {
      await fetch(`/api/fitness/exercise-presets?id=${id}`, { method: 'DELETE' });
      showToast('✅ 已删除');
      refresh();
    } catch {
      showToast('❌ 删除失败');
    }
  }

  async function saveCardioPreset(e: React.FormEvent) {
    e.preventDefault();
    if (!cardioPresetForm.cardioType.trim()) {
      showToast('❌ 类型不能为空');
      return;
    }
    try {
      const isEdit = !!cardioPresetForm.id;
      const res = await fetch(
        isEdit ? `/api/fitness/cardio-presets?id=${cardioPresetForm.id}` : '/api/fitness/cardio-presets',
        {
          method: isEdit ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cardioType: cardioPresetForm.cardioType,
            durationMin: cardioPresetForm.durationMin,
            hrZonePrimary: cardioPresetForm.hrZonePrimary,
          }),
        },
      );
      const d = await res.json();
      if (!d.success) throw new Error(d.error);
      setCardioPresetForm(emptyCardioPreset);
      setShowCardioForm(false);
      showToast(isEdit ? '✅ 预设已更新' : '✅ 预设已新增');
      refresh();
    } catch (err) {
      showToast(`❌ ${err instanceof Error ? err.message : '保存失败'}`);
    }
  }

  async function deleteCardioPreset(id: string, type: string) {
    if (!window.confirm(`确定删除预设「${type}」吗？`)) return;
    try {
      await fetch(`/api/fitness/cardio-presets?id=${id}`, { method: 'DELETE' });
      showToast('✅ 已删除');
      refresh();
    } catch {
      showToast('❌ 删除失败');
    }
  }

  const totalWater = water.reduce((s, w) => s + (w.amountMl || 0), 0);

  return (
    <MainLayout>
      <h1 className="text-2xl font-bold">💪 健身模块</h1>

      {/* 日期选择器 */}
      <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-white/20 bg-white/10 p-4 backdrop-blur dark:border-white/10 dark:bg-black/10">
        <button
          onClick={() => setSelectedDate(shiftDate(selectedDate, -1))}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 dark:bg-black/10 dark:hover:bg-white/10"
        >
          ←
        </button>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
        />
        <button
          onClick={() => setSelectedDate(shiftDate(selectedDate, 1))}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 dark:bg-black/10 dark:hover:bg-white/10"
        >
          →
        </button>
        <button
          onClick={() => setSelectedDate(localDateStr(new Date()))}
          className="rounded-lg bg-blue-500 px-3 py-2 text-sm font-medium text-white hover:bg-blue-600"
        >
          今天
        </button>

        <label className="ml-auto flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" checked={isCarbCut} onChange={toggleCarbCut} className="h-4 w-4" />
          断碳日
        </label>
      </div>

      {/* 数据看板 */}
      <section className="mt-6">
        <h2 className="mb-3 text-lg font-semibold">📊 数据看板</h2>
        {!stats ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {[0, 1].map((i) => (
              <div
                key={i}
                className="h-[250px] animate-pulse rounded-xl border border-white/20 bg-white/10 backdrop-blur dark:border-white/10 dark:bg-black/10"
              />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <BodyFatTrendChart data={stats.bodyFatTrend} />
              <WeeklyVolumeChart volume={stats.weeklyVolume} cardio={stats.weeklyCardio} />
            </div>
            <FatigueRatioCard ratio={stats.fatigueRatio} status={stats.fatigueStatus} />
          </div>
        )}
      </section>

      {loading ? (
        <div className="mt-6 space-y-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-xl border border-white/20 bg-white/10 backdrop-blur dark:border-white/10 dark:bg-black/10"
            />
          ))}
        </div>
      ) : (
        <div className={`mt-6 space-y-4 ${isCarbCut ? 'opacity-70' : ''}`}>
          {/* 区块一：晨起快照 */}
          <section className="rounded-xl border border-white/20 bg-white/10 p-4 backdrop-blur md:p-5 dark:border-white/10 dark:bg-black/10">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">🌅 晨起快照</h2>
              <button
                onClick={() => setMorningOpen(true)}
                className="rounded-lg bg-blue-500 px-3 py-1.5 text-sm text-white hover:bg-blue-600"
              >
                {morning ? '编辑' : '📝 添加晨起快照'}
              </button>
            </div>

            {morning ? (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {[
                  ['体重', `${morning.weightKg ?? '—'} kg`],
                  ['体脂率', `${morning.bfScalePct ?? '—'} %`],
                  ['腰围', `${morning.waistCm ?? '—'} cm`],
                  ['内脏脂肪', `${morning.visceralFatScore ?? '—'}`],
                  ['静息心率', `${morning.morningHrRest ?? '—'} bpm`],
                  ['体位症状', `${morning.orthostaticSymptom ?? '—'}`],
                  ['睡眠质量', `${morning.sleepQuality ?? '—'}/5`],
                  ['酸痛指数', `${morning.muscleSorenessGlobal ?? '—'}/4`],
                  ['晨勃长度', `${morning.morningErectionLengthCm ?? '—'} cm`],
                  ['晨勃直径', `${morning.morningErectionDiameterCm ?? '—'} cm`],
                ].map(([label, val]) => (
                  <div key={label} className="rounded-lg bg-white/5 p-3 dark:bg-black/5">
                    <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
                    <div className="mt-1 font-semibold">{val}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-gray-500">今日未记录</p>
            )}
          </section>

          {/* 区块二：训练组 */}
          <section className="rounded-xl border border-white/20 bg-white/10 p-4 backdrop-blur md:p-5 dark:border-white/10 dark:bg-black/10">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">🏋️ 抗阻训练</h2>
              <div className="flex items-center gap-2">
                <select
                  value={selectedExercisePreset}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSelectedExercisePreset('');
                    if (v) applyExercisePreset(v);
                  }}
                  className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800"
                >
                  <option value="">选择预设…</option>
                  {exercisePresets.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.bodyPart})
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    setShowExerciseForm(false);
                    setExercisePresetOpen(true);
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-sm hover:bg-white/20 dark:bg-black/10 dark:hover:bg-white/10"
                  aria-label="管理预设"
                >
                  ⚙️
                </button>
                <button
                  onClick={() => setTrainingOpen(true)}
                  className="rounded-lg bg-blue-500 px-3 py-1.5 text-sm text-white hover:bg-blue-600"
                >
                  ➕ 添加组
                </button>
              </div>
            </div>

            {trainings.length === 0 ? (
              <p className="mt-3 text-gray-500">今日无训练</p>
            ) : (
              <div className="mt-4 space-y-2">
                {trainings.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between rounded-lg bg-white/5 px-4 py-3 dark:bg-black/5"
                  >
                    <div>
                      <div className="font-semibold">{t.exerciseName}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {t.sets ?? 0} 组 × {t.reps ?? 0} 次 @ {t.loadKg ?? 0}kg
                        {t.isBodyweight ? '（自重）' : ''}
                        {' · RPE '}
                        {t.rpeLastSet ?? '—'}
                        {t.sessionType ? ` · ${t.sessionType}` : ''}
                        {t.volumeLoad != null ? ` · 容量 ${t.volumeLoad}` : ''}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteTraining(t.id, t.exerciseName)}
                      className="text-lg transition-opacity hover:opacity-70"
                      aria-label="删除"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 区块三：有氧 */}
          <section className="rounded-xl border border-white/20 bg-white/10 p-4 backdrop-blur md:p-5 dark:border-white/10 dark:bg-black/10">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">🏃 有氧运动</h2>
              <div className="flex items-center gap-2">
                <select
                  value={selectedCardioPreset}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSelectedCardioPreset('');
                    if (v) applyCardioPreset(v);
                  }}
                  className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800"
                >
                  <option value="">选择预设…</option>
                  {cardioPresets.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.cardioType} | {p.durationMin ?? '—'}min | {p.hrZonePrimary ?? '—'}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    setShowCardioForm(false);
                    setCardioPresetOpen(true);
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-sm hover:bg-white/20 dark:bg-black/10 dark:hover:bg-white/10"
                  aria-label="管理预设"
                >
                  ⚙️
                </button>
                <button
                  onClick={() => setCardioOpen(true)}
                  className="rounded-lg bg-blue-500 px-3 py-1.5 text-sm text-white hover:bg-blue-600"
                >
                  ➕ 添加组
                </button>
              </div>
            </div>

            {cardio ? (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ['类型', cardio.cardioType ?? '—'],
                  ['时长', `${cardio.durationMin ?? '—'} min`],
                  ['平均心率', `${cardio.avgHr ?? '—'} bpm`],
                  ['峰值心率', `${cardio.peakHr ?? '—'} bpm`],
                  ['心率区', cardio.hrZonePrimary ?? '—'],
                  ['距离', `${cardio.distanceKm ?? '—'} km`],
                  ['出汗等级', `${cardio.perceivedSweat ?? '—'}/3`],
                ].map(([label, val]) => (
                  <div key={label} className="rounded-lg bg-white/5 p-3 dark:bg-black/5">
                    <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
                    <div className="mt-1 font-semibold">{val}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-gray-500">今日未记录</p>
            )}
          </section>

          {/* 区块四：饮水 */}
          <section className="rounded-xl border border-white/20 bg-white/10 p-4 backdrop-blur md:p-5 dark:border-white/10 dark:bg-black/10">
            <h2 className="text-lg font-semibold">💧 饮水</h2>
            <div className="mt-3 text-4xl font-bold">
              {totalWater}
              <span className="ml-1 text-base font-normal text-gray-500">ml</span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {[200, 300, 500, 1000].map((n) => (
                <button
                  key={n}
                  onClick={() => addWater(n)}
                  className="rounded-full bg-blue-500/20 px-4 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-500/30 dark:text-blue-300"
                >
                  +{n}ml
                </button>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const n = Number(waterAmount);
                if (n > 0) addWater(n);
              }}
              className="mt-3 flex gap-2"
            >
              <input
                type="number"
                min="1"
                value={waterAmount}
                onChange={(e) => setWaterAmount(e.target.value)}
                placeholder="自定义毫升数"
                className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
              />
              <button
                type="submit"
                className="rounded-lg bg-blue-500 px-4 py-2 text-sm text-white hover:bg-blue-600"
              >
                添加
              </button>
            </form>

            {water.length > 0 && (
              <div className="mt-4 space-y-1">
                {water.map((w) => (
                  <div key={w.id} className="flex items-center justify-between text-sm">
                    <span>
                      🕐 {w.time} · {w.amountMl}ml
                    </span>
                    <button onClick={() => deleteWater(w.id)} className="opacity-60 hover:opacity-100">
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* 晨起快照模态框 */}
      {morningOpen && (
        <Modal title="🌅 晨起快照" onClose={() => setMorningOpen(false)}>
          <form onSubmit={submitMorning} className="grid grid-cols-2 gap-3">
            <Field label="体重 (kg)">
              <input className={inputCls} type="number" step="0.1" value={morningForm.weightKg} onChange={(e) => setMorningForm({ ...morningForm, weightKg: e.target.value })} />
            </Field>
            <Field label="体脂率 (%)">
              <input className={inputCls} type="number" step="0.1" value={morningForm.bfScalePct} onChange={(e) => setMorningForm({ ...morningForm, bfScalePct: e.target.value })} />
            </Field>
            <Field label="腰围 (cm)">
              <input className={inputCls} type="number" step="0.1" value={morningForm.waistCm} onChange={(e) => setMorningForm({ ...morningForm, waistCm: e.target.value })} />
            </Field>
            <Field label="内脏脂肪">
              <input className={inputCls} type="number" value={morningForm.visceralFatScore} onChange={(e) => setMorningForm({ ...morningForm, visceralFatScore: e.target.value })} />
            </Field>
            <Field label="静息心率 (bpm)">
              <input className={inputCls} type="number" value={morningForm.morningHrRest} onChange={(e) => setMorningForm({ ...morningForm, morningHrRest: e.target.value })} />
            </Field>
            <Field label="体位症状 (0-2)">
              <input className={inputCls} type="number" value={morningForm.orthostaticSymptom} onChange={(e) => setMorningForm({ ...morningForm, orthostaticSymptom: e.target.value })} />
            </Field>
            <Field label="睡眠质量 (1-5)">
              <input className={inputCls} type="number" value={morningForm.sleepQuality} onChange={(e) => setMorningForm({ ...morningForm, sleepQuality: e.target.value })} />
            </Field>
            <Field label="酸痛指数 (0-4)">
              <input className={inputCls} type="number" value={morningForm.muscleSorenessGlobal} onChange={(e) => setMorningForm({ ...morningForm, muscleSorenessGlobal: e.target.value })} />
            </Field>
            <Field label="晨勃长度 (cm)">
              <input className={inputCls} type="number" step="0.1" value={morningForm.morningErectionLengthCm} onChange={(e) => setMorningForm({ ...morningForm, morningErectionLengthCm: e.target.value })} />
            </Field>
            <Field label="晨勃直径 (cm)">
              <input className={inputCls} type="number" step="0.1" value={morningForm.morningErectionDiameterCm} onChange={(e) => setMorningForm({ ...morningForm, morningErectionDiameterCm: e.target.value })} />
            </Field>
            <button type="submit" className="col-span-2 mt-2 rounded-lg bg-blue-500 py-2 font-medium text-white hover:bg-blue-600">
              保存
            </button>
          </form>
        </Modal>
      )}

      {/* 训练组模态框 */}
      {trainingOpen && (
        <Modal title="🏋️ 添加训练组" onClose={() => setTrainingOpen(false)}>
          <form onSubmit={submitTraining} className="grid grid-cols-2 gap-3">
            <Field label="动作名 *">
              <input className={inputCls} value={trainingForm.exerciseName} onChange={(e) => setTrainingForm({ ...trainingForm, exerciseName: e.target.value })} />
            </Field>
            <Field label="部位">
              <input className={inputCls} value={trainingForm.sessionType} onChange={(e) => setTrainingForm({ ...trainingForm, sessionType: e.target.value })} />
            </Field>
            <Field label="组数">
              <input className={inputCls} type="number" value={trainingForm.sets} onChange={(e) => setTrainingForm({ ...trainingForm, sets: e.target.value })} />
            </Field>
            <Field label="次数">
              <input className={inputCls} type="number" step="0.5" value={trainingForm.reps} onChange={(e) => setTrainingForm({ ...trainingForm, reps: e.target.value })} />
            </Field>
            <Field label="负重 (kg)">
              <input className={inputCls} type="number" step="0.5" value={trainingForm.loadKg} onChange={(e) => setTrainingForm({ ...trainingForm, loadKg: e.target.value })} />
            </Field>
            <Field label="总时长 (min)">
              <input className={inputCls} type="number" value={trainingForm.totalDurationMin} onChange={(e) => setTrainingForm({ ...trainingForm, totalDurationMin: e.target.value })} />
            </Field>
            <Field label="RPE">
              <input className={inputCls} type="number" step="0.5" value={trainingForm.rpeLastSet} onChange={(e) => setTrainingForm({ ...trainingForm, rpeLastSet: e.target.value })} />
            </Field>
            <Field label="斜方肌紧张度 (0-3)">
              <input className={inputCls} type="number" value={trainingForm.rpeTrapRhomboid} onChange={(e) => setTrainingForm({ ...trainingForm, rpeTrapRhomboid: e.target.value })} />
            </Field>
            <label className="col-span-2 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={trainingForm.isBodyweight} onChange={(e) => setTrainingForm({ ...trainingForm, isBodyweight: e.target.checked })} />
              自重动作
            </label>
            <button type="submit" className="col-span-2 mt-2 rounded-lg bg-blue-500 py-2 font-medium text-white hover:bg-blue-600">
              保存
            </button>
          </form>
        </Modal>
      )}

      {/* 有氧模态框 */}
      {cardioOpen && (
        <Modal title="🏃 添加有氧" onClose={() => setCardioOpen(false)}>
          <form onSubmit={submitCardio} className="grid grid-cols-2 gap-3">
            <Field label="类型">
              <input className={inputCls} value={cardioForm.cardioType} onChange={(e) => setCardioForm({ ...cardioForm, cardioType: e.target.value })} />
            </Field>
            <Field label="时长 (min)">
              <input className={inputCls} type="number" value={cardioForm.durationMin} onChange={(e) => setCardioForm({ ...cardioForm, durationMin: e.target.value })} />
            </Field>
            <Field label="平均心率">
              <input className={inputCls} type="number" value={cardioForm.avgHr} onChange={(e) => setCardioForm({ ...cardioForm, avgHr: e.target.value })} />
            </Field>
            <Field label="峰值心率">
              <input className={inputCls} type="number" value={cardioForm.peakHr} onChange={(e) => setCardioForm({ ...cardioForm, peakHr: e.target.value })} />
            </Field>
            <Field label="心率区">
              <input className={inputCls} value={cardioForm.hrZonePrimary} onChange={(e) => setCardioForm({ ...cardioForm, hrZonePrimary: e.target.value })} />
            </Field>
            <Field label="出汗等级 (0-3)">
              <input className={inputCls} type="number" value={cardioForm.perceivedSweat} onChange={(e) => setCardioForm({ ...cardioForm, perceivedSweat: e.target.value })} />
            </Field>
            <Field label="距离 (km, 可选)">
              <input className={inputCls} type="number" step="0.1" value={cardioForm.distanceKm} onChange={(e) => setCardioForm({ ...cardioForm, distanceKm: e.target.value })} />
            </Field>
            <button type="submit" className="col-span-2 mt-2 rounded-lg bg-blue-500 py-2 font-medium text-white hover:bg-blue-600">
              保存
            </button>
          </form>
        </Modal>
      )}

      {/* 抗阻预设管理模态框 */}
      {exercisePresetOpen && (
        <Modal title="管理抗阻预设" onClose={() => setExercisePresetOpen(false)}>
          <div className="max-h-60 space-y-2 overflow-y-auto">
            {exercisePresets.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 dark:bg-black/5">
                <div className="text-sm">
                  <span className="font-medium">{p.name}</span>
                  <span className="text-gray-500">
                    {' '}
                    {p.bodyPart} · {p.sets ?? '—'}×{p.reps ?? '—'}{' '}
                    {p.isBodyweight ? '自重' : `@ ${p.loadKg ?? '—'}kg`}
                  </span>
                </div>
                <div className="flex shrink-0 gap-2 text-sm">
                  <button
                    onClick={() => {
                      setExercisePresetForm({
                        id: p.id,
                        name: p.name,
                        bodyPart: p.bodyPart ?? '推',
                        sets: p.sets != null ? String(p.sets) : '',
                        reps: p.reps != null ? String(p.reps) : '',
                        loadKg: p.loadKg != null ? String(p.loadKg) : '',
                        isBodyweight: !!p.isBodyweight,
                      });
                      setShowExerciseForm(true);
                    }}
                    className="text-blue-500 hover:underline"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => deleteExercisePreset(p.id, p.name)}
                    className="text-red-500 hover:underline"
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>

          {showExerciseForm ? (
            <form onSubmit={saveExercisePreset} className="mt-4 grid grid-cols-2 gap-3 border-t pt-4">
              <Field label="动作名 *">
                <input className={inputCls} value={exercisePresetForm.name} onChange={(e) => setExercisePresetForm({ ...exercisePresetForm, name: e.target.value })} />
              </Field>
              <Field label="部位">
                <select className={inputCls} value={exercisePresetForm.bodyPart} onChange={(e) => setExercisePresetForm({ ...exercisePresetForm, bodyPart: e.target.value })}>
                  <option value="推">推</option>
                  <option value="拉">拉</option>
                  <option value="腹">腹</option>
                  <option value="腿">腿</option>
                </select>
              </Field>
              <Field label="组数">
                <input className={inputCls} type="number" value={exercisePresetForm.sets} onChange={(e) => setExercisePresetForm({ ...exercisePresetForm, sets: e.target.value })} />
              </Field>
              <Field label="次数">
                <input className={inputCls} type="number" step="0.5" value={exercisePresetForm.reps} onChange={(e) => setExercisePresetForm({ ...exercisePresetForm, reps: e.target.value })} />
              </Field>
              <Field label="负重 (kg)">
                <input className={inputCls} type="number" step="0.5" value={exercisePresetForm.loadKg} onChange={(e) => setExercisePresetForm({ ...exercisePresetForm, loadKg: e.target.value })} />
              </Field>
              <label className="flex items-center gap-2 self-end pb-1 text-sm">
                <input type="checkbox" checked={exercisePresetForm.isBodyweight} onChange={(e) => setExercisePresetForm({ ...exercisePresetForm, isBodyweight: e.target.checked })} />
                自重
              </label>
              <div className="col-span-2 flex gap-2">
                <button type="submit" className="flex-1 rounded-lg bg-blue-500 py-2 font-medium text-white hover:bg-blue-600">
                  {exercisePresetForm.id ? '保存修改' : '新增预设'}
                </button>
                <button type="button" onClick={() => { setShowExerciseForm(false); setExercisePresetForm(emptyExercisePreset); }} className="rounded-lg px-4 py-2 text-sm text-gray-500 hover:text-gray-700">
                  取消
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => {
                setExercisePresetForm(emptyExercisePreset);
                setShowExerciseForm(true);
              }}
              className="mt-4 w-full rounded-lg border border-dashed border-white/30 py-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              ➕ 新增预设
            </button>
          )}
        </Modal>
      )}

      {/* 有氧预设管理模态框 */}
      {cardioPresetOpen && (
        <Modal title="管理有氧预设" onClose={() => setCardioPresetOpen(false)}>
          <div className="max-h-60 space-y-2 overflow-y-auto">
            {cardioPresets.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 dark:bg-black/5">
                <div className="text-sm">
                  <span className="font-medium">{p.cardioType}</span>
                  <span className="text-gray-500">
                    {' '}
                    | {p.durationMin ?? '—'}min | {p.hrZonePrimary ?? '—'}
                  </span>
                </div>
                <div className="flex shrink-0 gap-2 text-sm">
                  <button
                    onClick={() => {
                      setCardioPresetForm({
                        id: p.id,
                        cardioType: p.cardioType,
                        durationMin: p.durationMin != null ? String(p.durationMin) : '',
                        hrZonePrimary: p.hrZonePrimary ?? '有氧耐力',
                      });
                      setShowCardioForm(true);
                    }}
                    className="text-blue-500 hover:underline"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => deleteCardioPreset(p.id, p.cardioType)}
                    className="text-red-500 hover:underline"
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>

          {showCardioForm ? (
            <form onSubmit={saveCardioPreset} className="mt-4 grid grid-cols-2 gap-3 border-t pt-4">
              <Field label="类型 *">
                <input className={inputCls} list="cardio-type-options" value={cardioPresetForm.cardioType} onChange={(e) => setCardioPresetForm({ ...cardioPresetForm, cardioType: e.target.value })} />
                <datalist id="cardio-type-options">
                  <option value="划船" />
                  <option value="爬坡" />
                  <option value="散步" />
                  <option value="骑行" />
                  <option value="跳绳" />
                </datalist>
              </Field>
              <Field label="时长 (min)">
                <input className={inputCls} type="number" value={cardioPresetForm.durationMin} onChange={(e) => setCardioPresetForm({ ...cardioPresetForm, durationMin: e.target.value })} />
              </Field>
              <Field label="心率区">
                <select className={inputCls} value={cardioPresetForm.hrZonePrimary} onChange={(e) => setCardioPresetForm({ ...cardioPresetForm, hrZonePrimary: e.target.value })}>
                  <option value="燃脂">燃脂</option>
                  <option value="有氧耐力">有氧耐力</option>
                  <option value="无氧">无氧</option>
                </select>
              </Field>
              <div className="col-span-2 flex gap-2">
                <button type="submit" className="flex-1 rounded-lg bg-blue-500 py-2 font-medium text-white hover:bg-blue-600">
                  {cardioPresetForm.id ? '保存修改' : '新增预设'}
                </button>
                <button type="button" onClick={() => { setShowCardioForm(false); setCardioPresetForm(emptyCardioPreset); }} className="rounded-lg px-4 py-2 text-sm text-gray-500 hover:text-gray-700">
                  取消
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => {
                setCardioPresetForm(emptyCardioPreset);
                setShowCardioForm(true);
              }}
              className="mt-4 w-full rounded-lg border border-dashed border-white/30 py-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              ➕ 新增预设
            </button>
          )}
        </Modal>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-lg bg-gray-900 px-4 py-2 text-sm text-white shadow-lg dark:bg-white dark:text-gray-900">
          {toast}
        </div>
      )}
    </MainLayout>
  );
}
