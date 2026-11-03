import { defineConfig } from 'vitest/config';

// Role tests need a running local Supabase, so they only run with RLS=1 (npm run test:rls).
export default defineConfig({
  test: {
    include: process.env.RLS
      ? ['tests/rls/**/*.test.ts']
      : ['tests/**/*.test.ts', 'src/**/*.test.ts'],
    exclude: process.env.RLS ? [] : ['tests/rls/**', 'node_modules/**'],
    testTimeout: 20000,
    // The role tests share one database and each needs to be the only admin.
    fileParallelism: !process.env.RLS,
  },
});
