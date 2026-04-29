import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.ts', 'scripts/**/*.test.mjs'],
    passWithNoTests: true
  }
});
