'use client';

import { useEffect, useState } from 'react';

export default function TestDbPage() {
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading');
  const [count, setCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/test-db')
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || `HTTP ${res.status}`);
        }
        setCount(data.count);
        setState('success');
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : String(err));
        setState('error');
      });
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-bold">数据库连接测试</h1>

      {state === 'loading' && (
        <p className="text-gray-500">⏳ 正在连接数据库…</p>
      )}

      {state === 'success' && (
        <div className="text-center">
          <p className="text-green-600 font-semibold">✅ 数据库连接成功</p>
          <p className="mt-2 text-sm text-gray-600">
            projects 表查询正常（返回 {count} 条记录）
          </p>
        </div>
      )}

      {state === 'error' && (
        <div className="max-w-xl text-center">
          <p className="text-red-600 font-semibold">❌ 数据库连接失败</p>
          <p className="mt-2 break-all text-sm text-gray-600">{error}</p>
        </div>
      )}
    </main>
  );
}
