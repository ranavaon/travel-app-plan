import { defineConfig } from 'vitest/config';
import tsconfig from './tsconfig.json' with { type: 'json' };

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./test/setup.ts'],
    include: ['test/**/*.test.ts'],
    globals: true,
    testTimeout: 15000,
    hookTimeout: 15000,
  },
  resolve: {
    extensions: ['.ts'],
  },
  esbuild: {
    target: (tsconfig as { compilerOptions?: { target?: string } }).compilerOptions?.target ?? 'ES2022',
  },
});
