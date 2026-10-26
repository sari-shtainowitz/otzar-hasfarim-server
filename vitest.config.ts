import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globalSetup: ['./tests/global-setup.ts'],
    setupFiles: ['./tests/setup-env.ts'],
    // כל קובצי הבדיקה משתמשים באותו מסד נתונים – מריצים אותם אחד אחרי השני
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 60000,
  },
});
