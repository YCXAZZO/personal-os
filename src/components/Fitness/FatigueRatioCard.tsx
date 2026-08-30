'use client';

export default function FatigueRatioCard({
  ratio,
  status,
}: {
  ratio: number | null;
  status: 'ok' | 'warning' | 'danger';
}) {
  const config = {
    ok: { color: 'bg-green-500', text: '负荷合理' },
    warning: { color: 'bg-yellow-500', text: '建议关注恢复' },
    danger: { color: 'bg-red-500', text: '⚠️ 建议减载周' },
  }[status];

  return (
    <div className="rounded-xl border border-white/20 bg-white/10 p-5 backdrop-blur dark:border-white/10 dark:bg-black/10">
      <h2 className="text-lg font-semibold">🔥 疲劳-负荷比</h2>

      {ratio == null ? (
        <p className="mt-3 text-gray-500 dark:text-gray-400">数据不足（需连续3天晨起数据）</p>
      ) : (
        <div className="mt-3 flex items-center gap-4">
          <div className="text-3xl font-bold">{ratio.toFixed(2)}</div>
          <div className="flex items-center gap-2 text-sm">
            <span className={`h-3 w-3 rounded-full ${config.color}`} />
            <span>{config.text}</span>
          </div>
        </div>
      )}

      <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
        比值 = (容量 + 无氧有氧) / (心率 × 睡眠)
      </p>
    </div>
  );
}
