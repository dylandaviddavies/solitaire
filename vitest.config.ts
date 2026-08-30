import { defineConfig } from 'vitest/config'

// The engine tests are framework-free and run in plain Node — no need to
// pull in the app's React / Tailwind / PWA plugins from vite.config.ts.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
