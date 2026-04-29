import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/tibia-hunt-preparation/',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['data/monsters.json'],
      manifest: {
        name: 'Hunt Element Planner',
        short_name: 'Hunt Planner',
        start_url: '/tibia-hunt-preparation/',
        scope: '/tibia-hunt-preparation/',
        display: 'standalone',
        background_color: '#111416',
        theme_color: '#111416',
        icons: []
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,json,png,svg,ico}'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.endsWith('/data/monsters.json'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'monster-data-cache',
              expiration: {
                maxEntries: 2,
                maxAgeSeconds: 60 * 60 * 24 * 7
              }
            }
          }
        ]
      }
    })
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.ts', 'scripts/**/*.test.mjs'],
    passWithNoTests: true
  }
});
