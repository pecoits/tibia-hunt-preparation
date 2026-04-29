import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: '/tibia-hunt-preparation/',
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.ts', 'scripts/**/*.test.mjs'],
    passWithNoTests: true
  }
});
