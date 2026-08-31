'use client';

import { useCallback, useEffect, useState } from 'react';
import FullscreenTimer from './FullscreenTimer';
import CompleteModal from './CompleteModal';

type Session = {
  id: string;
  status: string;
  presetMinutes: number | null;
  startTime: string | null;
  elapsedSeconds: number;
  actualMinutes: number | null;
  projectName: string | null;
  createdAt: string | null;
};

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function FloatingButton() {
  const [session, setSession] = useState<Session | null>(null);
  const [todayCompleted, setTodayCompleted] = useState(0);
  const [showTimer, setShowTimer] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [mode, setMode] = useState<'countdown' | 'countup'>('countdown');
  const [presetMinutes, setPresetMinutes] = useState(25);
  const [now, setNow] = useState(Date.now());

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/pomodoro');
      const d = await res.json();
      setSession(d.session ?? null);
      setTodayCompleted(d.todayCompleted ?? 0);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const startMs = session?.startTime ? new Date(session.startTime).getTime() : null;
  const elapsed = session
    ? (session.elapsedSeconds ?? 0) +
      (session.status === 'running' && startMs ? Math.max(0, Math.floor((now - startMs) / 1000)) : 0)
    : 0;
  const totalSeconds = (session?.presetMinutes ?? presetMinutes) * 60;
  const remaining = Math.max(0, totalSeconds - elapsed);

  // 计时归零 → 自动弹出完成弹窗
  useEffect(() => {
    if (session?.status === 'running' && remaining <= 0 && !showComplete) {
      setShowComplete(true);
    }
  }, [remaining, session?.status, showComplete]);

  async function handleStart() {
    const res = await fetch('/api/pomodoro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ presetMinutes }),
    });
    const d = await res.json();
    if (d.success) {
      setSession(d.session);
      setShowComplete(false);
    }
  }

  async function handlePause() {
    const res = await fetch('/api/pomodoro', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'pause' }),
    });
    const d = await res.json();
    if (d.success) setSession(d.session);
  }

  async function handleResume() {
    const res = await fetch('/api/pomodoro', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'resume' }),
    });
    const d = await res.json();
    if (d.success) setSession(d.session);
  }

  async function handleStop() {
    if (!window.confirm('确定停止当前番茄钟吗？')) return;
    await fetch('/api/pomodoro', { method: 'DELETE' });
    setSession(null);
    setShowComplete(false);
    setShowTimer(false);
    refresh();
  }

  async function handleComplete(projectName: string, actualMinutes: number) {
    await fetch('/api/pomodoro', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectName, actualMinutes }),
    });
    await fetch('/api/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectName, durationMinutes: actualMinutes }),
    });
    setSession(null);
    setShowComplete(false);
    refresh();
  }

  async function handleCancelComplete() {
    await fetch('/api/pomodoro', { method: 'DELETE' });
    setSession(null);
    setShowComplete(false);
    refresh();
  }

  const active = session && (session.status === 'running' || session.status === 'paused');
  const isRunning = session?.status === 'running';

  return (
    <>
      <button
        onClick={() => setShowTimer(true)}
        className={`fixed bottom-6 right-6 z-50 flex items-center justify-center rounded-full bg-red-500 text-white shadow-xl transition-transform hover:scale-105 ${
          active ? 'h-14 min-w-14 px-4' : 'h-14 w-14'
        }`}
        aria-label="番茄时钟"
      >
        {!active ? (
          <span className="text-2xl">🍅</span>
        ) : (
          <span className={`text-sm font-bold ${isRunning ? 'animate-pulse' : ''}`}>
            {isRunning ? formatTime(remaining) : `⏸️ ${formatTime(remaining)}`}
          </span>
        )}
      </button>

      {showTimer && (
        <FullscreenTimer
          session={session}
          mode={mode}
          onToggleMode={() => setMode((m) => (m === 'countdown' ? 'countup' : 'countdown'))}
          presetMinutes={presetMinutes}
          onSelectPreset={setPresetMinutes}
          remaining={remaining}
          elapsed={elapsed}
          todayCompleted={todayCompleted}
          onClose={() => setShowTimer(false)}
          onStart={handleStart}
          onPause={handlePause}
          onResume={handleResume}
          onStop={handleStop}
        />
      )}

      {showComplete && (
        <CompleteModal
          presetMinutes={session?.presetMinutes ?? presetMinutes}
          onConfirm={handleComplete}
          onCancel={handleCancelComplete}
        />
      )}
    </>
  );
}
