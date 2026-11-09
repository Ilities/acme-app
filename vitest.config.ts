import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'server',
          environment: 'node',
          include: ['server/**/*.test.ts'],
          setupFiles: ['server/test/setup.ts'],
          env: {
            NODE_ENV: 'test',
            DATABASE_URL: ':memory:',
            BCRYPT_ROUNDS: '4',
          },
        },
      },
      {
        plugins: [react()],
        test: {
          name: 'client',
          environment: 'jsdom',
          include: ['client/**/*.test.{ts,tsx}'],
          setupFiles: ['client/src/test/setup.ts'],
        },
      },
    ],
  },
});
