import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@numbergoUp/domain': resolve(__dirname, '../../packages/domain/src/index.ts'),
      '@numbergoUp/application': resolve(__dirname, '../../packages/application/src/index.ts'),
      '@numbergoUp/contracts': resolve(__dirname, '../../packages/contracts/src/index.ts'),
      '@numbergoUp/infrastructure': resolve(__dirname, '../../packages/infrastructure/src/index.ts'),
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
