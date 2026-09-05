'use client';

import Header from './Header';
import { motion } from 'framer-motion';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 text-gray-900 dark:from-gray-900 dark:to-gray-950 dark:text-gray-100">
      <Header />
      {/* 页面切换淡入，掩盖加载过程 */}
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15 }}
        className="container mx-auto max-w-7xl px-4 py-6 pb-24 md:pb-6"
      >
        {children}
      </motion.main>
    </div>
  );
}
