import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

// drizzle-kit 默认只读取 .env，不会读取 Next.js 的 .env.local，
// 所以这里显式加载 .env.local，让 process.env.DATABASE_URL 可用。
config({ path: '.env.local' });

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
