'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

type View = { id: string; name: string };

export default function Header() {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [views, setViews] = useState<View[]>([]);
  const [viewsOpen, setViewsOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const load = () =>
      fetch('/api/smart-views')
        .then((r) => r.json())
        .then((d) => setViews(d.views ?? []))
        .catch(() => {});
    load();
    window.addEventListener('smart-views-updated', load);
    return () => window.removeEventListener('smart-views-updated', load);
  }, []);

  const isDark = resolvedTheme === 'dark';

  // 桌面端固定 Tab + 动态智能视图
  const tabs = [
    { label: '总览', href: '/' },
    ...views.map((v) => ({ label: v.name, href: `/view/${v.id}` })),
    { label: '健身', href: '/fitness' },
    { label: '复盘', href: '/review' },
    { label: '📋 任务', href: '/tasks' },
  ];

  const bottomItem = (active: boolean) =>
    `flex flex-col items-center justify-center gap-0.5 text-xs transition-colors ${
      active ? 'text-blue-500' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
    }`;

  return (
    <>
      {/* 桌面端顶部导航（≥768px） */}
      <header className="sticky top-0 z-50 hidden h-16 border-b border-white/20 bg-white/10 backdrop-blur-md md:block dark:border-white/10 dark:bg-black/10">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
            <span>🧠</span>
            <span>Personal OS</span>
          </Link>

          <nav className="flex h-full items-center gap-1">
            {tabs.map((tab) => {
              const active = pathname === tab.href;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`flex h-full items-center border-b-2 px-3 text-sm font-medium transition-colors ${
                    active
                      ? 'border-blue-500 text-blue-500'
                      : 'border-transparent text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              aria-label="切换主题"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-lg transition-colors hover:bg-white/20 dark:hover:bg-white/10"
            >
              {mounted ? (isDark ? '☀️' : '🌙') : '🌙'}
            </button>
            <Link
              href="/settings"
              aria-label="设置"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-lg transition-colors hover:bg-white/20 dark:hover:bg-white/10"
            >
              ⚙️
            </Link>
          </div>
        </div>
      </header>

      {/* 移动端底部导航（<768px） */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/20 bg-white/80 backdrop-blur-md md:hidden dark:border-white/10 dark:bg-black/80">
        {viewsOpen && (
          <div className="max-h-52 overflow-y-auto border-b border-white/10 px-2 py-2">
            {views.length === 0 ? (
              <p className="px-3 py-2 text-sm text-gray-500">暂无视图，请在设置中创建</p>
            ) : (
              views.map((v) => (
                <Link
                  key={v.id}
                  href={`/view/${v.id}`}
                  onClick={() => setViewsOpen(false)}
                  className={`block rounded-lg px-3 py-2.5 text-sm ${
                    pathname === `/view/${v.id}` ? 'text-blue-500' : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {v.name}
                </Link>
              ))
            )}
          </div>
        )}
        <div className="flex items-center justify-around py-2">
          <Link href="/" className={bottomItem(pathname === '/')}>
            <span className="text-lg">📊</span>
            <span>总览</span>
          </Link>
          <button
            onClick={() => setViewsOpen((o) => !o)}
            className={bottomItem(pathname.startsWith('/view/'))}
          >
            <span className="text-lg">📚</span>
            <span>视图</span>
          </button>
          <Link href="/fitness" className={bottomItem(pathname === '/fitness')}>
            <span className="text-lg">💪</span>
            <span>健身</span>
          </Link>
          <Link href="/tasks" className={bottomItem(pathname === '/tasks')}>
            <span className="text-lg">📋</span>
            <span>任务</span>
          </Link>
          <Link href="/settings" className={bottomItem(pathname === '/settings')}>
            <span className="text-lg">⚙️</span>
            <span>设置</span>
          </Link>
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            aria-label="切换主题"
            className={bottomItem(false)}
          >
            <span className="text-lg">{mounted ? (isDark ? '☀️' : '🌙') : '🌙'}</span>
            <span>主题</span>
          </button>
        </div>
      </nav>
    </>
  );
}
