'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type Point = { date: string; value: number };

export default function BodyFatTrendChart({ data }: { data: Point[] }) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-white/20 bg-white/10 p-5 backdrop-blur dark:border-white/10 dark:bg-black/10">
        <h2 className="text-lg font-semibold">📉 体脂趋势</h2>
        <p className="mt-3 text-gray-500 dark:text-gray-400">暂无体脂数据</p>
      </div>
    );
  }

  const chartData = data.map((d) => ({ ...d, date: d.date.slice(5) }));

  return (
    <div className="rounded-xl border border-white/20 bg-white/10 p-5 backdrop-blur dark:border-white/10 dark:bg-black/10">
      <h2 className="mb-3 text-lg font-semibold">📉 体脂趋势</h2>
      <div className="h-[200px] w-full md:h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis unit="%" tick={{ fontSize: 12 }} domain={['auto', 'auto']} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(30,30,30,0.85)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 8,
              color: '#fff',
              backdropFilter: 'blur(8px)',
            }}
            formatter={(v) => [`${v ?? '—'}%`, '体脂率']}
          />
          <Line type="monotone" dataKey="value" name="体脂率" stroke="#4A8FE4" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
        </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
