'use client';

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

const PRESETS = [15, 25, 30, 45, 60];

export default function FullscreenTimer({
  session,
  mode,
  onToggleMode,
  presetMinutes,
  onSelectPreset,
  remaining,
  elapsed,
  todayCompleted,
  onClose,
  onStart,
  onPause,
  onResume,
  onStop,
}: {
  session: Session | null;
  mode: 'countdown' | 'countup';
  onToggleMode: () => void;
  presetMinutes: number;
  onSelectPreset: (m: number) => void;
  remaining: number;
  elapsed: number;
  todayCompleted: number;
  onClose: () => void;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}) {
  const active = session && (session.status === 'running' || session.status === 'paused');
  const isRunning = session?.status === 'running';
  const isPaused = session?.status === 'paused';
  const displaySeconds = mode === 'countdown' ? remaining : elapsed;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl"
      onClick={onClose}
    >
      <div className="flex flex-col items-center px-4" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute right-6 top-6 flex h-10 w-10 items-center justify-center rounded-full text-2xl text-white/70 hover:bg-white/10 hover:text-white"
          aria-label="关闭"
        >
          ✕
        </button>

        <div className="text-8xl font-mono font-bold tracking-tight text-white">
          {formatTime(displaySeconds)}
        </div>

        <button
          onClick={onToggleMode}
          className="mt-4 rounded-full bg-white/10 px-4 py-1.5 text-sm text-gray-300 hover:bg-white/20"
        >
          {mode === 'countdown' ? '⏱ 倒数' : '⏫ 正数（已专注）'}
        </button>

        {!active && (
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {PRESETS.map((m) => (
              <button
                key={m}
                onClick={() => onSelectPreset(m)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  presetMinutes === m
                    ? 'bg-red-500 text-white'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                {m} 分钟
              </button>
            ))}
          </div>
        )}

        <div className="mt-8 flex gap-3">
          {!active && (
            <button
              onClick={onStart}
              className="rounded-full bg-red-500 px-8 py-3 text-lg font-semibold text-white transition-colors hover:bg-red-600"
            >
              ▶ 开始
            </button>
          )}
          {isRunning && (
            <button
              onClick={onPause}
              className="rounded-full bg-white/10 px-8 py-3 text-lg font-semibold text-white hover:bg-white/20"
            >
              ⏸ 暂停
            </button>
          )}
          {isPaused && (
            <button
              onClick={onResume}
              className="rounded-full bg-red-500 px-8 py-3 text-lg font-semibold text-white transition-colors hover:bg-red-600"
            >
              ▶ 继续
            </button>
          )}
          {active && (
            <button
              onClick={onStop}
              className="rounded-full bg-white/10 px-8 py-3 text-lg font-semibold text-white hover:bg-white/20"
            >
              ⏹ 停止
            </button>
          )}
        </div>

        <div className="mt-10 text-sm text-gray-400">今日已完成：{todayCompleted} 个番茄 🍅</div>
      </div>
    </div>
  );
}
