'use client';

import { useCallback, useEffect, useState } from 'react';
import MainLayout from '@/components/Layout/MainLayout';
import ReactMarkdown from 'react-markdown';

type Summary = {
  recordCount: number;
  totalDuration: number;
  activeProjects: number;
  trainingCount: number;
  cardioCount: number;
  avgMorningHr: number | null;
  avgSleepQuality: number | null;
  hasData: boolean;
};

type HistoryItem = {
  id: string;
  date: string | null;
  stateSummary: string | null;
  aiResponse: string | null;
  createdAt: string | null;
};

function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function shiftDays(dateStr: string, delta: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + delta);
  return localDateStr(d);
}

function monthStart(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

export default function ReviewPage() {
  const today = localDateStr(new Date());
  const [startDate, setStartDate] = useState(shiftDays(today, -6));
  const [endDate, setEndDate] = useState(today);

  const [summary, setSummary] = useState<Summary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [extraContext, setExtraContext] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [analysisTime, setAnalysisTime] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const res = await fetch(`/api/ai/analyze?startDate=${startDate}&endDate=${endDate}`);
      const d = await res.json();
      if (d.success) setSummary(d.summary);
    } catch {
      /* ignore */
    } finally {
      setSummaryLoading(false);
    }
  }, [startDate, endDate]);

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/ai/history?limit=5');
      const d = await res.json();
      if (d.success) setHistory(d.history ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    Promise.all([loadSummary(), loadHistory()]);
  }, [loadSummary, loadHistory]);

  async function analyze() {
    setAnalyzing(true);
    setError(null);
    setAnalysis(null);
    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, endDate, extraContext: extraContext.trim() || undefined }),
      });
      const d = await res.json();
      if (!d.success) {
        setError(d.error ?? '分析失败');
      } else {
        setAnalysis(d.analysis);
        setAnalysisTime(new Date().toLocaleString());
        loadHistory();
      }
    } catch {
      setError('AI 服务暂时不可用，请稍后再试');
    } finally {
      setAnalyzing(false);
    }
  }

  const cards: [string, string][] = [
    ['总打卡次数', `${summary?.recordCount ?? '—'}`],
    ['总时长', `${summary?.totalDuration ?? '—'} 分钟`],
    ['活跃项目', `${summary?.activeProjects ?? '—'}`],
    ['训练次数', `${summary?.trainingCount ?? '—'}`],
    ['有氧次数', `${summary?.cardioCount ?? '—'}`],
    [
      '晨起状态',
      summary?.avgMorningHr != null
        ? `${summary.avgMorningHr} bpm · ${summary.avgSleepQuality ?? '—'}/5`
        : '—',
    ],
  ];

  return (
    <MainLayout>
      <h1 className="text-2xl font-bold">📈 复盘</h1>

      {/* 日期范围选择器 */}
      <div className="mt-6 flex flex-col gap-3 rounded-xl border border-white/20 bg-white/10 p-4 backdrop-blur sm:flex-row sm:flex-wrap sm:items-center dark:border-white/10 dark:bg-black/10">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="date"
            value={startDate}
            onChange={(e) => e.target.value && setStartDate(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
          />
          <span className="hidden text-center text-gray-500 sm:inline">至</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => e.target.value && setEndDate(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
          />
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setStartDate(shiftDays(today, -6)); setEndDate(today); }} className="rounded-lg bg-white/10 px-3 py-2 text-sm hover:bg-white/20 dark:bg-black/10 dark:hover:bg-white/10">近7天</button>
          <button onClick={() => { setStartDate(shiftDays(today, -29)); setEndDate(today); }} className="rounded-lg bg-white/10 px-3 py-2 text-sm hover:bg-white/20 dark:bg-black/10 dark:hover:bg-white/10">近30天</button>
          <button onClick={() => { setStartDate(monthStart(today)); setEndDate(today); }} className="rounded-lg bg-white/10 px-3 py-2 text-sm hover:bg-white/20 dark:bg-black/10 dark:hover:bg-white/10">本月</button>
        </div>
      </div>

      {/* 数据概览 */}
      <section className="mt-6">
        <h2 className="mb-3 text-lg font-semibold">数据概览</h2>
        {summaryLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse rounded-xl border border-white/20 bg-white/10 p-4 text-center backdrop-blur dark:border-white/10 dark:bg-black/10">
                <div className="mx-auto h-6 w-12 rounded bg-gray-400/40 dark:bg-gray-500/40" />
                <div className="mx-auto mt-2 h-3 w-16 rounded bg-gray-400/40 dark:bg-gray-500/40" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {cards.map(([label, value]) => (
              <div key={label} className="rounded-xl border border-white/20 bg-white/10 p-4 text-center backdrop-blur dark:border-white/10 dark:bg-black/10">
                <div className="text-xl font-bold">{value}</div>
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{label}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 补充上下文 + AI 分析 */}
      <section className="mt-6 rounded-xl border border-white/20 bg-white/10 p-5 backdrop-blur dark:border-white/10 dark:bg-black/10">
        <h2 className="text-lg font-semibold">🤖 AI 周报</h2>

        <textarea
          value={extraContext}
          onChange={(e) => setExtraContext(e.target.value)}
          placeholder='补充临时事项（如"这周出差，睡眠不足"）'
          rows={2}
          className="mt-3 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800"
        />

        <button
          onClick={analyze}
          disabled={analyzing}
          className="mt-3 flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-600 disabled:opacity-60"
        >
          <span className={analyzing ? 'inline-block animate-spin' : ''}>🤖</span>
          {analyzing ? '分析中…' : '生成 AI 周报'}
        </button>

        {error && <p className="mt-3 text-red-500">❌ {error}</p>}

        {analysis && (
          <div className="mt-4 rounded-lg bg-white/5 p-4 text-left dark:bg-black/5">
            <div className="markdown-body space-y-3 text-sm leading-relaxed">
              <ReactMarkdown>{analysis}</ReactMarkdown>
            </div>
            {analysisTime && (
              <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">分析时间：{analysisTime}</p>
            )}
          </div>
        )}
      </section>

      {/* 历史分析记录 */}
      <section className="mt-6">
        <h2 className="mb-3 text-lg font-semibold">历史分析</h2>
        {history.length === 0 ? (
          <p className="text-gray-500">暂无历史分析</p>
        ) : (
          <div className="space-y-2">
            {history.map((h) => (
              <div key={h.id} className="rounded-xl border border-white/20 bg-white/10 backdrop-blur dark:border-white/10 dark:bg-black/10">
                <button
                  onClick={() => setExpandedId(expandedId === h.id ? null : h.id)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                >
                  <div>
                    <div className="text-sm font-medium">{h.date ?? '—'}</div>
                    <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{h.stateSummary ?? '（无摘要）'}</div>
                  </div>
                  <span className="text-gray-400">{expandedId === h.id ? '▲' : '▼'}</span>
                </button>
                {expandedId === h.id && h.aiResponse && (
                  <div className="border-t border-white/10 px-4 py-3 text-left">
                    <div className="markdown-body space-y-3 text-sm leading-relaxed">
                      <ReactMarkdown>{h.aiResponse}</ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </MainLayout>
  );
}
