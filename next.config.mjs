import withBundleAnalyzer from '@next/bundle-analyzer';

/** @type {import('next').NextConfig} */
const nextConfig = {};

// 可选体积分析：`npm run analyze`（ANALYZE=true 时输出 bundle 报告）
export default withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})(nextConfig);
