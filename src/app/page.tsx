'use client';

import { useState } from 'react';
import MainLayout from '@/components/Layout/MainLayout';
import CommandBar from '@/components/Dashboard/CommandBar';
import QuickCapsules from '@/components/Dashboard/QuickCapsules';
import TodayFeed from '@/components/Dashboard/TodayFeed';
import StatsOverview from '@/components/Dashboard/StatsOverview';
import LearningProgress from '@/components/Dashboard/LearningProgress';

export default function OverviewPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey((k) => k + 1);

  return (
    <MainLayout>
      <h1 className="text-2xl font-bold">📊 总览</h1>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* 命令栏 + 胶囊（移动端最前，桌面端左上） */}
        <div className="space-y-4 lg:col-span-2">
          <CommandBar onRecorded={refresh} />
          <QuickCapsules refreshKey={refreshKey} onRecorded={refresh} />
        </div>

        {/* 统计 + 进度（移动端居中，桌面端右侧满高） */}
        <div className="space-y-6 lg:row-span-2">
          <section>
            <h2 className="mb-3 text-lg font-semibold">统计概览</h2>
            <StatsOverview refreshKey={refreshKey} />
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold">教学进度</h2>
            <LearningProgress refreshKey={refreshKey} />
          </section>
        </div>

        {/* 今日动态（移动端最后，桌面端左下） */}
        <section className="lg:col-span-2">
          <h2 className="mb-3 text-lg font-semibold">今日动态</h2>
          <TodayFeed refreshKey={refreshKey} />
        </section>
      </div>
    </MainLayout>
  );
}
