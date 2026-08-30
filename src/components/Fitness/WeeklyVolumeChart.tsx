'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type Point = { date: string; value: number };

export default function WeeklyVolumeChart({
  volume,
  cardio,
}: {
  volume: Point[];
  cardio: Point[];
}) {
  const data = volume.map((v, i) => ({
    date: v.date.slice(5),
    volume: v.value,
    cardio: cardio[i]?.value ?? 0,
  }));
  const hasData = data.some((d) => d.volume > 0 || d.cardio > 0);

  if (!hasData) {
    return (
      <div className="rounded-xl border border-white/20 bg-white/10 p-5 backdrop-blur dark:border-white/10 dark:bg-black/10">
        <h2 className="text-lg font-semibold">📊 近7天训练量</h2>
        <p className="mt-3 text-gray-500 dark:text-gray-400">暂无训练数据</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/20 bg-white/10 p-5 backdrop-blur dark:border-white/10 dark:bg-black/10">
      <h2 className="mb-3 text-lg font-semibold">📊 近7天训练量</h2>
      <div className="h-[200px] w-full md:h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(30,30,30,0.85)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 8,
              color: '#fff',
              backdropFilter: 'blur(8px)',
            }}
          />
          <Legend />
          <Bar yAxisId="left" dataKey="volume" name="容量(kg)" fill="#4A8FE4" radius={[4, 4, 0, 0]} />
          <Bar yAxisId="right" dataKey="cardio" name="有氧(min)" fill="#F59E0B" radius={[4, 4, 0, 0]} />
        </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
