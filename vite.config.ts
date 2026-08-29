import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: '/solitaire/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        id: '/solitaire/',
        name: 'Solitaire',
        short_name: 'Solitaire',
        description: 'A playful, physics-animated Klondike Solitaire that works offline.',
        start_url: '/solitaire/',
        scope: '/solitaire/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#8b5cf6',
        theme_color: '#8b5cf6',
        icons: [
          {
            src: 'icons/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Everything the game needs is a build-time asset, so precache the
        // full app shell and let it run entirely from cache once installed.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        // Lets `npm run dev` register a real service worker too, so
        // offline behaviour can be checked without a production build.
        enabled: true,
        type: 'module',
      },
    }),
  ],
})
